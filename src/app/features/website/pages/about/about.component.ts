import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketingSectionComponent } from '../../shared/marketing-section.component';
import { MarketingHeroComponent } from '../../shared/marketing-hero.component';
import { FinalCtaComponent } from '../../shared/final-cta.component';
import { SeoMetaService } from '../../services/seo-meta.service';
import {
  ABOUT_HERO,
  ABOUT_MISSION,
  ABOUT_VALUES,
  ABOUT_LOCAL,
} from '../../marketing.config';

@Component({
  selector: 'os-about-page',
  standalone: true,
  imports: [
    RouterLink,
    MarketingSectionComponent,
    MarketingHeroComponent,
    FinalCtaComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutPageComponent implements OnInit {
  readonly hero = ABOUT_HERO;
  readonly mission = ABOUT_MISSION;
  readonly values = ABOUT_VALUES;
  readonly local = ABOUT_LOCAL;

  private readonly seo = inject(SeoMetaService);

  ngOnInit(): void {
    this.seo.apply('about');
  }
}
