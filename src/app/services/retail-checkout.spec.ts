import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface RetailCartItem {
  itemId: string;
  variationId: string | null;
  quantity: number;
  unitPrice: number;
  priceOverride: number | null;
  priceOverrideReason: string | null;
  weight: number | null;
  discount: number;
}

interface ServerTipSummary {
  serverName: string;
  netTips: number;
}

// --- Pure function replicas ---

function cartItemCount(cart: RetailCartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function cartSubtotal(cart: RetailCartItem[]): number {
  return cart.reduce((sum, item) => {
    const price = item.priceOverride ?? item.unitPrice;
    const qty = item.weight ?? item.quantity;
    return sum + (price * qty) - item.discount;
  }, 0);
}

function cartDiscount(cart: RetailCartItem[]): number {
  return cart.reduce((sum, item) => sum + item.discount, 0);
}

function cartTax(subtotal: number): number {
  return subtotal * 0.07;
}

function cartTotal(subtotal: number): number {
  return subtotal + cartTax(subtotal);
}

// Cart mutations
function addToCart(cart: RetailCartItem[], itemId: string, variationId: string | null, unitPrice: number): RetailCartItem[] {
  const existing = cart.findIndex(c => c.itemId === itemId && c.variationId === variationId);
  if (existing >= 0) {
    return cart.map((c, i) => i === existing ? { ...c, quantity: c.quantity + 1 } : c);
  }
  return [...cart, {
    itemId,
    variationId,
    quantity: 1,
    unitPrice,
    priceOverride: null,
    priceOverrideReason: null,
    weight: null,
    discount: 0,
  }];
}

function removeItem(cart: RetailCartItem[], index: number): RetailCartItem[] {
  return cart.filter((_, i) => i !== index);
}

function updateQuantity(cart: RetailCartItem[], index: number, quantity: number): RetailCartItem[] {
  if (quantity <= 0) return removeItem(cart, index);
  return cart.map((c, i) => i === index ? { ...c, quantity } : c);
}

function setWeight(cart: RetailCartItem[], index: number, weight: number): RetailCartItem[] {
  return cart.map((c, i) => i === index ? { ...c, weight } : c);
}

function applyItemDiscount(cart: RetailCartItem[], index: number, discount: number): RetailCartItem[] {
  return cart.map((c, i) => i === index ? { ...c, discount } : c);
}

function overridePrice(cart: RetailCartItem[], index: number, price: number, reason: string): RetailCartItem[] {
  return cart.map((c, i) => i === index ? { ...c, priceOverride: price, priceOverrideReason: reason } : c);
}

// --- Tests ---

const cart: RetailCartItem[] = [
  { itemId: 'i-1', variationId: null, quantity: 2, unitPrice: 10, priceOverride: null, priceOverrideReason: null, weight: null, discount: 0 },
  { itemId: 'i-2', variationId: 'v-1', quantity: 1, unitPrice: 25, priceOverride: null, priceOverrideReason: null, weight: null, discount: 5 },
];

describe('RetailCheckoutService — cartItemCount', () => {
  it('sums quantities', () => {
    expect(cartItemCount(cart)).toBe(3);
  });

  it('returns 0 for empty cart', () => {
    expect(cartItemCount([])).toBe(0);
  });
});

describe('RetailCheckoutService — cartSubtotal', () => {
  it('computes subtotal with discounts', () => {
    // (10 * 2) - 0 + (25 * 1) - 5 = 20 + 20 = 40
    expect(cartSubtotal(cart)).toBe(40);
  });

  it('uses priceOverride when set', () => {
    const overridden: RetailCartItem[] = [
      { itemId: 'i-1', variationId: null, quantity: 1, unitPrice: 10, priceOverride: 8, priceOverrideReason: 'Damaged', weight: null, discount: 0 },
    ];
    expect(cartSubtotal(overridden)).toBe(8);
  });

  it('uses weight instead of quantity when set', () => {
    const weighted: RetailCartItem[] = [
      { itemId: 'i-1', variationId: null, quantity: 1, unitPrice: 5, priceOverride: null, priceOverrideReason: null, weight: 2.5, discount: 0 },
    ];
    expect(cartSubtotal(weighted)).toBe(12.5);
  });

  it('returns 0 for empty cart', () => {
    expect(cartSubtotal([])).toBe(0);
  });
});

describe('RetailCheckoutService — cartDiscount', () => {
  it('sums discounts', () => {
    expect(cartDiscount(cart)).toBe(5);
  });

  it('returns 0 for empty', () => {
    expect(cartDiscount([])).toBe(0);
  });
});

describe('RetailCheckoutService — cartTax / cartTotal', () => {
  it('computes 7% tax', () => {
    expect(cartTax(100)).toBeCloseTo(7);
  });

  it('computes total with tax', () => {
    expect(cartTotal(100)).toBeCloseTo(107);
  });
});

describe('RetailCheckoutService — cart mutations', () => {
  it('addToCart creates new item', () => {
    const result = addToCart([], 'i-1', null, 10);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(1);
    expect(result[0].unitPrice).toBe(10);
  });

  it('addToCart increments existing item', () => {
    const result = addToCart(cart, 'i-1', null, 10);
    expect(result).toHaveLength(2);
    expect(result[0].quantity).toBe(3);
  });

  it('addToCart treats different variationId as new item', () => {
    const result = addToCart(cart, 'i-1', 'v-new', 10);
    expect(result).toHaveLength(3);
  });

  it('removeItem removes by index', () => {
    expect(removeItem(cart, 0)).toHaveLength(1);
    expect(removeItem(cart, 0)[0].itemId).toBe('i-2');
  });

  it('updateQuantity changes quantity', () => {
    const result = updateQuantity(cart, 0, 5);
    expect(result[0].quantity).toBe(5);
  });

  it('updateQuantity removes item when quantity <= 0', () => {
    expect(updateQuantity(cart, 0, 0)).toHaveLength(1);
    expect(updateQuantity(cart, 0, -1)).toHaveLength(1);
  });

  it('setWeight sets weight on item', () => {
    const result = setWeight(cart, 0, 1.5);
    expect(result[0].weight).toBe(1.5);
  });

  it('applyItemDiscount sets discount', () => {
    const result = applyItemDiscount(cart, 0, 3);
    expect(result[0].discount).toBe(3);
  });

  it('overridePrice sets price and reason', () => {
    const result = overridePrice(cart, 0, 7, 'Manager discount');
    expect(result[0].priceOverride).toBe(7);
    expect(result[0].priceOverrideReason).toBe('Manager discount');
  });
});
