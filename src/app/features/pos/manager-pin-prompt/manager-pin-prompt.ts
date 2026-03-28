import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'os-manager-pin-prompt',
  imports: [],
  templateUrl: './manager-pin-prompt.html',
  styleUrl: './manager-pin-prompt.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerPinPrompt {
  readonly title = input('Manager Approval Required');
  readonly message = input('Enter a manager or owner PIN to authorize this action.');

  readonly pinSubmit = output<string>();
  readonly cancelled = output<void>();

  private readonly _pin = signal('');
  private readonly _error = signal<string | null>(null);
  private readonly _isValidating = signal(false);

  readonly pin = this._pin.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isValidating = this._isValidating.asReadonly();

  onDigit(digit: string): void {
    if (this._pin().length < 6) {
      this._pin.update(p => p + digit);
      this._error.set(null);
    }
  }

  onBackspace(): void {
    this._pin.update(p => p.slice(0, -1));
    this._error.set(null);
  }

  onClear(): void {
    this._pin.set('');
    this._error.set(null);
  }

  onSubmit(): void {
    const pin = this._pin();
    if (pin.length < 4) {
      this._error.set('PIN must be at least 4 digits');
      return;
    }
    this.pinSubmit.emit(pin);
  }

  onCancel(): void {
    this._pin.set('');
    this._error.set(null);
    this.cancelled.emit();
  }

  setError(message: string): void {
    this._error.set(message);
    this._pin.set('');
  }

  setValidating(state: boolean): void {
    this._isValidating.set(state);
  }
}
