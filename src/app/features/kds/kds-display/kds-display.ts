import { Component, inject, signal, computed, effect, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { OrderService } from '../../../services/order';
import { SocketService } from '../../../services/socket';
import { AuthService } from '../../../services/auth';
import { MenuService } from '../../../services/menu';
import { DeliveryService } from '../../../services/delivery';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { StationService } from '../../../services/station';
import { OrderCard } from '../order-card/order-card';
import { ConnectionStatus } from '../../../shared/connection-status/connection-status';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../../shared/error-display/error-display';
import { PaymentService } from '../../../services/payment';
import {
  Order,
  GuestOrderStatus,
  CoursePacingMode,
  CoursePacingMetrics,
  CoursePacingConfidence,
  OrderThrottlingStatus,
  PrintStatus,
  DeliveryQuote,
  DeliveryProviderType,
  DispatchState,
  isMarketplaceOrder,
} from '../../../models/index';

type MarketplaceFilterOption = 'all' | 'doordash' | 'ubereats' | 'grubhub' | 'marketplace' | 'native';

const ACTIVE_DISPATCH_STATUSES = new Set([
  'DISPATCH_REQUESTED',
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE_TO_PICKUP',
  'DRIVER_AT_PICKUP',
  'PICKED_UP',
  'DRIVER_EN_ROUTE_TO_DROPOFF',
  'DRIVER_AT_DROPOFF',
  'DELIVERED',
]);

@Component({
  selector: 'os-kds-display',
  imports: [OrderCard, ConnectionStatus, LoadingSpinner, ErrorDisplay],
  templateUrl: './kds-display.html',
  styleUrl: './kds-display.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KdsDisplay implements OnInit, OnDestroy {
  private readonly orderService = inject(OrderService);
  private readonly socketService = inject(SocketService);
  private readonly authService = inject(AuthService);
  private readonly menuService = inject(MenuService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly stationService = inject(StationService);
  private readonly paymentService = inject(PaymentService);

  private readonly _selectedStationId = signal<string | null>(
    typeof localStorage === 'undefined' ? null : localStorage.getItem('kds-station-id')
  );
  private readonly _deliveryQuotes = signal<Map<string, DeliveryQuote>>(new Map());
  private readonly _dispatchStates = signal<Map<string, DispatchState>>(new Map());
  private readonly _dispatchErrors = signal<Map<string, string>>(new Map());
  private readonly _autoDispatchTriggered = signal(new Set<string>());
  private readonly _rushedOrders = signal(new Set<string>());
  private readonly _operatorOverride = signal(false);
  private readonly _coursePacingMode = signal<CoursePacingMode>('disabled');
  private readonly _expoStationEnabled = signal(false);
  private readonly _expoOverride = signal(false);
  private readonly _expoCheckedOrders = signal(new Set<string>());
  private readonly _autoFireDelay = signal(300);
  private readonly _targetCourseServeGapSeconds = signal(1200);
  private readonly _coursePacingMetrics = signal<CoursePacingMetrics | null>(null);
  private readonly _coursePacingMetricsLoading = signal(false);
  private readonly _orderThrottlingStatus = signal<OrderThrottlingStatus | null>(null);
  private readonly _orderThrottlingStatusLoading = signal(false);
  private readonly _prepTimeFiringEnabled = signal(false);
  private readonly _defaultPrepMinutes = signal(10);
  private readonly _marketplaceFilter = signal<MarketplaceFilterOption>('all');
  private readonly _paymentOrderId = signal<string | null>(null);
  private readonly _paymentError = signal<string | null>(null);
  private readonly _showPaymentModal = signal(false);
  private throttlingPollTimer: ReturnType<typeof setInterval> | null = null;
  readonly coursePacingMode = this._coursePacingMode.asReadonly();
  readonly expoStationEnabled = this._expoStationEnabled.asReadonly();
  readonly autoFireDelay = this._autoFireDelay.asReadonly();
  readonly targetCourseServeGapSeconds = this._targetCourseServeGapSeconds.asReadonly();
  readonly coursePacingBaselineSeconds = computed(() =>
    this._coursePacingMetrics()?.tablePaceBaselineSeconds ?? 900
  );
  readonly coursePacingConfidence = computed<CoursePacingConfidence>(() =>
    this._coursePacingMetrics()?.confidence ?? 'low'
  );
  readonly orderThrottlingStatus = this._orderThrottlingStatus.asReadonly();
  readonly isThrottleGateActive = computed(() => this._orderThrottlingStatus()?.triggering ?? false);
  readonly throttleGateReason = computed(() => {
    const reason = this._orderThrottlingStatus()?.triggerReason;
    if (reason === 'ACTIVE_OVERLOAD') return 'Active ticket overload';
    if (reason === 'OVERDUE_OVERLOAD') return 'Overdue ticket overload';
    return 'Load recovered';
  });
  readonly prepTimeFiringEnabled = this._prepTimeFiringEnabled.asReadonly();
  readonly defaultPrepMinutes = this._defaultPrepMinutes.asReadonly();
  readonly marketplaceFilter = this._marketplaceFilter.asReadonly();
  readonly marketplaceFilterOptions: Array<{ value: MarketplaceFilterOption; label: string }> = [
    { value: 'all', label: 'All Sources' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'native', label: 'Direct' },
  ];

  readonly showPaymentModal = this._showPaymentModal.asReadonly();
  readonly paymentError = this._paymentError.asReadonly();
  readonly showCollectPayment = computed(() =>
    this.settingsService.paymentSettings().processor !== 'none'
  );
  readonly paymentOrder = computed(() => {
    const id = this._paymentOrderId();
    if (!id) return null;
    return this.orderService.getOrderById(id) ?? null;
  });
  readonly paymentCheck = computed(() => this.paymentOrder()?.checks[0] ?? null);
  readonly paymentAmount = computed(() => this.paymentCheck()?.totalAmount ?? 0);

  readonly selectedStationId = this._selectedStationId.asReadonly();
  readonly stations = this.stationService.activeStations;

  /** Map from menuItemGuid → stationId (built from menu items + category-to-station mappings). */
  readonly menuItemToStationMap = computed(() => {
    const catToStation = this.stationService.categoryToStationMap();
    const map = new Map<string, string>();
    for (const item of this.menuService.allItemsUnfiltered()) {
      if (item.categoryId) {
        const stationId = catToStation.get(item.categoryId);
        if (stationId) {
          map.set(item.id, stationId);
        }
      }
    }
    return map;
  });

  constructor() {
    effect(() => {
      const mode = this.settingsService.aiSettings().coursePacingMode;
      if (!this._operatorOverride()) {
        this._coursePacingMode.set(mode);
      }
    });
    effect(() => {
      const enabled = this.settingsService.aiSettings().expoStationEnabled;
      if (!this._expoOverride()) {
        this._expoStationEnabled.set(enabled);
      }
    });
    effect(() => {
      const target = this.settingsService.aiSettings().targetCourseServeGapSeconds;
      this._targetCourseServeGapSeconds.set(this.normalizeTargetCourseServeGapSeconds(target));
    });
    effect(() => {
      const merchantId = this.authService.selectedMerchantId();
      const mode = this._coursePacingMode();
      if (!merchantId) return;
      if (mode !== 'auto_fire_timed') return;
      this.loadCoursePacingMetrics();
    });
    effect(() => {
      const provider = this.settingsService.deliverySettings().provider;
      this.deliveryService.setProviderType(provider);
      if (this.isDaaSProvider(provider)) {
        this.deliveryService.loadConfigStatus();
      }
    });
    effect(() => {
      const autoDispatch = this.settingsService.deliverySettings().autoDispatch;
      const providerReady = this.deliveryService.selectedProviderConfigured();
      const readyOrders = this.rawReadyOrders();
      if (!autoDispatch || !providerReady) return;

      for (const order of readyOrders) {
        this.maybeAutoDispatch(order.guid);
      }
    });
    effect(() => {
      const activeOrderIds = new Set([
        ...this.rawPendingOrders().map(o => o.guid),
        ...this.rawPreparingOrders().map(o => o.guid),
        ...this.rawReadyOrders().map(o => o.guid),
      ]);
      this.pruneDispatchRuntime(activeOrderIds);
    });
    effect(() => {
      const readyIds = new Set(this.rawReadyOrders().map(o => o.guid));
      this._autoDispatchTriggered.update(set => {
        const next = new Set<string>();
        for (const id of set) {
          if (readyIds.has(id)) next.add(id);
        }
        return next;
      });
    });
  }

  readonly pacingModeOptions: { value: CoursePacingMode; label: string }[] = [
    { value: 'disabled', label: 'Disabled' },
    { value: 'server_fires', label: 'Server Fires' },
    { value: 'auto_fire_timed', label: 'Auto-Fire Timed' },
  ];

  readonly rawThrottledOrders = computed(() =>
    this.orderService.orders().filter(order =>
      order.throttle?.state === 'HELD'
      && (order.guestOrderStatus === 'RECEIVED' || order.guestOrderStatus === 'IN_PREPARATION')
    )
  );
  readonly rawPendingOrders = computed(() =>
    this.orderService.pendingOrders().filter(order => order.throttle?.state !== 'HELD')
  );
  readonly rawPreparingOrders = computed(() =>
    this.orderService.preparingOrders().filter(order => order.throttle?.state !== 'HELD')
  );
  readonly rawReadyOrders = this.orderService.readyOrders;
  readonly throttledOrders = computed(() => this.filterByStation(this.filterByMarketplace(this.rawThrottledOrders())));
  readonly pendingOrders = computed(() => this.filterByStation(this.filterByMarketplace(this.rawPendingOrders())));
  readonly preparingOrders = computed(() => this.filterByStation(this.filterByMarketplace(this.rawPreparingOrders())));
  readonly readyOrders = computed(() => this.filterByStation(this.filterByMarketplace(this.rawReadyOrders())));
  readonly showThrottledColumn = computed(() =>
    this.settingsService.aiSettings().orderThrottlingEnabled || this.throttledOrders().length > 0
  );
  readonly selectedDeliveryProvider = computed(() => this.settingsService.deliverySettings().provider);
  readonly showDeliveryDispatchStatus = computed(() =>
    this.isDaaSProvider(this.selectedDeliveryProvider())
  );
  readonly deliveryProviderLabel = computed(() => {
    const provider = this.selectedDeliveryProvider();
    if (provider === 'doordash') return 'DoorDash';
    if (provider === 'uber') return 'Uber';
    return null;
  });
  readonly deliveryDispatchStatus = computed<'checking' | 'ready' | 'blocked' | null>(() => {
    const provider = this.selectedDeliveryProvider();
    if (!this.isDaaSProvider(provider)) return null;
    if (!this.deliveryService.configStatus()) return 'checking';
    return this.deliveryService.isProviderConfiguredFor(provider) ? 'ready' : 'blocked';
  });
  readonly kdsColumnCount = computed(() => {
    let count = 3; // NEW, COOKING, READY
    if (this.expoStationEnabled()) count += 1;
    if (this.showThrottledColumn()) count += 1;
    return count;
  });

  readonly expoQueueOrders = computed(() => {
    if (!this._expoStationEnabled()) return [];
    const checked = this._expoCheckedOrders();
    return this.readyOrders().filter(o => !checked.has(o.guid));
  });

  readonly expoCheckedOrders = computed(() => {
    if (!this._expoStationEnabled()) return this.readyOrders();
    const checked = this._expoCheckedOrders();
    return this.readyOrders().filter(o => checked.has(o.guid));
  });
  readonly isLoading = this.orderService.isLoading;
  readonly error = this.orderService.error;
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly restaurantName = this.authService.selectedMerchantName;

  // Prep time lookup map: menuItemId → prepTimeMinutes
  readonly prepTimeMap = computed(() => {
    const map = new Map<string, number>();
    for (const item of this.menuService.allItemsUnfiltered()) {
      if (item.prepTimeMinutes) {
        map.set(item.id, item.prepTimeMinutes);
      }
    }
    return map;
  });

  // KDS stats
  readonly activeOrderCount = computed(() =>
    this.pendingOrders().length + this.preparingOrders().length
  );

  readonly overdueCount = computed(() => {
    const map = this.prepTimeMap();
    let count = 0;
    const activeOrders = [...this.pendingOrders(), ...this.preparingOrders()];
    for (const order of activeOrders) {
      const est = this.getOrderPrepTime(order, map);
      if (est > 0) {
        const elapsed = Math.floor((Date.now() - order.timestamps.createdDate.getTime()) / 60000);
        if (elapsed > est) count++;
      }
    }
    return count;
  });

  readonly avgWaitMinutes = computed(() => {
    const activeOrders = [...this.pendingOrders(), ...this.preparingOrders()];
    if (activeOrders.length === 0) return 0;
    const totalMinutes = activeOrders.reduce((sum, order) => {
      return sum + Math.floor((Date.now() - order.timestamps.createdDate.getTime()) / 60000);
    }, 0);
    return Math.round(totalMinutes / activeOrders.length);
  });

  formatWaitTime(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    return `${Math.floor(hours / 24)}d`;
  }

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.loadOrders();
      this.connectSocket();
      this.menuService.loadMenu();
      this.settingsService.loadSettings();
      this.stationService.loadStations();
      this.stationService.loadCategoryMappings();
      if (this.isDaaSProvider(this.settingsService.deliverySettings().provider)) {
        this.deliveryService.loadConfigStatus();
      }
      this.loadOrderThrottlingStatus();
      this.startThrottlingPolling();
    }
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
    if (this.throttlingPollTimer) {
      clearInterval(this.throttlingPollTimer);
      this.throttlingPollTimer = null;
    }
  }

  private loadOrders(): void {
    this.orderService.loadOrders({ limit: 50 });
  }

  private async loadCoursePacingMetrics(): Promise<void> {
    if (this._coursePacingMetricsLoading()) return;
    this._coursePacingMetricsLoading.set(true);
    try {
      const metrics = await this.orderService.getCoursePacingMetrics(30);
      this._coursePacingMetrics.set(metrics);
    } catch {
      // OrderService sets _error internally; metrics remain at last known value
    } finally {
      this._coursePacingMetricsLoading.set(false);
    }
  }

  private async loadOrderThrottlingStatus(): Promise<void> {
    if (this._orderThrottlingStatusLoading()) return;
    this._orderThrottlingStatusLoading.set(true);
    try {
      const status = await this.orderService.getOrderThrottlingStatus();
      this._orderThrottlingStatus.set(status);
    } catch {
      // OrderService sets _error internally; status remains at last known value
    } finally {
      this._orderThrottlingStatusLoading.set(false);
    }
  }

  private startThrottlingPolling(): void {
    if (this.throttlingPollTimer) {
      clearInterval(this.throttlingPollTimer);
    }
    this.throttlingPollTimer = setInterval(() => {
      this.loadOrderThrottlingStatus();
    }, 30_000);
  }

  private connectSocket(): void {
    const merchantId = this.authService.selectedMerchantId();
    if (merchantId) {
      this.socketService.connect(merchantId, 'kds');
    }
  }

  getEstimatedPrep(order: Order): number {
    return this.getOrderPrepTime(order, this.prepTimeMap());
  }

  isRushed(orderId: string): boolean {
    return this._rushedOrders().has(orderId);
  }

  toggleRush(orderId: string): void {
    this._rushedOrders.update(set => {
      const updated = new Set(set);
      if (updated.has(orderId)) {
        updated.delete(orderId);
      } else {
        updated.add(orderId);
      }
      return updated;
    });
  }

  setMarketplaceFilter(filter: MarketplaceFilterOption): void {
    this._marketplaceFilter.set(filter);
  }

  selectStation(stationId: string | null): void {
    this._selectedStationId.set(stationId);
    if (typeof localStorage !== 'undefined') {
      if (stationId) {
        localStorage.setItem('kds-station-id', stationId);
      } else {
        localStorage.removeItem('kds-station-id');
      }
    }
  }

  onStatusChange(event: { orderId: string; status: GuestOrderStatus }): void {
    const skipPrint = this._expoStationEnabled() && event.status === 'READY_FOR_PICKUP';

    // Backend requires pending → confirmed → preparing (can't skip confirmed).
    // When KDS START is clicked on a RECEIVED order, confirm first then prepare.
    const order = this.orderService.getOrderById(event.orderId);
    const needsConfirmFirst = event.status === 'IN_PREPARATION' && order?.guestOrderStatus === 'RECEIVED';

    const doUpdate = async (): Promise<void> => {
      if (needsConfirmFirst) {
        const confirmed = await this.orderService.updateOrderStatus(event.orderId, 'RECEIVED');
        if (!confirmed) return;
      }

      const success = await this.orderService.updateOrderStatus(
        event.orderId, event.status, skipPrint ? { skipPrint: true } : undefined
      );
      if (!success) return;

      if (event.status === 'READY_FOR_PICKUP' && this.settingsService.deliverySettings().autoDispatch) {
        this.maybeAutoDispatch(event.orderId);
        this.loadOrderThrottlingStatus();
        return;
      }

      this.clearOrderDispatchRuntime(event.orderId);
      this.loadOrderThrottlingStatus();
    };

    void doUpdate();
  }

  onExpoCheck(orderId: string): void {
    this._expoCheckedOrders.update(set => {
      const updated = new Set(set);
      updated.add(orderId);
      return updated;
    });
    this.orderService.triggerPrint(orderId);
  }

  toggleExpoStation(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (!checked) {
      const checkedSet = this._expoCheckedOrders();
      for (const order of this.rawReadyOrders()) {
        if (!checkedSet.has(order.guid)) {
          this.orderService.triggerPrint(order.guid);
        }
      }
    }
    this._expoStationEnabled.set(checked);
    this._expoOverride.set(true);
    if (!checked) {
      this._expoCheckedOrders.set(new Set());
    }
  }

  setCoursePacingMode(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as CoursePacingMode;
    this._coursePacingMode.set(value);
    this._operatorOverride.set(true);
  }

  setAutoFireDelay(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10) || 300;
    this._autoFireDelay.set(value);
  }

  onFireCourse(event: { orderId: string; courseGuid: string }): void {
    this.orderService.fireCourse(event.orderId, event.courseGuid);
  }

  togglePrepTimeFiring(event: Event): void {
    this._prepTimeFiringEnabled.set((event.target as HTMLInputElement).checked);
  }

  setDefaultPrepMinutes(event: Event): void {
    const val = Number.parseInt((event.target as HTMLInputElement).value, 10);
    if (val > 0) this._defaultPrepMinutes.set(val);
  }

  onFireItemNow(event: { orderId: string; selectionGuid: string }): void {
    this.orderService.fireItemNow(event.orderId, event.selectionGuid);
  }

  getPrintStatus(orderId: string): PrintStatus {
    return this.orderService.getPrintStatus(orderId);
  }

  onRetryPrint(orderId: string): void {
    this.orderService.retryPrint(orderId);
  }

  onRecall(orderId: string): void {
    this.orderService.recallOrder(orderId);
  }

  onRemakeItem(event: { orderId: string; checkGuid: string; selectionGuid: string }): void {
    this.orderService.remakeItem(event.orderId, event.checkGuid, event.selectionGuid, 'Remake requested from KDS');
  }

  onReleaseThrottle(orderId: string): void {
    this.orderService.releaseOrderFromThrottling(orderId).then(success => {
      if (success) this.loadOrderThrottlingStatus();
    });
  }

  onManualThrottleHold(orderId: string): void {
    this.orderService.holdOrderForThrottling(orderId).then(success => {
      if (success) this.loadOrderThrottlingStatus();
    });
  }

  onCollectPayment(orderId: string): void {
    const settings = this.settingsService.paymentSettings();
    this.paymentService.setProcessorType(settings.processor);

    this._paymentOrderId.set(orderId);
    this._paymentError.set(null);
    this._showPaymentModal.set(true);
  }

  onPaymentComplete(): void {
    const orderId = this._paymentOrderId();
    this.closePaymentModal();
    this.paymentService.reset();

    if (orderId) {
      this.onStatusChange({ orderId, status: 'CLOSED' });
    }
  }

  onPaymentFailed(message: string): void {
    this._paymentError.set(message);
  }

  closePaymentModal(): void {
    this._showPaymentModal.set(false);
    this._paymentOrderId.set(null);
    this._paymentError.set(null);
  }

  getDeliveryQuote(orderId: string): DeliveryQuote | null {
    return this._deliveryQuotes().get(orderId) ?? null;
  }

  getDispatchState(orderId: string): DispatchState {
    const local = this._dispatchStates().get(orderId);
    const backend = this.getBackendDispatchState(orderId);

    if (backend === 'dispatched') return 'dispatched';
    if (backend === 'failed' && local !== 'quoting' && local !== 'dispatching') return 'failed';
    return local ?? backend;
  }

  getDispatchError(orderId: string): string | null {
    if (this.getDispatchState(orderId) === 'dispatched') return null;
    return this._dispatchErrors().get(orderId) ?? null;
  }

  isDispatchingDelivery(orderId: string): boolean {
    const state = this.getDispatchState(orderId);
    return state === 'quoting' || state === 'dispatching';
  }

  canDispatchDelivery(orderId: string): boolean {
    const order = this.orderService.getOrderById(orderId);
    if (!order?.deliveryInfo) return false;
    if (!this.deliveryService.isConfigured()) return false;
    if (!this.isDispatchProviderReady()) return false;

    const state = this.getDispatchState(orderId);
    if (state === 'quoting' || state === 'dispatching') return false;
    if (this.hasActiveDispatch(order)) return false;
    return true;
  }

  private maybeAutoDispatch(orderId: string): void {
    if (this._autoDispatchTriggered().has(orderId)) return;

    const order = this.orderService.getOrderById(orderId);
    if (!order?.deliveryInfo) return;
    if (!this.deliveryService.isConfigured()) return;
    if (!this.isDispatchProviderReady()) return;
    if (this.hasActiveDispatch(order)) return;

    this._autoDispatchTriggered.update(set => {
      const next = new Set(set);
      next.add(orderId);
      return next;
    });

    this.dispatchDriver(orderId, { autoAcceptQuote: true });
  }

  async dispatchDriver(orderId: string, options?: { autoAcceptQuote?: boolean }): Promise<void> {
    const autoAcceptQuote = options?.autoAcceptQuote ?? false;

    if (this.isDispatchingDelivery(orderId)) return;

    const order = this.orderService.getOrderById(orderId);
    if (!order?.deliveryInfo) return;

    if (!this.deliveryService.isConfigured()) {
      this.setDispatchFailure(orderId, 'Delivery provider is not configured.');
      return;
    }

    if (!await this.deliveryService.ensureSelectedProviderConfigured()) {
      this.setDispatchFailure(orderId, 'Delivery provider credentials are not configured.');
      return;
    }

    if (!autoAcceptQuote && !this.canDispatchDelivery(orderId)) return;

    try {
      this.setDispatchError(orderId, null);

      const { quote, quoteRequested } = await this.ensureDeliveryQuote(orderId);
      if (!quote) return;

      if (!autoAcceptQuote && quoteRequested && this.getDispatchState(orderId) !== 'failed') {
        this.setDispatchState(orderId, 'idle');
        return;
      }

      const accepted = await this.acceptQuoteWithRetry(orderId, quote);
      if (!accepted) {
        this.setDispatchFailure(orderId, this.deliveryService.error() ?? 'Driver dispatch failed.');
        return;
      }

      this.clearDeliveryQuote(orderId);
      this.setDispatchError(orderId, null);
      this.setDispatchState(orderId, 'dispatched');
    } catch {
      this.setDispatchFailure(orderId, 'Driver dispatch failed.');
    }
  }

  private async ensureDeliveryQuote(orderId: string): Promise<{ quote: DeliveryQuote | null; quoteRequested: boolean }> {
    const existing = this.getDeliveryQuote(orderId);
    if (existing) return { quote: existing, quoteRequested: false };

    this.setDispatchState(orderId, 'quoting');
    const quote = await this.deliveryService.requestQuote(orderId);
    if (!quote) {
      this.setDispatchFailure(orderId, this.deliveryService.error() ?? 'Failed to request delivery quote.');
      return { quote: null, quoteRequested: true };
    }
    this.setDeliveryQuote(orderId, quote);
    return { quote, quoteRequested: true };
  }

  private async acceptQuoteWithRetry(orderId: string, initialQuote: DeliveryQuote): Promise<boolean> {
    let accepted = await this.acceptQuote(orderId, initialQuote.quoteId);
    if (accepted) return true;

    // One retry when provider reports quote expiration.
    if (!this.isQuoteExpiredError(this.deliveryService.error())) return false;

    this.clearDeliveryQuote(orderId);
    this.setDispatchState(orderId, 'quoting');
    const freshQuote = await this.deliveryService.requestQuote(orderId);
    if (!freshQuote) return false;

    this.setDeliveryQuote(orderId, freshQuote);
    accepted = await this.acceptQuote(orderId, freshQuote.quoteId);
    return accepted;
  }

  onDispatchDriver(orderId: string): void {
    this.dispatchDriver(orderId, { autoAcceptQuote: false });
  }

  refresh(): void {
    this.loadOrders();
    this.loadOrderThrottlingStatus();
    if (this._coursePacingMode() === 'auto_fire_timed') {
      this.loadCoursePacingMetrics();
    }
    if (this.isDaaSProvider(this.settingsService.deliverySettings().provider)) {
      this.deliveryService.loadConfigStatus();
    }
  }

  private filterByMarketplace(orders: Order[]): Order[] {
    const filter = this._marketplaceFilter();
    if (filter === 'all') return orders;
    return orders.filter(order => {
      const marketplace = isMarketplaceOrder(order);
      if (filter === 'marketplace') return marketplace;
      return !marketplace;
    });
  }

  /** Hide orders that have zero items matching the selected station. */
  private filterByStation(orders: Order[]): Order[] {
    const stationId = this._selectedStationId();
    if (!stationId) return orders; // "All Stations" — show everything
    const itemMap = this.menuItemToStationMap();
    if (itemMap.size === 0) return orders; // No mappings loaded yet — don't filter

    return orders.filter(order => {
      const allSelections = order.checks.flatMap(c => c.selections);
      // Show order if at least one selection matches this station OR is unmapped
      return allSelections.some(sel => {
        const selStation = itemMap.get(sel.menuItemGuid);
        return selStation === stationId || selStation === undefined;
      });
    });
  }

  clearError(): void {
    this.orderService.clearError();
  }

  private getOrderPrepTime(order: Order, map: Map<string, number>): number {
    const allSelections = order.checks.flatMap(c => c.selections);
    if (allSelections.length === 0) return 0;
    let maxPrep = 0;
    for (const sel of allSelections) {
      const prep = map.get(sel.menuItemGuid) ?? 0;
      if (prep > maxPrep) maxPrep = prep;
    }
    return maxPrep;
  }

  private normalizeTargetCourseServeGapSeconds(value: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 1200;
    const rounded = Math.round(parsed);
    return Math.max(300, Math.min(3600, rounded));
  }

  private async acceptQuote(orderId: string, quoteId: string): Promise<boolean> {
    this.setDispatchState(orderId, 'dispatching');
    const result = await this.deliveryService.acceptQuote(orderId, quoteId);
    return result !== null;
  }

  private getBackendDispatchState(orderId: string): DispatchState {
    const order = this.orderService.getOrderById(orderId);
    if (!order?.deliveryInfo) return 'idle';

    const status = order.deliveryInfo.dispatchStatus;
    if (status === 'FAILED' || status === 'CANCELLED') return 'failed';
    if ((status && status !== 'QUOTED') || order.deliveryInfo.deliveryExternalId) return 'dispatched';
    return 'idle';
  }

  private hasActiveDispatch(order: Order): boolean {
    const status = order.deliveryInfo?.dispatchStatus;
    if (!status) return Boolean(order.deliveryInfo?.deliveryExternalId);
    if (status === 'FAILED' || status === 'CANCELLED') return false;
    if (status === 'QUOTED') return false;
    return ACTIVE_DISPATCH_STATUSES.has(status);
  }

  private setDispatchState(orderId: string, state: DispatchState): void {
    this._dispatchStates.update(map => {
      const next = new Map(map);
      next.set(orderId, state);
      return next;
    });
  }

  private setDispatchError(orderId: string, message: string | null): void {
    this._dispatchErrors.update(map => {
      const next = new Map(map);
      if (message) {
        next.set(orderId, message);
      } else {
        next.delete(orderId);
      }
      return next;
    });
  }

  private setDispatchFailure(orderId: string, message: string): void {
    this.setDispatchState(orderId, 'failed');
    this.setDispatchError(orderId, message);
  }

  private setDeliveryQuote(orderId: string, quote: DeliveryQuote): void {
    this._deliveryQuotes.update(map => {
      const next = new Map(map);
      next.set(orderId, quote);
      return next;
    });
  }

  private clearDeliveryQuote(orderId: string): void {
    this._deliveryQuotes.update(map => {
      const next = new Map(map);
      next.delete(orderId);
      return next;
    });
  }

  private clearOrderDispatchRuntime(orderId: string): void {
    this._dispatchStates.update(map => {
      const next = new Map(map);
      next.delete(orderId);
      return next;
    });
    this._dispatchErrors.update(map => {
      const next = new Map(map);
      next.delete(orderId);
      return next;
    });
    this.clearDeliveryQuote(orderId);
  }

  private pruneDispatchRuntime(activeOrderIds: Set<string>): void {
    this._dispatchStates.update(map => {
      const next = new Map<string, DispatchState>();
      for (const [orderId, state] of map) {
        if (activeOrderIds.has(orderId)) next.set(orderId, state);
      }
      return next;
    });
    this._dispatchErrors.update(map => {
      const next = new Map<string, string>();
      for (const [orderId, error] of map) {
        if (activeOrderIds.has(orderId)) next.set(orderId, error);
      }
      return next;
    });
    this._deliveryQuotes.update(map => {
      const next = new Map<string, DeliveryQuote>();
      for (const [orderId, quote] of map) {
        if (activeOrderIds.has(orderId)) next.set(orderId, quote);
      }
      return next;
    });
  }

  private isQuoteExpiredError(message: string | null): boolean {
    if (!message) return false;
    return /expired|gone|410/i.exec(message) !== null;
  }

  private isDaaSProvider(provider: DeliveryProviderType): boolean {
    return provider === 'doordash' || provider === 'uber';
  }

  private isDispatchProviderReady(): boolean {
    const provider = this.settingsService.deliverySettings().provider;
    return this.isDaaSProvider(provider) && this.deliveryService.isProviderConfiguredFor(provider);
  }
}
