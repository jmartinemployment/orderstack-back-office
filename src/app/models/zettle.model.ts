/** PayPal Zettle Reader Connect API — WebSocket message types. */

export type ZettleReaderState =
  | 'disconnected'
  | 'connecting'
  | 'waiting'
  | 'processing'
  | 'success'
  | 'failed';

export interface ZettlePaymentRequest {
  type: 'payment_request';
  amount: number;
  currency: string;
  reference: string;
}

export interface ZettlePaymentResponse {
  type: 'payment_response';
  status: 'success' | 'failed' | 'cancelled';
  reference: string;
  transactionId?: string;
  cardType?: string;
  lastFour?: string;
  errorMessage?: string;
}

export interface ZettleReaderStatus {
  type: 'reader_status';
  connected: boolean;
  batteryLevel?: number;
  serialNumber?: string;
}

export type ZettleMessage = ZettlePaymentResponse | ZettleReaderStatus;
