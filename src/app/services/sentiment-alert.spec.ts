import '../../test-setup';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';
import { SentimentAlertService } from './sentiment-alert';
import { AuthService } from './auth';
import { SocketService } from './socket';
import { environment } from '@environments/environment';
import type { OrderSentimentRecord } from '@models/sentiment.model';

const MERCHANT_ID = 'test-merchant-id';
const alertsUrl = `${environment.apiUrl}/merchant/${MERCHANT_ID}/alerts/sentiment`;

function makeAlert(overrides: Partial<OrderSentimentRecord> = {}): OrderSentimentRecord {
  return {
    id: 'alert-1',
    orderId: 'order-1',
    orderNumber: '1001',
    sentiment: 'negative',
    flags: ['complaint'],
    urgency: 'high',
    summary: 'Customer unhappy with wait time',
    analyzedAt: '2026-03-17T10:00:00Z',
    isRead: false,
    ...overrides,
  };
}

describe('SentimentAlertService', () => {
  let service: SentimentAlertService;
  let httpTesting: HttpTestingController;
  let mockAuth: { selectedMerchantId: ReturnType<typeof signal<string | null>> };
  let mockSocket: { onCustomEvent: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAuth = { selectedMerchantId: signal<string | null>(MERCHANT_ID) };
    mockSocket = { onCustomEvent: vi.fn().mockReturnValue(vi.fn()) };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuth },
        { provide: SocketService, useValue: mockSocket },
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(SentimentAlertService);

    // The constructor effect fires loadAlerts() — flush initial request
    TestBed.flushEffects();
    const initReq = httpTesting.match(alertsUrl);
    if (initReq.length > 0) {
      initReq[0].flush([]);
    }
  });

  afterEach(() => {
    httpTesting.verify();
    TestBed.resetTestingModule();
  });

  // ─── Initial state ──────────────────────────────────────────────

  describe('initial state', () => {
    it('alerts() starts as []', () => {
      expect(service.alerts()).toEqual([]);
    });

    it('unreadCount() starts as 0', () => {
      expect(service.unreadCount()).toBe(0);
    });

    it('criticalCount() starts as 0', () => {
      expect(service.criticalCount()).toBe(0);
    });

    it('isLoading() starts as false', () => {
      expect(service.isLoading()).toBe(false);
    });
  });

  // ─── loadAlerts() ───────────────────────────────────────────────

  describe('loadAlerts()', () => {
    it('populates alerts() from HTTP GET response', async () => {
      const records = [
        makeAlert({ id: 'a1' }),
        makeAlert({ id: 'a2' }),
        makeAlert({ id: 'a3' }),
      ];

      const loadPromise = service.loadAlerts();
      const req = httpTesting.expectOne(alertsUrl);
      expect(req.request.method).toBe('GET');
      req.flush(records);
      await loadPromise;

      expect(service.alerts()).toHaveLength(3);
    });

    it('sets isLoading to true during fetch and false after', async () => {
      const loadPromise = service.loadAlerts();
      const req = httpTesting.expectOne(alertsUrl);

      expect(service.isLoading()).toBe(true);

      req.flush([]);
      await loadPromise;

      expect(service.isLoading()).toBe(false);
    });

    it('keeps alerts empty on HTTP 404', async () => {
      const loadPromise = service.loadAlerts();
      const req = httpTesting.expectOne(alertsUrl);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
      await loadPromise;

      expect(service.alerts()).toEqual([]);
      expect(service.isLoading()).toBe(false);
    });

    it('keeps alerts empty on HTTP 500', async () => {
      const loadPromise = service.loadAlerts();
      const req = httpTesting.expectOne(alertsUrl);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
      await loadPromise;

      expect(service.alerts()).toEqual([]);
      expect(service.isLoading()).toBe(false);
    });
  });

  // ─── Computed signals ───────────────────────────────────────────

  describe('computed signals', () => {
    it('unreadCount() counts alerts where isRead is false', async () => {
      const records = [
        makeAlert({ id: 'a1', isRead: false }),
        makeAlert({ id: 'a2', isRead: true }),
        makeAlert({ id: 'a3', isRead: false }),
      ];
      const loadPromise = service.loadAlerts();
      httpTesting.expectOne(alertsUrl).flush(records);
      await loadPromise;

      expect(service.unreadCount()).toBe(2);
    });

    it('criticalCount() counts unread alerts with urgency critical', async () => {
      const records = [
        makeAlert({ id: 'a1', isRead: false, urgency: 'critical' }),
        makeAlert({ id: 'a2', isRead: false, urgency: 'high' }),
        makeAlert({ id: 'a3', isRead: false, urgency: 'critical' }),
        makeAlert({ id: 'a4', isRead: true, urgency: 'critical' }),
      ];
      const loadPromise = service.loadAlerts();
      httpTesting.expectOne(alertsUrl).flush(records);
      await loadPromise;

      expect(service.criticalCount()).toBe(2);
    });

    it('read alert does not contribute to unreadCount or criticalCount', async () => {
      const records = [
        makeAlert({ id: 'a1', isRead: true, urgency: 'critical' }),
      ];
      const loadPromise = service.loadAlerts();
      httpTesting.expectOne(alertsUrl).flush(records);
      await loadPromise;

      expect(service.unreadCount()).toBe(0);
      expect(service.criticalCount()).toBe(0);
    });
  });

  // ─── markRead() ─────────────────────────────────────────────────

  describe('markRead()', () => {
    beforeEach(async () => {
      const records = [
        makeAlert({ id: 'a1', isRead: false }),
        makeAlert({ id: 'a2', isRead: false }),
      ];
      const loadPromise = service.loadAlerts();
      httpTesting.expectOne(alertsUrl).flush(records);
      await loadPromise;
    });

    it('marks matching alert as read on PATCH success', async () => {
      const markPromise = service.markRead('a1');
      const req = httpTesting.expectOne(`${alertsUrl}/a1/read`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ success: true });
      await markPromise;

      const alert = service.alerts().find(a => a.id === 'a1');
      expect(alert?.isRead).toBe(true);
    });

    it('decrements unreadCount by 1 after marking read', async () => {
      expect(service.unreadCount()).toBe(2);

      const markPromise = service.markRead('a1');
      httpTesting.expectOne(`${alertsUrl}/a1/read`).flush({ success: true });
      await markPromise;

      expect(service.unreadCount()).toBe(1);
    });

    it('does not modify alerts when PATCH fails', async () => {
      const markPromise = service.markRead('a1');
      httpTesting.expectOne(`${alertsUrl}/a1/read`).flush('Error', { status: 500, statusText: 'Internal Server Error' });
      await markPromise;

      const alert = service.alerts().find(a => a.id === 'a1');
      expect(alert?.isRead).toBe(false);
      expect(service.unreadCount()).toBe(2);
    });
  });

  // ─── markAllRead() ─────────────────────────────────────────────

  describe('markAllRead()', () => {
    beforeEach(async () => {
      const records = [
        makeAlert({ id: 'a1', isRead: false }),
        makeAlert({ id: 'a2', isRead: false }),
        makeAlert({ id: 'a3', isRead: false }),
      ];
      const loadPromise = service.loadAlerts();
      httpTesting.expectOne(alertsUrl).flush(records);
      await loadPromise;
    });

    it('marks all alerts as read on PATCH success', async () => {
      const markPromise = service.markAllRead();
      const req = httpTesting.expectOne(`${alertsUrl}/read-all`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ count: 3 });
      await markPromise;

      expect(service.alerts().every(a => a.isRead)).toBe(true);
    });

    it('sets unreadCount to 0 after marking all read', async () => {
      expect(service.unreadCount()).toBe(3);

      const markPromise = service.markAllRead();
      httpTesting.expectOne(`${alertsUrl}/read-all`).flush({ count: 3 });
      await markPromise;

      expect(service.unreadCount()).toBe(0);
    });
  });

  // ─── Socket event handling ──────────────────────────────────────

  describe('socket events', () => {
    it('registers onCustomEvent listener for sentiment_alert', () => {
      expect(mockSocket.onCustomEvent).toHaveBeenCalledWith('sentiment_alert', expect.any(Function));
    });

    it('prepends new record to alerts when socket event fires', async () => {
      const records = [makeAlert({ id: 'a1' })];
      const loadPromise = service.loadAlerts();
      httpTesting.expectOne(alertsUrl).flush(records);
      await loadPromise;

      const callback = mockSocket.onCustomEvent.mock.calls[0]?.[1];
      expect(callback).toBeDefined();

      const newRecord = makeAlert({ id: 'a2', orderNumber: '1002' });
      callback({ type: 'sentiment_alert', record: newRecord, restaurantId: MERCHANT_ID });

      expect(service.alerts()[0].id).toBe('a2');
      expect(service.alerts()).toHaveLength(2);
    });

    it('does not duplicate record with same id', async () => {
      const records = [makeAlert({ id: 'a1' })];
      const loadPromise = service.loadAlerts();
      httpTesting.expectOne(alertsUrl).flush(records);
      await loadPromise;

      const callback = mockSocket.onCustomEvent.mock.calls[0]?.[1];
      const duplicateRecord = makeAlert({ id: 'a1' });
      callback({ type: 'sentiment_alert', record: duplicateRecord, restaurantId: MERCHANT_ID });

      expect(service.alerts()).toHaveLength(1);
    });

    it('increments unreadCount when socket event adds unread alert', async () => {
      const loadPromise = service.loadAlerts();
      httpTesting.expectOne(alertsUrl).flush([]);
      await loadPromise;

      expect(service.unreadCount()).toBe(0);

      const callback = mockSocket.onCustomEvent.mock.calls[0]?.[1];
      const newRecord = makeAlert({ id: 'a1', isRead: false });
      callback({ type: 'sentiment_alert', record: newRecord, restaurantId: MERCHANT_ID });

      expect(service.unreadCount()).toBe(1);
    });
  });
});
