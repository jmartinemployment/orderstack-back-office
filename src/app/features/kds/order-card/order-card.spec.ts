import '../../../../test-setup';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { OrderCard } from './order-card';
import type { Order, GuestOrderStatus } from '../../../models/order.model';
import type { OrderSentimentRecord } from '../../../models/sentiment.model';
import { getDiningOption } from '../../../models/dining-option.model';
import { SentimentAlertService } from '../../../services/sentiment-alert';

function createOrder(status: GuestOrderStatus): Order {
  const now = new Date();
  return {
    guid: 'order-1',
    merchantId: 'r-1',
    orderNumber: '1001',
    guestOrderStatus: status,
    server: { guid: 'srv-1', name: 'Server', entityType: 'RestaurantUser' },
    device: { guid: 'dev-1', name: 'POS' },
    diningOption: getDiningOption('dine-in'),
    diningOptionType: 'dine-in',
    checks: [{
      guid: 'check-1',
      displayNumber: '1',
      selections: [
        {
          guid: 'sel-1',
          menuItemGuid: 'mi-1',
          menuItemName: 'Burger',
          quantity: 1,
          unitPrice: 12,
          totalPrice: 12,
          fulfillmentStatus: 'SENT',
          modifiers: [],
        },
      ],
      payments: [],
      paymentStatus: 'OPEN',
      subtotal: 12,
      taxAmount: 1,
      tipAmount: 0,
      totalAmount: 13,
      discounts: [],
      voidedSelections: [],
    }],
    subtotal: 12,
    taxAmount: 1,
    tipAmount: 0,
    totalAmount: 13,
    timestamps: { createdDate: now, lastModifiedDate: now },
  };
}

const mockSentimentAlerts = {
  alerts: signal<OrderSentimentRecord[]>([]),
};

function createCardFixture(status: GuestOrderStatus) {
  TestBed.configureTestingModule({
    providers: [
      { provide: SentimentAlertService, useValue: mockSentimentAlerts },
    ],
  });
  const fixture = TestBed.createComponent(OrderCard);
  fixture.componentRef.setInput('order', createOrder(status));
  const comp = fixture.componentInstance;

  const remakeEvents: { orderId: string; checkGuid: string; selectionGuid: string }[] = [];
  comp.remakeItem.subscribe((e: { orderId: string; checkGuid: string; selectionGuid: string }) => remakeEvents.push(e));

  comp.ngOnInit();
  return { component: comp, remakeEvents, fixture };
}

describe('OrderCard — canRemake', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('is true when status is IN_PREPARATION', () => {
    const { component, fixture } = createCardFixture('IN_PREPARATION');
    expect(component.canRemake()).toBe(true);
    fixture.destroy();
  });

  it('is true when status is READY_FOR_PICKUP', () => {
    const { component, fixture } = createCardFixture('READY_FOR_PICKUP');
    expect(component.canRemake()).toBe(true);
    fixture.destroy();
  });

  it('is false for RECEIVED status', () => {
    const { component, fixture } = createCardFixture('RECEIVED');
    expect(component.canRemake()).toBe(false);
    fixture.destroy();
  });

  it('is false for CLOSED status', () => {
    const { component, fixture } = createCardFixture('CLOSED');
    expect(component.canRemake()).toBe(false);
    fixture.destroy();
  });
});

describe('OrderCard — onRemakeItem', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('first tap sets confirm guid', () => {
    const { component, fixture } = createCardFixture('IN_PREPARATION');
    component.onRemakeItem('sel-1');
    expect(component.remakeConfirmGuid()).toBe('sel-1');
    fixture.destroy();
  });

  it('second tap emits remakeItem and clears confirm guid', () => {
    const { component, remakeEvents, fixture } = createCardFixture('IN_PREPARATION');
    component.onRemakeItem('sel-1'); // first tap
    component.onRemakeItem('sel-1'); // second tap

    expect(remakeEvents).toHaveLength(1);
    expect(remakeEvents[0]).toEqual({
      orderId: 'order-1',
      checkGuid: 'check-1',
      selectionGuid: 'sel-1',
    });
    expect(component.remakeConfirmGuid()).toBeNull();
    fixture.destroy();
  });

  it('auto-resets confirm guid after 3s timeout', () => {
    vi.useFakeTimers();
    const { component, fixture } = createCardFixture('IN_PREPARATION');

    component.onRemakeItem('sel-1');
    expect(component.remakeConfirmGuid()).toBe('sel-1');

    vi.advanceTimersByTime(3000);
    expect(component.remakeConfirmGuid()).toBeNull();

    vi.useRealTimers();
    fixture.destroy();
  });

  it('switching guid replaces confirm target', () => {
    const { component, fixture } = createCardFixture('IN_PREPARATION');
    component.onRemakeItem('sel-1');
    expect(component.remakeConfirmGuid()).toBe('sel-1');

    component.onRemakeItem('sel-2');
    expect(component.remakeConfirmGuid()).toBe('sel-2');
    fixture.destroy();
  });
});

describe('OrderCard — sentimentAlert', () => {
  afterEach(() => {
    mockSentimentAlerts.alerts.set([]);
    TestBed.resetTestingModule();
  });

  function makeAlert(overrides: Partial<OrderSentimentRecord> = {}): OrderSentimentRecord {
    return {
      id: 'alert-1',
      orderId: 'order-1',
      orderNumber: '1001',
      sentiment: 'negative',
      flags: [],
      urgency: 'medium',
      summary: 'Customer unhappy',
      analyzedAt: new Date().toISOString(),
      isRead: false,
      ...overrides,
    };
  }

  it('returns null when there are no alerts', () => {
    const { component, fixture } = createCardFixture('IN_PREPARATION');
    expect(component.sentimentAlert()).toBeNull();
    fixture.destroy();
  });

  it('returns null when alert has a different orderId', () => {
    mockSentimentAlerts.alerts.set([makeAlert({ orderId: 'order-999' })]);
    const { component, fixture } = createCardFixture('IN_PREPARATION');
    expect(component.sentimentAlert()).toBeNull();
    fixture.destroy();
  });

  it('returns the matching alert when orderId matches order.guid', () => {
    const alert = makeAlert({ orderId: 'order-1' });
    mockSentimentAlerts.alerts.set([alert]);
    const { component, fixture } = createCardFixture('IN_PREPARATION');
    expect(component.sentimentAlert()).toEqual(alert);
    fixture.destroy();
  });

  it('includes allergy flag when alert has flags: ["allergy"]', () => {
    mockSentimentAlerts.alerts.set([makeAlert({ orderId: 'order-1', flags: ['allergy'] })]);
    const { component, fixture } = createCardFixture('IN_PREPARATION');
    const result = component.sentimentAlert();
    expect(result).not.toBeNull();
    expect(result!.flags.includes('allergy')).toBe(true);
    fixture.destroy();
  });

  it('returns critical urgency when alert has urgency: "critical"', () => {
    mockSentimentAlerts.alerts.set([makeAlert({ orderId: 'order-1', urgency: 'critical' })]);
    const { component, fixture } = createCardFixture('IN_PREPARATION');
    const result = component.sentimentAlert();
    expect(result).not.toBeNull();
    expect(result!.urgency).toBe('critical');
    fixture.destroy();
  });
});
