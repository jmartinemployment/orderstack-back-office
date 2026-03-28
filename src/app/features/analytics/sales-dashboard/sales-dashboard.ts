import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../../../services/analytics';
import { AuthService } from '../../../services/auth';
import { ReportService } from '../../../services/report';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../../shared/error-display/error-display';
import { destroyChart } from '../../../shared/utils/chart-helpers';
import { Chart } from 'chart.js';
import {
  GoalPeriodType,
  SalesGoalFormData,
  FunnelStep,
  RealTimeKpi,
} from '../../../models/index';

type SalesDashboardTab = 'overview' | 'goals' | 'team' | 'funnel' | 'alerts';

@Component({
  selector: 'os-sales-dashboard',
  imports: [CurrencyPipe, DecimalPipe, TitleCasePipe, FormsModule, LoadingSpinner, ErrorDisplay],
  templateUrl: './sales-dashboard.html',
  styleUrl: './sales-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesDashboard implements OnInit, OnDestroy {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly authService = inject(AuthService);
  private readonly reportService = inject(ReportService);

  readonly teamChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('teamChart');

  private readonly teamChart: Chart | null = null;
  private kpiRefreshInterval: ReturnType<typeof setInterval> | null = null;

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly report = this.analyticsService.salesReport;
  readonly isLoading = this.analyticsService.isLoadingSales;
  readonly error = this.analyticsService.salesError;
  readonly goals = this.analyticsService.goals;
  readonly activeGoalProgress = this.analyticsService.activeGoalProgress;
  readonly isLoadingGoals = this.analyticsService.isLoadingGoals;
  readonly teamReport = this.analyticsService.teamReport;
  readonly isLoadingTeam = this.analyticsService.isLoadingTeam;
  readonly teamLeaderboard = this.analyticsService.teamLeaderboard;
  readonly conversionFunnel = this.analyticsService.conversionFunnel;
  readonly isLoadingFunnel = this.analyticsService.isLoadingFunnel;
  readonly salesAlerts = this.analyticsService.salesAlerts;
  readonly isLoadingAlerts = this.analyticsService.isLoadingAlerts;
  readonly unacknowledgedAlertCount = this.analyticsService.unacknowledgedAlertCount;

  // Real-Time KPIs
  private readonly _realTimeKpi = signal<RealTimeKpi | null>(null);
  private readonly _isLoadingKpi = signal(false);
  readonly realTimeKpi = this._realTimeKpi.asReadonly();
  readonly isLoadingKpi = this._isLoadingKpi.asReadonly();

  readonly revenueVsYesterday = computed(() => {
    const kpi = this._realTimeKpi();
    if (!kpi || kpi.yesterdaySameTimeRevenue === 0) return null;
    return ((kpi.todayRevenue - kpi.yesterdaySameTimeRevenue) / kpi.yesterdaySameTimeRevenue) * 100;
  });

  readonly ordersVsYesterday = computed(() => {
    const kpi = this._realTimeKpi();
    if (!kpi || kpi.yesterdaySameTimeOrders === 0) return null;
    return ((kpi.todayOrders - kpi.yesterdaySameTimeOrders) / kpi.yesterdaySameTimeOrders) * 100;
  });

  readonly revenueVsLastWeek = computed(() => {
    const kpi = this._realTimeKpi();
    if (!kpi || kpi.lastWeekSameDayRevenue === 0) return null;
    return ((kpi.todayRevenue - kpi.lastWeekSameDayRevenue) / kpi.lastWeekSameDayRevenue) * 100;
  });

  private readonly _period = signal<'daily' | 'weekly'>('daily');
  private readonly _activeTab = signal<SalesDashboardTab>('overview');
  private readonly _showGoalForm = signal(false);
  private readonly _goalType = signal<GoalPeriodType>('daily');
  private readonly _goalTarget = signal<number>(0);
  private readonly _goalStartDate = signal('');
  private readonly _goalEndDate = signal('');

  readonly period = this._period.asReadonly();
  readonly activeTab = this._activeTab.asReadonly();
  readonly showGoalForm = this._showGoalForm.asReadonly();
  readonly goalType = this._goalType.asReadonly();
  readonly goalTarget = this._goalTarget.asReadonly();
  readonly goalStartDate = this._goalStartDate.asReadonly();
  readonly goalEndDate = this._goalEndDate.asReadonly();

  readonly goalProgressPercent = computed(() => {
    const progress = this.activeGoalProgress();
    return progress ? Math.min(progress.progressPercent, 100) : 0;
  });

  readonly goalPaceLabel = computed(() => {
    const progress = this.activeGoalProgress();
    if (!progress) return '';
    switch (progress.paceStatus) {
      case 'ahead': return `Ahead by $${progress.paceAmount.toFixed(0)}`;
      case 'behind': return `Behind by $${progress.paceAmount.toFixed(0)}`;
      default: return 'On track';
    }
  });

  readonly goalPaceClass = computed(() => {
    const progress = this.activeGoalProgress();
    if (!progress) return '';
    switch (progress.paceStatus) {
      case 'ahead': return 'pace-ahead';
      case 'behind': return 'pace-behind';
      default: return 'pace-on-track';
    }
  });

  readonly topPerformer = computed(() => {
    const leaderboard = this.teamLeaderboard();
    return leaderboard.length > 0 ? leaderboard[0] : null;
  });

  readonly maxTeamRevenue = computed(() => {
    const leaderboard = this.teamLeaderboard();
    return leaderboard.length > 0 ? leaderboard[0].totalRevenue : 1;
  });

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.analyticsService.loadSalesReport(this._period());
      this.analyticsService.loadGoals();
      this.analyticsService.loadSalesAlerts();
      this.loadRealTimeKpis();
      // Refresh KPIs every 60 seconds
      this.kpiRefreshInterval = setInterval(() => this.loadRealTimeKpis(), 60000);
    }
  }

  ngOnDestroy(): void {
    destroyChart(this.teamChart);
    if (this.kpiRefreshInterval) {
      clearInterval(this.kpiRefreshInterval);
    }
  }

  async loadRealTimeKpis(): Promise<void> {
    this._isLoadingKpi.set(true);
    try {
      const kpi = await this.reportService.getRealTimeKpis();
      this._realTimeKpi.set(kpi);
    } finally {
      this._isLoadingKpi.set(false);
    }
  }

  getComparisonClass(value: number | null): string {
    if (value === null) return 'text-muted';
    if (value > 0) return 'text-success';
    if (value < 0) return 'text-danger';
    return 'text-muted';
  }

  getComparisonIcon(value: number | null): string {
    if (value === null) return '';
    if (value > 0) return '+';
    return '';
  }

  setTab(tab: SalesDashboardTab): void {
    this._activeTab.set(tab);

    if (tab === 'team' && !this.teamReport()) {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      this.analyticsService.loadTeamSalesReport(
        this.formatDate(weekAgo),
        this.formatDate(today)
      );
    }

    if (tab === 'funnel' && !this.conversionFunnel()) {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      this.analyticsService.loadConversionFunnel(
        this.formatDate(weekAgo),
        this.formatDate(today)
      );
    }
  }

  setPeriod(period: 'daily' | 'weekly'): void {
    this._period.set(period);
    this.analyticsService.loadSalesReport(period);
  }

  // === Goal Management ===

  openGoalForm(): void {
    const today = new Date();
    this._goalType.set('daily');
    this._goalTarget.set(0);
    this._goalStartDate.set(this.formatDate(today));
    this._goalEndDate.set(this.formatDate(today));
    this._showGoalForm.set(true);
  }

  cancelGoalForm(): void {
    this._showGoalForm.set(false);
  }

  setGoalType(type: GoalPeriodType): void {
    this._goalType.set(type);
  }

  setGoalTarget(value: number): void {
    this._goalTarget.set(value);
  }

  setGoalStartDate(value: string): void {
    this._goalStartDate.set(value);
  }

  setGoalEndDate(value: string): void {
    this._goalEndDate.set(value);
  }

  async saveGoal(): Promise<void> {
    const data: SalesGoalFormData = {
      type: this._goalType(),
      targetRevenue: this._goalTarget(),
      startDate: this._goalStartDate(),
      endDate: this._goalEndDate(),
    };

    const goal = await this.analyticsService.createGoal(data);
    if (goal) {
      this._showGoalForm.set(false);
    }
  }

  async deleteGoal(goalId: string): Promise<void> {
    await this.analyticsService.deleteGoal(goalId);
  }

  // === Team Performance ===

  getTeamBarWidth(revenue: number): number {
    const max = this.maxTeamRevenue();
    return max > 0 ? (revenue / max) * 100 : 0;
  }

  getRankBadge(index: number): string {
    switch (index) {
      case 0: return '1st';
      case 1: return '2nd';
      case 2: return '3rd';
      default: return `${index + 1}th`;
    }
  }

  getRankClass(index: number): string {
    if (index === 0) return 'rank-gold';
    if (index === 1) return 'rank-silver';
    if (index === 2) return 'rank-bronze';
    return 'rank-default';
  }

  // === Funnel ===

  getFunnelBarWidth(step: FunnelStep, steps: FunnelStep[]): number {
    const max = steps[0]?.count ?? 1;
    return max > 0 ? (step.count / max) * 100 : 0;
  }

  // === Alerts ===

  async acknowledgeAlert(alertId: string): Promise<void> {
    await this.analyticsService.acknowledgeSalesAlert(alertId);
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'revenue_anomaly': return 'bi-graph-down';
      case 'aov_anomaly': return 'bi-receipt';
      case 'volume_spike': return 'bi-graph-up-arrow';
      case 'volume_drop': return 'bi-graph-down-arrow';
      case 'new_customer_surge': return 'bi-people-fill';
      case 'channel_shift': return 'bi-shuffle';
      default: return 'bi-exclamation-circle';
    }
  }

  getAlertSeverityClass(severity: string): string {
    switch (severity) {
      case 'critical': return 'alert-critical';
      case 'warning': return 'alert-warning-level';
      default: return 'alert-info-level';
    }
  }

  // === Helpers ===

  formatHour(hour: number): string {
    if (hour === 0) return '12am';
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return '12pm';
    return `${hour - 12}pm`;
  }

  getChangeClass(change: number | undefined): string {
    if (change === undefined) return '';
    if (change > 0) return 'text-success';
    if (change < 0) return 'text-danger';
    return 'text-muted';
  }

  getChangeIcon(change: number | undefined): string {
    if (change === undefined) return '';
    if (change > 0) return '+';
    return '';
  }

  getInsightClass(type: string): string {
    switch (type) {
      case 'positive': return 'insight-positive';
      case 'negative': return 'insight-negative';
      default: return 'insight-neutral';
    }
  }

  retry(): void {
    this.analyticsService.loadSalesReport(this._period());
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
