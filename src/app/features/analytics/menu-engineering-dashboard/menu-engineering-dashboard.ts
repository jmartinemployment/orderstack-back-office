import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { AnalyticsService } from '../../../services/analytics';
import { AuthService } from '../../../services/auth';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../../shared/error-display/error-display';
import {
  MenuQuadrant,
  ItemProfitabilityTrend,
  PriceElasticityIndicator,
  CannibalizationResult,
  SeasonalPattern,
  PrepTimeAccuracyRow,
} from '../../../models/index';

type DeepDiveTab = 'overview' | 'profitability' | 'elasticity' | 'cannibalization' | 'seasonal' | 'prep-time';

@Component({
  selector: 'os-menu-engineering',
  imports: [CurrencyPipe, DecimalPipe, LoadingSpinner, ErrorDisplay],
  templateUrl: './menu-engineering-dashboard.html',
  styleUrl: './menu-engineering-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuEngineeringDashboard implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly data = this.analyticsService.menuEngineering;
  readonly isLoading = this.analyticsService.isLoadingEngineering;
  readonly error = this.analyticsService.engineeringError;

  private readonly _days = signal(30);
  private readonly _sortField = signal<'name' | 'profitMargin' | 'popularity'>('profitMargin');
  private readonly _sortAsc = signal(false);
  private readonly _filterQuadrant = signal<MenuQuadrant | 'all'>('all');

  readonly days = this._days.asReadonly();
  readonly sortField = this._sortField.asReadonly();
  readonly sortAsc = this._sortAsc.asReadonly();
  readonly filterQuadrant = this._filterQuadrant.asReadonly();

  // --- Deep Dive (Phase 3) ---
  private readonly _deepDiveTab = signal<DeepDiveTab>('overview');
  private readonly _selectedItemId = signal<string | null>(null);
  private readonly _profitTrendDays = signal(30);
  private readonly _profitTrend = signal<ItemProfitabilityTrend | null>(null);
  private readonly _isLoadingTrend = signal(false);
  private readonly _elasticityData = signal<PriceElasticityIndicator[]>([]);
  private readonly _elasticityLoaded = signal(false);
  private readonly _isLoadingElasticity = signal(false);
  private readonly _cannibalizationDays = signal(60);
  private readonly _cannibalizationData = signal<CannibalizationResult[]>([]);
  private readonly _cannibalizationLoaded = signal(false);
  private readonly _isLoadingCannibalization = signal(false);
  private readonly _seasonalPattern = signal<SeasonalPattern | null>(null);
  private readonly _isLoadingSeasonal = signal(false);

  // --- Prep Time Accuracy (GAP-R05 Phase 2) ---
  private readonly _prepAccuracyDays = signal(30);
  private readonly _prepSortField = signal<'itemName' | 'accuracy' | 'sampleSize'>('accuracy');
  private readonly _prepSortAsc = signal(true);
  private readonly _showFlaggedOnly = signal(false);

  readonly deepDiveTab = this._deepDiveTab.asReadonly();
  readonly selectedItemId = this._selectedItemId.asReadonly();
  readonly profitTrendDays = this._profitTrendDays.asReadonly();
  readonly profitTrend = this._profitTrend.asReadonly();
  readonly isLoadingTrend = this._isLoadingTrend.asReadonly();
  readonly elasticityData = this._elasticityData.asReadonly();
  readonly isLoadingElasticity = this._isLoadingElasticity.asReadonly();
  readonly cannibalizationDays = this._cannibalizationDays.asReadonly();
  readonly cannibalizationData = this._cannibalizationData.asReadonly();
  readonly isLoadingCannibalization = this._isLoadingCannibalization.asReadonly();
  readonly seasonalPattern = this._seasonalPattern.asReadonly();
  readonly isLoadingSeasonal = this._isLoadingSeasonal.asReadonly();
  readonly prepTimeAccuracy = this.analyticsService.prepTimeAccuracy;
  readonly isLoadingPrepAccuracy = this.analyticsService.isLoadingPrepAccuracy;
  readonly flaggedPrepItems = this.analyticsService.flaggedPrepItems;
  readonly prepAccuracyDays = this._prepAccuracyDays.asReadonly();
  readonly prepSortField = this._prepSortField.asReadonly();
  readonly prepSortAsc = this._prepSortAsc.asReadonly();
  readonly showFlaggedOnly = this._showFlaggedOnly.asReadonly();

  readonly filteredItems = computed(() => {
    const engineering = this.data();
    if (!engineering) return [];

    let items = [...engineering.items];
    const quadrant = this._filterQuadrant();
    if (quadrant !== 'all') {
      items = items.filter(item => item.classification === quadrant);
    }

    const field = this._sortField();
    const asc = this._sortAsc();
    items.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return asc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return items;
  });

  readonly selectedItemName = computed(() => {
    const id = this._selectedItemId();
    if (!id) return null;
    const engineering = this.data();
    return engineering?.items.find(i => i.id === id)?.name ?? null;
  });

  readonly sortedElasticity = computed(() => {
    const data = this._elasticityData();
    if (!Array.isArray(data)) return [];
    return [...data].sort(
      (a, b) => Math.abs(b.estimatedRevenueChange) - Math.abs(a.estimatedRevenueChange)
    );
  });

  readonly trendMinMargin = computed(() => {
    const trend = this._profitTrend();
    if (!trend || trend.dataPoints.length === 0) return 0;
    return Math.min(...trend.dataPoints.map(d => d.margin));
  });

  readonly trendMaxMargin = computed(() => {
    const trend = this._profitTrend();
    if (!trend || trend.dataPoints.length === 0) return 100;
    return Math.max(...trend.dataPoints.map(d => d.margin));
  });

  readonly peakDay = computed(() => {
    const pattern = this._seasonalPattern();
    if (!pattern || pattern.dayOfWeek.length === 0) return null;
    return [...pattern.dayOfWeek].sort((a, b) => b.avgSales - a.avgSales)[0];
  });

  readonly peakMonth = computed(() => {
    const pattern = this._seasonalPattern();
    if (!pattern || pattern.monthOfYear.length === 0) return null;
    return [...pattern.monthOfYear].sort((a, b) => b.avgSales - a.avgSales)[0];
  });

  // Prep time: sorted and filtered
  readonly sortedPrepAccuracy = computed(() => {
    const flagged = this.flaggedPrepItems();
    const allRows = this.prepTimeAccuracy();
    let rows: PrepTimeAccuracyRow[];
    if (this._showFlaggedOnly()) {
      rows = Array.isArray(flagged) ? flagged : [];
    } else {
      rows = Array.isArray(allRows) ? [...allRows] : [];
    }

    const field = this._prepSortField();
    const asc = this._prepSortAsc();
    rows.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return asc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return rows;
  });

  readonly avgPrepAccuracy = computed(() => {
    const rows = this.prepTimeAccuracy();
    if (!Array.isArray(rows) || rows.length === 0) return 0;
    return Math.round(rows.reduce((sum, r) => sum + r.accuracy, 0) / rows.length);
  });

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.analyticsService.loadMenuEngineering(this._days());
    }
  }

  setDays(days: number): void {
    this._days.set(days);
    this.analyticsService.loadMenuEngineering(days);
  }

  setSort(field: 'name' | 'profitMargin' | 'popularity'): void {
    if (this._sortField() === field) {
      this._sortAsc.update(v => !v);
    } else {
      this._sortField.set(field);
      this._sortAsc.set(false);
    }
  }

  setFilter(quadrant: MenuQuadrant | 'all'): void {
    this._filterQuadrant.set(quadrant);
  }

  getQuadrantClass(classification: MenuQuadrant): string {
    switch (classification) {
      case 'star': return 'quadrant-star';
      case 'cash-cow': return 'quadrant-cash-cow';
      case 'puzzle': return 'quadrant-puzzle';
      case 'dog': return 'quadrant-dog';
    }
  }

  getQuadrantLabel(classification: MenuQuadrant): string {
    switch (classification) {
      case 'star': return 'Star';
      case 'cash-cow': return 'Cash Cow';
      case 'puzzle': return 'Puzzle';
      case 'dog': return 'Dog';
    }
  }

  getInsightIcon(type: string): string {
    switch (type) {
      case 'action': return '!';
      case 'warning': return '!!';
      default: return 'i';
    }
  }

  retry(): void {
    this.analyticsService.loadMenuEngineering(this._days());
  }

  // === Deep Dive Methods ===

  setDeepDiveTab(tab: DeepDiveTab): void {
    this._deepDiveTab.set(tab);

    if (tab === 'elasticity' && !this._elasticityLoaded()) {
      this.loadElasticity();
    }
    if (tab === 'cannibalization' && !this._cannibalizationLoaded()) {
      this.loadCannibalization();
    }
    if (tab === 'prep-time' && this.prepTimeAccuracy().length === 0) {
      this.analyticsService.loadPrepTimeAccuracy(this._prepAccuracyDays());
    }
  }

  selectItem(itemId: string): void {
    this._selectedItemId.set(itemId);
  }

  // Profitability Trend
  async loadProfitTrend(): Promise<void> {
    const itemId = this._selectedItemId();
    if (!itemId) return;
    if (this._isLoadingTrend()) return;

    this._isLoadingTrend.set(true);
    try {
      const result = await this.analyticsService.getItemProfitabilityTrend(itemId, this._profitTrendDays());
      this._profitTrend.set(result);
    } finally {
      this._isLoadingTrend.set(false);
    }
  }

  setProfitTrendDays(days: number): void {
    this._profitTrendDays.set(days);
    this.loadProfitTrend();
  }

  viewItemProfitability(itemId: string): void {
    this._selectedItemId.set(itemId);
    this._deepDiveTab.set('profitability');
    this.loadProfitTrend();
  }

  viewItemSeasonal(itemId: string): void {
    this._selectedItemId.set(itemId);
    this._deepDiveTab.set('seasonal');
    this.loadSeasonal();
  }

  getTrendBarHeight(margin: number): number {
    const min = this.trendMinMargin();
    const max = this.trendMaxMargin();
    const range = max - min;
    if (range === 0) return 50;
    return Math.max(10, ((margin - min) / range) * 100);
  }

  getTrendBarColor(margin: number): string {
    if (margin >= 60) return 'var(--os-success)';
    if (margin >= 40) return 'var(--os-warning)';
    return 'var(--os-danger)';
  }

  // Price Elasticity
  async loadElasticity(): Promise<void> {
    if (this._isLoadingElasticity()) return;
    this._isLoadingElasticity.set(true);
    try {
      const result = await this.analyticsService.getPriceElasticity(90);
      this._elasticityData.set(Array.isArray(result) ? result : []);
      this._elasticityLoaded.set(true);
    } finally {
      this._isLoadingElasticity.set(false);
    }
  }

  getElasticityClass(recommendation: 'increase' | 'decrease' | 'hold'): string {
    switch (recommendation) {
      case 'increase': return 'rec-increase';
      case 'decrease': return 'rec-decrease';
      case 'hold': return 'rec-hold';
    }
  }

  getElasticityLabel(recommendation: 'increase' | 'decrease' | 'hold'): string {
    switch (recommendation) {
      case 'increase': return 'Increase Price';
      case 'decrease': return 'Decrease Price';
      case 'hold': return 'Hold Price';
    }
  }

  getElasticityDescription(elasticity: number): string {
    const abs = Math.abs(elasticity);
    if (abs < 0.5) return 'Very inelastic — price changes have minimal impact on demand';
    if (abs < 1) return 'Inelastic — demand is relatively stable despite price changes';
    if (abs === 1) return 'Unit elastic — price and demand change proportionally';
    if (abs < 2) return 'Elastic — demand is sensitive to price changes';
    return 'Highly elastic — small price changes cause large demand shifts';
  }

  // Cannibalization
  async loadCannibalization(): Promise<void> {
    if (this._isLoadingCannibalization()) return;
    this._isLoadingCannibalization.set(true);
    try {
      const result = await this.analyticsService.getCannibalization(this._cannibalizationDays());
      this._cannibalizationData.set(Array.isArray(result) ? result : []);
      this._cannibalizationLoaded.set(true);
    } finally {
      this._isLoadingCannibalization.set(false);
    }
  }

  setCannibalizationDays(days: number): void {
    this._cannibalizationDays.set(days);
    this._cannibalizationLoaded.set(false);
    this.loadCannibalization();
  }

  getCannibalizationSeverity(declinePercent: number): string {
    if (declinePercent >= 30) return 'severity-critical';
    if (declinePercent >= 15) return 'severity-warning';
    return 'severity-low';
  }

  // Seasonal Pattern
  async loadSeasonal(): Promise<void> {
    const itemId = this._selectedItemId();
    if (!itemId) return;
    if (this._isLoadingSeasonal()) return;

    this._isLoadingSeasonal.set(true);
    try {
      const result = await this.analyticsService.getSeasonalPattern(itemId);
      this._seasonalPattern.set(result);
    } finally {
      this._isLoadingSeasonal.set(false);
    }
  }

  getSeasonalBarHeight(avgSales: number, allValues: { avgSales: number }[]): number {
    const max = Math.max(...allValues.map(v => v.avgSales));
    if (max === 0) return 10;
    return Math.max(10, (avgSales / max) * 100);
  }

  // === Prep Time Accuracy (GAP-R05 Phase 2) ===

  setPrepAccuracyDays(days: number): void {
    this._prepAccuracyDays.set(days);
    this.analyticsService.loadPrepTimeAccuracy(days);
  }

  setPrepSort(field: 'itemName' | 'accuracy' | 'sampleSize'): void {
    if (this._prepSortField() === field) {
      this._prepSortAsc.update(v => !v);
    } else {
      this._prepSortField.set(field);
      this._prepSortAsc.set(true);
    }
  }

  toggleFlaggedOnly(): void {
    this._showFlaggedOnly.update(v => !v);
  }

  getAccuracyClass(accuracy: number): string {
    if (accuracy >= 85) return 'accuracy-good';
    if (accuracy >= 70) return 'accuracy-fair';
    return 'accuracy-poor';
  }

  getAccuracyLabel(accuracy: number): string {
    if (accuracy >= 85) return 'Good';
    if (accuracy >= 70) return 'Fair';
    return 'Poor';
  }

  getDeviationPercent(row: PrepTimeAccuracyRow): number {
    if (row.estimatedMinutes === 0) return 0;
    return Math.round(Math.abs(row.actualAvgMinutes - row.estimatedMinutes) / row.estimatedMinutes * 100);
  }

  async applySuggestion(row: PrepTimeAccuracyRow): Promise<void> {
    if (row.suggestedAdjustment === null) return;
    await this.analyticsService.applyPrepTimeSuggestion(row.itemId, row.suggestedAdjustment);
  }
}
