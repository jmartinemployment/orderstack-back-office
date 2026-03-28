import { Injectable, inject, signal, computed, effect, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Order,
  GuestOrderStatus,
  FulfillmentStatus,
  Selection,
  SelectionModifier,
  Check,
  CheckDiscount,
  VoidedSelection,
  Payment,
  OrderTimestamps,
  ProfitInsight,
  RecentProfitSummary,
  Course,
  CourseFireStatus,
  CoursePacingMetrics,
  OrderThrottlingStatus,
  PrintStatus,
  QueuedOrder,
  OrderActivityEvent,
  OrderNote,
  OrderNoteType,
  OrderTemplate,
  OrderTemplateItem,
  ScanToPaySession,
} from '../models';
import { getDiningOption, DiningOptionType } from '../models/dining-option.model';
import { AuthService } from './auth';
import { SocketService } from './socket';
import { environment } from '../environments/environment';

// --- Backend ↔ Frontend status mapping ---

type BackendStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
type BackendPaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

function mapBackendToGuestStatus(status: string): GuestOrderStatus {
  switch (status) {
    case 'pending':
    case 'confirmed':
      return 'RECEIVED';
    case 'preparing':
      return 'IN_PREPARATION';
    case 'ready':
      return 'READY_FOR_PICKUP';
    case 'completed':
      return 'CLOSED';
    case 'cancelled':
      return 'VOIDED';
    default:
      return 'RECEIVED';
  }
}

function mapGuestToBackendStatus(status: GuestOrderStatus): BackendStatus {
  switch (status) {
    case 'RECEIVED':
      return 'confirmed';
    case 'IN_PREPARATION':
      return 'preparing';
    case 'READY_FOR_PICKUP':
      return 'ready';
    case 'CLOSED':
      return 'completed';
    case 'VOIDED':
      return 'cancelled';
  }
}

function mapBackendPaymentStatus(status: string): 'OPEN' | 'PAID' | 'CLOSED' {
  switch (status) {
    case 'paid':
      return 'PAID';
    case 'refunded':
      return 'CLOSED';
    case 'failed':
    case 'pending':
    default:
      return 'OPEN';
  }
}

function derivePaymentProcessor(raw: any): 'paypal' | undefined {
  if (raw.paypalOrderId) return 'paypal';
  return undefined;
}

function deriveFulfillmentStatus(backendOrderStatus: string): FulfillmentStatus {
  switch (backendOrderStatus) {
    case 'preparing':
    case 'ready':
    case 'completed':
      return 'SENT';
    default:
      return 'NEW';
  }
}

function toRawString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function mapItemFulfillmentStatus(
  rawItemStatus: unknown,
  fallback: FulfillmentStatus,
  hasCourse: boolean
): FulfillmentStatus {
  const normalized = toRawString(rawItemStatus).toUpperCase();
  switch (normalized) {
    case 'NEW':
      return 'NEW';
    case 'HOLD':
      return 'HOLD';
    case 'SENT':
      return 'SENT';
    case 'ON_THE_FLY':
      return 'ON_THE_FLY';
    // Backward compatibility with legacy order-item statuses.
    case 'PENDING':
      return hasCourse ? 'HOLD' : 'NEW';
    case 'PREPARING':
    case 'COMPLETED':
      return 'SENT';
    default:
      return hasCourse ? 'HOLD' : fallback;
  }
}

function mapCourseFireStatus(rawStatus: unknown): CourseFireStatus {
  switch (toRawString(rawStatus).toUpperCase()) {
    case 'FIRED':
      return 'FIRED';
    case 'READY':
      return 'READY';
    default:
      return 'PENDING';
  }
}

function courseFireStatusRank(status: CourseFireStatus): number {
  switch (status) {
    case 'READY':
      return 2;
    case 'FIRED':
      return 1;
    default:
      return 0;
  }
}

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const dateInput: string | number = typeof value === 'string' || typeof value === 'number' ? value : '';
  const date = new Date(dateInput);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function mapOrderType(orderType: string): DiningOptionType {
  switch (orderType) {
    case 'pickup':
      return 'takeout';
    case 'delivery':
      return 'delivery';
    case 'dine-in':
      return 'dine-in';
    case 'curbside':
      return 'curbside';
    case 'catering':
      return 'catering';
    default:
      return 'dine-in';
  }
}

// --- mapOrder helper functions (extracted for S3776 cognitive complexity) ---

function mapItemCourse(item: any): Course | undefined {
  const rawCourse = item.course;
  if (rawCourse) {
    return {
      guid: rawCourse.guid ?? rawCourse.id ?? item.courseGuid ?? crypto.randomUUID(),
      name: rawCourse.name ?? item.courseName ?? '',
      sortOrder: Number(rawCourse.sortOrder ?? item.courseSortOrder) || 0,
      fireStatus: mapCourseFireStatus(rawCourse.fireStatus ?? item.courseFireStatus),
      firedDate: parseDate(rawCourse.firedDate) ?? parseDate(item.courseFiredAt),
      readyDate: parseDate(rawCourse.readyDate) ?? parseDate(item.courseReadyAt),
    };
  }
  if (item.courseGuid) {
    return {
      guid: item.courseGuid,
      name: item.courseName ?? item.courseGuid,
      sortOrder: Number(item.courseSortOrder) || 0,
      fireStatus: mapCourseFireStatus(item.courseFireStatus),
      firedDate: parseDate(item.courseFiredAt),
      readyDate: parseDate(item.courseReadyAt),
    };
  }
  return undefined;
}

function mapSelections(raw: any, fulfillmentStatus: FulfillmentStatus): Selection[] {
  const rawItems: any[] = raw.orderItems || raw.items || [];
  return rawItems.map((item: any) => {
    const course = mapItemCourse(item);
    return {
      guid: item.id ?? crypto.randomUUID(),
      menuItemGuid: item.menuItemId ?? '',
      menuItemName: item.menuItemName || item.name || '',
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      totalPrice: Number(item.totalPrice) || 0,
      fulfillmentStatus: mapItemFulfillmentStatus(item.fulfillmentStatus ?? item.status, fulfillmentStatus, Boolean(course)),
      modifiers: (item.orderItemModifiers || item.modifiers || []).map((m: any): SelectionModifier => ({
        guid: m.id ?? crypto.randomUUID(),
        name: m.modifierName || m.name || '',
        priceAdjustment: Number(m.priceAdjustment) || 0,
        isTextModifier: m.isTextModifier ?? false,
        textValue: m.textValue ?? undefined,
      })),
      specialInstructions: item.specialInstructions,
      course,
      completedAt: parseDate(item.completedAt),
      seatNumber: item.seatNumber == null ? undefined : Number(item.seatNumber),
      isComped: item.isComped ?? false,
      compReason: item.compReason ?? undefined,
      compBy: item.compBy ?? undefined,
    };
  });
}

function deriveCourseListFromSelections(selections: Selection[]): Course[] {
  const byGuid = new Map<string, Course>();
  for (const sel of selections) {
    if (!sel.course) continue;
    const existing = byGuid.get(sel.course.guid);
    if (!existing) {
      byGuid.set(sel.course.guid, { ...sel.course });
      continue;
    }
    if (courseFireStatusRank(sel.course.fireStatus) > courseFireStatusRank(existing.fireStatus)) {
      existing.fireStatus = sel.course.fireStatus;
    }
    if (sel.course.readyDate && (!existing.readyDate || sel.course.readyDate > existing.readyDate)) {
      existing.readyDate = sel.course.readyDate;
    }
  }
  return [...byGuid.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

function mapCourseList(raw: any, selections: Selection[]): Course[] {
  const rawCourses: any[] = raw.courses || [];
  const courses: Course[] = rawCourses.map((c: any) => ({
    guid: c.guid ?? c.id ?? crypto.randomUUID(),
    name: c.name ?? '',
    sortOrder: Number(c.sortOrder) || 0,
    fireStatus: mapCourseFireStatus(c.fireStatus),
    firedDate: parseDate(c.firedDate),
    readyDate: parseDate(c.readyDate),
  }));
  if (courses.length === 0) {
    courses.push(...deriveCourseListFromSelections(selections));
  }
  return courses;
}

function mapFinancials(raw: any): { subtotal: number; taxAmount: number; tipAmount: number; totalAmount: number } {
  return {
    subtotal: Number(raw.subtotal) || 0,
    taxAmount: Number(raw.tax) || 0,
    tipAmount: Number(raw.tip) || 0,
    totalAmount: Number(raw.total) || 0,
  };
}

function mapPayments(raw: any, totalAmount: number, tipAmount: number, checkPaymentStatus: 'OPEN' | 'PAID' | 'CLOSED'): Payment[] {
  if (!raw.paymentMethod && !raw.paypalOrderId) return [];
  return [{
    guid: raw.paypalOrderId ?? crypto.randomUUID(),
    paymentMethod: raw.paymentMethod ?? 'unknown',
    amount: totalAmount,
    tipAmount,
    status: checkPaymentStatus,
    paymentProcessor: derivePaymentProcessor(raw),
    paymentProcessorId: raw.paypalOrderId,
    paidDate: checkPaymentStatus === 'PAID' ? new Date() : undefined,
  }];
}

function mapDiscounts(raw: any): CheckDiscount[] {
  return (raw.discounts || []).map((d: any) => ({
    id: d.id ?? crypto.randomUUID(),
    type: d.type ?? 'flat',
    value: Number(d.value) || 0,
    reason: d.reason ?? '',
    appliedBy: d.appliedBy ?? '',
    approvedBy: d.approvedBy ?? undefined,
  }));
}

function mapVoidedSelections(raw: any): VoidedSelection[] {
  return (raw.voidedItems || []).map((item: any) => ({
    guid: item.id ?? crypto.randomUUID(),
    menuItemGuid: item.menuItemId ?? '',
    menuItemName: item.menuItemName || item.name || '',
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.unitPrice) || 0,
    totalPrice: Number(item.totalPrice) || 0,
    fulfillmentStatus: 'SENT',
    modifiers: [],
    voidReason: item.voidReason ?? 'other',
    voidedBy: item.voidedBy ?? '',
    voidedAt: parseDate(item.voidedAt) ?? new Date(),
    managerApproval: item.managerApproval ?? undefined,
  }));
}

function mapTimestamps(raw: any): OrderTimestamps {
  return {
    createdDate: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    confirmedDate: raw.confirmedAt ? new Date(raw.confirmedAt) : undefined,
    sentDate: raw.sentAt ? new Date(raw.sentAt) : undefined,
    prepStartDate: raw.prepStartAt ? new Date(raw.prepStartAt) : undefined,
    preparingDate: raw.preparingAt ? new Date(raw.preparingAt) : undefined,
    readyDate: raw.readyAt ? new Date(raw.readyAt) : undefined,
    closedDate: raw.completedAt ? new Date(raw.completedAt) : undefined,
    voidedDate: raw.cancelledAt ? new Date(raw.cancelledAt) : undefined,
    lastModifiedDate: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
  };
}

function mapThrottle(raw: any): Order['throttle'] {
  const rawThrottle = raw.throttle ?? raw;
  const throttleStateRaw = String(rawThrottle.state ?? raw.throttleState ?? '').toUpperCase();
  const throttleState: 'NONE' | 'HELD' | 'RELEASED' =
    throttleStateRaw === 'HELD' || throttleStateRaw === 'RELEASED' ? throttleStateRaw : 'NONE';
  const throttleSourceRaw = String(rawThrottle.source ?? raw.throttleSource ?? '').toUpperCase();
  const throttleSource: 'AUTO' | 'MANUAL' | undefined =
    throttleSourceRaw === 'AUTO' || throttleSourceRaw === 'MANUAL' ? throttleSourceRaw : undefined;
  if (throttleState === 'NONE' && !rawThrottle.reason && !rawThrottle.throttleReason) return undefined;
  return {
    state: throttleState,
    reason: rawThrottle.reason ?? rawThrottle.throttleReason ?? undefined,
    heldAt: parseDate(rawThrottle.heldAt ?? rawThrottle.throttleHeldAt),
    releasedAt: parseDate(rawThrottle.releasedAt ?? rawThrottle.throttleReleasedAt),
    source: throttleSource,
    releaseReason: rawThrottle.releaseReason ?? rawThrottle.throttleReleaseReason ?? undefined,
  };
}

function mapMarketplace(raw: any): Order['marketplace'] {
  const rawMarketplace = raw.marketplaceOrder ?? raw.marketplace;
  if (!rawMarketplace) return undefined;
  return {
    provider: rawMarketplace.provider,
    externalOrderId: rawMarketplace.externalOrderId,
    externalStoreId: rawMarketplace.externalStoreId ?? undefined,
    status: rawMarketplace.status ?? undefined,
    lastPushedStatus: rawMarketplace.lastPushedStatus ?? undefined,
    lastPushResult: rawMarketplace.lastPushResult ?? undefined,
    lastPushError: rawMarketplace.lastPushError ?? undefined,
    lastPushAt: parseDate(rawMarketplace.lastPushAt),
  };
}

function mapDeliveryInfo(raw: any): Order['deliveryInfo'] {
  if (raw.deliveryInfo) return raw.deliveryInfo;
  if (!raw.deliveryAddress) return undefined;
  return {
    address: raw.deliveryAddress,
    address2: raw.deliveryAddress2 ?? undefined,
    city: raw.deliveryCity ?? undefined,
    state: raw.deliveryStateUs ?? undefined,
    zip: raw.deliveryZip ?? undefined,
    deliveryNotes: raw.deliveryNotes ?? undefined,
    deliveryState: raw.deliveryStatus ?? 'PREPARING',
    dispatchedDate: raw.dispatchedAt ? new Date(raw.dispatchedAt) : undefined,
    deliveredDate: raw.deliveredAt ? new Date(raw.deliveredAt) : undefined,
    deliveryProvider: raw.deliveryProvider ?? undefined,
    deliveryExternalId: raw.deliveryExternalId ?? undefined,
    deliveryTrackingUrl: raw.deliveryTrackingUrl ?? undefined,
    dispatchStatus: raw.dispatchStatus ?? undefined,
    estimatedDeliveryAt: raw.deliveryEstimatedAt ?? undefined,
    deliveryFee: raw.deliveryFee == null ? undefined : Number(raw.deliveryFee),
  };
}

// --- Mapped order event callbacks ---

export interface MappedOrderEvent {
  type: 'new' | 'updated' | 'cancelled' | 'printed' | 'print_failed';
  order: Order;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly socketService = inject(SocketService);
  private readonly apiUrl = environment.apiUrl;

  // Private writable signals
  private readonly _orders = signal<Order[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _printStatuses = signal<Map<string, PrintStatus>>(new Map());
  private readonly _printTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private static readonly PRINT_TIMEOUT_MS = 30_000;

  // Offline queue
  private readonly _queuedOrders = signal<QueuedOrder[]>([]);
  readonly queuedOrders = this._queuedOrders.asReadonly();
  readonly queuedCount = computed(() => this._queuedOrders().length);
  readonly queueStatus = computed<'idle' | 'syncing' | 'has-failed'>(() => {
    if (this._isSyncing()) return 'syncing';
    const failed = this._queuedOrders().filter(q => q.retryCount >= 5);
    if (failed.length > 0) return 'has-failed';
    return 'idle';
  });
  private readonly _isSyncing = signal(false);
  private static readonly MAX_QUEUE_RETRIES = 5;
  readonly isSyncing = this._isSyncing.asReadonly();

  // Public readonly signals
  readonly orders = this._orders.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Course complete notifications
  private readonly _courseCompleteNotifications = signal<{
    orderId: string;
    tableName: string;
    completedCourseName: string;
    nextCourseName: string;
    nextCourseGuid: string;
  } | null>(null);
  readonly courseCompleteNotifications = this._courseCompleteNotifications.asReadonly();

  clearCourseNotification(): void {
    this._courseCompleteNotifications.set(null);
  }

  // Items:ready notifications (per-station partial completion)
  private readonly _itemReadyNotifications = signal<{
    id: string;
    orderId: string;
    stationId: string;
    stationName: string;
    items: { id: string; name: string; status: string }[];
    allReady: boolean;
    timestamp: number;
  }[]>([]);
  readonly itemReadyNotifications = this._itemReadyNotifications.asReadonly();

  clearItemReadyNotification(id: string): void {
    this._itemReadyNotifications.update(list => list.filter(n => n.id !== id));
  }

  // Mapped order event callbacks
  private mappedOrderCallbacks: Array<(event: MappedOrderEvent) => void> = [];

  // Computed signals - KDS columns
  readonly pendingOrders = computed(() =>
    this._orders().filter(o => o.guestOrderStatus === 'RECEIVED')
  );

  readonly preparingOrders = computed(() =>
    this._orders().filter(o => o.guestOrderStatus === 'IN_PREPARATION')
  );

  readonly readyOrders = computed(() =>
    this._orders().filter(o => o.guestOrderStatus === 'READY_FOR_PICKUP')
  );

  readonly completedOrders = computed(() =>
    this._orders().filter(o => o.guestOrderStatus === 'CLOSED')
  );

  readonly activeOrderCount = computed(() =>
    this._orders().filter(o =>
      o.guestOrderStatus !== 'CLOSED' && o.guestOrderStatus !== 'VOIDED'
    ).length
  );

  readonly printStatuses = this._printStatuses.asReadonly();

  getPrintStatus(orderId: string): PrintStatus {
    return this._printStatuses().get(orderId) ?? 'none';
  }

  private playNotificationSound(): void {
    try {
      const audio = new Audio('assets/sounds/chime.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Browser autoplay policy may block — ignore
      });
    } catch {
      // Ignore audio errors
    }
  }

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  constructor() {
    this.socketService.onOrderEvent((event) => {
      this.handleOrderEvent(event.type, event.order);
    });

    // Course updated socket listener — reload the order when courses change from another device
    this.socketService.onCustomEvent('course:updated', (data: any) => {
      const orderId = data?.orderId;
      if (orderId) {
        // Detect course completion → notify POS to fire next course
        const completedCourseName = data?.completedCourseName;
        const newStatus = String(data?.fireStatus ?? '').toUpperCase();
        if (newStatus === 'READY' && completedCourseName) {
          const order = this._orders().find(o => o.guid === orderId);
          const courses = order?.courses ?? [];
          const completedIdx = courses.findIndex(
            c => c.name.toLowerCase() === String(completedCourseName).toLowerCase()
          );
          const nextCourse = completedIdx >= 0 ? courses[completedIdx + 1] : undefined;
          if (nextCourse?.fireStatus === 'PENDING') {
            this._courseCompleteNotifications.set({
              orderId,
              tableName: order?.table?.name ?? '',
              completedCourseName,
              nextCourseName: nextCourse.name,
              nextCourseGuid: nextCourse.guid,
            });
          }
        }
        this.loadOrders();
      }
    });

    // Items:ready socket listener (per-station partial completion)
    this.socketService.onCustomEvent('items:ready', (data: any) => {
      const notification = {
        id: crypto.randomUUID(),
        orderId: data.orderId ?? '',
        stationId: data.stationId ?? '',
        stationName: data.stationName ?? 'Station',
        items: (data.items ?? []).map((i: any) => ({
          id: i.id ?? '',
          name: i.name ?? '',
          status: i.status ?? 'ready',
        })),
        allReady: data.allReady ?? false,
        timestamp: Date.now(),
      };

      // Push to notification queue (max 5)
      this._itemReadyNotifications.update(list => {
        const updated = [notification, ...list];
        return updated.slice(0, 5);
      });

      // Play notification sound
      this.playNotificationSound();

      // If allReady, update the order status locally
      if (notification.allReady) {
        this._orders.update(orders => {
          const idx = orders.findIndex(o => o.guid === notification.orderId);
          if (idx === -1) return orders;
          const updated = [...orders];
          updated[idx] = { ...updated[idx], guestOrderStatus: 'READY_FOR_PICKUP' };
          return updated;
        });
      }
    });

    // Scan to Pay socket listener
    this.socketService.onCustomEvent('scan-to-pay:completed', (data: any) => {
      this.handleScanToPayCompleted({
        orderId: data.orderId,
        checkGuid: data.checkGuid,
        tipAmount: Number(data.tipAmount) || 0,
        total: Number(data.total) || 0,
      });
    });

    // Load persisted queue when restaurant changes
    effect(() => {
      if (this.authService.selectedMerchantId()) {
        this.loadQueue();
      }
    });

    // Sync when back online
    effect(() => {
      if (this.socketService.isOnline() && this._queuedOrders().length > 0) {
        this.syncQueue();
      }
    });
  }

  ngOnDestroy(): void {
    for (const timer of this._printTimeouts.values()) {
      clearTimeout(timer);
    }
    this._printTimeouts.clear();
  }

  private handleOrderEvent(type: 'new' | 'updated' | 'cancelled' | 'printed' | 'print_failed', rawOrder: any): void {
    if (type === 'printed') {
      const orderId = rawOrder?.orderId ?? rawOrder?.id ?? rawOrder?.guid ?? '';
      this.setPrintStatus(orderId, 'printed');
      const existing = this._orders().find(o => o.guid === orderId);
      if (existing) {
        for (const cb of this.mappedOrderCallbacks) {
          cb({ type: 'printed', order: existing });
        }
      }
      return;
    }

    if (type === 'print_failed') {
      const orderId = rawOrder?.orderId ?? rawOrder?.id ?? rawOrder?.guid ?? '';
      this.setPrintStatus(orderId, 'failed');
      const existing = this._orders().find(o => o.guid === orderId);
      if (existing) {
        for (const cb of this.mappedOrderCallbacks) {
          cb({ type: 'print_failed', order: existing });
        }
      }
      return;
    }

    const mapped = this.mapOrder(rawOrder);

    this._orders.update(orders => {
      const index = orders.findIndex(o => o.guid === mapped.guid);

      if (type === 'new' && index === -1) {
        return [mapped, ...orders];
      }

      if ((type === 'cancelled' || type === 'updated') && index !== -1) {
        return orders.map((o, i) => i === index ? mapped : o);
      }

      return orders;
    });

    // Notify mapped order event subscribers
    const event: MappedOrderEvent = { type, order: mapped };
    for (const cb of this.mappedOrderCallbacks) {
      cb(event);
    }
  }

  onMappedOrderEvent(callback: (event: MappedOrderEvent) => void): () => void {
    this.mappedOrderCallbacks.push(callback);
    return () => {
      this.mappedOrderCallbacks = this.mappedOrderCallbacks.filter(cb => cb !== callback);
    };
  }

  async loadOrders(options?: { limit?: number; sourceDeviceId?: string }): Promise<void> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return;
    }

    // Prevent concurrent loads — skip if already in progress
    if (this._isLoading()) return;

    const limit = options?.limit ?? 50;
    const sourceDeviceId = options?.sourceDeviceId;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      let url = `${this.apiUrl}/merchant/${this.merchantId}/orders?limit=${limit}`;
      if (sourceDeviceId) {
        url += `&sourceDeviceId=${encodeURIComponent(sourceDeviceId)}`;
      }

      const raw = await firstValueFrom(
        this.http.get<any[]>(url)
      );
      this._orders.set((raw || []).map(o => this.mapOrder(o)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load orders';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async createOrder(orderData: Record<string, unknown>): Promise<Order | null> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return null;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const raw = await firstValueFrom(
        this.http.post<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders`,
          orderData
        )
      );
      const order = this.mapOrder(raw);

      this._orders.update(orders => [order, ...orders]);

      return order;
    } catch (err: any) {
      // Network failure — queue for retry when back online
      if (err.status === 0 || err.status === undefined) {
        return this.queueOrder(orderData);
      }
      const message = err?.error?.message ?? 'Failed to create order';
      this._error.set(message);
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateOrderStatus(orderId: string, status: GuestOrderStatus, options?: { skipPrint?: boolean }): Promise<boolean> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    this._isLoading.set(true);
    this._error.set(null);

    const backendStatus = mapGuestToBackendStatus(status);

    try {
      const raw = await firstValueFrom(
        this.http.patch<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/status`,
          { status: backendStatus }
        )
      );
      const updatedOrder = this.mapOrder(raw);

      this._orders.update(orders =>
        orders.map(o => o.guid === orderId ? updatedOrder : o)
      );

      if (status === 'READY_FOR_PICKUP' && !options?.skipPrint) {
        this.setPrintStatus(orderId, 'printing');
        this.startPrintTimeout(orderId);
      }

      return true;
    } catch (err: any) {
      const message = err?.error?.message ?? 'Failed to update order status';
      this._error.set(message);
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async confirmOrder(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, 'IN_PREPARATION');
  }

  async startPreparing(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, 'IN_PREPARATION');
  }

  async markReady(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, 'READY_FOR_PICKUP');
  }

  async completeOrder(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, 'CLOSED');
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, 'VOIDED');
  }

  triggerPrint(orderId: string, includeQrCode = false): void {
    if (includeQrCode) {
      const order = this._orders().find(o => o.guid === orderId);
      const check = order?.checks[0];
      if (check?.qrCodeUrl) {
        // Send print request with QR code URL via API
        firstValueFrom(
          this.http.post(`${this.apiUrl}/orders/${orderId}/print`, { qrCodeUrl: check.qrCodeUrl })
        ).catch(() => { /* Print API optional — fallback to standard print */ });
      }
    }
    this.setPrintStatus(orderId, 'printing');
    this.startPrintTimeout(orderId);
  }

  async recallOrder(orderId: string): Promise<boolean> {
    const order = this._orders().find(o => o.guid === orderId);
    if (!order) return false;

    const previousStatus = this.getPreviousStatus(order.guestOrderStatus);
    if (!previousStatus) return false;

    const success = await this.updateOrderStatus(orderId, previousStatus);
    if (success) {
      this.setPrintStatus(orderId, 'none');
      this.clearPrintTimeout(orderId);
    }
    return success;
  }

  private getPreviousStatus(status: GuestOrderStatus): GuestOrderStatus | null {
    switch (status) {
      case 'READY_FOR_PICKUP': return 'IN_PREPARATION';
      case 'IN_PREPARATION': return 'RECEIVED';
      default: return null;
    }
  }

  async getProfitInsight(orderId: string): Promise<ProfitInsight | null> {
    if (!this.merchantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<ProfitInsight>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/profit-insight`
        )
      );
    } catch {
      return null;
    }
  }

  async getRecentProfit(limit = 10): Promise<RecentProfitSummary | null> {
    if (!this.merchantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<RecentProfitSummary>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/recent-profit?limit=${limit}`
        )
      );
    } catch {
      return null;
    }
  }

  async fireCourse(orderId: string, courseGuid: string): Promise<boolean> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    try {
      const raw = await firstValueFrom(
        this.http.patch<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/fire-course`,
          { courseGuid }
        )
      );
      const updatedOrder = this.mapOrder(raw);
      this._orders.update(orders =>
        orders.map(o => o.guid === orderId ? updatedOrder : o)
      );
      return true;
    } catch {
      this._error.set('Failed to fire course — backend unavailable');
      return false;
    }
  }

  async addCourseToOrder(orderId: string, courseName: string, sortOrder: number): Promise<boolean> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    try {
      const raw = await firstValueFrom(
        this.http.post<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/courses`,
          { name: courseName, sortOrder }
        )
      );
      const updatedOrder = this.mapOrder(raw);
      this._orders.update(orders =>
        orders.map(o => o.guid === orderId ? updatedOrder : o)
      );
      return true;
    } catch {
      this._error.set('Failed to add course');
      return false;
    }
  }

  async assignSelectionToCourse(orderId: string, selectionGuid: string, courseGuid: string): Promise<boolean> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    try {
      const raw = await firstValueFrom(
        this.http.patch<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/assign-course`,
          { selectionGuid, courseGuid }
        )
      );
      const updatedOrder = this.mapOrder(raw);
      this._orders.update(orders =>
        orders.map(o => o.guid === orderId ? updatedOrder : o)
      );
      return true;
    } catch {
      this._error.set('Failed to assign item to course');
      return false;
    }
  }

  async holdCourse(orderId: string, courseGuid: string): Promise<boolean> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    try {
      const raw = await firstValueFrom(
        this.http.patch<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/hold-course`,
          { courseGuid }
        )
      );
      const updatedOrder = this.mapOrder(raw);
      this._orders.update(orders =>
        orders.map(o => o.guid === orderId ? updatedOrder : o)
      );
      return true;
    } catch {
      this._error.set('Failed to hold course');
      return false;
    }
  }

  async removeCourseFromOrder(orderId: string, courseGuid: string): Promise<boolean> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    try {
      const raw = await firstValueFrom(
        this.http.delete<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/courses/${courseGuid}`
        )
      );
      const updatedOrder = this.mapOrder(raw);
      this._orders.update(orders =>
        orders.map(o => o.guid === orderId ? updatedOrder : o)
      );
      return true;
    } catch {
      this._error.set('Failed to remove course');
      return false;
    }
  }

  async fireItemNow(orderId: string, selectionGuid: string): Promise<boolean> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    try {
      const raw = await firstValueFrom(
        this.http.patch<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/fire-item`,
          { selectionGuid }
        )
      );

      const updatedOrder = this.mapOrder(raw);
      this._orders.update(orders =>
        orders.map(o => o.guid === orderId ? updatedOrder : o)
      );
      return true;
    } catch {
      this._error.set('Failed to fire item — backend unavailable');
      return false;
    }
  }

  async getCoursePacingMetrics(lookbackDays = 30): Promise<CoursePacingMetrics | null> {
    if (!this.merchantId) return null;

    const safeLookbackDays = Math.max(1, Math.min(90, Math.round(Number(lookbackDays) || 30)));

    try {
      const raw = await firstValueFrom(
        this.http.get<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/course-pacing/metrics`,
          { params: { lookbackDays: String(safeLookbackDays) } }
        )
      );

      const confidence = String(raw?.confidence ?? '').toLowerCase();
      const normalizedConfidence =
        confidence === 'high' || confidence === 'medium' ? confidence : 'low';

      return {
        lookbackDays: Number(raw?.lookbackDays) || safeLookbackDays,
        sampleSize: Number(raw?.sampleSize) || 0,
        tablePaceBaselineSeconds: Number(raw?.tablePaceBaselineSeconds) || 900,
        p50Seconds: Number(raw?.p50Seconds) || 900,
        p80Seconds: Number(raw?.p80Seconds) || 1200,
        confidence: normalizedConfidence,
        generatedAt: parseDate(raw?.generatedAt) ?? new Date(),
      };
    } catch {
      this._error.set('Failed to load course pacing metrics');
      return null;
    }
  }

  async getOrderThrottlingStatus(): Promise<OrderThrottlingStatus | null> {
    if (!this.merchantId) return null;

    try {
      const raw = await firstValueFrom(
        this.http.get<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/throttling/status`
        )
      );

      const trigger = String(raw?.triggerReason ?? '');
      const triggerReason =
        trigger === 'ACTIVE_OVERLOAD' || trigger === 'OVERDUE_OVERLOAD'
          ? trigger
          : undefined;

      return {
        enabled: Boolean(raw?.enabled),
        triggering: Boolean(raw?.triggering),
        triggerReason,
        activeOrders: Number(raw?.activeOrders) || 0,
        overdueOrders: Number(raw?.overdueOrders) || 0,
        heldOrders: Number(raw?.heldOrders) || 0,
        thresholds: {
          maxActiveOrders: Number(raw?.thresholds?.maxActiveOrders) || 18,
          maxOverdueOrders: Number(raw?.thresholds?.maxOverdueOrders) || 6,
          releaseActiveOrders: Number(raw?.thresholds?.releaseActiveOrders) || 14,
          releaseOverdueOrders: Number(raw?.thresholds?.releaseOverdueOrders) || 3,
          maxHoldMinutes: Number(raw?.thresholds?.maxHoldMinutes) || 20,
        },
        evaluatedAt: parseDate(raw?.evaluatedAt) ?? new Date(),
      };
    } catch {
      this._error.set('Failed to load throttling status');
      return null;
    }
  }

  async holdOrderForThrottling(orderId: string): Promise<boolean> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    try {
      const raw = await firstValueFrom(
        this.http.post<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/throttle/hold`,
          {}
        )
      );

      const updatedOrder = this.mapOrder(raw);
      this._orders.update(orders =>
        orders.map(o => o.guid === orderId ? updatedOrder : o)
      );
      return true;
    } catch {
      this._error.set('Failed to hold order for throttling');
      return false;
    }
  }

  async releaseOrderFromThrottling(orderId: string): Promise<boolean> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    try {
      const raw = await firstValueFrom(
        this.http.post<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/throttle/release`,
          {}
        )
      );

      const updatedOrder = this.mapOrder(raw);
      this._orders.update(orders =>
        orders.map(o => o.guid === orderId ? updatedOrder : o)
      );
      return true;
    } catch {
      this._error.set('Failed to release order from throttling');
      return false;
    }
  }

  // --- Offline queue methods ---

  private queueOrder(orderData: Record<string, unknown>): Order {
    const localId = crypto.randomUUID();
    const queued: QueuedOrder = {
      localId,
      orderData,
      queuedAt: Date.now(),
      merchantId: this.merchantId ?? '',
      retryCount: 0,
    };

    this._queuedOrders.update(q => [...q, queued]);
    this.persistQueue();

    const placeholder = this.createPlaceholderOrder(localId, orderData);
    this._orders.update(orders => [placeholder, ...orders]);
    return placeholder;
  }

  private createPlaceholderOrder(localId: string, orderData: Record<string, unknown>): Order {
    const items = (orderData['items'] as any[]) ?? [];
    const diningOption = (orderData['diningOption'] as any) ?? getDiningOption('dine-in');

    const selections: Selection[] = items.map((item: any) => ({
      guid: crypto.randomUUID(),
      menuItemGuid: item.menuItemId ?? '',
      menuItemName: item.name ?? item.menuItemId ?? '',
      quantity: Number(item.quantity) || 1,
      unitPrice: 0,
      totalPrice: 0,
      fulfillmentStatus: 'NEW',
      modifiers: [],
    }));

    const check: Check = {
      guid: `check-${localId}`,
      displayNumber: '1',
      selections,
      payments: [],
      paymentStatus: 'OPEN',
      subtotal: 0,
      taxAmount: 0,
      tipAmount: 0,
      totalAmount: 0,
      discounts: [],
      voidedSelections: [],
    };

    const now = new Date();

    return {
      guid: localId,
      merchantId: this.merchantId ?? '',
      orderNumber: `Q-${localId.slice(0, 4).toUpperCase()}`,
      guestOrderStatus: 'RECEIVED',
      server: { guid: 'offline', name: 'Offline', entityType: 'RestaurantUser' },
      device: { guid: (orderData['sourceDeviceId'] as string) ?? '', name: 'POS Device' },
      diningOption,
      checks: [check],
      subtotal: 0,
      taxAmount: 0,
      tipAmount: 0,
      totalAmount: 0,
      timestamps: { createdDate: now, lastModifiedDate: now },
      _queued: true,
    };
  }

  private persistQueue(): void {
    if (!this.merchantId) return;
    const key = `${this.merchantId}-offline-queue`;
    localStorage.setItem(key, JSON.stringify(this._queuedOrders()));
  }

  private loadQueue(): void {
    if (!this.merchantId) return;
    const key = `${this.merchantId}-offline-queue`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        this._queuedOrders.set(JSON.parse(stored));
      } catch {
        localStorage.removeItem(key);
      }
    }
  }

  private async syncQueue(): Promise<void> {
    if (this._isSyncing()) return;
    this._isSyncing.set(true);

    const queue = [...this._queuedOrders()];

    for (const queued of queue) {
      // Skip items that have exceeded max retries
      if (queued.retryCount >= OrderService.MAX_QUEUE_RETRIES) {
        continue;
      }

      try {
        const raw = await firstValueFrom(
          this.http.post<any>(
            `${this.apiUrl}/merchant/${queued.merchantId}/orders`,
            queued.orderData
          )
        );
        const order = this.mapOrder(raw);

        // Replace placeholder with real order
        this._orders.update(orders =>
          orders.map(o => o.guid === queued.localId ? order : o)
        );

        // Remove from queue
        this._queuedOrders.update(q =>
          q.filter(item => item.localId !== queued.localId)
        );
        this.persistQueue();
      } catch (err: unknown) {
        // 409 Conflict = order already exists (duplicate), remove from queue
        const httpErr = err as { status?: number };
        if (httpErr.status === 409) {
          this._queuedOrders.update(q =>
            q.filter(item => item.localId !== queued.localId)
          );
          this.persistQueue();
          continue;
        }

        // Increment retry, stop sync — network may be down again
        this._queuedOrders.update(q => q.map(item =>
          item.localId === queued.localId
            ? { ...item, retryCount: item.retryCount + 1 }
            : item
        ));
        this.persistQueue();
        break;
      }
    }

    this._isSyncing.set(false);
  }

  // --- Order Activity Log ---

  private readonly _activityEvents = signal<Map<string, OrderActivityEvent[]>>(new Map());
  readonly activityEvents = this._activityEvents.asReadonly();

  async loadOrderActivity(orderId: string): Promise<OrderActivityEvent[]> {
    if (!this.merchantId) return [];

    try {
      const events = await firstValueFrom(
        this.http.get<OrderActivityEvent[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/activity`
        )
      );
      this._activityEvents.update(map => {
        const updated = new Map(map);
        updated.set(orderId, events);
        return updated;
      });
      return events;
    } catch {
      return [];
    }
  }

  getActivityEvents(orderId: string): OrderActivityEvent[] {
    return this._activityEvents().get(orderId) ?? [];
  }

  // --- Bulk Status Updates ---

  async bulkUpdateStatus(orderIds: string[], newStatus: GuestOrderStatus): Promise<boolean> {
    if (!this.merchantId || orderIds.length === 0) return false;
    this._error.set(null);

    const backendStatus = mapGuestToBackendStatus(newStatus);
    try {
      const results = await firstValueFrom(
        this.http.patch<any[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/bulk-status`,
          { orderIds, status: backendStatus }
        )
      );
      const mappedOrders = (results || []).map(r => this.mapOrder(r));
      this._orders.update(orders => {
        const updated = [...orders];
        for (const mapped of mappedOrders) {
          const idx = updated.findIndex(o => o.guid === mapped.guid);
          if (idx !== -1) updated[idx] = mapped;
        }
        return updated;
      });
      return true;
    } catch (err: any) {
      this._error.set(err?.error?.message ?? 'Failed to update orders');
      return false;
    }
  }

  // --- Order Notes ---

  async addOrderNote(orderId: string, noteType: OrderNoteType, text: string, checkGuid?: string): Promise<OrderNote | null> {
    if (!this.merchantId) return null;
    this._error.set(null);

    try {
      const note = await firstValueFrom(
        this.http.post<OrderNote>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/notes`,
          { noteType, text, checkGuid }
        )
      );
      // Update the order's notes in place
      this._orders.update(orders => orders.map(o => {
        if (o.guid !== orderId) return o;
        return { ...o, notes: [...(o.notes ?? []), note] };
      }));
      return note;
    } catch {
      this._error.set('Failed to add note');
      return null;
    }
  }

  // --- Order Templates ---

  private readonly _templates = signal<OrderTemplate[]>([]);
  readonly templates = this._templates.asReadonly();

  async loadTemplates(): Promise<void> {
    if (!this.merchantId) return;
    try {
      const templates = await firstValueFrom(
        this.http.get<OrderTemplate[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/order-templates`
        )
      );
      this._templates.set(templates);
    } catch {
      // Templates are optional — fail silently
    }
  }

  async saveTemplate(name: string, items: { menuItemId: string; quantity: number; modifiers: string[] }[]): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/order-templates`,
          { name, items }
        )
      );
      await this.loadTemplates();
      return true;
    } catch {
      this._error.set('Failed to save template');
      return false;
    }
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    if (!this.merchantId) return false;
    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/order-templates/${templateId}`
        )
      );
      this._templates.update(t => t.filter(tmpl => tmpl.id !== templateId));
      return true;
    } catch {
      return false;
    }
  }

  async applyOrderTemplate(templateId: string): Promise<OrderTemplateItem[]> {
    const template = this._templates().find(t => t.id === templateId);
    if (!template) return [];
    return template.items;
  }

  // --- Scan to Pay ---

  private readonly _scanToPayCallbacks: Array<(data: { orderId: string; checkGuid: string; tipAmount: number; total: number }) => void> = [];

  async generateCheckQr(orderId: string, checkId: string): Promise<{ token: string; qrCodeUrl: string } | null> {
    if (!this.merchantId) return null;
    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<{ token: string; qrCodeUrl: string }>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/checks/${checkId}/scan-to-pay`,
          {}
        )
      );

      // Update the check locally with the token/QR
      this._orders.update(orders => orders.map(o => {
        if (o.guid !== orderId) return o;
        return {
          ...o,
          checks: o.checks.map(c => {
            if (c.guid !== checkId) return c;
            return { ...c, paymentToken: result.token, qrCodeUrl: result.qrCodeUrl, scanToPayEnabled: true };
          }),
        };
      }));

      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to generate QR code');
      return null;
    }
  }

  // PCI DSS 6.4.1: Scan-to-pay methods disabled — the route is blocked and these
  // methods return failure immediately without making HTTP calls. Re-enable only
  // after integrating a tokenized payment SDK (PayPal/Braintree).
  async getCheckByToken(_token: string): Promise<(ScanToPaySession & { check: Check; restaurantName: string; restaurantLogo?: string; allowSplitPay?: boolean; emailReceiptEnabled?: boolean }) | null> {
    return null;
  }

  async submitScanToPayment(_token: string, _payload: { tipAmount: number; paymentMethodNonce: string }): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Mobile payment is not yet available' };
  }

  async submitPartialScanToPayment(
    _token: string,
    _payload: { tipAmount: number; paymentMethodNonce: string; selectedItemGuids: string[]; amount: number },
  ): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Mobile payment is not yet available' };
  }

  async sendScanToPayReceipt(_token: string, _email: string): Promise<boolean> {
    return false;
  }

  onScanToPayCompleted(callback: (data: { orderId: string; checkGuid: string; tipAmount: number; total: number }) => void): () => void {
    this._scanToPayCallbacks.push(callback);
    return () => {
      const idx = this._scanToPayCallbacks.indexOf(callback);
      if (idx !== -1) this._scanToPayCallbacks.splice(idx, 1);
    };
  }

  private handleScanToPayCompleted(data: { orderId: string; checkGuid: string; tipAmount: number; total: number }): void {
    // Update check payment status locally
    this._orders.update(orders => orders.map(o => {
      if (o.guid !== data.orderId) return o;
      return {
        ...o,
        checks: o.checks.map(c => {
          if (c.guid !== data.checkGuid) return c;
          return { ...c, paymentStatus: 'PAID', tipAmount: data.tipAmount, totalAmount: data.total };
        }),
      };
    }));

    for (const cb of this._scanToPayCallbacks) {
      cb(data);
    }
  }

  getOrderById(orderId: string): Order | undefined {
    return this._orders().find(o => o.guid === orderId);
  }

  clearError(): void {
    this._error.set(null);
  }

  async remakeItem(
    orderId: string,
    checkGuid: string,
    selectionGuid: string,
    reason: string
  ): Promise<boolean> {
    if (!this.merchantId) return false;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const raw = await firstValueFrom(
        this.http.post<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/checks/${checkGuid}/items/${selectionGuid}/remake`,
          { reason }
        )
      );
      const updated = this.mapOrder(raw);
      this._orders.update(orders => orders.map(o => o.guid === orderId ? updated : o));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to remake item');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  // --- Customer Recent Orders (Online Portal) ---

  async getCustomerRecentOrders(phone: string, limit = 5): Promise<Order[]> {
    if (!this.merchantId) return [];

    try {
      const rawOrders = await firstValueFrom(
        this.http.get<any[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/recent`,
          { params: { phone, limit: limit.toString() } }
        )
      );
      return (rawOrders ?? []).map(raw => this.mapOrder(raw));
    } catch {
      return [];
    }
  }

  // --- Backend → Frontend mapping (the bridge) ---

  private mapOrder(raw: any): Order {
    const rawStatus: string = raw.status ?? 'pending';
    const guestOrderStatus = mapBackendToGuestStatus(rawStatus);
    const fulfillmentStatus = deriveFulfillmentStatus(rawStatus);

    const selections = mapSelections(raw, fulfillmentStatus);
    const courses = mapCourseList(raw, selections);
    const { subtotal, taxAmount, tipAmount, totalAmount } = mapFinancials(raw);
    const checkPaymentStatus = mapBackendPaymentStatus(raw.paymentStatus);
    const payments = mapPayments(raw, totalAmount, tipAmount, checkPaymentStatus);
    const discounts = mapDiscounts(raw);
    const voidedSelections = mapVoidedSelections(raw);

    const check: Check = {
      guid: `check-${raw.id ?? crypto.randomUUID()}`,
      displayNumber: '1',
      selections,
      payments,
      paymentStatus: checkPaymentStatus,
      subtotal,
      taxAmount,
      tipAmount,
      totalAmount,
      discounts,
      voidedSelections,
      tabName: raw.tabName ?? undefined,
      tabOpenedAt: parseDate(raw.tabOpenedAt),
      tabClosedAt: parseDate(raw.tabClosedAt),
      preauthId: raw.preauthId ?? undefined,
    };

    const diningOptionType = mapOrderType(raw.orderType ?? 'dine-in');
    const diningOption = raw.diningOption ?? getDiningOption(diningOptionType);
    const timestamps = mapTimestamps(raw);
    const throttle = mapThrottle(raw);
    const marketplace = mapMarketplace(raw);
    const depositAmount = raw.depositAmount == null ? undefined : Number(raw.depositAmount);

    return {
      guid: raw.id ?? crypto.randomUUID(),
      merchantId: raw.merchantId ?? '',
      orderNumber: raw.orderNumber ?? '',
      guestOrderStatus,
      orderSource: raw.orderSource ?? undefined,
      businessDate: raw.businessDate,
      server: raw.server ?? { guid: 'system', name: 'System', entityType: 'RestaurantUser' },
      device: raw.device ?? { guid: raw.sourceDeviceId ?? 'unknown', name: raw.sourceDeviceId ? 'POS Device' : 'Unknown Device' },
      table: raw.table ?? (raw.tableId ? { guid: raw.tableId, name: raw.tableNumber ?? raw.tableId, entityType: 'Table' } : undefined),
      diningOption,
      diningOptionType,
      approvalStatus: raw.approvalStatus,
      promisedDate: raw.promisedDate,
      checks: [check],
      courses: courses.length > 0 ? courses : undefined,
      subtotal,
      taxAmount,
      tipAmount,
      totalAmount,
      customer: raw.customer ? { firstName: raw.customer.firstName ?? '', lastName: raw.customer.lastName ?? '', phone: raw.customer.phone ?? '', email: raw.customer.email ?? '' } : undefined,
      specialInstructions: raw.specialInstructions,
      timestamps,
      deliveryInfo: mapDeliveryInfo(raw),
      curbsideInfo: raw.curbsideInfo ?? (raw.vehicleDescription ? { vehicleDescription: raw.vehicleDescription, arrivalNotified: raw.arrivalNotified ?? false } : undefined),
      cateringInfo: raw.cateringInfo ?? (raw.eventDate || raw.headcount ? { eventDate: raw.eventDate, eventTime: raw.eventTime, headcount: raw.headcount, eventType: raw.eventType, setupRequired: raw.setupRequired ?? false, depositAmount, depositPaid: raw.depositPaid ?? false, specialInstructions: raw.cateringInstructions } : undefined),
      throttle,
      marketplace,
      loyaltyPointsEarned: raw.loyaltyPointsEarned ?? 0,
      loyaltyPointsRedeemed: raw.loyaltyPointsRedeemed ?? 0,
    };
  }

  // --- Dining option action methods ---

  async updateDeliveryStatus(orderId: string, deliveryStatus: string): Promise<boolean> {
    if (!this.merchantId) return false;
    try {
      const raw = await firstValueFrom(
        this.http.patch<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/delivery-status`,
          { deliveryStatus }
        )
      );
      const updated = this.mapOrder(raw);
      this._orders.update(orders => orders.map(o => o.guid === orderId ? updated : o));
      return true;
    } catch {
      return false;
    }
  }

  async approveOrder(orderId: string): Promise<boolean> {
    if (!this.merchantId) return false;
    try {
      const raw = await firstValueFrom(
        this.http.patch<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/approval`,
          { status: 'APPROVED' }
        )
      );
      const updated = this.mapOrder(raw);
      this._orders.update(orders => orders.map(o => o.guid === orderId ? updated : o));
      return true;
    } catch {
      return false;
    }
  }

  async rejectOrder(orderId: string): Promise<boolean> {
    if (!this.merchantId) return false;
    try {
      const raw = await firstValueFrom(
        this.http.patch<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/approval`,
          { status: 'NOT_APPROVED' }
        )
      );
      const updated = this.mapOrder(raw);
      this._orders.update(orders => orders.map(o => o.guid === orderId ? updated : o));
      return true;
    } catch {
      return false;
    }
  }

  async notifyCurbsideArrival(orderId: string): Promise<boolean> {
    if (!this.merchantId) return false;
    try {
      const raw = await firstValueFrom(
        this.http.patch<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/arrival`,
          {}
        )
      );
      const updated = this.mapOrder(raw);
      this._orders.update(orders => orders.map(o => o.guid === orderId ? updated : o));
      return true;
    } catch {
      return false;
    }
  }

  async retryPrint(orderId: string): Promise<void> {
    if (!this.merchantId) return;

    this.setPrintStatus(orderId, 'printing');
    this.startPrintTimeout(orderId);

    try {
      await firstValueFrom(
        this.http.post<any>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/reprint`,
          {}
        )
      );
    } catch {
      this.setPrintStatus(orderId, 'failed');
    }
  }

  private setPrintStatus(orderId: string, status: PrintStatus): void {
    this._printStatuses.update(map => {
      const updated = new Map(map);
      updated.set(orderId, status);
      return updated;
    });
    if (status === 'printed' || status === 'failed') {
      this.clearPrintTimeout(orderId);
    }
  }

  private startPrintTimeout(orderId: string): void {
    this.clearPrintTimeout(orderId);
    const timer = setTimeout(() => {
      if (this._printStatuses().get(orderId) === 'printing') {
        this.setPrintStatus(orderId, 'failed');
      }
    }, OrderService.PRINT_TIMEOUT_MS);
    this._printTimeouts.set(orderId, timer);
  }

  private clearPrintTimeout(orderId: string): void {
    const existing = this._printTimeouts.get(orderId);
    if (existing) {
      clearTimeout(existing);
      this._printTimeouts.delete(orderId);
    }
  }
}
