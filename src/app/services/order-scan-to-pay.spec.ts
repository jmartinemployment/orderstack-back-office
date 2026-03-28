import '../../test-setup';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal, computed } from '@angular/core';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OrderService } from './order';
import { AuthService } from './auth';
import { SocketService } from './socket';

function createMockAuthService() {
  const _selectedMerchantId = signal<string | null>('merchant-123');
  const _token = signal<string | null>('mock-token');
  const _user = signal<{ role: string } | null>({ role: 'owner' });

  return {
    selectedMerchantId: _selectedMerchantId.asReadonly(),
    token: _token.asReadonly(),
    user: _user.asReadonly(),
    isAuthenticated: computed(() => !!_token() && !!_user()),
  };
}

function createMockSocketService() {
  return {
    onOrderEvent: vi.fn().mockReturnValue(() => {}),
    onCustomEvent: vi.fn().mockReturnValue(() => {}),
    isOnline: signal(false).asReadonly(),
  };
}

describe('OrderService — Scan-to-Pay stubs (PCI DSS 6.4.1)', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: SocketService, useValue: createMockSocketService() },
        OrderService,
      ],
    });

    service = TestBed.inject(OrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verify no HTTP requests were made by the scan-to-pay stubs
    httpMock.verify();
  });

  // --- getCheckByToken ---

  it('getCheckByToken returns null without making an HTTP call', async () => {
    const result = await service.getCheckByToken('some-token-123');
    expect(result).toBeNull();
  });

  it('getCheckByToken returns null for empty token', async () => {
    const result = await service.getCheckByToken('');
    expect(result).toBeNull();
  });

  // --- submitScanToPayment ---

  it('submitScanToPayment returns failure with "not yet available" error', async () => {
    const result = await service.submitScanToPayment('token-abc', {
      tipAmount: 5.00,
      paymentMethodNonce: 'nonce-xyz',
    });

    expect(result).toEqual({
      success: false,
      error: 'Mobile payment is not yet available',
    });
  });

  it('submitScanToPayment.success is always false', async () => {
    const result = await service.submitScanToPayment('any-token', {
      tipAmount: 0,
      paymentMethodNonce: 'any-nonce',
    });
    expect(result.success).toBe(false);
  });

  // --- submitPartialScanToPayment ---

  it('submitPartialScanToPayment returns failure with "not yet available" error', async () => {
    const result = await service.submitPartialScanToPayment('token-abc', {
      tipAmount: 3.50,
      paymentMethodNonce: 'nonce-xyz',
      selectedItemGuids: ['item-1', 'item-2'],
      amount: 25.00,
    });

    expect(result).toEqual({
      success: false,
      error: 'Mobile payment is not yet available',
    });
  });

  it('submitPartialScanToPayment.success is always false', async () => {
    const result = await service.submitPartialScanToPayment('token', {
      tipAmount: 0,
      paymentMethodNonce: 'nonce',
      selectedItemGuids: [],
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  // --- sendScanToPayReceipt ---

  it('sendScanToPayReceipt returns false without making an HTTP call', async () => {
    const result = await service.sendScanToPayReceipt('token-abc', 'guest@example.com');
    expect(result).toBe(false);
  });

  it('sendScanToPayReceipt returns false for any input', async () => {
    const result = await service.sendScanToPayReceipt('', '');
    expect(result).toBe(false);
  });

  // --- Cross-method consistency ---

  it('all four scan-to-pay stubs return immediately without delay', async () => {
    const start = Date.now();

    const [check, pay, partial, receipt] = await Promise.all([
      service.getCheckByToken('t'),
      service.submitScanToPayment('t', { tipAmount: 0, paymentMethodNonce: 'n' }),
      service.submitPartialScanToPayment('t', { tipAmount: 0, paymentMethodNonce: 'n', selectedItemGuids: [], amount: 0 }),
      service.sendScanToPayReceipt('t', 'e@e.com'),
    ]);

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
    expect(check).toBeNull();
    expect(pay.success).toBe(false);
    expect(partial.success).toBe(false);
    expect(receipt).toBe(false);
  });
});
