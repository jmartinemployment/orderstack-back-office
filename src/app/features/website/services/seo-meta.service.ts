import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { PageSeoConfig, SEO_CONFIGS } from '../marketing.config';

const SITE_NAME = 'OrderStack';
const BASE_URL = 'https://www.getorderstack.com';
const DEFAULT_OG_IMAGE = `${BASE_URL}/assets/og-default.png`;

@Injectable({ providedIn: 'root' })
export class SeoMetaService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  apply(pageKey: string): void {
    const config = SEO_CONFIGS[pageKey];
    if (!config) return;
    this.applyConfig(config);
  }

  private applyConfig(config: PageSeoConfig): void {
    const fullTitle =
      config.path === '/' ? config.title : `${config.title} | ${SITE_NAME}`;
    this.title.setTitle(fullTitle);

    this.meta.updateTag({ name: 'description', content: config.description });

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:type', content: config.ogType ?? 'website' });
    this.meta.updateTag({ property: 'og:url', content: `${BASE_URL}${config.path}` });
    this.meta.updateTag({
      property: 'og:image',
      content: config.ogImage ?? DEFAULT_OG_IMAGE,
    });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });

    // Canonical
    const canonical = config.canonical ?? `${BASE_URL}${config.path}`;
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);
  }
}
