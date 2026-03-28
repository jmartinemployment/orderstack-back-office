import { describe, it, expect } from 'vitest';
import {
  isCashInflow,
  calculateDenominationTotal,
  emptyDenomination,
  getCashEventLabel,
  getCashEventIcon,
} from '../models/cash-drawer.model';
import type {
  CashEvent,
  CashEventType,
  CashDrawerSession,
  CashDenomination,
  CashReconciliation,
  CashDiscrepancyAlert,
} from '../models/cash-drawer.model';

// --- Pure function replicas of CashDrawerService computed logic ---

function runningBalance(events: CashEvent[]): number {
  return events.reduce((balance, event) => {
    return isCashInflow(event.type)
      ? balance + event.amount
      : balance - event.amount;
  }, 0);
}

function cashSalesTotal(events: CashEvent[]): number {
  return events
    .filter(e => e.type === 'cash_sale')
    .reduce((sum, e) => sum + e.amount, 0);
}

function cashOutTotal(events: CashEvent[]): number {
  return events
    .filter(e => !isCashInflow(e.type) && e.type !== 'opening_float')
    .reduce((sum, e) => sum + e.amount, 0);
}

function totalPaidOut(events: CashEvent[]): number {
  return events
    .filter(e => e.type === 'paid_out' || e.type === 'petty_cash')
    .reduce((sum, e) => sum + e.amount, 0);
}

function totalDropped(events: CashEvent[]): number {
  return events
    .filter(e => e.type === 'drop_to_safe' || e.type === 'bank_deposit')
    .reduce((sum, e) => sum + e.amount, 0);
}

function buildReconciliation(s: CashDrawerSession): CashReconciliation {
  const sales = s.events
    .filter(e => e.type === 'cash_sale')
    .reduce((sum, e) => sum + e.amount, 0);
  const out = s.events
    .filter(e => !isCashInflow(e.type))
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    sessionId: s.id,
    openedAt: s.openedAt,
    closedAt: s.closedAt!,
    openedBy: s.openedBy,
    closedBy: s.closedBy ?? 'unknown',
    openingFloat: s.openingFloat,
    expectedCash: s.expectedCash,
    actualCash: s.actualCash ?? 0,
    overShort: s.overShort ?? 0,
    cashSalesTotal: sales,
    cashOutTotal: out,
    eventCount: s.events.length,
  };
}

function computeDiscrepancyAlerts(history: CashDrawerSession[], threshold: number): CashDiscrepancyAlert[] {
  const alerts: CashDiscrepancyAlert[] = [];
  for (const session of history) {
    if (!session.closedAt || session.overShort === undefined) continue;
    if (Math.abs(session.overShort) > threshold) {
      alerts.push({
        sessionId: session.id,
        employee: session.closedBy ?? 'unknown',
        variance: session.overShort,
        isOver: session.overShort > 0,
        closedAt: session.closedAt,
        threshold,
      });
    }
  }
  return alerts.sort((a, b) =>
    new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime()
  );
}

function computeUnacknowledgedAlertCount(alerts: { acknowledged: boolean }[]): number {
  return alerts.filter(a => !a.acknowledged).length;
}

function computeOverShort(actualCash: number, expected: number): number {
  return actualCash - expected;
}

// --- Helper to make events ---

function makeEvent(type: CashEventType, amount: number, performedBy = 'user@test.com'): CashEvent {
  return {
    id: `e-${Math.random()}`,
    type,
    amount,
    reason: 'Test',
    performedBy,
    timestamp: new Date(),
  };
}

function makeSession(overrides: Partial<CashDrawerSession> = {}): CashDrawerSession {
  return {
    id: `s-${Math.random()}`,
    openedAt: new Date(),
    openedBy: 'user@test.com',
    openingFloat: 200,
    events: [makeEvent('opening_float', 200)],
    expectedCash: 200,
    ...overrides,
  };
}

// --- Tests ---

describe('CashDrawer model — isCashInflow', () => {
  it('true for opening_float', () => expect(isCashInflow('opening_float')).toBe(true));
  it('true for cash_sale', () => expect(isCashInflow('cash_sale')).toBe(true));
  it('true for cash_in', () => expect(isCashInflow('cash_in')).toBe(true));
  it('false for cash_out', () => expect(isCashInflow('cash_out')).toBe(false));
  it('false for tip_payout', () => expect(isCashInflow('tip_payout')).toBe(false));
  it('false for paid_out', () => expect(isCashInflow('paid_out')).toBe(false));
  it('false for refund', () => expect(isCashInflow('refund')).toBe(false));
  it('false for drop_to_safe', () => expect(isCashInflow('drop_to_safe')).toBe(false));
  it('false for bank_deposit', () => expect(isCashInflow('bank_deposit')).toBe(false));
  it('false for petty_cash', () => expect(isCashInflow('petty_cash')).toBe(false));
});

describe('CashDrawer model — calculateDenominationTotal', () => {
  it('calculates correct total for all denominations', () => {
    const d: CashDenomination = {
      hundreds: 2,
      fifties: 1,
      twenties: 3,
      tens: 2,
      fives: 4,
      ones: 10,
      quarters: 8,
      dimes: 5,
      nickels: 10,
      pennies: 25,
    };
    // 200 + 50 + 60 + 20 + 20 + 10 + 2 + 0.5 + 0.5 + 0.25 = 363.25
    expect(calculateDenominationTotal(d)).toBeCloseTo(363.25, 2);
  });

  it('returns 0 for empty denomination', () => {
    expect(calculateDenominationTotal(emptyDenomination())).toBe(0);
  });

  it('handles single denomination type', () => {
    const d = { ...emptyDenomination(), twenties: 5 };
    expect(calculateDenominationTotal(d)).toBe(100);
  });
});

describe('CashDrawer model — emptyDenomination', () => {
  it('all values are 0', () => {
    const d = emptyDenomination();
    expect(Object.values(d).every(v => v === 0)).toBe(true);
  });

  it('has all 10 denomination keys', () => {
    expect(Object.keys(emptyDenomination())).toHaveLength(10);
  });
});

describe('CashDrawer model — getCashEventLabel', () => {
  it('returns Opening Float', () => expect(getCashEventLabel('opening_float')).toBe('Opening Float'));
  it('returns Cash Sale', () => expect(getCashEventLabel('cash_sale')).toBe('Cash Sale'));
  it('returns Cash Refund', () => expect(getCashEventLabel('refund')).toBe('Cash Refund'));
  it('returns Drop to Safe', () => expect(getCashEventLabel('drop_to_safe')).toBe('Drop to Safe'));
});

describe('CashDrawer model — getCashEventIcon', () => {
  it('returns bi-unlock for opening_float', () => expect(getCashEventIcon('opening_float')).toBe('bi-unlock'));
  it('returns bi-cash for cash_sale', () => expect(getCashEventIcon('cash_sale')).toBe('bi-cash'));
  it('returns bi-safe for drop_to_safe', () => expect(getCashEventIcon('drop_to_safe')).toBe('bi-safe'));
});

describe('CashDrawerService — runningBalance', () => {
  it('calculates balance from mixed events', () => {
    const events: CashEvent[] = [
      makeEvent('opening_float', 200),
      makeEvent('cash_sale', 50),
      makeEvent('tip_payout', 15),
      makeEvent('cash_sale', 30),
    ];
    // 200 + 50 - 15 + 30 = 265
    expect(runningBalance(events)).toBe(265);
  });

  it('returns 0 for no events', () => {
    expect(runningBalance([])).toBe(0);
  });

  it('handles all outflows', () => {
    const events: CashEvent[] = [
      makeEvent('opening_float', 100),
      makeEvent('paid_out', 50),
      makeEvent('refund', 30),
    ];
    // 100 - 50 - 30 = 20
    expect(runningBalance(events)).toBe(20);
  });
});

describe('CashDrawerService — cashSalesTotal', () => {
  it('sums only cash_sale events', () => {
    const events: CashEvent[] = [
      makeEvent('opening_float', 200),
      makeEvent('cash_sale', 50),
      makeEvent('cash_sale', 30),
      makeEvent('paid_out', 10),
    ];
    expect(cashSalesTotal(events)).toBe(80);
  });

  it('returns 0 when no cash sales', () => {
    expect(cashSalesTotal([makeEvent('opening_float', 200)])).toBe(0);
  });
});

describe('CashDrawerService — cashOutTotal', () => {
  it('sums outflows excluding opening_float', () => {
    const events: CashEvent[] = [
      makeEvent('opening_float', 200),
      makeEvent('tip_payout', 20),
      makeEvent('paid_out', 15),
      makeEvent('cash_sale', 50),
    ];
    expect(cashOutTotal(events)).toBe(35);
  });
});

describe('CashDrawerService — totalPaidOut', () => {
  it('sums paid_out and petty_cash', () => {
    const events: CashEvent[] = [
      makeEvent('paid_out', 25),
      makeEvent('petty_cash', 10),
      makeEvent('tip_payout', 15),
    ];
    expect(totalPaidOut(events)).toBe(35);
  });
});

describe('CashDrawerService — totalDropped', () => {
  it('sums drop_to_safe and bank_deposit', () => {
    const events: CashEvent[] = [
      makeEvent('drop_to_safe', 100),
      makeEvent('bank_deposit', 200),
      makeEvent('paid_out', 50),
    ];
    expect(totalDropped(events)).toBe(300);
  });
});

describe('CashDrawerService — buildReconciliation', () => {
  it('builds correct reconciliation', () => {
    const session = makeSession({
      id: 's-1',
      openingFloat: 200,
      closedAt: new Date(),
      closedBy: 'manager@test.com',
      expectedCash: 265,
      actualCash: 260,
      overShort: -5,
      events: [
        makeEvent('opening_float', 200),
        makeEvent('cash_sale', 80),
        makeEvent('tip_payout', 15),
      ],
    });

    const recon = buildReconciliation(session);
    expect(recon.sessionId).toBe('s-1');
    expect(recon.closedBy).toBe('manager@test.com');
    expect(recon.cashSalesTotal).toBe(80);
    expect(recon.cashOutTotal).toBe(15);
    expect(recon.overShort).toBe(-5);
    expect(recon.eventCount).toBe(3);
  });

  it('defaults closedBy to unknown', () => {
    const session = makeSession({ closedAt: new Date() });
    expect(buildReconciliation(session).closedBy).toBe('unknown');
  });
});

describe('CashDrawerService — computeDiscrepancyAlerts', () => {
  it('detects over-threshold sessions', () => {
    const history: CashDrawerSession[] = [
      makeSession({ id: 's-1', closedAt: new Date('2026-02-25T10:00:00'), closedBy: 'alice', overShort: 10 }),
      makeSession({ id: 's-2', closedAt: new Date('2026-02-25T12:00:00'), closedBy: 'bob', overShort: -3 }),
    ];
    const alerts = computeDiscrepancyAlerts(history, 5);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].employee).toBe('alice');
    expect(alerts[0].isOver).toBe(true);
  });

  it('detects both over and short discrepancies', () => {
    const history: CashDrawerSession[] = [
      makeSession({ id: 's-1', closedAt: new Date(), closedBy: 'alice', overShort: 10 }),
      makeSession({ id: 's-2', closedAt: new Date(), closedBy: 'bob', overShort: -8 }),
    ];
    const alerts = computeDiscrepancyAlerts(history, 5);
    expect(alerts).toHaveLength(2);
  });

  it('skips unclosed sessions', () => {
    const history: CashDrawerSession[] = [
      makeSession({ id: 's-1', overShort: 20 }), // no closedAt
    ];
    expect(computeDiscrepancyAlerts(history, 5)).toHaveLength(0);
  });

  it('returns empty when all within threshold', () => {
    const history: CashDrawerSession[] = [
      makeSession({ id: 's-1', closedAt: new Date(), closedBy: 'alice', overShort: 2 }),
    ];
    expect(computeDiscrepancyAlerts(history, 5)).toHaveLength(0);
  });
});

describe('CashDrawerService — computeOverShort', () => {
  it('positive when over', () => {
    expect(computeOverShort(270, 265)).toBe(5);
  });

  it('negative when short', () => {
    expect(computeOverShort(260, 265)).toBe(-5);
  });

  it('zero when exact', () => {
    expect(computeOverShort(265, 265)).toBe(0);
  });
});

describe('CashDrawerService — unacknowledgedAlertCount', () => {
  it('counts unacknowledged alerts', () => {
    const alerts = [
      { acknowledged: false },
      { acknowledged: true },
      { acknowledged: false },
    ];
    expect(computeUnacknowledgedAlertCount(alerts)).toBe(2);
  });

  it('returns 0 for all acknowledged', () => {
    expect(computeUnacknowledgedAlertCount([{ acknowledged: true }])).toBe(0);
  });

  it('returns 0 for empty', () => {
    expect(computeUnacknowledgedAlertCount([])).toBe(0);
  });
});
