import { Component, ChangeDetectionStrategy, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { CheckoutService, CheckoutMode } from '../../../services/checkout';
import { OrderService } from '../../../services/order';
import { Order, Check, getOrderIdentifier } from '../../../models/index';
import { Checkout } from '../../../shared/checkout/checkout';
import { PaymentTerminal } from '../../../shared/payment-terminal/payment-terminal';

type SendView = 'list' | 'payment' | 'success' | 'failed';

const ROUTE_CHECKOUT_CONFIG: Record<string, { mode: CheckoutMode; source: string }> = {
  '/register': { mode: 'charge', source: 'register' },
  '/bar': { mode: 'charge', source: 'bar' },
  '/pos': { mode: 'send', source: 'terminal' },
};

@Component({
  selector: 'os-bottom-nav-checkout',
  imports: [CurrencyPipe, Checkout, PaymentTerminal],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavCheckout implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly checkoutService = inject(CheckoutService);
  private readonly orderService = inject(OrderService);

  // --- Mode detection ---

  readonly checkoutMode = computed<CheckoutMode>(() => {
    const config = ROUTE_CHECKOUT_CONFIG[this.router.url];
    return config?.mode ?? 'charge';
  });

  readonly checkoutSource = computed(() => {
    const config = ROUTE_CHECKOUT_CONFIG[this.router.url];
    return config?.source ?? 'terminal';
  });

  readonly isChargeMode = computed(() => this.checkoutMode() === 'charge');

  // --- Charge mode ---

  readonly hasCartItems = computed(() => this.checkoutService.cartItems().length > 0);

  // --- Send mode state ---

  private readonly _sendView = signal<SendView>('list');
  private readonly _selectedOrder = signal<Order | null>(null);
  private readonly _selectedCheck = signal<Check | null>(null);
  private readonly _sendError = signal<string>('');

  readonly sendView = this._sendView.asReadonly();
  readonly selectedOrder = this._selectedOrder.asReadonly();
  readonly selectedCheck = this._selectedCheck.asReadonly();
  readonly sendError = this._sendError.asReadonly();

  // --- Open checks (send mode) ---

  readonly openChecks = computed(() => {
    const orders = this.orderService.orders();
    return orders
      .filter(o =>
        o.guestOrderStatus !== 'VOIDED' &&
        o.guestOrderStatus !== 'CLOSED' &&
        o.checks.length > 0 &&
        (o.checks[0].paymentStatus === 'OPEN' || o.checks[0].paymentStatus === 'PARTIAL')
      )
      .sort((a, b) => {
        // Ready orders first
        if (a.guestOrderStatus === 'READY_FOR_PICKUP' && b.guestOrderStatus !== 'READY_FOR_PICKUP') return -1;
        if (b.guestOrderStatus === 'READY_FOR_PICKUP' && a.guestOrderStatus !== 'READY_FOR_PICKUP') return 1;
        return 0;
      });
  });

  // --- Lifecycle ---

  ngOnInit(): void {
    if (this.isChargeMode() && this.hasCartItems()) {
      this.checkoutService.startCheckout(this.checkoutMode(), this.checkoutSource());
    }
  }

  ngOnDestroy(): void {
    if (this.isChargeMode()) {
      this.checkoutService.cancelCheckout();
    }
  }

  // --- Send mode actions ---

  getOrderId(order: Order): string {
    return getOrderIdentifier(order);
  }

  getItemSummary(order: Order): string {
    const selections = order.checks[0]?.selections ?? [];
    if (selections.length === 0) return 'No items';
    const names = selections.slice(0, 3).map(s => s.menuItemName);
    if (selections.length > 3) {
      return `${names.join(', ')} +${selections.length - 3} more`;
    }
    return names.join(', ');
  }

  getStatusLabel(order: Order): string {
    switch (order.guestOrderStatus) {
      case 'READY_FOR_PICKUP': return 'Ready';
      case 'IN_PREPARATION': return 'Preparing';
      default: return 'New';
    }
  }

  getStatusClass(order: Order): string {
    switch (order.guestOrderStatus) {
      case 'READY_FOR_PICKUP': return 'check-status-badge status-ready';
      case 'IN_PREPARATION': return 'check-status-badge status-preparing';
      default: return 'check-status-badge status-new';
    }
  }

  selectCheck(order: Order): void {
    this._selectedOrder.set(order);
    this._selectedCheck.set(order.checks[0]);
    this._sendView.set('payment');
  }

  backToList(): void {
    this._sendView.set('list');
    this._selectedOrder.set(null);
    this._selectedCheck.set(null);
    this._sendError.set('');
  }

  onPaymentComplete(): void {
    this._sendView.set('success');
  }

  onPaymentFailed(error: string): void {
    this._sendError.set(error);
    this._sendView.set('failed');
  }

  retryPayment(): void {
    this._sendView.set('payment');
  }
}
