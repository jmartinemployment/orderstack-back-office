// --- Retail Ecommerce Integration (GOS-SPEC-24) ---

export type FulfillmentOption = 'ship' | 'pickup' | 'curbside' | 'local_delivery';

export type EcommerceFulfillmentStatus =
  | 'pending'
  | 'processing'
  | 'ready_for_pickup'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface ProductImage {
  id: string;
  url: string;
  altText: string;
  position: number;
  isPrimary: boolean;
}

export interface ProductListing {
  id: string;
  retailItemId: string;
  merchantId: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  images: ProductImage[];
  isPublished: boolean;
  channelVisibility: { inStore: boolean; online: boolean; kiosk: boolean };
  fulfillmentOptions: FulfillmentOption[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductListingFormData {
  retailItemId: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  images: ProductImage[];
  isPublished: boolean;
  fulfillmentOptions: FulfillmentOption[];
}

export interface ShippingMethod {
  id: string;
  merchantId: string;
  name: string;
  type: 'flat_rate' | 'by_weight' | 'by_order_total' | 'by_quantity' | 'carrier_api';
  rate: number;
  freeAbove: number | null;
  carrier: string | null;
  estimatedDays: number | null;
  isActive: boolean;
}

export interface ShippingMethodFormData {
  name: string;
  type: ShippingMethod['type'];
  rate: number;
  freeAbove: number | null;
  carrier: string | null;
  estimatedDays: number | null;
  isActive: boolean;
}

export interface EcommerceOrderItem {
  itemId: string;
  variationId: string | null;
  name: string;
  variationName: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string | null;
}

export interface ShippingAddress {
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface EcommerceOrder {
  id: string;
  orderNumber: string;
  merchantId: string;
  customerId: string | null;
  customerEmail: string;
  customerName: string;
  items: EcommerceOrderItem[];
  shippingAddress: ShippingAddress | null;
  shippingMethod: string | null;
  shippingCost: number;
  fulfillmentType: FulfillmentOption;
  fulfillmentStatus: EcommerceFulfillmentStatus;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  trackingNumber: string | null;
  trackingUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingLabel {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  labelUrl: string;
  cost: number;
}

// --- Cart (public storefront) ---

export interface EcommerceCartItem {
  itemId: string;
  variationId: string | null;
  name: string;
  variationName: string | null;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  maxQuantity: number | null;
}

export type EcommerceCheckoutStep = 'cart' | 'shipping' | 'payment' | 'confirmation';

// --- Store Configuration ---

export interface StoreConfig {
  merchantId: string;
  storeSlug: string;
  storeName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  taxRate: number;
  enableGuestCheckout: boolean;
  enablePickup: boolean;
  enableCurbside: boolean;
  enableShipping: boolean;
  enableLocalDelivery: boolean;
  minOrderAmount: number | null;
  pickupInstructions: string | null;
}

// --- Fulfillment (Phase 2) ---

export type FulfillmentDashboardTab = 'pending' | 'processing' | 'pickup' | 'shipped' | 'completed';

export interface PickListItem {
  orderItemId: string;
  itemName: string;
  variationName: string | null;
  sku: string;
  quantity: number;
  locationHint: string | null;
  isPicked: boolean;
}

export interface PackingSlip {
  orderId: string;
  orderNumber: string;
  customerName: string;
  items: PickListItem[];
  shippingAddress: ShippingAddress | null;
  notes: string | null;
}

export interface CustomerNotificationConfig {
  enableEmail: boolean;
  enableSms: boolean;
  templates: {
    orderConfirmed: string;
    readyForPickup: string;
    shipped: string;
    outForDelivery: string;
    delivered: string;
  };
}

export interface BopisConfig {
  pickupWindowHours: number;
  enableCurbside: boolean;
  vehicleDescriptionRequired: boolean;
}

// --- Channel Sync (Phase 3) ---

export type SyncChannel = 'pos' | 'online' | 'kiosk';

export interface ChannelSyncConfig {
  merchantId: string;
  enableRealTimeInventorySync: boolean;
  enablePriceSync: boolean;
  bufferStockPerChannel: number;
  perChannelPricing: boolean;
  outOfStockBehavior: 'hide' | 'show_sold_out' | 'show_backorder';
}

export interface ChannelSyncConfigFormData {
  enableRealTimeInventorySync: boolean;
  enablePriceSync: boolean;
  bufferStockPerChannel: number;
  perChannelPricing: boolean;
  outOfStockBehavior: ChannelSyncConfig['outOfStockBehavior'];
}

export interface ChannelPriceOverride {
  itemId: string;
  variationId: string | null;
  channel: SyncChannel;
  price: number;
}

export interface SalePricing {
  id: string;
  itemId: string;
  variationId: string | null;
  salePrice: number;
  startDate: string;
  endDate: string;
  channels: SyncChannel[];
  isActive: boolean;
}

export interface SalePricingFormData {
  itemId: string;
  variationId: string | null;
  salePrice: number;
  startDate: string;
  endDate: string;
  channels: SyncChannel[];
}

export interface ChannelVisibilitySetting {
  itemId: string;
  variationId: string | null;
  inStore: boolean;
  online: boolean;
  kiosk: boolean;
}

export type ProductSortOption = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'newest';

export interface ProductFilterState {
  categoryId: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  search: string;
  sort: ProductSortOption;
}
