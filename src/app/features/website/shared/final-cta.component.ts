import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FINAL_CTA } from '../marketing.config';

@Component({
  selector: 'os-final-cta',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-final-cta">
      <div class="container text-center">
        <h2 class="mkt-final-cta__title">{{ cta.title }}</h2>
        <p class="mkt-final-cta__subtitle">{{ cta.subtitle }}</p>
        <div class="mkt-final-cta__actions">
          <a class="btn btn-os-primary btn-lg" [routerLink]="cta.primaryCta.route">
            {{ cta.primaryCta.label }}
          </a>
          <a class="btn mkt-final-cta__secondary btn-lg" [routerLink]="cta.secondaryCta.route">
            {{ cta.secondaryCta.label }}
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mkt-final-cta {
      background: var(--os-text-primary);
      padding: 80px 0;

      @media (max-width: 767.98px) {
        padding: 48px 0;
      }
    }

    .mkt-final-cta__title {
      font-size: 2rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 16px;
      line-height: 1.2;

      @media (max-width: 767.98px) {
        font-size: 1.5rem;
      }
    }

    .mkt-final-cta__subtitle {
      font-size: 1.0625rem;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 32px;
      line-height: 1.6;
    }

    .mkt-final-cta__actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .mkt-final-cta__secondary {
      background: transparent;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: var(--os-radius);
      padding: 14px 28px;
      font-size: 1rem;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.15s ease, border-color 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.5);
        color: #ffffff;
      }
    }

    .btn-lg {
      padding: 14px 28px;
      font-size: 1rem;
      font-weight: 600;
      border-radius: var(--os-radius);
    }
  `],
})
export class FinalCtaComponent {
  readonly cta = FINAL_CTA;
}
