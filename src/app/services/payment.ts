import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  PaymentProcessorType,
  PaymentProvider,
  PaymentContext,
  PaymentStatusResponse,
  RefundResponse,
  PreauthResponse,
  CaptureResponse,
  PaymentStep,
} from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';
import { PayPalPaymentProvider } from './providers/paypal-provider';
import { ZettleReaderProvider } from './providers/zettle-reader-provider';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private provider: PaymentProvider | null = null;

  private readonly _paymentStep = signal<PaymentStep>('cart');
  private readonly _isProcessing = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentPaymentId = signal<string | null>(null);
  private readonly _processorType = signal<PaymentProcessorType>('none');

  readonly paymentStep = this._paymentStep.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentPaymentId = this._currentPaymentId.asReadonly();
  readonly processorType = this._processorType.asReadonly();

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  private get paymentContext(): PaymentContext | null {
    if (!this.merchantId) return null;
    return {
      merchantId: this.merchantId,
      apiUrl: this.apiUrl,
      authToken: this.authService.token(),
    };
  }

  setProcessorType(type: PaymentProcessorType): void {
    if (this._processorType() === type) return;

    this.provider?.destroy();
    this.provider = null;
    this._processorType.set(type);

    switch (type) {
      case 'paypal':
        this.provider = new PayPalPaymentProvider();
        break;
      case 'zettle_reader':
        this.provider = new ZettleReaderProvider();
        break;
      case 'none':
        break;
    }
  }

  isConfigured(): boolean {
    return this.provider !== null && this._processorType() !== 'none';
  }

  needsExplicitConfirm(): boolean {
    return false;
  }

  async initiatePayment(orderId: string, amount: number): Promise<boolean> {
    if (!this.provider || !this.paymentContext) {
      this._error.set('Payment processor not configured');
      return false;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      const result = await this.provider.createPayment(orderId, amount, this.paymentContext);
      this._currentPaymentId.set(result.paymentId);
      this._paymentStep.set('paying');
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to initiate payment';
      this._error.set(message);
      this._paymentStep.set('failed');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async mountPaymentUI(container: HTMLElement): Promise<boolean> {
    if (!this.provider) {
      this._error.set('Payment processor not configured');
      return false;
    }

    try {
      return await this.provider.mountPaymentUI(container);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mount payment UI';
      this._error.set(message);
      return false;
    }
  }

  async confirmPayment(): Promise<boolean> {
    if (!this.provider) {
      this._error.set('Payment not initialized');
      return false;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      const success = await this.provider.confirmPayment();

      if (success) {
        this._paymentStep.set('success');
      } else {
        this._paymentStep.set('failed');
      }

      return success;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment confirmation failed';
      this._error.set(message);
      this._paymentStep.set('failed');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async getPaymentStatus(orderId: string): Promise<PaymentStatusResponse | null> {
    if (!this.merchantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<PaymentStatusResponse>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/payment-status`
        )
      );
    } catch {
      return null;
    }
  }

  async cancelPayment(orderId: string): Promise<boolean> {
    if (!this.provider || !this.paymentContext) return false;

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      return await this.provider.cancelPayment(orderId, this.paymentContext);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel payment';
      this._error.set(message);
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async requestRefund(orderId: string, amount?: number): Promise<RefundResponse | null> {
    if (!this.provider || !this.paymentContext) return null;

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      return await this.provider.requestRefund(orderId, this.paymentContext, amount);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process refund';
      this._error.set(message);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async preauthorize(orderId: string, amount: number): Promise<PreauthResponse | null> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return null;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<PreauthResponse>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/preauth`,
          { amount }
        )
      );
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to pre-authorize card';
      this._error.set(message);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async capturePreauth(orderId: string, captureAmount?: number): Promise<CaptureResponse | null> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return null;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      const body: Record<string, unknown> = {};
      if (captureAmount !== undefined) {
        body['amount'] = captureAmount;
      }
      const result = await firstValueFrom(
        this.http.post<CaptureResponse>(
          `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}/close-tab`,
          body
        )
      );
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to capture pre-auth';
      this._error.set(message);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  reset(): void {
    this.provider?.destroy();
    this._paymentStep.set('cart');
    this._isProcessing.set(false);
    this._error.set(null);
    this._currentPaymentId.set(null);
  }

  setStep(step: PaymentStep): void {
    this._paymentStep.set(step);
  }

  clearError(): void {
    this._error.set(null);
  }
}
