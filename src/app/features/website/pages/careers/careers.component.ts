import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { MarketingSectionComponent } from '../../shared/marketing-section.component';
import { MarketingHeroComponent } from '../../shared/marketing-hero.component';
import { FinalCtaComponent } from '../../shared/final-cta.component';
import { SeoMetaService } from '../../services/seo-meta.service';
import { CAREERS_HERO, CAREERS_EMPTY } from '../../marketing.config';

@Component({
  selector: 'os-careers-page',
  standalone: true,
  imports: [MarketingSectionComponent, MarketingHeroComponent, FinalCtaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <os-mkt-section background="hero">
      <os-mkt-hero
        [tag]="hero.tag"
        [title]="hero.title"
        [subtitle]="hero.subtitle"
        alignment="center" />
    </os-mkt-section>

    <os-mkt-section>
      <div class="mkt-careers-empty">
        <i class="bi bi-briefcase" aria-hidden="true"></i>
        <h2>{{ empty.title }}</h2>
        <p>{{ empty.description }}</p>
        <a [href]="'mailto:' + empty.email" class="mkt-careers-empty__link">
          <i class="bi bi-envelope" aria-hidden="true"></i>
          {{ empty.email }}
        </a>
      </div>
    </os-mkt-section>

    <os-final-cta />
  `,
  styles: `
    .mkt-careers-empty {
      text-align: center;
      max-width: 560px;
      margin: 3rem auto;
      padding: 2rem;
    }

    .mkt-careers-empty i.bi-briefcase {
      font-size: 3rem;
      color: var(--os-border);
      display: block;
      margin-bottom: 1.5rem;
    }

    .mkt-careers-empty h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--os-text);
      margin-bottom: 0.75rem;
    }

    .mkt-careers-empty p {
      font-size: 1.05rem;
      line-height: 1.7;
      color: var(--os-text-muted);
      margin-bottom: 1.5rem;
    }

    .mkt-careers-empty__link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.05rem;
      color: var(--os-primary);
      text-decoration: none;
      font-weight: 500;

      &:hover {
        text-decoration: underline;
      }
    }
  `,
})
export class CareersPageComponent implements OnInit {
  readonly hero = CAREERS_HERO;
  readonly empty = CAREERS_EMPTY;
  private readonly seo = inject(SeoMetaService);

  ngOnInit(): void {
    this.seo.apply('careers');
  }
}
