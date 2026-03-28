import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  input,
  output,
  viewChild,
  ElementRef,
  computed,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { PaymentService } from '../../services/payment';

type PaymentTerminalState = 'idle' | 'screen-pay' | 'reader-connecting' | 'reader-waiting' | 'processing' | 'success' | 'failed';

@Component({
  selector: 'os-payment-terminal',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './payment-terminal.html',
  styleUrl: './payment-terminal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentTerminal {
  private readonly paymentService = inject(PaymentService);

  readonly amount = input.required<number>();
  readonly orderId = input.required<string>();
  readonly showOnScreen = input(true);
  readonly showCardReader = input(true);
  readonly paymentComplete = output<void>();
  readonly paymentFailed = output<string>();

  readonly paypalContainer = viewChild<ElementRef>('paypalContainer');
  readonly readerStatusContainer = viewChild<ElementRef>('readerStatusContainer');

  private readonly _state = signal<PaymentTerminalState>('idle');
  private readonly _error = signal<string | null>(null);

  readonly state = this._state.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isIdle = computed(() => this._state() === 'idle');
  readonly isScreenPay = computed(() => this._state() === 'screen-pay');
  readonly isReaderActive = computed(() => {
    const s = this._state();
    return s === 'reader-connecting' || s === 'reader-waiting' || (s === 'processing' && this._selectedMethod === 'reader');
  });
  readonly isProcessing = computed(() => this._state() === 'processing');
  readonly isSuccess = computed(() => this._state() === 'success');
  readonly isFailed = computed(() => this._state() === 'failed');

  private _selectedMethod: 'screen' | 'reader' | null = null;

  async selectOnScreen(): Promise<void> {
    this._selectedMethod = 'screen';
    this._state.set('screen-pay');
    this._error.set(null);

    this.paymentService.setProcessorType('paypal');

    const initiated = await this.paymentService.initiatePayment(this.orderId(), this.amount());
    if (!initiated) {
      const errorMsg = this.paymentService.error() ?? 'Failed to start payment';
      this._state.set('failed');
      this._error.set(errorMsg);
      this.paymentFailed.emit(errorMsg);
      return;
    }

    // Wait a tick for the container to render
    setTimeout(async () => {
      const container = this.paypalContainer()?.nativeElement;
      if (!container) {
        const errorMsg = 'Payment UI container not available';
        this._state.set('failed');
        this._error.set(errorMsg);
        this.paymentFailed.emit(errorMsg);
        return;
      }

      const mounted = await this.paymentService.mountPaymentUI(container);
      if (!mounted) {
        const errorMsg = 'Failed to load payment buttons';
        this._state.set('failed');
        this._error.set(errorMsg);
        this.paymentFailed.emit(errorMsg);
        return;
      }

      // PayPal: confirmPayment() blocks until onApprove fires
      try {
        const confirmed = await this.paymentService.confirmPayment();
        if (confirmed) {
          this._state.set('success');
          this.paymentComplete.emit();
        } else {
          const errorMsg = 'Payment was not approved';
          this._state.set('failed');
          this._error.set(errorMsg);
          this.paymentFailed.emit(errorMsg);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Payment failed';
        this._state.set('failed');
        this._error.set(errorMsg);
        this.paymentFailed.emit(errorMsg);
      }
    });
  }

  async selectCardReader(): Promise<void> {
    this._selectedMethod = 'reader';
    this._state.set('reader-connecting');
    this._error.set(null);

    this.paymentService.setProcessorType('zettle_reader');

    const initiated = await this.paymentService.initiatePayment(this.orderId(), this.amount());
    if (!initiated) {
      const errorMsg = this.paymentService.error() ?? 'Failed to start payment';
      this._state.set('failed');
      this._error.set(errorMsg);
      this.paymentFailed.emit(errorMsg);
      return;
    }

    // Mount status UI into the reader container
    setTimeout(async () => {
      const container = this.readerStatusContainer()?.nativeElement;
      if (container) {
        await this.paymentService.mountPaymentUI(container);
      }

      try {
        const confirmed = await this.paymentService.confirmPayment();
        if (confirmed) {
          this._state.set('success');
          this.paymentComplete.emit();
        } else {
          const errorMsg = 'Card payment was not approved';
          this._state.set('failed');
          this._error.set(errorMsg);
          this.paymentFailed.emit(errorMsg);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Card payment failed';
        this._state.set('failed');
        this._error.set(errorMsg);
        this.paymentFailed.emit(errorMsg);
      }
    });
  }

  retry(): void {
    this._state.set('idle');
    this._error.set(null);
    this.paymentService.reset();
  }

  cancel(): void {
    this.paymentService.reset();
    this._state.set('idle');
    this._error.set(null);
    this._selectedMethod = null;
  }
}
