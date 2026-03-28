import { describe, it, expect } from 'vitest';

// --- Types ---

type ConnectStatus = 'none' | 'pending' | 'connected';

// --- Pure function replicas ---

function extractErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Failed to connect';
}

function determinePayPalStatus(response: { status?: string; actionUrl?: string }): {
  newStatus: ConnectStatus;
  actionUrl: string | null;
} {
  if (response.status === 'already_connected') {
    return { newStatus: 'connected', actionUrl: null };
  }
  return { newStatus: 'pending', actionUrl: response.actionUrl ?? null };
}

function buildReturnUrl(origin: string, provider: 'paypal', action: 'complete' | 'refresh'): string {
  return `${origin}/setup?${provider}=${action}`;
}

// --- Tests ---

describe('PaymentConnectService — extractErrorMessage', () => {
  it('extracts Error message', () => {
    expect(extractErrorMessage(new Error('Network error'))).toBe('Network error');
  });

  it('returns fallback for non-Error', () => {
    expect(extractErrorMessage('string')).toBe('Failed to connect');
    expect(extractErrorMessage(null)).toBe('Failed to connect');
  });
});

describe('PaymentConnectService — determinePayPalStatus', () => {
  it('returns connected for already_connected', () => {
    const result = determinePayPalStatus({ status: 'already_connected' });
    expect(result.newStatus).toBe('connected');
    expect(result.actionUrl).toBeNull();
  });

  it('returns pending with action URL', () => {
    const result = determinePayPalStatus({ actionUrl: 'https://paypal.com/redirect' });
    expect(result.newStatus).toBe('pending');
    expect(result.actionUrl).toBe('https://paypal.com/redirect');
  });

  it('returns pending with null URL when no actionUrl', () => {
    const result = determinePayPalStatus({});
    expect(result.newStatus).toBe('pending');
    expect(result.actionUrl).toBeNull();
  });
});

describe('PaymentConnectService — buildReturnUrl', () => {
  it('builds PayPal complete URL', () => {
    expect(buildReturnUrl('http://localhost:4200', 'paypal', 'complete'))
      .toBe('http://localhost:4200/setup?paypal=complete');
  });

  it('builds PayPal refresh URL', () => {
    expect(buildReturnUrl('https://app.orderstack.com', 'paypal', 'refresh'))
      .toBe('https://app.orderstack.com/setup?paypal=refresh');
  });
});
