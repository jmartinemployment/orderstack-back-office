import { Component, ChangeDetectionStrategy } from '@angular/core';
import { STATS } from '../marketing.config';

@Component({
  selector: 'os-stats-strip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-stats">
      <div class="container">
        <div class="mkt-stats__grid">
          @for (stat of stats; track stat.label) {
            <div class="mkt-stats__item">
              <span class="mkt-stats__value">{{ stat.value }}</span>
              <span class="mkt-stats__label">{{ stat.label }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mkt-stats {
      background: var(--os-text-primary);
      padding: 48px 0;
    }

    .mkt-stats__grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 32px;
      text-align: center;

      @media (max-width: 767.98px) {
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;
      }
    }

    .mkt-stats__value {
      display: block;
      font-size: 2.5rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1;
      margin-bottom: 8px;

      @media (max-width: 767.98px) {
        font-size: 2rem;
      }
    }

    .mkt-stats__label {
      font-size: 0.8125rem;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
  `],
})
export class StatsStripComponent {
  readonly stats = STATS;
}
