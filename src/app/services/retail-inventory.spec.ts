import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface RetailStockRecord {
  id: string;
  itemId: string;
  variationId: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  lowStockThreshold: number;
  totalStockValue: number;
  averageCostPerUnit: number;
}

interface StockTransfer {
  id: string;
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
}

interface StockAlert {
  id: string;
  message: string;
  acknowledged: boolean;
}

interface StockAdjustment {
  id: string;
  itemId: string;
  variationId: string | null;
  quantity: number;
}

// --- Pure function replicas ---

function lowStockItems(stock: RetailStockRecord[]): RetailStockRecord[] {
  return stock.filter(s => s.quantityAvailable <= s.lowStockThreshold && s.quantityAvailable > 0);
}

function outOfStockItems(stock: RetailStockRecord[]): RetailStockRecord[] {
  return stock.filter(s => s.quantityAvailable <= 0);
}

function totalStockValue(stock: RetailStockRecord[]): number {
  return stock.reduce((sum, s) => sum + s.totalStockValue, 0);
}

function pendingTransfers(transfers: StockTransfer[]): StockTransfer[] {
  return transfers.filter(t => t.status === 'pending' || t.status === 'in_transit');
}

function unresolvedAlerts(alerts: StockAlert[]): StockAlert[] {
  return alerts.filter(a => !a.acknowledged);
}

function getStockForItem(stock: RetailStockRecord[], itemId: string): RetailStockRecord[] {
  return stock.filter(s => s.itemId === itemId);
}

function adjustStockLocally(stock: RetailStockRecord[], itemId: string, variationId: string | null, quantity: number): RetailStockRecord[] {
  return stock.map(s => {
    if (s.itemId === itemId && s.variationId === variationId) {
      const newQty = s.quantityOnHand + quantity;
      return {
        ...s,
        quantityOnHand: newQty,
        quantityAvailable: newQty - s.quantityReserved,
        totalStockValue: newQty * s.averageCostPerUnit,
      };
    }
    return s;
  });
}

function acknowledgeAlertInList(alerts: StockAlert[], alertId: string): StockAlert[] {
  return alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a);
}

function prependAdjustment(adjustments: StockAdjustment[], adj: StockAdjustment): StockAdjustment[] {
  return [adj, ...adjustments];
}

// --- Tests ---

const stock: RetailStockRecord[] = [
  { id: 's-1', itemId: 'i-1', variationId: null, quantityOnHand: 5, quantityReserved: 0, quantityAvailable: 5, lowStockThreshold: 10, totalStockValue: 50, averageCostPerUnit: 10 },
  { id: 's-2', itemId: 'i-2', variationId: 'v-1', quantityOnHand: 0, quantityReserved: 0, quantityAvailable: 0, lowStockThreshold: 5, totalStockValue: 0, averageCostPerUnit: 15 },
  { id: 's-3', itemId: 'i-3', variationId: null, quantityOnHand: 100, quantityReserved: 10, quantityAvailable: 90, lowStockThreshold: 20, totalStockValue: 500, averageCostPerUnit: 5 },
];

describe('RetailInventoryService — lowStockItems', () => {
  it('filters items at or below threshold with positive stock', () => {
    const result = lowStockItems(stock);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s-1'); // 5 <= 10 and > 0
  });
});

describe('RetailInventoryService — outOfStockItems', () => {
  it('filters items with 0 or negative availability', () => {
    const result = outOfStockItems(stock);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s-2');
  });
});

describe('RetailInventoryService — totalStockValue', () => {
  it('sums all stock values', () => {
    expect(totalStockValue(stock)).toBe(550);
  });

  it('returns 0 for empty', () => {
    expect(totalStockValue([])).toBe(0);
  });
});

describe('RetailInventoryService — pendingTransfers', () => {
  it('filters pending and in_transit', () => {
    const transfers: StockTransfer[] = [
      { id: 't-1', status: 'pending' },
      { id: 't-2', status: 'in_transit' },
      { id: 't-3', status: 'completed' },
      { id: 't-4', status: 'cancelled' },
    ];
    expect(pendingTransfers(transfers)).toHaveLength(2);
  });
});

describe('RetailInventoryService — unresolvedAlerts', () => {
  it('filters unacknowledged alerts', () => {
    const alerts: StockAlert[] = [
      { id: 'a-1', message: 'Low', acknowledged: false },
      { id: 'a-2', message: 'Out', acknowledged: true },
    ];
    expect(unresolvedAlerts(alerts)).toHaveLength(1);
  });
});

describe('RetailInventoryService — getStockForItem', () => {
  it('returns matching item records', () => {
    expect(getStockForItem(stock, 'i-1')).toHaveLength(1);
  });

  it('returns empty for no match', () => {
    expect(getStockForItem(stock, 'i-999')).toHaveLength(0);
  });
});

describe('RetailInventoryService — adjustStockLocally', () => {
  it('increases stock quantity', () => {
    const result = adjustStockLocally(stock, 'i-1', null, 10);
    const updated = result.find(s => s.id === 's-1')!;
    expect(updated.quantityOnHand).toBe(15);
    expect(updated.quantityAvailable).toBe(15);
    expect(updated.totalStockValue).toBe(150);
  });

  it('decreases stock quantity', () => {
    const result = adjustStockLocally(stock, 'i-1', null, -3);
    const updated = result.find(s => s.id === 's-1')!;
    expect(updated.quantityOnHand).toBe(2);
    expect(updated.quantityAvailable).toBe(2);
    expect(updated.totalStockValue).toBe(20);
  });

  it('respects reserved quantity when adjusting', () => {
    const result = adjustStockLocally(stock, 'i-3', null, -20);
    const updated = result.find(s => s.id === 's-3')!;
    expect(updated.quantityOnHand).toBe(80);
    expect(updated.quantityAvailable).toBe(70); // 80 - 10 reserved
  });

  it('does not modify non-matching items', () => {
    const result = adjustStockLocally(stock, 'i-999', null, 10);
    expect(result).toEqual(stock);
  });
});

describe('RetailInventoryService — alert/adjustment mutations', () => {
  it('acknowledgeAlertInList sets acknowledged', () => {
    const alerts: StockAlert[] = [{ id: 'a-1', message: 'Low', acknowledged: false }];
    const result = acknowledgeAlertInList(alerts, 'a-1');
    expect(result[0].acknowledged).toBe(true);
  });

  it('prependAdjustment adds to beginning', () => {
    const adj: StockAdjustment[] = [{ id: 'adj-1', itemId: 'i-1', variationId: null, quantity: 5 }];
    const result = prependAdjustment(adj, { id: 'adj-2', itemId: 'i-2', variationId: null, quantity: 10 });
    expect(result[0].id).toBe('adj-2');
    expect(result).toHaveLength(2);
  });
});
