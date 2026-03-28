import {
  DiningOption,
  DiningOptionType,
  ApprovalStatus,
  DeliveryInfo,
  CurbsideInfo,
  CateringInfo
} from './dining-option.model';

// --- Status enums (string unions) ---

export type GuestOrderStatus =
  | 'RECEIVED'
  | 'IN_PREPARATION'
  | 'READY_FOR_PICKUP'
  | 'CLOSED'
  | 'VOIDED';

export type PaymentStatus = 'OPEN' | 'PAID' | 'PARTIAL' | 'CLOSED';

// --- Scan to Pay ---

export type ScanToPayStatus = 'pending' | 'viewing' | 'paying' | 'completed' | 'expired';

export interface ScanToPaySession {
  token: string;
  checkId: string;
  orderId: string;
  status: ScanToPayStatus;
  viewedAt?: string;
  tipAmount: number;
  tipPercent: number;
  paymentMethod?: string;
  paidAt?: string;
  expiresAt: string;
}

export type FulfillmentStatus = 'NEW' | 'HOLD' | 'SENT' | 'ON_THE_FLY';

export type CourseFireStatus = 'PENDING' | 'FIRED' | 'READY';

export type CoursePacingMode = 'disabled' | 'server_fires' | 'auto_fire_timed';

export type CoursePacingConfidence = 'low' | 'medium' | 'high';

export type PrintStatus = 'none' | 'printing' | 'printed' | 'failed';

export type OrderThrottleState = 'NONE' | 'HELD' | 'RELEASED';
export type OrderThrottleSource = 'AUTO' | 'MANUAL';
export type MarketplaceOrderProvider = 'doordash_marketplace' | 'ubereats' | 'grubhub';
export type MarketplaceSyncState = 'PENDING' | 'SUCCESS' | 'RETRYING' | 'FAILED';

export type OrderSource =
  | 'pos'
  | 'online'
  | 'kiosk'
  | 'qr'
  | 'delivery'
  | 'voice'
  | 'marketplace_doordash'
  | 'marketplace_ubereats'
  | 'marketplace_grubhub';

export interface MarketplaceOrderInfo {
  provider: MarketplaceOrderProvider;
  externalOrderId: string;
  externalStoreId?: string;
  status?: string;
  lastPushedStatus?: string;
  lastPushResult?: string;
  lastPushError?: string;
  lastPushAt?: Date;
}

export interface Course {
  guid: string;
  name: string;
  sortOrder: number;
  fireStatus: CourseFireStatus;
  firedDate?: Date;
  readyDate?: Date;
}

export interface CoursePacingMetrics {
  lookbackDays: number;
  sampleSize: number;
  tablePaceBaselineSeconds: number;
  p50Seconds: number;
  p80Seconds: number;
  confidence: CoursePacingConfidence;
  generatedAt: Date;
}

export interface OrderThrottleInfo {
  state: OrderThrottleState;
  reason?: string;
  heldAt?: Date;
  releasedAt?: Date;
  source?: OrderThrottleSource;
  releaseReason?: string;
}

export interface OrderThrottlingStatus {
  enabled: boolean;
  triggering: boolean;
  triggerReason?: 'ACTIVE_OVERLOAD' | 'OVERDUE_OVERLOAD';
  activeOrders: number;
  overdueOrders: number;
  heldOrders: number;
  thresholds: {
    maxActiveOrders: number;
    maxOverdueOrders: number;
    releaseActiveOrders: number;
    releaseOverdueOrders: number;
    maxHoldMinutes: number;
  };
  evaluatedAt: Date;
}

// Pre-submission order type (used by CartService / OnlineOrderPortal)
export type OrderType = 'pickup' | 'delivery' | 'dine-in' | 'curbside' | 'catering';

// --- Sub-objects ---

export interface OrderServer {
  guid: string;
  name: string;
  entityType: 'RestaurantUser';
}

export interface OrderDevice {
  guid: string;
  name: string;
}

export interface OrderTable {
  guid: string;
  name: string;
  entityType: 'Table';
}

export interface SelectionModifier {
  guid: string;
  name: string;
  priceAdjustment: number;
  isTextModifier?: boolean;
  textValue?: string;
}

export type DiscountType = 'percentage' | 'flat' | 'comp';

export type VoidReason = 'customer_request' | 'wrong_item' | 'quality_issue' | 'kitchen_error' | 'other';

export type DiscountReason = 'loyalty' | 'birthday' | 'manager_comp' | 'employee_meal' | 'promo' | 'other';

export interface CheckDiscount {
  id: string;
  type: DiscountType;
  value: number;
  reason: string;
  appliedBy: string;
  approvedBy?: string;
}

export interface VoidedSelection extends Selection {
  voidReason: string;
  voidedBy: string;
  voidedAt: Date;
  managerApproval?: string;
}

export interface Selection {
  guid: string;
  menuItemGuid: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  fulfillmentStatus: FulfillmentStatus;
  modifiers: SelectionModifier[];
  specialInstructions?: string;
  course?: Course;
  completedAt?: Date;
  fireDelaySeconds?: number;
  scheduledFireTime?: Date;
  seatNumber?: number;
  isComped?: boolean;
  compReason?: string;
  compBy?: string;
  // Remake tracking
  isRemake?: boolean;
  remakeReason?: string;
  originalSelectionId?: string;
  // Fractional splitting
  fractionOf?: string;
  fractionNumerator?: number;
  fractionDenominator?: number;
}

export interface Payment {
  guid: string;
  paymentMethod: string;
  amount: number;
  tipAmount: number;
  status: PaymentStatus;
  paymentProcessor?: string;
  paymentProcessorId?: string;
  paidDate?: Date;
}

export interface Check {
  guid: string;
  displayNumber: string;
  selections: Selection[];
  payments: Payment[];
  paymentStatus: PaymentStatus;
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
  discounts: CheckDiscount[];
  voidedSelections: VoidedSelection[];
  tabName?: string;
  tabOpenedAt?: Date;
  tabClosedAt?: Date;
  preauthId?: string;
  // Scan to Pay
  paymentToken?: string;
  qrCodeUrl?: string;
  scanToPayEnabled?: boolean;
}

export interface OrderTimestamps {
  createdDate: Date;
  confirmedDate?: Date;
  sentDate?: Date;
  prepStartDate?: Date;
  preparingDate?: Date;
  readyDate?: Date;
  closedDate?: Date;
  voidedDate?: Date;
  lastModifiedDate: Date;
}

export interface OrderMetrics {
  totalPrepTimeMinutes: number;
  avgItemPrepMinutes: number;
  timeToConfirmMinutes: number;
  timeToPrepareMinutes: number;
  timeToReadyMinutes: number;
  totalTimeMinutes: number;
}

// --- Offline queue ---

export interface QueuedOrder {
  localId: string;
  orderData: Record<string, unknown>;
  queuedAt: number;
  merchantId: string;
  retryCount: number;
}

// --- Main Order interface ---

export interface Order {
  guid: string;
  merchantId: string;
  orderNumber: string;
  guestOrderStatus: GuestOrderStatus;
  orderSource?: OrderSource;
  businessDate?: string;

  // Server / Device / Table
  server: OrderServer;
  device: OrderDevice;
  table?: OrderTable;

  // Dining option
  diningOption: DiningOption;
  diningOptionType?: DiningOptionType;
  approvalStatus?: ApprovalStatus;
  promisedDate?: string;

  // Checks (contains selections + payments)
  checks: Check[];

  // Course system
  courses?: Course[];

  // Order-level totals (sum of all checks)
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;

  // Customer
  customer?: CustomerInfo;
  specialInstructions?: string;

  // Timestamps
  timestamps: OrderTimestamps;

  // Type-specific info
  deliveryInfo?: DeliveryInfo;
  curbsideInfo?: CurbsideInfo;
  cateringInfo?: CateringInfo;

  // Loyalty
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;

  // Kitchen throttling
  throttle?: OrderThrottleInfo;
  marketplace?: MarketplaceOrderInfo;

  // Notes
  notes?: OrderNote[];

  // Client-only: true for offline-queued orders not yet synced
  _queued?: boolean;
}

// --- Kept from original ---

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export interface ProfitInsight {
  orderId: string;
  totalCost: number;
  totalRevenue: number;
  profitMargin: number;
  starItem?: string;
  insightText: string;
  quickTip: string;
}

export interface RecentProfitSummary {
  orders: ProfitInsight[];
  averageMargin: number;
  totalRevenue: number;
  totalCost: number;
}

// --- Order Activity Log ---

export type OrderEventType =
  | 'order_created'
  | 'item_added'
  | 'item_removed'
  | 'item_voided'
  | 'item_comped'
  | 'status_changed'
  | 'check_split'
  | 'check_merged'
  | 'check_transferred'
  | 'payment_received'
  | 'payment_refunded'
  | 'discount_applied'
  | 'discount_removed'
  | 'tab_opened'
  | 'tab_closed'
  | 'course_fired'
  | 'delivery_dispatched'
  | 'delivery_status_changed'
  | 'manager_override'
  | 'note_added';

export interface OrderActivityEvent {
  id: string;
  orderId: string;
  eventType: OrderEventType;
  description: string;
  performedBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// --- Order Notes ---

export type OrderNoteType = 'internal' | 'kitchen' | 'customer';

export interface OrderNote {
  id: string;
  orderId: string;
  checkGuid: string | null;
  noteType: OrderNoteType;
  text: string;
  createdBy: string;
  createdAt: string;
}

// --- Order Templates ---

export interface OrderTemplate {
  id: string;
  merchantId: string;
  name: string;
  items: OrderTemplateItem[];
  createdBy: string;
  createdAt: string;
}

export interface OrderTemplateItem {
  menuItemId: string;
  quantity: number;
  modifiers: string[];
}

// --- Course Templates ---

export interface CourseTemplate {
  id: string;
  name: string;
  description: string;
  courses: string[];
}

export const BUILT_IN_COURSE_TEMPLATES: CourseTemplate[] = [
  {
    id: 'tpl-3-course',
    name: '3-Course Dinner',
    description: 'Classic appetizer, entree, dessert progression',
    courses: ['Appetizer', 'Entree', 'Dessert'],
  },
  {
    id: 'tpl-5-course',
    name: '5-Course Tasting',
    description: 'Full tasting menu experience',
    courses: ['Amuse-Bouche', 'First Course', 'Second Course', 'Main', 'Dessert'],
  },
  {
    id: 'tpl-2-course',
    name: '2-Course Brunch',
    description: 'Simple starters and mains',
    courses: ['Starters', 'Main'],
  },
  {
    id: 'tpl-4-course',
    name: '4-Course Dinner',
    description: 'Appetizer, soup or salad, entree, dessert',
    courses: ['Appetizer', 'Soup/Salad', 'Entree', 'Dessert'],
  },
];

// --- Helper functions ---

export function getCustomerDisplayName(order: Order): string {
  const parts = [order.customer?.firstName, order.customer?.lastName].filter(Boolean);
  return parts.join(' ');
}

export function getOrderIdentifier(order: Order): string {
  return order.orderNumber || order.guid.slice(-4).toUpperCase();
}

export function calculateOrderTotals(checks: Check[]): {
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
} {
  return checks.reduce(
    (acc, check) => ({
      subtotal: acc.subtotal + check.subtotal,
      taxAmount: acc.taxAmount + check.taxAmount,
      tipAmount: acc.tipAmount + check.tipAmount,
      totalAmount: acc.totalAmount + check.totalAmount,
    }),
    { subtotal: 0, taxAmount: 0, tipAmount: 0, totalAmount: 0 }
  );
}

export function canSendToKitchen(order: Order): boolean {
  return order.guestOrderStatus === 'RECEIVED' || order.guestOrderStatus === 'IN_PREPARATION';
}

export function isMarketplaceOrder(order: Order): boolean {
  if (order.marketplace) return true;
  const source = (order.orderSource ?? '').toLowerCase();
  return source.startsWith('marketplace_');
}

export function getMarketplaceProviderLabel(order: Order): string | null {
  const provider = order.marketplace?.provider;
  if (provider === 'doordash_marketplace') return 'DoorDash Marketplace';
  if (provider === 'ubereats') return 'Uber Eats';
  if (provider === 'grubhub') return 'Grubhub';

  const source = (order.orderSource ?? '').toLowerCase();
  if (source === 'marketplace_doordash') return 'DoorDash Marketplace';
  if (source === 'marketplace_ubereats') return 'Uber Eats';
  if (source === 'marketplace_grubhub') return 'Grubhub';
  return null;
}

export function getMarketplaceSyncState(order: Order): MarketplaceSyncState | null {
  if (!isMarketplaceOrder(order)) return null;
  const result = (order.marketplace?.lastPushResult ?? '').toUpperCase();
  if (result === 'SUCCESS') return 'SUCCESS';
  if (result === 'FAILED') return 'FAILED';
  if (result === 'FAILED_RETRYING') return 'RETRYING';
  return 'PENDING';
}

export function getMarketplaceSyncStateLabel(state: MarketplaceSyncState | null): string {
  switch (state) {
    case 'SUCCESS':
      return 'Sync OK';
    case 'FAILED':
      return 'Sync Failed';
    case 'RETRYING':
      return 'Retrying';
    case 'PENDING':
      return 'Sync Pending';
    default:
      return 'Sync';
  }
}

export function getMarketplaceSyncClass(order: Order): string {
  const state = getMarketplaceSyncState(order);
  switch (state) {
    case 'SUCCESS':
      return 'sync-success';
    case 'FAILED':
      return 'sync-failed';
    case 'RETRYING':
      return 'sync-retrying';
    case 'PENDING':
      return 'sync-pending';
    default:
      return 'sync-pending';
  }
}

export function calculateOrderMetrics(order: Order): OrderMetrics | null {
  const created = order.timestamps.createdDate.getTime();
  const now = Date.now();

  const totalTimeMinutes = Math.floor((now - created) / 60000);

  const timeToConfirmMinutes = order.timestamps.confirmedDate
    ? Math.floor((order.timestamps.confirmedDate.getTime() - created) / 60000)
    : 0;

  const timeToPrepareMinutes = order.timestamps.preparingDate
    ? Math.floor((order.timestamps.preparingDate.getTime() - created) / 60000)
    : 0;

  const timeToReadyMinutes = order.timestamps.readyDate
    ? Math.floor((order.timestamps.readyDate.getTime() - created) / 60000)
    : 0;

  const allSelections = order.checks.flatMap(c => c.selections);
  const totalPrepTimeMinutes = timeToReadyMinutes || totalTimeMinutes;
  const avgItemPrepMinutes = allSelections.length > 0
    ? Math.round(totalPrepTimeMinutes / allSelections.length)
    : 0;

  return {
    totalPrepTimeMinutes,
    avgItemPrepMinutes,
    timeToConfirmMinutes,
    timeToPrepareMinutes,
    timeToReadyMinutes,
    totalTimeMinutes,
  };
}
