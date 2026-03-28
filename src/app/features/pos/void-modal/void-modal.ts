import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { VoidReason } from '../../../models/index';

export interface VoidResult {
  reason: string;
  managerPin?: string;
}

export interface CompResult {
  reason: string;
  managerPin?: string;
}

@Component({
  selector: 'os-void-modal',
  imports: [CurrencyPipe],
  templateUrl: './void-modal.html',
  styleUrl: './void-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoidModal {
  readonly mode = input<'void' | 'comp'>('void');
  readonly itemName = input('');
  readonly itemPrice = input(0);
  readonly requireManagerPin = input(true);

  readonly voidConfirm = output<VoidResult>();
  readonly compConfirm = output<CompResult>();
  readonly cancelled = output<void>();

  private readonly _reason = signal<VoidReason>('customer_request');
  private readonly _customReason = signal('');
  private readonly _error = signal<string | null>(null);
  private readonly _needsPin = signal(false);
  private readonly _pin = signal('');

  readonly reason = this._reason.asReadonly();
  readonly customReason = this._customReason.asReadonly();
  readonly error = this._error.asReadonly();
  readonly needsPin = this._needsPin.asReadonly();
  readonly pin = this._pin.asReadonly();

  readonly voidReasons: { value: VoidReason; label: string }[] = [
    { value: 'customer_request', label: 'Customer Request' },
    { value: 'wrong_item', label: 'Wrong Item' },
    { value: 'quality_issue', label: 'Quality Issue' },
    { value: 'kitchen_error', label: 'Kitchen Error' },
    { value: 'other', label: 'Other' },
  ];

  setReason(reason: VoidReason): void {
    this._reason.set(reason);
    this._error.set(null);
  }

  setCustomReason(val: string): void {
    this._customReason.set(val);
  }

  setPin(val: string): void {
    this._pin.set(val);
    this._error.set(null);
  }

  onConfirm(): void {
    if (this.mode() === 'void') {
      this.handleVoidConfirm();
    } else {
      this.handleCompConfirm();
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  private handleVoidConfirm(): void {
    const reason = this._reason();
    if (reason === 'other' && !this._customReason().trim()) {
      this._error.set('Please provide a reason');
      return;
    }

    if (!this.validateManagerPin()) return;

    const finalReason = reason === 'other' ? this._customReason() : reason;
    this.voidConfirm.emit({
      reason: finalReason,
      managerPin: this.requireManagerPin() ? this._pin() : undefined,
    });
  }

  private handleCompConfirm(): void {
    const reason = this._customReason().trim();
    if (!reason) {
      this._error.set('Please provide a reason for the comp');
      return;
    }

    if (!this.validateManagerPin()) return;

    this.compConfirm.emit({
      reason,
      managerPin: this.requireManagerPin() ? this._pin() : undefined,
    });
  }

  private validateManagerPin(): boolean {
    if (!this.requireManagerPin()) return true;

    if (!this._needsPin()) {
      this._needsPin.set(true);
      return false;
    }

    if (this._pin().length < 4) {
      this._error.set('Enter manager PIN');
      return false;
    }

    return true;
  }
}
