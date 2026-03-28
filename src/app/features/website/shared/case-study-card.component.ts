import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CaseStudyPreview } from '../marketing.config';

@Component({
  selector: 'os-case-study-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-case-study">
      <div class="mkt-case-study__image">
        @if (caseStudy().imageUrl) {
          <img [src]="caseStudy().imageUrl" [alt]="caseStudy().restaurantName" />
        } @else {
          <div class="mkt-case-study__placeholder">
            <i class="bi bi-building" aria-hidden="true"></i>
          </div>
        }
        <span class="mkt-case-study__type">{{ caseStudy().businessType }}</span>
      </div>
      <div class="mkt-case-study__body">
        <h3 class="mkt-case-study__name">{{ caseStudy().restaurantName }}</h3>
        <span class="mkt-case-study__location">{{ caseStudy().location }}</span>
        <p class="mkt-case-study__headline">{{ caseStudy().headline }}</p>
        <div class="mkt-case-study__metrics">
          @for (m of caseStudy().metrics; track m.label) {
            <span class="mkt-case-study__metric">
              <strong>{{ m.value }}</strong> {{ m.label }}
            </span>
          }
        </div>
        <span class="mkt-case-study__link">Read Case Study <i class="bi bi-arrow-right" aria-hidden="true"></i></span>
      </div>
    </div>
  `,
  styles: [`
    .mkt-case-study {
      background: var(--os-bg-card);
      border: 1px solid var(--os-border);
      border-radius: var(--os-radius-lg);
      overflow: hidden;
      height: 100%;
      display: flex;
      flex-direction: column;
      transition: box-shadow 0.2s ease, transform 0.2s ease;

      &:hover {
        box-shadow: var(--os-shadow-lg);
        transform: translateY(-2px);
      }
    }

    .mkt-case-study__image {
      position: relative;
      height: 160px;
      background: linear-gradient(135deg, #2d5a87, #1a3a5c);
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .mkt-case-study__placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;

      i {
        font-size: 2.5rem;
        color: rgba(255, 255, 255, 0.25);
      }
    }

    .mkt-case-study__type {
      position: absolute;
      top: 12px;
      left: 12px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 100px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .mkt-case-study__body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }

    .mkt-case-study__name {
      font-size: 1rem;
      font-weight: 700;
      color: var(--os-text-primary);
      margin: 0;
    }

    .mkt-case-study__location {
      font-size: 0.8125rem;
      color: var(--os-text-secondary);
    }

    .mkt-case-study__headline {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--os-text-primary);
      margin: 4px 0 8px;
      line-height: 1.4;
    }

    .mkt-case-study__metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }

    .mkt-case-study__metric {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: var(--os-primary-light);
      border-radius: 100px;
      font-size: 0.75rem;
      color: var(--os-text-secondary);

      strong {
        color: var(--os-primary);
        font-weight: 700;
      }
    }

    .mkt-case-study__link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--os-text-secondary);
      opacity: 0.5;
      cursor: default;
      margin-top: auto;

      i {
        font-size: 0.75rem;
      }
    }
  `],
})
export class CaseStudyCardComponent {
  readonly caseStudy = input.required<CaseStudyPreview>();
}
