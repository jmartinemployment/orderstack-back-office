import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { MarketingSectionComponent } from './marketing-section.component';
import { MarketingHeroComponent } from './marketing-hero.component';
import { FinalCtaComponent } from './final-cta.component';
import { LegalSection } from '../marketing.config';

@Component({
  selector: 'os-legal-page-layout',
  standalone: true,
  imports: [MarketingSectionComponent, MarketingHeroComponent, FinalCtaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <os-mkt-section background="hero">
      <os-mkt-hero
        [title]="pageTitle()"
        [subtitle]="'Last updated: ' + lastUpdated()"
        alignment="center" />
    </os-mkt-section>

    <os-mkt-section>
      <div class="mkt-legal">
        @for (section of sections(); track section.heading) {
          <div class="mkt-legal__section">
            <h2 class="mkt-legal__heading">{{ section.heading }}</h2>
            @for (p of section.paragraphs; track $index) {
              <p class="mkt-legal__paragraph">{{ p }}</p>
            }
          </div>
        }
      </div>
    </os-mkt-section>

    <os-final-cta />
  `,
  styles: `
    .mkt-legal {
      max-width: 780px;
      margin: 0 auto;
      padding: 2rem 0;
    }

    .mkt-legal__section {
      margin-bottom: 2.5rem;
    }

    .mkt-legal__heading {
      font-size: 1.35rem;
      font-weight: 600;
      color: var(--os-text);
      margin-bottom: 0.75rem;
    }

    .mkt-legal__paragraph {
      font-size: 1rem;
      line-height: 1.75;
      color: var(--os-text-muted);
      margin-bottom: 0.75rem;
    }
  `,
})
export class LegalPageLayoutComponent {
  readonly pageTitle = input.required<string>();
  readonly lastUpdated = input.required<string>();
  readonly sections = input.required<LegalSection[]>();
}
