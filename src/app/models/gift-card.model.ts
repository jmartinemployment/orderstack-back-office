export type GiftCardStatus = 'active' | 'redeemed' | 'expired' | 'disabled';
export type GiftCardType = 'digital' | 'physical';

export interface GiftCard {
  id: string;
  merchantId: string;
  code: string;
  type: GiftCardType;
  originalBalance: number;
  currentBalance: number;
  status: GiftCardStatus;
  purchasedBy: string | null;
  purchaserEmail: string | null;
  recipientName: string | null;
  recipientEmail: string | null;
  message: string | null;
  expiresAt: string | null;
  physicalCardNumber: string | null;
  activatedAt: string | null;
  activatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GiftCardRedemption {
  id: string;
  giftCardId: string;
  orderId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

export interface GiftCardFormData {
  type: GiftCardType;
  amount: number;
  recipientName?: string;
  recipientEmail?: string;
  purchaserEmail?: string;
  message?: string;
  expiresAt?: string;
}

export interface GiftCardBalanceCheck {
  code: string;
  currentBalance: number;
  status: GiftCardStatus;
  originalBalance: number;
  expiresAt: string | null;
}

export interface GiftCardActivation {
  cardNumber: string;
  amount: number;
}

export const GIFT_CARD_AMOUNTS = [10, 25, 50, 75, 100, 150, 200];
