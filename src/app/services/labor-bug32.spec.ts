import '../../test-setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { LaborService } from './labor';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

/**
 * BUG-32: Staff Directory & Scheduling API 404s.
 *
 * Backend endpoints exist. Frontend handles 404 gracefully.
 * These tests verify:
 *   1. Each endpoint returns empty data on 404 (no crash)
 *   2. Each endpoint correctly stores data on 200
 *   3. Each endpoint sets _error on 500
 *   4. No load when merchantId is null
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

describe('LaborService — BUG-32 staff scheduling API 404 handling', () => {
  let service: LaborService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: createMockAuthService() },
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(LaborService);
  });

  const base = `${environment.apiUrl}/merchant/${MERCHANT_ID}`;

  // --- loadTimecards ---

  describe('loadTimecards', () => {
    it('returns empty array on 404', async () => {
      const promise = service.loadTimecards();
      httpTesting.expectOne(`${base}/timecards`).flush({}, { status: 404, statusText: 'Not Found' });
      await promise;

      expect(service.timecards().length).toBe(0);
      expect(service.error()).toBeNull();
    });

    it('stores data on 200', async () => {
      const mockTimecards = [
        { id: 't1', merchantId: MERCHANT_ID, teamMemberId: 's1', teamMemberName: 'John', status: 'OPEN', clockInAt: new Date().toISOString(), clockOutAt: null, jobTitle: 'server', hourlyRate: 15, isTipEligible: true, declaredCashTips: null, regularHours: 4, overtimeHours: 0, totalPaidHours: 4, totalBreakMinutes: 0, breaks: [], locationId: null, deviceId: null, createdBy: null, modifiedBy: null, modificationReason: null },
      ];
      const promise = service.loadTimecards();
      httpTesting.expectOne(`${base}/timecards`).flush(mockTimecards);
      await promise;

      expect(service.timecards().length).toBe(1);
      expect(service.timecards()[0].id).toBe('t1');
    });

    it('sets error on 500', async () => {
      const promise = service.loadTimecards();
      httpTesting.expectOne(`${base}/timecards`).flush({}, { status: 500, statusText: 'Server Error' });
      await promise;

      expect(service.error()).toBeTruthy();
    });

    it('is no-op when merchantId is null', async () => {
      const mockAuth = createMockAuthService();
      mockAuth.selectedMerchantId = vi.fn(() => null);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([]),
          { provide: AuthService, useValue: mockAuth },
        ],
      });

      const svc = TestBed.inject(LaborService);
      const http = TestBed.inject(HttpTestingController);

      await svc.loadTimecards();
      http.expectNone(`${base}/timecards`);
      expect(svc.timecards().length).toBe(0);
    });
  });

  // --- loadTimecardEdits ---

  describe('loadTimecardEdits', () => {
    it('returns empty array on 404', async () => {
      const promise = service.loadTimecardEdits();
      httpTesting.expectOne(`${base}/timecard-edits`).flush({}, { status: 404, statusText: 'Not Found' });
      await promise;

      expect(service.timecardEdits().length).toBe(0);
      expect(service.error()).toBeNull();
    });

    it('stores data on 200', async () => {
      const mockEdits = [
        { id: 'e1', timecardId: 't1', requestedBy: 's1', requestedByName: 'John', approvedBy: null, approvedByName: null, editType: 'clock_in', originalValue: '09:00', newValue: '08:45', reason: 'Late scan', status: 'pending', createdAt: new Date().toISOString(), resolvedAt: null, expiresAt: null },
      ];
      const promise = service.loadTimecardEdits();
      httpTesting.expectOne(`${base}/timecard-edits`).flush(mockEdits);
      await promise;

      expect(service.timecardEdits().length).toBe(1);
    });

    it('sets error on 500', async () => {
      const promise = service.loadTimecardEdits();
      httpTesting.expectOne(`${base}/timecard-edits`).flush({}, { status: 500, statusText: 'Server Error' });
      await promise;

      expect(service.error()).toBeTruthy();
    });
  });

  // --- loadPayrollPeriods ---

  describe('loadPayrollPeriods', () => {
    it('returns empty array on 404', async () => {
      const promise = service.loadPayrollPeriods();
      httpTesting.expectOne(`${base}/labor/payroll`).flush({}, { status: 404, statusText: 'Not Found' });
      await promise;

      expect(service.payrollPeriods().length).toBe(0);
      expect(service.error()).toBeNull();
    });

    it('stores data on 200', async () => {
      const mockPeriods = [
        { id: 'p1', merchantId: MERCHANT_ID, frequency: 'weekly', periodStart: '2026-03-01', periodEnd: '2026-03-07', status: 'draft', teamMemberSummaries: [], totalGrossPay: 0, totalOvertimePay: 0, totalTips: 0, totalCommissions: 0, createdAt: new Date().toISOString(), approvedAt: null, approvedBy: null },
      ];
      const promise = service.loadPayrollPeriods();
      httpTesting.expectOne(`${base}/labor/payroll`).flush(mockPeriods);
      await promise;

      expect(service.payrollPeriods().length).toBe(1);
    });
  });

  // --- loadCommissionRules ---

  describe('loadCommissionRules', () => {
    it('returns empty array on 404', async () => {
      const promise = service.loadCommissionRules();
      httpTesting.expectOne(`${base}/labor/commissions/rules`).flush({}, { status: 404, statusText: 'Not Found' });
      await promise;

      expect(service.commissionRules().length).toBe(0);
      expect(service.error()).toBeNull();
    });

    it('stores data on 200', async () => {
      const mockRules = [
        { id: 'r1', merchantId: MERCHANT_ID, name: 'Server Commission', jobTitle: 'server', type: 'percentage', rate: 5, minimumSales: 0, isActive: true },
      ];
      const promise = service.loadCommissionRules();
      httpTesting.expectOne(`${base}/labor/commissions/rules`).flush(mockRules);
      await promise;

      expect(service.commissionRules().length).toBe(1);
    });
  });

  // --- loadComplianceAlerts ---

  describe('loadComplianceAlerts', () => {
    it('returns empty array on 404', async () => {
      const promise = service.loadComplianceAlerts();
      httpTesting.expectOne(`${base}/labor/compliance/alerts`).flush({}, { status: 404, statusText: 'Not Found' });
      await promise;

      expect(service.complianceAlerts().length).toBe(0);
      expect(service.error()).toBeNull();
    });

    it('stores data on 200', async () => {
      const mockAlerts = [
        { id: 'a1', type: 'break_missed', severity: 'warning', teamMemberId: 's1', teamMemberName: 'John', title: 'Missed break', description: 'Break not taken', date: '2026-03-08', isResolved: false, resolvedAt: null, resolvedBy: null },
      ];
      const promise = service.loadComplianceAlerts();
      httpTesting.expectOne(`${base}/labor/compliance/alerts`).flush(mockAlerts);
      await promise;

      expect(service.complianceAlerts().length).toBe(1);
    });
  });

  // --- loadComplianceSummary ---

  describe('loadComplianceSummary', () => {
    it('returns null on 404', async () => {
      const promise = service.loadComplianceSummary();
      httpTesting.expectOne(`${base}/labor/compliance/summary`).flush({}, { status: 404, statusText: 'Not Found' });
      await promise;

      expect(service.complianceSummary()).toBeNull();
      expect(service.error()).toBeNull();
    });

    it('stores data on 200', async () => {
      const mockSummary = { totalAlerts: 3, criticalCount: 1, warningCount: 2, breakComplianceRate: 0.85, overtimeEmployees: 1, tipCreditViolations: 0 };
      const promise = service.loadComplianceSummary();
      httpTesting.expectOne(`${base}/labor/compliance/summary`).flush(mockSummary);
      await promise;

      const summary = service.complianceSummary();
      expect(summary).toBeTruthy();
      expect(summary?.totalAlerts).toBe(3);
    });
  });
});
