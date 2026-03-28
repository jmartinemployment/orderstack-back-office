export type PricingRuleType = 'happy_hour' | 'surge' | 'off_peak' | 'seasonal' | 'custom';
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface PricingRule {
  id: string;
  name: string;
  type: PricingRuleType;
  multiplier: number;
  startTime: string;
  endTime: string;
  daysOfWeek: DayOfWeek[];
  categoryIds: string[];
  itemIds: string[];
  active: boolean;
  startDate?: string;
  endDate?: string;
}

export interface PricingRecommendation {
  type: PricingRuleType;
  suggestion: string;
  reason: string;
  estimatedImpact: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ItemPricePreview {
  menuItemId: string;
  name: string;
  basePrice: number;
  adjustedPrice: number;
  activeRule: string | null;
  multiplier: number;
}

export type PricingTab = 'rules' | 'preview' | 'recommendations';
