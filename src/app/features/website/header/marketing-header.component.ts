import { Component, ChangeDetectionStrategy, signal, afterNextRender } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAV_LINKS, NAV_CTA, NAV_LOGIN } from '../marketing.config';

@Component({
  selector: 'os-marketing-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './marketing-header.component.html',
  styleUrl: './marketing-header.component.scss',
})
export class MarketingHeaderComponent {
  readonly scrolled = signal(false);
  readonly mobileOpen = signal(false);

  readonly navLinks = NAV_LINKS;
  readonly cta = NAV_CTA;
  readonly login = NAV_LOGIN;

  constructor() {
    afterNextRender(() => {
      window.addEventListener('scroll', () => {
        this.scrolled.set(window.scrollY > 20);
      }, { passive: true });
    });
  }
}
