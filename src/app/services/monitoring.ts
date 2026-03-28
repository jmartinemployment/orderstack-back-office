import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { AnalyticsService } from './analytics';
import { InventoryService } from './inventory';
import { OrderService } from './order';
import { AuthService } from './auth';
import {
  MonitoringAlert,
  MonitoringSnapshot,
  AnomalyRule,
  AlertSeverity,
  AlertCategory,
} from '../models/monitoring.model';

@Injectable({
  providedIn: 'root',
})
export class MonitoringService {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly inventoryService = inject(InventoryService);
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  private readonly _alerts = signal<MonitoringAlert[]>([]);
  private readonly _snapshots = signal<MonitoringSnapshot[]>([]);
  private readonly _isRunning = signal(false);
  private readonly _lastScanTime = signal<Date | null>(null);
  private readonly _scanCount = signal(0);
  private readonly _error = signal<string | null>(null);
  private readonly _baselineAov = signal<number | null>(null);

  private readonly _rules = signal<AnomalyRule[]>([
    { id: 'rev-drop', name: 'Revenue Drop', category: 'revenue', severity: 'critical', enabled: true, description: 'Alert when current revenue is 30%+ below average' },
    { id: 'low-stock', name: 'Low Stock', category: 'inventory', severity: 'warning', enabled: true, description: 'Alert when items fall below minimum stock level' },
    { id: 'out-stock', name: 'Out of Stock', category: 'inventory', severity: 'critical', enabled: true, description: 'Alert when items reach zero stock' },
    { id: 'overdue-order', name: 'Overdue Orders', category: 'kitchen', severity: 'warning', enabled: true, description: 'Alert when orders exceed estimated prep time by 50%' },
    { id: 'high-cancel', name: 'High Cancellations', category: 'orders', severity: 'warning', enabled: true, description: 'Alert when cancellation rate exceeds 10%' },
    { id: 'restock-urgent', name: 'Urgent Restock', category: 'inventory', severity: 'critical', enabled: true, description: 'Alert when predicted stock-out is within 3 days' },
    { id: 'avg-order-drop', name: 'Avg Order Value Drop', category: 'revenue', severity: 'info', enabled: true, description: 'Alert when average order value drops 20%+ below baseline' },
    { id: 'peak-surge', name: 'Peak Hour Surge', category: 'orders', severity: 'info', enabled: true, description: 'Notify when order volume exceeds 150% of hourly average' },
  ]);

  readonly alerts = this._alerts.asReadonly();
  readonly snapshots = this._snapshots.asReadonly();
  readonly isRunning = this._isRunning.asReadonly();
  readonly lastScanTime = this._lastScanTime.asReadonly();
  readonly scanCount = this._scanCount.asReadonly();
  readonly error = this._error.asReadonly();
  readonly rules = this._rules.asReadonly();

  readonly activeAlerts = computed(() =>
    this._alerts().filter(a => !a.acknowledged)
  );

  readonly criticalCount = computed(() =>
    this.activeAlerts().filter(a => a.severity === 'critical').length
  );

  readonly warningCount = computed(() =>
    this.activeAlerts().filter(a => a.severity === 'warning').length
  );

  readonly alertsByCategory = computed(() => {
    const map = new Map<AlertCategory, MonitoringAlert[]>();
    for (const alert of this.activeAlerts()) {
      const existing = map.get(alert.category) ?? [];
      existing.push(alert);
      map.set(alert.category, existing);
    }
    return map;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.stop());
  }

  start(intervalMs = 60_000): void {
    if (this._isRunning()) return;
    this._isRunning.set(true);
    this._error.set(null);

    this.runScan();
    this.pollInterval = setInterval(() => this.runScan(), intervalMs);
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this._isRunning.set(false);
  }

  toggleRule(ruleId: string): void {
    this._rules.update(rules =>
      rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r)
    );
  }

  acknowledgeAlert(alertId: string): void {
    this._alerts.update(alerts =>
      alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a)
    );
  }

  acknowledgeAll(): void {
    this._alerts.update(alerts =>
      alerts.map(a => ({ ...a, acknowledged: true }))
    );
  }

  clearAcknowledged(): void {
    this._alerts.update(alerts => alerts.filter(a => !a.acknowledged));
  }

  async runScan(): Promise<void> {
    const merchantId = this.authService.selectedMerchantId();
    if (!merchantId) return;

    try {
      const enabledRules = this._rules().filter(r => r.enabled);

      await Promise.allSettled([
        this.analyticsService.loadSalesReport('daily'),
        this.inventoryService.loadAlerts(),
        this.inventoryService.loadPredictions(),
        this.inventoryService.loadItems(),
      ]);

      const salesReport = this.analyticsService.salesReport();
      const invAlerts = this.inventoryService.alerts();
      const predictions = this.inventoryService.predictions();
      const invItems = this.inventoryService.items();

      const newAlerts: MonitoringAlert[] = [
        ...this.scanRevenueAnomalies(enabledRules, salesReport),
        ...this.scanInventoryAlerts(enabledRules, invAlerts),
        ...this.scanRestockPredictions(enabledRules, predictions),
      ];

      const snapshot = this.buildSnapshot(salesReport, newAlerts, invItems);

      const existingTitles = new Set(this._alerts().filter(a => !a.acknowledged).map(a => a.title));
      const uniqueNew = newAlerts.filter(a => !existingTitles.has(a.title));

      this._alerts.update(prev => [...uniqueNew, ...prev].slice(0, 200));
      this._snapshots.update(prev => [snapshot, ...prev].slice(0, 100));
      this._lastScanTime.set(new Date());
      this._scanCount.update(c => c + 1);
      this._error.set(null);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Scan failed');
    }
  }

  private scanRevenueAnomalies(enabledRules: AnomalyRule[], salesReport: any): MonitoringAlert[] {
    const alerts: MonitoringAlert[] = [];

    if (this.isRuleEnabled(enabledRules, 'rev-drop') && salesReport) {
      const revenue = salesReport.summary?.totalRevenue ?? 0;
      const revenueChange = salesReport.comparison?.revenueChange ?? 0;
      if (revenueChange < -30) {
        alerts.push(this.createAlert({
          category: 'revenue', severity: 'critical',
          title: 'Revenue Drop Detected',
          message: `Current revenue ($${revenue.toFixed(0)}) is ${Math.abs(Math.round(revenueChange))}% below comparison period`,
          suggestedAction: 'Review pricing, promotions, and staffing levels',
          metric: `$${revenue.toFixed(0)}`, currentValue: revenue, threshold: 0,
        }));
      }
    }

    if (this._baselineAov() === null && salesReport?.summary?.averageOrderValue) {
      this._baselineAov.set(salesReport.summary.averageOrderValue);
    }

    if (this.isRuleEnabled(enabledRules, 'avg-order-drop') && salesReport) {
      const avgOrder = salesReport.summary?.averageOrderValue ?? 0;
      const baseline = this._baselineAov();
      if (baseline !== null && avgOrder > 0 && avgOrder < baseline * 0.8) {
        alerts.push(this.createAlert({
          category: 'revenue', severity: 'info',
          title: 'Average Order Value Low',
          message: `Average order ($${avgOrder.toFixed(2)}) is below restaurant baseline ($${baseline.toFixed(2)})`,
          suggestedAction: 'Consider upselling prompts or combo deals',
          metric: `$${avgOrder.toFixed(2)}`, currentValue: avgOrder, threshold: baseline * 0.8,
        }));
      }
    }

    return alerts;
  }

  private scanInventoryAlerts(enabledRules: AnomalyRule[], invAlerts: any[]): MonitoringAlert[] {
    const alerts: MonitoringAlert[] = [];

    const stockAlertConfigs: Array<{ rule: string; type: string; severity: AlertSeverity; titlePrefix: string; defaultAction?: string }> = [
      { rule: 'low-stock',  type: 'low_stock',    severity: 'warning',  titlePrefix: 'Low Stock' },
      { rule: 'out-stock',  type: 'out_of_stock',  severity: 'critical', titlePrefix: 'Out of Stock', defaultAction: 'Reorder immediately' },
    ];

    for (const config of stockAlertConfigs) {
      if (!this.isRuleEnabled(enabledRules, config.rule)) continue;
      for (const alert of invAlerts.filter(a => a.type === config.type)) {
        alerts.push(this.createAlert({
          category: 'inventory',
          severity: config.severity,
          title: `${config.titlePrefix}: ${alert.itemName}`,
          message: alert.message,
          suggestedAction: alert.suggestedAction ?? config.defaultAction,
          metric: config.severity === 'critical' ? '0 units' : `${alert.currentStock} units`,
          currentValue: config.severity === 'critical' ? 0 : alert.currentStock,
          threshold: alert.threshold,
        }));
      }
    }

    return alerts;
  }

  private scanRestockPredictions(enabledRules: AnomalyRule[], predictions: any[]): MonitoringAlert[] {
    if (!this.isRuleEnabled(enabledRules, 'restock-urgent')) return [];
    return predictions
      .filter(p => p.daysUntilEmpty <= 3 && p.reorderRecommended)
      .map(pred => this.createAlert({
        category: 'inventory', severity: 'critical',
        title: `Urgent Restock: ${pred.itemName}`,
        message: `Predicted to run out in ${pred.daysUntilEmpty} day${pred.daysUntilEmpty === 1 ? '' : 's'} (${pred.currentStock} ${pred.unit} remaining)`,
        suggestedAction: `Order ${pred.reorderQuantity} ${pred.unit} now`,
        metric: `${pred.daysUntilEmpty}d remaining`, currentValue: pred.daysUntilEmpty, threshold: 3,
      }));
  }

  private buildSnapshot(salesReport: any, newAlerts: MonitoringAlert[], invItems: any[]): MonitoringSnapshot {
    return {
      timestamp: new Date(),
      revenue: salesReport?.summary?.totalRevenue ?? 0,
      orderCount: salesReport?.summary?.totalOrders ?? 0,
      avgOrderValue: salesReport?.summary?.averageOrderValue ?? 0,
      activeAlerts: newAlerts.filter(a => a.severity === 'critical' || a.severity === 'warning').length,
      criticalAlerts: newAlerts.filter(a => a.severity === 'critical').length,
      lowStockItems: invItems.filter(i => i.active && i.currentStock <= i.minStock).length,
      overdueOrders: 0,
    };
  }

  private isRuleEnabled(rules: AnomalyRule[], ruleId: string): boolean {
    return rules.some(r => r.id === ruleId);
  }

  private createAlert(opts: {
    category: AlertCategory;
    severity: AlertSeverity;
    title: string;
    message: string;
    suggestedAction?: string;
    metric?: string;
    currentValue?: number;
    threshold?: number;
  }): MonitoringAlert {
    return {
      id: crypto.randomUUID(),
      category: opts.category,
      severity: opts.severity,
      title: opts.title,
      message: opts.message,
      metric: opts.metric,
      currentValue: opts.currentValue,
      threshold: opts.threshold,
      suggestedAction: opts.suggestedAction,
      timestamp: new Date(),
      acknowledged: false,
    };
  }
}
