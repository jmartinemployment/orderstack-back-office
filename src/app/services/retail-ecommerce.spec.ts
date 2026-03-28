import { describe, it, expect } from 'vitest';
import type {
  ProductListing,
  EcommerceOrder,
  ShippingMethod,
  SalePricing,
  ChannelPriceOverride,
  ChannelVisibilitySetting,
} from '@models/retail-ecommerce.model';

// -- Test helpers that replicate the service's computed logic --
// Since Angular DI cannot be used in plain vitest, we test the pure logic
// that the service computeds implement.

function filterPublishedListings(listings: ProductListing[]): ProductListing[] {
  return listings.filter(l => l.isPublished);
}

function filterPendingOrders(orders: EcommerceOrder[]): EcommerceOrder[] {
  return orders.filter(o => o.fulfillmentStatus === 'pending');
}

function filterReadyForPickupOrders(orders: EcommerceOrder[]): EcommerceOrder[] {
  return orders.filter(o => o.fulfillmentStatus === 'ready_for_pickup');
}

function filterShippedOrders(orders: EcommerceOrder[]): EcommerceOrder[] {
  return orders.filter(o => o.fulfillmentStatus === 'shipped' || o.fulfillmentStatus === 'out_for_delivery');
}

function filterActiveShippingMethods(methods: ShippingMethod[]): ShippingMethod[] {
  return methods.filter(m => m.isActive);
}

function filterActiveSales(sales: SalePricing[]): SalePricing[] {
  return sales.filter(s => s.isActive);
}

// --- Signal mutation logic ---

function updateListingInList(
  list: ProductListing[],
  id: string,
  updated: ProductListing,
): ProductListing[] {
  return list.map(l => (l.id === id ? updated : l));
}

function removeListingFromList(list: ProductListing[], id: string): ProductListing[] {
  return list.filter(l => l.id !== id);
}

function updateOrderInList(
  list: EcommerceOrder[],
  orderId: string,
  updated: EcommerceOrder,
): EcommerceOrder[] {
  return list.map(o => (o.id === orderId ? updated : o));
}

function upsertPriceOverride(
  list: ChannelPriceOverride[],
  override: ChannelPriceOverride,
): ChannelPriceOverride[] {
  const idx = list.findIndex(
    o => o.itemId === override.itemId && o.variationId === override.variationId && o.channel === override.channel,
  );
  if (idx >= 0) {
    return list.map((o, i) => (i === idx ? override : o));
  }
  return [...list, override];
}

function upsertVisibility(
  list: ChannelVisibilitySetting[],
  setting: ChannelVisibilitySetting,
): ChannelVisibilitySetting[] {
  const idx = list.findIndex(
    v => v.itemId === setting.itemId && v.variationId === setting.variationId,
  );
  if (idx >= 0) {
    return list.map((v, i) => (i === idx ? setting : v));
  }
  return [...list, setting];
}

// --- Fixtures ---

function makeListing(overrides: Partial<ProductListing> = {}): ProductListing {
  return {
    id: 'pl-1',
    retailItemId: 'ri-1',
    merchantId: 'r-1',
    title: 'Test Listing',
    description: 'desc',
    seoTitle: '',
    seoDescription: '',
    slug: 'test-listing',
    images: [],
    isPublished: false,
    channelVisibility: { inStore: true, online: true, kiosk: false },
    fulfillmentOptions: ['ship'],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

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
    taxTotal: 3.50,
    discountTotal: 0,
    total: 53.50,
    trackingNumber: null,
    trackingUrl: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeShippingMethod(overrides: Partial<ShippingMethod> = {}): ShippingMethod {
  return {
    id: 'sm-1',
    merchantId: 'r-1',
    name: 'Standard',
    type: 'flat_rate',
    rate: 5.99,
    freeAbove: null,
    carrier: null,
    estimatedDays: 5,
    isActive: true,
    ...overrides,
  };
}

// --- Tests ---

describe('RetailEcommerceService computed logic', () => {
  describe('publishedListings', () => {
    it('should return only published listings', () => {
      const listings = [
        makeListing({ id: '1', isPublished: true }),
        makeListing({ id: '2', isPublished: false }),
        makeListing({ id: '3', isPublished: true }),
      ];
      const result = filterPublishedListings(listings);
      expect(result).toHaveLength(2);
      expect(result.every(l => l.isPublished)).toBe(true);
    });

    it('should return empty array if none published', () => {
      const listings = [
        makeListing({ isPublished: false }),
      ];
      expect(filterPublishedListings(listings)).toHaveLength(0);
    });

    it('should return empty array for empty input', () => {
      expect(filterPublishedListings([])).toHaveLength(0);
    });
  });

  describe('pendingOrders', () => {
    it('should filter only pending orders', () => {
      const orders = [
        makeOrder({ id: '1', fulfillmentStatus: 'pending' }),
        makeOrder({ id: '2', fulfillmentStatus: 'processing' }),
        makeOrder({ id: '3', fulfillmentStatus: 'pending' }),
        makeOrder({ id: '4', fulfillmentStatus: 'delivered' }),
      ];
      const result = filterPendingOrders(orders);
      expect(result).toHaveLength(2);
      expect(result.map(o => o.id)).toEqual(['1', '3']);
    });
  });

  describe('readyForPickupOrders', () => {
    it('should filter only ready_for_pickup orders', () => {
      const orders = [
        makeOrder({ id: '1', fulfillmentStatus: 'ready_for_pickup' }),
        makeOrder({ id: '2', fulfillmentStatus: 'pending' }),
        makeOrder({ id: '3', fulfillmentStatus: 'ready_for_pickup' }),
      ];
      const result = filterReadyForPickupOrders(orders);
      expect(result).toHaveLength(2);
    });
  });

  describe('shippedOrders', () => {
    it('should include both shipped and out_for_delivery', () => {
      const orders = [
        makeOrder({ id: '1', fulfillmentStatus: 'shipped' }),
        makeOrder({ id: '2', fulfillmentStatus: 'out_for_delivery' }),
        makeOrder({ id: '3', fulfillmentStatus: 'delivered' }),
        makeOrder({ id: '4', fulfillmentStatus: 'pending' }),
      ];
      const result = filterShippedOrders(orders);
      expect(result).toHaveLength(2);
      expect(result.map(o => o.id)).toEqual(['1', '2']);
    });
  });

  describe('activeShippingMethods', () => {
    it('should filter only active methods', () => {
      const methods = [
        makeShippingMethod({ id: '1', isActive: true }),
        makeShippingMethod({ id: '2', isActive: false }),
        makeShippingMethod({ id: '3', isActive: true }),
      ];
      const result = filterActiveShippingMethods(methods);
      expect(result).toHaveLength(2);
    });
  });

  describe('activeSales', () => {
    it('should filter only active sale pricings', () => {
      const sales: SalePricing[] = [
        { id: '1', itemId: 'i-1', variationId: null, salePrice: 10, startDate: '', endDate: '', channels: [], isActive: true },
        { id: '2', itemId: 'i-2', variationId: null, salePrice: 20, startDate: '', endDate: '', channels: [], isActive: false },
        { id: '3', itemId: 'i-3', variationId: null, salePrice: 30, startDate: '', endDate: '', channels: [], isActive: true },
      ];
      const result = filterActiveSales(sales);
      expect(result).toHaveLength(2);
      expect(result.map(s => s.id)).toEqual(['1', '3']);
    });
  });
});

describe('RetailEcommerceService signal mutation logic', () => {
  describe('updateListingInList', () => {
    it('should replace the matching listing', () => {
      const original = makeListing({ id: 'pl-1', title: 'Old' });
      const updated = makeListing({ id: 'pl-1', title: 'New' });
      const list = [original, makeListing({ id: 'pl-2', title: 'Other' })];
      const result = updateListingInList(list, 'pl-1', updated);
      expect(result[0].title).toBe('New');
      expect(result[1].title).toBe('Other');
    });

    it('should not modify list if id not found', () => {
      const list = [makeListing({ id: 'pl-1' })];
      const updated = makeListing({ id: 'pl-99', title: 'Ghost' });
      const result = updateListingInList(list, 'pl-99', updated);
      expect(result).toEqual(list);
    });
  });

  describe('removeListingFromList', () => {
    it('should remove the matching listing', () => {
      const list = [
        makeListing({ id: 'pl-1' }),
        makeListing({ id: 'pl-2' }),
        makeListing({ id: 'pl-3' }),
      ];
      const result = removeListingFromList(list, 'pl-2');
      expect(result).toHaveLength(2);
      expect(result.map(l => l.id)).toEqual(['pl-1', 'pl-3']);
    });

    it('should return same array if id not found', () => {
      const list = [makeListing({ id: 'pl-1' })];
      const result = removeListingFromList(list, 'pl-99');
      expect(result).toHaveLength(1);
    });
  });

  describe('updateOrderInList', () => {
    it('should replace the matching order', () => {
      const original = makeOrder({ id: 'o-1', fulfillmentStatus: 'pending' });
      const updated = makeOrder({ id: 'o-1', fulfillmentStatus: 'processing' });
      const list = [original, makeOrder({ id: 'o-2' })];
      const result = updateOrderInList(list, 'o-1', updated);
      expect(result[0].fulfillmentStatus).toBe('processing');
    });
  });

  describe('upsertPriceOverride', () => {
    it('should add a new override', () => {
      const list: ChannelPriceOverride[] = [];
      const override: ChannelPriceOverride = { itemId: 'i-1', variationId: null, channel: 'online', price: 19.99 };
      const result = upsertPriceOverride(list, override);
      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(19.99);
    });

    it('should update an existing override', () => {
      const existing: ChannelPriceOverride = { itemId: 'i-1', variationId: null, channel: 'online', price: 19.99 };
      const updated: ChannelPriceOverride = { itemId: 'i-1', variationId: null, channel: 'online', price: 24.99 };
      const result = upsertPriceOverride([existing], updated);
      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(24.99);
    });

    it('should not match if channel differs', () => {
      const existing: ChannelPriceOverride = { itemId: 'i-1', variationId: null, channel: 'online', price: 19.99 };
      const different: ChannelPriceOverride = { itemId: 'i-1', variationId: null, channel: 'pos', price: 29.99 };
      const result = upsertPriceOverride([existing], different);
      expect(result).toHaveLength(2);
    });

    it('should not match if variationId differs', () => {
      const existing: ChannelPriceOverride = { itemId: 'i-1', variationId: 'v-1', channel: 'online', price: 19.99 };
      const different: ChannelPriceOverride = { itemId: 'i-1', variationId: 'v-2', channel: 'online', price: 29.99 };
      const result = upsertPriceOverride([existing], different);
      expect(result).toHaveLength(2);
    });
  });

  describe('upsertVisibility', () => {
    it('should add new visibility setting', () => {
      const setting: ChannelVisibilitySetting = { itemId: 'i-1', variationId: null, inStore: true, online: true, kiosk: false };
      const result = upsertVisibility([], setting);
      expect(result).toHaveLength(1);
    });

    it('should update existing visibility setting', () => {
      const existing: ChannelVisibilitySetting = { itemId: 'i-1', variationId: null, inStore: true, online: true, kiosk: false };
      const updated: ChannelVisibilitySetting = { itemId: 'i-1', variationId: null, inStore: false, online: true, kiosk: true };
      const result = upsertVisibility([existing], updated);
      expect(result).toHaveLength(1);
      expect(result[0].inStore).toBe(false);
      expect(result[0].kiosk).toBe(true);
    });

    it('should not match if variationId differs', () => {
      const existing: ChannelVisibilitySetting = { itemId: 'i-1', variationId: null, inStore: true, online: true, kiosk: false };
      const different: ChannelVisibilitySetting = { itemId: 'i-1', variationId: 'v-1', inStore: false, online: false, kiosk: false };
      const result = upsertVisibility([existing], different);
      expect(result).toHaveLength(2);
    });
  });
});
