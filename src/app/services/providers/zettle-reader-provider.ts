import {
  PaymentProvider,
  PaymentContext,
  PaymentCreateResult,
  RefundResponse,
  ZettleReaderState,
  ZettlePaymentRequest,
  ZettlePaymentResponse,
  ZettleMessage,
} from '../../models';

export class ZettleReaderProvider implements PaymentProvider {
  readonly type = 'zettle_reader' as const;

  private ws: WebSocket | null = null;
  private storedContext: PaymentContext | null = null;
  private storedOrderId: string | null = null;
  private statusContainer: HTMLElement | null = null;
  private _state: ZettleReaderState = 'disconnected';

  private resolvePayment: ((value: boolean) => void) | null = null;
  private rejectPayment: ((reason: Error) => void) | null = null;
  private paymentCompleted = false;

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
    this.paymentCompleted = false;

    const response = await fetch(
      `${context.apiUrl}/merchant/${context.merchantId}/orders/${orderId}/zettle-create`,
      { method: 'POST', headers: this.buildHeaders(context), body: JSON.stringify({ amount: _amount }) }
    );

    if (!response.ok) {
      throw new Error('Failed to create Zettle payment');
    }

    const data = await response.json();
    return { paymentId: data.paymentId };
  }

  async mountPaymentUI(container: HTMLElement): Promise<boolean> {
    this.statusContainer = container;
    this.updateUI('disconnected');
    return true;
  }

  async confirmPayment(): Promise<boolean> {
    if (this.paymentCompleted) return true;

    if (!this.storedContext || !this.storedOrderId) {
      throw new Error('Payment not initialized');
    }

    this.setState('connecting');

    try {
      await this.connectToReader();
    } catch {
      this.setState('failed');
      throw new Error('Failed to connect to card reader');
    }

    this.setState('waiting');

    return new Promise<boolean>((resolve, reject) => {
      this.resolvePayment = resolve;
      this.rejectPayment = reject;
    });
  }

  async cancelPayment(orderId: string, context: PaymentContext): Promise<boolean> {
    this.closeWebSocket();

    const response = await fetch(
      `${context.apiUrl}/merchant/${context.merchantId}/orders/${orderId}/cancel-payment`,
      { method: 'POST', headers: this.buildHeaders(context), body: '{}' }
    );

    return response.ok;
  }

  async requestRefund(orderId: string, context: PaymentContext, amount?: number): Promise<RefundResponse | null> {
    const body = amount === undefined ? '{}' : JSON.stringify({ amount });
    const response = await fetch(
      `${context.apiUrl}/merchant/${context.merchantId}/orders/${orderId}/refund`,
      { method: 'POST', headers: this.buildHeaders(context), body }
    );

    if (!response.ok) return null;
    return response.json();
  }

  destroy(): void {
    this.closeWebSocket();
    this.storedContext = null;
    this.storedOrderId = null;
    this.statusContainer = null;
    this.paymentCompleted = false;

    if (this.rejectPayment) {
      this.rejectPayment(new Error('Payment provider destroyed'));
      this.resolvePayment = null;
      this.rejectPayment = null;
    }
  }

  private async connectToReader(): Promise<void> {
    if (!this.storedContext) throw new Error('No payment context');

    const response = await fetch(
      `${this.storedContext.apiUrl}/merchant/${this.storedContext.merchantId}/zettle/reader-connect`,
      { method: 'GET', headers: this.buildHeaders(this.storedContext) }
    );

    if (!response.ok) {
      throw new Error('Reader not configured');
    }

    const { wsUrl } = await response.json();

    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => resolve();

      this.ws.onerror = () => reject(new Error('WebSocket connection failed'));

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data as string) as ZettleMessage;
          this.handleMessage(message);
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        if (this._state === 'waiting' || this._state === 'processing') {
          this.setState('failed');
          if (this.rejectPayment) {
            this.rejectPayment(new Error('Reader connection lost'));
            this.resolvePayment = null;
            this.rejectPayment = null;
          }
        }
      };
    });
  }

  private handleMessage(message: ZettleMessage): void {
    if (message.type === 'payment_response') {
      this.handlePaymentResponse(message);
    }
  }

  private handlePaymentResponse(response: ZettlePaymentResponse): void {
    if (response.status === 'success') {
      this.paymentCompleted = true;
      this.setState('success');
      if (this.resolvePayment) {
        this.resolvePayment(true);
        this.resolvePayment = null;
        this.rejectPayment = null;
      }
    } else {
      this.setState('failed');
      const errorMsg = response.errorMessage ?? (response.status === 'cancelled' ? 'Payment cancelled' : 'Payment failed');
      if (this.rejectPayment) {
        this.rejectPayment(new Error(errorMsg));
        this.resolvePayment = null;
        this.rejectPayment = null;
      }
    }
  }

  sendPaymentRequest(amount: number, reference: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const request: ZettlePaymentRequest = {
      type: 'payment_request',
      amount,
      currency: 'USD',
      reference,
    };

    this.ws.send(JSON.stringify(request));
    this.setState('processing');
  }

  private setState(state: ZettleReaderState): void {
    this._state = state;
    this.updateUI(state);
  }

  private updateUI(state: ZettleReaderState): void {
    if (!this.statusContainer) return;

    const messages: Record<ZettleReaderState, string> = {
      disconnected: 'Card reader not connected',
      connecting: 'Connecting to card reader...',
      waiting: 'Tap, insert, or swipe card',
      processing: 'Processing payment...',
      success: 'Payment approved',
      failed: 'Payment failed — try again',
    };

    this.statusContainer.textContent = messages[state];
  }

  private closeWebSocket(): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
  }
}
