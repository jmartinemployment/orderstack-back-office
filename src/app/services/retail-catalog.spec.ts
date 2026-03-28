import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface RetailItemVariation {
  id: string;
  stockQuantity: number;
  lowStockThreshold: number;
}

interface RetailItem {
  id: string;
  name: string;
  isActive: boolean;
  categoryId: string | null;
  trackInventory: boolean;
  variations: RetailItemVariation[];
}

interface RetailCategory {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  children: RetailCategory[];
}

interface RetailBundle {
  id: string;
  name: string;
  isActive: boolean;
}

// --- Pure function replicas ---

function activeItems(items: RetailItem[]): RetailItem[] {
  return items.filter(i => i.isActive);
}

function itemsByCategory(items: RetailItem[]): Map<string, RetailItem[]> {
  const map = new Map<string, RetailItem[]>();
  for (const item of items) {
    const key = item.categoryId ?? 'uncategorized';
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function categoryTree(flat: RetailCategory[]): RetailCategory[] {
  const roots: RetailCategory[] = [];
  const map = new Map<string, RetailCategory>();

  for (const cat of flat) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of map.values()) {
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(cat);
    } else {
      roots.push(cat);
    }
  }

  return roots.sort((a, b) => a.sortOrder - b.sortOrder);
}

function lowStockItems(items: RetailItem[]): RetailItem[] {
  return items.filter(i => {
    if (!i.trackInventory) return false;
    if (i.variations.length > 0) {
      return i.variations.some(v => v.stockQuantity <= v.lowStockThreshold);
    }
    return false;
  });
}

function activeBundles(bundles: RetailBundle[]): RetailBundle[] {
  return bundles.filter(b => b.isActive);
}

// List mutations
function addItem(items: RetailItem[], item: RetailItem): RetailItem[] {
  return [...items, item];
}

function updateItemInList(items: RetailItem[], id: string, updated: RetailItem): RetailItem[] {
  return items.map(i => i.id === id ? updated : i);
}

function deleteItemFromList(items: RetailItem[], id: string): RetailItem[] {
  return items.filter(i => i.id !== id);
}

// --- Tests ---

const items: RetailItem[] = [
  { id: 'ri-1', name: 'T-Shirt', isActive: true, categoryId: 'cat-1', trackInventory: true, variations: [{ id: 'v-1', stockQuantity: 5, lowStockThreshold: 10 }] },
  { id: 'ri-2', name: 'Mug', isActive: true, categoryId: 'cat-1', trackInventory: false, variations: [] },
  { id: 'ri-3', name: 'Hat', isActive: false, categoryId: 'cat-2', trackInventory: true, variations: [{ id: 'v-2', stockQuantity: 50, lowStockThreshold: 5 }] },
  { id: 'ri-4', name: 'Sticker', isActive: true, categoryId: null, trackInventory: true, variations: [{ id: 'v-3', stockQuantity: 0, lowStockThreshold: 5 }] },
];

describe('RetailCatalogService — activeItems', () => {
  it('filters active items', () => {
    expect(activeItems(items)).toHaveLength(3);
  });

  it('returns empty for empty list', () => {
    expect(activeItems([])).toHaveLength(0);
  });
});

describe('RetailCatalogService — itemsByCategory', () => {
  it('groups items by categoryId', () => {
    const map = itemsByCategory(items);
    expect(map.get('cat-1')).toHaveLength(2);
    expect(map.get('cat-2')).toHaveLength(1);
    expect(map.get('uncategorized')).toHaveLength(1);
  });

  it('returns empty map for empty list', () => {
    expect(itemsByCategory([]).size).toBe(0);
  });
});

describe('RetailCatalogService — categoryTree', () => {
  it('builds tree from flat list', () => {
    const flat: RetailCategory[] = [
      { id: 'c-1', name: 'Clothing', parentId: null, sortOrder: 1, children: [] },
      { id: 'c-2', name: 'Accessories', parentId: null, sortOrder: 2, children: [] },
      { id: 'c-3', name: 'Shirts', parentId: 'c-1', sortOrder: 1, children: [] },
      { id: 'c-4', name: 'Pants', parentId: 'c-1', sortOrder: 2, children: [] },
    ];
    const tree = categoryTree(flat);
    expect(tree).toHaveLength(2);
    expect(tree[0].name).toBe('Clothing');
    expect(tree[0].children).toHaveLength(2);
    expect(tree[1].name).toBe('Accessories');
  });

  it('sorts roots by sortOrder', () => {
    const flat: RetailCategory[] = [
      { id: 'c-1', name: 'B', parentId: null, sortOrder: 2, children: [] },
      { id: 'c-2', name: 'A', parentId: null, sortOrder: 1, children: [] },
    ];
    const tree = categoryTree(flat);
    expect(tree[0].name).toBe('A');
  });

  it('returns empty for empty list', () => {
    expect(categoryTree([])).toHaveLength(0);
  });
});

describe('RetailCatalogService — lowStockItems', () => {
  it('finds items with low stock variations', () => {
    const result = lowStockItems(items);
    expect(result).toHaveLength(2); // ri-1 (5 <= 10) and ri-4 (0 <= 5)
    expect(result.map(i => i.id)).toContain('ri-1');
    expect(result.map(i => i.id)).toContain('ri-4');
  });

  it('excludes items not tracking inventory', () => {
    const result = lowStockItems(items);
    expect(result.find(i => i.id === 'ri-2')).toBeUndefined();
  });
});

describe('RetailCatalogService — activeBundles', () => {
  it('filters active bundles', () => {
    const bundles: RetailBundle[] = [
      { id: 'b-1', name: 'A', isActive: true },
      { id: 'b-2', name: 'B', isActive: false },
    ];
    expect(activeBundles(bundles)).toHaveLength(1);
  });
});

describe('RetailCatalogService — list mutations', () => {
  it('addItem appends', () => {
    expect(addItem(items, { id: 'ri-5', name: 'New', isActive: true, categoryId: null, trackInventory: false, variations: [] })).toHaveLength(5);
  });

  it('updateItemInList replaces matching', () => {
    const updated = { ...items[0], name: 'Updated Shirt' };
    expect(updateItemInList(items, 'ri-1', updated)[0].name).toBe('Updated Shirt');
  });

  it('deleteItemFromList removes matching', () => {
    expect(deleteItemFromList(items, 'ri-1')).toHaveLength(3);
  });
});
