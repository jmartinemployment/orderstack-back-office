import type { MerchantProfile } from './platform.model';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address: string;
  phone?: string;
  email?: string;
  logo?: string;
  timezone: string;
  currency: string;
  taxRate: number;
  isActive: boolean;
  settings: RestaurantSettings;
  merchantProfile?: MerchantProfile;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantSettings {
  orderTypes: {
    pickup: boolean;
    delivery: boolean;
    dineIn: boolean;
  };
  paymentMethods: {
    cash: boolean;
    card: boolean;
    online: boolean;
  };
  notifications: {
    newOrderSound: boolean;
    readyOrderSound: boolean;
  };
}

export interface LegacyDevice {
  id: string;
  merchantId: string;
  deviceId: string;
  name: string;
  type: 'sos' | 'kds' | 'online';
  isActive: boolean;
  lastSeenAt: string;
  createdAt: string;
}

// --- Business Hours (GOS-SPEC-07 Phase 3) ---

export interface SpecialHours {
  id: string;
  merchantId: string;
  date: string;
  openTime: string | null;
  closeTime: string | null;
  reason: string;
  isOpen: boolean;
}

export interface BusinessHoursCheck {
  isOpen: boolean;
  currentDay: string;
  openTime: string | null;
  closeTime: string | null;
  nextOpenDay: string | null;
  nextOpenTime: string | null;
  specialHoursReason: string | null;
}

// --- Multi-Location Online Ordering (GOS-SPEC-07 Phase 2.5) ---

export interface OnlineLocation {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string | null;
  distanceMiles: number | null;
  isOpen: boolean;
  currentWaitMinutes: number | null;
  nextOpenTime: string | null;
  logo: string | null;
}
