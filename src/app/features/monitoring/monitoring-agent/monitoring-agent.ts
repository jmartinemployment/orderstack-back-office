import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MonitoringService } from '../../../services/monitoring';
import { AuthService } from '../../../services/auth';
import { MonitoringTab, AlertCategory, AlertSeverity } from '../../../models/monitoring.model';

@Component({
  selector: 'os-monitoring-agent',
  imports: [DatePipe],
  templateUrl: './monitoring-agent.html',
  styleUrl: './monitoring-agent.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitoringAgent implements OnInit {
  private readonly monitoringService = inject(MonitoringService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly isRunning = this.monitoringService.isRunning;
  readonly alerts = this.monitoringService.alerts;
  readonly activeAlerts = this.monitoringService.activeAlerts;
  readonly criticalCount = this.monitoringService.criticalCount;
  readonly warningCount = this.monitoringService.warningCount;
  readonly snapshots = this.monitoringService.snapshots;
  readonly lastScanTime = this.monitoringService.lastScanTime;
  readonly scanCount = this.monitoringService.scanCount;
  readonly rules = this.monitoringService.rules;
  readonly error = this.monitoringService.error;

  private readonly _activeTab = signal<MonitoringTab>('live');
  private readonly _severityFilter = signal<AlertSeverity | 'all'>('all');
  private readonly _categoryFilter = signal<AlertCategory | 'all'>('all');

  readonly activeTab = this._activeTab.asReadonly();
  readonly severityFilter = this._severityFilter.asReadonly();
  readonly categoryFilter = this._categoryFilter.asReadonly();

  readonly latestSnapshot = computed(() => this.snapshots()[0] ?? null);

  readonly filteredAlerts = computed(() => {
    let list = this.activeAlerts();
    const sev = this._severityFilter();
    const cat = this._categoryFilter();
    if (sev !== 'all') {
      list = list.filter(a => a.severity === sev);
    }
    if (cat !== 'all') {
      list = list.filter(a => a.category === cat);
    }
    return list;
  });

  readonly acknowledgedCount = computed(() =>
    this.alerts().filter(a => a.acknowledged).length
  );

  readonly uptimeText = computed(() => {
    const count = this.scanCount();
    if (count === 0) return 'Not started';
    return `${count} scan${count === 1 ? '' : 's'} completed`;
  });

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.monitoringService.start(60_000);
    }
  }

  setTab(tab: MonitoringTab): void {
    this._activeTab.set(tab);
  }

  setSeverityFilter(severity: AlertSeverity | 'all'): void {
    this._severityFilter.set(severity);
  }

  setCategoryFilter(category: AlertCategory | 'all'): void {
    this._categoryFilter.set(category);
  }

  toggleAgent(): void {
    if (this.isRunning()) {
      this.monitoringService.stop();
    } else {
      this.monitoringService.start(60_000);
    }
  }

  runManualScan(): void {
    this.monitoringService.runScan();
  }

  acknowledgeAlert(alertId: string): void {
    this.monitoringService.acknowledgeAlert(alertId);
  }

  acknowledgeAll(): void {
    this.monitoringService.acknowledgeAll();
  }

  clearAcknowledged(): void {
    this.monitoringService.clearAcknowledged();
  }

  toggleRule(ruleId: string): void {
    this.monitoringService.toggleRule(ruleId);
  }

  getSeverityClass(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical': return 'severity-critical';
      case 'warning': return 'severity-warning';
      case 'info': return 'severity-info';
    }
  }

  getCategoryIcon(category: AlertCategory): string {
    switch (category) {
      case 'revenue': return '$';
      case 'inventory': return '&#9881;';
      case 'kitchen': return '&#127860;';
      case 'orders': return '&#128230;';
      case 'system': return '&#9881;';
    }
  }

  getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }
}
