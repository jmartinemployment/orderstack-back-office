import '../../../../test-setup';
import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { KdsDisplay } from './kds-display';
import { OrderService } from '../../../services/order';
import { SocketService } from '../../../services/socket';
import { AuthService } from '../../../services/auth';
import { MenuService } from '../../../services/menu';
import { DeliveryService } from '../../../services/delivery';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import {
  defaultAISettings,
  defaultDeliverySettings,
  getDiningOption,
  type DeliveryDispatchResult,
  type DeliveryQuote,
  type DeliverySettings,
  type Order,
} from '../../../models/index';

type OrderStateSignals = {
  all: WritableSignal<Order[]>;
  pending: WritableSignal<Order[]>;
  preparing: WritableSignal<Order[]>;
  ready: WritableSignal<Order[]>;
};

type KdsHarness = {
  component: KdsDisplay;
  order: Order;
  signals: OrderStateSignals;
  aiSettings: WritableSignal<ReturnType<typeof defaultAISettings>>;
  deliverySettings: WritableSignal<DeliverySettings>;
  deliveryError: WritableSignal<string | null>;
  selectedProviderConfigured: WritableSignal<boolean>;
  requestQuote: ReturnType<typeof vi.fn>;
  acceptQuote: ReturnType<typeof vi.fn>;
  getCoursePacingMetrics: ReturnType<typeof vi.fn>;
  updateOrderStatus: ReturnType<typeof vi.fn>;
};

function createDeliveryOrder(id: string): Order {
  const now = new Date();
  return {
    guid: id,
    merchantId: 'restaurant-1',
    orderNumber: '1001',
    guestOrderStatus: 'READY_FOR_PICKUP',
    server: { guid: 'server-1', name: 'Server', entityType: 'RestaurantUser' },
    device: { guid: 'device-1', name: 'POS Device' },
    diningOption: getDiningOption('delivery'),
    diningOptionType: 'delivery',
    checks: [{
      guid: 'check-1',
      displayNumber: '1',
      selections: [],
      payments: [],
      paymentStatus: 'OPEN',
      subtotal: 0,
      taxAmount: 0,
      tipAmount: 0,
      totalAmount: 0,
      discounts: [],
      voidedSelections: [],
    }],
    subtotal: 0,
    taxAmount: 0,
    tipAmount: 0,
    totalAmount: 0,
    timestamps: {
      createdDate: now,
      lastModifiedDate: now,
    },
    deliveryInfo: {
      address: '123 Main St',
      city: 'Fort Lauderdale',
      state: 'FL',
      zip: '33301',
      deliveryState: 'PREPARING',
    },
  };
}

function createHarness(autoDispatch = true): KdsHarness {
  const order = createDeliveryOrder('order-1');
  const ordersById = new Map<string, Order>([[order.guid, order]]);

  const all = signal<Order[]>([order]);
  const pending = signal<Order[]>([]);
  const preparing = signal<Order[]>([]);
  const ready = signal<Order[]>([order]);
  const signals: OrderStateSignals = { all, pending, preparing, ready };

  const updateOrderStatus = vi.fn(async () => true);
  const getCoursePacingMetrics = vi.fn(async () => ({
    lookbackDays: 30,
    sampleSize: 80,
    tablePaceBaselineSeconds: 900,
    p50Seconds: 840,
    p80Seconds: 1080,
    confidence: 'medium' as const,
    generatedAt: new Date(),
  }));
  const getOrderThrottlingStatus = vi.fn(async () => ({
    enabled: false,
    triggering: false,
    activeOrders: 0,
    overdueOrders: 0,
    heldOrders: 0,
    thresholds: {
      maxActiveOrders: 18,
      maxOverdueOrders: 6,
      releaseActiveOrders: 14,
      releaseOverdueOrders: 3,
      maxHoldMinutes: 20,
    },
    evaluatedAt: new Date(),
  }));

  const orderServiceMock = {
    orders: all.asReadonly(),
    pendingOrders: pending.asReadonly(),
    preparingOrders: preparing.asReadonly(),
    readyOrders: ready.asReadonly(),
    isLoading: signal(false).asReadonly(),
    error: signal<string | null>(null).asReadonly(),
    loadOrders: vi.fn(),
    updateOrderStatus,
    getCoursePacingMetrics,
    getOrderThrottlingStatus,
    holdOrderForThrottling: vi.fn(async () => true),
    releaseOrderFromThrottling: vi.fn(async () => true),
    getOrderById: vi.fn((orderId: string) => ordersById.get(orderId)),
    fireCourse: vi.fn(),
    triggerPrint: vi.fn(),
    getPrintStatus: vi.fn(() => 'none'),
    retryPrint: vi.fn(),
    recallOrder: vi.fn(),
    clearError: vi.fn(),
  };

  const deliveryError = signal<string | null>(null);
  const selectedProviderConfigured = signal(true);
  const configStatus = signal({ doordash: true, uber: true });

  const requestQuote = vi.fn(async (): Promise<DeliveryQuote> => ({
    provider: 'doordash',
    quoteId: 'quote-1',
    fee: 6.25,
    estimatedPickupAt: '2026-02-13T12:00:00.000Z',
    estimatedDeliveryAt: '2026-02-13T12:35:00.000Z',
    expiresAt: '2026-02-13T12:05:00.000Z',
  }));

  const acceptQuote = vi.fn(async (): Promise<DeliveryDispatchResult> => ({
    deliveryExternalId: 'delivery-1',
    trackingUrl: 'https://example.com/track/delivery-1',
    estimatedDeliveryAt: '2026-02-13T12:35:00.000Z',
  }));

  const deliveryServiceMock = {
    setProviderType: vi.fn(),
    isConfigured: vi.fn(() => true),
    isProviderConfiguredFor: vi.fn(() => selectedProviderConfigured()),
    ensureSelectedProviderConfigured: vi.fn(async () => selectedProviderConfigured()),
    selectedProviderConfigured: selectedProviderConfigured.asReadonly(),
    configStatus: configStatus.asReadonly(),
    loadConfigStatus: vi.fn(async () => configStatus()),
    requestQuote,
    acceptQuote,
    error: deliveryError.asReadonly(),
  };

  const deliverySettings = signal<DeliverySettings>({
    ...defaultDeliverySettings(),
    provider: 'doordash',
    autoDispatch,
  });
  const aiSettings = signal(defaultAISettings());

  const settingsServiceMock = {
    aiSettings: aiSettings.asReadonly(),
    deliverySettings: deliverySettings.asReadonly(),
    loadSettings: vi.fn(async () => {}),
  };

  const authServiceMock = {
    isAuthenticated: signal(true).asReadonly(),
    selectedMerchantName: signal('Test Kitchen').asReadonly(),
    selectedMerchantId: vi.fn(() => 'restaurant-1'),
  };

  const socketServiceMock = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  const menuServiceMock = {
    allItems: signal([]).asReadonly(),
    loadMenu: vi.fn(),
  };

  TestBed.configureTestingModule({
    providers: [
      { provide: OrderService, useValue: orderServiceMock },
      { provide: SocketService, useValue: socketServiceMock },
      { provide: AuthService, useValue: authServiceMock },
      { provide: MenuService, useValue: menuServiceMock },
      { provide: DeliveryService, useValue: deliveryServiceMock },
      { provide: RestaurantSettingsService, useValue: settingsServiceMock },
    ],
  });

  const component = TestBed.runInInjectionContext(() => new KdsDisplay());
  component.ngOnInit();

  return {
    component,
    order,
    signals,
    aiSettings,
    deliverySettings,
    deliveryError,
    selectedProviderConfigured,
    requestQuote,
    acceptQuote,
    getCoursePacingMetrics,
    updateOrderStatus,
  };
}

describe('KdsDisplay Auto-Dispatch', () => {
  let harness: KdsHarness;

  afterEach(() => {
    harness?.component.ngOnDestroy();
  });

  beforeEach(() => {
    harness = createHarness(true);
  });

  it('auto-dispatches once for READY and blocks duplicate auto triggers', async () => {
    harness.component.onStatusChange({ orderId: harness.order.guid, status: 'READY_FOR_PICKUP' });

    await vi.waitFor(() => {
      expect(harness.requestQuote).toHaveBeenCalledTimes(1);
      expect(harness.acceptQuote).toHaveBeenCalledTimes(1);
      expect(harness.component.getDispatchState(harness.order.guid)).toBe('dispatched');
    });

    harness.component.onStatusChange({ orderId: harness.order.guid, status: 'READY_FOR_PICKUP' });

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(harness.requestQuote).toHaveBeenCalledTimes(1);
    expect(harness.acceptQuote).toHaveBeenCalledTimes(1);
  });

  it('keeps failed state and supports manual retry dispatch', async () => {
    harness.deliverySettings.update(settings => ({
      ...settings,
      autoDispatch: false,
    }));

    harness.acceptQuote.mockImplementationOnce(async () => {
      harness.deliveryError.set('Provider unavailable');
      return null;
    });
    harness.acceptQuote.mockImplementationOnce(async () => {
      harness.deliveryError.set(null);
      return {
        deliveryExternalId: 'delivery-2',
        trackingUrl: 'https://example.com/track/delivery-2',
        estimatedDeliveryAt: '2026-02-13T12:55:00.000Z',
      };
    });

    // Manual mode step 1: request quote only.
    harness.component.onDispatchDriver(harness.order.guid);

    await vi.waitFor(() => {
      expect(harness.requestQuote).toHaveBeenCalledTimes(1);
    });
    expect(harness.acceptQuote).not.toHaveBeenCalled();
    expect(harness.component.getDispatchState(harness.order.guid)).toBe('idle');

    // Manual mode step 2: dispatch with existing quote fails.
    harness.component.onDispatchDriver(harness.order.guid);

    await vi.waitFor(() => {
      expect(harness.component.getDispatchState(harness.order.guid)).toBe('failed');
    });
    expect(harness.component.getDispatchError(harness.order.guid)).toContain('Provider unavailable');
    expect(harness.component.canDispatchDelivery(harness.order.guid)).toBe(true);

    // Manual mode step 3: retry succeeds.
    harness.component.onDispatchDriver(harness.order.guid);

    await vi.waitFor(() => {
      expect(harness.component.getDispatchState(harness.order.guid)).toBe('dispatched');
    });
    expect(harness.requestQuote).toHaveBeenCalledTimes(1);
    expect(harness.acceptQuote).toHaveBeenCalledTimes(2);
  });

  it('re-requests quote once when provider returns an expired quote error', async () => {
    harness.requestQuote
      .mockImplementationOnce(async (): Promise<DeliveryQuote> => ({
        provider: 'doordash',
        quoteId: 'quote-expired',
        fee: 7.5,
        estimatedPickupAt: '2026-02-13T12:00:00.000Z',
        estimatedDeliveryAt: '2026-02-13T12:45:00.000Z',
        expiresAt: '2026-02-13T12:01:00.000Z',
      }))
      .mockImplementationOnce(async (): Promise<DeliveryQuote> => ({
        provider: 'doordash',
        quoteId: 'quote-fresh',
        fee: 8,
        estimatedPickupAt: '2026-02-13T12:05:00.000Z',
        estimatedDeliveryAt: '2026-02-13T12:50:00.000Z',
        expiresAt: '2026-02-13T12:10:00.000Z',
      }));

    harness.acceptQuote
      .mockImplementationOnce(async () => {
        harness.deliveryError.set('Dispatch failed: 410 Gone');
        return null;
      })
      .mockImplementationOnce(async () => {
        harness.deliveryError.set(null);
        return {
          deliveryExternalId: 'delivery-3',
          trackingUrl: 'https://example.com/track/delivery-3',
          estimatedDeliveryAt: '2026-02-13T12:50:00.000Z',
        };
      });

    harness.component.onStatusChange({ orderId: harness.order.guid, status: 'READY_FOR_PICKUP' });

    await vi.waitFor(() => {
      expect(harness.component.getDispatchState(harness.order.guid)).toBe('dispatched');
    });
    expect(harness.requestQuote).toHaveBeenCalledTimes(2);
    expect(harness.acceptQuote).toHaveBeenCalledTimes(2);
  });

  it('blocks dispatch when provider credentials are not configured', async () => {
    harness.deliverySettings.update(settings => ({
      ...settings,
      autoDispatch: false,
    }));
    harness.selectedProviderConfigured.set(false);

    harness.component.onDispatchDriver(harness.order.guid);

    await vi.waitFor(() => {
      expect(harness.component.getDispatchState(harness.order.guid)).toBe('failed');
    });
    expect(harness.component.getDispatchError(harness.order.guid)).toContain('credentials');
    expect(harness.requestQuote).not.toHaveBeenCalled();
    expect(harness.acceptQuote).not.toHaveBeenCalled();
  });

  it('syncs target course serve gap from AI settings', async () => {
    expect(harness.component.targetCourseServeGapSeconds()).toBe(1200);

    harness.aiSettings.update(settings => ({
      ...settings,
      targetCourseServeGapSeconds: 1800,
    }));

    await vi.waitFor(() => {
      expect(harness.component.targetCourseServeGapSeconds()).toBe(1800);
    });
  });
});
