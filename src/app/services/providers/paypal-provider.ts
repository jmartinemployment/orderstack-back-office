import { loadScript, PayPalNamespace } from '@paypal/paypal-js';
import {
  PaymentProvider,
  PaymentContext,
  PaymentCreateResult,
  RefundResponse,
} from '../../models/payment.model';
import { environment } from '../../environments/environment';

export class PayPalPaymentProvider implements PaymentProvider {
  readonly type = 'paypal' as const;

  private paypalInstance: PayPalNamespace | null = null;
  private paypalOrderId: string | null = null;
  private storedContext: PaymentContext | null = null;
  private storedOrderId: string | null = null;

  // Promise-based confirm flow: confirmPayment() blocks until onApprove fires
  private resolveConfirm: ((value: boolean) => void) | null = null;
  private rejectConfirm: ((reason: Error) => void) | null = null;
  private paypalApproved = false;

  private buildHeaders(ctx: PaymentContext): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (ctx.authToken) {
      headers['Authorization'] = `Bearer ${ctx.authToken}`;
    }
    return headers;
  }

  async createPayment(orderId: string, _amount: number, context: PaymentContext): Promise<PaymentCreateResult> {
    this.storedContext = context;
    this.storedOrderId = orderId;
    this.paypalApproved = false;

    if (environment.paypalClientId === 'sb') {
      console.warn('PayPal is running in sandbox mode');
    }

    const response = await fetch(
      `${context.apiUrl}/merchant/${context.merchantId}/orders/${orderId}/paypal-create`,
      { method: 'POST', headers: this.buildHeaders(context), body: '{}' }
    );

    if (!response.ok) {
      throw new Error('Failed to create PayPal order');
    }

    const data = await response.json();
    this.paypalOrderId = data.paypalOrderId;

    return {
      paymentId: data.paypalOrderId,
    };
  }

  async mountPaymentUI(container: HTMLElement): Promise<boolean> {
    if (!this.paypalOrderId || !this.storedContext || !this.storedOrderId) {
      return false;
    }

    if (!this.paypalInstance) {
      this.paypalInstance = await loadScript({
        clientId: environment.paypalClientId,
        currency: 'USD',
        intent: 'capture',
      });
    }

    if (!this.paypalInstance?.Buttons) {
      return false;
    }

    const context = this.storedContext;
    const orderId = this.storedOrderId;
    const paypalOrderId = this.paypalOrderId;

    const buttons = this.paypalInstance.Buttons({
      createOrder: async () => paypalOrderId,
      onApprove: async () => {
        const captureResponse = await fetch(
          `${context.apiUrl}/merchant/${context.merchantId}/orders/${orderId}/paypal-capture`,
          { method: 'POST', headers: this.buildHeaders(context), body: '{}' }
        );

        if (!captureResponse.ok) {
          const err = new Error('PayPal capture failed');
          if (this.rejectConfirm) {
            this.rejectConfirm(err);
            this.resolveConfirm = null;
            this.rejectConfirm = null;
          }
          throw err;
        }

        this.paypalApproved = true;
        if (this.resolveConfirm) {
          this.resolveConfirm(true);
          this.resolveConfirm = null;
          this.rejectConfirm = null;
        }
      },
      onCancel: () => {
        if (this.rejectConfirm) {
          this.rejectConfirm(new Error('Payment cancelled by customer'));
          this.resolveConfirm = null;
          this.rejectConfirm = null;
        }
      },
      onError: (err: Record<string, unknown>) => {
        const msg = err['message'];
        const error = new Error(typeof msg === 'string' ? msg : 'PayPal error');
        if (this.rejectConfirm) {
          this.rejectConfirm(error);
          this.resolveConfirm = null;
          this.rejectConfirm = null;
        }
      },
    });

    if (buttons) {
      await buttons.render(container);
    }

    return true;
  }

  async confirmPayment(): Promise<boolean> {
    if (this.paypalApproved) {
      return true;
    }

    return new Promise<boolean>((resolve, reject) => {
      this.resolveConfirm = resolve;
      this.rejectConfirm = reject;
    });
  }

  async cancelPayment(orderId: string, context: PaymentContext): Promise<boolean> {
    const ctx = context ?? this.storedContext;
    if (!ctx) return false;

    const response = await fetch(
      `${ctx.apiUrl}/merchant/${ctx.merchantId}/orders/${orderId}/cancel-payment`,
      { method: 'POST', headers: this.buildHeaders(ctx), body: '{}' }
    );

    return response.ok;
  }

  async requestRefund(orderId: string, context: PaymentContext, amount?: number): Promise<RefundResponse | null> {
    const ctx = context ?? this.storedContext;
    if (!ctx) return null;

    const body = amount === undefined ? '{}' : JSON.stringify({ amount });
    const response = await fetch(
      `${ctx.apiUrl}/merchant/${ctx.merchantId}/orders/${orderId}/refund`,
      { method: 'POST', headers: this.buildHeaders(ctx), body }
    );

    if (!response.ok) return null;
    return response.json();
  }

  destroy(): void {
    this.paypalOrderId = null;
    this.storedContext = null;
    this.storedOrderId = null;
    this.paypalApproved = false;

    if (this.rejectConfirm) {
      this.rejectConfirm(new Error('Payment provider destroyed'));
      this.resolveConfirm = null;
      this.rejectConfirm = null;
    }
  }
}
