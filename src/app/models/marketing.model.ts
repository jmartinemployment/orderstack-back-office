export type CampaignChannel = 'email' | 'sms' | 'both';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
export type CampaignType = 'promotional' | 'welcome' | 'win-back' | 'birthday' | 'loyalty-tier' | 'announcement';

export interface CampaignAudience {
  segments: string[];
  loyaltyTiers: string[];
  minOrders?: number;
  maxDaysSinceOrder?: number;
  tags?: string[];
  estimatedRecipients: number;
}

export interface CampaignPerformance {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  bounced: number;
  redemptions: number;
  revenueAttributed: number;
}

export interface Campaign {
  id: string;
  merchantId: string;
  name: string;
  type: CampaignType;
  channel: CampaignChannel;
  subject: string;
  body: string;
  smsBody?: string;
  audience: CampaignAudience;
  status: CampaignStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  performance: CampaignPerformance;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignFormData {
  name: string;
  type: CampaignType;
  channel: CampaignChannel;
  subject: string;
  body: string;
  smsBody?: string;
  segments: string[];
  loyaltyTiers: string[];
  scheduledAt?: string;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  type: CampaignType;
  subject: string;
  body: string;
  smsBody?: string;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome New Customer',
    type: 'welcome',
    subject: 'Welcome to {{restaurant}}!',
    body: 'Hi {{firstName}},\n\nThank you for visiting {{restaurant}}! We\'re thrilled to have you as a customer.\n\nAs a welcome gift, enjoy 10% off your next order with code WELCOME10.\n\nSee you soon!',
    smsBody: 'Welcome to {{restaurant}}! Enjoy 10% off your next order with code WELCOME10.',
  },
  {
    id: 'win-back',
    name: 'Win-Back Offer',
    type: 'win-back',
    subject: 'We miss you, {{firstName}}!',
    body: 'Hi {{firstName}},\n\nIt\'s been a while since your last visit to {{restaurant}}. We\'d love to see you again!\n\nHere\'s 15% off your next order with code COMEBACK15. Valid for 7 days.\n\nWe hope to see you soon!',
    smsBody: 'We miss you at {{restaurant}}! Come back and save 15% with code COMEBACK15. Valid 7 days.',
  },
  {
    id: 'birthday',
    name: 'Birthday Celebration',
    type: 'birthday',
    subject: 'Happy Birthday, {{firstName}}! A gift inside',
    body: 'Hi {{firstName}},\n\nHappy Birthday from all of us at {{restaurant}}!\n\nTo celebrate, we\'re treating you to a free dessert on your next visit. Just show this email to your server.\n\nHave a wonderful birthday!',
    smsBody: 'Happy Birthday from {{restaurant}}! Enjoy a free dessert on your next visit. Show this text to your server.',
  },
  {
    id: 'promo',
    name: 'Weekend Special',
    type: 'promotional',
    subject: 'This Weekend Only: Special Menu at {{restaurant}}',
    body: 'Hi {{firstName}},\n\nThis weekend we\'re featuring a special tasting menu at {{restaurant}}.\n\nReserve your table now and be among the first to try our new seasonal dishes.\n\nBook online or call us today!',
    smsBody: 'Weekend special at {{restaurant}}! New seasonal menu this Fri-Sun. Reserve now!',
  },
  {
    id: 'loyalty-tier',
    name: 'Loyalty Tier Upgrade',
    type: 'loyalty-tier',
    subject: 'Congratulations! You\'ve reached {{tierName}} status!',
    body: 'Hi {{firstName}},\n\nGreat news — you\'ve been upgraded to {{tierName}} status at {{restaurant}}!\n\nYour new benefits include:\n- {{tierMultiplier}}x points on every order\n- Exclusive member-only offers\n- Priority reservations\n\nThank you for your loyalty!',
    smsBody: 'Congrats {{firstName}}! You\'re now {{tierName}} at {{restaurant}}. Enjoy {{tierMultiplier}}x points and exclusive perks!',
  },
];

// --- Marketing Automations ---

export type AutomationTrigger =
  | 'welcome'
  | 'win_back'
  | 'birthday'
  | 'anniversary'
  | 'loyalty_tier_up'
  | 'post_visit'
  | 'abandoned_cart';

export interface MarketingAutomation {
  id: string;
  merchantId: string;
  trigger: AutomationTrigger;
  name: string;
  campaignTemplateId: string | null;
  channel: CampaignChannel;
  delayMinutes: number;
  isActive: boolean;
  triggerConfig: Record<string, number>;
  sentCount: number;
  createdAt: string;
}

export interface MarketingAutomationFormData {
  trigger: AutomationTrigger;
  name: string;
  campaignTemplateId: string | null;
  channel: CampaignChannel;
  delayMinutes: number;
  isActive: boolean;
  triggerConfig: Record<string, number>;
}

export type MarketingTab = 'campaigns' | 'templates' | 'performance' | 'automations';
