import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { AnalyticsService } from '../../../services/analytics';
import { InventoryService } from '../../../services/inventory';
import { OrderService } from '../../../services/order';
import { AuthService } from '../../../services/auth';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../../shared/error-display/error-display';
import {
  RecentProfitSummary,
  RevenueForecast,
  DemandForecastItem,
  StaffingRecommendation,
  PinnedWidget,
  AiInsightCard,
} from '../../../models/index';

type CommandTab = 'overview' | 'insights' | 'alerts' | 'forecast';

interface UnifiedInsight {
  id: string;
  source: 'sales' | 'menu' | 'inventory' | 'profit';
  text: string;
  priority: 'high' | 'medium' | 'low';
  type: 'positive' | 'negative' | 'neutral' | 'action' | 'warning';
}

/** Wraps a promise with a timeout — resolves with void on timeout instead of hanging */
function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
  return Promise.race([
    promise,
    new Promise<void>(resolve => setTimeout(resolve, ms)),
  ]);
}

@Component({
  selector: 'os-command-center',
  imports: [CurrencyPipe, DecimalPipe, LoadingSpinner, ErrorDisplay],
  templateUrl: './command-center.html',
  styleUrl: './command-center.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandCenter {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly inventoryService = inject(InventoryService);
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(RestaurantSettingsService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly aiConfigured = computed(() => this.settingsService.aiAdminConfig()?.apiKeyConfigured ?? false);

  private readonly _activeTab = signal<CommandTab>('overview');
  private readonly _isLoading = signal(false);
  private readonly _isLoadingAllData = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _profitSummary = signal<RecentProfitSummary | null>(null);
  private readonly _lastRefresh = signal<Date | null>(null);

  // --- Predictive Analytics (Phase 3) ---
  private readonly _forecastDays = signal(14);
  private readonly _revenueForecast = signal<RevenueForecast | null>(null);
  private readonly _isLoadingForecast = signal(false);
  private readonly _demandForecastDate = signal(this.getTomorrowDate());
  private readonly _demandForecast = signal<DemandForecastItem[]>([]);
  private readonly _isLoadingDemand = signal(false);
  private readonly _staffingDate = signal(this.getTomorrowDate());
  private readonly _staffingRec = signal<StaffingRecommendation | null>(null);
  private readonly _isLoadingStaffing = signal(false);

  readonly activeTab = this._activeTab.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly profitSummary = this._profitSummary.asReadonly();
  readonly lastRefresh = this._lastRefresh.asReadonly();

  readonly forecastDays = this._forecastDays.asReadonly();
  readonly revenueForecast = this._revenueForecast.asReadonly();
  readonly isLoadingForecast = this._isLoadingForecast.asReadonly();
  readonly demandForecastDate = this._demandForecastDate.asReadonly();
  readonly demandForecast = this._demandForecast.asReadonly();
  readonly isLoadingDemand = this._isLoadingDemand.asReadonly();
  readonly staffingDate = this._staffingDate.asReadonly();
  readonly staffingRec = this._staffingRec.asReadonly();
  readonly isLoadingStaffing = this._isLoadingStaffing.asReadonly();

  // Existing service signals
  readonly salesReport = this.analyticsService.salesReport;
  readonly menuEngineering = this.analyticsService.menuEngineering;
  readonly inventoryAlerts = this.inventoryService.alerts;
  readonly inventoryPredictions = this.inventoryService.predictions;
  readonly activeOrderCount = this.orderService.activeOrderCount;

  // KPI computeds
  readonly todayRevenue = computed(() => {
    const report = this.salesReport();
    return report?.summary.totalRevenue ?? 0;
  });

  readonly todayOrders = computed(() => {
    const report = this.salesReport();
    return report?.summary.totalOrders ?? 0;
  });

  readonly avgOrderValue = computed(() => {
    const report = this.salesReport();
    return report?.summary.averageOrderValue ?? 0;
  });

  readonly revenueChange = computed(() => {
    const report = this.salesReport();
    return report?.comparison?.revenueChange ?? null;
  });

  readonly avgProfitMargin = computed(() => {
    return this._profitSummary()?.averageMargin ?? null;
  });

  readonly totalAlertCount = computed(() => {
    return this.inventoryAlerts().length;
  });

  readonly criticalAlertCount = computed(() => {
    return this.inventoryAlerts().filter(a => a.severity === 'critical').length;
  });

  readonly menuStars = computed(() => {
    return this.menuEngineering()?.summary.stars ?? 0;
  });

  readonly menuDogs = computed(() => {
    return this.menuEngineering()?.summary.dogs ?? 0;
  });

  readonly urgentPredictions = computed(() => {
    return this.inventoryPredictions()
      .filter(p => p.daysUntilEmpty < 7)
      .sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty)
      .slice(0, 5);
  });

  readonly topSellers = computed(() => {
    return this.salesReport()?.summary.topSellingItems?.slice(0, 5) ?? [];
  });

  readonly hasAnyData = computed(() => {
    return this.salesReport() !== null
      || this.menuEngineering() !== null
      || this.inventoryAlerts().length > 0
      || this._profitSummary() !== null;
  });

  // Unified insights feed
  readonly unifiedInsights = computed<UnifiedInsight[]>(() => {
    const insights: UnifiedInsight[] = [];

    const salesInsights = this.salesReport()?.insights ?? [];
    for (const si of salesInsights) {
      insights.push({
        id: `sales-${(si.text ?? '').slice(0, 20)}`,
        source: 'sales',
        text: si.text ?? '',
        priority: si.change !== undefined && Math.abs(si.change) > 20 ? 'high' : 'medium',
        type: si.type,
      });
    }

    const menuInsights = this.menuEngineering()?.insights ?? [];
    for (const mi of menuInsights) {
      let insightType: UnifiedInsight['type'];
      if (mi.type === 'warning') {
        insightType = 'warning';
      } else if (mi.type === 'action') {
        insightType = 'action';
      } else {
        insightType = 'neutral';
      }

      insights.push({
        id: `menu-${(mi.text ?? '').slice(0, 20)}`,
        source: 'menu',
        text: mi.text ?? '',
        priority: mi.priority,
        type: insightType,
      });
    }

    const critAlerts = this.inventoryAlerts().filter(a => a.severity === 'critical');
    for (const alert of critAlerts.slice(0, 3)) {
      insights.push({
        id: `inv-${alert.itemId}`,
        source: 'inventory',
        text: `${alert.itemName}: ${alert.message}. ${alert.suggestedAction}`,
        priority: 'high',
        type: 'warning',
      });
    }

    const profit = this._profitSummary();
    if (profit && profit.averageMargin < 30) {
      insights.push({
        id: 'profit-low-margin',
        source: 'profit',
        text: `Average profit margin is ${profit.averageMargin.toFixed(1)}% — below the 30% target. Review item pricing.`,
        priority: 'high',
        type: 'negative',
      });
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return insights;
  });

  // Proactive insights (GAP-R02 Phase 2)
  readonly proactiveInsights = this.analyticsService.proactiveInsights;
  readonly isLoadingProactiveInsights = this.analyticsService.isLoadingProactiveInsights;

  readonly proactiveInsightCount = computed(() => this.proactiveInsights().length);

  // Pinned widgets
  readonly pinnedWidgets = this.analyticsService.pinnedWidgets;

  // Forecast computeds
  readonly forecastTotalPredicted = computed(() => {
    return this._revenueForecast()?.totalPredicted ?? 0;
  });

  readonly forecastConfidence = computed(() => {
    return this._revenueForecast()?.confidence ?? 0;
  });

  readonly forecastMaxRevenue = computed(() => {
    const forecast = this._revenueForecast();
    if (!forecast || forecast.dataPoints.length === 0) return 1;
    return Math.max(...forecast.dataPoints.map(d => d.upper));
  });

  readonly topDemandItems = computed(() => {
    const data = this._demandForecast();
    if (!Array.isArray(data)) return [];
    return [...data].sort((a, b) => b.predictedQuantity - a.predictedQuantity).slice(0, 10);
  });

  readonly peakStaffingHour = computed(() => {
    const rec = this._staffingRec();
    if (!rec || !Array.isArray(rec.hourlyBreakdown) || rec.hourlyBreakdown.length === 0) return null;
    return [...rec.hourlyBreakdown].sort((a, b) => b.recommendedStaff - a.recommendedStaff)[0];
  });

  readonly maxStaffCount = computed(() => {
    const rec = this._staffingRec();
    if (!rec || !Array.isArray(rec.hourlyBreakdown) || rec.hourlyBreakdown.length === 0) return 1;
    return Math.max(...rec.hourlyBreakdown.map(h => h.recommendedStaff));
  });

  constructor() {
    effect(() => {
      if (this.isAuthenticated() && this.authService.selectedMerchantId()) {
        this.loadAllData();
      }
    });
  }

  setTab(tab: CommandTab): void {
    this._activeTab.set(tab);

    if (tab === 'forecast' && !this._revenueForecast()) {
      this.loadForecastData().catch(() => {/* errors handled inside */});
    }
  }

  async loadAllData(): Promise<void> {
    if (this._isLoadingAllData()) return;
    this._isLoadingAllData.set(true);
    this._isLoading.set(true);
    this._error.set(null);

    const PER_CALL_TIMEOUT = 15_000;

    try {
      await Promise.allSettled([
        withTimeout(this.analyticsService.loadSalesReport('daily'), PER_CALL_TIMEOUT),
        withTimeout(this.analyticsService.loadMenuEngineering(30), PER_CALL_TIMEOUT),
        withTimeout(this.inventoryService.loadAlerts(), PER_CALL_TIMEOUT),
        withTimeout(this.inventoryService.loadPredictions(), PER_CALL_TIMEOUT),
        withTimeout(this.orderService.loadOrders({ limit: 20 }), PER_CALL_TIMEOUT),
        withTimeout(this.loadProfitSummary(), PER_CALL_TIMEOUT),
        withTimeout(this.settingsService.loadAiAdminConfig(), PER_CALL_TIMEOUT),
        withTimeout(this.analyticsService.loadPinnedWidgets(), PER_CALL_TIMEOUT),
        withTimeout(this.analyticsService.loadProactiveInsights(), PER_CALL_TIMEOUT),
      ]);
      this._lastRefresh.set(new Date());
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      this._isLoading.set(false);
      this._isLoadingAllData.set(false);
    }
  }

  async refresh(): Promise<void> {
    await this.loadAllData();
  }

  clearError(): void {
    this._error.set(null);
  }

  getInsightIcon(type: UnifiedInsight['type']): string {
    switch (type) {
      case 'positive': return 'arrow-up';
      case 'negative': return 'arrow-down';
      case 'warning': return 'exclamation';
      case 'action': return 'lightning';
      default: return 'info';
    }
  }

  getInsightClass(type: UnifiedInsight['type']): string {
    switch (type) {
      case 'positive': return 'insight-positive';
      case 'negative': return 'insight-negative';
      case 'warning': return 'insight-warning';
      case 'action': return 'insight-action';
      default: return 'insight-neutral';
    }
  }

  getSourceLabel(source: UnifiedInsight['source']): string {
    switch (source) {
      case 'sales': return 'Sales';
      case 'menu': return 'Menu';
      case 'inventory': return 'Inventory';
      case 'profit': return 'Profit';
    }
  }

  getAlertSeverityClass(severity: string): string {
    switch (severity) {
      case 'critical': return 'alert-critical';
      case 'warning': return 'alert-warn';
      default: return 'alert-info';
    }
  }

  getPredictionUrgencyClass(days: number): string {
    if (days < 3) return 'urgency-critical';
    if (days < 7) return 'urgency-warning';
    if (days < 14) return 'urgency-caution';
    return 'urgency-ok';
  }

  getRefreshTimeText(): string {
    const last = this._lastRefresh();
    if (!last) return '';
    const seconds = Math.floor((Date.now() - last.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  }

  // === Predictive Analytics Methods ===

  private static readonly FORECAST_TIMEOUT = 15_000;

  async loadForecastData(): Promise<void> {
    await Promise.allSettled([
      withTimeout(this.loadRevenueForecast(), CommandCenter.FORECAST_TIMEOUT),
      withTimeout(this.loadDemandForecast(), CommandCenter.FORECAST_TIMEOUT),
      withTimeout(this.loadStaffingRecommendation(), CommandCenter.FORECAST_TIMEOUT),
    ]);
  }

  async loadRevenueForecast(): Promise<void> {
    this._isLoadingForecast.set(true);
    try {
      const result = await this.analyticsService.getRevenueForecast(this._forecastDays());
      this._revenueForecast.set(result);
    } catch {
      this._revenueForecast.set(null);
    } finally {
      this._isLoadingForecast.set(false);
    }
  }

  setForecastDays(days: number): void {
    this._forecastDays.set(days);
    this.loadRevenueForecast().catch(() => {/* errors handled inside */});
  }

  getForecastBarHeight(upper: number): number {
    const max = this.forecastMaxRevenue();
    if (max === 0) return 10;
    return Math.max(10, (upper / max) * 100);
  }

  getForecastPredictedHeight(predicted: number): number {
    const max = this.forecastMaxRevenue();
    if (max === 0) return 10;
    return Math.max(5, (predicted / max) * 100);
  }

  async loadDemandForecast(): Promise<void> {
    this._isLoadingDemand.set(true);
    try {
      const result = await this.analyticsService.getDemandForecast(this._demandForecastDate());
      this._demandForecast.set(result);
    } catch {
      this._demandForecast.set([]);
    } finally {
      this._isLoadingDemand.set(false);
    }
  }

  setDemandDate(date: string): void {
    this._demandForecastDate.set(date);
    this.loadDemandForecast().catch(() => {/* errors handled inside */});
  }

  getConfidenceClass(confidence: number): string {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  }

  getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  }

  async loadStaffingRecommendation(): Promise<void> {
    this._isLoadingStaffing.set(true);
    try {
      const result = await this.analyticsService.getStaffingRecommendation(this._staffingDate());
      this._staffingRec.set(result);
    } catch {
      this._staffingRec.set(null);
    } finally {
      this._isLoadingStaffing.set(false);
    }
  }

  setStaffingDate(date: string): void {
    this._staffingDate.set(date);
    this.loadStaffingRecommendation().catch(() => {/* errors handled inside */});
  }

  getStaffBarHeight(count: number): number {
    const max = this.maxStaffCount();
    if (max === 0) return 10;
    return Math.max(10, (count / max) * 100);
  }

  formatHour(hour: number): string {
    if (hour === 0) return '12am';
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return '12pm';
    return `${hour - 12}pm`;
  }

  private getTomorrowDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  unpinWidget(widgetId: string): void {
    this.analyticsService.unpinWidget(widgetId);
  }

  dismissInsight(cardId: string): void {
    this.analyticsService.dismissInsight(cardId);
  }

  pinInsight(card: AiInsightCard): void {
    this.analyticsService.pinWidget(card);
    this.analyticsService.dismissInsight(card.id);
  }

  getProactiveInsightIcon(card: AiInsightCard): string {
    if (card.trend === 'down') return 'bi-exclamation-triangle';
    if (card.trend === 'up') return 'bi-arrow-up-circle';
    return 'bi-lightbulb';
  }

  getProactiveInsightClass(card: AiInsightCard): string {
    if (card.trend === 'down') return 'proactive-negative';
    if (card.trend === 'up') return 'proactive-positive';
    return 'proactive-neutral';
  }

  getProactiveInsightText(card: AiInsightCard): string {
    if (card.responseType === 'text') {
      return (card.data['text'] as string) ?? '';
    }
    if (card.responseType === 'kpi' && card.value !== undefined) {
      if (card.unit === '%') return `${card.value > 0 ? '+' : ''}${card.value.toFixed(1)}% vs yesterday`;
      return `${card.value} ${card.unit ?? ''}`;
    }
    return card.title;
  }

  getWidgetText(widget: PinnedWidget): string {
    return (widget.insightCard.data['text'] as string) ?? '';
  }

  private async loadProfitSummary(): Promise<void> {
    try {
      const result = await this.orderService.getRecentProfit(10);
      if (result) {
        this._profitSummary.set(result);
      }
    } catch {
      // Profit summary is non-critical — leave as null
    }
  }
}
