import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { LegalPageLayoutComponent } from '../../shared/legal-page-layout.component';
import { SeoMetaService } from '../../services/seo-meta.service';
import { TERMS_OF_SERVICE } from '../../marketing.config';

@Component({
  selector: 'os-terms-page',
  standalone: true,
  imports: [LegalPageLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <os-legal-page-layout
      pageTitle="Terms of Service"
      [lastUpdated]="terms.lastUpdated"
      [sections]="terms.sections" />
  `,
})
export class TermsPageComponent implements OnInit {
  readonly terms = TERMS_OF_SERVICE;
  private readonly seo = inject(SeoMetaService);

  ngOnInit(): void {
    this.seo.apply('terms');
  }
}
