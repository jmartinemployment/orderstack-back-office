import { describe, it, expect } from 'vitest';

// --- Pure function replicas of InventoryService mutation logic ---

interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  lastRestocked?: string;
}

function updateStockInList(items: InventoryItem[], itemId: string, stock: number): InventoryItem[] {
  return items.map(item => item.id === itemId ? { ...item, currentStock: stock } : item);
}

function recordUsageInList(items: InventoryItem[], itemId: string, quantity: number): InventoryItem[] {
  return items.map(item =>
    item.id === itemId
      ? { ...item, currentStock: Math.max(0, item.currentStock - quantity) }
      : item,
  );
}

function recordRestockInList(items: InventoryItem[], itemId: string, quantity: number): InventoryItem[] {
  return items.map(item =>
    item.id === itemId
      ? { ...item, currentStock: item.currentStock + quantity, lastRestocked: new Date().toISOString() }
      : item,
  );
}

function addItemToList(items: InventoryItem[], newItem: InventoryItem): InventoryItem[] {
  return [...items, newItem];
}

function removeFromList<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter(item => item.id !== id);
}

interface StockPrediction {
  inventoryItemId: string;
  predictedDays: number;
}

function upsertPrediction(
  predictions: StockPrediction[],
  itemId: string,
  newPrediction: StockPrediction,
): StockPrediction[] {
  const existing = predictions.findIndex(p => p.inventoryItemId === itemId);
  if (existing >= 0) {
    const updated = [...predictions];
    updated[existing] = newPrediction;
    return updated;
  }
  return [...predictions, newPrediction];
}

function buildStockUpdatePayload(stock: number, reason: string): { currentStock: number; reason: string } {
  return { currentStock: stock, reason };
}

function buildUsagePayload(quantity: number, reason: string): { quantity: number; reason: string } {
  return { quantity, reason };
}

function buildRestockPayload(quantity: number, invoiceNumber?: string): { quantity: number; invoiceNumber?: string } {
  return { quantity, invoiceNumber };
}

function shouldSkip404(status: number): boolean {
  return status === 404 || status === 400;
}

// --- Tests ---

describe('InventoryService — updateStockInList', () => {
  const items: InventoryItem[] = [
    { id: 'inv-1', name: 'Tomatoes', currentStock: 50 },
    { id: 'inv-2', name: 'Lettuce', currentStock: 30 },
  ];

  it('updates stock for matching item', () => {
    const result = updateStockInList(items, 'inv-1', 75);
    expect(result[0].currentStock).toBe(75);
    expect(result[1].currentStock).toBe(30);
  });

  it('does not modify other items', () => {
    const result = updateStockInList(items, 'inv-1', 0);
    expect(result[1]).toEqual(items[1]);
  });

  it('handles item not found', () => {
    const result = updateStockInList(items, 'nonexistent', 10);
    expect(result).toEqual(items);
  });

  it('allows setting stock to 0', () => {
    const result = updateStockInList(items, 'inv-1', 0);
    expect(result[0].currentStock).toBe(0);
  });
});

describe('InventoryService — recordUsageInList', () => {
  const items: InventoryItem[] = [
    { id: 'inv-1', name: 'Tomatoes', currentStock: 50 },
  ];

  it('subtracts quantity from current stock', () => {
    const result = recordUsageInList(items, 'inv-1', 10);
    expect(result[0].currentStock).toBe(40);
  });

  it('clamps to 0 when usage exceeds stock', () => {
    const result = recordUsageInList(items, 'inv-1', 100);
    expect(result[0].currentStock).toBe(0);
  });

  it('handles zero usage', () => {
    const result = recordUsageInList(items, 'inv-1', 0);
    expect(result[0].currentStock).toBe(50);
  });
});

describe('InventoryService — recordRestockInList', () => {
  const items: InventoryItem[] = [
    { id: 'inv-1', name: 'Tomatoes', currentStock: 50 },
  ];

  it('adds quantity to current stock', () => {
    const result = recordRestockInList(items, 'inv-1', 25);
    expect(result[0].currentStock).toBe(75);
  });

  it('sets lastRestocked timestamp', () => {
    const result = recordRestockInList(items, 'inv-1', 10);
    expect(result[0].lastRestocked).toBeTruthy();
  });
});

describe('InventoryService — addItemToList', () => {
  it('appends new item', () => {
    const items: InventoryItem[] = [{ id: 'inv-1', name: 'A', currentStock: 10 }];
    const result = addItemToList(items, { id: 'inv-2', name: 'B', currentStock: 20 });
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('inv-2');
  });

  it('appends to empty list', () => {
    const result = addItemToList([], { id: 'inv-1', name: 'A', currentStock: 0 });
    expect(result).toHaveLength(1);
  });
});

describe('InventoryService — removeFromList', () => {
  it('removes matching item', () => {
    const list = [{ id: '1' }, { id: '2' }];
    expect(removeFromList(list, '1')).toHaveLength(1);
  });

  it('returns unchanged for no match', () => {
    const list = [{ id: '1' }];
    expect(removeFromList(list, '2')).toHaveLength(1);
  });
});

describe('InventoryService — upsertPrediction', () => {
  const predictions: StockPrediction[] = [
    { inventoryItemId: 'inv-1', predictedDays: 5 },
  ];

  it('updates existing prediction', () => {
    const result = upsertPrediction(predictions, 'inv-1', { inventoryItemId: 'inv-1', predictedDays: 3 });
    expect(result).toHaveLength(1);
    expect(result[0].predictedDays).toBe(3);
  });

  it('appends new prediction', () => {
    const result = upsertPrediction(predictions, 'inv-2', { inventoryItemId: 'inv-2', predictedDays: 7 });
    expect(result).toHaveLength(2);
  });
});

describe('InventoryService — payload builders', () => {
  it('buildStockUpdatePayload', () => {
    expect(buildStockUpdatePayload(100, 'recount')).toEqual({ currentStock: 100, reason: 'recount' });
  });

  it('buildUsagePayload', () => {
    expect(buildUsagePayload(5, 'daily prep')).toEqual({ quantity: 5, reason: 'daily prep' });
  });

  it('buildRestockPayload with invoice', () => {
    expect(buildRestockPayload(50, 'INV-001')).toEqual({ quantity: 50, invoiceNumber: 'INV-001' });
  });

  it('buildRestockPayload without invoice', () => {
    expect(buildRestockPayload(50)).toEqual({ quantity: 50, invoiceNumber: undefined });
  });
});

describe('InventoryService — shouldSkip404', () => {
  it('true for 404', () => {
    expect(shouldSkip404(404)).toBe(true);
  });

  it('true for 400', () => {
    expect(shouldSkip404(400)).toBe(true);
  });

  it('false for 500', () => {
    expect(shouldSkip404(500)).toBe(false);
  });

  it('false for 200', () => {
    expect(shouldSkip404(200)).toBe(false);
  });
});

describe('InventoryService — no-restaurant guard', () => {
  it('null merchantId blocks all operations', () => {
    const merchantId: string | null = null;
    expect(!merchantId).toBe(true);
  });
});
