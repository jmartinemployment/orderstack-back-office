import { LoyaltyTier } from './loyalty.model';

export interface Customer {
  id: string;
  merchantId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  totalOrders: number;
  totalSpent: number;
  avgOrderValue: number | null;
  lastOrderDate: string | null;
  loyaltyPoints: number;
  loyaltyTier: LoyaltyTier;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type CustomerSegment = 'vip' | 'regular' | 'new' | 'at-risk' | 'dormant';

export interface CustomerSegmentInfo {
  segment: CustomerSegment;
  label: string;
  cssClass: string;
  description: string;
}

export interface SavedAddress {
  id: string;
  customerId: string;
  label: string;
  address: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

export interface SavedAddressFormData {
  label: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  isDefault?: boolean;
}

// --- Referral Program ---

export interface ReferralReward {
  type: 'points' | 'discount_percentage' | 'discount_flat' | 'free_item';
  value: number;
  freeItemId: string | null;
}

export interface ReferralConfig {
  enabled: boolean;
  referrerReward: ReferralReward;
  refereeReward: ReferralReward;
  maxReferrals: number | null;
}

export interface Referral {
  id: string;
  referrerCustomerId: string;
  refereeCustomerId: string;
  referralCode: string;
  rewardFulfilled: boolean;
  createdAt: string;
}

// --- Post-Visit Feedback ---

export type FeedbackCategory = 'food' | 'service' | 'ambiance' | 'speed' | 'value';

export interface FeedbackRequest {
  id: string;
  orderId: string;
  customerId: string;
  npsScore: number | null;
  rating: number | null;
  comment: string | null;
  categories: FeedbackCategory[];
  isPublic: boolean;
  respondedAt: string | null;
  responseMessage: string | null;
  createdAt: string;
}

// --- Smart Customer Groups (Phase 3) ---

export type GroupRuleField = 'total_orders' | 'total_spent' | 'avg_order_value' | 'days_since_last_order' | 'loyalty_tier' | 'loyalty_points' | 'tag';
export type GroupRuleOperator = 'gte' | 'lte' | 'eq' | 'neq' | 'contains';

export interface GroupRule {
  field: GroupRuleField;
  operator: GroupRuleOperator;
  value: string | number;
}

export interface SmartGroup {
  id: string;
  merchantId: string;
  name: string;
  rules: GroupRule[];
  rulesLogic: 'and' | 'or';
  memberCount: number;
  isPrebuilt: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SmartGroupFormData {
  name: string;
  rules: GroupRule[];
  rulesLogic: 'and' | 'or';
}

export const PREBUILT_SMART_GROUPS: { name: string; rules: GroupRule[]; rulesLogic: 'and' | 'or' }[] = [
  { name: 'Lunch Regulars', rules: [{ field: 'total_orders', operator: 'gte', value: 5 }, { field: 'days_since_last_order', operator: 'lte', value: 14 }], rulesLogic: 'and' },
  { name: 'Weekend Diners', rules: [{ field: 'total_orders', operator: 'gte', value: 3 }], rulesLogic: 'and' },
  { name: 'High Spenders', rules: [{ field: 'total_spent', operator: 'gte', value: 500 }], rulesLogic: 'and' },
  { name: 'Birthday This Month', rules: [{ field: 'tag', operator: 'contains', value: 'birthday_this_month' }], rulesLogic: 'and' },
];

// --- Unified Messaging Inbox (Phase 3) ---

export type MessageChannel = 'sms' | 'email' | 'feedback_response' | 'system';

export interface CustomerMessage {
  id: string;
  customerId: string;
  customerName: string;
  channel: MessageChannel;
  direction: 'inbound' | 'outbound';
  subject: string | null;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface MessageThread {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  messages: CustomerMessage[];
  unreadCount: number;
  lastMessageAt: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  body: string;
  channel: MessageChannel;
}

export type CrmTab = 'customers' | 'segments' | 'insights' | 'groups' | 'inbox';
export type CrmSortField = 'name' | 'totalSpent' | 'totalOrders' | 'lastOrderDate' | 'loyaltyPoints';
