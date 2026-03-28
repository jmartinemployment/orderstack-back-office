import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { DiscountType, DiscountReason } from '../../../models/index';

export interface DiscountResult {
  type: DiscountType;
  value: number;
  reason: string;
}

@Component({
  selector: 'os-discount-modal',
  imports: [CurrencyPipe],
  templateUrl: './discount-modal.html',
  styleUrl: './discount-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscountModal {
  readonly checkSubtotal = input(0);

  readonly discountApply = output<DiscountResult>();
  readonly cancelled = output<void>();

  private readonly _type = signal<DiscountType>('percentage');
  private readonly _value = signal('');
  private readonly _reason = signal<DiscountReason>('promo');
  private readonly _customReason = signal('');
  private readonly _error = signal<string | null>(null);

  readonly type = this._type.asReadonly();
  readonly value = this._value.asReadonly();
  readonly reason = this._reason.asReadonly();
  readonly customReason = this._customReason.asReadonly();
  readonly error = this._error.asReadonly();

  readonly reasonOptions: { value: DiscountReason; label: string }[] = [
    { value: 'loyalty', label: 'Loyalty Reward' },
    { value: 'birthday', label: 'Birthday' },
    { value: 'manager_comp', label: 'Manager Comp' },
    { value: 'employee_meal', label: 'Employee Meal' },
    { value: 'promo', label: 'Promotion' },
    { value: 'other', label: 'Other' },
  ];

  setType(type: DiscountType): void {
    this._type.set(type);
    this._value.set('');
    this._error.set(null);
  }

  setValue(val: string): void {
    this._value.set(val);
    this._error.set(null);
  }

  setReason(reason: DiscountReason): void {
    this._reason.set(reason);
  }

  setCustomReason(val: string): void {
    this._customReason.set(val);
  }

  onQuickPercent(pct: number): void {
    this._type.set('percentage');
    this._value.set(String(pct));
    this._error.set(null);
  }

  onComp(): void {
    this._type.set('comp');
    this._value.set(String(this.checkSubtotal()));
    this._error.set(null);
  }

  getPreviewAmount(): number {
    const val = Number(this._value()) || 0;
    if (this._type() === 'percentage') {
      return this.checkSubtotal() * (val / 100);
    }
    return val;
  }

  onApply(): void {
    const val = Number(this._value());
    const type = this._type();

    if (type !== 'comp' && (!val || val <= 0)) {
      this._error.set('Enter a valid amount');
      return;
    }

    if (type === 'percentage' && val > 100) {
      this._error.set('Percentage cannot exceed 100%');
      return;
    }

    if (type === 'flat' && val > this.checkSubtotal()) {
      this._error.set('Discount exceeds check subtotal');
      return;
    }

    const reason = this._reason();
    const finalReason = reason === 'other' ? this._customReason() || 'Other' : reason;

    this.discountApply.emit({
      type,
      value: type === 'comp' ? this.checkSubtotal() : val,
      reason: finalReason,
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
