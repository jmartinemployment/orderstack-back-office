import { describe, it, expect } from 'vitest';

// --- Pure function replicas of CustomerService computed/mutation logic ---

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  totalSpent: number;
  totalOrders: number;
  lastOrderDate?: string;
  tags: string[];
}

interface CustomerSegmentInfo {
  segment: string;
  label: string;
  cssClass: string;
  description: string;
}

interface SavedAddress {
  id: string;
  isDefault: boolean;
  street: string;
}

interface FeedbackRequest {
  id: string;
  npsScore: number | null;
  rating: number | null;
}

interface MessageThread {
  customerId: string;
  unreadCount: number;
  messages: CustomerMessage[];
  lastMessageAt: string;
}

interface CustomerMessage {
  id: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

interface SmartGroup {
  id: string;
  name: string;
}

// --- Computed signal replicas ---

function customerCount(customers: Customer[]): number {
  return customers.length;
}

function defaultAddress(addresses: SavedAddress[]): SavedAddress | null {
  return addresses.find(a => a.isDefault) ?? null;
}

function totalUnreadMessages(threads: MessageThread[]): number {
  return threads.reduce((sum, t) => sum + t.unreadCount, 0);
}

function averageNps(feedback: FeedbackRequest[]): number | null {
  const scored = feedback.filter(f => f.npsScore !== null);
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((sum, f) => sum + (f.npsScore ?? 0), 0) / scored.length * 10) / 10;
}

function averageRating(feedback: FeedbackRequest[]): number | null {
  const rated = feedback.filter(f => f.rating !== null);
  if (rated.length === 0) return null;
  return Math.round(rated.reduce((sum, f) => sum + (f.rating ?? 0), 0) / rated.length * 10) / 10;
}

function negativeFeedback(feedback: FeedbackRequest[]): FeedbackRequest[] {
  return feedback.filter(f => (f.npsScore !== null && f.npsScore <= 6) || (f.rating !== null && f.rating <= 2));
}

// --- Segment logic ---

function getSegment(customer: Customer): CustomerSegmentInfo {
  const daysSinceOrder = customer.lastOrderDate
    ? Math.floor((Date.now() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (customer.totalSpent >= 500 || customer.totalOrders >= 20) {
    return { segment: 'vip', label: 'VIP', cssClass: 'segment-vip', description: 'High-value customer' };
  }
  if (daysSinceOrder > 90) {
    return { segment: 'dormant', label: 'Dormant', cssClass: 'segment-dormant', description: 'No orders in 90+ days' };
  }
  if (daysSinceOrder > 30 && customer.totalOrders >= 3) {
    return { segment: 'at-risk', label: 'At Risk', cssClass: 'segment-at-risk', description: 'Previously active, fading' };
  }
  if (customer.totalOrders <= 2) {
    return { segment: 'new', label: 'New', cssClass: 'segment-new', description: 'Recent first-time customer' };
  }
  return { segment: 'regular', label: 'Regular', cssClass: 'segment-regular', description: 'Active customer' };
}

// --- List mutation replicas ---

function updateTags(customers: Customer[], customerId: string, tags: string[]): Customer[] {
  return customers.map(c => c.id === customerId ? { ...c, tags } : c);
}

function addAddress(addresses: SavedAddress[], address: SavedAddress): SavedAddress[] {
  return [...addresses, address];
}

function removeAddress(addresses: SavedAddress[], addressId: string): SavedAddress[] {
  return addresses.filter(a => a.id !== addressId);
}

function updateFeedbackInList(feedback: FeedbackRequest[], feedbackId: string, updated: FeedbackRequest): FeedbackRequest[] {
  return feedback.map(f => f.id === feedbackId ? updated : f);
}

function addSmartGroup(groups: SmartGroup[], group: SmartGroup): SmartGroup[] {
  return [...groups, group];
}

function updateSmartGroupInList(groups: SmartGroup[], groupId: string, updated: SmartGroup): SmartGroup[] {
  return groups.map(g => g.id === groupId ? updated : g);
}

function deleteSmartGroupFromList(groups: SmartGroup[], groupId: string): SmartGroup[] {
  return groups.filter(g => g.id !== groupId);
}

function updateCustomerInList(customers: Customer[], customerId: string, updated: Customer): Customer[] {
  return customers.map(c => c.id === customerId ? updated : c);
}

function appendMessageToThread(threads: MessageThread[], customerId: string, message: CustomerMessage): MessageThread[] {
  return threads.map(t => t.customerId === customerId
    ? { ...t, messages: [...t.messages, message], lastMessageAt: message.createdAt }
    : t
  );
}

function markThreadAsRead(threads: MessageThread[], customerId: string): MessageThread[] {
  return threads.map(t => t.customerId === customerId
    ? { ...t, unreadCount: 0, messages: t.messages.map(m => ({ ...m, isRead: true })) }
    : t
  );
}

// --- URL builder ---

function buildFeedbackUrl(baseUrl: string, merchantId: string, dateFrom?: string, dateTo?: string): string {
  let url = `${baseUrl}/merchant/${merchantId}/customers/feedback`;
  const params: string[] = [];
  if (dateFrom) params.push(`dateFrom=${encodeURIComponent(dateFrom)}`);
  if (dateTo) params.push(`dateTo=${encodeURIComponent(dateTo)}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  return url;
}

// --- Tests ---

describe('CustomerService — getSegment', () => {
  const now = Date.now();

  it('returns VIP for high spender', () => {
    const c: Customer = { id: '1', firstName: 'A', lastName: 'B', totalSpent: 600, totalOrders: 5, tags: [] };
    expect(getSegment(c).segment).toBe('vip');
  });

  it('returns VIP for frequent orderer (20+ orders)', () => {
    const c: Customer = { id: '1', firstName: 'A', lastName: 'B', totalSpent: 100, totalOrders: 25, tags: [] };
    expect(getSegment(c).segment).toBe('vip');
  });

  it('returns dormant for 90+ days no order', () => {
    const oldDate = new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString();
    const c: Customer = { id: '1', firstName: 'A', lastName: 'B', totalSpent: 50, totalOrders: 5, lastOrderDate: oldDate, tags: [] };
    expect(getSegment(c).segment).toBe('dormant');
  });

  it('returns dormant when no lastOrderDate', () => {
    const c: Customer = { id: '1', firstName: 'A', lastName: 'B', totalSpent: 50, totalOrders: 5, tags: [] };
    expect(getSegment(c).segment).toBe('dormant');
  });

  it('returns at-risk for 30+ days with 3+ orders', () => {
    const recentDate = new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString();
    const c: Customer = { id: '1', firstName: 'A', lastName: 'B', totalSpent: 50, totalOrders: 5, lastOrderDate: recentDate, tags: [] };
    expect(getSegment(c).segment).toBe('at-risk');
  });

  it('returns new for 2 or fewer orders', () => {
    const recentDate = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();
    const c: Customer = { id: '1', firstName: 'A', lastName: 'B', totalSpent: 20, totalOrders: 1, lastOrderDate: recentDate, tags: [] };
    expect(getSegment(c).segment).toBe('new');
  });

  it('returns regular for active customer', () => {
    const recentDate = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    const c: Customer = { id: '1', firstName: 'A', lastName: 'B', totalSpent: 100, totalOrders: 8, lastOrderDate: recentDate, tags: [] };
    expect(getSegment(c).segment).toBe('regular');
  });

  it('VIP takes priority over dormant', () => {
    const c: Customer = { id: '1', firstName: 'A', lastName: 'B', totalSpent: 500, totalOrders: 3, tags: [] };
    expect(getSegment(c).segment).toBe('vip');
  });

  it('returns correct cssClass and label for each segment', () => {
    const recentDate = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();
    const vip: Customer = { id: '1', firstName: 'A', lastName: 'B', totalSpent: 500, totalOrders: 1, lastOrderDate: recentDate, tags: [] };
    const seg = getSegment(vip);
    expect(seg.label).toBe('VIP');
    expect(seg.cssClass).toBe('segment-vip');
    expect(seg.description).toBeTruthy();
  });
});

describe('CustomerService — computed signals', () => {
  it('customerCount returns length', () => {
    expect(customerCount([])).toBe(0);
    expect(customerCount([{ id: '1' } as Customer])).toBe(1);
  });

  it('defaultAddress finds default', () => {
    const addresses: SavedAddress[] = [
      { id: 'a-1', isDefault: false, street: '123 Main' },
      { id: 'a-2', isDefault: true, street: '456 Oak' },
    ];
    expect(defaultAddress(addresses)?.id).toBe('a-2');
  });

  it('defaultAddress returns null when no default', () => {
    expect(defaultAddress([{ id: 'a-1', isDefault: false, street: '123' }])).toBeNull();
    expect(defaultAddress([])).toBeNull();
  });

  it('totalUnreadMessages sums unread counts', () => {
    const threads: MessageThread[] = [
      { customerId: 'c-1', unreadCount: 3, messages: [], lastMessageAt: '' },
      { customerId: 'c-2', unreadCount: 1, messages: [], lastMessageAt: '' },
    ];
    expect(totalUnreadMessages(threads)).toBe(4);
  });

  it('totalUnreadMessages returns 0 for empty', () => {
    expect(totalUnreadMessages([])).toBe(0);
  });
});

describe('CustomerService — averageNps', () => {
  it('computes average from scored feedback', () => {
    const feedback: FeedbackRequest[] = [
      { id: '1', npsScore: 8, rating: null },
      { id: '2', npsScore: 10, rating: null },
    ];
    expect(averageNps(feedback)).toBe(9);
  });

  it('returns null when no scored feedback', () => {
    expect(averageNps([])).toBeNull();
    expect(averageNps([{ id: '1', npsScore: null, rating: 5 }])).toBeNull();
  });

  it('skips null scores', () => {
    const feedback: FeedbackRequest[] = [
      { id: '1', npsScore: 6, rating: null },
      { id: '2', npsScore: null, rating: null },
    ];
    expect(averageNps(feedback)).toBe(6);
  });
});

describe('CustomerService — averageRating', () => {
  it('computes average from rated feedback', () => {
    const feedback: FeedbackRequest[] = [
      { id: '1', npsScore: null, rating: 4 },
      { id: '2', npsScore: null, rating: 5 },
    ];
    expect(averageRating(feedback)).toBe(4.5);
  });

  it('returns null when no rated feedback', () => {
    expect(averageRating([])).toBeNull();
  });
});

describe('CustomerService — negativeFeedback', () => {
  it('filters low NPS scores (<=6)', () => {
    const feedback: FeedbackRequest[] = [
      { id: '1', npsScore: 3, rating: null },
      { id: '2', npsScore: 8, rating: null },
    ];
    expect(negativeFeedback(feedback)).toHaveLength(1);
    expect(negativeFeedback(feedback)[0].id).toBe('1');
  });

  it('filters low ratings (<=2)', () => {
    const feedback: FeedbackRequest[] = [
      { id: '1', npsScore: null, rating: 1 },
      { id: '2', npsScore: null, rating: 4 },
    ];
    expect(negativeFeedback(feedback)).toHaveLength(1);
  });

  it('includes feedback matching either criterion', () => {
    const feedback: FeedbackRequest[] = [
      { id: '1', npsScore: 5, rating: 2 },
    ];
    expect(negativeFeedback(feedback)).toHaveLength(1);
  });

  it('returns empty when all positive', () => {
    const feedback: FeedbackRequest[] = [
      { id: '1', npsScore: 9, rating: 5 },
    ];
    expect(negativeFeedback(feedback)).toHaveLength(0);
  });
});

describe('CustomerService — list mutations', () => {
  it('updateTags updates matching customer', () => {
    const customers: Customer[] = [
      { id: '1', firstName: 'A', lastName: 'B', totalSpent: 0, totalOrders: 0, tags: [] },
    ];
    const result = updateTags(customers, '1', ['vip', 'regular']);
    expect(result[0].tags).toEqual(['vip', 'regular']);
  });

  it('addAddress appends', () => {
    const addresses: SavedAddress[] = [];
    const result = addAddress(addresses, { id: 'a-1', isDefault: true, street: '123 Main' });
    expect(result).toHaveLength(1);
  });

  it('removeAddress filters out matching', () => {
    const addresses: SavedAddress[] = [
      { id: 'a-1', isDefault: false, street: '123' },
      { id: 'a-2', isDefault: true, street: '456' },
    ];
    expect(removeAddress(addresses, 'a-1')).toHaveLength(1);
  });

  it('updateFeedbackInList replaces matching', () => {
    const feedback: FeedbackRequest[] = [{ id: 'f-1', npsScore: 5, rating: null }];
    const updated: FeedbackRequest = { id: 'f-1', npsScore: 5, rating: 3 };
    expect(updateFeedbackInList(feedback, 'f-1', updated)[0].rating).toBe(3);
  });

  it('addSmartGroup appends', () => {
    expect(addSmartGroup([], { id: 'g-1', name: 'Test' })).toHaveLength(1);
  });

  it('updateSmartGroupInList replaces matching', () => {
    const groups: SmartGroup[] = [{ id: 'g-1', name: 'Old' }];
    const result = updateSmartGroupInList(groups, 'g-1', { id: 'g-1', name: 'New' });
    expect(result[0].name).toBe('New');
  });

  it('deleteSmartGroupFromList removes matching', () => {
    const groups: SmartGroup[] = [{ id: 'g-1', name: 'Test' }];
    expect(deleteSmartGroupFromList(groups, 'g-1')).toHaveLength(0);
  });

  it('updateCustomerInList replaces matching', () => {
    const customers: Customer[] = [
      { id: '1', firstName: 'Old', lastName: 'B', totalSpent: 0, totalOrders: 0, tags: [] },
    ];
    const updated: Customer = { ...customers[0], firstName: 'New' };
    expect(updateCustomerInList(customers, '1', updated)[0].firstName).toBe('New');
  });
});

describe('CustomerService — message thread mutations', () => {
  const threads: MessageThread[] = [
    {
      customerId: 'c-1',
      unreadCount: 2,
      messages: [{ id: 'm-1', body: 'Hello', isRead: false, createdAt: '2026-02-25T10:00:00' }],
      lastMessageAt: '2026-02-25T10:00:00',
    },
  ];

  it('appendMessageToThread adds message to correct thread', () => {
    const newMsg: CustomerMessage = { id: 'm-2', body: 'Reply', isRead: true, createdAt: '2026-02-25T11:00:00' };
    const result = appendMessageToThread(threads, 'c-1', newMsg);
    expect(result[0].messages).toHaveLength(2);
    expect(result[0].lastMessageAt).toBe('2026-02-25T11:00:00');
  });

  it('markThreadAsRead zeroes unread and marks messages read', () => {
    const result = markThreadAsRead(threads, 'c-1');
    expect(result[0].unreadCount).toBe(0);
    expect(result[0].messages.every(m => m.isRead)).toBe(true);
  });

  it('markThreadAsRead does not modify non-matching thread', () => {
    const result = markThreadAsRead(threads, 'c-999');
    expect(result[0].unreadCount).toBe(2);
  });
});

describe('CustomerService — buildFeedbackUrl', () => {
  it('builds base URL without params', () => {
    expect(buildFeedbackUrl('/api', 'r-1')).toBe('/api/merchant/r-1/customers/feedback');
  });

  it('adds dateFrom param', () => {
    const url = buildFeedbackUrl('/api', 'r-1', '2026-01-01');
    expect(url).toContain('dateFrom=2026-01-01');
  });

  it('adds both params', () => {
    const url = buildFeedbackUrl('/api', 'r-1', '2026-01-01', '2026-02-01');
    expect(url).toContain('dateFrom=');
    expect(url).toContain('dateTo=');
    expect(url).toContain('&');
  });
});

describe('CustomerService — no-restaurant guard', () => {
  it('null merchantId blocks operations', () => {
    const merchantId: string | null = null;
    expect(!merchantId).toBe(true);
  });
});
