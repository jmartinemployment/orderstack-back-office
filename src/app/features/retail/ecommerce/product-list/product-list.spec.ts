import { describe, it, expect } from 'vitest';
import type { RetailItem, RetailItemVariation } from '@models/retail.model';
import type { EcommerceCartItem, ProductFilterState } from '@models/retail-ecommerce.model';

// --- Replicate ProductList pure logic for testing ---

function makeItem(overrides: Partial<RetailItem> = {}): RetailItem {
  return {
    id: 'i-1',
    merchantId: 'r-1',
    name: 'Test Item',
    sku: 'TST-001',
    barcode: null,
    barcodeFormat: null,
    description: 'A test item',
    basePrice: 25,
    cost: 10,
    imageUrl: null,
    thumbnailUrl: null,
    categoryId: 'cat-1',
    subcategoryId: null,
    vendorId: null,
    vendorCode: null,
    itemType: 'physical',
    taxable: true,
    trackInventory: true,
    weightBased: false,
    weightUnit: null,
    markupPercent: null,
    variations: [],
    optionSetIds: [],
    tags: [],
    channelVisibility: { inStore: true, online: true, kiosk: false },
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as RetailItem;
}

// filteredItems logic from the component
function filterAndSortItems(items: RetailItem[], filters: ProductFilterState): RetailItem[] {
  let result = items.filter(item => item.isActive && item.channelVisibility.online);

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      item => item.name.toLowerCase().includes(q) || (item.sku ?? '').toLowerCase().includes(q),
    );
  }

  if (filters.categoryId) {
    result = result.filter(item => item.categoryId === filters.categoryId);
  }

  if (filters.minPrice !== null) {
    result = result.filter(item => item.basePrice >= filters.minPrice!);
  }

  if (filters.maxPrice !== null) {
    result = result.filter(item => item.basePrice <= filters.maxPrice!);
  }

  switch (filters.sort) {
    case 'name_asc':
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name_desc':
      result = [...result].sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'price_asc':
      result = [...result].sort((a, b) => a.basePrice - b.basePrice);
      break;
    case 'price_desc':
      result = [...result].sort((a, b) => b.basePrice - a.basePrice);
      break;
    case 'newest':
      result = [...result].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
      break;
  }

  return result;
}

// getPriceRange from the component
function getPriceRange(item: RetailItem): string {
  if (!item.variations || item.variations.length === 0) return '';
  const prices = item.variations.filter(v => v.isActive).map(v => v.price);
  if (prices.length === 0) return '';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? '' : `${min} - ${max}`;
}

// hasVariations from the component
function hasVariations(item: RetailItem): boolean {
  return !!item.variations && item.variations.length > 1;
}

// Cart computeds
function cartItemCount(cart: EcommerceCartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function cartTotal(cart: EcommerceCartItem[]): number {
  return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

// addToCart logic
function addToCart(cart: EcommerceCartItem[], item: RetailItem): EcommerceCartItem[] {
  const existing = cart.find(c => c.itemId === item.id && c.variationId === null);
  if (existing) {
    return cart.map(c =>
      c.itemId === item.id && c.variationId === null
        ? { ...c, quantity: c.quantity + 1 }
        : c,
    );
  }
  return [
    ...cart,
    {
      itemId: item.id,
      variationId: null,
      name: item.name,
      variationName: null,
      sku: item.sku ?? '',
      imageUrl: item.imageUrl,
      unitPrice: item.basePrice,
      quantity: 1,
      maxQuantity: null,
    },
  ];
}

// removeFromCart
function removeFromCart(cart: EcommerceCartItem[], index: number): EcommerceCartItem[] {
  return cart.filter((_, i) => i !== index);
}

// updateCartQuantity
function updateCartQuantity(cart: EcommerceCartItem[], index: number, quantity: number): EcommerceCartItem[] {
  if (quantity <= 0) {
    return removeFromCart(cart, index);
  }
  return cart.map((item, i) => (i === index ? { ...item, quantity } : item));
}

// --- Tests ---

describe('ProductList logic', () => {
  const defaultFilters: ProductFilterState = {
    categoryId: null,
    minPrice: null,
    maxPrice: null,
    search: '',
    sort: 'name_asc',
  };

  describe('filterAndSortItems', () => {
    it('should exclude inactive items', () => {
      const items = [
        makeItem({ id: '1', isActive: true }),
        makeItem({ id: '2', isActive: false }),
      ];
      const result = filterAndSortItems(items, defaultFilters);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should exclude items not visible online', () => {
      const items = [
        makeItem({ id: '1', channelVisibility: { inStore: true, online: true, kiosk: false } }),
        makeItem({ id: '2', channelVisibility: { inStore: true, online: false, kiosk: false } }),
      ];
      const result = filterAndSortItems(items, defaultFilters);
      expect(result).toHaveLength(1);
    });

    it('should filter by search term (name)', () => {
      const items = [
        makeItem({ id: '1', name: 'Red Shirt' }),
        makeItem({ id: '2', name: 'Blue Pants' }),
        makeItem({ id: '3', name: 'Red Hat' }),
      ];
      const result = filterAndSortItems(items, { ...defaultFilters, search: 'red' });
      expect(result).toHaveLength(2);
      expect(result.map(i => i.id)).toEqual(['3', '1']); // sorted alpha
    });

    it('should filter by search term (SKU)', () => {
      const items = [
        makeItem({ id: '1', name: 'Widget', sku: 'WDG-001' }),
        makeItem({ id: '2', name: 'Gadget', sku: 'GDG-002' }),
      ];
      const result = filterAndSortItems(items, { ...defaultFilters, search: 'wdg' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Widget');
    });

    it('should handle null SKU during search', () => {
      const items = [
        makeItem({ id: '1', name: 'No SKU Item', sku: null }),
      ];
      const result = filterAndSortItems(items, { ...defaultFilters, search: 'sku' });
      expect(result).toHaveLength(1); // matches "No SKU Item" by name
    });

    it('should filter by category', () => {
      const items = [
        makeItem({ id: '1', categoryId: 'cat-1' }),
        makeItem({ id: '2', categoryId: 'cat-2' }),
        makeItem({ id: '3', categoryId: 'cat-1' }),
      ];
      const result = filterAndSortItems(items, { ...defaultFilters, categoryId: 'cat-1' });
      expect(result).toHaveLength(2);
    });

    it('should filter by min price', () => {
      const items = [
        makeItem({ id: '1', basePrice: 10 }),
        makeItem({ id: '2', basePrice: 20 }),
        makeItem({ id: '3', basePrice: 30 }),
      ];
      const result = filterAndSortItems(items, { ...defaultFilters, minPrice: 20, sort: 'price_asc' });
      expect(result).toHaveLength(2);
      expect(result[0].basePrice).toBe(20);
    });

    it('should filter by max price', () => {
      const items = [
        makeItem({ id: '1', basePrice: 10 }),
        makeItem({ id: '2', basePrice: 20 }),
        makeItem({ id: '3', basePrice: 30 }),
      ];
      const result = filterAndSortItems(items, { ...defaultFilters, maxPrice: 20, sort: 'price_asc' });
      expect(result).toHaveLength(2);
      expect(result[1].basePrice).toBe(20);
    });

    it('should filter by price range', () => {
      const items = [
        makeItem({ id: '1', basePrice: 5 }),
        makeItem({ id: '2', basePrice: 15 }),
        makeItem({ id: '3', basePrice: 25 }),
        makeItem({ id: '4', basePrice: 35 }),
      ];
      const result = filterAndSortItems(items, { ...defaultFilters, minPrice: 10, maxPrice: 30 });
      expect(result).toHaveLength(2);
    });

    it('should sort by name ascending', () => {
      const items = [
        makeItem({ id: '1', name: 'Cherry' }),
        makeItem({ id: '2', name: 'Apple' }),
        makeItem({ id: '3', name: 'Banana' }),
      ];
      const result = filterAndSortItems(items, { ...defaultFilters, sort: 'name_asc' });
      expect(result.map(i => i.name)).toEqual(['Apple', 'Banana', 'Cherry']);
    });

    it('should sort by name descending', () => {
      const items = [
        makeItem({ id: '1', name: 'Cherry' }),
        makeItem({ id: '2', name: 'Apple' }),
        makeItem({ id: '3', name: 'Banana' }),
      ];
      const result = filterAndSortItems(items, { ...defaultFilters, sort: 'name_desc' });
      expect(result.map(i => i.name)).toEqual(['Cherry', 'Banana', 'Apple']);
    });

    it('should sort by price ascending', () => {
      const items = [
        makeItem({ id: '1', basePrice: 30 }),
        makeItem({ id: '2', basePrice: 10 }),
        makeItem({ id: '3', basePrice: 20 }),
      ];
      const result = filterAndSortItems(items, { ...defaultFilters, sort: 'price_asc' });
      expect(result.map(i => i.basePrice)).toEqual([10, 20, 30]);
    });

    it('should sort by price descending', () => {
      const items = [
        makeItem({ id: '1', basePrice: 30 }),
        makeItem({ id: '2', basePrice: 10 }),
        makeItem({ id: '3', basePrice: 20 }),
      ];
      const result = filterAndSortItems(items, { ...defaultFilters, sort: 'price_desc' });
      expect(result.map(i => i.basePrice)).toEqual([30, 20, 10]);
    });

    it('should sort by newest', () => {
      const items = [
        makeItem({ id: '1', createdAt: '2026-01-01T00:00:00Z' }),
        makeItem({ id: '2', createdAt: '2026-01-03T00:00:00Z' }),
        makeItem({ id: '3', createdAt: '2026-01-02T00:00:00Z' }),
      ];
      const result = filterAndSortItems(items, { ...defaultFilters, sort: 'newest' });
      expect(result.map(i => i.id)).toEqual(['2', '3', '1']);
    });

    it('should combine filters', () => {
      const items = [
        makeItem({ id: '1', name: 'Red Shirt', categoryId: 'cat-1', basePrice: 25 }),
        makeItem({ id: '2', name: 'Blue Shirt', categoryId: 'cat-1', basePrice: 35 }),
        makeItem({ id: '3', name: 'Red Pants', categoryId: 'cat-2', basePrice: 30 }),
      ];
      const result = filterAndSortItems(items, {
        categoryId: 'cat-1',
        search: 'shirt',
        minPrice: null,
        maxPrice: 30,
        sort: 'price_asc',
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Red Shirt');
    });

    it('should return empty array when no items match', () => {
      const items = [
        makeItem({ id: '1', name: 'Widget', isActive: true }),
      ];
      const result = filterAndSortItems(items, { ...defaultFilters, search: 'nonexistent' });
      expect(result).toHaveLength(0);
    });
  });

  describe('getPriceRange', () => {
    it('should return empty string for no variations', () => {
      const item = makeItem({ variations: [] });
      expect(getPriceRange(item)).toBe('');
    });

    it('should return empty string when all variations same price', () => {
      const item = makeItem({
        variations: [
          { id: 'v1', price: 20, isActive: true } as RetailItemVariation,
          { id: 'v2', price: 20, isActive: true } as RetailItemVariation,
        ],
      });
      expect(getPriceRange(item)).toBe('');
    });

    it('should return range when prices differ', () => {
      const item = makeItem({
        variations: [
          { id: 'v1', price: 15, isActive: true } as RetailItemVariation,
          { id: 'v2', price: 25, isActive: true } as RetailItemVariation,
          { id: 'v3', price: 20, isActive: true } as RetailItemVariation,
        ],
      });
      expect(getPriceRange(item)).toBe('15 - 25');
    });

    it('should exclude inactive variations', () => {
      const item = makeItem({
        variations: [
          { id: 'v1', price: 10, isActive: false } as RetailItemVariation,
          { id: 'v2', price: 20, isActive: true } as RetailItemVariation,
          { id: 'v3', price: 30, isActive: true } as RetailItemVariation,
        ],
      });
      expect(getPriceRange(item)).toBe('20 - 30');
    });

    it('should return empty for all inactive variations', () => {
      const item = makeItem({
        variations: [
          { id: 'v1', price: 10, isActive: false } as RetailItemVariation,
        ],
      });
      expect(getPriceRange(item)).toBe('');
    });
  });

  describe('hasVariations', () => {
    it('should return false for no variations', () => {
      expect(hasVariations(makeItem({ variations: [] }))).toBe(false);
    });

    it('should return false for single variation', () => {
      expect(hasVariations(makeItem({
        variations: [{ id: 'v1' } as RetailItemVariation],
      }))).toBe(false);
    });

    it('should return true for multiple variations', () => {
      expect(hasVariations(makeItem({
        variations: [
          { id: 'v1' } as RetailItemVariation,
          { id: 'v2' } as RetailItemVariation,
        ],
      }))).toBe(true);
    });
  });

  describe('cart operations', () => {
    describe('cartItemCount', () => {
      it('should return 0 for empty cart', () => {
        expect(cartItemCount([])).toBe(0);
      });

      it('should sum quantities', () => {
        const cart: EcommerceCartItem[] = [
          { itemId: '1', variationId: null, name: 'A', variationName: null, sku: '', imageUrl: null, unitPrice: 10, quantity: 2, maxQuantity: null },
          { itemId: '2', variationId: null, name: 'B', variationName: null, sku: '', imageUrl: null, unitPrice: 20, quantity: 3, maxQuantity: null },
        ];
        expect(cartItemCount(cart)).toBe(5);
      });
    });

    describe('cartTotal', () => {
      it('should return 0 for empty cart', () => {
        expect(cartTotal([])).toBe(0);
      });

      it('should calculate total correctly', () => {
        const cart: EcommerceCartItem[] = [
          { itemId: '1', variationId: null, name: 'A', variationName: null, sku: '', imageUrl: null, unitPrice: 10, quantity: 2, maxQuantity: null },
          { itemId: '2', variationId: null, name: 'B', variationName: null, sku: '', imageUrl: null, unitPrice: 15.50, quantity: 1, maxQuantity: null },
        ];
        expect(cartTotal(cart)).toBe(35.5);
      });
    });

    describe('addToCart', () => {
      it('should add new item to empty cart', () => {
        const item = makeItem({ id: 'i-1', name: 'Widget', basePrice: 12.99 });
        const result = addToCart([], item);
        expect(result).toHaveLength(1);
        expect(result[0].itemId).toBe('i-1');
        expect(result[0].quantity).toBe(1);
        expect(result[0].unitPrice).toBe(12.99);
      });

      it('should increment quantity for existing item', () => {
        const item = makeItem({ id: 'i-1' });
        const cart: EcommerceCartItem[] = [{
          itemId: 'i-1', variationId: null, name: 'Widget', variationName: null,
          sku: '', imageUrl: null, unitPrice: 10, quantity: 2, maxQuantity: null,
        }];
        const result = addToCart(cart, item);
        expect(result).toHaveLength(1);
        expect(result[0].quantity).toBe(3);
      });

      it('should add as new entry if same item but different variation key', () => {
        const item = makeItem({ id: 'i-1' });
        const cart: EcommerceCartItem[] = [{
          itemId: 'i-1', variationId: 'v-1', name: 'Widget', variationName: 'Red',
          sku: '', imageUrl: null, unitPrice: 10, quantity: 1, maxQuantity: null,
        }];
        const result = addToCart(cart, item);
        // addToCart adds with variationId: null, so it's a different entry
        expect(result).toHaveLength(2);
      });

      it('should use null SKU fallback', () => {
        const item = makeItem({ id: 'i-1', sku: null });
        const result = addToCart([], item);
        expect(result[0].sku).toBe('');
      });
    });

    describe('removeFromCart', () => {
      it('should remove item at index', () => {
        const cart: EcommerceCartItem[] = [
          { itemId: '1', variationId: null, name: 'A', variationName: null, sku: '', imageUrl: null, unitPrice: 10, quantity: 1, maxQuantity: null },
          { itemId: '2', variationId: null, name: 'B', variationName: null, sku: '', imageUrl: null, unitPrice: 20, quantity: 1, maxQuantity: null },
          { itemId: '3', variationId: null, name: 'C', variationName: null, sku: '', imageUrl: null, unitPrice: 30, quantity: 1, maxQuantity: null },
        ];
        const result = removeFromCart(cart, 1);
        expect(result).toHaveLength(2);
        expect(result.map(c => c.itemId)).toEqual(['1', '3']);
      });
    });

    describe('updateCartQuantity', () => {
      it('should update quantity at index', () => {
        const cart: EcommerceCartItem[] = [
          { itemId: '1', variationId: null, name: 'A', variationName: null, sku: '', imageUrl: null, unitPrice: 10, quantity: 1, maxQuantity: null },
        ];
        const result = updateCartQuantity(cart, 0, 5);
        expect(result[0].quantity).toBe(5);
      });

      it('should remove item when quantity is 0', () => {
        const cart: EcommerceCartItem[] = [
          { itemId: '1', variationId: null, name: 'A', variationName: null, sku: '', imageUrl: null, unitPrice: 10, quantity: 1, maxQuantity: null },
        ];
        const result = updateCartQuantity(cart, 0, 0);
        expect(result).toHaveLength(0);
      });

      it('should remove item when quantity is negative', () => {
        const cart: EcommerceCartItem[] = [
          { itemId: '1', variationId: null, name: 'A', variationName: null, sku: '', imageUrl: null, unitPrice: 10, quantity: 1, maxQuantity: null },
        ];
        const result = updateCartQuantity(cart, 0, -1);
        expect(result).toHaveLength(0);
      });

      it('should not affect other items', () => {
        const cart: EcommerceCartItem[] = [
          { itemId: '1', variationId: null, name: 'A', variationName: null, sku: '', imageUrl: null, unitPrice: 10, quantity: 1, maxQuantity: null },
          { itemId: '2', variationId: null, name: 'B', variationName: null, sku: '', imageUrl: null, unitPrice: 20, quantity: 2, maxQuantity: null },
        ];
        const result = updateCartQuantity(cart, 0, 3);
        expect(result[0].quantity).toBe(3);
        expect(result[1].quantity).toBe(2);
      });
    });
  });
});
