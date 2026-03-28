import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { CateringService } from '../../../services/catering.service';
import { CateringDeferredRevenueEntry } from '../../../models/catering.model';

@Component({
  selector: 'os-catering-deferred-report',
  standalone: true,
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './catering-deferred-report.component.html',
  styleUrl: './catering-deferred-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
})
export class CateringDeferredReportComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly cateringService = inject(CateringService);

  readonly _entries = signal<CateringDeferredRevenueEntry[]>([]);
  readonly _loading = signal(false);

  readonly totalBooked = computed(() =>
    this._entries().reduce((sum, e) => sum + e.totalCents, 0)
  );

  readonly totalCollected = computed(() =>
    this._entries().reduce((sum, e) => sum + e.paidCents, 0)
  );

  readonly totalRecognized = computed(() =>
    this._entries().reduce((sum, e) => sum + e.recognizedCents, 0)
  );

  readonly totalDeferred = computed(() =>
    this._entries().reduce((sum, e) => sum + e.deferredCents, 0)
  );

  ngOnInit(): void {
    this.loadData();
  }

  private async loadData(): Promise<void> {
    this._loading.set(true);
    try {
      const entries = await this.cateringService.loadDeferredRevenue();
      this._entries.set(entries);
    } finally {
      this._loading.set(false);
    }
  }

  viewJob(jobId: string): void {
    this.router.navigate(['/app/catering/job', jobId]);
  }
}
