export type ReportBlockType =
  | 'sales_summary'
  | 'payment_methods'
  | 'item_sales'
  | 'category_sales'
  | 'modifier_sales'
  | 'team_member_sales'
  | 'discounts'
  | 'voids_comps'
  | 'taxes_fees'
  | 'tips'
  | 'hourly_breakdown'
  | 'section_sales'
  | 'channel_breakdown'
  | 'refunds';

export interface ReportBlock {
  type: ReportBlockType;
  label: string;
  displayOrder: number;
  columns?: string[];
}

export interface SavedReport {
  id: string;
  merchantId: string;
  name: string;
  blocks: ReportBlock[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedReportFormData {
  name: string;
  blocks: ReportBlock[];
}

export type ReportScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export interface ReportSchedule {
  id: string;
  merchantId: string;
  savedReportId: string;
  frequency: ReportScheduleFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  timeOfDay: string;
  recipientEmails: string[];
  isActive: boolean;
  lastSentAt: string | null;
  createdAt: string;
}

export interface ReportScheduleFormData {
  savedReportId: string;
  frequency: ReportScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay: string;
  recipientEmails: string[];
}

export type ReportExportFormat = 'csv' | 'xlsx' | 'pdf';

export type ComparisonPeriod = 'previous_period' | 'same_period_last_year' | 'custom';

export interface ReportDateRange {
  startDate: string;
  endDate: string;
  comparisonPeriod?: ComparisonPeriod;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
}

export interface HourlySalesRow {
  hour: number;
  orderCount: number;
  revenue: number;
  avgTicket: number;
  covers: number;
}

export interface SectionSalesRow {
  sectionName: string;
  orderCount: number;
  revenue: number;
  avgTicket: number;
  covers: number;
  avgTurnTimeMinutes: number;
}

export interface ChannelBreakdownRow {
  channel: string;
  orderCount: number;
  revenue: number;
  percentage: number;
}

export interface DiscountReportRow {
  discountName: string;
  discountType: string;
  timesApplied: number;
  totalAmount: number;
  avgDiscount: number;
  topItems: string[];
}

export interface RefundReportRow {
  date: string;
  orderNumber: string;
  amount: number;
  reason: string;
  processedBy: string;
  paymentMethod: string;
}

// --- Team Member Sales Report (Phase 3) ---

export interface TeamMemberSalesRow {
  staffId: string;
  staffName: string;
  jobTitle: string;
  orderCount: number;
  revenue: number;
  avgTicket: number;
  tips: number;
  hoursWorked: number;
  commissionEarned: number;
}

// --- Tax & Service Charge Report (Phase 3) ---

export interface TaxReportRow {
  taxName: string;
  taxRate: number;
  taxableAmount: number;
  taxCollected: number;
}

export interface ServiceChargeRow {
  chargeName: string;
  timesApplied: number;
  totalCollected: number;
}

export interface FeeBreakdownRow {
  feeType: string;
  totalAmount: number;
  transactionCount: number;
}

export interface TaxServiceChargeReport {
  taxes: TaxReportRow[];
  serviceCharges: ServiceChargeRow[];
  fees: FeeBreakdownRow[];
  grossRevenue: number;
  totalTax: number;
  totalServiceCharges: number;
  totalFees: number;
  netRevenue: number;
}

// --- Real-Time KPI (Phase 3) ---

export interface RealTimeKpi {
  todayRevenue: number;
  todayOrders: number;
  todayAov: number;
  yesterdaySameTimeRevenue: number;
  yesterdaySameTimeOrders: number;
  lastWeekSameDayRevenue: number;
  lastWeekSameDayOrders: number;
  lastUpdated: string;
}

// --- Retail Sales Reports (SPEC-23) ---

export interface RetailSalesReport {
  dateRange: ReportDateRange;
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalUnits: number;
  totalTransactions: number;
  averageTransactionValue: number;
  salesByItem: RetailItemSalesRow[];
  salesByCategory: RetailCategorySalesRow[];
  salesByEmployee: RetailEmployeeSalesRow[];
  salesByPaymentMethod: RetailPaymentMethodRow[];
  comparison?: RetailSalesReportComparison;
}

export interface RetailSalesReportComparison {
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalUnits: number;
  totalTransactions: number;
  averageTransactionValue: number;
}

export interface RetailItemSalesRow {
  itemId: string;
  itemName: string;
  variationName: string | null;
  sku: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  profit: number;
  marginPercent: number;
  averageSellingPrice: number;
  discountAmount: number;
}

export interface RetailCategorySalesRow {
  categoryId: string;
  categoryName: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  profit: number;
  marginPercent: number;
}

export interface RetailEmployeeSalesRow {
  employeeId: string;
  employeeName: string;
  transactionCount: number;
  revenue: number;
  averageTransaction: number;
  commission: number;
  itemsSold: number;
}

export interface RetailPaymentMethodRow {
  method: string;
  transactionCount: number;
  totalAmount: number;
  percentage: number;
}

export interface RetailDiscountReport {
  discountName: string;
  timesUsed: number;
  totalDiscountAmount: number;
  revenueImpact: number;
  averageDiscount: number;
}

export interface RetailTaxReport {
  taxRateName: string;
  taxRate: number;
  taxableAmount: number;
  taxCollected: number;
}

// --- Retail Inventory Reports (SPEC-23 Phase 2) ---

export interface RetailCogsRow {
  itemId: string;
  itemName: string;
  sku: string;
  unitsSold: number;
  totalCogs: number;
  avgCostPerUnit: number;
  adjustmentBreakdown: { type: string; amount: number }[];
}

export interface RetailCogsTrend {
  period: string;
  totalCogs: number;
  totalRevenue: number;
  grossMargin: number;
}

export interface RetailCogsReport {
  rows: RetailCogsRow[];
  trend: RetailCogsTrend[];
  totalCogs: number;
  totalRevenue: number;
  grossMarginPercent: number;
}

export interface RetailVendorSalesRow {
  vendorId: string;
  vendorName: string;
  itemCount: number;
  unitsSold: number;
  revenue: number;
  cogs: number;
  profit: number;
  marginPercent: number;
  topItems: { itemName: string; revenue: number }[];
}

export interface RetailProjectedProfitRow {
  itemId: string;
  itemName: string;
  sku: string;
  quantityOnHand: number;
  unitCost: number;
  unitPrice: number;
  projectedRevenue: number;
  projectedCogs: number;
  projectedProfit: number;
  marginPercent: number;
}

export interface RetailProjectedProfitReport {
  rows: RetailProjectedProfitRow[];
  totalProjectedRevenue: number;
  totalProjectedCogs: number;
  totalProjectedProfit: number;
  overallMarginPercent: number;
}

// --- Retail Predictive & Comparison (SPEC-23 Phase 3) ---

export interface RetailSalesForecast {
  forecastDays: number;
  dailyForecasts: RetailDailyForecast[];
  totalPredictedRevenue: number;
  totalPredictedUnits: number;
  confidencePercent: number;
}

export interface RetailDailyForecast {
  date: string;
  predictedRevenue: number;
  predictedUnits: number;
  confidenceLow: number;
  confidenceHigh: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface RetailDemandForecastItem {
  itemId: string;
  itemName: string;
  sku: string;
  currentStock: number;
  avgDailyDemand: number;
  predictedStockoutDate: string | null;
  daysUntilStockout: number | null;
  reorderRecommendation: string | null;
  seasonalPattern: 'peak' | 'normal' | 'low' | null;
  seasonalMultiplier: number;
}

export interface RetailYoyComparison {
  metric: string;
  thisYear: number;
  lastYear: number;
  change: number;
  changePercent: number;
}

export interface RetailYoyReport {
  period: string;
  summaryMetrics: RetailYoyComparison[];
  monthlyRevenue: { month: string; thisYear: number; lastYear: number }[];
  topGrowthItems: { itemName: string; thisYearRevenue: number; lastYearRevenue: number; growthPercent: number }[];
  topDeclineItems: { itemName: string; thisYearRevenue: number; lastYearRevenue: number; declinePercent: number }[];
}

export type RetailReportTab = 'overview' | 'items' | 'categories' | 'employees' | 'discounts' | 'tax' | 'cogs' | 'vendor-sales' | 'projected-profit' | 'forecast' | 'demand' | 'yoy';

export type RetailReportPeriod = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

export type ShiftPreset = 'all' | 'morning' | 'afternoon' | 'evening';

export interface ShiftFilter {
  preset: ShiftPreset;
  startHour: number;
  endHour: number;
  label: string;
}

export const SHIFT_PRESETS: ShiftFilter[] = [
  { preset: 'all', startHour: 0, endHour: 24, label: 'All Day' },
  { preset: 'morning', startHour: 6, endHour: 14, label: 'Morning (6am - 2pm)' },
  { preset: 'afternoon', startHour: 14, endHour: 22, label: 'Afternoon (2pm - 10pm)' },
  { preset: 'evening', startHour: 22, endHour: 30, label: 'Evening (10pm - 6am)' },
];
