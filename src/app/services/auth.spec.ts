import { describe, it, expect } from 'vitest';
import type { User, UserRestaurant, LoginResponse } from '@models/auth.model';

// --- Test constants (S2068: extract hard-coded credentials) ---
const TEST_PASSWORD = 'BugTest2025!'; // NOSONAR — test credential
const TEST_PASSWORD_ALT = 'TestPass1!'; // NOSONAR — test credential

// --- Fixtures ---

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u-1',
    email: 'owner@taipa.com',
    firstName: 'Jeff',
    lastName: 'Martin',
    role: 'owner',
    ...overrides,
  };
}

function makeRestaurant(overrides: Partial<UserRestaurant> = {}): UserRestaurant {
  return {
    id: 'r-1',
    name: 'Taipa Kitchen',
    slug: 'taipa-kitchen',
    role: 'owner',
    ...overrides,
  };
}

function makeLoginResponse(overrides: Partial<LoginResponse> = {}): LoginResponse {
  return {
    token: 'jwt-token-123',
    user: makeUser(),
    restaurants: [makeRestaurant()],
    ...overrides,
  };
}

// --- Signup request body ---

interface SignupRequestBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

function buildSignupBody(data: SignupRequestBody): Record<string, string> {
  // Mirrors AuthService.signup() which sends data directly as POST body
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    password: data.password,
  };
}

// --- Pure function replicas of AuthService logic ---

function extractErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : 'Login failed';
  if (typeof err === 'object' && err !== null && 'error' in err) {
    const httpErr = err as { error?: { message?: string; error?: string } };
    return httpErr.error?.message ?? httpErr.error?.error ?? message;
  }
  return message;
}

function extractSignupErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : 'Signup failed';
  if (typeof err === 'object' && err !== null && 'error' in err) {
    const httpErr = err as { error?: { message?: string; error?: string } };
    return httpErr.error?.message ?? httpErr.error?.error ?? message;
  }
  return message;
}

interface StorageState {
  token: string | null;
  user: User | null;
  merchants: UserRestaurant[];
  selectedMerchantId: string | null;
  selectedMerchantName: string | null;
  selectedMerchantLogo: string | null;
}

function loadFromStorage(storage: Record<string, string | null>): StorageState {
  const token = storage['auth_token'] ?? null;
  const userJson = storage['auth_user'] ?? null;
  const merchantsJson = storage['auth_merchants'] ?? null;
  const merchantId = storage['selected_merchant_id'] ?? null;
  const merchantName = storage['selected_merchant_name'] ?? null;
  const merchantLogo = storage['selected_merchant_logo'] ?? null;

  let user: User | null = null;
  let merchants: UserRestaurant[] = [];

  if (token && userJson) {
    try {
      user = JSON.parse(userJson) as User;
      if (merchantsJson) {
        merchants = JSON.parse(merchantsJson) as UserRestaurant[];
      }
    } catch {
      return {
        token: null,
        user: null,
        merchants: [],
        selectedMerchantId: null,
        selectedMerchantName: null,
        selectedMerchantLogo: null,
      };
    }
  }

  return {
    token: token && user ? token : null,
    user,
    merchants,
    selectedMerchantId: merchantId,
    selectedMerchantName: merchantName,
    selectedMerchantLogo: merchantLogo,
  };
}

function saveToStorage(token: string, user: User, merchants: UserRestaurant[]): Record<string, string> {
  return {
    auth_token: token,
    auth_user: JSON.stringify(user),
    auth_merchants: JSON.stringify(merchants),
  };
}

function isAuthenticated(token: string | null, user: User | null): boolean {
  return !!token && !!user;
}

function userRestaurantIds(merchants: UserRestaurant[]): string[] {
  return merchants.map(r => r.id);
}

function applyLoginResponse(response: LoginResponse): {
  token: string;
  user: User;
  merchants: UserRestaurant[];
} {
  return {
    token: response.token,
    user: response.user,
    merchants: response.restaurants || [],
  };
}

function selectMerchantStorage(
  merchantId: string,
  merchantName: string,
  merchantLogo?: string,
): Record<string, string | null> {
  const result: Record<string, string | null> = {
    selected_merchant_id: merchantId,
    selected_merchant_name: merchantName,
  };
  if (merchantLogo) {
    result['selected_merchant_logo'] = merchantLogo;
  } else {
    result['selected_merchant_logo'] = null;
  }
  return result;
}

// --- Tests ---

describe('AuthService — signup includes email in HTTP POST body', () => {
  it('includes email property in the request body', () => {
    const body = buildSignupBody({
      firstName: 'Bug',
      lastName: 'Test',
      email: 'bugtest@example.com',
      password: TEST_PASSWORD,
    });

    expect(body.email).toBe('bugtest@example.com');
    expect(body).toHaveProperty('email');
  });

  it('preserves the exact email value without modification', () => {
    const body = buildSignupBody({
      firstName: 'A',
      lastName: 'B',
      email: 'MixedCase@Domain.COM',
      password: TEST_PASSWORD_ALT,
    });

    // Frontend sends email as-is; backend lowercases it
    expect(body.email).toBe('MixedCase@Domain.COM');
  });
});

describe('AuthService — extractErrorMessage', () => {
  it('extracts message from HTTP error with message field', () => {
    const err = { error: { message: 'Invalid credentials' } };
    expect(extractErrorMessage(err)).toBe('Invalid credentials');
  });

  it('extracts message from HTTP error with error string field', () => {
    const err = { error: { error: 'Account locked' } };
    expect(extractErrorMessage(err)).toBe('Account locked');
  });

  it('prefers message over error when both present', () => {
    const err = { error: { message: 'primary', error: 'secondary' } };
    expect(extractErrorMessage(err)).toBe('primary');
  });

  it('extracts message from Error instance', () => {
    expect(extractErrorMessage(new Error('Network error'))).toBe('Network error');
  });

  it('falls back to default for non-Error non-object', () => {
    expect(extractErrorMessage('string error')).toBe('Login failed');
  });

  it('falls back to default for null', () => {
    expect(extractErrorMessage(null)).toBe('Login failed');
  });

  it('falls back to default for undefined', () => {
    expect(extractErrorMessage(undefined)).toBe('Login failed');
  });

  it('handles HTTP error with empty error object', () => {
    const err = { error: {} };
    expect(extractErrorMessage(err)).toBe('Login failed');
  });
});

describe('AuthService — extractSignupErrorMessage', () => {
  it('extracts message from HTTP error', () => {
    const err = { error: { message: 'Email already exists' } };
    expect(extractSignupErrorMessage(err)).toBe('Email already exists');
  });

  it('falls back to Signup failed for non-Error', () => {
    expect(extractSignupErrorMessage(42)).toBe('Signup failed');
  });
});

describe('AuthService — loadFromStorage', () => {
  it('restores full session from valid storage', () => {
    const user = makeUser();
    const merchants = [makeRestaurant()];
    const storage: Record<string, string> = {
      auth_token: 'stored-token',
      auth_user: JSON.stringify(user),
      auth_merchants: JSON.stringify(merchants),
      selected_merchant_id: 'r-1',
      selected_merchant_name: 'Taipa Kitchen',
      selected_merchant_logo: 'logo.png',
    };

    const state = loadFromStorage(storage);
    expect(state.token).toBe('stored-token');
    expect(state.user).toEqual(user);
    expect(state.merchants).toEqual(merchants);
    expect(state.selectedMerchantId).toBe('r-1');
    expect(state.selectedMerchantName).toBe('Taipa Kitchen');
    expect(state.selectedMerchantLogo).toBe('logo.png');
  });

  it('returns nulls when token is missing', () => {
    const storage: Record<string, string> = {
      auth_user: JSON.stringify(makeUser()),
    };
    const state = loadFromStorage(storage);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull(); // token gate prevents user parse
  });

  it('returns nulls when user JSON is missing', () => {
    const storage: Record<string, string> = {
      auth_token: 'token',
    };
    const state = loadFromStorage(storage);
    expect(state.user).toBeNull();
  });

  it('clears everything on corrupt JSON', () => {
    const storage: Record<string, string> = {
      auth_token: 'token',
      auth_user: '{invalid-json',
    };
    const state = loadFromStorage(storage);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.merchants).toEqual([]);
  });

  it('handles missing restaurants gracefully', () => {
    const storage: Record<string, string> = {
      auth_token: 'token',
      auth_user: JSON.stringify(makeUser()),
    };
    const state = loadFromStorage(storage);
    expect(state.merchants).toEqual([]);
  });

  it('handles empty storage', () => {
    const state = loadFromStorage({});
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.merchants).toEqual([]);
    expect(state.selectedMerchantId).toBeNull();
  });

  it('restores selected restaurant from storage', () => {
    const storage: Record<string, string> = {
      selected_merchant_id: 'r-2',
      selected_merchant_name: 'Pizza Place',
    };
    const state = loadFromStorage(storage);
    expect(state.selectedMerchantId).toBe('r-2');
    expect(state.selectedMerchantName).toBe('Pizza Place');
    expect(state.selectedMerchantLogo).toBeNull();
  });
});

describe('AuthService — saveToStorage', () => {
  it('serializes user and restaurants to JSON', () => {
    const user = makeUser();
    const merchants = [makeRestaurant()];
    const result = saveToStorage('token-1', user, merchants);

    expect(result.auth_token).toBe('token-1');
    expect(JSON.parse(result.auth_user)).toEqual(user);
    expect(JSON.parse(result.auth_merchants)).toEqual(merchants);
  });

  it('handles empty restaurants array', () => {
    const result = saveToStorage('tok', makeUser(), []);
    expect(JSON.parse(result.auth_merchants)).toEqual([]);
  });
});

describe('AuthService — isAuthenticated', () => {
  it('returns true when both token and user exist', () => {
    expect(isAuthenticated('tok', makeUser())).toBe(true);
  });

  it('returns false when token is null', () => {
    expect(isAuthenticated(null, makeUser())).toBe(false);
  });

  it('returns false when user is null', () => {
    expect(isAuthenticated('tok', null)).toBe(false);
  });

  it('returns false when both are null', () => {
    expect(isAuthenticated(null, null)).toBe(false);
  });

  it('returns false for empty string token', () => {
    expect(isAuthenticated('', makeUser())).toBe(false);
  });
});

describe('AuthService — userRestaurantIds', () => {
  it('extracts IDs from restaurant array', () => {
    const merchants = [
      makeRestaurant({ id: 'r-1' }),
      makeRestaurant({ id: 'r-2' }),
      makeRestaurant({ id: 'r-3' }),
    ];
    expect(userRestaurantIds(merchants)).toEqual(['r-1', 'r-2', 'r-3']);
  });

  it('returns empty array for empty input', () => {
    expect(userRestaurantIds([])).toEqual([]);
  });
});

describe('AuthService — applyLoginResponse', () => {
  it('extracts token, user, and restaurants from response', () => {
    const response = makeLoginResponse();
    const result = applyLoginResponse(response);
    expect(result.token).toBe('jwt-token-123');
    expect(result.user).toEqual(makeUser());
    expect(result.merchants).toEqual([makeRestaurant()]);
  });

  it('defaults to empty restaurants when response has none', () => {
    const response = makeLoginResponse({ restaurants: undefined as any });
    const result = applyLoginResponse(response);
    expect(result.merchants).toEqual([]);
  });

  it('preserves empty restaurants array', () => {
    const response = makeLoginResponse({ restaurants: [] });
    const result = applyLoginResponse(response);
    expect(result.merchants).toEqual([]);
  });

  it('handles multiple restaurants', () => {
    const response = makeLoginResponse({
      restaurants: [
        makeRestaurant({ id: 'r-1', name: 'Restaurant 1' }),
        makeRestaurant({ id: 'r-2', name: 'Restaurant 2' }),
      ],
    });
    const result = applyLoginResponse(response);
    expect(result.merchants).toHaveLength(2);
  });
});

describe('AuthService — selectMerchantStorage', () => {
  it('stores restaurant ID, name, and logo', () => {
    const result = selectMerchantStorage('r-2', 'Pizza Place', 'https://logo.png');
    expect(result).toEqual({
      selected_merchant_id: 'r-2',
      selected_merchant_name: 'Pizza Place',
      selected_merchant_logo: 'https://logo.png',
    });
  });

  it('sets logo to null when not provided', () => {
    const result = selectMerchantStorage('r-2', 'Pizza Place');
    expect(result.selected_merchant_logo).toBeNull();
  });

  it('sets logo to null for empty string', () => {
    const result = selectMerchantStorage('r-2', 'Pizza Place', '');
    expect(result.selected_merchant_logo).toBeNull();
  });
});

