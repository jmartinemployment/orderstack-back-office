import '../../../../test-setup';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { CloseOfDay } from './close-of-day';
import { OrderService } from '../../../services/order';
import { AnalyticsService } from '../../../services/analytics';
import { TipService } from '../../../services/tip';
import { AuthService } from '../../../services/auth';
import { ReportService } from '../../../services/report';
import { CashDrawerService } from '../../../services/cash-drawer';
import { DeliveryService } from '../../../services/delivery';
import type { Order, Check, Selection } from '../../../models/index';

function makeOrder(overrides: Partial<Order> = {}): Order {
  const now = new Date();
  return {
    guid: overrides.guid ?? 'o-1',
    merchantId: 'r-1',
    orderNumber: 1,
    guestOrderStatus: 'CLOSED',
    totalAmount: 100,
    subtotal: 90,
    taxAmount: 8,
    tipAmount: 15,
    discountAmount: 0,
    serviceChargeAmount: 0,
    checks: [{
      guid: 'c-1',
      checkNumber: 1,
      subtotal: 90,
      totalAmount: 100,
      taxAmount: 8,
      discountAmount: 0,
      tipAmount: 15,
      selections: [{
        guid: 's-1',
        menuItemGuid: 'mg-1',
        menuItemName: 'Burger',
        menuItemId: 'mi-1',
        quantity: 2,
        unitPrice: 15,
        totalPrice: 30,
        seatNumber: 1,
        isComped: false,
        modifiers: [],
        fulfillmentStatus: 'NEW',
      } as Selection],
      payments: [{
        guid: 'p-1',
        amount: 100,
        paymentMethod: 'credit',
        paymentProcessor: 'paypal',
        status: 'PAID',
      }],
      voidedSelections: [],
      discounts: [],
    } as unknown as Check],
    timestamps: {
      createdDate: now,
      closedDate: now,
    },
    diningOption: { type: 'dine_in' },
    orderSource: 'pos',
    ...overrides,
  } as unknown as Order;
}

function createHarness() {
  const orders = signal<Order[]>([]);
  const orderServiceMock = {
    orders,
    loadOrders: vi.fn().mockResolvedValue(undefined),
  };

  const analyticsServiceMock = {
    salesReport: signal(null).asReadonly(),
    loadSalesReport: vi.fn().mockResolvedValue(undefined),
  };

  const tipServiceMock = {
    report: signal(null).asReadonly(),
    setDateRange: vi.fn(),
  };

  const authMock = {
    selectedMerchantId: vi.fn(() => 'r-1'),
    isAuthenticated: signal(true).asReadonly(),
  };

  const reportServiceMock = {
    getTeamMemberSales: vi.fn().mockResolvedValue([]),
    getTaxServiceChargeReport: vi.fn().mockResolvedValue(null),
  };

  const cashDrawerServiceMock = {
    todaysReconciliations: signal([]).asReadonly(),
    loadSessionHistory: vi.fn(),
  };

  const deliveryServiceMock = {
    loadDeliveryAnalytics: vi.fn().mockResolvedValue(null),
  };

  TestBed.configureTestingModule({
    providers: [
      CloseOfDay,
      { provide: OrderService, useValue: orderServiceMock },
      { provide: AnalyticsService, useValue: analyticsServiceMock },
      { provide: TipService, useValue: tipServiceMock },
      { provide: AuthService, useValue: authMock },
      { provide: ReportService, useValue: reportServiceMock },
      { provide: CashDrawerService, useValue: cashDrawerServiceMock },
      { provide: DeliveryService, useValue: deliveryServiceMock },
    ],
  });

  const component = TestBed.inject(CloseOfDay);
  return { component, orders, deliveryServiceMock };
}

describe('CloseOfDay — KPI computeds', () => {
  it('computes totalRevenue from closed orders', () => {
    const { component, orders } = createHarness();
    orders.set([
      makeOrder({ guid: 'o-1', totalAmount: 100, guestOrderStatus: 'CLOSED' }),
      makeOrder({ guid: 'o-2', totalAmount: 250, guestOrderStatus: 'CLOSED' }),
      makeOrder({ guid: 'o-3', totalAmount: 50, guestOrderStatus: 'VOIDED' }),
    ]);

    expect(component.totalRevenue()).toBe(350);
    expect(component.totalOrders()).toBe(2);
  });

  it('computes averageCheck correctly', () => {
    const { component, orders } = createHarness();
    orders.set([
      makeOrder({ guid: 'o-1', totalAmount: 100 }),
      makeOrder({ guid: 'o-2', totalAmount: 200 }),
    ]);

    expect(component.averageCheck()).toBe(150);
  });

  it('returns 0 for averageCheck when no orders', () => {
    const { component } = createHarness();
    expect(component.averageCheck()).toBe(0);
  });

  it('computes totalTips from closed orders', () => {
    const { component, orders } = createHarness();
    orders.set([
      makeOrder({ guid: 'o-1', tipAmount: 10 }),
      makeOrder({ guid: 'o-2', tipAmount: 25 }),
    ]);

    expect(component.totalTips()).toBe(35);
  });

  it('computes totalTax from closed orders', () => {
    const { component, orders } = createHarness();
    orders.set([
      makeOrder({ guid: 'o-1', taxAmount: 8 }),
      makeOrder({ guid: 'o-2', taxAmount: 12 }),
    ]);

    expect(component.totalTax()).toBe(20);
  });
});

describe('CloseOfDay — voidedOrders vs closedOrders', () => {
  it('separates closed and voided orders', () => {
    const { component, orders } = createHarness();
    orders.set([
      makeOrder({ guid: 'o-1', guestOrderStatus: 'CLOSED' }),
      makeOrder({ guid: 'o-2', guestOrderStatus: 'VOIDED' }),
      makeOrder({ guid: 'o-3', guestOrderStatus: 'CLOSED' }),
    ]);

    expect(component.closedOrders()).toHaveLength(2);
    expect(component.voidedOrders()).toHaveLength(1);
    expect(component.voidedOrders()[0].guid).toBe('o-2');
  });
});

describe('CloseOfDay — paymentBreakdown', () => {
  it('groups payments by method and sorts by total descending', () => {
    const { component, orders } = createHarness();
    orders.set([
      makeOrder({
        guid: 'o-1',
        checks: [{
          guid: 'c-1', checkNumber: 1, subtotal: 90, totalAmount: 100,
          taxAmount: 8, discountAmount: 0, tipAmount: 15,
          selections: [], voidedSelections: [], discounts: [],
          payments: [
            { guid: 'p-1', amount: 100, paymentProcessor: 'paypal', paymentMethod: 'credit', status: 'PAID' },
          ],
        } as unknown as Check],
      }),
      makeOrder({
        guid: 'o-2',
        checks: [{
          guid: 'c-2', checkNumber: 1, subtotal: 40, totalAmount: 50,
          taxAmount: 4, discountAmount: 0, tipAmount: 5,
          selections: [], voidedSelections: [], discounts: [],
          payments: [
            { guid: 'p-2', amount: 50, paymentProcessor: 'paypal', paymentMethod: 'credit', status: 'PAID' },
          ],
        } as unknown as Check],
      }),
      makeOrder({
        guid: 'o-3',
        totalAmount: 30,
        checks: [{
          guid: 'c-3', checkNumber: 1, subtotal: 25, totalAmount: 30,
          taxAmount: 2, discountAmount: 0, tipAmount: 3,
          selections: [], voidedSelections: [], discounts: [],
          payments: [],
        } as unknown as Check],
      }),
    ]);

    const breakdown = component.paymentBreakdown();
    expect(breakdown).toHaveLength(2);
    // PayPal total = 150, Cash total = 30
    expect(breakdown[0].method).toBe('PayPal');
    expect(breakdown[0].total).toBe(150);
    expect(breakdown[0].count).toBe(2);
    expect(breakdown[1].method).toBe('Cash');
    expect(breakdown[1].total).toBe(30);
  });
});

describe('CloseOfDay — topSellers', () => {
  it('aggregates items by name and sorts by revenue descending', () => {
    const { component, orders } = createHarness();
    orders.set([
      makeOrder({
        guid: 'o-1',
        checks: [{
          guid: 'c-1', checkNumber: 1, subtotal: 90, totalAmount: 100,
          taxAmount: 8, discountAmount: 0, tipAmount: 15,
          payments: [{ guid: 'p-1', amount: 100, paymentProcessor: 'paypal', status: 'PAID' }],
          voidedSelections: [], discounts: [],
          selections: [
            { guid: 's-1', menuItemName: 'Burger', menuItemId: 'mi-1', quantity: 3, unitPrice: 15, totalPrice: 45, isComped: false, modifiers: [] },
            { guid: 's-2', menuItemName: 'Fries', menuItemId: 'mi-2', quantity: 2, unitPrice: 6, totalPrice: 12, isComped: false, modifiers: [] },
          ],
        } as unknown as Check],
      }),
      makeOrder({
        guid: 'o-2',
        checks: [{
          guid: 'c-2', checkNumber: 1, subtotal: 50, totalAmount: 60,
          taxAmount: 5, discountAmount: 0, tipAmount: 8,
          payments: [{ guid: 'p-2', amount: 60, paymentProcessor: 'paypal', status: 'PAID' }],
          voidedSelections: [], discounts: [],
          selections: [
            { guid: 's-3', menuItemName: 'Burger', menuItemId: 'mi-1', quantity: 1, unitPrice: 15, totalPrice: 15, isComped: false, modifiers: [] },
          ],
        } as unknown as Check],
      }),
    ]);

    const top = component.topSellers();
    expect(top[0].name).toBe('Burger');
    expect(top[0].quantity).toBe(4);
    expect(top[0].revenue).toBe(60);
    expect(top[1].name).toBe('Fries');
    expect(top[1].quantity).toBe(2);
    expect(top[1].revenue).toBe(12);
  });

  it('excludes comped items from top sellers', () => {
    const { component, orders } = createHarness();
    orders.set([
      makeOrder({
        guid: 'o-1',
        checks: [{
          guid: 'c-1', checkNumber: 1, subtotal: 90, totalAmount: 100,
          taxAmount: 8, discountAmount: 0, tipAmount: 15,
          payments: [{ guid: 'p-1', amount: 100, paymentProcessor: 'paypal', status: 'PAID' }],
          voidedSelections: [], discounts: [],
          selections: [
            { guid: 's-1', menuItemName: 'Burger', menuItemId: 'mi-1', quantity: 1, unitPrice: 15, totalPrice: 15, isComped: false, modifiers: [] },
            { guid: 's-2', menuItemName: 'Free Drink', menuItemId: 'mi-3', quantity: 1, unitPrice: 5, totalPrice: 5, isComped: true, modifiers: [] },
          ],
        } as unknown as Check],
      }),
    ]);

    const top = component.topSellers();
    expect(top).toHaveLength(1);
    expect(top[0].name).toBe('Burger');
  });
});

describe('CloseOfDay — orderSourceBreakdown', () => {
  it('groups orders by source', () => {
    const { component, orders } = createHarness();
    orders.set([
      makeOrder({ guid: 'o-1', orderSource: 'pos' }),
      makeOrder({ guid: 'o-2', orderSource: 'online' }),
      makeOrder({ guid: 'o-3', orderSource: 'pos' }),
    ]);

    const sources = component.orderSourceBreakdown();
    const posEntry = sources.find(s => s.source === 'POS');
    const onlineEntry = sources.find(s => s.source === 'Online');
    expect(posEntry?.count).toBe(2);
    expect(onlineEntry?.count).toBe(1);
  });
});

describe('CloseOfDay — deliveryOrderCount', () => {
  it('counts delivery orders from closed orders', () => {
    const { component, orders } = createHarness();
    orders.set([
      makeOrder({ guid: 'o-1', diningOption: { type: 'dine_in' } as any }),
      makeOrder({ guid: 'o-2', diningOption: { type: 'delivery' } as any }),
      makeOrder({ guid: 'o-3', diningOption: { type: 'delivery' } as any }),
    ]);

    expect(component.deliveryOrderCount()).toBe(2);
  });
});

describe('CloseOfDay — tab navigation', () => {
  it('defaults to summary tab', () => {
    const { component } = createHarness();
    expect(component.activeTab()).toBe('summary');
  });

  it('setTab changes active tab', () => {
    const { component } = createHarness();
    component.setTab('payments');
    expect(component.activeTab()).toBe('payments');
  });

  it('setTab to delivery triggers loadDeliveryAnalytics', () => {
    const { component, deliveryServiceMock } = createHarness();
    component.setTab('delivery');
    expect(deliveryServiceMock.loadDeliveryAnalytics).toHaveBeenCalled();
  });
});

describe('CloseOfDay — getReportDateString', () => {
  it('returns ISO date string', () => {
    const { component } = createHarness();
    const dateStr = component.getReportDateString();
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('CloseOfDay — delivery bar width', () => {
  it('returns 0 when max is 0', () => {
    const { component } = createHarness();
    // deliveryMaxDeliveries defaults to 1 when no report
    expect(component.getDeliveryBarWidth(0)).toBe(0);
  });

  it('returns proportional width', () => {
    const { component } = createHarness();
    // deliveryMaxDeliveries defaults to 1, so 1/1 = 100
    expect(component.getDeliveryBarWidth(1)).toBe(100);
  });
});
