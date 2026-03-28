import {
  Component,
  // ChangeDetectionStrategy,
  // inject,
  // signal,
  // computed,
  OnInit,
} from '@angular/core';
// import { CurrencyPipe, PercentPipe, DecimalPipe } from '@angular/common';
// import { OrderService } from '../../../services/order';
// import { AnalyticsService } from '../../../services/analytics';
// import { TipService } from '../../../services/tip';
// import { AuthService } from '../../../services/auth';
// import { ReportService } from '../../../services/report';
// // import { CashDrawerService } from '../../../services/cash-drawer';
// import { DeliveryService } from '../../../services/delivery';
// import {
//   TeamMemberSalesRow,
//   TaxServiceChargeReport,
//   DeliveryAnalyticsReport,
// } from '../../../models/index';

// type ReportTab = 'summary' | 'payments' | 'tips' | 'voids' | 'items' | 'team' | 'taxes' | 'cash' | 'delivery';

// interface PaymentMethodBreakdown {
//   method: string;
//   count: number;
//   total: number;
// }

// interface VoidCompSummary {
//   type: 'void' | 'comp' | 'discount';
//   count: number;
//   totalValue: number;
//   reasons: { reason: string; count: number }[];
// }

// interface TopSellerEntry {
//   name: string;
//   quantity: number;
//   revenue: number;
// }

@Component({
  selector: 'os-close-of-day',
  // imports: [CurrencyPipe, PercentPipe, DecimalPipe],
  templateUrl: './close-of-day.html',
  styleUrl: './close-of-day.scss',
  //changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloseOfDay implements OnInit {
  // private readonly orderService = inject(OrderService);
  // private readonly analyticsService = inject(AnalyticsService);
  // private readonly tipService = inject(TipService);
  // private readonly authService = inject(AuthService);
  // private readonly reportService = inject(ReportService);
  // // readonly cashDrawerService = inject(CashDrawerService);
  // private readonly deliveryService = inject(DeliveryService);

  // private readonly _activeTab = signal<ReportTab>('summary');
  // private readonly _reportDate = signal(new Date());
  // private readonly _isLoading = signal(false);

  // // Phase 3: Team Member Sales
  // private readonly _teamSales = signal<TeamMemberSalesRow[]>([]);
  // private readonly _isLoadingTeam = signal(false);

  // // Phase 3: Tax & Service Charge Report
  // private readonly _taxReport = signal<TaxServiceChargeReport | null>(null);
  // private readonly _isLoadingTax = signal(false);

  // readonly activeTab = this._activeTab.asReadonly();
  // readonly reportDate = this._reportDate.asReadonly();
  // readonly isLoading = this._isLoading.asReadonly();
  // readonly salesReport = this.analyticsService.salesReport;
  // readonly tipReport = this.tipService.report;

  // readonly teamSales = this._teamSales.asReadonly();
  // readonly isLoadingTeam = this._isLoadingTeam.asReadonly();
  // readonly taxReport = this._taxReport.asReadonly();
  // readonly isLoadingTax = this._isLoadingTax.asReadonly();

  // // Team member computed totals
  // readonly teamTotalRevenue = computed(() =>
  //   this._teamSales().reduce((sum, m) => sum + m.revenue, 0)
  // );
  // readonly teamTotalOrders = computed(() =>
  //   this._teamSales().reduce((sum, m) => sum + m.orderCount, 0)
  // );
  // readonly teamTotalTips = computed(() =>
  //   this._teamSales().reduce((sum, m) => sum + m.tips, 0)
  // );
  // readonly teamMaxRevenue = computed(() =>
  //   Math.max(1, ...this._teamSales().map(m => m.revenue))
  // );

  // // Filter orders to today's closed orders
  // readonly todayOrders = computed(() => {
  //   const date = this._reportDate();
  //   const dayStart = new Date(date);
  //   dayStart.setHours(0, 0, 0, 0);
  //   const dayEnd = new Date(date);
  //   dayEnd.setHours(23, 59, 59, 999);

  //   return this.orderService.orders().filter(o => {
  //     const closed = o.timestamps.closedDate?.getTime();
  //     const created = o.timestamps.createdDate.getTime();
  //     return (
  //       (o.guestOrderStatus === 'CLOSED' || o.guestOrderStatus === 'VOIDED') &&
  //       ((closed && closed >= dayStart.getTime() && closed <= dayEnd.getTime()) ||
  //         (created >= dayStart.getTime() && created <= dayEnd.getTime()))
  //     );
  //   });
  // });

  // readonly closedOrders = computed(() =>
  //   this.todayOrders().filter(o => o.guestOrderStatus === 'CLOSED')
  // );

  // readonly voidedOrders = computed(() =>
  //   this.todayOrders().filter(o => o.guestOrderStatus === 'VOIDED')
  // );

  // // KPIs
  // readonly totalRevenue = computed(() =>
  //   this.closedOrders().reduce((sum, o) => sum + o.totalAmount, 0)
  // );

  // readonly totalOrders = computed(() => this.closedOrders().length);

  // readonly averageCheck = computed(() => {
  //   const orders = this.closedOrders();
  //   return orders.length > 0 ? this.totalRevenue() / orders.length : 0;
  // });

  // readonly totalGuests = computed(() => {
  //   return this.closedOrders().reduce((sum, o) => {
  //     const seats = new Set<number>();
  //     for (const check of o.checks) {
  //       for (const sel of check.selections) {
  //         if (sel.seatNumber) seats.add(sel.seatNumber);
  //       }
  //     }
  //     return sum + (seats.size > 0 ? seats.size : 1);
  //   }, 0);
  // });

  // readonly totalTips = computed(() =>
  //   this.closedOrders().reduce((sum, o) => sum + o.tipAmount, 0)
  // );

  // readonly totalTax = computed(() =>
  //   this.closedOrders().reduce((sum, o) => sum + o.taxAmount, 0)
  // );

  // // Payment breakdown
  // readonly paymentBreakdown = computed<PaymentMethodBreakdown[]>(() => {
  //   const map = new Map<string, { count: number; total: number }>();

  //   for (const order of this.closedOrders()) {
  //     for (const check of order.checks) {
  //       for (const payment of check.payments) {
  //         const method = payment.paymentProcessor ?? payment.paymentMethod ?? 'cash';
  //         const entry = map.get(method) ?? { count: 0, total: 0 };
  //         entry.count++;
  //         entry.total += payment.amount;
  //         map.set(method, entry);
  //       }
  //     }
  //     if (order.checks.every(c => c.payments.length === 0)) {
  //       const entry = map.get('cash') ?? { count: 0, total: 0 };
  //       entry.count++;
  //       entry.total += order.totalAmount;
  //       map.set('cash', entry);
  //     }
  //   }

  //   return [...map.entries()]
  //     .map(([method, data]) => ({ method: this.formatPaymentMethod(method), ...data }))
  //     .sort((a, b) => b.total - a.total);
  // });

  // // Void/comp/discount summaries
  // readonly voidSummary = computed<VoidCompSummary>(() => {
  //   const reasons = new Map<string, number>();
  //   let count = 0;
  //   let totalValue = 0;

  //   for (const order of this.todayOrders()) {
  //     for (const check of order.checks) {
  //       for (const voided of check.voidedSelections) {
  //         count++;
  //         totalValue += voided.totalPrice;
  //         const r = voided.voidReason ?? 'unknown';
  //         reasons.set(r, (reasons.get(r) ?? 0) + 1);
  //       }
  //     }
  //   }

  //   return {
  //     type: 'void',
  //     count,
  //     totalValue,
  //     reasons: [...reasons.entries()]
  //       .map(([reason, cnt]) => ({ reason: this.formatReason(reason), count: cnt }))
  //       .sort((a, b) => b.count - a.count),
  //   };
  // });

  // readonly compSummary = computed<VoidCompSummary>(() => {
  //   const reasons = new Map<string, number>();
  //   let count = 0;
  //   let totalValue = 0;

  //   for (const order of this.todayOrders()) {
  //     for (const check of order.checks) {
  //       for (const sel of check.selections) {
  //         if (sel.isComped) {
  //           count++;
  //           totalValue += sel.totalPrice;
  //           const r = sel.compReason ?? 'unknown';
  //           reasons.set(r, (reasons.get(r) ?? 0) + 1);
  //         }
  //       }
  //     }
  //   }

  //   return {
  //     type: 'comp',
  //     count,
  //     totalValue,
  //     reasons: [...reasons.entries()]
  //       .map(([reason, cnt]) => ({ reason: this.formatReason(reason), count: cnt }))
  //       .sort((a, b) => b.count - a.count),
  //   };
  // });

  // readonly discountSummary = computed<VoidCompSummary>(() => {
  //   const reasons = new Map<string, number>();
  //   let count = 0;
  //   let totalValue = 0;

  //   for (const order of this.todayOrders()) {
  //     for (const check of order.checks) {
  //       for (const disc of check.discounts) {
  //         count++;
  //         totalValue += disc.type === 'percentage'
  //           ? check.subtotal * (disc.value / 100)
  //           : disc.value;
  //         const r = disc.reason ?? 'unknown';
  //         reasons.set(r, (reasons.get(r) ?? 0) + 1);
  //       }
  //     }
  //   }

  //   return {
  //     type: 'discount',
  //     count,
  //     totalValue,
  //     reasons: [...reasons.entries()]
  //       .map(([reason, cnt]) => ({ reason: this.formatReason(reason), count: cnt }))
  //       .sort((a, b) => b.count - a.count),
  //   };
  // });

  // // Top sellers
  // readonly topSellers = computed<TopSellerEntry[]>(() => {
  //   const map = new Map<string, { quantity: number; revenue: number }>();

  //   for (const order of this.closedOrders()) {
  //     for (const check of order.checks) {
  //       for (const sel of check.selections) {
  //         if (sel.isComped) continue;
  //         const entry = map.get(sel.menuItemName) ?? { quantity: 0, revenue: 0 };
  //         entry.quantity += sel.quantity;
  //         entry.revenue += sel.totalPrice;
  //         map.set(sel.menuItemName, entry);
  //       }
  //     }
  //   }

  //   return [...map.entries()]
  //     .map(([name, data]) => ({ name, ...data }))
  //     .sort((a, b) => b.revenue - a.revenue)
  //     .slice(0, 15);
  // });

  // readonly paymentTransactionCount = computed(() =>
  //   this.paymentBreakdown().reduce((sum, p) => sum + p.count, 0)
  // );

  // // Order source breakdown
  // readonly orderSourceBreakdown = computed(() => {
  //   const map = new Map<string, number>();
  //   for (const order of this.closedOrders()) {
  //     const source = order.orderSource ?? 'pos';
  //     map.set(source, (map.get(source) ?? 0) + 1);
  //   }
  //   return [...map.entries()]
  //     .map(([source, count]) => ({ source: this.formatSource(source), count }))
  //     .sort((a, b) => b.count - a.count);
  // });

  ngOnInit(): void {
    // this.loadReport();
  }

  // async loadReport(): Promise<void> {
  //   this._isLoading.set(true);
  //   try {
  //     await Promise.all([
  //       this.orderService.loadOrders(),
  //       this.analyticsService.loadSalesReport('daily'),
  //     ]);
  //     const date = this._reportDate();
  //     const start = new Date(date);
  //     start.setHours(0, 0, 0, 0);
  //     const end = new Date(date);
  //     end.setHours(23, 59, 59, 999);
  //     this.tipService.setDateRange(start, end);
  //   } finally {
  //     this._isLoading.set(false);
  //   }
  // }

  // setTab(tab: ReportTab): void {
  //   this._activeTab.set(tab);
  //   if (tab === 'team' && this._teamSales().length === 0) {
  //     this.loadTeamSales();
  //   }
  //   if (tab === 'taxes' && !this._taxReport()) {
  //     this.loadTaxReport();
  //   }
  //   // if (tab === 'cash') {
  //   //   this.cashDrawerService.loadSessionHistory();
  //   // }
  //   if (tab === 'delivery' && !this._deliveryReport()) {
  //     void this.loadDeliveryAnalytics();
  //   }
  // }

  // setReportDate(dateStr: string): void {
  //   this._reportDate.set(new Date(dateStr + 'T12:00:00'));
  //   this._teamSales.set([]);
  //   this._taxReport.set(null);
  //   this._deliveryReport.set(null);
  //   this.loadReport();
  // }

  // getReportDateString(): string {
  //   return this._reportDate().toISOString().slice(0, 10);
  // }

  // printReport(): void {
  //   globalThis.print();
  // }

  // exportCSV(): void {
  //   const orders = this.closedOrders();
  //   const header = 'Order #,Status,Subtotal,Tax,Tip,Total,Payment Method,Source,Closed At';
  //   const rows = orders.map(o => {
  //     const payMethod = o.checks
  //       .flatMap(c => c.payments)
  //       .map(p => p.paymentProcessor ?? p.paymentMethod ?? 'cash')
  //       .join(';') || 'cash';
  //     const closedAt = o.timestamps.closedDate?.toISOString() ?? '';
  //     return `"${o.orderNumber}","${o.guestOrderStatus}",${o.subtotal.toFixed(2)},${o.taxAmount.toFixed(2)},${o.tipAmount.toFixed(2)},${o.totalAmount.toFixed(2)},"${payMethod}","${o.orderSource ?? 'pos'}","${closedAt}"`;
  //   });

  //   const csv = [header, ...rows].join('\n');
  //   const blob = new Blob([csv], { type: 'text/csv' });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement('a');
  //   a.href = url;
  //   a.download = `close-of-day-${this.getReportDateString()}.csv`;
  //   a.click();
  //   URL.revokeObjectURL(url);
  // }

  // // --- Phase 3: Team Member Sales ---

  // async loadTeamSales(): Promise<void> {
  //   this._isLoadingTeam.set(true);
  //   try {
  //     const dateStr = this.getReportDateString();
  //     const rows = await this.reportService.getTeamMemberSales({
  //       startDate: dateStr,
  //       endDate: dateStr,
  //     });
  //     this._teamSales.set(rows);
  //   } finally {
  //     this._isLoadingTeam.set(false);
  //   }
  // }

  // getTeamBarWidth(revenue: number): number {
  //   const max = this.teamMaxRevenue();
  //   return max > 0 ? (revenue / max) * 100 : 0;
  // }

  // // --- GAP-R08 Phase 2: Delivery Analytics ---

  // private readonly _deliveryReport = signal<DeliveryAnalyticsReport | null>(null);
  // private readonly _isLoadingDelivery = signal(false);
  // readonly deliveryReport = this._deliveryReport.asReadonly();
  // readonly isLoadingDelivery = this._isLoadingDelivery.asReadonly();

  // readonly deliveryOrderCount = computed(() =>
  //   this.closedOrders().filter(o => o.diningOption.type === 'delivery').length
  // );

  // readonly deliveryMaxDeliveries = computed(() => {
  //   const report = this._deliveryReport();
  //   if (!report) return 1;
  //   return Math.max(1, ...report.byDriver.map(d => d.totalDeliveries));
  // });

  // async loadDeliveryAnalytics(): Promise<void> {
  //   this._isLoadingDelivery.set(true);
  //   try {
  //     const dateStr = this.getReportDateString();
  //     const report = await this.deliveryService.loadDeliveryAnalytics(dateStr, dateStr);
  //     this._deliveryReport.set(report);
  //   } finally {
  //     this._isLoadingDelivery.set(false);
  //   }
  // }

  // getDeliveryBarWidth(deliveries: number): number {
  //   const max = this.deliveryMaxDeliveries();
  //   return max > 0 ? (deliveries / max) * 100 : 0;
  // }

  // // --- Phase 3: Tax & Service Charge Report ---

  // async loadTaxReport(): Promise<void> {
  //   this._isLoadingTax.set(true);
  //   try {
  //     const dateStr = this.getReportDateString();
  //     const report = await this.reportService.getTaxServiceChargeReport({
  //       startDate: dateStr,
  //       endDate: dateStr,
  //     });
  //     this._taxReport.set(report);
  //   } finally {
  //     this._isLoadingTax.set(false);
  //   }
  // }

  // // --- Private helpers ---

  // private formatPaymentMethod(method: string): string {
  //   switch (method) {
  //     case 'stripe': return 'Card';
  //     case 'paypal': return 'PayPal';
  //     case 'cash': return 'Cash';
  //     default: return method.charAt(0).toUpperCase() + method.slice(1);
  //   }
  // }

  // private formatReason(reason: string): string {
  //   return reason.replaceAll('_', ' ').replaceAll(/\b\w/g, c => c.toUpperCase());
  // }

  // private formatSource(source: string): string {
  //   switch (source) {
  //     case 'pos': return 'POS';
  //     case 'online': return 'Online';
  //     case 'voice': return 'Voice';
  //     case 'marketplace_doordash': return 'DoorDash';
  //     case 'marketplace_ubereats': return 'Uber Eats';
  //     case 'marketplace_grubhub': return 'Grubhub';
  //     default: return source;
  //   }
  // }
}
