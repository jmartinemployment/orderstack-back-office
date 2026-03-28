import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CurrencyPipe, PercentPipe } from '@angular/common';
import { Router } from '@angular/router';
import { CateringService } from '../../../services/catering.service';
import { CateringPerformanceReport } from '../../../models/catering.model';

@Component({
  selector: 'os-catering-revenue-report',
  standalone: true,
  imports: [CurrencyPipe, PercentPipe],
  templateUrl: './catering-revenue-report.component.html',
  styleUrl: './catering-revenue-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
})
export class CateringRevenueReportComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly cateringService = inject(CateringService);

  readonly _report = signal<CateringPerformanceReport | null>(null);
  readonly _loading = signal(false);
  readonly _error = signal<string | null>(null);

  readonly revenueByTypeEntries = computed(() => {
    const report = this._report();
    if (!report) return [];
    return Object.entries(report.revenueByType)
      .sort(([, a], [, b]) => b - a);
  });

  readonly revenueByTypeMax = computed(() => {
    const entries = this.revenueByTypeEntries();
    return entries.length > 0 ? entries[0][1] : 1;
  });

  readonly revenueByMonthEntries = computed(() => {
    const report = this._report();
    if (!report) return [];
    return Object.entries(report.revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b));
  });

  readonly revenueByMonthMax = computed(() => {
    const entries = this.revenueByMonthEntries();
    if (entries.length === 0) return 1;
    return Math.max(...entries.map(([, v]) => v));
  });

  readonly outstanding = computed(() =>
    this.cateringService.outstandingBalance()
  );

  ngOnInit(): void {
    this.loadReport();
  }

  private async loadReport(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const report = await this.cateringService.loadPerformanceReport();
      this._report.set(report);
    } catch {
      this._error.set('Failed to load revenue report');
    } finally {
      this._loading.set(false);
    }
  }

  barWidth(value: number, max: number): string {
    if (max === 0) return '0%';
    return `${Math.round((value / max) * 100)}%`;
  }

  viewFullReport(): void {
    this.router.navigate(['/app/catering/reports']);
  }

  dismissError(): void {
    this._error.set(null);
  }
}
