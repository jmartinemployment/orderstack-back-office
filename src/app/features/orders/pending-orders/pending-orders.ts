import { Component, inject, computed, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { OrderService } from '../../../services/order';
import { AuthService } from '../../../services/auth';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { DeliveryService } from '../../../services/delivery';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../../shared/error-display/error-display';
import { StatusBadge } from '../../kds/status-badge/status-badge';
import {
  Order,
  OrderSource,
  GuestOrderStatus,
  ProfitInsight,
  getCustomerDisplayName,
  getOrderIdentifier,
  PrintStatus,
  Course,
  Selection,
  CourseFireStatus,
  isMarketplaceOrder,
  getMarketplaceProviderLabel,
  getMarketplaceSyncState,
  getMarketplaceSyncStateLabel,
  getMarketplaceSyncClass,
  MarketplaceSyncState,
  DeliveryAssignment,
  DeliveryTrackingInfo,
  DeliveryDispatchStatus,
} from '../../../models/index';

type MarketplaceFilterValue = 'all' | 'marketplace' | 'native';

interface PendingCourseGroup {
  course: Course | null;
  label: string;
  selections: Selection[];
  fireStatus: CourseFireStatus;
}

@Component({
  selector: 'os-pending-orders',
  imports: [CurrencyPipe, DatePipe, LoadingSpinner, ErrorDisplay, StatusBadge],
  templateUrl: './pending-orders.html',
  styleUrl: './pending-orders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingOrders implements OnInit, OnDestroy {
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly deliveryService = inject(DeliveryService);

  readonly orders = this.orderService.orders;
  readonly isLoading = this.orderService.isLoading;
  readonly error = this.orderService.error;

  private readonly _profitInsights = signal<Map<string, ProfitInsight>>(new Map());
  readonly profitInsights = this._profitInsights.asReadonly();

  readonly coursePacingMode = computed(() => this.settingsService.aiSettings().coursePacingMode);
  readonly coursePacingEnabled = computed(() => this.coursePacingMode() !== 'disabled');
  private readonly _firingCourses = signal(new Set<string>());

  // Search
  private readonly _searchQuery = signal('');
  readonly searchQuery = this._searchQuery.asReadonly();

  // Confirmation modals
  private readonly _cancelTarget = signal<Order | null>(null);
  private readonly _rejectTarget = signal<Order | null>(null);
  readonly cancelTarget = this._cancelTarget.asReadonly();
  readonly rejectTarget = this._rejectTarget.asReadonly();

  // Approval timeout
  private _approvalTimerRef: ReturnType<typeof setInterval> | null = null;
  private readonly _tick = signal(0);
  private readonly _autoRejectingIds = signal(new Set<string>());
  private readonly _marketplaceFilter = signal<MarketplaceFilterValue>('all');
  readonly marketplaceFilter = this._marketplaceFilter.asReadonly();
  readonly marketplaceFilterOptions: Array<{ value: MarketplaceFilterValue; label: string }> = [
    { value: 'all', label: 'All Sources' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'native', label: 'Direct' },
  ];

  protected readonly _selectedOrder = signal<Order | null>(null);

  private readonly _channelFilter = signal<'all' | OrderSource>('all');
  readonly channelFilter = this._channelFilter.asReadonly();
  readonly channelOptions: { value: 'all' | OrderSource; label: string; icon: string }[] = [
    { value: 'all', label: 'All', icon: 'bi-grid' },
    { value: 'pos', label: 'POS', icon: 'bi-display' },
    { value: 'online', label: 'Online', icon: 'bi-globe' },
    { value: 'kiosk', label: 'Kiosk', icon: 'bi-tablet' },
    { value: 'qr', label: 'QR', icon: 'bi-qr-code' },
    { value: 'delivery', label: 'Delivery', icon: 'bi-truck' },
    { value: 'voice', label: 'Voice', icon: 'bi-mic' },
  ];

  readonly curbsideOrders = computed(() =>
    this.orders()
      .filter(o => ['RECEIVED', 'IN_PREPARATION', 'READY_FOR_PICKUP'].includes(o.guestOrderStatus))
      .filter(o => o.curbsideInfo)
      .sort((a, b) => {
        // Arrived customers first
        const aArrived = a.curbsideInfo?.arrivalNotified ? 1 : 0;
        const bArrived = b.curbsideInfo?.arrivalNotified ? 1 : 0;
        if (bArrived !== aArrived) return bArrived - aArrived;
        return a.timestamps.createdDate.getTime() - b.timestamps.createdDate.getTime();
      })
  );

  readonly pendingOrders = computed(() => {
    const query = this._searchQuery().toLowerCase().trim();
    return this.orders()
      .filter(order => ['RECEIVED', 'IN_PREPARATION', 'READY_FOR_PICKUP'].includes(order.guestOrderStatus))
      .filter(order => this.matchesMarketplaceFilter(order))
      .filter(order => this.matchesChannelFilter(order))
      .filter(order => this.matchesSearch(order, query))
      .sort((a, b) => a.timestamps.createdDate.getTime() - b.timestamps.createdDate.getTime());
  });

  readonly approvalTimeoutHours = computed(() => this.settingsService.aiSettings().approvalTimeoutHours);

  // Bulk selection
  private readonly _selectedOrderIds = signal(new Set<string>());
  private readonly _showBulkConfirm = signal(false);
  private readonly _bulkAction = signal<GuestOrderStatus | null>(null);
  private readonly _isBulkProcessing = signal(false);
  readonly selectedOrderIds = this._selectedOrderIds.asReadonly();
  readonly showBulkConfirm = this._showBulkConfirm.asReadonly();
  readonly bulkAction = this._bulkAction.asReadonly();
  readonly isBulkProcessing = this._isBulkProcessing.asReadonly();
  readonly selectedCount = computed(() => this._selectedOrderIds().size);
  readonly allSelected = computed(() => {
    const pending = this.pendingOrders();
    const selected = this._selectedOrderIds();
    return pending.length > 0 && pending.every(o => selected.has(o.guid));
  });

  // Offline queue
  readonly queuedCount = computed(() => this.orderService.queuedCount());
  readonly isSyncing = computed(() => this.orderService.isSyncing());

  readonly pendingApprovalOrders = computed(() =>
    this.orders().filter(o => o.approvalStatus === 'NEEDS_APPROVAL')
  );

  readonly orderCounts = computed(() => {
    const orders = this.orders();
    return {
      received: orders.filter(o => o.guestOrderStatus === 'RECEIVED').length,
      inPreparation: orders.filter(o => o.guestOrderStatus === 'IN_PREPARATION').length,
      ready: orders.filter(o => o.guestOrderStatus === 'READY_FOR_PICKUP').length,
    };
  });

  // --- In-House Driver Assignment (GAP-R08) ---
  readonly drivers = this.deliveryService.drivers;
  readonly availableDrivers = this.deliveryService.availableDrivers;
  readonly activeAssignments = this.deliveryService.activeAssignments;
  private readonly _assigningOrderIds = signal(new Set<string>());

  readonly deliveryOrders = computed(() =>
    this.pendingOrders().filter(o => o.diningOption.type === 'delivery')
  );

  readonly unassignedDeliveryOrders = computed(() =>
    this.deliveryOrders().filter(o => !this.getAssignmentForOrder(o.guid))
  );

  ngOnInit(): void {
    this.orderService.loadOrders();
    this.settingsService.loadSettings();
    this.startApprovalTimeoutChecker();
    this.deliveryService.loadDrivers();
    this.deliveryService.loadActiveAssignments();
  }

  ngOnDestroy(): void {
    this.stopApprovalTimeoutChecker();
  }

  getOrderNumber(order: Order): string {
    return getOrderIdentifier(order);
  }

  setMarketplaceFilter(filter: 'all' | 'marketplace' | 'native'): void {
    this._marketplaceFilter.set(filter);
  }

  setChannelFilter(channel: 'all' | OrderSource): void {
    this._channelFilter.set(channel);
  }

  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  selectOrder(order: Order, event: Event): void {
    event.stopPropagation();
    this._selectedOrder.set(order);
  }

  closeOrderDetail(): void {
    this._selectedOrder.set(null);
  }

  private matchesSearch(order: Order, query: string): boolean {
    if (!query) return true;
    const orderNum = getOrderIdentifier(order).toLowerCase();
    if (orderNum.includes(query)) return true;
    const customerName = getCustomerDisplayName(order).toLowerCase();
    if (customerName.includes(query)) return true;
    const items = order.checks.flatMap(c => c.selections).map(s => s.menuItemName.toLowerCase());
    return items.some(name => name.includes(query));
  }

  private matchesChannelFilter(order: Order): boolean {
    const filter = this._channelFilter();
    if (filter === 'all') return true;
    const source = order.orderSource ?? 'pos';
    if (filter === 'delivery') {
      return source === 'delivery' || source.startsWith('marketplace_');
    }
    return source === filter;
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

  getCurbsideWaitTime(order: Order): string {
    const arrivedAt = order.curbsideInfo?.arrivedAt;
    if (!arrivedAt) return '';
    const minutes = Math.floor((Date.now() - arrivedAt.getTime()) / 60_000);
    if (minutes < 1) return 'Just arrived';
    if (minutes === 1) return '1 min waiting';
    return `${minutes} mins waiting`;
  }

  private matchesMarketplaceFilter(order: Order): boolean {
    const filter = this._marketplaceFilter();
    if (filter === 'all') return true;
    const marketplace = isMarketplaceOrder(order);
    if (filter === 'marketplace') return marketplace;
    return !marketplace;
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

  getTimeSinceOrder(order: Order): string {
    const minutes = Math.floor(
      (Date.now() - order.timestamps.createdDate.getTime()) / 60000
    );
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} mins ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  async confirmOrder(order: Order): Promise<void> {
    await this.orderService.confirmOrder(order.guid);
  }

  async startPreparing(order: Order): Promise<void> {
    await this.orderService.startPreparing(order.guid);
  }

  async markReady(order: Order): Promise<void> {
    await this.orderService.markReady(order.guid);
  }

  completeAndPrint(order: Order): void {
    this.printCheck(order);
    this.orderService.completeOrder(order.guid);
  }

  confirmCancel(order: Order): void {
    this._cancelTarget.set(order);
  }

  dismissCancel(): void {
    this._cancelTarget.set(null);
  }

  async executeCancel(): Promise<void> {
    const order = this._cancelTarget();
    if (!order) return;
    this._cancelTarget.set(null);
    await this.orderService.cancelOrder(order.guid);
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

  orderHasCourses(order: Order): boolean {
    if (!this.coursePacingEnabled()) return false;
    const allSelections = order.checks.flatMap(c => c.selections);
    return allSelections.some(sel => sel.course != null);
  }

  getCourseGroups(order: Order): PendingCourseGroup[] {
    const allSelections = order.checks.flatMap(c => c.selections);
    const groupMap = new Map<string, PendingCourseGroup>();

    // Immediate group for items without a course
    const immediateKey = '__immediate__';
    for (const sel of allSelections) {
      if (sel.course) {
        const key = sel.course.guid;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            course: sel.course,
            label: sel.course.name,
            selections: [],
            fireStatus: sel.course.fireStatus,
          });
        }
        groupMap.get(key)!.selections.push(sel);
      } else {
        if (!groupMap.has(immediateKey)) {
          groupMap.set(immediateKey, {
            course: null,
            label: 'Immediate',
            selections: [],
            fireStatus: 'FIRED',
          });
        }
        groupMap.get(immediateKey)!.selections.push(sel);
      }
    }

    const groups = Array.from(groupMap.values());
    // Immediate group first, then sort by sortOrder
    return groups.sort((a, b) => {
      if (!a.course) return -1;
      if (!b.course) return 1;
      return a.course.sortOrder - b.course.sortOrder;
    });
  }

  async fireCourse(orderId: string, courseGuid: string): Promise<void> {
    this._firingCourses.update(set => {
      const updated = new Set(set);
      updated.add(courseGuid);
      return updated;
    });
    try {
      await this.orderService.fireCourse(orderId, courseGuid);
    } finally {
      this._firingCourses.update(set => {
        const updated = new Set(set);
        updated.delete(courseGuid);
        return updated;
      });
    }
  }

  isFiringCourse(courseGuid: string): boolean {
    return this._firingCourses().has(courseGuid);
  }

  getFireStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'bg-secondary';
      case 'FIRED': return 'bg-primary';
      case 'READY': return 'bg-success';
      default: return 'bg-secondary';
    }
  }

  // --- Bulk selection methods ---

  toggleOrderSelection(orderId: string): void {
    this._selectedOrderIds.update(set => {
      const updated = new Set(set);
      if (updated.has(orderId)) {
        updated.delete(orderId);
      } else {
        updated.add(orderId);
      }
      return updated;
    });
  }

  isOrderSelected(orderId: string): boolean {
    return this._selectedOrderIds().has(orderId);
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this._selectedOrderIds.set(new Set());
    } else {
      this._selectedOrderIds.set(new Set(this.pendingOrders().map(o => o.guid)));
    }
  }

  clearSelection(): void {
    this._selectedOrderIds.set(new Set());
  }

  requestBulkAction(status: GuestOrderStatus): void {
    if (this.selectedCount() === 0) return;
    this._bulkAction.set(status);
    this._showBulkConfirm.set(true);
  }

  dismissBulkConfirm(): void {
    this._showBulkConfirm.set(false);
    this._bulkAction.set(null);
  }

  async executeBulkAction(): Promise<void> {
    const action = this._bulkAction();
    if (!action) return;

    this._isBulkProcessing.set(true);
    const ids = Array.from(this._selectedOrderIds());
    await this.orderService.bulkUpdateStatus(ids, action);
    this._isBulkProcessing.set(false);
    this._showBulkConfirm.set(false);
    this._bulkAction.set(null);
    this._selectedOrderIds.set(new Set());
  }

  getBulkActionLabel(): string {
    switch (this._bulkAction()) {
      case 'IN_PREPARATION': return 'Mark In Progress';
      case 'READY_FOR_PICKUP': return 'Mark Ready';
      case 'CLOSED': return 'Mark Complete';
      default: return 'Update';
    }
  }

  retry(): void {
    this.orderService.loadOrders();
  }

  // --- Approval timeout methods ---

  private startApprovalTimeoutChecker(): void {
    this._approvalTimerRef = setInterval(() => {
      this._tick.update(t => t + 1);
      this.checkAutoReject();
    }, 60_000);
  }

  private stopApprovalTimeoutChecker(): void {
    if (this._approvalTimerRef) {
      clearInterval(this._approvalTimerRef);
      this._approvalTimerRef = null;
    }
  }

  private checkAutoReject(): void {
    const timeoutMs = this.approvalTimeoutHours() * 3_600_000;
    for (const order of this.pendingApprovalOrders()) {
      const elapsed = Date.now() - order.timestamps.createdDate.getTime();
      if (elapsed >= timeoutMs) {
        this.autoRejectOrder(order);
      }
    }
  }

  private async autoRejectOrder(order: Order): Promise<void> {
    if (this._autoRejectingIds().has(order.guid)) return;
    this._autoRejectingIds.update(set => {
      const updated = new Set(set);
      updated.add(order.guid);
      return updated;
    });
    await this.orderService.rejectOrder(order.guid);
    this._autoRejectingIds.update(set => {
      const updated = new Set(set);
      updated.delete(order.guid);
      return updated;
    });
  }

  getApprovalRemainingMs(order: Order): number {
    // Force reactivity via _tick
    this._tick();
    const timeoutMs = this.approvalTimeoutHours() * 3_600_000;
    const elapsed = Date.now() - order.timestamps.createdDate.getTime();
    return Math.max(0, timeoutMs - elapsed);
  }

  getApprovalCountdown(order: Order): string {
    const remainMs = this.getApprovalRemainingMs(order);
    if (remainMs <= 0) return 'Auto-rejecting...';
    const totalMinutes = Math.ceil(remainMs / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
  }

  isApprovalUrgent(order: Order): boolean {
    const remainMs = this.getApprovalRemainingMs(order);
    return remainMs > 0 && remainMs <= 3_600_000;
  }

  isAutoRejecting(orderId: string): boolean {
    return this._autoRejectingIds().has(orderId);
  }

  getPrintStatus(orderId: string): PrintStatus {
    return this.orderService.getPrintStatus(orderId);
  }

  retryPrint(order: Order): void {
    this.orderService.retryPrint(order.guid);
  }

  getActionLabel(order: Order): string {
    switch (order.diningOption.type) {
      case 'delivery': return 'Delivered';
      case 'takeout': return 'Picked Up';
      case 'curbside': return 'Picked Up';
      case 'catering': return 'Complete';
      default: return 'Served';
    }
  }

  // --- Dining option action methods ---

  async approveOrder(order: Order): Promise<void> {
    await this.orderService.approveOrder(order.guid);
  }

  confirmReject(order: Order): void {
    this._rejectTarget.set(order);
  }

  dismissReject(): void {
    this._rejectTarget.set(null);
  }

  async executeReject(): Promise<void> {
    const order = this._rejectTarget();
    if (!order) return;
    this._rejectTarget.set(null);
    await this.orderService.rejectOrder(order.guid);
  }

  async advanceDelivery(order: Order): Promise<void> {
    const nextState = this.getNextDeliveryState(order.deliveryInfo?.deliveryState ?? '');
    if (nextState) {
      await this.orderService.updateDeliveryStatus(order.guid, nextState);
    }
  }

  async notifyArrival(order: Order): Promise<void> {
    await this.orderService.notifyCurbsideArrival(order.guid);
  }

  getDeliveryStateBadgeClass(state: string): string {
    switch (state) {
      case 'PREPARING': return 'delivery-preparing';
      case 'OUT_FOR_DELIVERY': return 'delivery-out';
      case 'DELIVERED': return 'delivery-done';
      default: return 'delivery-preparing';
    }
  }

  getDeliveryStateLabel(state: string): string {
    switch (state) {
      case 'PREPARING': return 'Preparing';
      case 'OUT_FOR_DELIVERY': return 'Out for Delivery';
      case 'DELIVERED': return 'Delivered';
      default: return state;
    }
  }

  getNextDeliveryState(current: string): string | null {
    switch (current) {
      case 'PREPARING': return 'OUT_FOR_DELIVERY';
      case 'OUT_FOR_DELIVERY': return 'DELIVERED';
      default: return null;
    }
  }

  getNextDeliveryAction(current: string): string {
    switch (current) {
      case 'PREPARING': return 'Out for Delivery';
      case 'OUT_FOR_DELIVERY': return 'Mark Delivered';
      default: return '';
    }
  }

  // --- In-House Driver Assignment (GAP-R08) ---

  getAssignmentForOrder(orderId: string): DeliveryAssignment | undefined {
    return this.activeAssignments().find(a => a.orderId === orderId);
  }

  isAssigningDriver(orderId: string): boolean {
    return this._assigningOrderIds().has(orderId);
  }

  async assignDriver(orderId: string, driverId: string): Promise<void> {
    if (!driverId || this.isAssigningDriver(orderId)) return;
    this._assigningOrderIds.update(set => {
      const updated = new Set(set);
      updated.add(orderId);
      return updated;
    });
    try {
      await this.deliveryService.assignOrderToDriver(orderId, driverId);
    } finally {
      this._assigningOrderIds.update(set => {
        const updated = new Set(set);
        updated.delete(orderId);
        return updated;
      });
    }
  }

  async updateAssignment(assignmentId: string, status: 'picked_up' | 'en_route' | 'delivered' | 'cancelled'): Promise<void> {
    await this.deliveryService.updateAssignmentStatus(assignmentId, status);
  }

  getAssignmentStatusLabel(status: string): string {
    switch (status) {
      case 'assigned': return 'Assigned';
      case 'picked_up': return 'Picked Up';
      case 'en_route': return 'En Route';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  getAssignmentStatusClass(status: string): string {
    switch (status) {
      case 'assigned': return 'assignment-assigned';
      case 'picked_up': return 'assignment-picked-up';
      case 'en_route': return 'assignment-en-route';
      case 'delivered': return 'assignment-delivered';
      case 'cancelled': return 'assignment-cancelled';
      default: return '';
    }
  }

  getNextAssignmentStatus(current: string): 'picked_up' | 'en_route' | 'delivered' | null {
    switch (current) {
      case 'assigned': return 'picked_up';
      case 'picked_up': return 'en_route';
      case 'en_route': return 'delivered';
      default: return null;
    }
  }

  getNextAssignmentAction(current: string): string {
    switch (current) {
      case 'assigned': return 'Mark Picked Up';
      case 'picked_up': return 'Mark En Route';
      case 'en_route': return 'Mark Delivered';
      default: return '';
    }
  }

  getDriverVehicleType(driverId: string): string {
    return this.deliveryService.getDriverById(driverId)?.vehicleType ?? 'car';
  }

  getVehicleIcon(vehicleType: string): string {
    switch (vehicleType) {
      case 'car': return 'bi-car-front';
      case 'bike': return 'bi-bicycle';
      case 'scooter': return 'bi-scooter';
      case 'walk': return 'bi-person-walking';
      default: return 'bi-truck';
    }
  }

  onDriverSelect(orderId: string, event: Event): void {
    const driverId = (event.target as HTMLSelectElement).value;
    if (driverId) {
      this.assignDriver(orderId, driverId);
    }
  }

  // --- Real-Time Delivery Tracking (GAP-R08 Phase 2) ---

  readonly trackingOrders = this.deliveryService.trackingOrders;
  readonly activeTrackingCount = this.deliveryService.activeTrackingCount;

  getTrackingForOrder(orderId: string): DeliveryTrackingInfo | undefined {
    return this.deliveryService.getTrackingForOrder(orderId);
  }

  isBeingTracked(orderId: string): boolean {
    return this.trackingOrders().has(orderId);
  }

  startTracking(order: Order): void {
    const externalId = order.deliveryInfo?.deliveryExternalId;
    if (!externalId) return;
    const provider = order.deliveryInfo?.deliveryProvider ?? 'doordash';
    this.deliveryService.startTrackingDelivery(order.guid, externalId, provider);
  }

  stopTracking(orderId: string): void {
    this.deliveryService.stopTrackingDelivery(orderId);
  }

  getTrackingStatusLabel(status: DeliveryDispatchStatus): string {
    return this.deliveryService.getDispatchStatusLabel(status);
  }

  getTrackingStatusClass(status: DeliveryDispatchStatus): string {
    return this.deliveryService.getDispatchStatusClass(status);
  }

  getTrackingEtaMinutes(tracking: DeliveryTrackingInfo): number | null {
    if (!tracking.estimatedDeliveryAt) return null;
    const eta = new Date(tracking.estimatedDeliveryAt).getTime();
    const now = Date.now();
    const minutes = Math.max(0, Math.round((eta - now) / 60_000));
    return minutes;
  }

  private printCheck(order: Order): void {
    const restaurantName = this.authService.selectedMerchantName() ?? 'Restaurant';
    const orderNumber = this.getOrderNumber(order);
    const date = order.timestamps.createdDate.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const orderTypeLabel = order.diningOption.name;

    const tableRow = order.table
      ? `<div><strong>Table:</strong> ${order.table.name}</div>`
      : '';

    const customerName = getCustomerDisplayName(order);
    const customerRow = customerName
      ? `<div><strong>Customer:</strong> ${customerName}</div>`
      : '';

    // Dining-specific rows
    let diningRows = '';
    if (order.deliveryInfo) {
      const di = order.deliveryInfo;
      const addr = [di.address, di.address2, di.city, di.state, di.zip].filter(Boolean).join(', ');
      diningRows += `<div><strong>Deliver to:</strong> ${addr}</div>`;
      if (di.deliveryNotes) {
        diningRows += `<div style="font-style:italic;font-size:10px;">${di.deliveryNotes}</div>`;
      }
    }
    if (order.curbsideInfo) {
      diningRows += `<div><strong>Curbside:</strong> ${order.curbsideInfo.vehicleDescription}</div>`;
    }
    if (order.cateringInfo) {
      const ci = order.cateringInfo;
      diningRows += `<div><strong>Catering:</strong> ${ci.eventType ?? 'Event'} — ${ci.headcount} guests</div>`;
    }

    const formatCurrency = (n: number) => '$' + n.toFixed(2);

    const allSelections = order.checks.flatMap(c => c.selections);
    const itemRows = allSelections.map(sel => {
      const modLines = (sel.modifiers ?? [])
        .map(m => {
          const priceSuffix = m.priceAdjustment > 0 ? ` ${formatCurrency(m.priceAdjustment)}` : '';
          return `<div class="mod">+ ${m.name}${priceSuffix}</div>`;
        })
        .join('');
      const note = sel.specialInstructions
        ? `<div class="note">Note: ${sel.specialInstructions}</div>`
        : '';
      return `
        <div class="item">
          <div class="item-row">
            <span><strong>${sel.quantity}x</strong> ${sel.menuItemName}</span>
            <span>${formatCurrency(sel.totalPrice)}</span>
          </div>
          ${modLines}${note}
        </div>`;
    }).join('');

    const tipLine = `<div class="tip-line"><span>Tip</span><span>________</span></div>`;

    const notesSection = order.specialInstructions
      ? `<div class="divider"></div><div class="notes"><strong>Notes:</strong><p>${order.specialInstructions}</p></div>`
      : '';

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Check #${orderNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 8px; color: #000; }
  .header { text-align: center; margin-bottom: 8px; }
  .header h2 { font-size: 16px; margin-bottom: 2px; }
  .header .check-label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .info { font-size: 11px; margin-bottom: 6px; }
  .item { margin-bottom: 6px; }
  .item-row { display: flex; justify-content: space-between; }
  .mod, .note { padding-left: 16px; font-size: 10px; color: #555; }
  .note { font-style: italic; }
  .total-row { display: flex; justify-content: space-between; }
  .tip-line { display: flex; justify-content: space-between; margin-top: 4px; }
  .grand-total { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 4px; }
  .amount-due { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 8px; border: 1px solid #000; padding: 4px 6px; }
  .footer { text-align: center; font-size: 11px; margin-top: 10px; }
  @media print { body { width: 80mm; } }
</style></head><body>
  <div class="header">
    <h2>${restaurantName}</h2>
    <div class="check-label">Guest Check</div>
  </div>
  <div class="divider"></div>
  <div class="info">
    <div style="display:flex;justify-content:space-between;">
      <span>Order #${orderNumber}</span><span>${orderTypeLabel}</span>
    </div>
    <div>${date}</div>
    ${customerRow}${tableRow}${diningRows}
  </div>
  <div class="divider"></div>
  ${itemRows}
  <div class="divider"></div>
  <div class="total-row"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div>
  <div class="total-row"><span>Tax</span><span>${formatCurrency(order.taxAmount)}</span></div>
  ${tipLine}
  <div class="divider" style="margin:4px 0;"></div>
  <div class="amount-due"><span>Amount Due</span><span>${formatCurrency(order.totalAmount)}</span></div>
  ${notesSection}
  <div class="divider"></div>
  <div class="footer">
    <p>Thank you for dining with us!</p>
    <p style="color:#888;">Powered by GetOrderStack</p>
  </div>
</body></html>`;

    const printWindow = globalThis.open('', '_blank', 'width=350,height=600');
    if (!printWindow) return;

    printWindow.document.documentElement.innerHTML = html;
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }
}
