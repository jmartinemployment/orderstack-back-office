// import { Injectable, inject, signal, computed } from '@angular/core';
// import { AuthService } from './auth';
// import {
//   CashEvent,
//   CashEventType,
//   CashDrawerSession,
//   CashDenomination,
//   CashReconciliation,
//   EmployeeCashSummary,
//   CashDiscrepancyAlert,
//   CashEventReportRow,
//   isCashInflow,
//   calculateDenominationTotal,
// } from '../models/cash-drawer.model';

// @Injectable({
//   providedIn: 'root',
// })
// export class CashDrawerService {
//   private readonly authService = inject(AuthService);

//   private readonly _session = signal<CashDrawerSession | null>(null);
//   private readonly _isOpen = signal(false);
//   private readonly _sessionHistory = signal<CashDrawerSession[]>([]);
//   private readonly _isLoadingHistory = signal(false);

//   readonly session = this._session.asReadonly();
//   readonly isOpen = this._isOpen.asReadonly();
//   readonly sessionHistory = this._sessionHistory.asReadonly();
//   readonly isLoadingHistory = this._isLoadingHistory.asReadonly();

//   readonly runningBalance = computed(() => {
//     const session = this._session();
//     if (!session) return 0;

//     return session.events.reduce((balance, event) => {
//       return isCashInflow(event.type)
//         ? balance + event.amount
//         : balance - event.amount;
//     }, 0);
//   });

//   readonly cashSalesTotal = computed(() => {
//     const session = this._session();
//     if (!session) return 0;
//     return session.events
//       .filter(e => e.type === 'cash_sale')
//       .reduce((sum, e) => sum + e.amount, 0);
//   });

//   readonly cashOutTotal = computed(() => {
//     const session = this._session();
//     if (!session) return 0;
//     return session.events
//       .filter(e => !isCashInflow(e.type) && e.type !== 'opening_float')
//       .reduce((sum, e) => sum + e.amount, 0);
//   });

//   readonly totalPaidOut = computed(() => {
//     const session = this._session();
//     if (!session) return 0;
//     return session.events
//       .filter(e => e.type === 'paid_out' || e.type === 'petty_cash')
//       .reduce((sum, e) => sum + e.amount, 0);
//   });

//   readonly totalDropped = computed(() => {
//     const session = this._session();
//     if (!session) return 0;
//     return session.events
//       .filter(e => e.type === 'drop_to_safe' || e.type === 'bank_deposit')
//       .reduce((sum, e) => sum + e.amount, 0);
//   });

//   readonly todaysReconciliations = computed<CashReconciliation[]>(() => {
//     const history = this._sessionHistory();
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     return history
//       .filter(s => s.closedAt && new Date(s.closedAt) >= today)
//       .map(s => this.buildReconciliation(s));
//   });

//   // --- Phase 2: Employee tracking, discrepancy alerts, event reporting ---

//   private readonly _discrepancyThreshold = signal(5); // $5 default
//   private readonly _reportDateFrom = signal<Date | null>(null);
//   private readonly _reportDateTo = signal<Date | null>(null);
//   private readonly _reportEmployeeFilter = signal<string | null>(null);
//   private readonly _reportTypeFilter = signal<CashEventType | null>(null);

//   readonly discrepancyThreshold = this._discrepancyThreshold.asReadonly();
//   readonly reportDateFrom = this._reportDateFrom.asReadonly();
//   readonly reportDateTo = this._reportDateTo.asReadonly();
//   readonly reportEmployeeFilter = this._reportEmployeeFilter.asReadonly();
//   readonly reportTypeFilter = this._reportTypeFilter.asReadonly();

//   readonly employeeSummaries = computed<EmployeeCashSummary[]>(() => {
//     const history = this._sessionHistory();
//     const employeeMap = new Map<string, EmployeeCashSummary>();

//     for (const session of history) {
//       this.accumulateEventSummaries(session, employeeMap);
//       this.accumulateSessionVariance(session, employeeMap);
//     }

//     return Array.from(employeeMap.values())
//       .sort((a, b) => b.totalCashHandled - a.totalCashHandled);
//   });

//   readonly discrepancyAlerts = computed<CashDiscrepancyAlert[]>(() => {
//     const history = this._sessionHistory();
//     const threshold = this._discrepancyThreshold();
//     const alerts: CashDiscrepancyAlert[] = [];

//     for (const session of history) {
//       if (!session.closedAt || session.overShort === undefined) continue;
//       if (Math.abs(session.overShort) > threshold) {
//         alerts.push({
//           sessionId: session.id,
//           employee: session.closedBy ?? 'unknown',
//           variance: session.overShort,
//           isOver: session.overShort > 0,
//           closedAt: session.closedAt,
//           threshold,
//         });
//       }
//     }

//     return alerts.sort((a, b) =>
//       new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime()
//     );
//   });

//   readonly flaggedEmployees = computed(() => {
//     return this.employeeSummaries().filter(e => e.discrepancyCount >= 2);
//   });

//   readonly cashEventReport = computed<CashEventReportRow[]>(() => {
//     const history = this._sessionHistory();
//     const dateFrom = this._reportDateFrom();
//     const dateTo = this._reportDateTo();
//     const employeeFilter = this._reportEmployeeFilter();
//     const typeFilter = this._reportTypeFilter();

//     const rows: CashEventReportRow[] = [];

//     for (const session of history) {
//       for (const event of session.events) {
//         if (this.matchesReportFilters(event, dateFrom, dateTo, employeeFilter, typeFilter)) {
//           rows.push({ event, sessionId: session.id, sessionOpenedAt: session.openedAt });
//         }
//       }
//     }

//     return rows.sort((a, b) =>
//       new Date(b.event.timestamp).getTime() - new Date(a.event.timestamp).getTime()
//     );
//   });

//   readonly eventsByType = computed(() => {
//     const rows = this.cashEventReport();
//     const map = new Map<CashEventType, { count: number; total: number }>();
//     for (const row of rows) {
//       const entry = map.get(row.event.type) ?? { count: 0, total: 0 };
//       entry.count++;
//       entry.total += row.event.amount;
//       map.set(row.event.type, entry);
//     }
//     return Array.from(map.entries())
//       .map(([type, data]) => ({ type, ...data }))
//       .sort((a, b) => b.total - a.total);
//   });

//   readonly allEmployeeNames = computed(() => {
//     const names = new Set<string>();
//     for (const session of this._sessionHistory()) {
//       for (const event of session.events) {
//         if (event.type !== 'opening_float') {
//           names.add(event.performedBy);
//         }
//       }
//     }
//     return Array.from(names).sort((a, b) => a.localeCompare(b));
//   });

//   private getOrCreateSummary(map: Map<string, EmployeeCashSummary>, name: string): EmployeeCashSummary {
//     let summary = map.get(name);
//     if (!summary) {
//       summary = {
//         employeeName: name,
//         totalCashHandled: 0,
//         totalCashIn: 0,
//         totalCashOut: 0,
//         eventCount: 0,
//         sessionCount: 0,
//         avgVariance: 0,
//         totalVariance: 0,
//         discrepancyCount: 0,
//       };
//       map.set(name, summary);
//     }
//     return summary;
//   }

//   private accumulateEventSummaries(session: CashDrawerSession, map: Map<string, EmployeeCashSummary>): void {
//     for (const event of session.events) {
//       if (event.type === 'opening_float') continue;
//       const summary = this.getOrCreateSummary(map, event.performedBy);
//       summary.eventCount++;
//       summary.totalCashHandled += event.amount;
//       if (isCashInflow(event.type)) {
//         summary.totalCashIn += event.amount;
//       } else {
//         summary.totalCashOut += event.amount;
//       }
//     }
//   }

//   private accumulateSessionVariance(session: CashDrawerSession, map: Map<string, EmployeeCashSummary>): void {
//     if (!session.closedAt || !session.closedBy || session.overShort === undefined) return;
//     const summary = this.getOrCreateSummary(map, session.closedBy);
//     summary.sessionCount++;
//     summary.totalVariance += session.overShort;
//     if (Math.abs(session.overShort) > this._discrepancyThreshold()) {
//       summary.discrepancyCount++;
//     }
//     summary.avgVariance = summary.sessionCount > 0
//       ? Math.round(summary.totalVariance / summary.sessionCount * 100) / 100
//       : 0;
//   }

//   private matchesReportFilters(
//     event: CashEvent,
//     dateFrom: Date | null,
//     dateTo: Date | null,
//     employeeFilter: string | null,
//     typeFilter: CashEventType | null,
//   ): boolean {
//     if (event.type === 'opening_float') return false;
//     const ts = new Date(event.timestamp);
//     if (dateFrom && ts < dateFrom) return false;
//     if (dateTo) {
//       const endOfDay = new Date(dateTo);
//       endOfDay.setHours(23, 59, 59, 999);
//       if (ts > endOfDay) return false;
//     }
//     if (employeeFilter && event.performedBy !== employeeFilter) return false;
//     if (typeFilter && event.type !== typeFilter) return false;
//     return true;
//   }

//   setDiscrepancyThreshold(value: number): void {
//     this._discrepancyThreshold.set(Math.max(0, value));
//   }

//   setReportDateFrom(date: Date | null): void {
//     this._reportDateFrom.set(date);
//   }

//   setReportDateTo(date: Date | null): void {
//     this._reportDateTo.set(date);
//   }

//   setReportEmployeeFilter(name: string | null): void {
//     this._reportEmployeeFilter.set(name);
//   }

//   setReportTypeFilter(type: CashEventType | null): void {
//     this._reportTypeFilter.set(type);
//   }

//   clearReportFilters(): void {
//     this._reportDateFrom.set(null);
//     this._reportDateTo.set(null);
//     this._reportEmployeeFilter.set(null);
//     this._reportTypeFilter.set(null);
//   }

//   private get merchantId(): string | null {
//     return this.authService.selectedMerchantId();
//   }

//   private get storageKey(): string {
//     return `cash-drawer-${this.merchantId ?? 'unknown'}`;
//   }

//   private get historyKey(): string {
//     return `cash-drawer-history-${this.merchantId ?? 'unknown'}`;
//   }

//   constructor() {
//     this.restoreFromStorage();
//   }

//   openDrawer(openingFloat: number): void {
//     const performer = this.authService.user()?.email ?? 'unknown';
//     const session: CashDrawerSession = {
//       id: crypto.randomUUID(),
//       merchantId: this.merchantId ?? undefined,
//       openedAt: new Date(),
//       openedBy: performer,
//       openingFloat,
//       events: [{
//         id: crypto.randomUUID(),
//         type: 'opening_float',
//         amount: openingFloat,
//         reason: 'Opening float',
//         performedBy: performer,
//         timestamp: new Date(),
//       }],
//       expectedCash: openingFloat,
//     };

//     this._session.set(session);
//     this._isOpen.set(true);
//     this.persist();
//   }

//   addEvent(type: CashEventType, amount: number, reason: string, orderId?: string): void {
//     const session = this._session();
//     if (!session || session.closedAt) return;

//     const event: CashEvent = {
//       id: crypto.randomUUID(),
//       type,
//       amount: Math.abs(amount),
//       reason,
//       performedBy: this.authService.user()?.email ?? 'unknown',
//       timestamp: new Date(),
//       orderId,
//     };

//     this._session.set({
//       ...session,
//       events: [...session.events, event],
//     });
//     this.persist();
//   }

//   recordCashSale(amount: number, orderId: string): void {
//     this.addEvent('cash_sale', amount, 'Cash payment', orderId);
//   }

//   recordPaidOut(amount: number, reason: string): void {
//     this.addEvent('paid_out', amount, reason);
//   }

//   recordDropToSafe(amount: number): void {
//     this.addEvent('drop_to_safe', amount, 'Cash drop to safe');
//   }

//   recordTipPayout(amount: number, reason: string): void {
//     this.addEvent('tip_payout', amount, reason);
//   }

//   recordPettyCash(amount: number, reason: string): void {
//     this.addEvent('petty_cash', amount, reason);
//   }

//   closeDrawer(actualCash: number, denomination?: CashDenomination): void {
//     const session = this._session();
//     if (!session) return;

//     const expected = this.runningBalance();
//     const overShort = actualCash - expected;
//     const closedBy = this.authService.user()?.email ?? 'unknown';

//     const closedSession: CashDrawerSession = {
//       ...session,
//       closedAt: new Date(),
//       expectedCash: expected,
//       actualCash,
//       overShort,
//       closedBy,
//       denomination,
//     };

//     this._session.set(closedSession);
//     this._isOpen.set(false);
//     this.persist();
//     this.addToHistory(closedSession);
//   }

//   closeDrawerWithDenomination(denomination: CashDenomination): void {
//     const total = calculateDenominationTotal(denomination);
//     this.closeDrawer(Math.round(total * 100) / 100, denomination);
//   }

//   clearSession(): void {
//     this._session.set(null);
//     this._isOpen.set(false);
//     localStorage.removeItem(this.storageKey);
//   }

//   loadSessionHistory(): void {
//     this._isLoadingHistory.set(true);
//     try {
//       const stored = localStorage.getItem(this.historyKey);
//       if (stored) {
//         const raw = JSON.parse(stored) as unknown[];
//         const sessions = (raw as Record<string, unknown>[])
//           .map(r => this.deserializeSession(r))
//           .filter((s): s is CashDrawerSession => s !== null);
//         this._sessionHistory.set(sessions);
//       }
//     } catch {
//       // Ignore corrupted storage
//     }
//     this._isLoadingHistory.set(false);
//   }

//   private addToHistory(session: CashDrawerSession): void {
//     const history = [...this._sessionHistory(), session];
//     this._sessionHistory.set(history);
//     try {
//       localStorage.setItem(this.historyKey, JSON.stringify(history));
//     } catch {
//       // Storage quota exceeded — trim oldest
//       const trimmed = history.slice(-50);
//       localStorage.setItem(this.historyKey, JSON.stringify(trimmed));
//     }
//   }

//   private buildReconciliation(s: CashDrawerSession): CashReconciliation {
//     const cashSales = s.events
//       .filter(e => e.type === 'cash_sale')
//       .reduce((sum, e) => sum + e.amount, 0);
//     const cashOut = s.events
//       .filter(e => !isCashInflow(e.type))
//       .reduce((sum, e) => sum + e.amount, 0);

//     return {
//       sessionId: s.id,
//       openedAt: s.openedAt,
//       closedAt: s.closedAt!,
//       openedBy: s.openedBy,
//       closedBy: s.closedBy ?? 'unknown',
//       openingFloat: s.openingFloat,
//       expectedCash: s.expectedCash,
//       actualCash: s.actualCash ?? 0,
//       overShort: s.overShort ?? 0,
//       cashSalesTotal: cashSales,
//       cashOutTotal: cashOut,
//       eventCount: s.events.length,
//     };
//   }

//   private restoreFromStorage(): void {
//     try {
//       const stored = localStorage.getItem(this.storageKey);
//       if (stored) {
//         const raw = JSON.parse(stored);
//         const session = this.deserializeSession(raw);
//         if (session && !session.closedAt) {
//           this._session.set(session);
//           this._isOpen.set(true);
//         }
//       }
//     } catch {
//       // Ignore corrupted storage
//     }
//     this.loadSessionHistory();
//   }

//   private persist(): void {
//     const session = this._session();
//     if (!session) return;
//     localStorage.setItem(this.storageKey, JSON.stringify(session));
//   }

//   // private deserializeSession(raw: Record<string, unknown>): CashDrawerSession | null {
//   //   if (!raw?.id) return null;
//   //   return {
//   //     ...(raw as unknown as CashDrawerSession),
//   //     openedAt: new Date(raw['openedAt'] as string),
//   //     closedAt: raw['closedAt'] ? new Date(raw['closedAt'] as string) : undefined,
//   //     openedBy: (raw['openedBy'] as string) ?? (raw['closedBy'] as string) ?? 'unknown',
//   //     events: ((raw['events'] as Record<string, unknown>[]) ?? []).map(e => ({
//   //       ...(e as unknown as CashEvent),
//   //       timestamp: new Date(e['timestamp'] as string),
//   //     })),
//   //   };
//   // }
// }
