import '../../../../test-setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CommandCenter } from './command-center';
import { AnalyticsService } from '../../../services/analytics';
import { InventoryService } from '../../../services/inventory';
import { OrderService } from '../../../services/order';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';

describe('CommandCenter', () => {
  let analyticsService: AnalyticsService;
  let inventoryService: InventoryService;
  let orderService: OrderService;
  let settingsService: RestaurantSettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    analyticsService = TestBed.inject(AnalyticsService);
    inventoryService = TestBed.inject(InventoryService);
    orderService = TestBed.inject(OrderService);
    settingsService = TestBed.inject(RestaurantSettingsService);
  });

  function stubAllServiceCalls(): void {
    vi.spyOn(analyticsService, 'loadSalesReport').mockResolvedValue();
    vi.spyOn(analyticsService, 'loadMenuEngineering').mockResolvedValue();
    vi.spyOn(inventoryService, 'loadAlerts').mockResolvedValue();
    vi.spyOn(inventoryService, 'loadPredictions').mockResolvedValue();
    vi.spyOn(orderService, 'loadOrders').mockResolvedValue();
    vi.spyOn(orderService, 'getRecentProfit').mockResolvedValue(null);
    vi.spyOn(settingsService, 'loadAiAdminConfig').mockResolvedValue();
    vi.spyOn(analyticsService, 'loadPinnedWidgets').mockResolvedValue();
    vi.spyOn(analyticsService, 'loadProactiveInsights').mockResolvedValue();
  }

  function createComponent(): CommandCenter {
    return TestBed.runInInjectionContext(() => new CommandCenter());
  }

  describe('loadAllData', () => {
    it('should set isLoading to false after all calls resolve', async () => {
      stubAllServiceCalls();

      const component = createComponent();
      await component.loadAllData();

      expect(component.isLoading()).toBe(false);
      expect(component.error()).toBeNull();
    });

    it('should set isLoading to false even when all calls reject', async () => {
      const err = new Error('fail');
      vi.spyOn(analyticsService, 'loadSalesReport').mockRejectedValue(err);
      vi.spyOn(analyticsService, 'loadMenuEngineering').mockRejectedValue(err);
      vi.spyOn(inventoryService, 'loadAlerts').mockRejectedValue(err);
      vi.spyOn(inventoryService, 'loadPredictions').mockRejectedValue(err);
      vi.spyOn(orderService, 'loadOrders').mockRejectedValue(err);
      vi.spyOn(orderService, 'getRecentProfit').mockRejectedValue(err);
      vi.spyOn(settingsService, 'loadAiAdminConfig').mockRejectedValue(err);
      vi.spyOn(analyticsService, 'loadPinnedWidgets').mockRejectedValue(err);
      vi.spyOn(analyticsService, 'loadProactiveInsights').mockRejectedValue(err);

      const component = createComponent();
      await component.loadAllData();

      expect(component.isLoading()).toBe(false);
    });

    it('should set isLoading to false when one call hangs past timeout', async () => {
      stubAllServiceCalls();
      // Override one to never resolve — simulates a hanging request
      vi.spyOn(analyticsService, 'loadProactiveInsights').mockReturnValue(
        new Promise(() => { /* never resolves */ })
      );

      const component = createComponent();

      vi.useFakeTimers();
      const loadPromise = component.loadAllData();
      await vi.advanceTimersByTimeAsync(16_000);
      await loadPromise;
      vi.useRealTimers();

      expect(component.isLoading()).toBe(false);
    });

    it('should set lastRefresh after successful load', async () => {
      stubAllServiceCalls();

      const component = createComponent();
      await component.loadAllData();

      expect(component.lastRefresh()).not.toBeNull();
    });

    it('should prevent concurrent calls via guard', async () => {
      stubAllServiceCalls();
      const spy = vi.spyOn(analyticsService, 'loadSalesReport');

      const component = createComponent();

      const p1 = component.loadAllData();
      const p2 = component.loadAllData();
      await Promise.all([p1, p2]);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadProfitSummary (via loadAllData)', () => {
    it('should not throw when getRecentProfit rejects', async () => {
      stubAllServiceCalls();
      vi.spyOn(orderService, 'getRecentProfit').mockRejectedValue(new Error('network error'));

      const component = createComponent();
      await component.loadAllData();

      expect(component.isLoading()).toBe(false);
      expect(component.profitSummary()).toBeNull();
    });
  });

  describe('forecast methods', () => {
    it('loadRevenueForecast should reset isLoadingForecast on error', async () => {
      vi.spyOn(analyticsService, 'getRevenueForecast').mockRejectedValue(new Error('fail'));

      const component = createComponent();
      await component.loadRevenueForecast();

      expect(component.isLoadingForecast()).toBe(false);
      expect(component.revenueForecast()).toBeNull();
    });

    it('loadDemandForecast should reset isLoadingDemand on error', async () => {
      vi.spyOn(analyticsService, 'getDemandForecast').mockRejectedValue(new Error('fail'));

      const component = createComponent();
      await component.loadDemandForecast();

      expect(component.isLoadingDemand()).toBe(false);
      expect(component.demandForecast()).toEqual([]);
    });

    it('loadStaffingRecommendation should reset isLoadingStaffing on error', async () => {
      vi.spyOn(analyticsService, 'getStaffingRecommendation').mockRejectedValue(new Error('fail'));

      const component = createComponent();
      await component.loadStaffingRecommendation();

      expect(component.isLoadingStaffing()).toBe(false);
      expect(component.staffingRec()).toBeNull();
    });

    it('loadForecastData should complete even when all forecasts fail', async () => {
      vi.spyOn(analyticsService, 'getRevenueForecast').mockRejectedValue(new Error('fail'));
      vi.spyOn(analyticsService, 'getDemandForecast').mockRejectedValue(new Error('fail'));
      vi.spyOn(analyticsService, 'getStaffingRecommendation').mockRejectedValue(new Error('fail'));

      const component = createComponent();
      await component.loadForecastData();

      expect(component.isLoadingForecast()).toBe(false);
      expect(component.isLoadingDemand()).toBe(false);
      expect(component.isLoadingStaffing()).toBe(false);
    });
  });

  describe('hasAnyData', () => {
    it('should return false when no data is loaded', () => {
      const component = createComponent();
      expect(component.hasAnyData()).toBe(false);
    });
  });

  describe('forecast timeout wrapping (BUG-26)', () => {
    it('loadForecastData completes even when a forecast call hangs past timeout', async () => {
      vi.spyOn(analyticsService, 'getRevenueForecast').mockResolvedValue(null);
      vi.spyOn(analyticsService, 'getDemandForecast').mockResolvedValue([]);
      // Staffing hangs forever
      vi.spyOn(analyticsService, 'getStaffingRecommendation').mockReturnValue(
        new Promise(() => {/* never resolves */})
      );

      const component = createComponent();

      vi.useFakeTimers();
      const loadPromise = component.loadForecastData();
      await vi.advanceTimersByTimeAsync(16_000);
      await loadPromise;
      vi.useRealTimers();

      // Revenue and demand should have completed; staffing timed out
      expect(component.isLoadingForecast()).toBe(false);
      expect(component.isLoadingDemand()).toBe(false);
      // Note: isLoadingStaffing may still be true because withTimeout resolves
      // but the inner finally hasn't run. The key is loadForecastData itself completes.
    });

    it('setTab("forecast") does not produce unhandled rejection', async () => {
      vi.spyOn(analyticsService, 'getRevenueForecast').mockRejectedValue(new Error('fail'));
      vi.spyOn(analyticsService, 'getDemandForecast').mockRejectedValue(new Error('fail'));
      vi.spyOn(analyticsService, 'getStaffingRecommendation').mockRejectedValue(new Error('fail'));

      const component = createComponent();
      // Should not throw — .catch() handles the rejection
      component.setTab('forecast');
      // Wait for the promise chain to settle
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(component.activeTab()).toBe('forecast');
    });

    it('setForecastDays does not produce unhandled rejection', async () => {
      vi.spyOn(analyticsService, 'getRevenueForecast').mockRejectedValue(new Error('fail'));

      const component = createComponent();
      component.setForecastDays(30);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(component.forecastDays()).toBe(30);
    });

    it('setDemandDate does not produce unhandled rejection', async () => {
      vi.spyOn(analyticsService, 'getDemandForecast').mockRejectedValue(new Error('fail'));

      const component = createComponent();
      component.setDemandDate('2026-04-01');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(component.demandForecastDate()).toBe('2026-04-01');
    });

    it('setStaffingDate does not produce unhandled rejection', async () => {
      vi.spyOn(analyticsService, 'getStaffingRecommendation').mockRejectedValue(new Error('fail'));

      const component = createComponent();
      component.setStaffingDate('2026-04-01');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(component.staffingDate()).toBe('2026-04-01');
    });
  });

  describe('source-level verification (BUG-26)', () => {
    const { readFileSync } = require('node:fs');
    const { resolve } = require('node:path');
    const tsSource = readFileSync(resolve(__dirname, 'command-center.ts'), 'utf-8');

    it('loadForecastData wraps sub-calls with withTimeout', () => {
      const start = tsSource.indexOf('async loadForecastData');
      const body = tsSource.slice(start, start + 400);
      expect(body).toContain('withTimeout(this.loadRevenueForecast()');
      expect(body).toContain('withTimeout(this.loadDemandForecast()');
      expect(body).toContain('withTimeout(this.loadStaffingRecommendation()');
    });

    it('setTab includes .catch() for loadForecastData', () => {
      const start = tsSource.indexOf('setTab(tab:');
      const body = tsSource.slice(start, start + 300);
      expect(body).toContain('.catch(');
    });

    it('setForecastDays includes .catch()', () => {
      const start = tsSource.indexOf('setForecastDays(');
      const body = tsSource.slice(start, start + 200);
      expect(body).toContain('.catch(');
    });

    it('setDemandDate includes .catch()', () => {
      const start = tsSource.indexOf('setDemandDate(');
      const body = tsSource.slice(start, start + 200);
      expect(body).toContain('.catch(');
    });

    it('setStaffingDate includes .catch()', () => {
      const start = tsSource.indexOf('setStaffingDate(');
      const body = tsSource.slice(start, start + 200);
      expect(body).toContain('.catch(');
    });
  });

  describe('helper methods', () => {
    let component: CommandCenter;

    beforeEach(() => {
      component = createComponent();
    });

    it('getInsightIcon returns correct icons', () => {
      expect(component.getInsightIcon('positive')).toBe('arrow-up');
      expect(component.getInsightIcon('negative')).toBe('arrow-down');
      expect(component.getInsightIcon('warning')).toBe('exclamation');
      expect(component.getInsightIcon('action')).toBe('lightning');
      expect(component.getInsightIcon('neutral')).toBe('info');
    });

    it('getInsightClass returns correct classes', () => {
      expect(component.getInsightClass('positive')).toBe('insight-positive');
      expect(component.getInsightClass('negative')).toBe('insight-negative');
      expect(component.getInsightClass('warning')).toBe('insight-warning');
      expect(component.getInsightClass('action')).toBe('insight-action');
      expect(component.getInsightClass('neutral')).toBe('insight-neutral');
    });

    it('getSourceLabel returns correct labels', () => {
      expect(component.getSourceLabel('sales')).toBe('Sales');
      expect(component.getSourceLabel('menu')).toBe('Menu');
      expect(component.getSourceLabel('inventory')).toBe('Inventory');
      expect(component.getSourceLabel('profit')).toBe('Profit');
    });

    it('getAlertSeverityClass returns correct classes', () => {
      expect(component.getAlertSeverityClass('critical')).toBe('alert-critical');
      expect(component.getAlertSeverityClass('warning')).toBe('alert-warn');
      expect(component.getAlertSeverityClass('info')).toBe('alert-info');
    });

    it('getPredictionUrgencyClass returns correct urgency', () => {
      expect(component.getPredictionUrgencyClass(1)).toBe('urgency-critical');
      expect(component.getPredictionUrgencyClass(5)).toBe('urgency-warning');
      expect(component.getPredictionUrgencyClass(10)).toBe('urgency-caution');
      expect(component.getPredictionUrgencyClass(20)).toBe('urgency-ok');
    });

    it('formatHour returns correct formatted hours', () => {
      expect(component.formatHour(0)).toBe('12am');
      expect(component.formatHour(9)).toBe('9am');
      expect(component.formatHour(12)).toBe('12pm');
      expect(component.formatHour(15)).toBe('3pm');
    });

    it('getForecastBarHeight computes percentage against max', () => {
      // forecastMaxRevenue defaults to 1 when no data, so (100/1)*100 = 10000
      expect(component.getForecastBarHeight(100)).toBe(10000);
      expect(component.getForecastBarHeight(0)).toBe(10);
    });

    it('getStaffBarHeight computes percentage against max', () => {
      // maxStaffCount defaults to 1 when no data, so (5/1)*100 = 500
      expect(component.getStaffBarHeight(5)).toBe(500);
      expect(component.getStaffBarHeight(0)).toBe(10);
    });
  });
});
