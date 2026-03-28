import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PARTNER_LOGOS } from '../marketing.config';

@Component({
  selector: 'os-logo-carousel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-logos">
      <div class="container">
        <div class="mkt-logos__track">
          <div class="mkt-logos__scroll">
            @for (logo of logos; track logo.name) {
              <img [src]="logo.imageUrl" [alt]="logo.name" class="mkt-logos__img" loading="lazy" />
            }
            @for (logo of logos; track logo.name + '-dup') {
              <img [src]="logo.imageUrl" [alt]="logo.name" class="mkt-logos__img" loading="lazy" />
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mkt-logos {
      padding: 40px 0;
      background: var(--os-bg-card);
      border-top: 1px solid var(--os-border);
      border-bottom: 1px solid var(--os-border);
      overflow: hidden;
    }

    .mkt-logos__track {
      overflow: hidden;
      mask-image: linear-gradient(
        to right,
        transparent,
        black 10%,
        black 90%,
        transparent
      );
      -webkit-mask-image: linear-gradient(
        to right,
        transparent,
        black 10%,
        black 90%,
        transparent
      );
    }

    .mkt-logos__scroll {
      display: flex;
      align-items: center;
      gap: 48px;
      width: max-content;
      animation: logoScroll 24s linear infinite;

      &:hover {
        animation-play-state: paused;
      }
    }

    .mkt-logos__img {
      height: 32px;
      width: auto;
      flex-shrink: 0;
      filter: grayscale(100%) opacity(0.5);
      transition: filter 0.2s ease, opacity 0.2s ease;

      &:hover {
        filter: none;
        opacity: 1;
      }
    }

    @keyframes logoScroll {
      0% {
        transform: translateX(0);
      }
      100% {
        transform: translateX(-50%);
      }
    }
  `],
})
export class LogoCarouselComponent {
  readonly logos = PARTNER_LOGOS;
}
