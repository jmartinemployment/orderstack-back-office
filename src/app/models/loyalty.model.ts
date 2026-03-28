export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type LoyaltyTransactionType = 'earn' | 'redeem' | 'adjustment' | 'expire' | 'reversal';

export const TIER_RANK: Record<LoyaltyTier, number> = { bronze: 0, silver: 1, gold: 2, platinum: 3 };

export function tierMeetsMinimum(customerTier: LoyaltyTier, minTier: LoyaltyTier): boolean {
  return TIER_RANK[customerTier] >= TIER_RANK[minTier];
}

export interface LoyaltyConfig {
  id: string;
  merchantId: string;
  enabled: boolean;
  pointsPerDollar: number;
  pointsRedemptionRate: number;
  tierSilverMin: number;
  tierGoldMin: number;
  tierPlatinumMin: number;
  silverMultiplier: number;
  goldMultiplier: number;
  platinumMultiplier: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyProfile {
  customerId: string;
  points: number;
  tier: LoyaltyTier;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  nextTier: string | null;
  pointsToNextTier: number;
  tierProgress: number;
}

export interface LoyaltyTransaction {
  id: string;
  merchantId: string;
  customerId: string;
  orderId: string | null;
  type: LoyaltyTransactionType;
  points: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

export interface LoyaltyReward {
  id: string;
  merchantId: string;
  name: string;
  description: string | null;
  pointsCost: number;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  minTier: LoyaltyTier;
  isActive: boolean;
  createdAt: string;
}

export interface LoyaltyRedemption {
  pointsToRedeem: number;
  discountAmount: number;
  rewardId?: string;
}

export function defaultLoyaltyConfig(): LoyaltyConfig {
  return {
    id: '',
    merchantId: '',
    enabled: false,
    pointsPerDollar: 1,
    pointsRedemptionRate: 0.01,
    tierSilverMin: 500,
    tierGoldMin: 2000,
    tierPlatinumMin: 5000,
    silverMultiplier: 1.25,
    goldMultiplier: 1.5,
    platinumMultiplier: 2,
    createdAt: '',
    updatedAt: '',
  };
}

export function getTierLabel(tier: LoyaltyTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function getTierColor(tier: LoyaltyTier): string {
  switch (tier) {
    case 'bronze': return '#cd7f32';
    case 'silver': return '#c0c0c0';
    case 'gold': return '#ffd700';
    case 'platinum': return '#e5e4e2';
  }
}
