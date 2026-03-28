import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { Testimonial } from '../marketing.config';

@Component({
  selector: 'os-testimonial-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-testimonial">
      <div class="mkt-testimonial__quote">{{ testimonial().quote }}</div>
      <div class="mkt-testimonial__stars">
        @for (star of stars(); track $index) {
          <i class="bi bi-star-fill" aria-hidden="true"></i>
        }
      </div>
      <div class="mkt-testimonial__author">
        <div class="mkt-testimonial__avatar" [attr.aria-label]="testimonial().authorName">
          @if (testimonial().authorPhoto) {
            <img [src]="testimonial().authorPhoto" [alt]="testimonial().authorName" />
          } @else {
            <span class="mkt-testimonial__initials">{{ initial() }}</span>
          }
        </div>
        <div class="mkt-testimonial__info">
          <span class="mkt-testimonial__name">{{ testimonial().authorName }}</span>
          <span class="mkt-testimonial__restaurant">{{ testimonial().restaurantName }}</span>
          <span class="mkt-testimonial__location">{{ testimonial().location }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mkt-testimonial {
      background: var(--os-bg-card);
      border: 1px solid var(--os-border);
      border-radius: var(--os-radius-lg);
      padding: 28px 24px;
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: box-shadow 0.2s ease, transform 0.2s ease;

      &::before {
        content: '\u201C';
        position: absolute;
        top: 12px;
        left: 16px;
        font-size: 4rem;
        line-height: 1;
        color: var(--os-primary-light);
        font-family: Georgia, serif;
        pointer-events: none;
      }

      &:hover {
        box-shadow: var(--os-shadow-lg);
        transform: translateY(-2px);
      }
    }

    .mkt-testimonial__quote {
      font-size: 0.9375rem;
      line-height: 1.65;
      color: var(--os-text-primary);
      font-style: italic;
      flex: 1;
      margin-bottom: 16px;
      padding-top: 24px;
    }

    .mkt-testimonial__stars {
      display: flex;
      gap: 2px;
      margin-bottom: 16px;

      i {
        color: #f59e0b;
        font-size: 0.875rem;
      }
    }

    .mkt-testimonial__author {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .mkt-testimonial__avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      background: var(--os-primary);
      display: flex;
      align-items: center;
      justify-content: center;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .mkt-testimonial__initials {
      color: #fff;
      font-size: 1.125rem;
      font-weight: 700;
    }

    .mkt-testimonial__info {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .mkt-testimonial__name {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--os-text-primary);
    }

    .mkt-testimonial__restaurant {
      font-size: 0.8125rem;
      color: var(--os-text-secondary);
    }

    .mkt-testimonial__location {
      font-size: 0.75rem;
      color: var(--os-text-secondary);
      opacity: 0.7;
    }
  `],
})
export class TestimonialCardComponent {
  readonly testimonial = input.required<Testimonial>();

  readonly stars = computed(() => Array.from({ length: this.testimonial().rating }));
  readonly initial = computed(() => this.testimonial().authorName.at(0) ?? '');
}
