import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FOOTER_COLUMNS, FOOTER_SOCIAL, FOOTER_COPY, NAV_CTA } from '../marketing.config';

@Component({
  selector: 'os-marketing-footer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './marketing-footer.component.html',
  styleUrl: './marketing-footer.component.scss',
})
export class MarketingFooterComponent {
  readonly columns = FOOTER_COLUMNS;
  readonly social = FOOTER_SOCIAL;
  readonly copy = FOOTER_COPY;
  readonly cta = NAV_CTA;
}
