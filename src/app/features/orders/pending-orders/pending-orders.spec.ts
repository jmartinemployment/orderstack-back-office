import '../../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { PendingOrders } from './pending-orders';
import { OrderService } from '../../../services/order';
import { AuthService } from '../../../services/auth';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { DeliveryService } from '../../../services/delivery';
import type { Order, GuestOrderStatus } from '../../../models/order.model';
import { getDiningOption } from '../../../models/dining-option.model';

const NOW = new Date('2026-02-25T12:00:00Z');

function makeOrder(overrides: Partial<Order> & { guid: string; guestOrderStatus: GuestOrderStatus }): Order {
  return {
    merchantId: 'r-1',
    orderNumber: '1001',
    server: { guid: 'srv-1', name: 'Server', entityType: 'RestaurantUser' },
    device: { guid: 'dev-1', name: 'POS' },
    diningOption: getDiningOption('dine-in'),
    diningOptionType: 'dine-in',
    checks: [{
      guid: 'check-1',
      displayNumber: '1',
      selections: [{
        guid: 'sel-1', menuItemGuid: 'mi-1', menuItemName: 'Burger',
        quantity: 1, unitPrice: 12, totalPrice: 12, fulfillmentStatus: 'SENT',
        modifiers: [],
      }],
      payments: [], paymentStatus: 'OPEN',
      subtotal: 12, taxAmount: 1, tipAmount: 0, totalAmount: 13,
      discounts: [], voidedSelections: [],
    }],
    subtotal: 12, taxAmount: 1, tipAmount: 0, totalAmount: 13,
    timestamps: { createdDate: NOW, lastModifiedDate: NOW },
    ...overrides,
  } as Order;
}

function createMockOrderService(orders: Order[] = []) {
  const _orders = signal(orders);
  return {
    orders: _orders.asReadonly(),
    _orders,
    isLoading: signal(false).asReadonly(),
    error: signal<string | null>(null).asReadonly(),
    loadOrders: vi.fn(),
    confirmOrder: vi.fn().mockResolvedValue(undefined),
    startPreparing: vi.fn().mockResolvedValue(undefined),
    markReady: vi.fn().mockResolvedValue(undefined),
    completeOrder: vi.fn(),
    cancelOrder: vi.fn().mockResolvedValue(undefined),
    rejectOrder: vi.fn().mockResolvedValue(undefined),
    approveOrder: vi.fn().mockResolvedValue(undefined),
    getProfitInsight: vi.fn().mockResolvedValue(null),
    getPrintStatus: vi.fn().mockReturnValue('none'),
    retryPrint: vi.fn(),
    fireCourse: vi.fn().mockResolvedValue(undefined),
    bulkUpdateStatus: vi.fn().mockResolvedValue(undefined),
    queuedCount: signal(0),
    isSyncing: signal(false),
    updateDeliveryStatus: vi.fn().mockResolvedValue(undefined),
    notifyCurbsideArrival: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockAuthService() {
  return {
    selectedMerchantName: signal('Taipa').asReadonly(),
    selectedMerchantId: signal('r-1').asReadonly(),
  };
}

function createMockSettingsService() {
  return {
    loadSettings: vi.fn(),
    aiSettings: signal({
      coursePacingMode: 'disabled',
      approvalTimeoutHours: 24,
    }).asReadonly(),
  };
}

function createMockDeliveryService() {
  return {
    drivers: signal([]).asReadonly(),
    availableDrivers: signal([]).asReadonly(),
    activeAssignments: signal([]).asReadonly(),
    trackingOrders: signal(new Map()).asReadonly(),
    activeTrackingCount: signal(0).asReadonly(),
    loadDrivers: vi.fn().mockResolvedValue(undefined),
    loadActiveAssignments: vi.fn().mockResolvedValue(undefined),
    getDriverById: vi.fn().mockReturnValue(null),
    assignOrderToDriver: vi.fn().mockResolvedValue(undefined),
    updateAssignmentStatus: vi.fn().mockResolvedValue(undefined),
    startTrackingDelivery: vi.fn(),
    stopTrackingDelivery: vi.fn(),
    getTrackingForOrder: vi.fn().mockReturnValue(undefined),
    getDispatchStatusLabel: vi.fn().mockReturnValue('Unknown'),
    getDispatchStatusClass: vi.fn().mockReturnValue(''),
  };
}

describe('PendingOrders', () => {
  let fixture: ComponentFixture<PendingOrders>;
  let component: PendingOrders;
  let orderService: ReturnType<typeof createMockOrderService>;

  beforeEach(() => {
    orderService = createMockOrderService([
      makeOrder({ guid: 'o-1', guestOrderStatus: 'RECEIVED', orderNumber: '1001' }),
      makeOrder({ guid: 'o-2', guestOrderStatus: 'IN_PREPARATION', orderNumber: '1002' }),
      makeOrder({ guid: 'o-3', guestOrderStatus: 'READY_FOR_PICKUP', orderNumber: '1003' }),
      makeOrder({ guid: 'o-4', guestOrderStatus: 'CLOSED', orderNumber: '1004' }),
    ]);

    TestBed.configureTestingModule({
      imports: [PendingOrders],
      providers: [
        { provide: OrderService, useValue: orderService },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: RestaurantSettingsService, useValue: createMockSettingsService() },
        { provide: DeliveryService, useValue: createMockDeliveryService() },
      ],
    });
    fixture = TestBed.createComponent(PendingOrders);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('calls loadOrders on init', () => {
    expect(orderService.loadOrders).toHaveBeenCalled();
  });

  // --- pendingOrders computed ---

  it('filters only RECEIVED, IN_PREPARATION, READY_FOR_PICKUP orders', () => {
    expect(component.pendingOrders().length).toBe(3);
    expect(component.pendingOrders().map(o => o.guid)).toEqual(['o-1', 'o-2', 'o-3']);
  });

  it('excludes CLOSED orders from pending', () => {
    expect(component.pendingOrders().find(o => o.guid === 'o-4')).toBeUndefined();
  });

  // --- orderCounts computed ---

  it('computes order counts by status', () => {
    const counts = component.orderCounts();
    expect(counts.received).toBe(1);
    expect(counts.inPreparation).toBe(1);
    expect(counts.ready).toBe(1);
  });

  // --- Search ---

  it('filters orders by search query', () => {
    component.setSearchQuery('1001');
    expect(component.pendingOrders().length).toBe(1);
    expect(component.pendingOrders()[0].guid).toBe('o-1');
  });

  it('search matches item names', () => {
    component.setSearchQuery('burger');
    expect(component.pendingOrders().length).toBe(3);
  });

  it('returns all when search is empty', () => {
    component.setSearchQuery('');
    expect(component.pendingOrders().length).toBe(3);
  });

  // --- Channel filter ---

  it('filters by channel', () => {
    component.setChannelFilter('online');
    expect(component.pendingOrders().length).toBe(0);
  });

  it('shows all when channel is all', () => {
    component.setChannelFilter('all');
    expect(component.pendingOrders().length).toBe(3);
  });

  // --- Marketplace filter ---

  it('filters by marketplace', () => {
    component.setMarketplaceFilter('marketplace');
    expect(component.pendingOrders().length).toBe(0);
  });

  // --- getTimeSinceOrder ---

  it('returns "Just now" for recent order', () => {
    const order = makeOrder({ guid: 'o-x', guestOrderStatus: 'RECEIVED',
      timestamps: { createdDate: new Date(), lastModifiedDate: new Date() } });
    expect(component.getTimeSinceOrder(order)).toBe('Just now');
  });

  it('returns "5 mins ago" for 5-minute-old order', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000);
    const order = makeOrder({ guid: 'o-x', guestOrderStatus: 'RECEIVED',
      timestamps: { createdDate: fiveMinAgo, lastModifiedDate: fiveMinAgo } });
    expect(component.getTimeSinceOrder(order)).toBe('5 mins ago');
  });

  // --- Payment badge ---

  it('returns correct payment badge classes', () => {
    expect(component.getPaymentBadgeClass('PAID')).toBe('payment-paid');
    expect(component.getPaymentBadgeClass('OPEN')).toBe('payment-pending');
    expect(component.getPaymentBadgeClass('CLOSED')).toBe('payment-refunded');
    expect(component.getPaymentBadgeClass('UNKNOWN')).toBe('payment-pending');
  });

  it('returns correct payment labels', () => {
    expect(component.getPaymentLabel('PAID')).toBe('Paid');
    expect(component.getPaymentLabel('OPEN')).toBe('Unpaid');
    expect(component.getPaymentLabel('CLOSED')).toBe('Closed');
  });

  // --- Action label ---

  it('returns correct action labels by dining type', () => {
    const delivery = makeOrder({ guid: 'o-x', guestOrderStatus: 'RECEIVED',
      diningOption: getDiningOption('delivery'), diningOptionType: 'delivery' });
    expect(component.getActionLabel(delivery)).toBe('Delivered');

    const takeout = makeOrder({ guid: 'o-x', guestOrderStatus: 'RECEIVED',
      diningOption: getDiningOption('takeout'), diningOptionType: 'takeout' });
    expect(component.getActionLabel(takeout)).toBe('Picked Up');
  });

  // --- Order actions ---

  it('confirmOrder calls orderService', async () => {
    await component.confirmOrder(makeOrder({ guid: 'o-1', guestOrderStatus: 'RECEIVED' }));
    expect(orderService.confirmOrder).toHaveBeenCalledWith('o-1');
  });

  it('startPreparing calls orderService', async () => {
    await component.startPreparing(makeOrder({ guid: 'o-1', guestOrderStatus: 'RECEIVED' }));
    expect(orderService.startPreparing).toHaveBeenCalledWith('o-1');
  });

  it('markReady calls orderService', async () => {
    await component.markReady(makeOrder({ guid: 'o-2', guestOrderStatus: 'IN_PREPARATION' }));
    expect(orderService.markReady).toHaveBeenCalledWith('o-2');
  });

  // --- Cancel flow ---

  it('confirmCancel sets cancel target', () => {
    const order = makeOrder({ guid: 'o-1', guestOrderStatus: 'RECEIVED' });
    component.confirmCancel(order);
    expect(component.cancelTarget()?.guid).toBe('o-1');
  });

  it('dismissCancel clears cancel target', () => {
    component.confirmCancel(makeOrder({ guid: 'o-1', guestOrderStatus: 'RECEIVED' }));
    component.dismissCancel();
    expect(component.cancelTarget()).toBeNull();
  });

  it('executeCancel calls orderService and clears target', async () => {
    component.confirmCancel(makeOrder({ guid: 'o-1', guestOrderStatus: 'RECEIVED' }));
    await component.executeCancel();
    expect(orderService.cancelOrder).toHaveBeenCalledWith('o-1');
    expect(component.cancelTarget()).toBeNull();
  });

  it('executeCancel does nothing when no target', async () => {
    await component.executeCancel();
    expect(orderService.cancelOrder).not.toHaveBeenCalled();
  });

  // --- Reject flow ---

  it('confirmReject/dismissReject/executeReject work', async () => {
    const order = makeOrder({ guid: 'o-1', guestOrderStatus: 'RECEIVED' });
    component.confirmReject(order);
    expect(component.rejectTarget()?.guid).toBe('o-1');

    component.dismissReject();
    expect(component.rejectTarget()).toBeNull();

    component.confirmReject(order);
    await component.executeReject();
    expect(orderService.rejectOrder).toHaveBeenCalledWith('o-1');
    expect(component.rejectTarget()).toBeNull();
  });

  // --- Bulk selection ---

  it('toggleOrderSelection adds/removes from set', () => {
    component.toggleOrderSelection('o-1');
    expect(component.isOrderSelected('o-1')).toBe(true);
    expect(component.selectedCount()).toBe(1);

    component.toggleOrderSelection('o-1');
    expect(component.isOrderSelected('o-1')).toBe(false);
    expect(component.selectedCount()).toBe(0);
  });

  it('toggleSelectAll selects all pending orders', () => {
    component.toggleSelectAll();
    expect(component.selectedCount()).toBe(3);
    expect(component.allSelected()).toBe(true);
  });

  it('toggleSelectAll deselects when all selected', () => {
    component.toggleSelectAll();
    component.toggleSelectAll();
    expect(component.selectedCount()).toBe(0);
  });

  it('clearSelection empties selection', () => {
    component.toggleSelectAll();
    component.clearSelection();
    expect(component.selectedCount()).toBe(0);
  });

  it('requestBulkAction does nothing when none selected', () => {
    component.requestBulkAction('IN_PREPARATION');
    expect(component.showBulkConfirm()).toBe(false);
  });

  it('requestBulkAction shows confirm when selected', () => {
    component.toggleOrderSelection('o-1');
    component.requestBulkAction('IN_PREPARATION');
    expect(component.showBulkConfirm()).toBe(true);
    expect(component.bulkAction()).toBe('IN_PREPARATION');
  });

  it('executeBulkAction calls service and clears state', async () => {
    component.toggleOrderSelection('o-1');
    component.toggleOrderSelection('o-2');
    component.requestBulkAction('IN_PREPARATION');
    await component.executeBulkAction();
    expect(orderService.bulkUpdateStatus).toHaveBeenCalledWith(
      expect.arrayContaining(['o-1', 'o-2']),
      'IN_PREPARATION'
    );
    expect(component.selectedCount()).toBe(0);
    expect(component.showBulkConfirm()).toBe(false);
  });

  // --- Bulk action labels ---

  it('getBulkActionLabel returns correct labels', () => {
    component.toggleOrderSelection('o-1');
    component.requestBulkAction('IN_PREPARATION');
    expect(component.getBulkActionLabel()).toBe('Mark In Progress');
  });

  // --- Delivery states ---

  it('getDeliveryStateBadgeClass returns correct classes', () => {
    expect(component.getDeliveryStateBadgeClass('PREPARING')).toBe('delivery-preparing');
    expect(component.getDeliveryStateBadgeClass('OUT_FOR_DELIVERY')).toBe('delivery-out');
    expect(component.getDeliveryStateBadgeClass('DELIVERED')).toBe('delivery-done');
  });

  it('getNextDeliveryState progresses correctly', () => {
    expect(component.getNextDeliveryState('PREPARING')).toBe('OUT_FOR_DELIVERY');
    expect(component.getNextDeliveryState('OUT_FOR_DELIVERY')).toBe('DELIVERED');
    expect(component.getNextDeliveryState('DELIVERED')).toBeNull();
  });

  // --- Fire status ---

  it('getFireStatusClass returns correct classes', () => {
    expect(component.getFireStatusClass('PENDING')).toBe('bg-secondary');
    expect(component.getFireStatusClass('FIRED')).toBe('bg-primary');
    expect(component.getFireStatusClass('READY')).toBe('bg-success');
  });

  // --- Course groups ---

  it('returns empty when course pacing disabled', () => {
    expect(component.coursePacingEnabled()).toBe(false);
    const order = makeOrder({ guid: 'o-1', guestOrderStatus: 'RECEIVED' });
    expect(component.orderHasCourses(order)).toBe(false);
  });

  // --- Channel helpers ---

  it('getChannelIcon returns correct icon', () => {
    const posOrder = makeOrder({ guid: 'o-x', guestOrderStatus: 'RECEIVED' });
    expect(component.getChannelIcon(posOrder)).toBe('bi-display');
  });

  it('getChannelLabel returns marketplace labels', () => {
    const ddOrder = makeOrder({ guid: 'o-x', guestOrderStatus: 'RECEIVED', orderSource: 'marketplace_doordash' as any });
    expect(component.getChannelLabel(ddOrder)).toBe('DoorDash');
  });

  // --- Driver assignment ---

  it('getAssignmentStatusLabel returns correct labels', () => {
    expect(component.getAssignmentStatusLabel('assigned')).toBe('Assigned');
    expect(component.getAssignmentStatusLabel('en_route')).toBe('En Route');
    expect(component.getAssignmentStatusLabel('delivered')).toBe('Delivered');
  });

  it('getNextAssignmentStatus progresses correctly', () => {
    expect(component.getNextAssignmentStatus('assigned')).toBe('picked_up');
    expect(component.getNextAssignmentStatus('picked_up')).toBe('en_route');
    expect(component.getNextAssignmentStatus('en_route')).toBe('delivered');
    expect(component.getNextAssignmentStatus('delivered')).toBeNull();
  });

  it('getVehicleIcon returns correct icons', () => {
    expect(component.getVehicleIcon('car')).toBe('bi-car-front');
    expect(component.getVehicleIcon('bike')).toBe('bi-bicycle');
    expect(component.getVehicleIcon('walk')).toBe('bi-person-walking');
  });

  // --- retry ---

  it('retry calls loadOrders', () => {
    component.retry();
    expect(orderService.loadOrders).toHaveBeenCalledTimes(2); // once in ngOnInit, once here
  });
});
