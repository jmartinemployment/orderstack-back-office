// --- Retail Catalog & Variations (GOS-SPEC-20) ---

import type { BarcodeFormat } from './menu.model';

export type RetailItemType = 'physical' | 'digital' | 'service';

export type { BarcodeFormat } from './menu.model';

export interface RetailChannelVisibility {
  inStore: boolean;
  online: boolean;
  kiosk: boolean;
}

export interface RetailCategory {
  id: string;
  merchantId: string;
  name: string;
  parentId: string | null;
  depth: number;
  sortOrder: number;
  taxRuleId: string | null;
  imageUrl: string | null;
  isActive: boolean;
  children: RetailCategory[];
  itemCount?: number;
}

export interface RetailCategoryFormData {
  name: string;
  parentId: string | null;
  taxRuleId: string | null;
  imageUrl: string | null;
}

export interface RetailOptionSet {
  id: string;
  merchantId: string;
  name: string;
  values: string[];
}

export interface RetailOptionSetFormData {
  name: string;
  values: string[];
}

export interface RetailItemVariation {
  id: string;
  itemId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  cost: number | null;
  weight: number | null;
  dimensions: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  reorderPoint: number;
  optionValues: Record<string, string>;
  imageUrl: string | null;
  isActive: boolean;
}

export interface RetailItem {
  id: string;
  merchantId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  barcodeFormat: BarcodeFormat | null;
  description: string;
  basePrice: number;
  cost: number | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  vendorId: string | null;
  vendorCode: string | null;
  itemType: RetailItemType;
  taxable: boolean;
  trackInventory: boolean;
  weightBased: boolean;
  weightUnit: string | null;
  markupPercent: number | null;
  variations: RetailItemVariation[];
  optionSetIds: string[];
  tags: string[];
  channelVisibility: RetailChannelVisibility;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RetailItemFormData {
  name: string;
  sku: string | null;
  barcode: string | null;
  barcodeFormat: BarcodeFormat | null;
  description: string;
  basePrice: number;
  cost: number | null;
  imageUrl: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  vendorId: string | null;
  vendorCode: string | null;
  itemType: RetailItemType;
  taxable: boolean;
  trackInventory: boolean;
  weightBased: boolean;
  weightUnit: string | null;
  tags: string[];
  channelVisibility: RetailChannelVisibility;
}

export interface RetailCatalogImportResult {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// --- Product Collections (Phase 2) ---

export type CollectionType = 'smart' | 'manual';

export type CollectionRuleField = 'price' | 'category' | 'vendor' | 'tag' | 'item_type' | 'stock_quantity';
export type CollectionRuleOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';

export interface CollectionRule {
  field: CollectionRuleField;
  operator: CollectionRuleOperator;
  value: string;
}

export interface RetailCollection {
  id: string;
  merchantId: string;
  name: string;
  type: CollectionType;
  rules: CollectionRule[];
  itemIds: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RetailCollectionFormData {
  name: string;
  type: CollectionType;
  rules: CollectionRule[];
  itemIds: string[];
}

// --- Category Tax Rules (Phase 2) ---

export interface CategoryTaxRule {
  id: string;
  categoryId: string;
  taxRateId: string;
  taxRateName: string;
  taxRatePercent: number;
  isExempt: boolean;
}

// --- Bundles & Kits (Phase 3) ---

export type BundleType = 'fixed_price' | 'percent_discount' | 'cheapest_free';

export interface BundleComponent {
  itemId: string;
  variationId: string | null;
  itemName: string;
  variationName: string | null;
  quantity: number;
  unitPrice: number;
  isRequired: boolean;
}

export interface RetailBundle {
  id: string;
  merchantId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  bundleType: BundleType;
  discountPercent: number | null;
  components: BundleComponent[];
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RetailBundleFormData {
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  bundleType: BundleType;
  discountPercent: number | null;
  components: Omit<BundleComponent, 'itemName' | 'variationName'>[];
}

// --- Retail POS Checkout (GOS-SPEC-21) ---

export type RetailTransactionType = 'sale' | 'return' | 'exchange';

export type RetailPaymentMethod = 'cash' | 'card' | 'gift_card' | 'store_credit' | 'layaway_deposit';

export interface RetailPayment {
  method: RetailPaymentMethod;
  amount: number;
  reference: string | null;
}

export interface RetailTransactionItem {
  id: string;
  itemId: string;
  variationId: string | null;
  name: string;
  variationName: string | null;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  isReturn: boolean;
  returnReason: string | null;
  weight: number | null;
}

export interface RetailTransaction {
  id: string;
  merchantId: string;
  type: RetailTransactionType;
  items: RetailTransactionItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  paymentMethods: RetailPayment[];
  employeeId: string | null;
  customerId: string | null;
  receiptNumber: string;
  isGiftReceipt: boolean;
  createdAt: string;
}

export interface RetailCartItem {
  itemId: string;
  variationId: string | null;
  item: RetailItem;
  variation: RetailItemVariation | null;
  quantity: number;
  unitPrice: number;
  priceOverride: number | null;
  priceOverrideReason: string | null;
  weight: number | null;
  discount: number;
}

export interface QuickKey {
  id: string;
  itemId: string;
  variationId: string | null;
  label: string;
  position: number;
  color: string;
}

export interface QuickKeyFormData {
  itemId: string;
  variationId: string | null;
  label: string;
  position: number;
  color: string;
}

// --- Return Processing ---

export type ReturnReason = 'defective' | 'wrong_size' | 'changed_mind' | 'not_as_described' | 'damaged' | 'other';
export type RefundMethod = 'original_payment' | 'store_credit' | 'cash';

export interface ReturnItem {
  transactionItemId: string;
  quantity: number;
  reason: ReturnReason;
  note: string;
  restock: boolean;
}

export interface ReturnRequest {
  originalTransactionId: string;
  items: ReturnItem[];
  refundMethod: RefundMethod;
  totalRefund: number;
}

export interface ReturnPolicy {
  returnWindowDays: number;
  requireReceipt: boolean;
  noReceiptLimit: number;
  managerOverrideRequired: boolean;
  finalSaleExemptions: string[];
}

// --- Layaway ---

export type LayawayStatus = 'active' | 'completed' | 'cancelled' | 'expired';

export interface LayawayRecord {
  id: string;
  merchantId: string;
  customerId: string;
  items: RetailTransactionItem[];
  totalAmount: number;
  depositAmount: number;
  paidAmount: number;
  remainingBalance: number;
  status: LayawayStatus;
  minimumDepositPercent: number;
  payments: LayawayPayment[];
  createdAt: string;
  expiresAt: string;
}

export interface LayawayPayment {
  id: string;
  amount: number;
  method: RetailPaymentMethod;
  createdAt: string;
}

// --- Store Credit ---

export interface StoreCredit {
  id: string;
  customerId: string;
  balance: number;
  reason: string;
  issuedBy: string;
  createdAt: string;
}

// --- Receipt Template ---

export interface ReceiptTemplate {
  logoUrl: string | null;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  returnPolicyText: string;
  promoMessage: string;
  showSku: boolean;
  showBarcode: boolean;
}

// --- Utility Functions ---

export function generateVariationMatrix(optionSets: RetailOptionSet[]): Record<string, string>[] {
  if (optionSets.length === 0) return [{}];

  const [first, ...rest] = optionSets;
  const restCombinations = generateVariationMatrix(rest);

  const result: Record<string, string>[] = [];
  for (const value of first.values) {
    for (const combo of restCombinations) {
      result.push({ [first.name]: value, ...combo });
    }
  }
  return result;
}

export function formatVariationName(optionValues: Record<string, string>): string {
  return Object.values(optionValues).join(' / ');
}

export function calculateBundleDiscount(
  bundleType: BundleType,
  components: BundleComponent[],
  bundlePrice: number,
  discountPercent: number | null,
): number {
  const componentTotal = components.reduce(
    (sum, c) => sum + c.unitPrice * c.quantity, 0,
  );

  switch (bundleType) {
    case 'fixed_price':
      return Math.max(0, componentTotal - bundlePrice);
    case 'percent_discount':
      return componentTotal * ((discountPercent ?? 0) / 100);
    case 'cheapest_free': {
      const cheapest = components
        .filter(c => c.isRequired)
        .reduce((min, c) => Math.min(min, c.unitPrice), Infinity);
      return cheapest === Infinity ? 0 : cheapest;
    }
  }
}
