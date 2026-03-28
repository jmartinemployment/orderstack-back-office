import { describe, it, expect } from 'vitest';
import type {
  Order,
  GuestOrderStatus,
  FulfillmentStatus,
  CourseFireStatus,
  OrderTemplate,
  OrderTemplateItem,
} from '@models/order.model';
import type { DiningOptionType } from '@models/dining-option.model';

// --- Pure function replicas from OrderService ---

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

function mapGuestToBackendStatus(status: GuestOrderStatus): string {
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

function mapItemFulfillmentStatus(
  rawItemStatus: unknown,
  fallback: FulfillmentStatus,
  hasCourse: boolean,
): FulfillmentStatus {
  const normalized = String(rawItemStatus).toUpperCase();
  switch (normalized) {
    case 'NEW':
      return 'NEW';
    case 'HOLD':
      return 'HOLD';
    case 'SENT':
      return 'SENT';
    case 'ON_THE_FLY':
      return 'ON_THE_FLY';
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
  switch (String(rawStatus).toUpperCase()) {
    case 'FIRED':
      return 'FIRED';
    case 'READY':
      return 'READY';
    case 'PENDING':
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
    case 'PENDING':
    default:
      return 0;
  }
}

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
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

// Computed signal replicas
function filterByStatus(orders: Partial<Order>[], status: GuestOrderStatus): Partial<Order>[] {
  return orders.filter(o => o.guestOrderStatus === status);
}

function activeOrderCount(orders: Partial<Order>[]): number {
  return orders.filter(o =>
    o.guestOrderStatus !== 'CLOSED' && o.guestOrderStatus !== 'VOIDED',
  ).length;
}

function queueStatus(
  isSyncing: boolean,
  queuedOrders: { retryCount: number }[],
): 'idle' | 'syncing' | 'has-failed' {
  if (isSyncing) return 'syncing';
  const failed = queuedOrders.filter(q => q.retryCount >= 5);
  if (failed.length > 0) return 'has-failed';
  return 'idle';
}

function applyOrderTemplate(
  templates: OrderTemplate[],
  templateId: string,
): OrderTemplateItem[] {
  const template = templates.find(t => t.id === templateId);
  return template?.items ?? [];
}

// --- Tests ---

describe('OrderService — mapBackendToGuestStatus', () => {
  it('maps pending to RECEIVED', () => {
    expect(mapBackendToGuestStatus('pending')).toBe('RECEIVED');
  });

  it('maps confirmed to RECEIVED', () => {
    expect(mapBackendToGuestStatus('confirmed')).toBe('RECEIVED');
  });

  it('maps preparing to IN_PREPARATION', () => {
    expect(mapBackendToGuestStatus('preparing')).toBe('IN_PREPARATION');
  });

  it('maps ready to READY_FOR_PICKUP', () => {
    expect(mapBackendToGuestStatus('ready')).toBe('READY_FOR_PICKUP');
  });

  it('maps completed to CLOSED', () => {
    expect(mapBackendToGuestStatus('completed')).toBe('CLOSED');
  });

  it('maps cancelled to VOIDED', () => {
    expect(mapBackendToGuestStatus('cancelled')).toBe('VOIDED');
  });

  it('defaults unknown to RECEIVED', () => {
    expect(mapBackendToGuestStatus('unknown')).toBe('RECEIVED');
    expect(mapBackendToGuestStatus('')).toBe('RECEIVED');
  });
});

describe('OrderService — mapGuestToBackendStatus', () => {
  it('maps RECEIVED to confirmed', () => {
    expect(mapGuestToBackendStatus('RECEIVED')).toBe('confirmed');
  });

  it('maps IN_PREPARATION to preparing', () => {
    expect(mapGuestToBackendStatus('IN_PREPARATION')).toBe('preparing');
  });

  it('maps READY_FOR_PICKUP to ready', () => {
    expect(mapGuestToBackendStatus('READY_FOR_PICKUP')).toBe('ready');
  });

  it('maps CLOSED to completed', () => {
    expect(mapGuestToBackendStatus('CLOSED')).toBe('completed');
  });

  it('maps VOIDED to cancelled', () => {
    expect(mapGuestToBackendStatus('VOIDED')).toBe('cancelled');
  });
});

describe('OrderService — mapBackendPaymentStatus', () => {
  it('maps paid to PAID', () => {
    expect(mapBackendPaymentStatus('paid')).toBe('PAID');
  });

  it('maps refunded to CLOSED', () => {
    expect(mapBackendPaymentStatus('refunded')).toBe('CLOSED');
  });

  it('maps failed to OPEN', () => {
    expect(mapBackendPaymentStatus('failed')).toBe('OPEN');
  });

  it('maps pending to OPEN', () => {
    expect(mapBackendPaymentStatus('pending')).toBe('OPEN');
  });

  it('defaults unknown to OPEN', () => {
    expect(mapBackendPaymentStatus('unknown')).toBe('OPEN');
  });
});

describe('OrderService — deriveFulfillmentStatus', () => {
  it('returns SENT for preparing', () => {
    expect(deriveFulfillmentStatus('preparing')).toBe('SENT');
  });

  it('returns SENT for ready', () => {
    expect(deriveFulfillmentStatus('ready')).toBe('SENT');
  });

  it('returns SENT for completed', () => {
    expect(deriveFulfillmentStatus('completed')).toBe('SENT');
  });

  it('returns NEW for pending', () => {
    expect(deriveFulfillmentStatus('pending')).toBe('NEW');
  });

  it('returns NEW for unknown', () => {
    expect(deriveFulfillmentStatus('unknown')).toBe('NEW');
  });
});

describe('OrderService — mapItemFulfillmentStatus', () => {
  it('maps NEW directly', () => {
    expect(mapItemFulfillmentStatus('NEW', 'SENT', false)).toBe('NEW');
  });

  it('maps HOLD directly', () => {
    expect(mapItemFulfillmentStatus('HOLD', 'SENT', false)).toBe('HOLD');
  });

  it('maps SENT directly', () => {
    expect(mapItemFulfillmentStatus('SENT', 'NEW', false)).toBe('SENT');
  });

  it('maps ON_THE_FLY directly', () => {
    expect(mapItemFulfillmentStatus('ON_THE_FLY', 'NEW', false)).toBe('ON_THE_FLY');
  });

  it('maps PENDING to HOLD when has course', () => {
    expect(mapItemFulfillmentStatus('PENDING', 'SENT', true)).toBe('HOLD');
  });

  it('maps PENDING to NEW when no course', () => {
    expect(mapItemFulfillmentStatus('PENDING', 'SENT', false)).toBe('NEW');
  });

  it('maps PREPARING to SENT', () => {
    expect(mapItemFulfillmentStatus('PREPARING', 'NEW', false)).toBe('SENT');
  });

  it('maps COMPLETED to SENT', () => {
    expect(mapItemFulfillmentStatus('COMPLETED', 'NEW', false)).toBe('SENT');
  });

  it('uses fallback for unknown without course', () => {
    expect(mapItemFulfillmentStatus('UNKNOWN', 'SENT', false)).toBe('SENT');
  });

  it('uses HOLD for unknown with course', () => {
    expect(mapItemFulfillmentStatus('UNKNOWN', 'SENT', true)).toBe('HOLD');
  });

  it('handles null/undefined as empty string', () => {
    expect(mapItemFulfillmentStatus(null, 'NEW', false)).toBe('NEW');
    expect(mapItemFulfillmentStatus(undefined, 'SENT', false)).toBe('SENT');
  });

  it('is case-insensitive', () => {
    expect(mapItemFulfillmentStatus('new', 'SENT', false)).toBe('NEW');
    expect(mapItemFulfillmentStatus('hold', 'SENT', false)).toBe('HOLD');
    expect(mapItemFulfillmentStatus('sent', 'NEW', false)).toBe('SENT');
  });
});

describe('OrderService — mapCourseFireStatus', () => {
  it('maps FIRED', () => {
    expect(mapCourseFireStatus('FIRED')).toBe('FIRED');
  });

  it('maps READY', () => {
    expect(mapCourseFireStatus('READY')).toBe('READY');
  });

  it('maps PENDING', () => {
    expect(mapCourseFireStatus('PENDING')).toBe('PENDING');
  });

  it('defaults to PENDING for unknown', () => {
    expect(mapCourseFireStatus('unknown')).toBe('PENDING');
  });

  it('handles null/undefined', () => {
    expect(mapCourseFireStatus(null)).toBe('PENDING');
    expect(mapCourseFireStatus(undefined)).toBe('PENDING');
  });

  it('is case-insensitive', () => {
    expect(mapCourseFireStatus('fired')).toBe('FIRED');
    expect(mapCourseFireStatus('ready')).toBe('READY');
  });
});

describe('OrderService — courseFireStatusRank', () => {
  it('READY has highest rank', () => {
    expect(courseFireStatusRank('READY')).toBe(2);
  });

  it('FIRED has middle rank', () => {
    expect(courseFireStatusRank('FIRED')).toBe(1);
  });

  it('PENDING has lowest rank', () => {
    expect(courseFireStatusRank('PENDING')).toBe(0);
  });

  it('READY > FIRED > PENDING', () => {
    expect(courseFireStatusRank('READY')).toBeGreaterThan(courseFireStatusRank('FIRED'));
    expect(courseFireStatusRank('FIRED')).toBeGreaterThan(courseFireStatusRank('PENDING'));
  });
});

describe('OrderService — parseDate', () => {
  it('parses valid ISO date string', () => {
    const result = parseDate('2026-02-25T12:00:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result!.toISOString()).toBe('2026-02-25T12:00:00.000Z');
  });

  it('returns undefined for null', () => {
    expect(parseDate(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(parseDate(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(parseDate('')).toBeUndefined();
  });

  it('returns undefined for invalid date string', () => {
    expect(parseDate('not-a-date')).toBeUndefined();
  });

  it('returns undefined for raw numeric timestamp (String coercion)', () => {
    // parseDate uses String(value), so a raw number becomes "1740484800000"
    // which is not a valid Date constructor argument
    const ts = 1740484800000;
    const result = parseDate(ts);
    expect(result).toBeUndefined();
  });
});

describe('OrderService — mapOrderType', () => {
  it('maps pickup to takeout', () => {
    expect(mapOrderType('pickup')).toBe('takeout');
  });

  it('maps delivery to delivery', () => {
    expect(mapOrderType('delivery')).toBe('delivery');
  });

  it('maps dine-in to dine-in', () => {
    expect(mapOrderType('dine-in')).toBe('dine-in');
  });

  it('maps curbside to curbside', () => {
    expect(mapOrderType('curbside')).toBe('curbside');
  });

  it('maps catering to catering', () => {
    expect(mapOrderType('catering')).toBe('catering');
  });

  it('defaults unknown to dine-in', () => {
    expect(mapOrderType('unknown')).toBe('dine-in');
    expect(mapOrderType('')).toBe('dine-in');
  });
});

describe('OrderService — filterByStatus (computed signal logic)', () => {
  const orders: Partial<Order>[] = [
    { guid: 'o-1', guestOrderStatus: 'RECEIVED' },
    { guid: 'o-2', guestOrderStatus: 'IN_PREPARATION' },
    { guid: 'o-3', guestOrderStatus: 'READY_FOR_PICKUP' },
    { guid: 'o-4', guestOrderStatus: 'CLOSED' },
    { guid: 'o-5', guestOrderStatus: 'VOIDED' },
    { guid: 'o-6', guestOrderStatus: 'RECEIVED' },
  ];

  it('filters pending (RECEIVED)', () => {
    expect(filterByStatus(orders, 'RECEIVED')).toHaveLength(2);
  });

  it('filters preparing', () => {
    expect(filterByStatus(orders, 'IN_PREPARATION')).toHaveLength(1);
  });

  it('filters ready', () => {
    expect(filterByStatus(orders, 'READY_FOR_PICKUP')).toHaveLength(1);
  });

  it('filters completed', () => {
    expect(filterByStatus(orders, 'CLOSED')).toHaveLength(1);
  });

  it('filters voided', () => {
    expect(filterByStatus(orders, 'VOIDED')).toHaveLength(1);
  });

  it('returns empty for no matches', () => {
    expect(filterByStatus([], 'RECEIVED')).toHaveLength(0);
  });
});

describe('OrderService — activeOrderCount', () => {
  it('excludes CLOSED and VOIDED', () => {
    const orders: Partial<Order>[] = [
      { guestOrderStatus: 'RECEIVED' },
      { guestOrderStatus: 'IN_PREPARATION' },
      { guestOrderStatus: 'READY_FOR_PICKUP' },
      { guestOrderStatus: 'CLOSED' },
      { guestOrderStatus: 'VOIDED' },
    ];
    expect(activeOrderCount(orders)).toBe(3);
  });

  it('returns 0 for empty', () => {
    expect(activeOrderCount([])).toBe(0);
  });

  it('returns 0 when all closed/voided', () => {
    const orders: Partial<Order>[] = [
      { guestOrderStatus: 'CLOSED' },
      { guestOrderStatus: 'VOIDED' },
    ];
    expect(activeOrderCount(orders)).toBe(0);
  });
});

describe('OrderService — queueStatus', () => {
  it('returns syncing when syncing', () => {
    expect(queueStatus(true, [])).toBe('syncing');
  });

  it('returns has-failed when retries exhausted', () => {
    expect(queueStatus(false, [{ retryCount: 5 }])).toBe('has-failed');
  });

  it('returns idle for empty queue', () => {
    expect(queueStatus(false, [])).toBe('idle');
  });

  it('returns idle when queue has pending items under retry limit', () => {
    expect(queueStatus(false, [{ retryCount: 2 }])).toBe('idle');
  });

  it('syncing takes priority over has-failed', () => {
    expect(queueStatus(true, [{ retryCount: 10 }])).toBe('syncing');
  });
});

describe('OrderService — applyOrderTemplate', () => {
  const templateItems: OrderTemplateItem[] = [
    { menuItemId: 'mi-1', quantity: 2, modifiers: ['mod-a'] },
    { menuItemId: 'mi-2', quantity: 1, modifiers: [] },
  ];

  const templates: OrderTemplate[] = [
    {
      id: 'tmpl-1',
      merchantId: 'r-1',
      name: 'Lunch Special',
      items: templateItems,
      createdBy: 'admin',
      createdAt: '2026-02-23T10:00:00Z',
    },
  ];

  it('returns items for matching template', () => {
    const result = applyOrderTemplate(templates, 'tmpl-1');
    expect(result).toEqual(templateItems);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for unknown template', () => {
    expect(applyOrderTemplate(templates, 'nonexistent')).toEqual([]);
  });

  it('returns empty array from empty templates list', () => {
    expect(applyOrderTemplate([], 'tmpl-1')).toEqual([]);
  });

  it('matches correct template among multiple', () => {
    const moreTemplates: OrderTemplate[] = [
      ...templates,
      {
        id: 'tmpl-2',
        merchantId: 'r-1',
        name: 'Dinner Special',
        items: [{ menuItemId: 'mi-3', quantity: 1, modifiers: [] }],
        createdBy: 'admin',
        createdAt: '2026-02-23T12:00:00Z',
      },
    ];
    const result = applyOrderTemplate(moreTemplates, 'tmpl-2');
    expect(result).toHaveLength(1);
    expect(result[0].menuItemId).toBe('mi-3');
  });
});
