import { MenuItem } from './menu.model';

export type MenuBadgeType = 'best-seller' | 'chefs-pick' | 'new' | 'popular' | null;

export interface MenuItemBadge {
  type: MenuBadgeType;
  label: string;
  cssClass: string;
}

export interface UpsellSuggestion {
  item: MenuItem;
  reason: string;
  suggestedScript: string;
}

export type MenuQuadrant = 'star' | 'cash-cow' | 'puzzle' | 'dog';

export interface MenuEngineeringItem {
  id: string;
  name: string;
  price: number;
  cost: number;
  profitMargin: number;
  popularity: number;
  classification: MenuQuadrant;
  categoryName: string;
}

export interface MenuEngineeringInsight {
  text: string;
  type: 'action' | 'observation' | 'warning';
  priority: 'high' | 'medium' | 'low';
}

export interface MenuEngineeringData {
  items: MenuEngineeringItem[];
  insights: MenuEngineeringInsight[];
  summary: {
    totalItems: number;
    stars: number;
    cashCows: number;
    puzzles: number;
    dogs: number;
    averageMargin: number;
    averagePopularity: number;
  };
}

export interface SalesSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topSellingItems: { name: string; quantity: number; revenue: number }[];
  peakHours: { hour: number; orders: number; revenue: number }[];
}

export interface SalesInsight {
  text: string;
  type: 'positive' | 'negative' | 'neutral';
  metric?: string;
  change?: number;
}

export interface SalesReport {
  summary: SalesSummary;
  insights: SalesInsight[];
  comparison?: {
    revenueChange: number;
    orderChange: number;
    aovChange: number;
  };
}

// --- Sales Goal Tracking (Phase 2) ---

export type GoalPeriodType = 'daily' | 'weekly' | 'monthly';

export interface SalesGoal {
  id: string;
  merchantId: string;
  type: GoalPeriodType;
  targetRevenue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface SalesGoalFormData {
  type: GoalPeriodType;
  targetRevenue: number;
  startDate: string;
  endDate: string;
}

export interface GoalProgress {
  goalId: string;
  type: GoalPeriodType;
  targetRevenue: number;
  currentRevenue: number;
  progressPercent: number;
  paceStatus: 'on_track' | 'ahead' | 'behind';
  paceAmount: number;
  streak: number;
}

// --- Period-Over-Period Comparison (Phase 2) ---

export type ComparisonMode = 'previous_period' | 'same_last_week' | 'same_last_year' | 'custom';

export interface ComparisonData {
  currentValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'flat';
}

// --- Team Performance Analytics (Phase 2) ---

export interface TeamMemberSales {
  staffId: string;
  staffName: string;
  jobTitle: string;
  totalRevenue: number;
  orderCount: number;
  averageTicket: number;
  totalTips: number;
  itemsSold: number;
}

export interface TeamSalesReport {
  members: TeamMemberSales[];
  periodStart: string;
  periodEnd: string;
  totalRevenue: number;
  totalOrders: number;
}

// --- Conversion Funnel (Phase 2) ---

export interface FunnelStep {
  name: string;
  count: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface ConversionFunnel {
  steps: FunnelStep[];
  overallConversionRate: number;
  periodStart: string;
  periodEnd: string;
}

// --- Anomaly Sales Alerts (Phase 2) ---

export type SalesAlertType = 'revenue_anomaly' | 'aov_anomaly' | 'volume_spike' | 'volume_drop' | 'new_customer_surge' | 'channel_shift';

export interface SalesAlert {
  id: string;
  type: SalesAlertType;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  value: number;
  baseline: number;
  changePercent: number;
  timestamp: string;
  acknowledged: boolean;
}

// --- Menu Performance Deep Dive (Phase 3) ---

export interface ItemProfitabilityTrend {
  itemId: string;
  itemName: string;
  dataPoints: { date: string; margin: number; revenue: number; unitsSold: number }[];
}

export interface PriceElasticityIndicator {
  itemId: string;
  itemName: string;
  currentPrice: number;
  elasticity: number;
  recommendation: 'increase' | 'decrease' | 'hold';
  estimatedRevenueChange: number;
  confidence?: 'low' | 'medium' | 'high';
  reasoning?: string;
}

export interface CannibalizationResult {
  newItemId: string;
  newItemName: string;
  affectedItemId: string;
  affectedItemName: string;
  salesDeclinePercent: number;
  periodStart: string;
  periodEnd: string;
  recommendation?: string;
}

export interface SeasonalPattern {
  itemId: string;
  itemName: string;
  dayOfWeek: { day: string; avgSales: number }[];
  monthOfYear: { month: string; avgSales: number }[];
}

// --- Prep Time Accuracy (GAP-R05 Phase 2) ---

export interface PrepTimeAccuracyRow {
  itemId: string;
  itemName: string;
  estimatedMinutes: number;
  actualAvgMinutes: number;
  accuracy: number;          // percentage (0-100)
  sampleSize: number;
  suggestedAdjustment: number | null;  // null = no change needed
}

export interface PrepTimeQueueEstimate {
  baseMinutes: number;
  queueDepth: number;
  adjustedMinutes: number;
}

// --- Predictive Analytics (Phase 3) ---

export interface RevenueForecast {
  forecastDays: number;
  dataPoints: { date: string; predicted: number; lower: number; upper: number }[];
  totalPredicted: number;
  confidence: number;
}

export interface DemandForecastItem {
  itemId: string;
  itemName: string;
  predictedQuantity: number;
  confidence: number;
  dayOfWeekAvg: number;
}

export interface StaffingRecommendation {
  date: string;
  hourlyBreakdown: { hour: number; recommendedStaff: number; predictedOrders: number; predictedRevenue: number }[];
  totalRecommendedHours: number;
  estimatedLaborCost: number;
}

// --- AI Dashboard Widgets (GAP-R02) ---

export type AiCardResponseType = 'chart' | 'table' | 'kpi' | 'text';
export type AiChartType = 'bar' | 'line' | 'pie' | 'doughnut';

export interface AiInsightCard {
  id: string;
  query: string;
  responseType: AiCardResponseType;
  title: string;
  data: Record<string, unknown>;
  chartType?: AiChartType;
  columns?: string[];
  value?: number;
  unit?: string;
  trend?: 'up' | 'down' | 'flat';
  createdAt: string;
}

export interface PinnedWidget {
  id: string;
  insightCard: AiInsightCard;
  position: number;
  size: 'small' | 'medium' | 'large';
  pinnedAt: string;
  pinnedBy: string;
}

export interface AiQueryResponse {
  query: string;
  cards: AiInsightCard[];
  suggestedFollowUps: string[];
}

// --- Online Ordering Analytics Events (GOS-SPEC-07 Phase 3) ---

export type OnlineOrderEventType =
  | 'page_view'
  | 'menu_view'
  | 'item_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'checkout_start'
  | 'promo_applied'
  | 'order_placed'
  | 'order_failed'
  | 'share_item';

export interface OnlineOrderEvent {
  type: OnlineOrderEventType;
  merchantId: string;
  sessionId: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}
