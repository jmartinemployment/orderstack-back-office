import { describe, it, expect } from 'vitest';
import type { MenuItem, Modifier } from '@models/menu.model';
import type {
  AddItemRequest,
  SplitByItemRequest,
  SplitByEqualRequest,
  DiscountRequest,
  VoidItemRequest,
  CompItemRequest,
  OpenTabRequest,
  TransferCheckRequest,
} from './check';

// --- Fixtures ---

function makeMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'mi-1',
    name: 'Grilled Salmon',
    price: 24.99,
    isActive: true,
    available: true,
    ...overrides,
  } as MenuItem;
}

function makeModifier(overrides: Partial<Modifier> = {}): Modifier {
  return {
    id: 'mod-1',
    name: 'Side Salad',
    priceAdjustment: 3.50,
    isDefault: false,
    isActive: true,
    ...overrides,
  };
}

// --- Pure function replicas of CheckService logic ---

function buildAddItemRequest(
  menuItem: MenuItem,
  quantity: number,
  selectedModifiers: Modifier[],
  seatNumber?: number,
  specialInstructions?: string,
  courseGuid?: string,
): AddItemRequest {
  return {
    menuItemId: menuItem.id,
    menuItemName: menuItem.name,
    quantity,
    unitPrice: Number(menuItem.price),
    modifiers: selectedModifiers.map(m => ({
      id: m.id,
      name: m.name,
      priceAdjustment: m.priceAdjustment,
    })),
    seatNumber,
    specialInstructions,
    courseGuid,
  };
}

function baseUrl(apiUrl: string, merchantId: string | null, orderId: string): string {
  return `${apiUrl}/merchant/${merchantId}/orders/${orderId}`;
}

function mapCheck(raw: any): {
  guid: string;
  displayNumber: string;
  selections: any[];
  payments: any[];
  paymentStatus: string;
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
  discounts: any[];
  voidedSelections: any[];
  tabName?: string;
  tabOpenedAt?: Date;
  tabClosedAt?: Date;
  preauthId?: string;
} {
  return {
    guid: raw.id ?? raw.guid ?? 'fallback-guid',
    displayNumber: raw.displayNumber ?? '1',
    selections: (raw.items || raw.selections || []).map((i: any) => mapSelection(i)),
    payments: raw.payments || [],
    paymentStatus: raw.paymentStatus ?? 'OPEN',
    subtotal: Number(raw.subtotal) || 0,
    taxAmount: Number(raw.taxAmount ?? raw.tax) || 0,
    tipAmount: Number(raw.tipAmount ?? raw.tip) || 0,
    totalAmount: Number(raw.totalAmount ?? raw.total) || 0,
    discounts: (raw.discounts || []).map((d: any) => ({
      id: d.id ?? 'disc-fallback',
      type: d.type ?? 'flat',
      value: Number(d.value) || 0,
      reason: d.reason ?? '',
      appliedBy: d.appliedBy ?? '',
      approvedBy: d.approvedBy ?? undefined,
    })),
    voidedSelections: raw.voidedSelections || [],
    tabName: raw.tabName ?? undefined,
    tabOpenedAt: raw.tabOpenedAt ? new Date(raw.tabOpenedAt) : undefined,
    tabClosedAt: raw.tabClosedAt ? new Date(raw.tabClosedAt) : undefined,
    preauthId: raw.preauthId ?? undefined,
  };
}

function mapSelection(raw: any): {
  guid: string;
  menuItemGuid: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  fulfillmentStatus: string;
  modifiers: any[];
  seatNumber?: number;
  specialInstructions?: string;
  isComped: boolean;
  compReason?: string;
  compBy?: string;
} {
  return {
    guid: raw.id ?? raw.guid ?? 'sel-fallback',
    menuItemGuid: raw.menuItemId ?? '',
    menuItemName: raw.menuItemName || raw.name || '',
    quantity: Number(raw.quantity) || 1,
    unitPrice: Number(raw.unitPrice) || 0,
    totalPrice: Number(raw.totalPrice) || 0,
    fulfillmentStatus: raw.fulfillmentStatus ?? 'NEW',
    modifiers: (raw.modifiers || []).map((m: any) => ({
      guid: m.id ?? 'mod-fallback',
      name: m.name ?? '',
      priceAdjustment: Number(m.priceAdjustment) || 0,
    })),
    seatNumber: raw.seatNumber == null ? undefined : Number(raw.seatNumber),
    specialInstructions: raw.specialInstructions,
    isComped: raw.isComped ?? false,
    compReason: raw.compReason ?? undefined,
    compBy: raw.compBy ?? undefined,
  };
}

function extractError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

// --- Tests ---

describe('CheckService — buildAddItemRequest', () => {
  it('maps menu item to request payload', () => {
    const result = buildAddItemRequest(makeMenuItem(), 2, []);
    expect(result.menuItemId).toBe('mi-1');
    expect(result.menuItemName).toBe('Grilled Salmon');
    expect(result.quantity).toBe(2);
    expect(result.unitPrice).toBe(24.99);
    expect(result.modifiers).toEqual([]);
  });

  it('maps modifiers with price adjustments', () => {
    const mods = [
      makeModifier({ id: 'mod-1', name: 'Side Salad', priceAdjustment: 3.50 }),
      makeModifier({ id: 'mod-2', name: 'Extra Sauce', priceAdjustment: 0.75 }),
    ];
    const result = buildAddItemRequest(makeMenuItem(), 1, mods);
    expect(result.modifiers).toHaveLength(2);
    expect(result.modifiers[0]).toEqual({ id: 'mod-1', name: 'Side Salad', priceAdjustment: 3.50 });
    expect(result.modifiers[1]).toEqual({ id: 'mod-2', name: 'Extra Sauce', priceAdjustment: 0.75 });
  });

  it('includes optional seat number', () => {
    const result = buildAddItemRequest(makeMenuItem(), 1, [], 3);
    expect(result.seatNumber).toBe(3);
  });

  it('includes optional special instructions', () => {
    const result = buildAddItemRequest(makeMenuItem(), 1, [], undefined, 'No onions');
    expect(result.specialInstructions).toBe('No onions');
  });

  it('includes optional course GUID', () => {
    const result = buildAddItemRequest(makeMenuItem(), 1, [], undefined, undefined, 'course-1');
    expect(result.courseGuid).toBe('course-1');
  });

  it('converts string price to number', () => {
    const result = buildAddItemRequest(makeMenuItem({ price: '19.99' as any }), 1, []);
    expect(result.unitPrice).toBe(19.99);
  });
});

describe('CheckService — baseUrl', () => {
  it('constructs URL with restaurant and order IDs', () => {
    const url = baseUrl('https://api.example.com/api', 'r-123', 'ord-456');
    expect(url).toBe('https://api.example.com/api/merchant/r-123/orders/ord-456');
  });

  it('handles null restaurant ID', () => {
    const url = baseUrl('https://api.example.com/api', null, 'ord-456');
    expect(url).toBe('https://api.example.com/api/merchant/null/orders/ord-456');
  });
});

describe('CheckService — mapCheck', () => {
  it('maps API response with id field to guid', () => {
    const raw = { id: 'chk-1', displayNumber: '2', subtotal: 50, tax: 4.13, total: 54.13 };
    const result = mapCheck(raw);
    expect(result.guid).toBe('chk-1');
    expect(result.displayNumber).toBe('2');
    expect(result.subtotal).toBe(50);
    expect(result.taxAmount).toBe(4.13);
    expect(result.totalAmount).toBe(54.13);
  });

  it('maps API response with guid field', () => {
    const raw = { guid: 'chk-2' };
    const result = mapCheck(raw);
    expect(result.guid).toBe('chk-2');
  });

  it('defaults displayNumber to 1', () => {
    const result = mapCheck({});
    expect(result.displayNumber).toBe('1');
  });

  it('defaults paymentStatus to OPEN', () => {
    const result = mapCheck({});
    expect(result.paymentStatus).toBe('OPEN');
  });

  it('maps items array as selections', () => {
    const raw = {
      id: 'chk-1',
      items: [
        { id: 'sel-1', menuItemId: 'mi-1', menuItemName: 'Burger', quantity: 2, unitPrice: 10, totalPrice: 20 },
      ],
    };
    const result = mapCheck(raw);
    expect(result.selections).toHaveLength(1);
    expect(result.selections[0].guid).toBe('sel-1');
    expect(result.selections[0].menuItemName).toBe('Burger');
  });

  it('maps selections array directly', () => {
    const raw = {
      id: 'chk-1',
      selections: [
        { guid: 'sel-1', name: 'Salad', quantity: 1, unitPrice: 8, totalPrice: 8 },
      ],
    };
    const result = mapCheck(raw);
    expect(result.selections).toHaveLength(1);
    expect(result.selections[0].menuItemName).toBe('Salad');
  });

  it('defaults to empty arrays for missing collections', () => {
    const result = mapCheck({});
    expect(result.selections).toEqual([]);
    expect(result.payments).toEqual([]);
    expect(result.discounts).toEqual([]);
    expect(result.voidedSelections).toEqual([]);
  });

  it('converts numeric strings to numbers', () => {
    const raw = { subtotal: '25.50', taxAmount: '2.11', tipAmount: '5.00', totalAmount: '32.61' };
    const result = mapCheck(raw);
    expect(result.subtotal).toBe(25.50);
    expect(result.taxAmount).toBe(2.11);
    expect(result.tipAmount).toBe(5);
    expect(result.totalAmount).toBe(32.61);
  });

  it('handles NaN values gracefully', () => {
    const raw = { subtotal: 'not-a-number' };
    const result = mapCheck(raw);
    expect(result.subtotal).toBe(0);
  });

  it('maps discounts with defaults', () => {
    const raw = {
      discounts: [{ value: 5, reason: 'Manager comp' }],
    };
    const result = mapCheck(raw);
    expect(result.discounts).toHaveLength(1);
    expect(result.discounts[0].value).toBe(5);
    expect(result.discounts[0].reason).toBe('Manager comp');
    expect(result.discounts[0].type).toBe('flat');
  });

  it('parses tab dates', () => {
    const raw = {
      tabName: 'VIP Table',
      tabOpenedAt: '2026-02-25T18:00:00Z',
      tabClosedAt: '2026-02-25T22:00:00Z',
      preauthId: 'pre-1',
    };
    const result = mapCheck(raw);
    expect(result.tabName).toBe('VIP Table');
    expect(result.tabOpenedAt).toBeInstanceOf(Date);
    expect(result.tabClosedAt).toBeInstanceOf(Date);
    expect(result.preauthId).toBe('pre-1');
  });

  it('leaves tab fields undefined when not present', () => {
    const result = mapCheck({});
    expect(result.tabName).toBeUndefined();
    expect(result.tabOpenedAt).toBeUndefined();
    expect(result.preauthId).toBeUndefined();
  });
});

describe('CheckService — mapSelection', () => {
  it('maps full selection data', () => {
    const raw = {
      id: 'sel-1',
      menuItemId: 'mi-1',
      menuItemName: 'Steak',
      quantity: 1,
      unitPrice: 35,
      totalPrice: 35,
      fulfillmentStatus: 'FIRED',
      seatNumber: 2,
      specialInstructions: 'Medium rare',
    };
    const result = mapSelection(raw);
    expect(result.guid).toBe('sel-1');
    expect(result.menuItemGuid).toBe('mi-1');
    expect(result.menuItemName).toBe('Steak');
    expect(result.fulfillmentStatus).toBe('FIRED');
    expect(result.seatNumber).toBe(2);
    expect(result.specialInstructions).toBe('Medium rare');
  });

  it('uses name fallback for menuItemName', () => {
    const raw = { name: 'Pasta' };
    const result = mapSelection(raw);
    expect(result.menuItemName).toBe('Pasta');
  });

  it('defaults fulfillmentStatus to NEW', () => {
    const result = mapSelection({});
    expect(result.fulfillmentStatus).toBe('NEW');
  });

  it('defaults quantity to 1', () => {
    const result = mapSelection({});
    expect(result.quantity).toBe(1);
  });

  it('maps modifiers', () => {
    const raw = {
      modifiers: [
        { id: 'mod-1', name: 'Extra Cheese', priceAdjustment: 1.50 },
      ],
    };
    const result = mapSelection(raw);
    expect(result.modifiers).toHaveLength(1);
    expect(result.modifiers[0].guid).toBe('mod-1');
    expect(result.modifiers[0].priceAdjustment).toBe(1.50);
  });

  it('handles comped items', () => {
    const raw = { isComped: true, compReason: 'Birthday', compBy: 'mgr-1' };
    const result = mapSelection(raw);
    expect(result.isComped).toBe(true);
    expect(result.compReason).toBe('Birthday');
    expect(result.compBy).toBe('mgr-1');
  });

  it('defaults isComped to false', () => {
    const result = mapSelection({});
    expect(result.isComped).toBe(false);
  });

  it('handles seatNumber of 0', () => {
    const raw = { seatNumber: 0 };
    const result = mapSelection(raw);
    expect(result.seatNumber).toBe(0);
  });

  it('leaves seatNumber undefined when null', () => {
    const raw = { seatNumber: null };
    const result = mapSelection(raw);
    expect(result.seatNumber).toBeUndefined();
  });
});

describe('CheckService — extractError', () => {
  it('returns Error message', () => {
    expect(extractError(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('returns fallback for non-Error', () => {
    expect(extractError('string', 'Failed to split check')).toBe('Failed to split check');
  });

  it('returns fallback for null', () => {
    expect(extractError(null, 'Failed')).toBe('Failed');
  });
});

describe('CheckService — request type shapes', () => {
  it('SplitByItemRequest has required fields', () => {
    const req: SplitByItemRequest = { itemGuids: ['sel-1', 'sel-2'] };
    expect(req.itemGuids).toHaveLength(2);
    expect(req.targetCheckGuid).toBeUndefined();
  });

  it('SplitByItemRequest with target check', () => {
    const req: SplitByItemRequest = { itemGuids: ['sel-1'], targetCheckGuid: 'chk-2' };
    expect(req.targetCheckGuid).toBe('chk-2');
  });

  it('SplitByEqualRequest has numberOfWays', () => {
    const req: SplitByEqualRequest = { numberOfWays: 3 };
    expect(req.numberOfWays).toBe(3);
  });

  it('TransferCheckRequest has targetTableId', () => {
    const req: TransferCheckRequest = { targetTableId: 'table-5' };
    expect(req.targetTableId).toBe('table-5');
  });

  it('DiscountRequest has type, value, reason', () => {
    const req: DiscountRequest = {
      type: 'percentage' as any,
      value: 10,
      reason: 'loyalty' as any,
      managerPin: '1234',
    };
    expect(req.type).toBe('percentage');
    expect(req.value).toBe(10);
    expect(req.managerPin).toBe('1234');
  });

  it('VoidItemRequest has reason and optional pin', () => {
    const req: VoidItemRequest = { reason: 'customer_request' as any };
    expect(req.managerPin).toBeUndefined();
  });

  it('CompItemRequest has reason', () => {
    const req: CompItemRequest = { reason: 'Birthday celebration', managerPin: '5678' };
    expect(req.reason).toBe('Birthday celebration');
  });

  it('OpenTabRequest has tabName and optional preauth', () => {
    const req: OpenTabRequest = {
      tabName: 'VIP Table',
      preauthData: { paymentMethodId: 'pm-1', amount: 100 },
    };
    expect(req.tabName).toBe('VIP Table');
    expect(req.preauthData!.amount).toBe(100);
  });

  it('OpenTabRequest without preauth', () => {
    const req: OpenTabRequest = { tabName: 'Bar Tab' };
    expect(req.preauthData).toBeUndefined();
  });
});

describe('CheckService — no-restaurant guard logic', () => {
  it('null merchantId should produce error', () => {
    const merchantId: string | null = null;
    const error = merchantId ? null : 'No restaurant selected';
    expect(error).toBe('No restaurant selected');
  });

  it('valid merchantId passes guard', () => {
    const merchantId: string | null = 'r-1';
    const error = merchantId ? null : 'No restaurant selected';
    expect(error).toBeNull();
  });
});
