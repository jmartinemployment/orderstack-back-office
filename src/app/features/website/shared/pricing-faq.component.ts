import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { PRICING_FAQ_HEADER, PRICING_FAQS } from '../marketing.config';

@Component({
  selector: 'os-pricing-faq',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-faq">
      <div class="mkt-section-header text-center">
        <h2 class="mkt-section-title">{{ header.title }}</h2>
      </div>

      <div class="mkt-faq__list">
        @for (item of faqs; track item.id) {
          <div class="mkt-faq__item" [class.mkt-faq__item--open]="openId() === item.id">
            <button
              class="mkt-faq__question"
              (click)="toggle(item.id)"
              [attr.aria-expanded]="openId() === item.id">
              <span>{{ item.question }}</span>
              <i [class]="openId() === item.id ? 'bi bi-dash' : 'bi bi-plus'" aria-hidden="true"></i>
            </button>
            @if (openId() === item.id) {
              <div class="mkt-faq__answer">
                <p>{{ item.answer }}</p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .mkt-section-header {
      margin-bottom: 40px;
    }

    .mkt-section-title {
      font-size: 2rem;
      font-weight: 800;
      color: var(--os-text-primary);
      line-height: 1.2;

      @media (max-width: 767.98px) { font-size: 1.5rem; }
    }

    .mkt-faq__list {
      max-width: 720px;
      margin-inline: auto;
    }

    .mkt-faq__item {
      border-bottom: 1px solid var(--os-border);

      &:first-child {
        border-top: 1px solid var(--os-border);
      }
    }

    .mkt-faq__question {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 20px 0;
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
      font-size: 1rem;
      font-weight: 600;
      color: var(--os-text-primary);
      gap: 16px;

      i {
        font-size: 1.25rem;
        color: var(--os-text-muted);
        flex-shrink: 0;
      }

      &:hover { color: var(--os-primary); }
    }

    .mkt-faq__answer {
      padding-bottom: 20px;

      p {
        font-size: 0.9375rem;
        color: var(--os-text-secondary);
        line-height: 1.7;
        margin: 0;
      }
    }
  `],
})
export class PricingFaqComponent {
  readonly header = PRICING_FAQ_HEADER;
  readonly faqs = PRICING_FAQS;
  readonly openId = signal<string | null>(null);

  toggle(id: string): void {
    this.openId.update(current => current === id ? null : id);
  }
}
