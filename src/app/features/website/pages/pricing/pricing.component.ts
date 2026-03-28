import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  OnDestroy,
  Renderer2,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MarketingSectionComponent } from '../../shared/marketing-section.component';
import { MarketingHeroComponent } from '../../shared/marketing-hero.component';
import { PlanCardsComponent } from '../../shared/plan-cards.component';
import { ProcessingRatesComponent } from '../../shared/processing-rates.component';
import { CompetitorComparisonComponent } from '../../shared/competitor-comparison.component';
import { SavingsCalculatorComponent } from '../../shared/savings-calculator.component';
import { TestimonialSectionComponent } from '../../shared/testimonial-section.component';
import { PricingFaqComponent } from '../../shared/pricing-faq.component';
import { FinalCtaComponent } from '../../shared/final-cta.component';
import { SeoMetaService } from '../../services/seo-meta.service';
import { PRICING_HERO, PRICING_FAQS, PRICING_PLANS } from '../../marketing.config';

@Component({
  selector: 'os-pricing-page',
  standalone: true,
  imports: [
    MarketingSectionComponent,
    MarketingHeroComponent,
    PlanCardsComponent,
    ProcessingRatesComponent,
    CompetitorComparisonComponent,
    SavingsCalculatorComponent,
    TestimonialSectionComponent,
    PricingFaqComponent,
    FinalCtaComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss',
})
export class PricingPageComponent implements OnInit, OnDestroy {
  readonly hero = PRICING_HERO;

  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  private readonly seo = inject(SeoMetaService);
  private jsonLdElements: HTMLScriptElement[] = [];

  ngOnInit(): void {
    this.seo.apply('pricing');
    this.injectJsonLd(this.buildFaqSchema());
    this.injectJsonLd(this.buildProductSchema());
  }

  ngOnDestroy(): void {
    for (const el of this.jsonLdElements) {
      el.remove();
    }
    this.jsonLdElements = [];
  }

  private injectJsonLd(data: object): void {
    const script = this.renderer.createElement('script') as HTMLScriptElement;
    this.renderer.setAttribute(script, 'type', 'application/ld+json');
    script.textContent = JSON.stringify(data);
    this.renderer.appendChild(this.document.head, script);
    this.jsonLdElements.push(script);
  }

  private buildFaqSchema(): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: PRICING_FAQS.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };
  }

  private buildProductSchema(): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'OrderStack Restaurant OS',
      description:
        'All-in-one restaurant operating system with POS, online ordering, KDS, and delivery management.',
      brand: { '@type': 'Brand', name: 'OrderStack' },
      offers: PRICING_PLANS.map(plan => {
        const offer: Record<string, unknown> = {
          '@type': 'Offer',
          name: plan.name,
          price: String(plan.monthlyCents / 100),
          priceCurrency: 'USD',
          description: plan.description,
        };
        if (plan.monthlyCents > 0) {
          offer['priceSpecification'] = {
            '@type': 'UnitPriceSpecification',
            billingDuration: 'P1M',
          };
        }
        return offer;
      }),
    };
  }
}
