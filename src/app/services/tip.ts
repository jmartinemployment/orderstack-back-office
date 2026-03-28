import { Injectable, inject, computed, signal } from '@angular/core';
import { OrderService } from './order';
import { RestaurantSettingsService } from './restaurant-settings';
import {
  TipEntry,
  TipReport,
  ServerTipSummary,
  ComplianceCheck,
  TipPoolRule,
  TipOutRule,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class TipService {
  private readonly orderService = inject(OrderService);
  private readonly settingsService = inject(RestaurantSettingsService);

  private readonly _startDate = signal<Date>(startOfToday());
  private readonly _endDate = signal<Date>(endOfToday());
  private readonly _hoursWorked = signal<Map<string, number>>(new Map());

  readonly startDate = this._startDate.asReadonly();
  readonly endDate = this._endDate.asReadonly();

  readonly settings = computed(() =>
    this.settingsService.tipManagementSettings()
  );

  readonly tipEntries = computed<TipEntry[]>(() => {
    const start = this._startDate().getTime();
    const end = this._endDate().getTime();

    return this.orderService.completedOrders()
      .filter(order => {
        const closed = order.timestamps.closedDate?.getTime() ?? 0;
        return closed >= start && closed <= end && order.tipAmount > 0;
      })
      .map(order => ({
        orderId: order.guid,
        orderNumber: order.orderNumber,
        serverGuid: order.server.guid,
        serverName: order.server.name,
        tipAmount: order.tipAmount,
        orderTotal: order.totalAmount,
        closedDate: order.timestamps.closedDate!,
      }));
  });

  readonly report = computed<TipReport>(() => {
    const entries = this.tipEntries();
    const s = this.settings();
    const activePoolRules = s.poolRules.filter(r => r.isActive);
    const activeTipOutRules = s.tipOutRules.filter(r => r.isActive);

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

    for (const rule of activePoolRules) {
      this.applyPoolRule(rule, summaries);
    }

    for (const rule of activeTipOutRules) {
      this.applyTipOutRule(rule, summaries);
    }

    for (const srv of summaries) {
      srv.netTips = srv.totalTips + srv.pooledShareIn + srv.tipOutReceived - srv.tipOutGiven;
    }

    const totalTips = entries.reduce((sum, e) => sum + e.tipAmount, 0);
    const totalSales = entries.reduce((sum, e) => sum + e.orderTotal, 0);

    return {
      startDate: this._startDate(),
      endDate: this._endDate(),
      entries,
      serverSummaries: summaries.slice().sort((a, b) => b.netTips - a.netTips),
      totalTips,
      totalSales,
      averageTipPercent: totalSales > 0
        ? Math.round((totalTips / totalSales) * 10000) / 100
        : 0,
    };
  });

  readonly complianceChecks = computed<ComplianceCheck[]>(() => {
    const report = this.report();
    const s = this.settings();
    const hours = this._hoursWorked();

    return report.serverSummaries
      .filter(srv => (hours.get(srv.serverGuid) ?? 0) > 0)
      .map(srv => {
        const hoursWorked = hours.get(srv.serverGuid) ?? 0;
        const totalComp = (s.defaultHourlyRate * hoursWorked) + srv.netTips;
        const effective = hoursWorked > 0 ? totalComp / hoursWorked : 0;
        return {
          serverGuid: srv.serverGuid,
          serverName: srv.serverName,
          hoursWorked,
          totalCompensation: Math.round(totalComp * 100) / 100,
          effectiveHourlyRate: Math.round(effective * 100) / 100,
          meetsMinWage: effective >= s.minimumWage,
          minimumWage: s.minimumWage,
        };
      });
  });

  setDateRange(start: Date, end: Date): void {
    this._startDate.set(start);
    this._endDate.set(end);
  }

  setHoursWorked(serverGuid: string, hours: number): void {
    this._hoursWorked.update(map => {
      const updated = new Map(map);
      updated.set(serverGuid, Math.max(0, hours));
      return updated;
    });
  }

  exportCSV(): string {
    const report = this.report();
    const header = 'Server,Orders,Total Tips,Total Sales,Pool In,Tip-Out Given,Tip-Out Received,Net Tips';
    const rows = report.serverSummaries.map(s =>
      `"${s.serverName.replaceAll('"', '""')}",${s.orderCount},${s.totalTips.toFixed(2)},${s.totalSales.toFixed(2)},${s.pooledShareIn.toFixed(2)},${s.tipOutGiven.toFixed(2)},${s.tipOutReceived.toFixed(2)},${s.netTips.toFixed(2)}`
    );
    return [header, ...rows].join('\n');
  }

  downloadCSV(): void {
    const csv = this.exportCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tip-report-${this._startDate().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private applyPoolRule(rule: TipPoolRule, summaries: ServerTipSummary[]): void {
    const participants = summaries;
    if (participants.length === 0) return;

    const totalPoolTips = participants.reduce((sum, p) => sum + p.totalTips, 0);

    switch (rule.method) {
      case 'even': {
        const share = totalPoolTips / participants.length;
        for (const p of participants) {
          p.pooledShareIn += share - p.totalTips;
        }
        break;
      }
      case 'by_hours': {
        const hours = this._hoursWorked();
        const totalHours = participants.reduce(
          (sum, p) => sum + (hours.get(p.serverGuid) ?? 0), 0
        );
        if (totalHours === 0) return;
        for (const p of participants) {
          const h = hours.get(p.serverGuid) ?? 0;
          const share = totalPoolTips * (h / totalHours);
          p.pooledShareIn += share - p.totalTips;
        }
        break;
      }
      case 'by_sales': {
        const totalSales = participants.reduce((sum, p) => sum + p.totalSales, 0);
        if (totalSales === 0) return;
        for (const p of participants) {
          const share = totalPoolTips * (p.totalSales / totalSales);
          p.pooledShareIn += share - p.totalTips;
        }
        break;
      }
    }
  }

  // BUG FIX: uses local ruleTotal instead of accumulated tipOutGiven
  private applyTipOutRule(rule: TipOutRule, summaries: ServerTipSummary[]): void {
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
