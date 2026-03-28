import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RetailCheckoutService } from '../../../services/retail-checkout';
import { RetailCatalogService } from '../../../services/retail-catalog';
import type {
  RetailTransaction,
  RetailTransactionItem,
  RetailPayment,
  ReturnReason,
  RefundMethod,
  ReturnItem,
  ReturnRequest,
  ReturnPolicy,
} from '../../../models/retail.model';

type ReturnTab = 'lookup' | 'process' | 'exchange' | 'policy';
type LookupMethod = 'receipt' | 'card' | 'customer' | 'date';

interface ReturnSelection {
  transactionItem: RetailTransactionItem;
  selected: boolean;
  returnQuantity: number;
  reason: ReturnReason;
  note: string;
  restock: boolean;
}

@Component({
  selector: 'os-return-processing',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './returns.html',
  styleUrl: './returns.scss',
})
export class ReturnProcessing implements OnInit {
  readonly checkoutService = inject(RetailCheckoutService);
  readonly catalogService = inject(RetailCatalogService);

  readonly isProcessing = this.checkoutService.isProcessing;
  readonly error = this.checkoutService.error;
  readonly returnPolicy = this.checkoutService.returnPolicy;

  // Tabs
  readonly activeTab = signal<ReturnTab>('lookup');

  // Lookup
  readonly lookupMethod = signal<LookupMethod>('receipt');
  readonly lookupReceiptNumber = signal('');
  readonly lookupCardLast4 = signal('');
  readonly lookupCustomerPhone = signal('');
  readonly lookupDateFrom = signal('');
  readonly lookupDateTo = signal('');
  readonly isSearching = signal(false);
  readonly searchResults = signal<RetailTransaction[]>([]);
  readonly selectedTransaction = signal<RetailTransaction | null>(null);

  // Return Processing
  readonly returnSelections = signal<ReturnSelection[]>([]);
  readonly refundMethod = signal<RefundMethod>('original_payment');
  readonly managerPin = signal('');
  readonly showManagerOverride = signal(false);

  // Exchange
  readonly exchangeMode = signal(false);
  readonly exchangeCredit = signal(0);
  readonly exchangeCart = this.checkoutService.cart;
  readonly exchangeCartTotal = this.checkoutService.cartTotal;

  readonly exchangeDifference = computed(() => {
    return this.exchangeCartTotal() - this.exchangeCredit();
  });

  // Policy
  readonly policyWindowDays = signal(30);
  readonly policyRequireReceipt = signal(true);
  readonly policyNoReceiptLimit = signal(25);
  readonly policyManagerOverride = signal(false);
  readonly policyFinalSaleItems = signal('');

  // Computeds
  readonly selectedReturnItems = computed(() =>
    this.returnSelections().filter(s => s.selected)
  );

  readonly totalRefundAmount = computed(() =>
    this.selectedReturnItems().reduce((sum, s) => {
      const unitPrice = s.transactionItem.unitPrice;
      return sum + (unitPrice * s.returnQuantity) - s.transactionItem.discountAmount;
    }, 0)
  );

  readonly canProcessReturn = computed(() => {
    const selections = this.selectedReturnItems();
    if (selections.length === 0) return false;
    return selections.every(s => s.returnQuantity > 0 && s.reason);
  });

  readonly isOutOfPolicy = computed(() => {
    const tx = this.selectedTransaction();
    if (!tx) return false;
    return !this.checkoutService.isWithinReturnWindow(tx);
  });

  readonly needsManagerOverride = computed(() => {
    const policy = this.returnPolicy();
    if (!policy) return false;
    return (this.isOutOfPolicy() && policy.managerOverrideRequired) ||
           (!policy.requireReceipt && !this.selectedTransaction());
  });

  readonly returnReasons: { value: ReturnReason; label: string }[] = [
    { value: 'defective', label: 'Defective' },
    { value: 'wrong_size', label: 'Wrong Size' },
    { value: 'changed_mind', label: 'Changed Mind' },
    { value: 'not_as_described', label: 'Not as Described' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'other', label: 'Other' },
  ];

  ngOnInit(): void {
    this.checkoutService.loadReturnPolicy();
  }

  // --- Tab Navigation ---

  setTab(tab: ReturnTab): void {
    this.activeTab.set(tab);
    if (tab === 'policy') {
      this.loadPolicyIntoForm();
    }
  }

  // --- Lookup ---

  setLookupMethod(method: LookupMethod): void {
    this.lookupMethod.set(method);
  }

  updateLookupReceiptNumber(value: string): void { this.lookupReceiptNumber.set(value); }
  updateLookupCardLast4(value: string): void { this.lookupCardLast4.set(value); }
  updateLookupCustomerPhone(value: string): void { this.lookupCustomerPhone.set(value); }
  updateLookupDateFrom(value: string): void { this.lookupDateFrom.set(value); }
  updateLookupDateTo(value: string): void { this.lookupDateTo.set(value); }

  async searchTransactions(): Promise<void> {
    this.isSearching.set(true);
    this.searchResults.set([]);

    const method = this.lookupMethod();
    const params: Record<string, string> = {};

    if (method === 'receipt') {
      params['receiptNumber'] = this.lookupReceiptNumber().trim();
    } else if (method === 'card') {
      params['cardLast4'] = this.lookupCardLast4().trim();
    } else if (method === 'customer') {
      params['customerPhone'] = this.lookupCustomerPhone().trim();
    } else if (method === 'date') {
      if (this.lookupDateFrom()) params['dateFrom'] = this.lookupDateFrom();
      if (this.lookupDateTo()) params['dateTo'] = this.lookupDateTo();
    }

    const results = await this.checkoutService.searchTransactions(params);
    this.searchResults.set(results);
    this.isSearching.set(false);
  }

  selectTransaction(tx: RetailTransaction): void {
    this.selectedTransaction.set(tx);
    this.returnSelections.set(
      tx.items.filter(item => !item.isReturn).map(item => ({
        transactionItem: item,
        selected: false,
        returnQuantity: item.quantity,
        reason: 'changed_mind' as ReturnReason,
        note: '',
        restock: true,
      }))
    );
    this.activeTab.set('process');
  }

  // --- Return Processing ---

  toggleItemSelection(index: number): void {
    this.returnSelections.update(selections =>
      selections.map((s, i) => i === index ? { ...s, selected: !s.selected } : s)
    );
  }

  updateReturnQuantity(index: number, value: string): void {
    const qty = Number.parseInt(value, 10) || 0;
    this.returnSelections.update(selections =>
      selections.map((s, i) => i === index ? { ...s, returnQuantity: Math.min(qty, s.transactionItem.quantity) } : s)
    );
  }

  updateReturnReason(index: number, value: ReturnReason): void {
    this.returnSelections.update(selections =>
      selections.map((s, i) => i === index ? { ...s, reason: value } : s)
    );
  }

  updateReturnNote(index: number, value: string): void {
    this.returnSelections.update(selections =>
      selections.map((s, i) => i === index ? { ...s, note: value } : s)
    );
  }

  toggleRestock(index: number): void {
    this.returnSelections.update(selections =>
      selections.map((s, i) => i === index ? { ...s, restock: !s.restock } : s)
    );
  }

  selectAllItems(): void {
    this.returnSelections.update(selections =>
      selections.map(s => ({ ...s, selected: true }))
    );
  }

  deselectAllItems(): void {
    this.returnSelections.update(selections =>
      selections.map(s => ({ ...s, selected: false }))
    );
  }

  updateRefundMethod(value: RefundMethod): void {
    this.refundMethod.set(value);
  }

  updateManagerPin(value: string): void {
    this.managerPin.set(value);
  }

  async processReturn(): Promise<void> {
    const tx = this.selectedTransaction();
    if (!tx) return;

    const items: ReturnItem[] = this.selectedReturnItems().map(s => ({
      transactionItemId: s.transactionItem.id,
      quantity: s.returnQuantity,
      reason: s.reason,
      note: s.note,
      restock: s.restock,
    }));

    const request: ReturnRequest = {
      originalTransactionId: tx.id,
      items,
      refundMethod: this.refundMethod(),
      totalRefund: this.totalRefundAmount(),
    };

    const result = await this.checkoutService.processReturn(request);
    if (result) {
      this.resetReturn();
    }
  }

  // --- Exchange ---

  startExchange(): void {
    this.exchangeMode.set(true);
    this.exchangeCredit.set(this.totalRefundAmount());
    this.checkoutService.clearCart();
    this.activeTab.set('exchange');
  }

  async processExchange(): Promise<void> {
    const tx = this.selectedTransaction();
    if (!tx) return;

    const items: ReturnItem[] = this.selectedReturnItems().map(s => ({
      transactionItemId: s.transactionItem.id,
      quantity: s.returnQuantity,
      reason: s.reason,
      note: s.note,
      restock: s.restock,
    }));

    const returnRequest: ReturnRequest = {
      originalTransactionId: tx.id,
      items,
      refundMethod: 'store_credit',
      totalRefund: this.totalRefundAmount(),
    };

    const difference = this.exchangeDifference();
    const payments: RetailPayment[] = [];

    if (difference > 0) {
      payments.push(
        {
          method: 'store_credit',
          amount: this.exchangeCredit(),
          reference: `exchange:${tx.id}`,
        },
        {
          method: 'card',
          amount: difference,
          reference: null,
        },
      );
    } else {
      payments.push({
        method: 'store_credit',
        amount: this.exchangeCartTotal(),
        reference: `exchange:${tx.id}`,
      });
    }

    const result = await this.checkoutService.processExchange(returnRequest, payments, false);
    if (result) {
      this.resetReturn();
    }
  }

  // --- Policy ---

  private loadPolicyIntoForm(): void {
    const p = this.returnPolicy();
    if (!p) return;
    this.policyWindowDays.set(p.returnWindowDays);
    this.policyRequireReceipt.set(p.requireReceipt);
    this.policyNoReceiptLimit.set(p.noReceiptLimit);
    this.policyManagerOverride.set(p.managerOverrideRequired);
    this.policyFinalSaleItems.set(p.finalSaleExemptions.join(', '));
  }

  updatePolicyWindowDays(value: string): void { this.policyWindowDays.set(Number.parseInt(value, 10) || 30); }
  updatePolicyNoReceiptLimit(value: string): void { this.policyNoReceiptLimit.set(Number.parseInt(value, 10) || 0); }
  updatePolicyFinalSaleItems(value: string): void { this.policyFinalSaleItems.set(value); }
  togglePolicyRequireReceipt(): void { this.policyRequireReceipt.update(v => !v); }
  togglePolicyManagerOverride(): void { this.policyManagerOverride.update(v => !v); }

  async savePolicy(): Promise<void> {
    const policy: ReturnPolicy = {
      returnWindowDays: this.policyWindowDays(),
      requireReceipt: this.policyRequireReceipt(),
      noReceiptLimit: this.policyNoReceiptLimit(),
      managerOverrideRequired: this.policyManagerOverride(),
      finalSaleExemptions: this.policyFinalSaleItems()
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0),
    };
    await this.checkoutService.saveReturnPolicy(policy);
  }

  // --- Helpers ---

  private resetReturn(): void {
    this.selectedTransaction.set(null);
    this.returnSelections.set([]);
    this.searchResults.set([]);
    this.exchangeMode.set(false);
    this.exchangeCredit.set(0);
    this.managerPin.set('');
    this.showManagerOverride.set(false);
    this.activeTab.set('lookup');
  }

  getRefundMethodLabel(method: RefundMethod): string {
    switch (method) {
      case 'original_payment': return 'Original Payment';
      case 'store_credit': return 'Store Credit';
      case 'cash': return 'Cash';
      default: return method;
    }
  }
}
