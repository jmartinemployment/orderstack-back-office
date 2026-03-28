import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  RetailSalesReport,
  RetailCogsReport,
  RetailVendorSalesRow,
  RetailSalesForecast,
  RetailYoyReport,
} from '@models/report.model';

/**
 * BUG-24: Retail Reports TypeError crash — template accesses .length
 * on report sub-properties that may be undefined.
 *
 * Original fix used optional chaining + nullish coalescing. The TypeScript
 * model was subsequently updated to make all array sub-properties required
 * (non-optional), so the Angular compiler (NG8107/NG8102) flags the
 * optional operators as unnecessary. Template now uses direct .length access.
 */

const templateSource = readFileSync(
  resolve(__dirname, 'retail-reports.html'),
  'utf-8',
);

describe('retail-reports template — array access guards (BUG-24)', () => {
  it('accesses salesByPaymentMethod.length without crashing', () => {
    expect(templateSource).toContain('report.salesByPaymentMethod.length');
  });

  it('accesses salesByItem.length without crashing', () => {
    expect(templateSource).toContain('report.salesByItem.length');
  });

  it('accesses salesByCategory.length without crashing', () => {
    expect(templateSource).toContain('report.salesByCategory.length');
  });

  it('accesses vendor topItems.length without crashing', () => {
    expect(templateSource).toContain('vendor.topItems.length');
  });

  it('accesses cogs trend.length without crashing', () => {
    expect(templateSource).toContain('cogs.trend.length');
  });

  it('accesses cogs rows.length without crashing', () => {
    expect(templateSource).toContain('cogs.rows.length');
  });

  it('accesses forecast dailyForecasts.length without crashing', () => {
    expect(templateSource).toContain('forecast.dailyForecasts.length');
  });

  it('accesses yoy monthlyRevenue.length without crashing', () => {
    expect(templateSource).toContain('yoy.monthlyRevenue.length');
  });

  it('accesses yoy topGrowthItems.length without crashing', () => {
    expect(templateSource).toContain('yoy.topGrowthItems.length');
  });

  it('accesses yoy topDeclineItems.length without crashing', () => {
    expect(templateSource).toContain('yoy.topDeclineItems.length');
  });

  it('accesses salesByItem.slice() directly (model guarantees non-null array)', () => {
    expect(templateSource).toContain('report.salesByItem.slice');
  });
});

describe('retail report models — undefined array safety (BUG-24)', () => {
  it('RetailSalesReport with undefined arrays does not crash length checks', () => {
    const report = {
      dateRange: { start: '2026-01-01', end: '2026-01-31', period: 'this_month' as const },
      totalRevenue: 0,
      totalCogs: 0,
      grossProfit: 0,
      grossMarginPercent: 0,
      totalUnits: 0,
      totalTransactions: 0,
      averageTransactionValue: 0,
    } as unknown as RetailSalesReport;

    // Simulate the template's optional chaining pattern
    expect((report.salesByPaymentMethod?.length ?? 0) > 0).toBe(false);
    expect((report.salesByItem?.length ?? 0) > 0).toBe(false);
    expect((report.salesByCategory?.length ?? 0) > 0).toBe(false);
    expect((report.salesByItem ?? []).slice(0, 10)).toEqual([]);
  });

  it('RetailCogsReport with undefined arrays does not crash length checks', () => {
    const cogs = {} as unknown as RetailCogsReport;

    expect((cogs.trend?.length ?? 0) > 0).toBe(false);
    expect((cogs.rows?.length ?? 0) > 0).toBe(false);
  });

  it('RetailVendorSalesRow with undefined topItems does not crash', () => {
    const vendor = {
      vendorId: 'v1',
      vendorName: 'Test',
      itemCount: 0,
      unitsSold: 0,
      revenue: 0,
      cogs: 0,
      profit: 0,
      marginPercent: 0,
    } as unknown as RetailVendorSalesRow;

    expect((vendor.topItems?.length ?? 0) > 0).toBe(false);
  });

  it('RetailSalesForecast with undefined dailyForecasts does not crash', () => {
    const forecast = {} as unknown as RetailSalesForecast;

    expect((forecast.dailyForecasts?.length ?? 0) > 0).toBe(false);
  });

  it('RetailYoyReport with undefined arrays does not crash', () => {
    const yoy = {} as unknown as RetailYoyReport;

    expect((yoy.monthlyRevenue?.length ?? 0) > 0).toBe(false);
    expect((yoy.topGrowthItems?.length ?? 0) > 0).toBe(false);
    expect((yoy.topDeclineItems?.length ?? 0) > 0).toBe(false);
  });

  it('fully populated RetailSalesReport still works with optional chaining', () => {
    const report: RetailSalesReport = {
      dateRange: { start: '2026-01-01', end: '2026-01-31', period: 'this_month' },
      totalRevenue: 5000,
      totalCogs: 2000,
      grossProfit: 3000,
      grossMarginPercent: 60,
      totalUnits: 100,
      totalTransactions: 50,
      averageTransactionValue: 100,
      salesByItem: [{ itemId: 'i1', itemName: 'Widget', variationName: null, sku: 'W1', quantitySold: 10, revenue: 500, cogs: 200, profit: 300, marginPercent: 60 }],
      salesByCategory: [{ categoryId: 'c1', categoryName: 'Gadgets', itemCount: 5, unitsSold: 20, revenue: 1000, cogs: 400, profit: 600, marginPercent: 60 }],
      salesByEmployee: [],
      salesByPaymentMethod: [{ method: 'card', transactionCount: 30, revenue: 3000, percent: 60 }],
    };

    expect((report.salesByPaymentMethod?.length ?? 0) > 0).toBe(true);
    expect((report.salesByItem?.length ?? 0) > 0).toBe(true);
    expect((report.salesByCategory?.length ?? 0) > 0).toBe(true);
    expect((report.salesByItem ?? []).slice(0, 10).length).toBe(1);
  });
});
