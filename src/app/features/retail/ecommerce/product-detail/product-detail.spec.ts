import { describe, it, expect } from 'vitest';
import type { RetailItem, RetailItemVariation } from '@models/retail.model';
import type { EcommerceCartItem } from '@models/retail-ecommerce.model';

// --- Replicate ProductDetail pure logic for testing ---

function makeVariation(overrides: Partial<RetailItemVariation> = {}): RetailItemVariation {
  return {
    id: 'v-1',
    itemId: 'i-1',
    name: 'Default',
    sku: 'V-SKU-001',
    barcode: null,
    price: 25,
    cost: 10,
    weight: null,
    dimensions: null,
    stockQuantity: 50,
    lowStockThreshold: 5,
    reorderPoint: 10,
    optionValues: {},
    imageUrl: null,
    isActive: true,
    ...overrides,
  } as RetailItemVariation;
}

function makeItem(overrides: Partial<RetailItem> = {}): RetailItem {
  return {
    id: 'i-1',
    merchantId: 'r-1',
    name: 'Test Product',
    sku: 'TST-001',
    barcode: null,
    barcodeFormat: null,
    description: 'A test product',
    basePrice: 25,
    cost: 10,
    imageUrl: 'https://example.com/product.jpg',
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

// selectedVariation logic
function findVariation(product: RetailItem | null, variationId: string | null): RetailItemVariation | null {
  if (!product?.variations || !variationId) return null;
  return product.variations.find(v => v.id === variationId) ?? null;
}

// currentPrice logic
function getCurrentPrice(product: RetailItem | null, selectedVariation: RetailItemVariation | null): number {
  if (selectedVariation) return selectedVariation.price;
  return product?.basePrice ?? 0;
}

// currentImageUrl logic
function getCurrentImageUrl(product: RetailItem | null, selectedVariation: RetailItemVariation | null): string | null {
  if (selectedVariation?.imageUrl) return selectedVariation.imageUrl;
  return product?.imageUrl ?? null;
}

// isInStock logic
function isInStock(selectedVariation: RetailItemVariation | null): boolean {
  if (selectedVariation) return selectedVariation.stockQuantity > 0;
  return true;
}

// hasVariations logic
function hasVariations(product: RetailItem | null): boolean {
  return !!product?.variations && product.variations.length > 0;
}

// activeVariations logic
function getActiveVariations(product: RetailItem | null): RetailItemVariation[] {
  if (!product?.variations) return [];
  return product.variations.filter(v => v.isActive);
}

// addToCart logic
function buildCartItem(
  product: RetailItem,
  variation: RetailItemVariation | null,
  quantity: number,
): EcommerceCartItem {
  return {
    itemId: product.id,
    variationId: variation?.id ?? null,
    name: product.name,
    variationName: variation?.name ?? null,
    sku: variation?.sku ?? product.sku ?? '',
    imageUrl: variation?.imageUrl ?? product.imageUrl,
    unitPrice: variation?.price ?? product.basePrice,
    quantity,
    maxQuantity: null,
  };
}

function addToCart(cart: EcommerceCartItem[], newItem: EcommerceCartItem): EcommerceCartItem[] {
  const existing = cart.findIndex(
    c => c.itemId === newItem.itemId && c.variationId === newItem.variationId,
  );
  if (existing >= 0) {
    return cart.map((item, i) =>
      i === existing ? { ...item, quantity: item.quantity + newItem.quantity } : item,
    );
  }
  return [...cart, newItem];
}

// findProduct logic
function findProduct(items: RetailItem[], productId: string): RetailItem | null {
  return items.find(i => i.id === productId) ?? null;
}

// auto-select first active variation
function autoSelectVariation(product: RetailItem | null): string | null {
  if (!product?.variations || product.variations.length === 0) return null;
  const firstActive = product.variations.find(v => v.isActive);
  return firstActive?.id ?? null;
}

// --- Tests ---

describe('ProductDetail logic', () => {
  describe('findVariation', () => {
    it('should return null when no product', () => {
      expect(findVariation(null, 'v-1')).toBeNull();
    });

    it('should return null when no variationId', () => {
      const product = makeItem({ variations: [makeVariation()] });
      expect(findVariation(product, null)).toBeNull();
    });

    it('should return null when product has no variations', () => {
      const product = makeItem({ variations: [] });
      expect(findVariation(product, 'v-1')).toBeNull();
    });

    it('should find matching variation', () => {
      const v1 = makeVariation({ id: 'v-1', name: 'Small' });
      const v2 = makeVariation({ id: 'v-2', name: 'Large' });
      const product = makeItem({ variations: [v1, v2] });
      const result = findVariation(product, 'v-2');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Large');
    });

    it('should return null for non-existent variationId', () => {
      const product = makeItem({ variations: [makeVariation({ id: 'v-1' })] });
      expect(findVariation(product, 'v-999')).toBeNull();
    });
  });

  describe('getCurrentPrice', () => {
    it('should return variation price when variation selected', () => {
      const product = makeItem({ basePrice: 20 });
      const variation = makeVariation({ price: 35 });
      expect(getCurrentPrice(product, variation)).toBe(35);
    });

    it('should return base price when no variation selected', () => {
      const product = makeItem({ basePrice: 20 });
      expect(getCurrentPrice(product, null)).toBe(20);
    });

    it('should return 0 when no product and no variation', () => {
      expect(getCurrentPrice(null, null)).toBe(0);
    });
  });

  describe('getCurrentImageUrl', () => {
    it('should return variation image when available', () => {
      const product = makeItem({ imageUrl: 'product.jpg' });
      const variation = makeVariation({ imageUrl: 'variation.jpg' });
      expect(getCurrentImageUrl(product, variation)).toBe('variation.jpg');
    });

    it('should return product image when variation has no image', () => {
      const product = makeItem({ imageUrl: 'product.jpg' });
      const variation = makeVariation({ imageUrl: null });
      expect(getCurrentImageUrl(product, variation)).toBe('product.jpg');
    });

    it('should return product image when no variation', () => {
      const product = makeItem({ imageUrl: 'product.jpg' });
      expect(getCurrentImageUrl(product, null)).toBe('product.jpg');
    });

    it('should return null when no images anywhere', () => {
      const product = makeItem({ imageUrl: null });
      expect(getCurrentImageUrl(product, null)).toBeNull();
    });
  });

  describe('isInStock', () => {
    it('should return true when variation has stock', () => {
      expect(isInStock(makeVariation({ stockQuantity: 10 }))).toBe(true);
    });

    it('should return false when variation is out of stock', () => {
      expect(isInStock(makeVariation({ stockQuantity: 0 }))).toBe(false);
    });

    it('should return true when no variation selected (base item assumed in stock)', () => {
      expect(isInStock(null)).toBe(true);
    });
  });

  describe('hasVariations', () => {
    it('should return false for null product', () => {
      expect(hasVariations(null)).toBe(false);
    });

    it('should return false for empty variations', () => {
      expect(hasVariations(makeItem({ variations: [] }))).toBe(false);
    });

    it('should return true for product with variations', () => {
      expect(hasVariations(makeItem({
        variations: [makeVariation()],
      }))).toBe(true);
    });
  });

  describe('getActiveVariations', () => {
    it('should return empty for null product', () => {
      expect(getActiveVariations(null)).toEqual([]);
    });

    it('should filter out inactive variations', () => {
      const product = makeItem({
        variations: [
          makeVariation({ id: 'v-1', isActive: true }),
          makeVariation({ id: 'v-2', isActive: false }),
          makeVariation({ id: 'v-3', isActive: true }),
        ],
      });
      const result = getActiveVariations(product);
      expect(result).toHaveLength(2);
      expect(result.map(v => v.id)).toEqual(['v-1', 'v-3']);
    });
  });

  describe('buildCartItem', () => {
    it('should build cart item with variation', () => {
      const product = makeItem({ id: 'i-1', name: 'Shirt', basePrice: 20, sku: 'SH-001', imageUrl: 'shirt.jpg' });
      const variation = makeVariation({ id: 'v-1', name: 'Large', sku: 'SH-LG', price: 25, imageUrl: 'shirt-lg.jpg' });
      const result = buildCartItem(product, variation, 2);
      expect(result.itemId).toBe('i-1');
      expect(result.variationId).toBe('v-1');
      expect(result.variationName).toBe('Large');
      expect(result.sku).toBe('SH-LG');
      expect(result.unitPrice).toBe(25);
      expect(result.imageUrl).toBe('shirt-lg.jpg');
      expect(result.quantity).toBe(2);
    });

    it('should build cart item without variation', () => {
      const product = makeItem({ id: 'i-1', name: 'Poster', basePrice: 12, sku: 'PST-001', imageUrl: 'poster.jpg' });
      const result = buildCartItem(product, null, 1);
      expect(result.variationId).toBeNull();
      expect(result.variationName).toBeNull();
      expect(result.sku).toBe('PST-001');
      expect(result.unitPrice).toBe(12);
      expect(result.imageUrl).toBe('poster.jpg');
    });

    it('should handle null SKU on product', () => {
      const product = makeItem({ sku: null });
      const result = buildCartItem(product, null, 1);
      expect(result.sku).toBe('');
    });
  });

  describe('addToCart', () => {
    it('should add new item to empty cart', () => {
      const item: EcommerceCartItem = {
        itemId: 'i-1', variationId: 'v-1', name: 'Shirt', variationName: 'Large',
        sku: '', imageUrl: null, unitPrice: 25, quantity: 1, maxQuantity: null,
      };
      const result = addToCart([], item);
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(1);
    });

    it('should increment quantity for matching item+variation', () => {
      const existing: EcommerceCartItem = {
        itemId: 'i-1', variationId: 'v-1', name: 'Shirt', variationName: 'Large',
        sku: '', imageUrl: null, unitPrice: 25, quantity: 2, maxQuantity: null,
      };
      const newItem: EcommerceCartItem = {
        itemId: 'i-1', variationId: 'v-1', name: 'Shirt', variationName: 'Large',
        sku: '', imageUrl: null, unitPrice: 25, quantity: 3, maxQuantity: null,
      };
      const result = addToCart([existing], newItem);
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(5);
    });

    it('should add as separate entry for different variation', () => {
      const existing: EcommerceCartItem = {
        itemId: 'i-1', variationId: 'v-1', name: 'Shirt', variationName: 'Large',
        sku: '', imageUrl: null, unitPrice: 25, quantity: 1, maxQuantity: null,
      };
      const newItem: EcommerceCartItem = {
        itemId: 'i-1', variationId: 'v-2', name: 'Shirt', variationName: 'Small',
        sku: '', imageUrl: null, unitPrice: 22, quantity: 1, maxQuantity: null,
      };
      const result = addToCart([existing], newItem);
      expect(result).toHaveLength(2);
    });
  });

  describe('findProduct', () => {
    it('should find product by id', () => {
      const items = [
        makeItem({ id: 'i-1', name: 'Widget' }),
        makeItem({ id: 'i-2', name: 'Gadget' }),
      ];
      const result = findProduct(items, 'i-2');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Gadget');
    });

    it('should return null for non-existent id', () => {
      const items = [makeItem({ id: 'i-1' })];
      expect(findProduct(items, 'i-999')).toBeNull();
    });

    it('should return null for empty items', () => {
      expect(findProduct([], 'i-1')).toBeNull();
    });
  });

  describe('autoSelectVariation', () => {
    it('should return null for null product', () => {
      expect(autoSelectVariation(null)).toBeNull();
    });

    it('should return null for no variations', () => {
      expect(autoSelectVariation(makeItem({ variations: [] }))).toBeNull();
    });

    it('should select first active variation', () => {
      const product = makeItem({
        variations: [
          makeVariation({ id: 'v-1', isActive: false }),
          makeVariation({ id: 'v-2', isActive: true }),
          makeVariation({ id: 'v-3', isActive: true }),
        ],
      });
      expect(autoSelectVariation(product)).toBe('v-2');
    });

    it('should return null if all variations inactive', () => {
      const product = makeItem({
        variations: [
          makeVariation({ id: 'v-1', isActive: false }),
          makeVariation({ id: 'v-2', isActive: false }),
        ],
      });
      expect(autoSelectVariation(product)).toBeNull();
    });
  });
});
