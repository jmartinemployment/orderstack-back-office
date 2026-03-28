import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { Integration, INTEGRATIONS_STATUS_LABELS } from '../marketing.config';

@Component({
  selector: 'os-integration-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-integration">
      <div class="mkt-integration__top">
        <img
          [src]="integration().logoUrl"
          [alt]="integration().name"
          class="mkt-integration__logo"
          loading="lazy" />
        <span
          class="mkt-integration__badge"
          [class.mkt-integration__badge--available]="integration().status === 'available'"
          [class.mkt-integration__badge--coming-soon]="integration().status === 'coming_soon'"
          [class.mkt-integration__badge--beta]="integration().status === 'beta'">
          {{ statusLabel() }}
        </span>
      </div>
      <h3 class="mkt-integration__name">{{ integration().name }}</h3>
      <p class="mkt-integration__desc">{{ integration().description }}</p>
      @if (integration().learnMoreUrl) {
        <a
          class="mkt-integration__link"
          [href]="integration().learnMoreUrl"
          target="_blank"
          rel="noopener">
          Learn More <i class="bi bi-arrow-right" aria-hidden="true"></i>
        </a>
      }
    </div>
  `,
  styles: [`
    .mkt-integration {
      background: var(--os-bg-card);
      border: 1px solid var(--os-border);
      border-radius: var(--os-radius-lg);
      padding: 24px;
      height: 100%;
      display: flex;
      flex-direction: column;
      transition: box-shadow 0.2s ease, transform 0.2s ease;

      &:hover {
        box-shadow: var(--os-shadow-lg);
        transform: translateY(-2px);
      }
    }

    .mkt-integration__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .mkt-integration__logo {
      height: 48px;
      width: auto;
      max-width: 120px;
      object-fit: contain;
    }

    .mkt-integration__badge {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 100px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      white-space: nowrap;

      &--available {
        background: #16a34a;
        color: #fff;
      }

      &--coming-soon {
        background: var(--os-bg-alt, #f5f5f5);
        color: var(--os-text-secondary);
        border: 1px dashed var(--os-border);
      }

      &--beta {
        background: #f59e0b;
        color: #fff;
      }
    }

    .mkt-integration__name {
      font-size: 1rem;
      font-weight: 700;
      color: var(--os-text-primary);
      margin: 0 0 8px;
    }

    .mkt-integration__desc {
      font-size: 0.875rem;
      color: var(--os-text-secondary);
      line-height: 1.5;
      margin: 0;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .mkt-integration__link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--os-primary);
      text-decoration: none;
      margin-top: 12px;

      &:hover {
        text-decoration: underline;
      }

      i {
        font-size: 0.75rem;
      }
    }
  `],
})
export class IntegrationCardComponent {
  readonly integration = input.required<Integration>();
  readonly statusLabel = computed(() => INTEGRATIONS_STATUS_LABELS[this.integration().status]);
}
