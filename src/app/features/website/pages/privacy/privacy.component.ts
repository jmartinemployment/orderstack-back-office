import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { LegalPageLayoutComponent } from '../../shared/legal-page-layout.component';
import { SeoMetaService } from '../../services/seo-meta.service';
import { PRIVACY_POLICY } from '../../marketing.config';

@Component({
  selector: 'os-privacy-page',
  standalone: true,
  imports: [LegalPageLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <os-legal-page-layout
      pageTitle="Privacy Policy"
      [lastUpdated]="policy.lastUpdated"
      [sections]="policy.sections" />
  `,
})
export class PrivacyPageComponent implements OnInit {
  readonly policy = PRIVACY_POLICY;
  private readonly seo = inject(SeoMetaService);

  ngOnInit(): void {
    this.seo.apply('privacy');
  }
}
