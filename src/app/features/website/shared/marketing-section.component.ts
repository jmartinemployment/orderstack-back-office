import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'os-mkt-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="mkt-section"
      [class.mkt-section--alt]="background() === 'alt'"
      [class.mkt-section--dark]="background() === 'dark'"
      [class.mkt-section--hero]="background() === 'hero'"
      [attr.id]="sectionId()">
      <div class="container">
        <ng-content />
      </div>
    </section>
  `,
  styles: [`
    .mkt-section {
      padding: 80px 0;

      @media (max-width: 767.98px) {
        padding: 48px 0;
      }
    }

    .mkt-section--alt {
      background: var(--os-bg);
    }

    .mkt-section--dark {
      background: var(--os-text-primary);
      color: #ffffff;
    }

    .mkt-section--hero {
      background: linear-gradient(135deg, var(--os-primary-light) 0%, var(--os-bg) 100%);
      padding: 100px 0 80px;

      @media (max-width: 767.98px) {
        padding: 64px 0 48px;
      }
    }
  `],
})
export class MarketingSectionComponent {
  readonly background = input<'default' | 'alt' | 'dark' | 'hero'>('default');
  readonly sectionId = input<string | null>(null);
}
