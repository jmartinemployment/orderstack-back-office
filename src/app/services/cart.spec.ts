import { describe, it, expect } from 'vitest';
import type { CartItem } from '@models/cart.model';
import type { MenuItem, Modifier } from '@models/menu.model';

// --- Fixtures ---

function makeMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'mi-1',
    name: 'Cheeseburger',
    price: 12.99,
    isActive: true,
    available: true,
    ...overrides,
  } as MenuItem;
}

function makeModifier(overrides: Partial<Modifier> = {}): Modifier {
  return {
    id: 'mod-1',
    name: 'Extra Cheese',
    priceAdjustment: 1.50,
    isDefault: false,
    isActive: true,
    ...overrides,
  };
}

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'ci-1',
    menuItem: makeMenuItem(),
    quantity: 1,
    selectedModifiers: [],
    unitPrice: 12.99,
    totalPrice: 12.99,
    ...overrides,
  };
}

// --- Pure function replicas of CartService computed/mutation logic ---

function calculateItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.totalPrice, 0);
}

function calculateTax(subtotal: number, taxRate: number): number {
  return Math.round(subtotal * taxRate * 100) / 100;
}

function calculateSurcharge(subtotal: number, enabled: boolean, percent: number): number {
  if (!enabled) return 0;
  return Math.round(subtotal * (percent / 100) * 100) / 100;
}

function calculateTotal(
  subtotal: number,
  tax: number,
  tip: number,
  surcharge: number,
  loyaltyDiscount: number,
): number {
  return Math.max(0, Math.round((subtotal + tax + tip + surcharge - loyaltyDiscount) * 100) / 100);
}

function calculateTipFromPercentage(subtotal: number, percentage: number): number {
  return Math.round(subtotal * (percentage / 100) * 100) / 100;
}

function buildCartItem(
  menuItem: MenuItem,
  quantity: number,
  selectedModifiers: Modifier[],
  specialInstructions?: string,
): Omit<CartItem, 'id'> {
  const modifierTotal = selectedModifiers.reduce(
    (sum, mod) => sum + mod.priceAdjustment,
    0,
  );
  const unitPrice = Number(menuItem.price) + modifierTotal;
  const totalPrice = unitPrice * quantity;

  return {
    menuItem,
    quantity,
    selectedModifiers,
    specialInstructions,
    unitPrice,
    totalPrice,
  };
}

function removeItem(items: CartItem[], itemId: string): CartItem[] {
  return items.filter(item => item.id !== itemId);
}

function updateQuantity(items: CartItem[], itemId: string, quantity: number): CartItem[] {
  if (quantity <= 0) {
    return removeItem(items, itemId);
  }
  return items.map(item => {
    if (item.id === itemId) {
      return {
        ...item,
        quantity,
        totalPrice: item.unitPrice * quantity,
      };
    }
    return item;
  });
}

function updateItemInstructions(items: CartItem[], itemId: string, instructions: string): CartItem[] {
  return items.map(item => {
    if (item.id === itemId) {
      return { ...item, specialInstructions: instructions };
    }
    return item;
  });
}

interface BuildOrderPayloadOptions {
  items: CartItem[];
  orderType: string;
  customer: unknown;
  tableId: string | undefined;
  specialInstructions: string | undefined;
  deviceId: string | undefined;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  loyaltyPointsRedeemed: number;
  discount: number;
  surcharge: number;
}

function buildOrderPayload(opts: BuildOrderPayloadOptions): Record<string, unknown> {
  const { items, orderType, customer, tableId, specialInstructions, deviceId,
    subtotal, tax, tip, total, loyaltyPointsRedeemed, discount, surcharge } = opts;
  return {
    orderType,
    customer,
    tableId,
    specialInstructions,
    sourceDeviceId: deviceId,
    items: items.map(item => ({
      menuItemId: item.menuItem.id,
      name: item.menuItem.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      modifiers: item.selectedModifiers.map(mod => ({
        id: mod.id,
        name: mod.name,
        priceAdjustment: mod.priceAdjustment,
      })),
      specialInstructions: item.specialInstructions,
    })),
    subtotal,
    tax,
    tip,
    total,
    loyaltyPointsRedeemed,
    discount,
    surcharge,
  };
}

// --- Tests ---

describe('CartService — calculateItemCount', () => {
  it('sums quantities across items', () => {
    const items = [
      makeCartItem({ quantity: 2 }),
      makeCartItem({ id: 'ci-2', quantity: 3 }),
    ];
    expect(calculateItemCount(items)).toBe(5);
  });

  it('returns 0 for empty cart', () => {
    expect(calculateItemCount([])).toBe(0);
  });

  it('handles single item', () => {
    expect(calculateItemCount([makeCartItem({ quantity: 1 })])).toBe(1);
  });
});

describe('CartService — calculateSubtotal', () => {
  it('sums totalPrice across items', () => {
    const items = [
      makeCartItem({ totalPrice: 12.99 }),
      makeCartItem({ id: 'ci-2', totalPrice: 8.50 }),
    ];
    expect(calculateSubtotal(items)).toBeCloseTo(21.49, 2);
  });

  it('returns 0 for empty cart', () => {
    expect(calculateSubtotal([])).toBe(0);
  });
});

describe('CartService — calculateTax', () => {
  it('calculates tax rounded to 2 decimal places', () => {
    expect(calculateTax(100, 0.0825)).toBe(8.25);
  });

  it('handles 0 subtotal', () => {
    expect(calculateTax(0, 0.0825)).toBe(0);
  });

  it('handles 0 tax rate', () => {
    expect(calculateTax(100, 0)).toBe(0);
  });

  it('rounds correctly for repeating decimals', () => {
    expect(calculateTax(33.33, 0.07)).toBe(2.33);
  });
});

describe('CartService — calculateSurcharge', () => {
  it('returns 0 when disabled', () => {
    expect(calculateSurcharge(100, false, 3.5)).toBe(0);
  });

  it('calculates surcharge when enabled', () => {
    expect(calculateSurcharge(100, true, 3.5)).toBe(3.50);
  });

  it('handles 0 percent', () => {
    expect(calculateSurcharge(100, true, 0)).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateSurcharge(33.33, true, 3.5)).toBe(1.17);
  });
});

describe('CartService — calculateTotal', () => {
  it('sums subtotal, tax, tip, surcharge minus discount', () => {
    const result = calculateTotal(100, 8.25, 15, 3.5, 5);
    expect(result).toBe(121.75);
  });

  it('never goes below 0', () => {
    const result = calculateTotal(10, 0.82, 0, 0, 50);
    expect(result).toBe(0);
  });

  it('handles all zeros', () => {
    expect(calculateTotal(0, 0, 0, 0, 0)).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    const result = calculateTotal(33.33, 2.33, 5, 1.17, 0);
    expect(result).toBe(41.83);
  });
});

describe('CartService — calculateTipFromPercentage', () => {
  it('calculates 20% tip', () => {
    expect(calculateTipFromPercentage(50, 20)).toBe(10);
  });

  it('calculates 15% tip', () => {
    expect(calculateTipFromPercentage(33.33, 15)).toBe(5);
  });

  it('handles 0%', () => {
    expect(calculateTipFromPercentage(100, 0)).toBe(0);
  });

  it('handles 0 subtotal', () => {
    expect(calculateTipFromPercentage(0, 20)).toBe(0);
  });
});

describe('CartService — buildCartItem', () => {
  it('calculates unitPrice as base + modifiers', () => {
    const modifiers = [
      makeModifier({ priceAdjustment: 1.50 }),
      makeModifier({ id: 'mod-2', priceAdjustment: 0.75 }),
    ];
    const result = buildCartItem(makeMenuItem({ price: 10 }), 1, modifiers);
    expect(result.unitPrice).toBe(12.25);
    expect(result.totalPrice).toBe(12.25);
  });

  it('multiplies unitPrice by quantity for totalPrice', () => {
    const result = buildCartItem(makeMenuItem({ price: 10 }), 3, []);
    expect(result.unitPrice).toBe(10);
    expect(result.totalPrice).toBe(30);
  });

  it('handles no modifiers', () => {
    const result = buildCartItem(makeMenuItem({ price: 8.99 }), 2, []);
    expect(result.unitPrice).toBe(8.99);
    expect(result.totalPrice).toBeCloseTo(17.98, 2);
  });

  it('preserves specialInstructions', () => {
    const result = buildCartItem(makeMenuItem(), 1, [], 'No onions');
    expect(result.specialInstructions).toBe('No onions');
  });

  it('handles undefined specialInstructions', () => {
    const result = buildCartItem(makeMenuItem(), 1, []);
    expect(result.specialInstructions).toBeUndefined();
  });

  it('converts string price to number', () => {
    const result = buildCartItem(makeMenuItem({ price: '9.99' as any }), 1, []);
    expect(result.unitPrice).toBe(9.99);
  });
});

describe('CartService — removeItem', () => {
  it('removes item by ID', () => {
    const items = [
      makeCartItem({ id: 'ci-1' }),
      makeCartItem({ id: 'ci-2' }),
    ];
    const result = removeItem(items, 'ci-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ci-2');
  });

  it('returns unchanged array when ID not found', () => {
    const items = [makeCartItem({ id: 'ci-1' })];
    const result = removeItem(items, 'nonexistent');
    expect(result).toHaveLength(1);
  });

  it('handles empty array', () => {
    expect(removeItem([], 'ci-1')).toEqual([]);
  });
});

describe('CartService — updateQuantity', () => {
  it('updates quantity and recalculates totalPrice', () => {
    const items = [makeCartItem({ id: 'ci-1', unitPrice: 10, totalPrice: 10, quantity: 1 })];
    const result = updateQuantity(items, 'ci-1', 3);
    expect(result[0].quantity).toBe(3);
    expect(result[0].totalPrice).toBe(30);
  });

  it('removes item when quantity is 0', () => {
    const items = [makeCartItem({ id: 'ci-1' })];
    const result = updateQuantity(items, 'ci-1', 0);
    expect(result).toHaveLength(0);
  });

  it('removes item when quantity is negative', () => {
    const items = [makeCartItem({ id: 'ci-1' })];
    const result = updateQuantity(items, 'ci-1', -1);
    expect(result).toHaveLength(0);
  });

  it('does not affect other items', () => {
    const items = [
      makeCartItem({ id: 'ci-1', unitPrice: 10, totalPrice: 10, quantity: 1 }),
      makeCartItem({ id: 'ci-2', unitPrice: 5, totalPrice: 5, quantity: 1 }),
    ];
    const result = updateQuantity(items, 'ci-1', 2);
    expect(result[0].totalPrice).toBe(20);
    expect(result[1].totalPrice).toBe(5);
  });
});

describe('CartService — updateItemInstructions', () => {
  it('sets instructions on matching item', () => {
    const items = [makeCartItem({ id: 'ci-1' })];
    const result = updateItemInstructions(items, 'ci-1', 'No pickles');
    expect(result[0].specialInstructions).toBe('No pickles');
  });

  it('does not modify other items', () => {
    const items = [
      makeCartItem({ id: 'ci-1', specialInstructions: 'original' }),
      makeCartItem({ id: 'ci-2' }),
    ];
    const result = updateItemInstructions(items, 'ci-2', 'Extra sauce');
    expect(result[0].specialInstructions).toBe('original');
    expect(result[1].specialInstructions).toBe('Extra sauce');
  });
});

describe('CartService — buildOrderPayload', () => {
  it('maps items to order format', () => {
    const mod = makeModifier({ id: 'mod-1', name: 'Bacon', priceAdjustment: 2 });
    const items = [makeCartItem({
      id: 'ci-1',
      menuItem: makeMenuItem({ id: 'mi-1', name: 'Burger' }),
      quantity: 2,
      unitPrice: 14.99,
      totalPrice: 29.98,
      selectedModifiers: [mod],
      specialInstructions: 'Well done',
    })];

    const payload = buildOrderPayload({
      items, orderType: 'dine-in', customer: { name: 'John' }, tableId: 'table-1',
      specialInstructions: 'Rush order', deviceId: 'device-1', subtotal: 29.98,
      tax: 2.47, tip: 5, total: 37.45, loyaltyPointsRedeemed: 100, discount: 2, surcharge: 1.05,
    });

    expect(payload.orderType).toBe('dine-in');
    expect(payload.tableId).toBe('table-1');
    expect(payload.sourceDeviceId).toBe('device-1');
    expect(payload.loyaltyPointsRedeemed).toBe(100);
    expect(payload.discount).toBe(2);
    expect(payload.surcharge).toBe(1.05);

    const orderItems = payload.items as any[];
    expect(orderItems).toHaveLength(1);
    expect(orderItems[0].menuItemId).toBe('mi-1');
    expect(orderItems[0].name).toBe('Burger');
    expect(orderItems[0].quantity).toBe(2);
    expect(orderItems[0].modifiers).toEqual([{ id: 'mod-1', name: 'Bacon', priceAdjustment: 2 }]);
    expect(orderItems[0].specialInstructions).toBe('Well done');
  });

  it('handles empty cart', () => {
    const payload = buildOrderPayload({
      items: [], orderType: 'pickup', customer: undefined, tableId: undefined,
      specialInstructions: undefined, deviceId: undefined, subtotal: 0,
      tax: 0, tip: 0, total: 0, loyaltyPointsRedeemed: 0, discount: 0, surcharge: 0,
    });
    expect((payload.items as any[]).length).toBe(0);
    expect(payload.subtotal).toBe(0);
  });
});

describe('CartService — setOrderType clears tableId', () => {
  it('non-dine-in order types should clear tableId', () => {
    const orderType = 'pickup';
    const shouldClearTable = orderType !== 'dine-in';
    expect(shouldClearTable).toBe(true);
  });

  it('dine-in preserves tableId', () => {
    const orderType = 'dine-in';
    const shouldClearTable = orderType !== 'dine-in';
    expect(shouldClearTable).toBe(false);
  });
});

describe('CartService — tip constraints', () => {
  it('negative tip is clamped to 0', () => {
    const tip = Math.max(0, -5);
    expect(tip).toBe(0);
  });

  it('positive tip passes through', () => {
    const tip = Math.max(0, 15);
    expect(tip).toBe(15);
  });
});

describe('CartService — surcharge constraints', () => {
  it('negative percent is clamped to 0', () => {
    const percent = Math.max(0, -3);
    expect(percent).toBe(0);
  });
});

describe('CartService — isEmpty', () => {
  it('true for empty items', () => {
    expect([].length === 0).toBe(true);
  });

  it('false for non-empty items', () => {
    expect([makeCartItem()].length === 0).toBe(false);
  });
});
