import { CoursePacingMode } from './order.model';
import { DeliveryProviderType } from './delivery.model';
import { PaymentProcessorType } from './payment.model';
import { TipPoolRule, TipOutRule } from './tip.model';

export type ControlPanelTab = 'general' | 'hardware' | 'ai-settings' | 'kitchen-orders' | 'bar' | 'online-pricing' | 'payments' | 'tip-management' | 'loyalty' | 'delivery' | 'gift-cards' | 'suppliers' | 'staff' | 'time-clock-config' | 'notifications' | 'account-billing' | 'security';

/**
 * AI Settings — Control Panel > AI Settings tab
 * Source: Get-Order-Stack-Workflow.md lines 583-593
 */
export interface AISettings {
  aiOrderApprovalEnabled: boolean;
  timeThresholdHours: number;
  valueThresholdDollars: number;
  quantityThreshold: number;
  coursePacingMode: CoursePacingMode;
  /** Gap between course serves in seconds. Range: 300–3600. */
  targetCourseServeGapSeconds: number;
  /** Default course names shown when adding courses to an order. */
  defaultCourseNames: string[];
  /** Automatically fire the first course when the order is sent to kitchen. */
  autoFireFirstCourse: boolean;
  orderThrottlingEnabled: boolean;
  /** Hold new orders when active count exceeds this. Must be > releaseActiveOrders. */
  maxActiveOrders: number;
  /** Hold new orders when overdue count exceeds this. Must be > releaseOverdueOrders. */
  maxOverdueOrders: number;
  /** Resume accepting orders when active count drops to this (hysteresis floor). */
  releaseActiveOrders: number;
  /** Resume accepting orders when overdue count drops to this (hysteresis floor). */
  releaseOverdueOrders: number;
  /** Max minutes an order can be held before auto-release. */
  maxHoldMinutes: number;
  allowRushThrottle: boolean;
  expoStationEnabled: boolean;
  approvalTimeoutHours: number;
}

/**
 * Online Pricing Settings — Control Panel > Online Pricing tab
 * Source: Get-Order-Stack-Workflow.md lines 596-608
 */
export type PriceAdjustmentType = 'percentage' | 'flat';

export interface OnlinePricingSettings {
  enabled: boolean;
  adjustmentType: PriceAdjustmentType;
  adjustmentAmount: number;
  deliveryFee: number;
  showAdjustmentToCustomer: boolean;
}

/**
 * Capacity Block — blocked dates/times for private events.
 */
export interface CapacityBlock {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  reason: string;
}

// --- Factory defaults ---

export function defaultAISettings(): AISettings {
  return {
    aiOrderApprovalEnabled: false,
    timeThresholdHours: 12,
    valueThresholdDollars: 200,
    quantityThreshold: 20,
    coursePacingMode: 'disabled',
    targetCourseServeGapSeconds: 1200,
    defaultCourseNames: ['Appetizer', 'Entree', 'Dessert'],
    autoFireFirstCourse: true,
    orderThrottlingEnabled: false,
    maxActiveOrders: 18,
    maxOverdueOrders: 6,
    releaseActiveOrders: 14,
    releaseOverdueOrders: 3,
    maxHoldMinutes: 20,
    allowRushThrottle: false,
    expoStationEnabled: false,
    approvalTimeoutHours: 24,
  };
}

export function defaultOnlinePricingSettings(): OnlinePricingSettings {
  return {
    enabled: false,
    adjustmentType: 'percentage',
    adjustmentAmount: 0,
    deliveryFee: 0,
    showAdjustmentToCustomer: true,
  };
}

/**
 * Payment Settings — Control Panel > Payments tab
 */
export interface PaymentSettings {
  processor: PaymentProcessorType;
  requirePaymentBeforeKitchen: boolean;
  surchargeEnabled: boolean;
  surchargePercent: number;
  taxRate: number;
}

export function defaultPaymentSettings(): PaymentSettings {
  return { processor: 'none', requirePaymentBeforeKitchen: false, surchargeEnabled: false, surchargePercent: 3.5, taxRate: 0.08 };
}

export interface TipManagementSettings {
  enabled: boolean;
  minimumWage: number;
  defaultHourlyRate: number;
  poolRules: TipPoolRule[];
  tipOutRules: TipOutRule[];
}

export function defaultTipManagementSettings(): TipManagementSettings {
  return {
    enabled: false,
    minimumWage: 12,
    defaultHourlyRate: 5.63,
    poolRules: [],
    tipOutRules: [],
  };
}

// --- Schedule Enforcement & Auto Clock-Out Settings ---

export type AutoClockOutMode = 'after_shift_end' | 'business_day_cutoff' | 'never';

export interface TimeclockSettings {
  /** Block clock-in if no scheduled shift */
  scheduleEnforcementEnabled: boolean;
  /** Minutes before shift start that clock-in is allowed */
  earlyClockInGraceMinutes: number;
  /** Flag clock-ins that are this many minutes late */
  lateClockInThresholdMinutes: number;
  /** Allow manager override for schedule enforcement */
  allowManagerOverride: boolean;
  /** Auto clock-out mode */
  autoClockOutMode: AutoClockOutMode;
  /** Minutes after shift end to auto-clock-out (only for 'after_shift_end' mode) */
  autoClockOutDelayMinutes: number;
  /** Business day cutoff time in HH:mm (only for 'business_day_cutoff' mode) */
  businessDayCutoffTime: string;
  /** Alert managers of open timecards at end of day */
  alertOpenTimecards: boolean;
}

export function defaultTimeclockSettings(): TimeclockSettings {
  return {
    scheduleEnforcementEnabled: true,
    earlyClockInGraceMinutes: 15,
    lateClockInThresholdMinutes: 10,
    allowManagerOverride: true,
    autoClockOutMode: 'never',
    autoClockOutDelayMinutes: 30,
    businessDayCutoffTime: '02:00',
    alertOpenTimecards: true,
  };
}

// --- Auto Gratuity ---

export interface AutoGratuitySettings {
  enabled: boolean;
  minPartySize: number;
  gratuityPercent: number;
  applyToTakeout: boolean;
  applyToDelivery: boolean;
}

export function defaultAutoGratuitySettings(): AutoGratuitySettings {
  return {
    enabled: false,
    minPartySize: 6,
    gratuityPercent: 18,
    applyToTakeout: false,
    applyToDelivery: false,
  };
}

export interface DeliverySettings {
  provider: DeliveryProviderType;
  autoDispatch: boolean;
  showQuotesToCustomer: boolean;
  defaultTipPercent: number;
}

export function defaultDeliverySettings(): DeliverySettings {
  return {
    provider: 'none',
    autoDispatch: false,
    showQuotesToCustomer: true,
    defaultTipPercent: 15,
  };
}

// --- Scan to Pay ---

export interface ScanToPaySettings {
  enabled: boolean;
  defaultTipPercentages: number[];
  tokenExpirationMinutes: number;
  autoCloseOnFullPayment: boolean;
  allowSplitPay: boolean;
  includeQrOnPrintedReceipts: boolean;
  emailReceiptEnabled: boolean;
}

export function defaultScanToPaySettings(): ScanToPaySettings {
  return {
    enabled: true,
    defaultTipPercentages: [15, 18, 20, 25],
    tokenExpirationMinutes: 120,
    autoCloseOnFullPayment: true,
    allowSplitPay: true,
    includeQrOnPrintedReceipts: true,
    emailReceiptEnabled: true,
  };
}

// === AI Admin Configuration ===

export type AIFeatureKey =
  | 'aiCostEstimation'
  | 'menuEngineering'
  | 'salesInsights'
  | 'laborOptimization'
  | 'inventoryPredictions'
  | 'taxEstimation'
  | 'aiCateringProposals'
  | 'sentimentAnalysis';

export interface AIFeatureToggle {
  key: AIFeatureKey;
  label: string;
  description: string;
  costTier: 'high' | 'medium' | 'low';
  estimatedMonthlyCost: string;
}

export interface AIAdminConfig {
  apiKeyConfigured: boolean;
  apiKeyLastFour: string | null;
  apiKeyValid: boolean;
  features: Record<AIFeatureKey, boolean>;
  usage: AIUsageSummary | null;
}

export interface AIFeatureUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostCents: number;
}

export interface AIUsageSummary {
  byFeature: Partial<Record<AIFeatureKey, AIFeatureUsage>>;
  totalCostCents: number;
  periodStart: string;
  periodEnd: string;
}

export const AI_FEATURE_CATALOG: AIFeatureToggle[] = [
  { key: 'aiCostEstimation', label: 'AI Cost Estimation', description: 'Estimates ingredient costs and suggests menu prices using AI.', costTier: 'high', estimatedMonthlyCost: '~$5–15/mo' },
  { key: 'menuEngineering', label: 'Menu Engineering', description: 'Classifies menu items (Stars/Dogs/Puzzles/Cash Cows) with AI recommendations.', costTier: 'high', estimatedMonthlyCost: '~$5–15/mo' },
  { key: 'salesInsights', label: 'Sales Insights', description: 'Generates AI-powered revenue trends and business insights.', costTier: 'medium', estimatedMonthlyCost: '~$2–8/mo' },
  { key: 'laborOptimization', label: 'Labor Optimization', description: 'AI shift recommendations and labor cost analysis.', costTier: 'medium', estimatedMonthlyCost: '~$2–8/mo' },
  { key: 'inventoryPredictions', label: 'Inventory Predictions', description: 'AI-powered reorder predictions and waste reduction tips.', costTier: 'medium', estimatedMonthlyCost: '~$2–8/mo' },
  { key: 'taxEstimation', label: 'Tax Estimation', description: 'AI-assisted tax rate lookup and estimation.', costTier: 'low', estimatedMonthlyCost: '~$0.50–2/mo' },
  { key: 'aiCateringProposals', label: 'AI Catering Proposals', description: 'Auto-generates polished proposal copy (intro, menu descriptions, service overview) for catering events.', costTier: 'medium', estimatedMonthlyCost: '~$1–5/mo' },
  { key: 'sentimentAnalysis', label: 'Sentiment Analysis', description: 'AI-powered analysis of order special instructions for allergy alerts, complaints, and rush requests.', costTier: 'low', estimatedMonthlyCost: '~$0.50–2/mo' },
];

export function defaultAiFeatures(): Record<AIFeatureKey, boolean> {
  return {
    aiCostEstimation: false,
    menuEngineering: false,
    salesInsights: false,
    laborOptimization: false,
    inventoryPredictions: false,
    taxEstimation: false,
    aiCateringProposals: false,
    sentimentAnalysis: false,
  };
}

// --- Notification Settings ---

export type SmsProvider = 'twilio' | 'none';
export type EmailProvider = 'sendgrid' | 'none';
export type NotificationChannel = 'sms' | 'email' | 'in_app';

export interface NotificationSettings {
  smsEnabled: boolean;
  smsProvider: SmsProvider;
  smsAccountSid: string;
  smsAuthToken: string;
  smsFromNumber: string;
  emailEnabled: boolean;
  emailProvider: EmailProvider;
  emailApiKey: string;
  emailFromAddress: string;
  orderReadyNotifyCustomer: boolean;
  orderReadyNotifyServer: boolean;
  orderReadyChannels: NotificationChannel[];
  orderReadyTemplate: string;
}

// --- Bar Settings ---

export type BarSoundName = 'chime' | 'bell' | 'ding';

export interface BarSettings {
  beverageCategoryIds: string[];
  defaultMode: 'create' | 'incoming';
  soundEnabled: boolean;
  soundName: BarSoundName;
}

export function defaultBarSettings(): BarSettings {
  return {
    beverageCategoryIds: [],
    defaultMode: 'create',
    soundEnabled: true,
    soundName: 'chime',
  };
}

export function defaultNotificationSettings(): NotificationSettings {
  return {
    smsEnabled: false,
    smsProvider: 'none',
    smsAccountSid: '',
    smsAuthToken: '',
    smsFromNumber: '',
    emailEnabled: false,
    emailProvider: 'none',
    emailApiKey: '',
    emailFromAddress: '',
    orderReadyNotifyCustomer: true,
    orderReadyNotifyServer: false,
    orderReadyChannels: ['sms'],
    orderReadyTemplate: 'Hi {name}, your order #{number} is ready for pickup!',
  };
}
