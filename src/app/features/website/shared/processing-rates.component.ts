import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PROCESSING_RATES_HEADER, PROCESSING_RATES, PROCESSING_RATES_NOTE } from '../marketing.config';

@Component({
  selector: 'os-processing-rates',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-rates">
      <div class="mkt-section-header text-center">
        <h2 class="mkt-section-title">{{ header.title }}</h2>
        <p class="mkt-section-subtitle">{{ header.subtitle }}</p>
      </div>

      <div class="mkt-rates__grid">
        @for (rate of rates; track rate.type) {
          <div class="mkt-rates__card">
            <span class="mkt-rates__type">{{ rate.type }}</span>
            <span class="mkt-rates__value">{{ rate.rate }}</span>
            <span class="mkt-rates__desc">{{ rate.description }}</span>
          </div>
        }
      </div>

      <p class="mkt-rates__note text-center">{{ note }}</p>
    </div>
  `,
  styles: [`
    .mkt-section-header {
      margin-bottom: 40px;
    }

    .mkt-section-title {
      font-size: 2rem;
      font-weight: 800;
      color: var(--os-text-primary);
      margin-bottom: 12px;
      line-height: 1.2;

      @media (max-width: 767.98px) {
        font-size: 1.5rem;
      }
    }

    .mkt-section-subtitle {
      font-size: 1.0625rem;
      color: var(--os-text-secondary);
      max-width: 600px;
      margin-inline: auto;
      line-height: 1.6;
    }

    .mkt-rates__grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 24px;

      @media (max-width: 767.98px) {
        grid-template-columns: 1fr;
        max-width: 340px;
        margin-inline: auto;
      }
    }

    .mkt-rates__card {
      background: var(--os-bg-card);
      border: 1px solid var(--os-border);
      border-radius: var(--os-radius-lg);
      padding: 28px 24px;
      text-align: center;
    }

    .mkt-rates__type {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--os-text-muted);
      margin-bottom: 12px;
    }

    .mkt-rates__value {
      display: block;
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--os-text-primary);
      margin-bottom: 8px;
    }

    .mkt-rates__desc {
      font-size: 0.8125rem;
      color: var(--os-text-secondary);
    }

    .mkt-rates__note {
      font-size: 0.8125rem;
      color: var(--os-text-muted);
      margin-bottom: 0;
    }
  `],
})
export class ProcessingRatesComponent {
  readonly header = PROCESSING_RATES_HEADER;
  readonly rates = PROCESSING_RATES;
  readonly note = PROCESSING_RATES_NOTE;
}
