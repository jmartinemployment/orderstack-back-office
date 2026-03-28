export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  restaurantGroupId?: string | null;
  merchantIds?: string[];
}

export interface UserRestaurant {
  id: string;
  name: string;
  slug: string;
  role: string;
  onboardingComplete: boolean;
  subscriptionStatus?: 'trialing' | 'active' | 'canceled' | 'suspended';
  trialEndsAt?: string | null;
}

export type UserRole = 'owner' | 'manager' | 'staff' | 'super_admin';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  restaurants: UserRestaurant[];
  deviceId?: string | null;
  deviceMfaExpiresAt?: string | null;
  mfaRequired?: boolean;
  mfaToken?: string;
  maskedEmail?: string;
  emailVerificationRequired?: boolean;
  loginToken?: string;
}

export interface MfaSetupData {
  sent: boolean;
  maskedEmail: string;
}

export interface MfaStatus {
  enabled: boolean;
  mfaType?: string;
}

export interface MfaTrustedDevice {
  id: string;
  teamMemberId: string;
  uaFingerprint: string;
  ipAddress: string;
  deviceInfo: string | null;
  trustedAt: string;
  expiresAt: string;
  teamMember?: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
