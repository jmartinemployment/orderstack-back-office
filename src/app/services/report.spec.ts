import '../../test-setup';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { ReportService } from './report';
import { AuthService } from './auth';
import { PlatformService } from './platform';
import type { RealTimeKpi } from '@models/report.model';

type ReportHarness = {
  service: ReportService;
  httpGet: ReturnType<typeof vi.fn>;
};

function createHarness(merchantId: string | null = 'r-1'): ReportHarness {
  const httpGet = vi.fn();
  const httpMock = {
    get: httpGet,
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };

  const authMock = {
    selectedMerchantId: vi.fn(() => merchantId),
    isAuthenticated: signal(true).asReadonly(),
  };

  const platformMock = {
    featureFlags: signal({
      enableConversationalModifiers: false,
      enableTipping: true,
      enableFloorPlan: false,
    }).asReadonly(),
    enabledModules: signal<string[]>([]).asReadonly(),
  };

  TestBed.configureTestingModule({
    providers: [
      ReportService,
      { provide: HttpClient, useValue: httpMock },
      { provide: AuthService, useValue: authMock },
      { provide: PlatformService, useValue: platformMock },
    ],
  });

  const service = TestBed.inject(ReportService);
  return { service, httpGet };
}

describe('ReportService — getRealTimeKpis', () => {
  const mockKpi: RealTimeKpi = {
    todayRevenue: 1500,
    todayOrders: 42,
    todayAov: 35.71,
    yesterdaySameTimeRevenue: 1200,
    yesterdaySameTimeOrders: 35,
    lastWeekSameDayRevenue: 1400,
    lastWeekSameDayOrders: 40,
    lastUpdated: '2026-02-23T12:00:00Z',
  };

  it('returns data on success', async () => {
    const { service, httpGet } = createHarness();
    httpGet.mockReturnValue(of(mockKpi));

    const result = await service.getRealTimeKpis();
    expect(result).toEqual(mockKpi);
    expect(httpGet).toHaveBeenCalledTimes(1);
  });

  it('sets _error signal and returns null on HTTP failure', async () => {
    const { service, httpGet } = createHarness();
    httpGet.mockReturnValue(throwError(() => new Error('Network failure')));

    const result = await service.getRealTimeKpis();
    expect(result).toBeNull();
    expect(service.error()).toBe('Network failure');
  });

  it('logs error via console.error on failure', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { service, httpGet } = createHarness();
    httpGet.mockReturnValue(throwError(() => new Error('boom')));

    await service.getRealTimeKpis();
    expect(spy).toHaveBeenCalledWith(
      '[ReportService] getRealTimeKpis failed:',
      'boom'
    );
    spy.mockRestore();
  });

  it('returns null when no merchantId', async () => {
    const { service, httpGet } = createHarness(null);

    const result = await service.getRealTimeKpis();
    expect(result).toBeNull();
    expect(httpGet).not.toHaveBeenCalled();
  });
});
