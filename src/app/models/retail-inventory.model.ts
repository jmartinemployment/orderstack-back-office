// --- Retail Inventory Management (GOS-SPEC-22) ---

export type StockAdjustmentType =
  | 'received'
  | 'recount'
  | 'damage'
  | 'theft'
  | 'loss'
  | 'return'
  | 'transfer_in'
  | 'transfer_out'
  | 'sale'
  | 'correction';

export type StockTransferStatus = 'pending' | 'in_transit' | 'partial' | 'received' | 'cancelled';
export type StockAlertType = 'low_stock' | 'out_of_stock' | 'overstock' | 'expiring';

export interface RetailStockRecord {
  id: string;
  itemId: string;
  variationId: string | null;
  locationId: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderPoint: number;
  lowStockThreshold: number;
  lastCountedAt: string | null;
  averageCostPerUnit: number;
  totalStockValue: number;
  itemName: string;
  variationName: string | null;
  sku: string | null;
  barcode: string | null;
}

export interface StockAdjustment {
  id: string;
  itemId: string;
  variationId: string | null;
  locationId: string;
  type: StockAdjustmentType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  note: string;
  employeeId: string | null;
  costPerUnit: number | null;
  createdAt: string;
  itemName: string;
  variationName: string | null;
}

export interface StockAdjustmentFormData {
  itemId: string;
  variationId: string | null;
  type: StockAdjustmentType;
  quantity: number;
  reason: string;
  note: string;
  costPerUnit: number | null;
}

export interface StockTransferItem {
  itemId: string;
  variationId: string | null;
  quantity: number;
  receivedQuantity: number;
  itemName: string;
  variationName: string | null;
  sku: string | null;
}

export interface StockTransfer {
  id: string;
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  status: StockTransferStatus;
  items: StockTransferItem[];
  createdBy: string;
  receivedBy: string | null;
  note: string;
  createdAt: string;
  receivedAt: string | null;
}

export interface StockTransferFormData {
  fromLocationId: string;
  toLocationId: string;
  items: { itemId: string; variationId: string | null; quantity: number }[];
  note: string;
}

export interface StockAlert {
  id: string;
  itemId: string;
  variationId: string | null;
  locationId: string;
  alertType: StockAlertType;
  currentQuantity: number;
  threshold: number;
  itemName: string;
  variationName: string | null;
  sku: string | null;
  acknowledged: boolean;
  createdAt: string;
}

export interface RetailCycleCount {
  id: string;
  locationId: string;
  type: 'full' | 'cycle';
  categoryId: string | null;
  status: 'in_progress' | 'submitted' | 'approved';
  entries: RetailCycleCountEntry[];
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface RetailCycleCountEntry {
  itemId: string;
  variationId: string | null;
  expectedQuantity: number;
  countedQuantity: number | null;
  variance: number;
  itemName: string;
  variationName: string | null;
  sku: string | null;
}

// --- FIFO Valuation (Phase 3) ---

export interface CostLayer {
  id: string;
  itemId: string;
  variationId: string | null;
  quantityRemaining: number;
  costPerUnit: number;
  receivedAt: string;
  sourceType: 'purchase_order' | 'adjustment' | 'return';
  sourceId: string;
}

// --- Barcode Label Printing (Phase 3) ---

export type LabelSize = 'small' | 'standard' | 'shelf';

export interface LabelTemplate {
  size: LabelSize;
  showItemName: boolean;
  showVariationName: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  showSku: boolean;
}

export interface LabelPrintJob {
  items: { itemId: string; variationId: string | null; quantity: number }[];
  template: LabelTemplate;
}

// --- Inventory Reports (Phase 3) ---

export interface InventoryAgingBucket {
  label: string;
  dayRange: string;
  itemCount: number;
  totalValue: number;
  items: { itemId: string; itemName: string; daysSinceLastSale: number; quantity: number; value: number }[];
}

export interface SellThroughReport {
  itemId: string;
  itemName: string;
  sku: string | null;
  openingStock: number;
  received: number;
  sold: number;
  sellThroughRate: number;
  benchmark: 'good' | 'average' | 'slow';
}

export interface ShrinkageReport {
  itemId: string;
  itemName: string;
  expectedQuantity: number;
  countedQuantity: number;
  variance: number;
  varianceValue: number;
}

// --- Utility ---

export const ADJUSTMENT_TYPE_LABELS: Record<StockAdjustmentType, string> = {
  received: 'Received',
  recount: 'Recount',
  damage: 'Damage',
  theft: 'Theft',
  loss: 'Loss',
  return: 'Return',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  sale: 'Sale',
  correction: 'Correction',
};

export const ALERT_TYPE_LABELS: Record<StockAlertType, string> = {
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
  overstock: 'Overstock',
  expiring: 'Expiring',
};
