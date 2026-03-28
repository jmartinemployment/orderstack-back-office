export interface Vendor {
  id: string;
  merchantId: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  paymentTerms: string | null;
  leadTimeDays: number | null;
  website: string | null;
  apiPortalUrl: string | null;
  isIntegrated: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorFormData {
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  paymentTerms?: string | null;
  leadTimeDays?: number | null;
  website?: string | null;
  apiPortalUrl?: string | null;
}

export type PurchaseInvoiceStatus = 'pending_review' | 'approved' | 'paid';

export interface PurchaseLineItem {
  id: string;
  invoiceId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  normalizedIngredient: string | null;
}

export interface PurchaseInvoice {
  id: string;
  merchantId: string;
  vendorId: string;
  vendorName?: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  status: PurchaseInvoiceStatus;
  imageUrl: string | null;
  ocrProcessedAt: string | null;
  lineItems: PurchaseLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseInvoiceFormData {
  vendorId: string;
  invoiceNumber: string;
  invoiceDate: string;
  lineItems: Omit<PurchaseLineItem, 'id' | 'invoiceId'>[];
}

export interface IngredientPriceHistory {
  ingredientName: string;
  vendorId: string;
  vendorName: string;
  unitCost: number;
  unit: string;
  invoiceDate: string;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  estimatedUnitCost: number;
  actualUnitCost?: number;
}

export interface Recipe {
  id: string;
  menuItemId: string;
  merchantId: string;
  name: string;
  yieldQty: number;
  yieldUnit: string;
  ingredients: RecipeIngredient[];
  totalCost?: number;
  costPerServing?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeFormData {
  menuItemId: string;
  name: string;
  yieldQty: number;
  yieldUnit: string;
  ingredients: Omit<RecipeIngredient, 'id' | 'recipeId'>[];
}

export interface FoodCostSummary {
  totalRevenue: number;
  totalCogs: number;
  foodCostPercent: number;
  theoreticalCogs: number;
  theoreticalFoodCostPercent: number;
  variance: number;
  variancePercent: number;
  topCostItems: {
    menuItemName: string;
    recipeCost: number;
    menuPrice: number;
    foodCostPercent: number;
    quantitySold: number;
  }[];
  priceAlerts: {
    ingredientName: string;
    vendorName: string;
    previousCost: number;
    currentCost: number;
    changePercent: number;
  }[];
}

export type FoodCostTab = 'invoices' | 'vendors' | 'recipes' | 'purchase-orders';

// --- Purchase Orders ---

export type PurchaseOrderStatus = 'draft' | 'submitted' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  merchantId: string;
  vendorId: string;
  vendorName: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  lineItems: PurchaseOrderLineItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  notes: string | null;
  expectedDeliveryDate: string | null;
  submittedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
}

export interface PurchaseOrderLineItem {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  receivedQuantity: number | null;
}

export interface PurchaseOrderFormData {
  vendorId: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  lineItems: Omit<PurchaseOrderLineItem, 'receivedQuantity'>[];
}

// --- Supplier Ordering API Credentials ---

export type SupplierProviderType = 'sysco' | 'gfs';
export type SupplierProviderMode = 'production' | 'test';

export interface SupplierProviderStatus {
  configured: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasCustomerId: boolean;
  mode: SupplierProviderMode;
  updatedAt: string | null;
}

export interface SupplierCredentialSummary {
  sysco: SupplierProviderStatus;
  gfs: SupplierProviderStatus;
}

export interface SupplierCredentialPayload {
  clientId?: string;
  clientSecret?: string;
  customerId?: string;
  mode?: SupplierProviderMode;
}

export interface SupplierConnectionTestResult {
  success: boolean;
  message: string;
}
