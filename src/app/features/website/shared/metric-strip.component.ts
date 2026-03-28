import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AnimatedMetricComponent } from './animated-metric.component';
import { METRIC_HIGHLIGHTS } from '../marketing.config';

@Component({
  selector: 'os-metric-strip',
  standalone: true,
  imports: [AnimatedMetricComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-metrics">
      <div class="container">
        <div class="mkt-metrics__grid">
          @for (metric of metrics; track metric.id) {
            <os-animated-metric [metric]="metric" />
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mkt-metrics {
      background: var(--os-text-primary);
      padding: 48px 0;
    }

    .mkt-metrics__grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 32px;

      @media (max-width: 767.98px) {
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;
      }
    }
  `],
})
export class MetricStripComponent {
  readonly metrics = METRIC_HIGHLIGHTS;
}
