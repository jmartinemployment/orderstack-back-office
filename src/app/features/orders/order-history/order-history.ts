import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../services/order';
import { PaymentService } from '../../../services/payment';
import { DeliveryService } from '../../../services/delivery';
import { AuthService } from '../../../services/auth';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../../shared/error-display/error-display';
import { StatusBadge } from '../../kds/status-badge/status-badge';
import {
  Order,
  OrderSource,
  GuestOrderStatus,
  ProfitInsight,
  OrderNoteType,
  getOrderIdentifier,
  getCustomerDisplayName,
  isMarketplaceOrder,
  getMarketplaceProviderLabel,
  getMarketplaceSyncState,
  getMarketplaceSyncStateLabel,
  getMarketplaceSyncClass,
  MarketplaceSyncState,
  OrderActivityEvent,
  OrderEventType,
} from '../../../models/index';
import { exportToCsv } from '../../../shared/utils/csv-export';

type PaymentStatusFilter = 'all' | 'paid' | 'unpaid' | 'partial' | 'refunded';
type ChannelFilter = 'all' | OrderSource;

@Component({
  selector: 'os-order-history',
  imports: [CurrencyPipe, DatePipe, FormsModule, LoadingSpinner, ErrorDisplay, StatusBadge],
  templateUrl: './order-history.html',
  styleUrl: './order-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderHistory implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly paymentService = inject(PaymentService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly authService = inject(AuthService);

  private readonly _statusFilter = signal<GuestOrderStatus | 'all'>('all');
  private readonly _channelFilter = signal<ChannelFilter>('all');
  private readonly _paymentFilter = signal<PaymentStatusFilter>('all');
  private readonly _searchQuery = signal('');
  private readonly _dateFrom = signal<string | null>(null);
  private readonly _dateTo = signal<string | null>(null);
  private readonly _employeeFilter = signal('');
  private readonly _selectedOrder = signal<Order | null>(null);
  private readonly _isRetryingMarketplaceSync = signal(false);
  private readonly _marketplaceSyncNotice = signal<string | null>(null);
  private readonly _showAdvancedFilters = signal(false);

  private readonly _profitInsights = signal<Map<string, ProfitInsight>>(new Map());
  readonly profitInsights = this._profitInsights.asReadonly();

  readonly statusFilter = this._statusFilter.asReadonly();
  readonly channelFilter = this._channelFilter.asReadonly();
  readonly paymentFilter = this._paymentFilter.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly dateFrom = this._dateFrom.asReadonly();
  readonly dateTo = this._dateTo.asReadonly();
  readonly employeeFilter = this._employeeFilter.asReadonly();
  readonly selectedOrder = this._selectedOrder.asReadonly();
  readonly isRetryingMarketplaceSync = this._isRetryingMarketplaceSync.asReadonly();
  readonly marketplaceSyncNotice = this._marketplaceSyncNotice.asReadonly();
  readonly showAdvancedFilters = this._showAdvancedFilters.asReadonly();
  readonly canManageMarketplaceSync = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'owner' || role === 'manager' || role === 'super_admin';
  });

  readonly orders = this.orderService.orders;
  readonly isLoading = this.orderService.isLoading;
  readonly error = this.orderService.error;

  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this._channelFilter() !== 'all') count++;
    if (this._paymentFilter() !== 'all') count++;
    if (this._dateFrom()) count++;
    if (this._dateTo()) count++;
    if (this._employeeFilter().trim()) count++;
    return count;
  });

  readonly filteredOrders = computed(() => {
    const statusFilter = this._statusFilter();
    const channelFilter = this._channelFilter();
    const paymentFilter = this._paymentFilter();
    const query = this._searchQuery().toLowerCase().trim();
    const dateFrom = this._dateFrom();
    const dateTo = this._dateTo();
    const employeeQuery = this._employeeFilter().toLowerCase().trim();

    return this.orders().filter(order =>
      this.matchesStatusFilter(order, statusFilter)
      && this.matchesChannelFilter(order, channelFilter)
      && this.matchesPaymentFilter(order, paymentFilter)
      && this.matchesDateRange(order, dateFrom, dateTo)
      && this.matchesEmployeeFilter(order, employeeQuery)
      && this.matchesSearchQuery(order, query)
    );
  });

  readonly statusOptions: { value: GuestOrderStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All Orders' },
    { value: 'RECEIVED', label: 'Received' },
    { value: 'IN_PREPARATION', label: 'Preparing' },
    { value: 'READY_FOR_PICKUP', label: 'Ready' },
    { value: 'CLOSED', label: 'Completed' },
    { value: 'VOIDED', label: 'Cancelled' },
  ];

  readonly channelOptions: { value: ChannelFilter; label: string; icon: string }[] = [
    { value: 'all', label: 'All', icon: 'bi-grid' },
    { value: 'pos', label: 'POS', icon: 'bi-display' },
    { value: 'online', label: 'Online', icon: 'bi-globe' },
    { value: 'kiosk', label: 'Kiosk', icon: 'bi-tablet' },
    { value: 'qr', label: 'QR', icon: 'bi-qr-code' },
    { value: 'delivery', label: 'Delivery', icon: 'bi-truck' },
    { value: 'voice', label: 'Voice', icon: 'bi-mic' },
  ];

  readonly paymentOptions: { value: PaymentStatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'paid', label: 'Paid' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partial', label: 'Partial' },
    { value: 'refunded', label: 'Refunded' },
  ];

  private matchesStatusFilter(order: Order, statusFilter: GuestOrderStatus | 'all'): boolean {
    return statusFilter === 'all' || order.guestOrderStatus === statusFilter;
  }

  private matchesChannelFilter(order: Order, channelFilter: ChannelFilter): boolean {
    if (channelFilter === 'all') return true;
    const source = order.orderSource ?? 'pos';
    if (channelFilter === 'delivery') {
      return source === 'delivery' || source.startsWith('marketplace_');
    }
    return source === channelFilter;
  }

  private matchesPaymentFilter(order: Order, paymentFilter: PaymentStatusFilter): boolean {
    if (paymentFilter === 'all') return true;
    const paymentStatus = order.checks[0]?.paymentStatus ?? 'OPEN';
    switch (paymentFilter) {
      case 'paid': return paymentStatus === 'PAID';
      case 'unpaid': return paymentStatus === 'OPEN';
      case 'partial': return paymentStatus === 'PARTIAL';
      case 'refunded': return paymentStatus === 'CLOSED';
      default: return true;
    }
  }

  private matchesDateRange(order: Order, dateFrom: string | null, dateTo: string | null): boolean {
    const orderDate = order.timestamps.createdDate;
    if (dateFrom && orderDate < new Date(dateFrom)) return false;
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (orderDate > toDate) return false;
    }
    return true;
  }

  private matchesEmployeeFilter(order: Order, employeeQuery: string): boolean {
    if (!employeeQuery) return true;
    const serverName = order.server?.name?.toLowerCase() ?? '';
    return serverName.includes(employeeQuery);
  }

  private matchesSearchQuery(order: Order, query: string): boolean {
    if (!query) return true;
    const orderNum = getOrderIdentifier(order).toLowerCase();
    const customerName = getCustomerDisplayName(order).toLowerCase();
    const items = order.checks.flatMap(c => c.selections).map(s => s.menuItemName.toLowerCase());
    const phone = order.customer?.phone?.toLowerCase() ?? '';
    const serverName = order.server?.name?.toLowerCase() ?? '';
    return orderNum.includes(query)
      || customerName.includes(query)
      || items.some(n => n.includes(query))
      || phone.includes(query)
      || serverName.includes(query);
  }

  ngOnInit(): void {
    this.orderService.loadOrders();
  }

  setStatusFilter(status: GuestOrderStatus | 'all'): void {
    this._statusFilter.set(status);
  }

  setChannelFilter(channel: ChannelFilter): void {
    this._channelFilter.set(channel);
  }

  setPaymentFilter(filter: PaymentStatusFilter): void {
    this._paymentFilter.set(filter);
  }

  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  setDateFrom(date: string): void {
    this._dateFrom.set(date || null);
  }

  setDateTo(date: string): void {
    this._dateTo.set(date || null);
  }

  setEmployeeFilter(name: string): void {
    this._employeeFilter.set(name);
  }

  toggleAdvancedFilters(): void {
    this._showAdvancedFilters.update(v => !v);
  }

  clearAdvancedFilters(): void {
    this._channelFilter.set('all');
    this._paymentFilter.set('all');
    this._dateFrom.set(null);
    this._dateTo.set(null);
    this._employeeFilter.set('');
  }

  exportOrders(): void {
    const orders = this.filteredOrders();
    const headers = ['Order #', 'Date', 'Status', 'Channel', 'Type', 'Customer', 'Server', 'Items', 'Subtotal', 'Tax', 'Tip', 'Total', 'Payment'];
    const rows = orders.map(order => {
      const items = order.checks.flatMap(c => c.selections).map(s => `${s.quantity}x ${s.menuItemName}`).join('; ');
      const customer = getCustomerDisplayName(order);
      return [
        getOrderIdentifier(order),
        order.timestamps.createdDate.toLocaleString(),
        order.guestOrderStatus,
        order.orderSource ?? 'pos',
        order.diningOption.name,
        customer,
        order.server?.name ?? '',
        items,
        order.subtotal.toFixed(2),
        order.taxAmount.toFixed(2),
        order.tipAmount.toFixed(2),
        order.totalAmount.toFixed(2),
        order.checks[0]?.paymentStatus ?? 'OPEN',
      ];
    });
    exportToCsv('order-history.csv', headers, rows);
  }

  selectOrder(order: Order): void {
    this._selectedOrder.set(order);
    this._marketplaceSyncNotice.set(null);
    this._activityLoaded.set(false);
  }

  closeOrderDetail(): void {
    this._selectedOrder.set(null);
    this._marketplaceSyncNotice.set(null);
  }

  getOrderNumber(order: Order): string {
    return getOrderIdentifier(order);
  }

  getChannelIcon(order: Order): string {
    const source = order.orderSource ?? 'pos';
    const found = this.channelOptions.find(c => c.value === source);
    if (found) return found.icon;
    if (source.startsWith('marketplace_')) return 'bi-shop';
    return 'bi-display';
  }

  getChannelLabel(order: Order): string {
    const source = order.orderSource ?? 'pos';
    const found = this.channelOptions.find(c => c.value === source);
    if (found) return found.label;
    if (source === 'marketplace_doordash') return 'DoorDash';
    if (source === 'marketplace_ubereats') return 'UberEats';
    if (source === 'marketplace_grubhub') return 'Grubhub';
    return 'POS';
  }

  async fetchProfitInsight(order: Order): Promise<void> {
    if (this._profitInsights().has(order.guid)) return;
    const insight = await this.orderService.getProfitInsight(order.guid);
    if (insight) {
      this._profitInsights.update(map => {
        const updated = new Map(map);
        updated.set(order.guid, insight);
        return updated;
      });
    }
  }

  getInsight(orderId: string): ProfitInsight | undefined {
    return this._profitInsights().get(orderId);
  }

  isMarketplace(order: Order): boolean {
    return isMarketplaceOrder(order);
  }

  marketplaceProviderLabel(order: Order): string {
    return getMarketplaceProviderLabel(order) ?? 'Marketplace';
  }

  marketplaceSyncState(order: Order): MarketplaceSyncState | null {
    return getMarketplaceSyncState(order);
  }

  marketplaceSyncLabel(order: Order): string {
    return getMarketplaceSyncStateLabel(this.marketplaceSyncState(order));
  }

  marketplaceSyncClass(order: Order): string {
    return getMarketplaceSyncClass(order);
  }

  async retryMarketplaceSync(order: Order): Promise<void> {
    if (!this.canManageMarketplaceSync()) return;
    if (!isMarketplaceOrder(order)) return;
    if (this._isRetryingMarketplaceSync()) return;

    this._isRetryingMarketplaceSync.set(true);
    this._marketplaceSyncNotice.set(null);
    try {
      const ok = await this.deliveryService.retryMarketplaceSyncForOrder(order);
      if (!ok) {
        this._marketplaceSyncNotice.set(this.deliveryService.error() ?? 'Marketplace sync retry failed');
        return;
      }
      this._marketplaceSyncNotice.set('Marketplace sync retry queued.');
      this.orderService.loadOrders();
    } finally {
      this._isRetryingMarketplaceSync.set(false);
    }
  }

  private readonly _isRefunding = signal(false);
  private readonly _refundError = signal<string | null>(null);
  private readonly _refundSuccess = signal(false);

  readonly isRefunding = this._isRefunding.asReadonly();
  readonly refundError = this._refundError.asReadonly();
  readonly refundSuccess = this._refundSuccess.asReadonly();

  getPaymentBadgeClass(status: string): string {
    switch (status) {
      case 'PAID': return 'payment-paid';
      case 'OPEN': return 'payment-pending';
      case 'CLOSED': return 'payment-refunded';
      default: return 'payment-pending';
    }
  }

  getPaymentLabel(status: string): string {
    switch (status) {
      case 'PAID': return 'Paid';
      case 'OPEN': return 'Unpaid';
      case 'CLOSED': return 'Closed';
      default: return status;
    }
  }

  async refundOrder(order: Order): Promise<void> {
    this._isRefunding.set(true);
    this._refundError.set(null);
    this._refundSuccess.set(false);

    const result = await this.paymentService.requestRefund(order.guid);

    this._isRefunding.set(false);

    if (result?.success) {
      this._refundSuccess.set(true);
    } else {
      this._refundError.set(this.paymentService.error() ?? 'Refund failed');
    }
  }

  dismissRefundStatus(): void {
    this._refundError.set(null);
    this._refundSuccess.set(false);
  }

  // --- Order Notes ---

  private readonly _showNoteForm = signal(false);
  private readonly _noteText = signal('');
  private readonly _noteType = signal<OrderNoteType>('internal');
  private readonly _isAddingNote = signal(false);
  readonly showNoteForm = this._showNoteForm.asReadonly();
  readonly noteText = this._noteText.asReadonly();
  readonly noteType = this._noteType.asReadonly();
  readonly isAddingNote = this._isAddingNote.asReadonly();

  toggleNoteForm(): void {
    this._showNoteForm.update(v => !v);
    if (!this._showNoteForm()) {
      this._noteText.set('');
      this._noteType.set('internal');
    }
  }

  setNoteText(text: string): void {
    this._noteText.set(text);
  }

  setNoteType(type: OrderNoteType): void {
    this._noteType.set(type);
  }

  async submitNote(): Promise<void> {
    const order = this._selectedOrder();
    const text = this._noteText().trim();
    if (!order || !text) return;

    this._isAddingNote.set(true);
    await this.orderService.addOrderNote(order.guid, this._noteType(), text);
    this._isAddingNote.set(false);
    this._noteText.set('');
    this._showNoteForm.set(false);
    // Refresh order data
    this.orderService.loadOrders();
  }

  // --- Activity Log ---

  private readonly _activityLoading = signal(false);
  private readonly _activityLoaded = signal(false);
  readonly activityLoading = this._activityLoading.asReadonly();
  readonly activityLoaded = this._activityLoaded.asReadonly();

  async loadActivity(order: Order): Promise<void> {
    this._activityLoading.set(true);
    await this.orderService.loadOrderActivity(order.guid);
    this._activityLoading.set(false);
    this._activityLoaded.set(true);
  }

  getActivity(): OrderActivityEvent[] {
    const order = this._selectedOrder();
    if (!order) return [];
    return this.orderService.getActivityEvents(order.guid);
  }

  getActivityIcon(eventType: OrderEventType): string {
    switch (eventType) {
      case 'order_created': return 'bi-plus-circle';
      case 'item_added': return 'bi-cart-plus';
      case 'item_removed': return 'bi-cart-dash';
      case 'item_voided': return 'bi-x-circle';
      case 'item_comped': return 'bi-gift';
      case 'status_changed': return 'bi-arrow-repeat';
      case 'check_split': return 'bi-scissors';
      case 'check_merged': return 'bi-union';
      case 'check_transferred': return 'bi-arrow-left-right';
      case 'payment_received': return 'bi-credit-card';
      case 'payment_refunded': return 'bi-arrow-counterclockwise';
      case 'discount_applied': return 'bi-percent';
      case 'discount_removed': return 'bi-x-lg';
      case 'tab_opened': return 'bi-wallet2';
      case 'tab_closed': return 'bi-wallet';
      case 'course_fired': return 'bi-fire';
      case 'delivery_dispatched': return 'bi-truck';
      case 'delivery_status_changed': return 'bi-geo-alt';
      case 'manager_override': return 'bi-shield-lock';
      case 'note_added': return 'bi-chat-left-text';
      default: return 'bi-circle';
    }
  }

  retry(): void {
    this.orderService.loadOrders();
  }

  getDeliveryStateLabel(state: string): string {
    switch (state) {
      case 'PREPARING': return 'Preparing';
      case 'OUT_FOR_DELIVERY': return 'Out for Delivery';
      case 'DELIVERED': return 'Delivered';
      default: return state;
    }
  }
}
