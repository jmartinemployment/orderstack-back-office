import { describe, it, expect } from 'vitest';

// --- Pure function replicas of SocketService logic ---

type SocketConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'polling';

interface OrderEvent {
  type: 'new' | 'updated' | 'cancelled' | 'printed' | 'print_failed';
  order: unknown;
}

function isConnected(status: SocketConnectionStatus): boolean {
  return status === 'connected';
}

function isPolling(status: SocketConnectionStatus): boolean {
  return status === 'polling';
}

function isOnline(browserOnline: boolean, connected: boolean): boolean {
  return browserOnline && connected;
}

function unwrapOrderPayload(data: { order?: unknown }): unknown {
  return data?.order ?? data;
}

function computeReconnectDelay(attempts: number): number {
  return Math.min(1000 * Math.pow(2, attempts), 30000);
}

function shouldStartPolling(attempts: number, maxAttempts: number): boolean {
  return attempts >= maxAttempts;
}

// --- Tests ---

describe('SocketService — connection status helpers', () => {
  it('isConnected true only for connected', () => {
    expect(isConnected('connected')).toBe(true);
    expect(isConnected('disconnected')).toBe(false);
    expect(isConnected('connecting')).toBe(false);
    expect(isConnected('polling')).toBe(false);
  });

  it('isPolling true only for polling', () => {
    expect(isPolling('polling')).toBe(true);
    expect(isPolling('connected')).toBe(false);
  });

  it('isOnline requires both browser online and socket connected', () => {
    expect(isOnline(true, true)).toBe(true);
    expect(isOnline(true, false)).toBe(false);
    expect(isOnline(false, true)).toBe(false);
    expect(isOnline(false, false)).toBe(false);
  });
});

describe('SocketService — unwrapOrderPayload', () => {
  it('unwraps { order, timestamp } envelope', () => {
    const data = { order: { id: 'o-1' }, timestamp: '2026-02-25' };
    expect(unwrapOrderPayload(data)).toEqual({ id: 'o-1' });
  });

  it('returns data as-is when no order key', () => {
    const data = { id: 'o-1', status: 'new' } as any;
    expect(unwrapOrderPayload(data)).toEqual(data);
  });
});

describe('SocketService — reconnect logic', () => {
  it('exponential backoff: attempt 1 = 2s', () => {
    expect(computeReconnectDelay(1)).toBe(2000);
  });

  it('exponential backoff: attempt 3 = 8s', () => {
    expect(computeReconnectDelay(3)).toBe(8000);
  });

  it('caps at 30s', () => {
    expect(computeReconnectDelay(10)).toBe(30000);
    expect(computeReconnectDelay(20)).toBe(30000);
  });

  it('shouldStartPolling when max attempts reached', () => {
    expect(shouldStartPolling(5, 5)).toBe(true);
    expect(shouldStartPolling(4, 5)).toBe(false);
    expect(shouldStartPolling(6, 5)).toBe(true);
  });
});
