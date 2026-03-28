import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FEATURES_HEADER, FEATURE_HIGHLIGHTS } from '../marketing.config';

@Component({
  selector: 'os-feature-highlights',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-features">
      <div class="mkt-section-header text-center">
        <span class="os-badge info">{{ header.tag }}</span>
        <h2 class="mkt-section-title">{{ header.title }}</h2>
        <p class="mkt-section-subtitle">{{ header.subtitle }}</p>
      </div>

      <div class="mkt-features__grid">
        @for (feature of features; track feature.id) {
          <div class="mkt-feature-card">
            <div class="mkt-feature-card__icon-wrap">
              <i [class]="'bi ' + feature.icon" aria-hidden="true"></i>
            </div>
            <h3 class="mkt-feature-card__title">{{ feature.title }}</h3>
            <p class="mkt-feature-card__desc">{{ feature.description }}</p>
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

    .mkt-features__grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;

      @media (max-width: 991.98px) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (max-width: 575.98px) {
        grid-template-columns: 1fr;
        max-width: 400px;
        margin-inline: auto;
      }
    }

    .mkt-feature-card {
      background: var(--os-bg-card);
      border: 1px solid var(--os-border);
      border-radius: var(--os-radius-lg);
      padding: 32px 24px;
      transition: box-shadow 0.2s ease, transform 0.2s ease;

      &:hover {
        box-shadow: var(--os-shadow-lg);
        transform: translateY(-2px);
      }
    }

    .mkt-feature-card__icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: var(--os-radius);
      background: var(--os-primary-light);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;

      i {
        font-size: 1.25rem;
        color: var(--os-primary);
      }
    }

    .mkt-feature-card__title {
      font-size: 1.0625rem;
      font-weight: 700;
      color: var(--os-text-primary);
      margin-bottom: 8px;
    }

    .mkt-feature-card__desc {
      font-size: 0.875rem;
      color: var(--os-text-secondary);
      line-height: 1.6;
      margin: 0;
    }
  `],
})
export class FeatureHighlightsComponent {
  readonly header = FEATURES_HEADER;
  readonly features = FEATURE_HIGHLIGHTS;
}
