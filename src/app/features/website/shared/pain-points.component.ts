import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PAIN_POINTS_HEADER, PAIN_POINTS } from '../marketing.config';

@Component({
  selector: 'os-pain-points',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-pain-points">
      <div class="mkt-section-header text-center">
        <span class="os-badge warning">{{ header.tag }}</span>
        <h2 class="mkt-section-title">{{ header.title }}</h2>
        <p class="mkt-section-subtitle">{{ header.subtitle }}</p>
      </div>

      <div class="mkt-pain-points__grid">
        @for (point of painPoints; track point.id) {
          <div class="mkt-pain-card">
            <div class="mkt-pain-card__icon-wrap">
              <i [class]="'bi ' + point.icon" aria-hidden="true"></i>
            </div>
            <h3 class="mkt-pain-card__title">{{ point.title }}</h3>
            <p class="mkt-pain-card__desc">{{ point.description }}</p>
            <div class="mkt-pain-card__stat">
              <span class="mkt-pain-card__stat-value">{{ point.stat }}</span>
              <span class="mkt-pain-card__stat-label">{{ point.statLabel }}</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .mkt-section-header {
      margin-bottom: 48px;

      .os-badge {
        margin-bottom: 12px;
      }
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

    .mkt-pain-points__grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;

      @media (max-width: 991.98px) {
        grid-template-columns: 1fr;
        max-width: 520px;
        margin-inline: auto;
      }
    }

    .mkt-pain-card {
      background: var(--os-bg-card);
      border: 1px solid var(--os-border);
      border-radius: var(--os-radius-lg);
      padding: 32px 24px;
      text-align: center;
    }

    .mkt-pain-card__icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #fee2e2;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;

      i {
        font-size: 1.5rem;
        color: var(--os-danger);
      }
    }

    .mkt-pain-card__title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--os-text-primary);
      margin-bottom: 12px;
    }

    .mkt-pain-card__desc {
      font-size: 0.875rem;
      color: var(--os-text-secondary);
      line-height: 1.6;
      margin-bottom: 20px;
    }

    .mkt-pain-card__stat {
      padding-top: 16px;
      border-top: 1px solid var(--os-border);
    }

    .mkt-pain-card__stat-value {
      display: block;
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--os-danger);
    }

    .mkt-pain-card__stat-label {
      font-size: 0.75rem;
      color: var(--os-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
  `],
})
export class PainPointsComponent {
  readonly header = PAIN_POINTS_HEADER;
  readonly painPoints = PAIN_POINTS;
}
