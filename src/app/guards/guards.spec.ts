import { describe, it, expect } from 'vitest';

// --- Pure function replicas of guard decision logic ---

// authGuard: if authenticated → true, else → redirect /signup
function authGuardDecision(isAuthenticated: boolean): boolean | string {
  return isAuthenticated ? true : '/signup';
}

// guestGuard: if not authenticated → true (allow login page)
//             if authenticated → redirect /administration
function guestGuardDecision(
  isAuthenticated: boolean,
): boolean | string {
  if (!isAuthenticated) return true;
  return '/administration';
}

// deviceModeRedirectGuard: always redirects to /administration
function deviceModeRedirectGuardDecision(): string {
  return '/administration';
}

// authInterceptor: should attach token, detect 401, skip for login endpoint
function shouldAttachToken(token: string | null): boolean {
  return token !== null && token !== '';
}

function shouldHandleSessionExpiry(statusCode: number, requestUrl: string): boolean {
  return statusCode === 401 && !requestUrl.includes('/auth/login');
}

function cloneWithAuth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

// --- Tests ---

describe('authGuard — decision logic', () => {
  it('returns true when authenticated', () => {
    expect(authGuardDecision(true)).toBe(true);
  });

  it('redirects to /signup when not authenticated', () => {
    expect(authGuardDecision(false)).toBe('/signup');
  });
});

describe('guestGuard — decision logic', () => {
  it('allows access when not authenticated', () => {
    expect(guestGuardDecision(false)).toBe(true);
  });

  it('redirects to /administration when authenticated', () => {
    expect(guestGuardDecision(true)).toBe('/administration');
  });
});

describe('deviceModeRedirectGuard — decision logic', () => {
  it('always redirects to /administration', () => {
    expect(deviceModeRedirectGuardDecision()).toBe('/administration');
  });
});

describe('authInterceptor — token attachment', () => {
  it('attaches token when present', () => {
    expect(shouldAttachToken('jwt-123')).toBe(true);
  });

  it('does not attach when token is null', () => {
    expect(shouldAttachToken(null)).toBe(false);
  });

  it('does not attach when token is empty', () => {
    expect(shouldAttachToken('')).toBe(false);
  });
});

describe('authInterceptor — session expiry detection', () => {
  it('handles 401 on non-login endpoint', () => {
    expect(shouldHandleSessionExpiry(401, '/api/restaurant/r-1/orders')).toBe(true);
  });

  it('skips 401 on login endpoint', () => {
    expect(shouldHandleSessionExpiry(401, '/api/auth/login')).toBe(false);
  });

  it('ignores non-401 errors', () => {
    expect(shouldHandleSessionExpiry(403, '/api/restaurant/r-1/orders')).toBe(false);
    expect(shouldHandleSessionExpiry(500, '/api/restaurant/r-1/orders')).toBe(false);
    expect(shouldHandleSessionExpiry(404, '/api/restaurant/r-1/orders')).toBe(false);
  });
});

describe('authInterceptor — cloneWithAuth', () => {
  it('creates Authorization header with Bearer prefix', () => {
    const headers = cloneWithAuth('my-token');
    expect(headers.Authorization).toBe('Bearer my-token');
  });
});
