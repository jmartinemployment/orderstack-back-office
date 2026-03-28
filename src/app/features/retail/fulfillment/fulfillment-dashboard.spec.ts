import { describe, it, expect } from 'vitest';
import type {
  EcommerceOrder,
  EcommerceFulfillmentStatus,
  FulfillmentDashboardTab,
} from '@models/retail-ecommerce.model';

// --- Replicate FulfillmentDashboard pure logic for testing ---

function makeOrder(overrides: Partial<EcommerceOrder> = {}): EcommerceOrder {
  return {
    id: 'o-1',
    orderNumber: 'ORD-1001',
    merchantId: 'r-1',
    customerId: null,
    customerEmail: 'test@example.com',
    customerName: 'Test User',
    items: [],
    shippingAddress: null,
    shippingMethod: null,
    shippingCost: 0,
    fulfillmentType: 'pickup',
    fulfillmentStatus: 'pending',
    subtotal: 50,
    taxTotal: 3.5,
    discountTotal: 0,
    total: 53.5,
    trackingNumber: null,
    trackingUrl: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// KPI count logic from the component
function countByStatus(orders: EcommerceOrder[], statuses: EcommerceFulfillmentStatus[]): number {
  return orders.filter(o => statuses.includes(o.fulfillmentStatus)).length;
}

// Filtered orders logic from the component
function filterByTab(orders: EcommerceOrder[], tab: FulfillmentDashboardTab): EcommerceOrder[] {
  switch (tab) {
    case 'pending':
      return orders.filter(o => o.fulfillmentStatus === 'pending');
    case 'processing':
      return orders.filter(o => o.fulfillmentStatus === 'processing');
    case 'pickup':
      return orders.filter(o => o.fulfillmentStatus === 'ready_for_pickup');
    case 'shipped':
      return orders.filter(o => o.fulfillmentStatus === 'shipped' || o.fulfillmentStatus === 'out_for_delivery');
    case 'completed':
      return orders.filter(o => o.fulfillmentStatus === 'delivered' || o.fulfillmentStatus === 'cancelled');
    default:
      return orders;
  }
}

// getStatusLabel from the component
function getStatusLabel(status: EcommerceFulfillmentStatus): string {
  const labels: Record<EcommerceFulfillmentStatus, string> = {
    pending: 'Pending',
    processing: 'Processing',
    ready_for_pickup: 'Ready for Pickup',
    shipped: 'Shipped',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return labels[status] ?? status;
}

// getStatusClass from the component
function getStatusClass(status: EcommerceFulfillmentStatus): string {
  const classes: Record<EcommerceFulfillmentStatus, string> = {
    pending: 'badge-pending',
    processing: 'badge-processing',
    ready_for_pickup: 'badge-pickup',
    shipped: 'badge-shipped',
    out_for_delivery: 'badge-delivery',
    delivered: 'badge-delivered',
    cancelled: 'badge-cancelled',
  };
  return classes[status] ?? '';
}

// getFulfillmentIcon from the component
function getFulfillmentIcon(type: string): string {
  const icons: Record<string, string> = {
    ship: 'bi-truck',
    pickup: 'bi-shop',
    curbside: 'bi-car-front',
    local_delivery: 'bi-bicycle',
  };
  return icons[type] ?? 'bi-box';
}

// getFulfillmentLabel from the component
function getFulfillmentLabel(type: string): string {
  const labels: Record<string, string> = {
    ship: 'Ship',
    pickup: 'Pickup',
    curbside: 'Curbside',
    local_delivery: 'Local Delivery',
  };
  return labels[type] ?? type;
}

// getTimeSince from the component
function getTimeSince(dateStr: string, now: number): string {
  const then = new Date(dateStr).getTime();
  const minutes = Math.floor((now - then) / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// selectedOrder logic from the component
function findSelectedOrder(orders: EcommerceOrder[], selectedId: string | null): EcommerceOrder | null {
  if (!selectedId) return null;
  return orders.find(o => o.id === selectedId) ?? null;
}

// --- Tests ---

describe('FulfillmentDashboard logic', () => {
  const mixedOrders = [
    makeOrder({ id: '1', fulfillmentStatus: 'pending' }),
    makeOrder({ id: '2', fulfillmentStatus: 'pending' }),
    makeOrder({ id: '3', fulfillmentStatus: 'processing' }),
    makeOrder({ id: '4', fulfillmentStatus: 'ready_for_pickup' }),
    makeOrder({ id: '5', fulfillmentStatus: 'shipped' }),
    makeOrder({ id: '6', fulfillmentStatus: 'out_for_delivery' }),
    makeOrder({ id: '7', fulfillmentStatus: 'delivered' }),
    makeOrder({ id: '8', fulfillmentStatus: 'cancelled' }),
  ];

  describe('KPI counts', () => {
    it('should count pending orders', () => {
      expect(countByStatus(mixedOrders, ['pending'])).toBe(2);
    });

    it('should count processing orders', () => {
      expect(countByStatus(mixedOrders, ['processing'])).toBe(1);
    });

    it('should count ready_for_pickup orders', () => {
      expect(countByStatus(mixedOrders, ['ready_for_pickup'])).toBe(1);
    });

    it('should count shipped + out_for_delivery orders', () => {
      expect(countByStatus(mixedOrders, ['shipped', 'out_for_delivery'])).toBe(2);
    });

    it('should count delivered + cancelled orders', () => {
      expect(countByStatus(mixedOrders, ['delivered', 'cancelled'])).toBe(2);
    });

    it('should return 0 for empty orders', () => {
      expect(countByStatus([], ['pending'])).toBe(0);
    });
  });

  describe('filterByTab', () => {
    it('should filter pending tab', () => {
      const result = filterByTab(mixedOrders, 'pending');
      expect(result).toHaveLength(2);
      expect(result.every(o => o.fulfillmentStatus === 'pending')).toBe(true);
    });

    it('should filter processing tab', () => {
      const result = filterByTab(mixedOrders, 'processing');
      expect(result).toHaveLength(1);
      expect(result[0].fulfillmentStatus).toBe('processing');
    });

    it('should filter pickup tab', () => {
      const result = filterByTab(mixedOrders, 'pickup');
      expect(result).toHaveLength(1);
      expect(result[0].fulfillmentStatus).toBe('ready_for_pickup');
    });

    it('should filter shipped tab (includes out_for_delivery)', () => {
      const result = filterByTab(mixedOrders, 'shipped');
      expect(result).toHaveLength(2);
      expect(result.map(o => o.fulfillmentStatus)).toEqual(['shipped', 'out_for_delivery']);
    });

    it('should filter completed tab (includes delivered + cancelled)', () => {
      const result = filterByTab(mixedOrders, 'completed');
      expect(result).toHaveLength(2);
      expect(result.map(o => o.fulfillmentStatus)).toEqual(['delivered', 'cancelled']);
    });

    it('should return all for unknown tab', () => {
      const result = filterByTab(mixedOrders, 'unknown' as FulfillmentDashboardTab);
      expect(result).toHaveLength(8);
    });
  });

  describe('getStatusLabel', () => {
    it('should return correct label for each status', () => {
      expect(getStatusLabel('pending')).toBe('Pending');
      expect(getStatusLabel('processing')).toBe('Processing');
      expect(getStatusLabel('ready_for_pickup')).toBe('Ready for Pickup');
      expect(getStatusLabel('shipped')).toBe('Shipped');
      expect(getStatusLabel('out_for_delivery')).toBe('Out for Delivery');
      expect(getStatusLabel('delivered')).toBe('Delivered');
      expect(getStatusLabel('cancelled')).toBe('Cancelled');
    });
  });

  describe('getStatusClass', () => {
    it('should return correct CSS class for each status', () => {
      expect(getStatusClass('pending')).toBe('badge-pending');
      expect(getStatusClass('processing')).toBe('badge-processing');
      expect(getStatusClass('ready_for_pickup')).toBe('badge-pickup');
      expect(getStatusClass('shipped')).toBe('badge-shipped');
      expect(getStatusClass('out_for_delivery')).toBe('badge-delivery');
      expect(getStatusClass('delivered')).toBe('badge-delivered');
      expect(getStatusClass('cancelled')).toBe('badge-cancelled');
    });
  });

  describe('getFulfillmentIcon', () => {
    it('should return correct icon for each type', () => {
      expect(getFulfillmentIcon('ship')).toBe('bi-truck');
      expect(getFulfillmentIcon('pickup')).toBe('bi-shop');
      expect(getFulfillmentIcon('curbside')).toBe('bi-car-front');
      expect(getFulfillmentIcon('local_delivery')).toBe('bi-bicycle');
    });

    it('should return default icon for unknown type', () => {
      expect(getFulfillmentIcon('drone')).toBe('bi-box');
    });
  });

  describe('getFulfillmentLabel', () => {
    it('should return correct label for each type', () => {
      expect(getFulfillmentLabel('ship')).toBe('Ship');
      expect(getFulfillmentLabel('pickup')).toBe('Pickup');
      expect(getFulfillmentLabel('curbside')).toBe('Curbside');
      expect(getFulfillmentLabel('local_delivery')).toBe('Local Delivery');
    });

    it('should return raw type for unknown type', () => {
      expect(getFulfillmentLabel('teleport')).toBe('teleport');
    });
  });

  describe('getTimeSince', () => {
    it('should return minutes for recent times', () => {
      const now = new Date('2026-01-15T12:30:00Z').getTime();
      const tenMinutesAgo = '2026-01-15T12:20:00Z';
      expect(getTimeSince(tenMinutesAgo, now)).toBe('10m ago');
    });

    it('should return hours for older times', () => {
      const now = new Date('2026-01-15T15:00:00Z').getTime();
      const threeHoursAgo = '2026-01-15T12:00:00Z';
      expect(getTimeSince(threeHoursAgo, now)).toBe('3h ago');
    });

    it('should return days for much older times', () => {
      const now = new Date('2026-01-15T12:00:00Z').getTime();
      const twoDaysAgo = '2026-01-13T12:00:00Z';
      expect(getTimeSince(twoDaysAgo, now)).toBe('2d ago');
    });

    it('should return 0m ago for same time', () => {
      const now = new Date('2026-01-15T12:00:00Z').getTime();
      expect(getTimeSince('2026-01-15T12:00:00Z', now)).toBe('0m ago');
    });
  });

  describe('selectedOrder', () => {
    it('should return null when no order selected', () => {
      expect(findSelectedOrder(mixedOrders, null)).toBeNull();
    });

    it('should find the correct order by id', () => {
      const result = findSelectedOrder(mixedOrders, '3');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('3');
      expect(result!.fulfillmentStatus).toBe('processing');
    });

    it('should return null for non-existent id', () => {
      expect(findSelectedOrder(mixedOrders, 'non-existent')).toBeNull();
    });
  });
});
