export type CashEventType =
  | 'opening_float'
  | 'cash_sale'
  | 'cash_in'
  | 'cash_out'
  | 'tip_payout'
  | 'bank_deposit'
  | 'paid_out'
  | 'drop_to_safe'
  | 'petty_cash'
  | 'refund';

export interface CashEvent {
  id: string;
  type: CashEventType;
  amount: number;
  reason: string;
  performedBy: string;
  timestamp: Date;
  orderId?: string;
}

export interface CashDenomination {
  hundreds: number;
  fifties: number;
  twenties: number;
  tens: number;
  fives: number;
  ones: number;
  quarters: number;
  dimes: number;
  nickels: number;
  pennies: number;
}

export interface CashDrawerSession {
  id: string;
  merchantId?: string;
  deviceId?: string;
  openedAt: Date;
  closedAt?: Date;
  openedBy: string;
  openingFloat: number;
  events: CashEvent[];
  expectedCash: number;
  actualCash?: number;
  overShort?: number;
  closedBy?: string;
  denomination?: CashDenomination;
}

export interface CashReconciliation {
  sessionId: string;
  openedAt: Date;
  closedAt: Date;
  openedBy: string;
  closedBy: string;
  openingFloat: number;
  expectedCash: number;
  actualCash: number;
  overShort: number;
  cashSalesTotal: number;
  cashOutTotal: number;
  eventCount: number;
}

export interface EmployeeCashSummary {
  employeeName: string;
  totalCashHandled: number;
  totalCashIn: number;
  totalCashOut: number;
  eventCount: number;
  sessionCount: number;
  avgVariance: number;
  totalVariance: number;
  discrepancyCount: number;
}

export interface CashDiscrepancyAlert {
  sessionId: string;
  employee: string;
  variance: number;
  isOver: boolean;
  closedAt: Date;
  threshold: number;
}

export interface CashEventReportRow {
  event: CashEvent;
  sessionId: string;
  sessionOpenedAt: Date;
}

export function getCashEventLabel(type: CashEventType): string {
  switch (type) {
    case 'opening_float': return 'Opening Float';
    case 'cash_sale': return 'Cash Sale';
    case 'cash_in': return 'Cash In';
    case 'cash_out': return 'Cash Out';
    case 'tip_payout': return 'Tip Payout';
    case 'bank_deposit': return 'Bank Deposit';
    case 'paid_out': return 'Paid Out';
    case 'drop_to_safe': return 'Drop to Safe';
    case 'petty_cash': return 'Petty Cash';
    case 'refund': return 'Cash Refund';
  }
}

export function getCashEventIcon(type: CashEventType): string {
  switch (type) {
    case 'opening_float': return 'bi-unlock';
    case 'cash_sale': return 'bi-cash';
    case 'cash_in': return 'bi-box-arrow-in-down';
    case 'cash_out': return 'bi-box-arrow-up';
    case 'tip_payout': return 'bi-heart';
    case 'bank_deposit': return 'bi-bank';
    case 'paid_out': return 'bi-receipt';
    case 'drop_to_safe': return 'bi-safe';
    case 'petty_cash': return 'bi-coin';
    case 'refund': return 'bi-arrow-return-left';
  }
}

export function isCashInflow(type: CashEventType): boolean {
  return type === 'opening_float' || type === 'cash_sale' || type === 'cash_in';
}

export function calculateDenominationTotal(d: CashDenomination): number {
  return (
    d.hundreds * 100 +
    d.fifties * 50 +
    d.twenties * 20 +
    d.tens * 10 +
    d.fives * 5 +
    d.ones * 1 +
    d.quarters * 0.25 +
    d.dimes * 0.1 +
    d.nickels * 0.05 +
    d.pennies * 0.01
  );
}

export function emptyDenomination(): CashDenomination {
  return {
    hundreds: 0,
    fifties: 0,
    twenties: 0,
    tens: 0,
    fives: 0,
    ones: 0,
    quarters: 0,
    dimes: 0,
    nickels: 0,
    pennies: 0,
  };
}
