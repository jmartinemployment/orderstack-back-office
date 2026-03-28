import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { WeightUnit, WEIGHT_UNIT_LABELS } from '../../models/menu.model';

export interface WeightScaleResult {
  weight: number;
  unit: WeightUnit;
  totalPrice: number;
}

@Component({
  selector: 'os-weight-scale',
  imports: [CurrencyPipe],
  templateUrl: './weight-scale.html',
  styleUrl: './weight-scale.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeightScale {
  readonly itemName = input.required<string>();
  readonly unitPrice = input.required<number>();
  readonly weightUnit = input<WeightUnit>('lb');

  readonly weightConfirmed = output<WeightScaleResult>();
  readonly cancelled = output<void>();

  private readonly _weightValue = signal('');
  readonly weightValue = this._weightValue.asReadonly();

  readonly parsedWeight = computed(() => {
    const val = Number.parseFloat(this._weightValue());
    return Number.isNaN(val) ? 0 : val;
  });

  readonly isValidWeight = computed(() => this.parsedWeight() > 0);

  readonly estimatedTotal = computed(() =>
    Math.round(this.parsedWeight() * this.unitPrice() * 100) / 100
  );

  readonly unitLabel = computed(() => WEIGHT_UNIT_LABELS[this.weightUnit()]);

  readonly confirmLabel = computed(() => {
    if (!this.isValidWeight()) return 'Enter weight';
    const w = this.parsedWeight();
    const unit = this.unitLabel();
    return `Add ${w} ${unit}`;
  });

  onKeyPress(key: string): void {
    const current = this._weightValue();

    if (key === 'backspace') {
      this._weightValue.set(current.slice(0, -1));
      return;
    }

    if (key === 'clear') {
      this._weightValue.set('');
      return;
    }

    if (key === '.') {
      if (current.includes('.')) return;
      this._weightValue.set(`${current}.`);
      return;
    }

    // Digit 0-9
    const decimalIndex = current.indexOf('.');
    if (decimalIndex !== -1 && current.length - decimalIndex > 3) return;

    this._weightValue.set(`${current}${key}`);
  }

  confirm(): void {
    if (!this.isValidWeight()) return;
    this.weightConfirmed.emit({
      weight: this.parsedWeight(),
      unit: this.weightUnit(),
      totalPrice: this.estimatedTotal(),
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  /** Integration point for USB/Bluetooth scale hardware */
  setWeightFromScale(weight: number): void {
    this._weightValue.set(String(weight));
  }
}
