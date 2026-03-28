export interface LocationGroup {
  id: string;
  restaurantGroupId: string;
  name: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
}

export interface LocationGroupMember {
  id: string;
  locationGroupId: string;
  merchantId: string;
  restaurantName: string;
  restaurantSlug: string;
}

export interface LocationGroupFormData {
  name: string;
  description?: string;
  merchantIds: string[];
}

export interface LocationKpi {
  merchantId: string;
  restaurantName: string;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  laborCostPercent: number;
  foodCostPercent: number;
  customerCount: number;
}

export interface CrossLocationReport {
  period: string;
  startDate: string;
  endDate: string;
  locations: LocationKpi[];
  totals: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    avgLaborCostPercent: number;
    avgFoodCostPercent: number;
  };
}

export interface MenuSyncPreview {
  sourceLocationName: string;
  targetLocationNames: string[];
  itemsToAdd: { name: string; category: string; price: number }[];
  itemsToUpdate: { name: string; category: string; oldPrice: number; newPrice: number }[];
  itemsToSkip: { name: string; reason: string }[];
  conflicts: { name: string; issue: string }[];
}

export interface MenuSyncResult {
  id: string;
  sourceRestaurantId: string;
  targetRestaurantIds: string[];
  itemsAdded: number;
  itemsUpdated: number;
  itemsSkipped: number;
  conflicts: number;
  syncedAt: string;
  syncedBy: string;
}

export interface MenuSyncHistory {
  syncs: MenuSyncResult[];
}

export type PropagationSettingType =
  | 'ai'
  | 'pricing'
  | 'loyalty'
  | 'delivery'
  | 'payment'
  | 'tip_management'
  | 'stations'
  | 'break_types'
  | 'workweek'
  | 'timeclock'
  | 'auto_gratuity'
  | 'business_hours';

export interface SettingsPropagation {
  settingType: PropagationSettingType;
  sourceRestaurantId: string;
  targetRestaurantIds: string[];
  overrideExisting: boolean;
}

export interface FranchiseConfig {
  id: string;
  groupId: string;
  franchisorName: string;
  royaltyType: 'percentage' | 'flat_monthly';
  royaltyRate: number;
  marketingFeeType: 'percentage' | 'flat_monthly';
  marketingFeeRate: number;
  technologyFeeMonthly: number;
  reportingFrequency: 'weekly' | 'monthly';
  menuControlLevel: 'strict' | 'moderate' | 'flexible';
  priceFlexibilityPercent: number;
  requireApprovalForMenuChanges: boolean;
  brandingEnforced: boolean;
}

export interface FranchiseRoyaltyReport {
  periodStart: string;
  periodEnd: string;
  locations: FranchiseLocationRoyalty[];
  totalRevenue: number;
  totalRoyalties: number;
  totalMarketingFees: number;
  totalTechnologyFees: number;
  totalDue: number;
}

export interface FranchiseLocationRoyalty {
  merchantId: string;
  restaurantName: string;
  grossRevenue: number;
  netRevenue: number;
  royaltyAmount: number;
  marketingFeeAmount: number;
  technologyFeeAmount: number;
  totalDue: number;
  isPaid: boolean;
  paidAt: string | null;
}

export interface CrossLocationStaffMember {
  teamMemberId: string;
  name: string;
  email: string;
  jobTitle: string;
  primaryLocationId: string;
  primaryLocationName: string;
  assignedLocationIds: string[];
  status: 'active' | 'inactive';
  clockedInLocationId: string | null;
}

export interface StaffTransfer {
  id: string;
  teamMemberId: string;
  teamMemberName: string;
  fromRestaurantId: string;
  fromRestaurantName: string;
  toRestaurantId: string;
  toRestaurantName: string;
  transferredAt: string;
  transferredBy: string;
}

export interface CrossLocationInventoryItem {
  itemId: string;
  itemName: string;
  unit: string;
  locationQuantities: { merchantId: string; restaurantName: string; quantity: number; reorderPoint: number }[];
  totalQuantity: number;
  isLowStockAnywhere: boolean;
}

export interface InventoryTransfer {
  id: string;
  fromRestaurantId: string;
  fromRestaurantName: string;
  toRestaurantId: string;
  toRestaurantName: string;
  items: { itemName: string; quantity: number; unit: string }[];
  status: 'pending' | 'in_transit' | 'received' | 'cancelled';
  createdAt: string;
  createdBy: string;
}

export interface InventoryTransferFormData {
  fromRestaurantId: string;
  toRestaurantId: string;
  items: { itemId: string; quantity: number }[];
}

export interface LocationHealth {
  merchantId: string;
  restaurantName: string;
  status: 'online' | 'degraded' | 'offline';
  lastHeartbeat: string;
  activeAlerts: number;
  devicesOnline: number;
  devicesTotal: number;
  ordersInQueue: number;
  overdueOrders: number;
}

export interface GroupCampaign {
  id: string;
  groupId: string;
  name: string;
  targetLocationIds: string[];
  audienceSize: number;
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  createdAt: string;
}

export interface LocationBenchmark {
  merchantId: string;
  restaurantName: string;
  performanceScore: number;
  revenuePercentile: number;
  laborPercentile: number;
  foodCostPercentile: number;
  customerSatPercentile: number;
  speedPercentile: number;
  trend: 'improving' | 'stable' | 'declining';
  previousScore: number;
  needsAttention: boolean;
  bestPracticeArea: string | null;
}

export type ComplianceCategory = 'menu' | 'pricing' | 'settings' | 'hours' | 'branding';

export interface ComplianceCheckItem {
  id: string;
  category: ComplianceCategory;
  label: string;
  isPassing: boolean;
  detail: string | null;
  resolvedAt: string | null;
}

export interface LocationCompliance {
  merchantId: string;
  restaurantName: string;
  score: number;
  totalChecks: number;
  passingChecks: number;
  failingChecks: number;
  items: ComplianceCheckItem[];
  lastAuditAt: string;
}

export type MultiLocationTab = 'overview' | 'groups' | 'menu-sync' | 'settings' | 'franchise' | 'staff' | 'customers' | 'inventory';
