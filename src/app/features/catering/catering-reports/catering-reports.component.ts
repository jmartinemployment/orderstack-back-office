import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CateringService } from '../../../services/catering.service';
import { CateringDeferredRevenueEntry, CateringPerformanceReport } from '../../../models/index';

@Component({
  selector: 'os-catering-reports',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './catering-reports.component.html',
  styleUrls: ['./catering-reports.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringReportsComponent implements OnInit {
  private readonly cateringService = inject(CateringService);

  readonly activeTab = signal<'deferred' | 'performance'>('deferred');
  readonly deferredEntries = signal<CateringDeferredRevenueEntry[]>([]);
  readonly performance = signal<CateringPerformanceReport | null>(null);
  readonly isLoading = signal(false);

  readonly revenueByTypeEntries = computed<[string, number][]>(() => {
    const perf = this.performance();
    if (!perf) return [];
    return Object.entries(perf.revenueByType);
  });

  readonly revenueByMonthEntries = computed<[string, number][]>(() => {
    const perf = this.performance();
    if (!perf) return [];
    return Object.entries(perf.revenueByMonth);
  });

  readonly deferredTotalCents = computed(() =>
    this.deferredEntries().reduce((acc, e) => acc + e.totalCents, 0)
  );

  readonly deferredPaidCents = computed(() =>
    this.deferredEntries().reduce((acc, e) => acc + e.paidCents, 0)
  );

  readonly deferredRecognizedCents = computed(() =>
    this.deferredEntries().reduce((acc, e) => acc + e.recognizedCents, 0)
  );

  readonly deferredDeferredCents = computed(() =>
    this.deferredEntries().reduce((acc, e) => acc + e.deferredCents, 0)
  );

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [deferred, perf] = await Promise.all([
        this.cateringService.loadDeferredRevenue(),
        this.cateringService.loadPerformanceReport(),
      ]);
      this.deferredEntries.set(deferred);
      this.performance.set(perf);
    } finally {
      this.isLoading.set(false);
    }
  }

  formatCents(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  setTab(tab: 'deferred' | 'performance'): void {
    this.activeTab.set(tab);
  }
}
