import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface TipEntry {
  orderId: string;
  orderNumber: string;
  serverGuid: string;
  serverName: string;
  tipAmount: number;
  orderTotal: number;
  closedDate: Date;
}

interface ServerTipSummary {
  serverGuid: string;
  serverName: string;
  totalTips: number;
  totalSales: number;
  orderCount: number;
  pooledShareIn: number;
  tipOutGiven: number;
  tipOutReceived: number;
  netTips: number;
}

interface TipPoolRule {
  id: string;
  name: string;
  method: 'even' | 'by_hours' | 'by_sales';
  isActive: boolean;
}

interface TipOutRule {
  id: string;
  name: string;
  method: 'percentage_of_tips' | 'percentage_of_sales';
  percentage: number;
  isActive: boolean;
}

// --- Pure function replicas ---

function buildSummaries(entries: TipEntry[]): ServerTipSummary[] {
  const byServer = new Map<string, TipEntry[]>();
  for (const entry of entries) {
    const list = byServer.get(entry.serverGuid) ?? [];
    list.push(entry);
    byServer.set(entry.serverGuid, list);
  }

  const summaries: ServerTipSummary[] = [];
  for (const [guid, serverEntries] of byServer) {
    summaries.push({
      serverGuid: guid,
      serverName: serverEntries[0].serverName,
      totalTips: serverEntries.reduce((sum, e) => sum + e.tipAmount, 0),
      totalSales: serverEntries.reduce((sum, e) => sum + e.orderTotal, 0),
      orderCount: serverEntries.length,
      pooledShareIn: 0,
      tipOutGiven: 0,
      tipOutReceived: 0,
      netTips: 0,
    });
  }
  return summaries;
}

function applyPoolRuleEven(summaries: ServerTipSummary[]): void {
  if (summaries.length === 0) return;
  const totalPoolTips = summaries.reduce((sum, p) => sum + p.totalTips, 0);
  const share = totalPoolTips / summaries.length;
  for (const p of summaries) {
    p.pooledShareIn += share - p.totalTips;
  }
}

function applyPoolRuleByHours(summaries: ServerTipSummary[], hours: Map<string, number>): void {
  if (summaries.length === 0) return;
  const totalPoolTips = summaries.reduce((sum, p) => sum + p.totalTips, 0);
  const totalHours = summaries.reduce((sum, p) => sum + (hours.get(p.serverGuid) ?? 0), 0);
  if (totalHours === 0) return;
  for (const p of summaries) {
    const h = hours.get(p.serverGuid) ?? 0;
    const share = totalPoolTips * (h / totalHours);
    p.pooledShareIn += share - p.totalTips;
  }
}

function applyPoolRuleBySales(summaries: ServerTipSummary[]): void {
  if (summaries.length === 0) return;
  const totalPoolTips = summaries.reduce((sum, p) => sum + p.totalTips, 0);
  const totalSales = summaries.reduce((sum, p) => sum + p.totalSales, 0);
  if (totalSales === 0) return;
  for (const p of summaries) {
    const share = totalPoolTips * (p.totalSales / totalSales);
    p.pooledShareIn += share - p.totalTips;
  }
}

function applyTipOutRule(rule: TipOutRule, summaries: ServerTipSummary[]): void {
  const pct = rule.percentage / 100;
  let ruleTotal = 0;
  for (const srv of summaries) {
    const tipOutAmount = rule.method === 'percentage_of_tips'
      ? srv.totalTips * pct
      : srv.totalSales * pct;
    srv.tipOutGiven += tipOutAmount;
    ruleTotal += tipOutAmount;
  }
  if (summaries.length > 0) {
    const perServer = ruleTotal / summaries.length;
    for (const srv of summaries) {
      srv.tipOutReceived += perServer;
    }
  }
}

function computeNetTips(summaries: ServerTipSummary[]): void {
  for (const srv of summaries) {
    srv.netTips = srv.totalTips + srv.pooledShareIn + srv.tipOutReceived - srv.tipOutGiven;
  }
}

function averageTipPercent(totalTips: number, totalSales: number): number {
  return totalSales > 0
    ? Math.round((totalTips / totalSales) * 10000) / 100
    : 0;
}

function complianceCheck(
  netTips: number,
  hoursWorked: number,
  hourlyRate: number,
  minimumWage: number,
): { effectiveHourlyRate: number; meetsMinWage: boolean } {
  const totalComp = (hourlyRate * hoursWorked) + netTips;
  const effective = hoursWorked > 0 ? totalComp / hoursWorked : 0;
  return {
    effectiveHourlyRate: Math.round(effective * 100) / 100,
    meetsMinWage: effective >= minimumWage,
  };
}

function exportCSV(summaries: ServerTipSummary[]): string {
  const header = 'Server,Orders,Total Tips,Total Sales,Pool In,Tip-Out Given,Tip-Out Received,Net Tips';
  const rows = summaries.map(s =>
    `"${s.serverName.replaceAll('"', '""')}",${s.orderCount},${s.totalTips.toFixed(2)},${s.totalSales.toFixed(2)},${s.pooledShareIn.toFixed(2)},${s.tipOutGiven.toFixed(2)},${s.tipOutReceived.toFixed(2)},${s.netTips.toFixed(2)}`
  );
  return [header, ...rows].join('\n');
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

// --- Tests ---

const entries: TipEntry[] = [
  { orderId: 'o-1', orderNumber: '001', serverGuid: 's-1', serverName: 'Alice', tipAmount: 20, orderTotal: 100, closedDate: new Date() },
  { orderId: 'o-2', orderNumber: '002', serverGuid: 's-1', serverName: 'Alice', tipAmount: 15, orderTotal: 80, closedDate: new Date() },
  { orderId: 'o-3', orderNumber: '003', serverGuid: 's-2', serverName: 'Bob', tipAmount: 10, orderTotal: 60, closedDate: new Date() },
];

describe('TipService — buildSummaries', () => {
  it('groups entries by server', () => {
    const summaries = buildSummaries(entries);
    expect(summaries).toHaveLength(2);
  });

  it('sums tips and sales per server', () => {
    const summaries = buildSummaries(entries);
    const alice = summaries.find(s => s.serverGuid === 's-1')!;
    const bob = summaries.find(s => s.serverGuid === 's-2')!;
    expect(alice.totalTips).toBe(35);
    expect(alice.totalSales).toBe(180);
    expect(alice.orderCount).toBe(2);
    expect(bob.totalTips).toBe(10);
    expect(bob.orderCount).toBe(1);
  });

  it('returns empty for no entries', () => {
    expect(buildSummaries([])).toHaveLength(0);
  });
});

describe('TipService — pool rules', () => {
  it('even pool splits equally', () => {
    const summaries = buildSummaries(entries);
    applyPoolRuleEven(summaries);
    // Total tips = 45, even share = 22.5
    const alice = summaries.find(s => s.serverGuid === 's-1')!;
    const bob = summaries.find(s => s.serverGuid === 's-2')!;
    expect(alice.pooledShareIn).toBeCloseTo(22.5 - 35); // -12.5
    expect(bob.pooledShareIn).toBeCloseTo(22.5 - 10); // +12.5
  });

  it('by_hours pool allocates by hours worked', () => {
    const summaries = buildSummaries(entries);
    const hours = new Map([['s-1', 8], ['s-2', 4]]);
    applyPoolRuleByHours(summaries, hours);
    // Total tips = 45, total hours = 12
    // Alice: 45 * (8/12) = 30, Bob: 45 * (4/12) = 15
    const alice = summaries.find(s => s.serverGuid === 's-1')!;
    const bob = summaries.find(s => s.serverGuid === 's-2')!;
    expect(alice.pooledShareIn).toBeCloseTo(30 - 35); // -5
    expect(bob.pooledShareIn).toBeCloseTo(15 - 10); // +5
  });

  it('by_hours pool does nothing when total hours is 0', () => {
    const summaries = buildSummaries(entries);
    applyPoolRuleByHours(summaries, new Map());
    expect(summaries.every(s => s.pooledShareIn === 0)).toBe(true);
  });

  it('by_sales pool allocates by sales proportion', () => {
    const summaries = buildSummaries(entries);
    applyPoolRuleBySales(summaries);
    // Total tips = 45, total sales = 240
    // Alice: 45 * (180/240) = 33.75, Bob: 45 * (60/240) = 11.25
    const alice = summaries.find(s => s.serverGuid === 's-1')!;
    const bob = summaries.find(s => s.serverGuid === 's-2')!;
    expect(alice.pooledShareIn).toBeCloseTo(33.75 - 35); // -1.25
    expect(bob.pooledShareIn).toBeCloseTo(11.25 - 10); // +1.25
  });
});

describe('TipService — tip out rules', () => {
  it('percentage_of_tips calculates tip out and redistributes', () => {
    const summaries = buildSummaries(entries);
    const rule: TipOutRule = { id: 'to-1', name: 'Busser', method: 'percentage_of_tips', percentage: 10, isActive: true };
    applyTipOutRule(rule, summaries);
    const alice = summaries.find(s => s.serverGuid === 's-1')!;
    const bob = summaries.find(s => s.serverGuid === 's-2')!;
    // Alice tip out: 35 * 0.10 = 3.50, Bob tip out: 10 * 0.10 = 1.00
    expect(alice.tipOutGiven).toBeCloseTo(3.5);
    expect(bob.tipOutGiven).toBeCloseTo(1.0);
    // Total: 4.50, redistributed evenly: 2.25 each
    expect(alice.tipOutReceived).toBeCloseTo(2.25);
    expect(bob.tipOutReceived).toBeCloseTo(2.25);
  });

  it('percentage_of_sales calculates tip out on sales', () => {
    const summaries = buildSummaries(entries);
    const rule: TipOutRule = { id: 'to-1', name: 'Bar', method: 'percentage_of_sales', percentage: 5, isActive: true };
    applyTipOutRule(rule, summaries);
    const alice = summaries.find(s => s.serverGuid === 's-1')!;
    const bob = summaries.find(s => s.serverGuid === 's-2')!;
    // Alice tip out: 180 * 0.05 = 9, Bob: 60 * 0.05 = 3
    expect(alice.tipOutGiven).toBeCloseTo(9);
    expect(bob.tipOutGiven).toBeCloseTo(3);
    // Total: 12, redistributed: 6 each
    expect(alice.tipOutReceived).toBeCloseTo(6);
    expect(bob.tipOutReceived).toBeCloseTo(6);
  });
});

describe('TipService — computeNetTips', () => {
  it('calculates net tips correctly', () => {
    const summaries = buildSummaries(entries);
    summaries[0].pooledShareIn = -5;
    summaries[0].tipOutGiven = 3;
    summaries[0].tipOutReceived = 2;
    computeNetTips(summaries);
    // Alice: 35 + (-5) + 2 - 3 = 29
    expect(summaries[0].netTips).toBe(29);
  });
});

describe('TipService — averageTipPercent', () => {
  it('computes percentage', () => {
    expect(averageTipPercent(45, 240)).toBeCloseTo(18.75);
  });

  it('returns 0 when no sales', () => {
    expect(averageTipPercent(10, 0)).toBe(0);
  });
});

describe('TipService — complianceCheck', () => {
  it('meets minimum wage', () => {
    const result = complianceCheck(50, 8, 5, 12);
    // Total comp = (5*8) + 50 = 90, effective = 90/8 = 11.25
    expect(result.effectiveHourlyRate).toBe(11.25);
    expect(result.meetsMinWage).toBe(false);
  });

  it('above minimum wage', () => {
    const result = complianceCheck(100, 8, 5, 12);
    // Total comp = 40 + 100 = 140, effective = 140/8 = 17.5
    expect(result.effectiveHourlyRate).toBe(17.5);
    expect(result.meetsMinWage).toBe(true);
  });

  it('zero hours returns 0 effective rate', () => {
    const result = complianceCheck(50, 0, 5, 12);
    expect(result.effectiveHourlyRate).toBe(0);
    expect(result.meetsMinWage).toBe(false);
  });
});

describe('TipService — exportCSV', () => {
  it('generates CSV with header and rows', () => {
    const summaries: ServerTipSummary[] = [{
      serverGuid: 's-1', serverName: 'Alice "A"', totalTips: 35, totalSales: 180,
      orderCount: 2, pooledShareIn: 0, tipOutGiven: 0, tipOutReceived: 0, netTips: 35,
    }];
    const csv = exportCSV(summaries);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Server,Orders');
    // Quotes in name should be doubled
    expect(lines[1]).toContain('"Alice ""A"""');
  });

  it('returns header only for empty summaries', () => {
    const csv = exportCSV([]);
    expect(csv.split('\n')).toHaveLength(1);
  });
});

describe('TipService — date helpers', () => {
  it('startOfToday sets hours to 0', () => {
    const d = startOfToday();
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it('endOfToday sets hours to 23:59:59', () => {
    const d = endOfToday();
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(59);
  });
});
