export interface InventoryItem {
  id: string;
  merchantId: string;
  name: string;
  nameEn: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  costPerUnit: number;
  supplier: string | null;
  category: string;
  lastRestocked: string | null;
  lastCountDate: string | null;
  active: boolean;
  linkedVariationId?: string | null;
  shelfLifeDays?: number | null;
  expirationTracking?: boolean;
}

export interface InventoryAlert {
  type: 'low_stock' | 'out_of_stock' | 'reorder_soon' | 'overstock';
  severity: 'critical' | 'warning' | 'info';
  itemId: string;
  itemName: string;
  message: string;
  currentStock: number;
  threshold: number;
  suggestedAction: string;
}

export interface StockPrediction {
  inventoryItemId: string;
  itemName: string;
  currentStock: number;
  unit: string;
  avgDailyUsage: number;
  daysUntilEmpty: number;
  predictedEmptyDate: string;
  reorderRecommended: boolean;
  reorderQuantity: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface InventoryReorderItem {
  item: InventoryItem;
  suggestedQuantity: number;
  estimatedCost: number;
}

export interface InventoryReport {
  merchantId: string;
  reportDate: string;
  totalItems: number;
  totalValue: number;
  alerts: InventoryAlert[];
  predictions: StockPrediction[];
  lowStockItems: InventoryItem[];
  reorderList: InventoryReorderItem[];
}

export type InventoryTab = 'overview' | 'items' | 'predictions' | 'cycle-counts';
export type StockActionType = 'restock' | 'usage' | 'adjustment';

// --- Cycle Counts ---

export type CycleCountStatus = 'in_progress' | 'submitted';

export interface CycleCount {
  id: string;
  merchantId: string;
  status: CycleCountStatus;
  category: string | null;
  entries: CycleCountEntry[];
  totalVarianceValue: number;
  createdAt: string;
  submittedAt: string | null;
}

export interface CycleCountEntry {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  expectedQuantity: number;
  actualQuantity: number | null;
  varianceQuantity: number;
  varianceValue: number;
}

// --- Expiring Items ---

export interface ExpiringItem {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  currentStock: number;
  expirationDate: string;
  daysUntilExpiration: number;
}

// --- Unit Conversions ---

export interface UnitConversion {
  id: string;
  merchantId: string;
  fromUnit: string;
  toUnit: string;
  factor: number;
}
