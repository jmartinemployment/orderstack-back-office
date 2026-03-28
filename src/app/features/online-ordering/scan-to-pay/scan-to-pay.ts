import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { OrderService } from '../../../services/order';
import { Check, ScanToPaySession } from '../../../models/index';

type PageState = 'loading' | 'check' | 'confirm-tip' | 'paying' | 'success' | 'error';
type PayMode = 'full' | 'items';

@Component({
  selector: 'os-scan-to-pay',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './scan-to-pay.html',
  styleUrl: './scan-to-pay.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanToPay implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  // State
  private readonly _pageState = signal<PageState>('loading');
  private readonly _session = signal<(ScanToPaySession & { check: Check; restaurantName: string; restaurantLogo?: string; allowSplitPay?: boolean; emailReceiptEnabled?: boolean }) | null>(null);
  private readonly _errorMessage = signal('');
  private readonly _receiptNumber = signal('');

  // Pay mode (full check vs my items)
  private readonly _payMode = signal<PayMode | null>(null);
  private readonly _selectedItemGuids = signal<Set<string>>(new Set());

  // Tip
  private readonly _tipPercent = signal(20);
  private readonly _customTipAmount = signal<number | null>(null);
  private readonly _showCustomTip = signal(false);

  // Payment
  private readonly _cardNumber = signal('');
  private readonly _cardExpiry = signal('');
  private readonly _cardCvc = signal('');
  private readonly _cardName = signal('');
  private readonly _isProcessing = signal(false);

  // Email receipt
  private readonly _email = signal('');
  private readonly _emailSent = signal(false);
  private readonly _isSendingEmail = signal(false);

  // Remaining balance (for split pay)
  private readonly _remainingBalance = signal<number | null>(null);

  readonly pageState = this._pageState.asReadonly();
  readonly session = this._session.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly receiptNumber = this._receiptNumber.asReadonly();
  readonly payMode = this._payMode.asReadonly();
  readonly tipPercent = this._tipPercent.asReadonly();
  readonly customTipAmount = this._customTipAmount.asReadonly();
  readonly showCustomTip = this._showCustomTip.asReadonly();
  readonly cardNumber = this._cardNumber.asReadonly();
  readonly cardExpiry = this._cardExpiry.asReadonly();
  readonly cardCvc = this._cardCvc.asReadonly();
  readonly cardName = this._cardName.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly email = this._email.asReadonly();
  readonly emailSent = this._emailSent.asReadonly();
  readonly isSendingEmail = this._isSendingEmail.asReadonly();
  readonly remainingBalance = this._remainingBalance.asReadonly();

  readonly tipPresets = [15, 18, 20, 25];

  readonly allowSplitPay = computed(() => this._session()?.allowSplitPay ?? false);
  readonly emailReceiptEnabled = computed(() => this._session()?.emailReceiptEnabled ?? true);

  readonly selections = computed(() => this._session()?.check.selections ?? []);

  readonly selectedItemCount = computed(() => this._selectedItemGuids().size);

  readonly subtotal = computed(() => {
    const s = this._session();
    if (!s) return 0;
    if (this._payMode() === 'items') {
      const guids = this._selectedItemGuids();
      return s.check.selections
        .filter(sel => guids.has(sel.guid))
        .reduce((sum, sel) => sum + sel.totalPrice, 0);
    }
    return s.check.subtotal;
  });

  readonly taxAmount = computed(() => {
    const s = this._session();
    if (!s) return 0;
    if (this._payMode() === 'items') {
      // Proportional tax
      const fullSubtotal = s.check.subtotal || 1;
      return Math.round(s.check.taxAmount * (this.subtotal() / fullSubtotal) * 100) / 100;
    }
    return s.check.taxAmount;
  });

  readonly tipAmount = computed(() => {
    if (this._customTipAmount() !== null) return this._customTipAmount()!;
    return Math.round(this.subtotal() * this._tipPercent() / 100 * 100) / 100;
  });

  readonly totalWithTip = computed(() => {
    return this.subtotal() + this.taxAmount() + this.tipAmount();
  });

  readonly restaurantName = computed(() => this._session()?.restaurantName ?? '');
  readonly restaurantLogo = computed(() => this._session()?.restaurantLogo);

  readonly canPay = computed(() => {
    return this._cardNumber().length >= 15 &&
      this._cardExpiry().length >= 5 &&
      this._cardCvc().length >= 3 &&
      this._cardName().trim().length > 0 &&
      !this._isProcessing() &&
      (this._payMode() !== 'items' || this._selectedItemGuids().size > 0);
  });

  readonly isItemSelected = (guid: string): boolean => {
    return this._selectedItemGuids().has(guid);
  };

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('checkToken');
    if (!token) {
      this._errorMessage.set('Invalid payment link');
      this._pageState.set('error');
      return;
    }
    this.loadCheck(token);
  }

  private async loadCheck(token: string): Promise<void> {
    const result = await this.orderService.getCheckByToken(token);

    if (!result) {
      this._errorMessage.set('This payment link is invalid or has expired.');
      this._pageState.set('error');
      return;
    }

    if (result.status === 'completed') {
      this._errorMessage.set('This check has already been paid.');
      this._pageState.set('error');
      return;
    }

    if (result.status === 'expired') {
      this._errorMessage.set('This payment link has expired. Please ask your server for a new one.');
      this._pageState.set('error');
      return;
    }

    this._session.set(result);
    this._pageState.set('check');

    // Auto-select full pay mode when split pay is not allowed
    if (!result.allowSplitPay) {
      this.selectPayMode('full');
    }
  }

  // --- Pay mode ---

  selectPayMode(mode: PayMode): void {
    this._payMode.set(mode);
    this._selectedItemGuids.set(new Set());
    if (mode === 'full') {
      // Select all items
      const allGuids = new Set(this.selections().map(s => s.guid));
      this._selectedItemGuids.set(allGuids);
    }
  }

  toggleItemSelection(guid: string): void {
    this._selectedItemGuids.update(set => {
      const next = new Set(set);
      if (next.has(guid)) {
        next.delete(guid);
      } else {
        next.add(guid);
      }
      return next;
    });
  }

  checkItemSelected(guid: string): boolean {
    return this._selectedItemGuids().has(guid);
  }

  // --- Tip ---

  selectTipPercent(percent: number): void {
    this._tipPercent.set(percent);
    this._customTipAmount.set(null);
    this._showCustomTip.set(false);
  }

  openCustomTip(): void {
    this._showCustomTip.set(true);
    this._customTipAmount.set(null);
  }

  setCustomTipAmount(value: string): void {
    const amount = Number.parseFloat(value);
    if (!Number.isNaN(amount) && amount >= 0) {
      this._customTipAmount.set(Math.round(amount * 100) / 100);
    } else {
      this._customTipAmount.set(null);
    }
  }

  // --- Card input ---

  setCardNumber(value: string): void {
    this._cardNumber.set(value.replaceAll(/[^\d\s]/g, '').slice(0, 19));
  }

  setCardExpiry(value: string): void {
    let clean = value.replaceAll(/[^\d/]/g, '');
    if (clean.length === 2 && !clean.includes('/') && this._cardExpiry().length < 3) {
      clean += '/';
    }
    this._cardExpiry.set(clean.slice(0, 5));
  }

  setCardCvc(value: string): void {
    this._cardCvc.set(value.replaceAll(/\D/g, '').slice(0, 4));
  }

  setCardName(value: string): void {
    this._cardName.set(value);
  }

  // --- Tip confirmation step ---

  proceedToTipConfirmation(): void {
    this._pageState.set('confirm-tip');
  }

  backToCheck(): void {
    this._pageState.set('check');
  }

  // --- Payment ---

  async submitPayment(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('checkToken');
    if (!token || this._isProcessing()) return;

    this._isProcessing.set(true);
    this._pageState.set('paying');

    const nonce = `card_${this._cardNumber().replaceAll(' ', '').slice(-4)}`;

    let result: { success: boolean; receiptNumber?: string; remainingBalance?: number; error?: string };

    if (this._payMode() === 'items') {
      result = await this.orderService.submitPartialScanToPayment(token, {
        tipAmount: this.tipAmount(),
        paymentMethodNonce: nonce,
        selectedItemGuids: Array.from(this._selectedItemGuids()),
        amount: this.totalWithTip(),
      });
    } else {
      const fullResult = await this.orderService.submitScanToPayment(token, {
        tipAmount: this.tipAmount(),
        paymentMethodNonce: nonce,
      });
      result = fullResult;
    }

    this._isProcessing.set(false);

    if (result.success) {
      this._receiptNumber.set(result.receiptNumber ?? '');
      if (result.remainingBalance !== undefined) {
        this._remainingBalance.set(result.remainingBalance);
      }
      this._pageState.set('success');
    } else {
      this._errorMessage.set(result.error ?? 'Payment failed. Please try again.');
      this._pageState.set('check');
    }
  }

  // --- Email receipt ---

  setEmail(value: string): void {
    this._email.set(value);
  }

  async sendEmailReceipt(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('checkToken');
    const email = this._email().trim();
    if (!token || !email) return;

    this._isSendingEmail.set(true);
    const sent = await this.orderService.sendScanToPayReceipt(token, email);
    this._isSendingEmail.set(false);
    if (sent) {
      this._emailSent.set(true);
    }
  }
}
