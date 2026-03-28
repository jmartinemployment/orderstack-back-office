import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HOW_IT_WORKS_HEADER, HOW_IT_WORKS_STEPS } from '../marketing.config';

@Component({
  selector: 'os-how-it-works',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-how">
      <div class="mkt-section-header text-center">
        <span class="os-badge info">{{ header.tag }}</span>
        <h2 class="mkt-section-title">{{ header.title }}</h2>
      </div>

      <div class="mkt-how__steps">
        @for (step of steps; track step.step; let last = $last) {
          <div class="mkt-how__step">
            <div class="mkt-how__number">{{ step.step }}</div>
            <div class="mkt-how__icon-wrap">
              <i [class]="'bi ' + step.icon" aria-hidden="true"></i>
            </div>
            <h3 class="mkt-how__step-title">{{ step.title }}</h3>
            <p class="mkt-how__step-desc">{{ step.description }}</p>
          </div>
          @if (!last) {
            <div class="mkt-how__connector" aria-hidden="true">
              <i class="bi bi-arrow-right"></i>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .mkt-section-header {
      margin-bottom: 48px;

      .os-badge { margin-bottom: 12px; }
    }

    .mkt-section-title {
      font-size: 2rem;
      font-weight: 800;
      color: var(--os-text-primary);
      line-height: 1.2;

      @media (max-width: 767.98px) {
        font-size: 1.5rem;
      }
    }

    .mkt-how__steps {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 16px;

      @media (max-width: 767.98px) {
        flex-direction: column;
        align-items: center;
        gap: 32px;
      }
    }

    .mkt-how__step {
      flex: 1;
      max-width: 280px;
      text-align: center;
    }

    .mkt-how__number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--os-primary);
      color: #ffffff;
      font-size: 0.875rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }

    .mkt-how__icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--os-primary-light);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;

      i {
        font-size: 1.5rem;
        color: var(--os-primary);
      }
    }

    .mkt-how__step-title {
      font-size: 1.0625rem;
      font-weight: 700;
      color: var(--os-text-primary);
      margin-bottom: 8px;
    }

    .mkt-how__step-desc {
      font-size: 0.875rem;
      color: var(--os-text-secondary);
      line-height: 1.6;
      margin: 0;
    }

    .mkt-how__connector {
      display: flex;
      align-items: center;
      padding-top: 60px;

      i {
        font-size: 1.25rem;
        color: var(--os-text-muted);
      }

      @media (max-width: 767.98px) {
        padding-top: 0;
        transform: rotate(90deg);
      }
    }
  `],
})
export class HowItWorksComponent {
  readonly header = HOW_IT_WORKS_HEADER;
  readonly steps = HOW_IT_WORKS_STEPS;
}
