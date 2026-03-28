import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Order, Payment } from '../models';
import { OrderService } from './order';
import { DeviceService } from './device';

export type TransactionRange = 'today' | 'yesterday' | 'this_week' | 'all';

export interface TransactionFilter {
  range: TransactionRange;
}

export interface PaymentMethodSummary {
  method: string;
  icon: string;
  count: number;
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private readonly orderService = inject(OrderService);
  private readonly deviceService = inject(DeviceService);

  private readonly _transactions = signal<Order[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _filter = signal<TransactionFilter>({ range: 'today' });

  readonly isLoading = this._isLoading.asReadonly();
  readonly filter = this._filter.asReadonly();

  readonly filteredTransactions = computed(() => {
    const orders = this._transactions();
    const range = this._filter().range;
    const now = new Date();

    return orders
      .filter(order => {
        const isPaid = order.checks.some(
          c => c.paymentStatus === 'PAID' || c.paymentStatus === 'CLOSED'
        );
        if (!isPaid) return false;

        const closedDate = order.timestamps.closedDate
          ? new Date(order.timestamps.closedDate)
          : new Date(order.timestamps.lastModifiedDate);

        switch (range) {
          case 'today': {
            return this.isSameDay(closedDate, now);
          }
          case 'yesterday': {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            return this.isSameDay(closedDate, yesterday);
          }
          case 'this_week': {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);
            return closedDate >= weekStart;
          }
          case 'all':
            return true;
          default:
            return true;
        }
      })
      .sort((a, b) => {
        const dateA = a.timestamps.closedDate ?? a.timestamps.lastModifiedDate;
        const dateB = b.timestamps.closedDate ?? b.timestamps.lastModifiedDate;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
  });

  readonly totalAmount = computed(() =>
    this.filteredTransactions().reduce((sum, o) => sum + o.totalAmount, 0)
  );

  readonly transactionCount = computed(() => this.filteredTransactions().length);

  readonly totalTips = computed(() =>
    this.filteredTransactions().reduce((sum, o) => sum + this.getTotalTip(o), 0)
  );

  readonly paymentBreakdown = computed<PaymentMethodSummary[]>(() => {
    const methods = new Map<string, { count: number; total: number }>();

    for (const order of this.filteredTransactions()) {
      for (const check of order.checks) {
        for (const payment of check.payments) {
          if (payment.status !== 'PAID' && payment.status !== 'CLOSED') continue;
          const method = this.normalizePaymentMethod(payment.paymentMethod);
          const existing = methods.get(method) ?? { count: 0, total: 0 };
          existing.count++;
          existing.total += payment.amount + payment.tipAmount;
          methods.set(method, existing);
        }
      }
    }

    return Array.from(methods.entries()).map(([method, data]) => ({
      method,
      icon: this.getPaymentIcon(method),
      count: data.count,
      total: data.total,
    }));
  });

  constructor() {
    // Re-filter when orders change (real-time updates)
    effect(() => {
      const allOrders = this.orderService.orders();
      const device = this.deviceService.currentDevice();

      const closedOrders = allOrders.filter(o => o.guestOrderStatus === 'CLOSED');

      // If a device is set, scope to that device; otherwise show all restaurant transactions
      if (device) {
        this._transactions.set(closedOrders.filter(o => o.device.guid === device.id));
      } else {
        this._transactions.set(closedOrders);
      }
    });
  }

  async loadTransactions(): Promise<void> {
    this._isLoading.set(true);
    try {
      const device = this.deviceService.currentDevice();
      // If a device is set, scope to it; otherwise load all restaurant orders
      await this.orderService.loadOrders({
        limit: 100,
        ...(device ? { sourceDeviceId: device.id } : {}),
      });
      // The effect above will pick up the new orders from orderService.orders()
    } finally {
      this._isLoading.set(false);
    }
  }

  setFilter(filter: TransactionFilter): void {
    this._filter.set(filter);
  }

  getTimeDisplay(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;

    // Same day — show clock time
    if (this.isSameDay(d, now)) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    // Different day — show date + time
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  getPrimaryPayment(order: Order): Payment | null {
    for (const check of order.checks) {
      for (const payment of check.payments) {
        if (payment.status === 'PAID' || payment.status === 'CLOSED') return payment;
      }
    }
    return null;
  }

  getTotalTip(order: Order): number {
    return order.checks.reduce(
      (sum, c) => sum + c.payments.reduce((pSum, p) => pSum + p.tipAmount, 0),
      0
    );
  }

  private normalizePaymentMethod(method: string): string {
    const lower = (method ?? '').toLowerCase();
    if (lower.includes('cash')) return 'Cash';
    if (lower.includes('card') || lower.includes('credit') || lower.includes('debit')) return 'Card';
    if (lower.includes('paypal') || lower.includes('apple') || lower.includes('google') || lower.includes('digital')) return 'Digital';
    if (lower.includes('zettle')) return 'Card';
    return method || 'Other';
  }

  getPaymentIcon(method: string): string {
    switch (method) {
      case 'Cash': return 'bi-cash';
      case 'Card': return 'bi-credit-card';
      case 'Digital': return 'bi-phone';
      default: return 'bi-wallet2';
    }
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }
}
