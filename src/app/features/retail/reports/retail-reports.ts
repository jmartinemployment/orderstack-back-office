import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../../services/report';
import type {
  RetailReportTab,
  RetailReportPeriod,
  RetailSalesReport,
  RetailItemSalesRow,
  RetailCategorySalesRow,
  RetailEmployeeSalesRow,
  RetailDiscountReport,
  RetailTaxReport,
  RetailPaymentMethodRow,
  RetailCogsReport,
  RetailVendorSalesRow,
  RetailProjectedProfitReport,
  RetailProjectedProfitRow,
  RetailSalesForecast,
  RetailDemandForecastItem,
  RetailYoyReport,
  ReportDateRange,
  ComparisonPeriod,
} from '../../../models/report.model';

@Component({
  selector: 'os-retail-reports',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './retail-reports.html',
  styleUrl: './retail-reports.scss',
})
export class RetailReports implements OnInit {
  readonly reportService = inject(ReportService);

  readonly isLoading = this.reportService.isLoading;
  readonly error = this.reportService.error;

  // Tabs
  readonly activeTab = signal<RetailReportTab>('overview');

  // Date Range
  readonly selectedPeriod = signal<RetailReportPeriod>('today');
  readonly customDateFrom = signal('');
  readonly customDateTo = signal('');
  readonly showComparison = signal(false);
  readonly comparisonMode = signal<ComparisonPeriod>('previous_period');

  // Overview data
  readonly salesReport = signal<RetailSalesReport | null>(null);

  // Sales tab data
  readonly itemSalesData = signal<RetailItemSalesRow[]>([]);
  readonly categorySalesData = signal<RetailCategorySalesRow[]>([]);
  readonly employeeSalesData = signal<RetailEmployeeSalesRow[]>([]);
  readonly discountData = signal<RetailDiscountReport[]>([]);
  readonly taxData = signal<RetailTaxReport[]>([]);

  // Inventory report data (Phase 2)
  readonly cogsReport = signal<RetailCogsReport | null>(null);
  readonly vendorSalesData = signal<RetailVendorSalesRow[]>([]);
  readonly projectedProfitReport = signal<RetailProjectedProfitReport | null>(null);
  readonly expandedVendorId = signal<string | null>(null);

  // Predictive & Comparison data (Phase 3)
  readonly salesForecast = signal<RetailSalesForecast | null>(null);
  readonly forecastDays = signal(14);
  readonly demandForecast = signal<RetailDemandForecastItem[]>([]);
  readonly demandFilter = signal<'all' | 'stockout' | 'peak'>('all');
  readonly yoyReport = signal<RetailYoyReport | null>(null);

  // Item sales filters
  readonly itemSortField = signal<keyof RetailItemSalesRow>('revenue');
  readonly itemSortAsc = signal(false);
  readonly itemSearch = signal('');

  // Projected profit sort
  readonly profitSortField = signal<keyof RetailProjectedProfitRow>('projectedProfit');
  readonly profitSortAsc = signal(false);

  // Computeds — Date Range
  readonly dateRange = computed<ReportDateRange>(() => {
    const period = this.selectedPeriod();
    const today = new Date();
    let startDate: string;
    let endDate: string;

    switch (period) {
      case 'today':
        startDate = endDate = this.formatDate(today);
        break;
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = endDate = this.formatDate(yesterday);
        break;
      }
      case 'this_week': {
        const start = new Date(today);
        start.setDate(start.getDate() - start.getDay());
        startDate = this.formatDate(start);
        endDate = this.formatDate(today);
        break;
      }
      case 'last_week': {
        const start = new Date(today);
        start.setDate(start.getDate() - start.getDay() - 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        startDate = this.formatDate(start);
        endDate = this.formatDate(end);
        break;
      }
      case 'this_month':
        startDate = this.formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
        endDate = this.formatDate(today);
        break;
      case 'last_month': {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = this.formatDate(start);
        endDate = this.formatDate(end);
        break;
      }
      case 'custom':
        startDate = this.customDateFrom() || this.formatDate(today);
        endDate = this.customDateTo() || this.formatDate(today);
        break;
      default:
        startDate = endDate = this.formatDate(today);
    }

    const range: ReportDateRange = { startDate, endDate };
    if (this.showComparison()) {
      range.comparisonPeriod = this.comparisonMode();
    }
    return range;
  });

  // Computeds — Overview
  readonly revenueChange = computed(() => {
    const report = this.salesReport();
    if (!report?.comparison) return null;
    const previous = report.comparison.totalRevenue;
    if (previous === 0) return null;
    return ((report.totalRevenue - previous) / previous) * 100;
  });

  readonly unitsChange = computed(() => {
    const report = this.salesReport();
    if (!report?.comparison) return null;
    const previous = report.comparison.totalUnits;
    if (previous === 0) return null;
    return ((report.totalUnits - previous) / previous) * 100;
  });

  readonly transactionsChange = computed(() => {
    const report = this.salesReport();
    if (!report?.comparison) return null;
    const previous = report.comparison.totalTransactions;
    if (previous === 0) return null;
    return ((report.totalTransactions - previous) / previous) * 100;
  });

  readonly atvChange = computed(() => {
    const report = this.salesReport();
    if (!report?.comparison) return null;
    const previous = report.comparison.averageTransactionValue;
    if (previous === 0) return null;
    return ((report.averageTransactionValue - previous) / previous) * 100;
  });

  readonly marginChange = computed(() => {
    const report = this.salesReport();
    if (!report?.comparison) return null;
    return report.grossMarginPercent - report.comparison.grossMarginPercent;
  });

  // Computeds — Items
  readonly sortedItemSales = computed(() => {
    let items = [...this.itemSalesData()];
    const search = this.itemSearch().toLowerCase().trim();
    if (search) {
      items = items.filter(i =>
        i.itemName.toLowerCase().includes(search) ||
        i.sku.toLowerCase().includes(search) ||
        (i.variationName ?? '').toLowerCase().includes(search)
      );
    }
    const field = this.itemSortField();
    const asc = this.itemSortAsc();
    items.sort((a, b) => {
      const va = a[field] ?? '';
      const vb = b[field] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') {
        return asc ? va - vb : vb - va;
      }
      return asc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return items;
  });

  // Computeds — Categories
  readonly categoryTotalRevenue = computed(() =>
    this.categorySalesData().reduce((sum, c) => sum + c.revenue, 0)
  );

  readonly categoryTotalUnits = computed(() =>
    this.categorySalesData().reduce((sum, c) => sum + c.unitsSold, 0)
  );

  readonly categoryTotalCogs = computed(() =>
    this.categorySalesData().reduce((sum, c) => sum + c.cogs, 0)
  );

  readonly categoryTotalProfit = computed(() =>
    this.categorySalesData().reduce((sum, c) => sum + c.profit, 0)
  );

  // Computeds — Employees
  readonly topEmployee = computed(() => {
    const employees = this.employeeSalesData();
    if (employees.length === 0) return null;
    return employees.reduce((top, e) => e.revenue > top.revenue ? e : top, employees[0]);
  });

  // Computeds — Discounts
  readonly totalDiscountImpact = computed(() =>
    this.discountData().reduce((sum, d) => sum + d.totalDiscountAmount, 0)
  );

  // Computeds — Tax
  readonly totalTaxCollected = computed(() =>
    this.taxData().reduce((sum, t) => sum + t.taxCollected, 0)
  );

  readonly totalTaxableAmount = computed(() =>
    this.taxData().reduce((sum, t) => sum + t.taxableAmount, 0)
  );

  // Computeds — COGS
  readonly cogsMaxBar = computed(() => {
    const report = this.cogsReport();
    if (!report) return 1;
    return Math.max(...report.trend.map(t => t.totalCogs), 1);
  });

  // Computeds — Vendor Sales
  readonly vendorTotalRevenue = computed(() =>
    this.vendorSalesData().reduce((sum, v) => sum + v.revenue, 0)
  );

  // Computeds — Projected Profit
  readonly sortedProjectedProfit = computed(() => {
    const report = this.projectedProfitReport();
    if (!report) return [];
    let rows = [...report.rows];
    const field = this.profitSortField();
    const asc = this.profitSortAsc();
    rows.sort((a, b) => {
      const va = a[field] ?? 0;
      const vb = b[field] ?? 0;
      if (typeof va === 'number' && typeof vb === 'number') {
        return asc ? va - vb : vb - va;
      }
      return asc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return rows;
  });

  // Computeds — Forecast
  readonly forecastMaxRevenue = computed(() => {
    const forecast = this.salesForecast();
    if (!forecast) return 1;
    return Math.max(...forecast.dailyForecasts.map(d => d.confidenceHigh), 1);
  });

  // Computeds — Demand
  readonly filteredDemand = computed(() => {
    const items = this.demandForecast();
    const filter = this.demandFilter();
    switch (filter) {
      case 'stockout':
        return items.filter(i => i.daysUntilStockout !== null && i.daysUntilStockout <= 14);
      case 'peak':
        return items.filter(i => i.seasonalPattern === 'peak');
      default:
        return items;
    }
  });

  readonly stockoutCount = computed(() =>
    this.demandForecast().filter(i => i.daysUntilStockout !== null && i.daysUntilStockout <= 14).length
  );

  // Computeds — YoY
  readonly yoyMaxRevenue = computed(() => {
    const report = this.yoyReport();
    if (!report) return 1;
    return Math.max(...report.monthlyRevenue.flatMap(m => [m.thisYear, m.lastYear]), 1);
  });

  readonly periodOptions: { value: RetailReportPeriod; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'custom', label: 'Custom' },
  ];

  ngOnInit(): void {
    this.loadOverview();
  }

  // --- Tab Navigation ---

  setTab(tab: RetailReportTab): void {
    this.activeTab.set(tab);
    switch (tab) {
      case 'overview':
        this.loadOverview();
        break;
      case 'items':
        this.loadItemSales();
        break;
      case 'categories':
        this.loadCategorySales();
        break;
      case 'employees':
        this.loadEmployeeSales();
        break;
      case 'discounts':
        this.loadDiscounts();
        break;
      case 'tax':
        this.loadTax();
        break;
      case 'cogs':
        this.loadCogs();
        break;
      case 'vendor-sales':
        this.loadVendorSales();
        break;
      case 'projected-profit':
        this.loadProjectedProfit();
        break;
      case 'forecast':
        this.loadForecast();
        break;
      case 'demand':
        this.loadDemandForecast();
        break;
      case 'yoy':
        this.loadYoy();
        break;
    }
  }

  // --- Date Range ---

  selectPeriod(period: RetailReportPeriod): void {
    this.selectedPeriod.set(period);
    this.refreshCurrentTab();
  }

  updateCustomDateFrom(value: string): void {
    this.customDateFrom.set(value);
    if (this.selectedPeriod() === 'custom') this.refreshCurrentTab();
  }

  updateCustomDateTo(value: string): void {
    this.customDateTo.set(value);
    if (this.selectedPeriod() === 'custom') this.refreshCurrentTab();
  }

  toggleComparison(): void {
    this.showComparison.update(v => !v);
    this.refreshCurrentTab();
  }

  updateComparisonMode(value: ComparisonPeriod): void {
    this.comparisonMode.set(value);
    if (this.showComparison()) this.refreshCurrentTab();
  }

  // --- Loading ---

  async loadOverview(): Promise<void> {
    const report = await this.reportService.getRetailSalesReport(this.dateRange());
    if (report) this.salesReport.set(report);
  }

  async loadItemSales(): Promise<void> {
    const rows = await this.reportService.getRetailItemSales(this.dateRange());
    this.itemSalesData.set(rows);
  }

  async loadCategorySales(): Promise<void> {
    const rows = await this.reportService.getRetailCategorySales(this.dateRange());
    this.categorySalesData.set(rows);
  }

  async loadEmployeeSales(): Promise<void> {
    const rows = await this.reportService.getRetailEmployeeSales(this.dateRange());
    this.employeeSalesData.set(rows);
  }

  async loadDiscounts(): Promise<void> {
    const rows = await this.reportService.getRetailDiscountReport(this.dateRange());
    this.discountData.set(rows);
  }

  async loadTax(): Promise<void> {
    const rows = await this.reportService.getRetailTaxReport(this.dateRange());
    this.taxData.set(rows);
  }

  async loadCogs(): Promise<void> {
    const report = await this.reportService.getRetailCogsReport(this.dateRange());
    if (report) this.cogsReport.set(report);
  }

  async loadVendorSales(): Promise<void> {
    const rows = await this.reportService.getRetailVendorSales(this.dateRange());
    this.vendorSalesData.set(rows);
  }

  async loadProjectedProfit(): Promise<void> {
    const report = await this.reportService.getRetailProjectedProfit();
    if (report) this.projectedProfitReport.set(report);
  }

  async loadForecast(): Promise<void> {
    const forecast = await this.reportService.getRetailSalesForecast(this.forecastDays());
    if (forecast) this.salesForecast.set(forecast);
  }

  async loadDemandForecast(): Promise<void> {
    const rows = await this.reportService.getRetailDemandForecast();
    this.demandForecast.set(rows);
  }

  async loadYoy(): Promise<void> {
    const report = await this.reportService.getRetailYoyReport(this.dateRange());
    if (report) this.yoyReport.set(report);
  }

  selectForecastDays(days: number): void {
    this.forecastDays.set(days);
    this.loadForecast();
  }

  setDemandFilter(filter: 'all' | 'stockout' | 'peak'): void {
    this.demandFilter.set(filter);
  }

  getForecastBarHeight(revenue: number): number {
    const max = this.forecastMaxRevenue();
    return (revenue / max) * 100;
  }

  getConfidenceBandTop(high: number): number {
    const max = this.forecastMaxRevenue();
    return 100 - (high / max) * 100;
  }

  getConfidenceBandHeight(low: number, high: number): number {
    const max = this.forecastMaxRevenue();
    return ((high - low) / max) * 100;
  }

  getConfidenceClass(confidence: string): string {
    switch (confidence) {
      case 'high': return 'confidence-high';
      case 'medium': return 'confidence-medium';
      case 'low': return 'confidence-low';
      default: return '';
    }
  }

  getStockoutClass(days: number | null): string {
    if (days === null) return '';
    if (days <= 3) return 'stockout-critical';
    if (days <= 7) return 'stockout-warning';
    if (days <= 14) return 'stockout-caution';
    return '';
  }

  getYoyBarHeight(value: number): number {
    const max = this.yoyMaxRevenue();
    return max > 0 ? (value / max) * 100 : 0;
  }

  private refreshCurrentTab(): void {
    this.setTab(this.activeTab());
  }

  // --- Item Sort ---

  sortItems(field: keyof RetailItemSalesRow): void {
    if (this.itemSortField() === field) {
      this.itemSortAsc.update(v => !v);
    } else {
      this.itemSortField.set(field);
      this.itemSortAsc.set(false);
    }
  }

  updateItemSearch(value: string): void {
    this.itemSearch.set(value);
  }

  getSortIcon(field: keyof RetailItemSalesRow): string {
    if (this.itemSortField() !== field) return 'bi-chevron-expand';
    return this.itemSortAsc() ? 'bi-chevron-up' : 'bi-chevron-down';
  }

  // --- Profit Sort ---

  sortProfit(field: keyof RetailProjectedProfitRow): void {
    if (this.profitSortField() === field) {
      this.profitSortAsc.update(v => !v);
    } else {
      this.profitSortField.set(field);
      this.profitSortAsc.set(false);
    }
  }

  getProfitSortIcon(field: keyof RetailProjectedProfitRow): string {
    if (this.profitSortField() !== field) return 'bi-chevron-expand';
    return this.profitSortAsc() ? 'bi-chevron-up' : 'bi-chevron-down';
  }

  // --- Vendor ---

  toggleVendorExpand(vendorId: string): void {
    this.expandedVendorId.update(v => v === vendorId ? null : vendorId);
  }

  getVendorShareWidth(revenue: number): number {
    const total = this.vendorTotalRevenue();
    return total > 0 ? (revenue / total) * 100 : 0;
  }

  // --- COGS ---

  getCogsTrendBarHeight(cogs: number): number {
    const max = this.cogsMaxBar();
    return (cogs / max) * 100;
  }

  // --- Helpers ---

  getDeltaClass(value: number | null): string {
    if (value === null) return '';
    return value >= 0 ? 'delta-positive' : 'delta-negative';
  }

  getDeltaIcon(value: number | null): string {
    if (value === null) return '';
    return value >= 0 ? 'bi-arrow-up-short' : 'bi-arrow-down-short';
  }

  getCategoryBarWidth(revenue: number): number {
    const total = this.categoryTotalRevenue();
    return total > 0 ? (revenue / total) * 100 : 0;
  }

  getPaymentBarWidth(row: RetailPaymentMethodRow): number {
    return row.percentage;
  }

  getEmployeeRank(index: number): string {
    switch (index) {
      case 0: return 'gold';
      case 1: return 'silver';
      case 2: return 'bronze';
      default: return '';
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
