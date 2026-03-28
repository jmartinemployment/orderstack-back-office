import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { MarketingSectionComponent } from '../../shared/marketing-section.component';
import { MarketingHeroComponent } from '../../shared/marketing-hero.component';
import { DemoBusinessSelectorComponent } from '../../shared/demo-business-selector.component';
import { DemoFeatureTourComponent } from '../../shared/demo-feature-tour.component';
import { FinalCtaComponent } from '../../shared/final-cta.component';
import { SeoMetaService } from '../../services/seo-meta.service';
import { DEMO_HERO, DemoBusinessType } from '../../marketing.config';

@Component({
  selector: 'os-demo-page',
  standalone: true,
  imports: [
    MarketingSectionComponent,
    MarketingHeroComponent,
    DemoBusinessSelectorComponent,
    DemoFeatureTourComponent,
    FinalCtaComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './demo.component.html',
  styleUrl: './demo.component.scss',
})
export class DemoPageComponent implements OnInit {
  readonly hero = DEMO_HERO;
  readonly businessType = signal<DemoBusinessType>('restaurant');

  private readonly seo = inject(SeoMetaService);

  ngOnInit(): void {
    this.seo.apply('demo');
  }

  onBusinessTypeChange(type: DemoBusinessType): void {
    this.businessType.set(type);
  }
}
