import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';

import { MarketingSectionComponent } from '../../shared/marketing-section.component';
import { MarketingHeroComponent } from '../../shared/marketing-hero.component';
import { SocialProofBarComponent } from '../../shared/social-proof-bar.component';
import { PainPointsComponent } from '../../shared/pain-points.component';
import { FeatureHighlightsComponent } from '../../shared/feature-highlights.component';
import { MetricStripComponent } from '../../shared/metric-strip.component';
import { HowItWorksComponent } from '../../shared/how-it-works.component';
import { TestimonialSectionComponent } from '../../shared/testimonial-section.component';
import { LogoCarouselComponent } from '../../shared/logo-carousel.component';
import { CaseStudyCardComponent } from '../../shared/case-study-card.component';
import { FinalCtaComponent } from '../../shared/final-cta.component';
import { SeoMetaService } from '../../services/seo-meta.service';
import { LANDING_HERO, CASE_STUDIES_HEADER, CASE_STUDIES } from '../../marketing.config';

@Component({
  selector: 'os-landing',
  standalone: true,
  imports: [
    MarketingSectionComponent,
    MarketingHeroComponent,
    SocialProofBarComponent,
    PainPointsComponent,
    FeatureHighlightsComponent,
    MetricStripComponent,
    HowItWorksComponent,
    TestimonialSectionComponent,
    LogoCarouselComponent,
    CaseStudyCardComponent,
    FinalCtaComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit {
  readonly hero = LANDING_HERO;
  readonly caseStudiesHeader = CASE_STUDIES_HEADER;
  readonly caseStudies = CASE_STUDIES;

  private readonly seo = inject(SeoMetaService);

  ngOnInit(): void {
    this.seo.apply('landing');
  }
}
