export type PaymentProcessor = 'paypal';

export type SubscriptionStatus = 'trialing' | 'active' | 'canceled' | 'suspended';

/** PayPal processing rates — pass-through to merchant, OrderStack takes $0 */
export const PAYPAL_RATES = {
  onlineSales: '3.49% + $0.49',
  cardNotPresent: '2.99% + $0.49',
  inPerson: '2.29% + $0.09',
  payLater: '4.99% + $0.49',
} as const;

/** Single plan — $50/month */
export const PLAN_PRICE_CENTS = 5000;
export const PLAN_PRICE_DISPLAY = '$50';
export const PLAN_NAME = 'OrderStack';

export interface Subscription {
  id: string | null;
  restaurantId: string;
  status: SubscriptionStatus;
  planPrice: number;
  planName: string;
  interval: 'month';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  paypalSubscriptionId: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  trialDaysRemaining: number;
  isTrial: boolean;
}

export type CancellationReason =
  | 'too_expensive'
  | 'missing_features'
  | 'too_complicated'
  | 'switching_competitor'
  | 'business_closing'
  | 'just_testing'
  | 'technical_issues'
  | 'no_time_setup'
  | 'other';

export interface CancellationFeedback {
  reason: CancellationReason;
  followUp?: string;
  competitorName?: string;
  missingFeatures?: string[];
  priceExpectation?: string;
  winBackOffered: boolean;
  winBackAccepted: boolean;
  additionalFeedback?: string;
}

export const CANCELLATION_REASONS: { key: CancellationReason; label: string }[] = [
  { key: 'too_expensive', label: 'Too expensive' },
  { key: 'missing_features', label: 'Missing features I need' },
  { key: 'too_complicated', label: 'Too complicated to use' },
  { key: 'switching_competitor', label: 'Switching to another product' },
  { key: 'business_closing', label: 'My business is closing / seasonal' },
  { key: 'just_testing', label: 'I was just trying it out' },
  { key: 'technical_issues', label: 'Technical issues / bugs' },
  { key: 'no_time_setup', label: 'Not enough time to set it up' },
  { key: 'other', label: 'Other' },
];

export const MISSING_FEATURE_OPTIONS: string[] = [
  'Online ordering',
  'Delivery integration',
  'Loyalty program',
  'Advanced reporting',
  'Multi-location',
  'Inventory management',
  'Staff scheduling',
  'Marketing tools',
];

export const COMPETITOR_OPTIONS: string[] = [
  'Square',
  'Toast',
  'Clover',
  'TouchBistro',
  'Lightspeed',
];

export const REASONS_WITHOUT_FOLLOWUP: CancellationReason[] = [
  'no_time_setup',
  'business_closing',
  'just_testing',
];
