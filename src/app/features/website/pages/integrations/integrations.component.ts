import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { MarketingSectionComponent } from '../../shared/marketing-section.component';
import { MarketingHeroComponent } from '../../shared/marketing-hero.component';
import { IntegrationCardComponent } from '../../shared/integration-card.component';
import { FinalCtaComponent } from '../../shared/final-cta.component';
import { SeoMetaService } from '../../services/seo-meta.service';
import {
  IntegrationCategory,
  INTEGRATIONS_HERO,
  INTEGRATION_CATEGORIES,
  INTEGRATIONS,
  INTEGRATIONS_CLOUDPRNT_FEATURE,
  INTEGRATIONS_API_SECTION,
} from '../../marketing.config';

const STATUS_ORDER: Record<string, number> = {
  available: 0,
  beta: 1,
  coming_soon: 2,
};

@Component({
  selector: 'os-integrations-page',
  standalone: true,
  imports: [
    MarketingSectionComponent,
    MarketingHeroComponent,
    IntegrationCardComponent,
    FinalCtaComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './integrations.component.html',
  styleUrl: './integrations.component.scss',
})
export class IntegrationsPageComponent implements OnInit {
  readonly hero = INTEGRATIONS_HERO;
  readonly categories = INTEGRATION_CATEGORIES;
  readonly cloudPrnt = INTEGRATIONS_CLOUDPRNT_FEATURE;
  readonly apiSection = INTEGRATIONS_API_SECTION;

  readonly activeCategory = signal<IntegrationCategory>('all');
  readonly searchQuery = signal('');

  private readonly seo = inject(SeoMetaService);

  readonly filteredIntegrations = computed(() => {
    const cat = this.activeCategory();
    const query = this.searchQuery().toLowerCase().trim();

    let results = [...INTEGRATIONS];

    if (cat !== 'all') {
      results = results.filter(i => i.category === cat);
    }

    if (query) {
      results = results.filter(
        i =>
          i.name.toLowerCase().includes(query) ||
          i.description.toLowerCase().includes(query),
      );
    }

    results.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));

    return results;
  });

  ngOnInit(): void {
    this.seo.apply('integrations');
  }

  setCategory(cat: IntegrationCategory): void {
    this.activeCategory.set(cat);
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }
}
