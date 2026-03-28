import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'os-mkt-hero',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-hero" [class.mkt-hero--center]="alignment() === 'center'">
      @if (tag()) {
        <span class="os-badge info mkt-hero__tag">{{ tag() }}</span>
      }
      <h1 class="mkt-hero__title">{{ title() }}</h1>
      @if (subtitle()) {
        <p class="mkt-hero__subtitle">{{ subtitle() }}</p>
      }
      <div class="mkt-hero__actions">
        @if (primaryCta()) {
          <a class="btn btn-os-primary btn-lg" [routerLink]="primaryCta()!.route">
            {{ primaryCta()!.label }}
          </a>
        }
        @if (secondaryCta()) {
          <a class="btn btn-os-secondary btn-lg" [routerLink]="secondaryCta()!.route">
            {{ secondaryCta()!.label }}
          </a>
        }
      </div>
    </div>
  `,
  styles: [`
    .mkt-hero {
      max-width: 720px;
    }

    .mkt-hero--center {
      text-align: center;
      margin-inline: auto;
    }

    .mkt-hero__tag {
      margin-bottom: 16px;
    }

    .mkt-hero__title {
      font-size: 2.75rem;
      font-weight: 800;
      line-height: 1.15;
      color: var(--os-text-primary);
      margin-bottom: 20px;

      @media (max-width: 767.98px) {
        font-size: 1.875rem;
      }
    }

    .mkt-hero__subtitle {
      font-size: 1.125rem;
      line-height: 1.7;
      color: var(--os-text-secondary);
      margin-bottom: 32px;

      @media (max-width: 767.98px) {
        font-size: 1rem;
      }
    }

    .mkt-hero__actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .mkt-hero--center .mkt-hero__actions {
      justify-content: center;
    }

    .btn-lg {
      padding: 14px 28px;
      font-size: 1rem;
      font-weight: 600;
      border-radius: var(--os-radius);
    }
  `],
})
export class MarketingHeroComponent {
  readonly tag = input<string | null>(null);
  readonly title = input('');
  readonly subtitle = input<string | null>(null);
  readonly alignment = input<'left' | 'center'>('center');
  readonly primaryCta = input<{ label: string; route: string } | null>(null);
  readonly secondaryCta = input<{ label: string; route: string } | null>(null);
}
