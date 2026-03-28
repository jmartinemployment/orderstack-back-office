import { describe, it, expect } from 'vitest';
import type {
  EcommerceCartItem,
  ShippingAddress,
  ShippingMethod,
  FulfillmentOption,
} from '@models/retail-ecommerce.model';

// --- Replicate RetailCheckout pure logic for testing ---

// cartSubtotal
function cartSubtotal(cart: EcommerceCartItem[]): number {
  return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

// cartItemCount
function cartItemCount(cart: EcommerceCartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

// selectedShippingMethod
function findShippingMethod(methods: ShippingMethod[], id: string | null): ShippingMethod | null {
  if (!id) return null;
  return methods.find(m => m.id === id) ?? null;
}

// shippingCost
function calculateShippingCost(
  fulfillmentType: FulfillmentOption,
  method: ShippingMethod | null,
  subtotal: number,
): number {
  if (fulfillmentType !== 'ship') return 0;
  if (!method) return 0;
  if (method.freeAbove && subtotal >= method.freeAbove) return 0;
  return method.rate;
}

// taxAmount
function calculateTax(subtotal: number, taxRate: number): number {
  return subtotal * (taxRate / 100);
}

// orderTotal
function calculateOrderTotal(subtotal: number, shipping: number, tax: number): number {
  return subtotal + shipping + tax;
}

// canProceedToShipping
function canProceedToShipping(cart: EcommerceCartItem[]): boolean {
  return cart.length > 0;
}

// canProceedToPayment
function canProceedToPayment(
  customerName: string,
  customerEmail: string,
  fulfillmentType: FulfillmentOption,
  address: ShippingAddress,
): boolean {
  if (!customerName || !customerEmail) return false;
  if (fulfillmentType === 'ship') {
    return !!address.fullName && !!address.line1 && !!address.city && !!address.state && !!address.postalCode;
  }
  return true;
}

// updateCartQuantity
function updateCartQuantity(cart: EcommerceCartItem[], index: number, quantity: number): EcommerceCartItem[] {
  if (quantity <= 0) {
    return cart.filter((_, i) => i !== index);
  }
  return cart.map((item, i) => (i === index ? { ...item, quantity } : item));
}

// removeItem
function removeItem(cart: EcommerceCartItem[], index: number): EcommerceCartItem[] {
  return cart.filter((_, i) => i !== index);
}

// setFulfillmentType behavior
function handleFulfillmentTypeChange(
  newType: FulfillmentOption,
  currentShippingMethodId: string | null,
): string | null {
  if (newType !== 'ship') return null;
  return currentShippingMethodId;
}

// --- Fixtures ---

function makeCartItem(overrides: Partial<EcommerceCartItem> = {}): EcommerceCartItem {
  return {
    itemId: 'i-1',
    variationId: null,
    name: 'Test Item',
    variationName: null,
    sku: 'TST-001',
    imageUrl: null,
    unitPrice: 25,
    quantity: 1,
    maxQuantity: null,
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

function makeAddress(overrides: Partial<ShippingAddress> = {}): ShippingAddress {
  return {
    fullName: 'Jane Doe',
    line1: '123 Main St',
    line2: null,
    city: 'Miami',
    state: 'FL',
    postalCode: '33101',
    country: 'US',
    phone: '555-0100',
    ...overrides,
  };
}

// --- Tests ---

describe('RetailCheckout logic', () => {
  describe('cartSubtotal', () => {
    it('should return 0 for empty cart', () => {
      expect(cartSubtotal([])).toBe(0);
    });

    it('should calculate subtotal correctly', () => {
      const cart = [
        makeCartItem({ unitPrice: 10, quantity: 2 }),
        makeCartItem({ unitPrice: 15.5, quantity: 3 }),
      ];
      expect(cartSubtotal(cart)).toBe(66.5);
    });

    it('should handle single item', () => {
      const cart = [makeCartItem({ unitPrice: 99.99, quantity: 1 })];
      expect(cartSubtotal(cart)).toBeCloseTo(99.99);
    });
  });

  describe('cartItemCount', () => {
    it('should return 0 for empty cart', () => {
      expect(cartItemCount([])).toBe(0);
    });

    it('should sum all quantities', () => {
      const cart = [
        makeCartItem({ quantity: 2 }),
        makeCartItem({ quantity: 5 }),
        makeCartItem({ quantity: 1 }),
      ];
      expect(cartItemCount(cart)).toBe(8);
    });
  });

  describe('findShippingMethod', () => {
    const methods = [
      makeShippingMethod({ id: 'sm-1', name: 'Standard' }),
      makeShippingMethod({ id: 'sm-2', name: 'Express' }),
    ];

    it('should return null when no id', () => {
      expect(findShippingMethod(methods, null)).toBeNull();
    });

    it('should find matching method', () => {
      const result = findShippingMethod(methods, 'sm-2');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Express');
    });

    it('should return null for non-existent id', () => {
      expect(findShippingMethod(methods, 'sm-99')).toBeNull();
    });
  });

  describe('calculateShippingCost', () => {
    it('should return 0 for non-ship fulfillment', () => {
      const method = makeShippingMethod({ rate: 10 });
      expect(calculateShippingCost('pickup', method, 100)).toBe(0);
      expect(calculateShippingCost('curbside', method, 100)).toBe(0);
      expect(calculateShippingCost('local_delivery', method, 100)).toBe(0);
    });

    it('should return 0 when no method selected', () => {
      expect(calculateShippingCost('ship', null, 100)).toBe(0);
    });

    it('should return rate for ship fulfillment', () => {
      const method = makeShippingMethod({ rate: 7.99 });
      expect(calculateShippingCost('ship', method, 30)).toBe(7.99);
    });

    it('should return 0 when subtotal meets free shipping threshold', () => {
      const method = makeShippingMethod({ rate: 7.99, freeAbove: 50 });
      expect(calculateShippingCost('ship', method, 50)).toBe(0);
      expect(calculateShippingCost('ship', method, 75)).toBe(0);
    });

    it('should charge when subtotal below free shipping threshold', () => {
      const method = makeShippingMethod({ rate: 7.99, freeAbove: 50 });
      expect(calculateShippingCost('ship', method, 49.99)).toBe(7.99);
    });

    it('should charge when freeAbove is null', () => {
      const method = makeShippingMethod({ rate: 5.99, freeAbove: null });
      expect(calculateShippingCost('ship', method, 1000)).toBe(5.99);
    });
  });

  describe('calculateTax', () => {
    it('should calculate tax correctly', () => {
      expect(calculateTax(100, 7)).toBeCloseTo(7);
      expect(calculateTax(50, 8.5)).toBeCloseTo(4.25);
    });

    it('should return 0 for 0 tax rate', () => {
      expect(calculateTax(100, 0)).toBe(0);
    });

    it('should return 0 for 0 subtotal', () => {
      expect(calculateTax(0, 7)).toBe(0);
    });
  });

  describe('calculateOrderTotal', () => {
    it('should sum subtotal + shipping + tax', () => {
      expect(calculateOrderTotal(100, 5.99, 7)).toBeCloseTo(112.99);
    });

    it('should handle zero shipping and tax', () => {
      expect(calculateOrderTotal(50, 0, 0)).toBe(50);
    });
  });

  describe('canProceedToShipping', () => {
    it('should return false for empty cart', () => {
      expect(canProceedToShipping([])).toBe(false);
    });

    it('should return true for non-empty cart', () => {
      expect(canProceedToShipping([makeCartItem()])).toBe(true);
    });
  });

  describe('canProceedToPayment', () => {
    const validAddress = makeAddress();

    it('should return false without customer name', () => {
      expect(canProceedToPayment('', 'test@example.com', 'ship', validAddress)).toBe(false);
    });

    it('should return false without customer email', () => {
      expect(canProceedToPayment('Jane', '', 'ship', validAddress)).toBe(false);
    });

    it('should return true for non-ship fulfillment with name+email', () => {
      const emptyAddress = makeAddress({ fullName: '', line1: '', city: '', state: '', postalCode: '' });
      expect(canProceedToPayment('Jane', 'jane@test.com', 'pickup', emptyAddress)).toBe(true);
      expect(canProceedToPayment('Jane', 'jane@test.com', 'curbside', emptyAddress)).toBe(true);
    });

    it('should require full address for ship fulfillment', () => {
      expect(canProceedToPayment('Jane', 'jane@test.com', 'ship', validAddress)).toBe(true);
    });

    it('should fail for ship with missing address fields', () => {
      expect(canProceedToPayment('Jane', 'jane@test.com', 'ship', makeAddress({ fullName: '' }))).toBe(false);
      expect(canProceedToPayment('Jane', 'jane@test.com', 'ship', makeAddress({ line1: '' }))).toBe(false);
      expect(canProceedToPayment('Jane', 'jane@test.com', 'ship', makeAddress({ city: '' }))).toBe(false);
      expect(canProceedToPayment('Jane', 'jane@test.com', 'ship', makeAddress({ state: '' }))).toBe(false);
      expect(canProceedToPayment('Jane', 'jane@test.com', 'ship', makeAddress({ postalCode: '' }))).toBe(false);
    });
  });

  describe('updateCartQuantity', () => {
    it('should update quantity at index', () => {
      const cart = [makeCartItem({ quantity: 1 }), makeCartItem({ itemId: 'i-2', quantity: 3 })];
      const result = updateCartQuantity(cart, 1, 5);
      expect(result[1].quantity).toBe(5);
      expect(result[0].quantity).toBe(1);
    });

    it('should remove item when quantity <= 0', () => {
      const cart = [makeCartItem()];
      expect(updateCartQuantity(cart, 0, 0)).toHaveLength(0);
      expect(updateCartQuantity(cart, 0, -1)).toHaveLength(0);
    });
  });

  describe('removeItem', () => {
    it('should remove item at index', () => {
      const cart = [
        makeCartItem({ itemId: 'i-1' }),
        makeCartItem({ itemId: 'i-2' }),
        makeCartItem({ itemId: 'i-3' }),
      ];
      const result = removeItem(cart, 1);
      expect(result).toHaveLength(2);
      expect(result.map(c => c.itemId)).toEqual(['i-1', 'i-3']);
    });
  });

  describe('handleFulfillmentTypeChange', () => {
    it('should clear shipping method when switching away from ship', () => {
      expect(handleFulfillmentTypeChange('pickup', 'sm-1')).toBeNull();
      expect(handleFulfillmentTypeChange('curbside', 'sm-1')).toBeNull();
      expect(handleFulfillmentTypeChange('local_delivery', 'sm-1')).toBeNull();
    });

    it('should keep shipping method when staying on ship', () => {
      expect(handleFulfillmentTypeChange('ship', 'sm-1')).toBe('sm-1');
    });

    it('should handle null shipping method on ship', () => {
      expect(handleFulfillmentTypeChange('ship', null)).toBeNull();
    });
  });
});
