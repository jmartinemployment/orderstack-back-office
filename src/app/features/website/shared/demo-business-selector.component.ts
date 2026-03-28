import { Component, ChangeDetectionStrategy, output, input } from '@angular/core';
import { DEMO_BUSINESS_TYPES, DemoBusinessType } from '../marketing.config';

@Component({
  selector: 'os-demo-business-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-biz-selector" role="tablist" aria-label="Business type">
      @for (option of options; track option.id) {
        <button
          class="mkt-biz-selector__pill"
          [class.mkt-biz-selector__pill--active]="selected() === option.id"
          role="tab"
          [attr.aria-selected]="selected() === option.id"
          (click)="selectionChange.emit(option.id)">
          <i [class]="'bi ' + option.icon" aria-hidden="true"></i>
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: [`
    .mkt-biz-selector {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .mkt-biz-selector__pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
      border: 1px solid var(--os-border);
      border-radius: 999px;
      background: var(--os-bg-card);
      color: var(--os-text-secondary);
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;

      i { font-size: 1.125rem; }

      &:hover {
        border-color: var(--os-primary);
        color: var(--os-primary);
      }

      &--active {
        background: var(--os-primary);
        border-color: var(--os-primary);
        color: #ffffff;

        &:hover {
          color: #ffffff;
        }
      }
    }
  `],
})
export class DemoBusinessSelectorComponent {
  readonly selected = input<DemoBusinessType>('restaurant');
  readonly selectionChange = output<DemoBusinessType>();
  readonly options = DEMO_BUSINESS_TYPES;
}
