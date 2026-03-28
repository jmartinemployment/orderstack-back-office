import '../../../../test-setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SentimentDashboard } from './sentiment-dashboard';
import { AuthService } from '../../../services/auth';
import { environment } from '../../../environments/environment';

/**
 * BUG-27: Sentiment dashboard stuck loading spinner.
 *
 * These tests verify the component's runtime behavior — not just template
 * strings — to ensure the spinner resolves in all scenarios:
 *   1. API returns empty array (no orders)
 *   2. API returns orders without specialInstructions
 *   3. API returns 404/500 error
 *   4. API returns non-array response
 *   5. Normal success with data
 *   6. Double-load guard
 *   7. Error cleared on retry
 *   8. No load when merchantId is null
 */

const MERCHANT_ID = 'test-merchant-id';

function createMockAuthService() {
  return {
    isAuthenticated: vi.fn(() => true),
    selectedMerchantId: vi.fn(() => MERCHANT_ID),
    user: vi.fn(() => ({ id: '1', email: 'test@test.com' })),
    token: vi.fn(() => 'fake-token'),
    merchants: vi.fn(() => []),
    userMerchants: vi.fn(() => []),
    error: vi.fn(() => null),
    isLoading: vi.fn(() => false),
    selectedMerchantName: vi.fn(() => 'Test Restaurant'),
    selectedMerchantLogo: vi.fn(() => null),
    selectedMerchantAddress: vi.fn(() => null),
    sessionExpiredMessage: vi.fn(() => null),
  };
}

describe('SentimentDashboard component — BUG-27 stuck spinner', () => {
  let component: SentimentDashboard;
  let httpTesting: HttpTestingController;
  let mockAuth: ReturnType<typeof createMockAuthService>;

  beforeEach(() => {
    mockAuth = createMockAuthService();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: mockAuth },
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    component = TestBed.runInInjectionContext(() => new SentimentDashboard());
  });

  const ordersUrl = `${environment.apiUrl}/merchant/${MERCHANT_ID}/orders`;
  const analyticsUrl = `${environment.apiUrl}/merchant/${MERCHANT_ID}/analytics/sentiment?days=30`;

  async function flushBackendAnalytics(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 0));
    const req = httpTesting.match(analyticsUrl);
    for (const r of req) {
      r.flush({ totalAnalyzed: 0, trends: [], topFlags: [], topKeywords: [], alertCount: 0, positive: 0, neutral: 0, negative: 0 });
    }
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  async function flushOrders(body: unknown, status = 200): Promise<void> {
    await flushBackendAnalytics();
    const req = httpTesting.expectOne(ordersUrl);
    if (status >= 400) {
      req.flush(body, { status, statusText: 'Error' });
    } else {
      req.flush(body);
    }
  }

  it('isLoading becomes false after API returns empty array', async () => {
    const promise = component.loadAndAnalyze();
    await flushOrders([]);
    await promise;

    expect(component.isLoading()).toBe(false);
    expect(component.entries().length).toBe(0);
    expect(component.error()).toBeNull();
  });

  it('isLoading becomes false after API returns orders without specialInstructions', async () => {
    const promise = component.loadAndAnalyze();
    await flushOrders([
      { id: '1', orderNumber: '0001' },
      { id: '2', orderNumber: '0002', specialInstructions: '' },
      { id: '3', orderNumber: '0003', specialInstructions: '   ' },
    ]);
    await promise;

    expect(component.isLoading()).toBe(false);
    expect(component.entries().length).toBe(0);
  });

  it('isLoading becomes false after API returns 404', async () => {
    const promise = component.loadAndAnalyze();
    await flushOrders({ message: 'Not found' }, 404);
    await promise;

    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeTruthy();
  });

  it('isLoading becomes false after API returns 500', async () => {
    const promise = component.loadAndAnalyze();
    await flushOrders({ message: 'Internal error' }, 500);
    await promise;

    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeTruthy();
  });

  it('isLoading becomes false after API returns non-array', async () => {
    const promise = component.loadAndAnalyze();
    await flushOrders({ data: 'not an array' });
    await promise;

    expect(component.isLoading()).toBe(false);
    expect(component.entries().length).toBe(0);
  });

  it('correctly analyzes orders with specialInstructions', async () => {
    const promise = component.loadAndAnalyze();
    await flushOrders([
      { id: 'a1', orderNumber: '1001', specialInstructions: 'Great food, love it!' },
      { id: 'a2', orderNumber: '1002', specialInstructions: 'Wrong order, very upset' },
      { id: 'a3', orderNumber: '1003', specialInstructions: 'No onions please' },
    ]);
    await promise;

    expect(component.isLoading()).toBe(false);
    expect(component.entries().length).toBe(3);
    expect(component.error()).toBeNull();

    const positive = component.entries().filter(e => e.sentiment === 'positive');
    const negative = component.entries().filter(e => e.sentiment === 'negative');
    expect(positive.length).toBeGreaterThan(0);
    expect(negative.length).toBeGreaterThan(0);
  });

  it('does not re-enter loadAndAnalyze while already loading', async () => {
    const promise1 = component.loadAndAnalyze();

    const promise2 = component.loadAndAnalyze();

    await flushBackendAnalytics();

    const reqs = httpTesting.match(ordersUrl);
    expect(reqs.length).toBe(1);

    reqs[0].flush([]);
    await Promise.all([promise1, promise2]);

    expect(component.isLoading()).toBe(false);
  });

  it('clears previous error on new load', async () => {
    const promise1 = component.loadAndAnalyze();
    await flushOrders({}, 500);
    await promise1;
    expect(component.error()).toBeTruthy();

    const promise2 = component.loadAndAnalyze();
    await flushOrders([]);
    await promise2;
    expect(component.error()).toBeNull();
  });

  it('does not load when merchantId is null', async () => {
    mockAuth.selectedMerchantId = vi.fn(() => null);
    component = TestBed.runInInjectionContext(() => new SentimentDashboard());

    await component.loadAndAnalyze();

    httpTesting.expectNone(analyticsUrl);
    httpTesting.expectNone(ordersUrl);
    expect(component.isLoading()).toBe(false);
  });

  it('summary reflects zero entries when API returns empty', async () => {
    const promise = component.loadAndAnalyze();
    await flushOrders([]);
    await promise;

    const summary = component.summary();
    expect(summary.totalAnalyzed).toBe(0);
    expect(summary.positive).toBe(0);
    expect(summary.neutral).toBe(0);
    expect(summary.negative).toBe(0);
    expect(summary.avgScore).toBe(0);
  });

  it('summary correctly counts sentiment categories', async () => {
    const promise = component.loadAndAnalyze();
    await flushOrders([
      { id: '1', specialInstructions: 'Great amazing excellent' },
      { id: '2', specialInstructions: 'Terrible awful disgusting' },
      { id: '3', specialInstructions: 'Please add napkins' },
    ]);
    await promise;

    const summary = component.summary();
    expect(summary.totalAnalyzed).toBe(3);
    expect(summary.positive).toBe(1);
    expect(summary.negative).toBe(1);
    expect(summary.neutral).toBe(1);
  });

  it('flag detection identifies allergy keywords', async () => {
    const promise = component.loadAndAnalyze();
    await flushOrders([
      { id: '1', specialInstructions: 'I have a peanut allergy, please be careful' },
    ]);
    await promise;

    const entry = component.entries()[0];
    expect(entry.flags).toContain('allergy');
  });

  it('flag detection identifies rush keywords', async () => {
    const promise = component.loadAndAnalyze();
    await flushOrders([
      { id: '1', specialInstructions: 'Please hurry, we are in a rush' },
    ]);
    await promise;

    const entry = component.entries()[0];
    expect(entry.flags).toContain('rush');
  });
});
