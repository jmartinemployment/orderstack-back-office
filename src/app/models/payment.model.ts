export type PaymentProcessorType = 'paypal' | 'zettle_reader' | 'none';

/** Processor types that represent an active payment provider (excludes settings sentinel). */
export type ActivePaymentProcessorType = Exclude<PaymentProcessorType, 'none'>;

export type PaymentStep = 'cart' | 'paying' | 'success' | 'failed';

export interface PaymentContext {
  merchantId: string;
  apiUrl: string;
  authToken: string | null;
}

export interface PaymentCreateResult {
  paymentId: string;
  clientToken?: string;
}

export interface PaymentProvider {
  readonly type: ActivePaymentProcessorType;
  createPayment(orderId: string, amount: number, context: PaymentContext): Promise<PaymentCreateResult>;
  mountPaymentUI(container: HTMLElement): Promise<boolean>;
  confirmPayment(): Promise<boolean>;
  cancelPayment(orderId: string, context: PaymentContext): Promise<boolean>;
  requestRefund(orderId: string, context: PaymentContext, amount?: number): Promise<RefundResponse | null>;
  destroy(): void;
}

export interface PaymentStatusResponse {
  orderId: string;
  orderNumber: string;
  paymentStatus: string;
  paymentMethod: string | null;
  total: number;
  processorData: Record<string, unknown> | null;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number | null;
  status: string;
}

export interface PreauthResponse {
  preauthId: string;
  amount: number;
  status: 'authorized' | 'captured' | 'cancelled' | 'expired';
}

export interface CaptureResponse {
  success: boolean;
  capturedAmount: number;
  paymentId: string;
}

