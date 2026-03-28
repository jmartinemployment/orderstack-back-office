import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TRUST_SIGNALS } from '../marketing.config';

@Component({
  selector: 'os-social-proof-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-trust-bar">
      <div class="container">
        <div class="mkt-trust-bar__inner">
          @for (signal of signals; track signal.label) {
            <div class="mkt-trust-bar__item">
              <i [class]="'bi ' + signal.icon" aria-hidden="true"></i>
              <span>{{ signal.label }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mkt-trust-bar {
      background: var(--os-bg);
      border-bottom: 1px solid var(--os-border);
      padding: 20px 0;
    }

    .mkt-trust-bar__inner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 40px;
      flex-wrap: wrap;

      @media (max-width: 767.98px) {
        gap: 24px;
        justify-content: center;
      }
    }

    .mkt-trust-bar__item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--os-text-secondary);
      white-space: nowrap;

      i {
        font-size: 1rem;
        color: var(--os-primary);
      }
    }
  `],
})
export class SocialProofBarComponent {
  readonly signals = TRUST_SIGNALS;
}
