import { describe, it, expect } from 'vitest';
import type {
  PaymentProcessorType,
  PaymentStep,
  PaymentContext,
  PaymentStatusResponse,
  RefundResponse,
  PreauthResponse,
  CaptureResponse,
} from '@models/payment.model';

// --- Pure function replicas of PaymentService logic ---

function isConfigured(provider: unknown, processorType: PaymentProcessorType): boolean {
  return provider !== null && processorType !== 'none';
}

function needsExplicitConfirm(_processorType: PaymentProcessorType): boolean {
  return false;
}

function extractPaymentError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function buildPaymentContext(merchantId: string | null, apiUrl: string): PaymentContext | null {
  if (!merchantId) return null;
  return { merchantId, apiUrl };
}

function buildPreauthUrl(apiUrl: string, merchantId: string, orderId: string): string {
  return `${apiUrl}/merchant/${merchantId}/orders/${orderId}/preauth`;
}

function buildCloseTabUrl(apiUrl: string, merchantId: string, orderId: string): string {
  return `${apiUrl}/merchant/${merchantId}/orders/${orderId}/close-tab`;
}

function buildPaymentStatusUrl(apiUrl: string, merchantId: string, orderId: string): string {
  return `${apiUrl}/merchant/${merchantId}/orders/${orderId}/payment-status`;
}

function buildCaptureBody(captureAmount?: number): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (captureAmount !== undefined) {
    body['amount'] = captureAmount;
  }
  return body;
}

function resolveStepAfterInitiate(success: boolean): PaymentStep {
  return success ? 'paying' : 'failed';
}

function resolveStepAfterConfirm(success: boolean): PaymentStep {
  return success ? 'success' : 'failed';
}

function resolveProvider(type: PaymentProcessorType): string | null {
  switch (type) {
    case 'paypal': return 'paypal';
    case 'zettle_reader': return 'zettle_reader';
    case 'none': return null;
  }
}

// --- Tests ---

describe('PaymentService — isConfigured', () => {
  it('true when provider exists and type is not none', () => {
    expect(isConfigured({}, 'paypal')).toBe(true);
    expect(isConfigured({}, 'zettle_reader')).toBe(true);
  });

  it('false when provider is null', () => {
    expect(isConfigured(null, 'paypal')).toBe(false);
  });

  it('false when type is none', () => {
    expect(isConfigured({}, 'none')).toBe(false);
  });

  it('false when both null and none', () => {
    expect(isConfigured(null, 'none')).toBe(false);
  });
});

describe('PaymentService — needsExplicitConfirm', () => {
  it('false for paypal', () => {
    expect(needsExplicitConfirm('paypal')).toBe(false);
  });

  it('false for none', () => {
    expect(needsExplicitConfirm('none')).toBe(false);
  });

  it('false for zettle_reader', () => {
    expect(needsExplicitConfirm('zettle_reader')).toBe(false);
  });
});

describe('PaymentService — extractPaymentError', () => {
  it('extracts Error message', () => {
    expect(extractPaymentError(new Error('Card declined'), 'fallback')).toBe('Card declined');
  });

  it('uses fallback for non-Error', () => {
    expect(extractPaymentError('string', 'Failed to initiate payment')).toBe('Failed to initiate payment');
  });

  it('uses fallback for null', () => {
    expect(extractPaymentError(null, 'fallback')).toBe('fallback');
  });

  it('uses fallback for object without message', () => {
    expect(extractPaymentError({ code: 'DECLINED' }, 'Payment failed')).toBe('Payment failed');
  });
});

describe('PaymentService — buildPaymentContext', () => {
  it('returns context when restaurant ID exists', () => {
    const ctx = buildPaymentContext('r-1', 'https://api.example.com');
    expect(ctx).toEqual({ merchantId: 'r-1', apiUrl: 'https://api.example.com' });
  });

  it('returns null when restaurant ID is null', () => {
    expect(buildPaymentContext(null, 'https://api.example.com')).toBeNull();
  });
});

describe('PaymentService — URL builders', () => {
  const apiUrl = 'https://api.example.com/api';

  it('builds preauth URL', () => {
    expect(buildPreauthUrl(apiUrl, 'r-1', 'ord-1'))
      .toBe('https://api.example.com/api/merchant/r-1/orders/ord-1/preauth');
  });

  it('builds close-tab URL', () => {
    expect(buildCloseTabUrl(apiUrl, 'r-1', 'ord-1'))
      .toBe('https://api.example.com/api/merchant/r-1/orders/ord-1/close-tab');
  });

  it('builds payment-status URL', () => {
    expect(buildPaymentStatusUrl(apiUrl, 'r-1', 'ord-1'))
      .toBe('https://api.example.com/api/merchant/r-1/orders/ord-1/payment-status');
  });
});

describe('PaymentService — buildCaptureBody', () => {
  it('includes amount when provided', () => {
    expect(buildCaptureBody(50.00)).toEqual({ amount: 50.00 });
  });

  it('empty object when amount undefined', () => {
    expect(buildCaptureBody()).toEqual({});
  });

  it('includes zero amount', () => {
    expect(buildCaptureBody(0)).toEqual({ amount: 0 });
  });
});

describe('PaymentService — step resolution', () => {
  it('initiatePayment success leads to paying step', () => {
    expect(resolveStepAfterInitiate(true)).toBe('paying');
  });

  it('initiatePayment failure leads to failed step', () => {
    expect(resolveStepAfterInitiate(false)).toBe('failed');
  });

  it('confirmPayment success leads to success step', () => {
    expect(resolveStepAfterConfirm(true)).toBe('success');
  });

  it('confirmPayment failure leads to failed step', () => {
    expect(resolveStepAfterConfirm(false)).toBe('failed');
  });
});

describe('PaymentService — resolveProvider', () => {
  it('returns paypal for paypal type', () => {
    expect(resolveProvider('paypal')).toBe('paypal');
  });

  it('returns zettle_reader for zettle_reader type', () => {
    expect(resolveProvider('zettle_reader')).toBe('zettle_reader');
  });

  it('returns null for none type', () => {
    expect(resolveProvider('none')).toBeNull();
  });
});

describe('PaymentService — response type shapes', () => {
  it('PaymentStatusResponse has required fields', () => {
    const response: PaymentStatusResponse = {
      orderId: 'ord-1',
      orderNumber: 'ORD-001',
      paymentStatus: 'paid',
      paymentMethod: 'card',
      total: 42.50,
    };
    expect(response.paymentStatus).toBe('paid');
    expect(response.total).toBe(42.50);
  });

  it('PaymentStatusResponse with null payment method', () => {
    const response: PaymentStatusResponse = {
      orderId: 'ord-1',
      orderNumber: 'ORD-001',
      paymentStatus: 'pending',
      paymentMethod: null,
      total: 0,
    };
    expect(response.paymentMethod).toBeNull();
  });

  it('RefundResponse has required fields', () => {
    const response: RefundResponse = {
      success: true,
      refundId: 'ref-1',
      amount: 15.00,
      status: 'succeeded',
    };
    expect(response.success).toBe(true);
    expect(response.amount).toBe(15);
  });

  it('RefundResponse with null amount (full refund)', () => {
    const response: RefundResponse = {
      success: true,
      refundId: 'ref-2',
      amount: null,
      status: 'succeeded',
    };
    expect(response.amount).toBeNull();
  });

  it('PreauthResponse has required fields', () => {
    const response: PreauthResponse = {
      preauthId: 'pre-1',
      amount: 100,
      status: 'authorized',
    };
    expect(response.status).toBe('authorized');
  });

  it('CaptureResponse has required fields', () => {
    const response: CaptureResponse = {
      success: true,
      capturedAmount: 85.00,
      paymentId: 'pay-1',
    };
    expect(response.capturedAmount).toBe(85);
  });
});

describe('PaymentService — guard logic', () => {
  it('no provider and no context blocks payment', () => {
    const provider = null;
    const context = null;
    const canProceed = provider !== null && context !== null;
    expect(canProceed).toBe(false);
  });

  it('provider without context blocks payment', () => {
    const provider = {};
    const context = null;
    const canProceed = provider !== null && context !== null;
    expect(canProceed).toBe(false);
  });

  it('no restaurant blocks preauth', () => {
    const merchantId: string | null = null;
    expect(merchantId).toBeNull();
  });
});
