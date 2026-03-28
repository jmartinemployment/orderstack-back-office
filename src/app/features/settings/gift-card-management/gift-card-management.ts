import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { GiftCardService } from '../../../services/gift-card';
import { AuthService } from '../../../services/auth';
import { GiftCard, GiftCardFormData, GiftCardType, GiftCardRedemption, GiftCardActivation, GIFT_CARD_AMOUNTS } from '../../../models/index';

@Component({
  selector: 'os-gift-card-management',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './gift-card-management.html',
  styleUrl: './gift-card-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GiftCardManagement {
  private readonly giftCardService = inject(GiftCardService);
  private readonly authService = inject(AuthService);

  readonly giftCards = this.giftCardService.giftCards;
  readonly activeCards = this.giftCardService.activeCards;
  readonly totalOutstanding = this.giftCardService.totalOutstandingBalance;
  readonly isLoading = this.giftCardService.isLoading;
  readonly error = this.giftCardService.error;

  readonly amounts = GIFT_CARD_AMOUNTS;

  // UI state
  private readonly _showCreateForm = signal(false);
  private readonly _showDetail = signal<GiftCard | null>(null);
  private readonly _isSaving = signal(false);
  private readonly _searchQuery = signal('');
  private readonly _balanceCheckCode = signal('');
  private readonly _balanceResult = signal<{ balance: number; status: string } | null>(null);
  private readonly _isCheckingBalance = signal(false);
  private readonly _redemptions = signal<GiftCardRedemption[]>([]);

  // Form state
  private readonly _formType = signal<GiftCardType>('digital');
  private readonly _formAmount = signal(25);
  private readonly _formCustomAmount = signal(0);
  private readonly _formRecipientName = signal('');
  private readonly _formRecipientEmail = signal('');
  private readonly _formPurchaserEmail = signal('');
  private readonly _formMessage = signal('');

  readonly showCreateForm = this._showCreateForm.asReadonly();
  readonly showDetail = this._showDetail.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly balanceCheckCode = this._balanceCheckCode.asReadonly();
  readonly balanceResult = this._balanceResult.asReadonly();
  readonly isCheckingBalance = this._isCheckingBalance.asReadonly();
  readonly redemptions = this._redemptions.asReadonly();
  readonly formType = this._formType.asReadonly();
  readonly formAmount = this._formAmount.asReadonly();
  readonly formCustomAmount = this._formCustomAmount.asReadonly();
  readonly formRecipientName = this._formRecipientName.asReadonly();
  readonly formRecipientEmail = this._formRecipientEmail.asReadonly();
  readonly formPurchaserEmail = this._formPurchaserEmail.asReadonly();
  readonly formMessage = this._formMessage.asReadonly();

  readonly isCustomAmount = computed(() => !GIFT_CARD_AMOUNTS.includes(this._formAmount()));

  readonly effectiveAmount = computed(() => {
    if (this.isCustomAmount()) return this._formCustomAmount();
    return this._formAmount();
  });

  readonly filteredCards = computed(() => {
    const query = this._searchQuery().toLowerCase().trim();
    if (!query) return this.giftCards();
    return this.giftCards().filter(c =>
      c.code.toLowerCase().includes(query) ||
      (c.recipientName ?? '').toLowerCase().includes(query) ||
      (c.purchaserEmail ?? '').toLowerCase().includes(query)
    );
  });

  readonly totalCards = computed(() => this.giftCards().length);
  readonly physicalCards = this.giftCardService.physicalCards;
  readonly digitalCards = this.giftCardService.digitalCards;

  readonly totalRedeemed = computed(() =>
    this.giftCards()
      .filter(c => c.status === 'redeemed' || c.currentBalance < c.originalBalance)
      .reduce((sum, c) => sum + (c.originalBalance - c.currentBalance), 0)
  );

  // Physical activation
  private readonly _showActivateForm = signal(false);
  private readonly _activateCardNumber = signal('');
  private readonly _activateAmount = signal(25);
  private readonly _isActivating = signal(false);
  private readonly _activateError = signal<string | null>(null);

  readonly showActivateForm = this._showActivateForm.asReadonly();
  readonly activateCardNumber = this._activateCardNumber.asReadonly();
  readonly activateAmount = this._activateAmount.asReadonly();
  readonly isActivating = this._isActivating.asReadonly();
  readonly activateError = this._activateError.asReadonly();

  constructor() {
    if (this.authService.isAuthenticated() && this.authService.selectedMerchantId()) {
      this.giftCardService.loadGiftCards();
    }
  }

  // --- Create form ---

  openCreateForm(): void {
    this._formType.set('digital');
    this._formAmount.set(25);
    this._formCustomAmount.set(0);
    this._formRecipientName.set('');
    this._formRecipientEmail.set('');
    this._formPurchaserEmail.set('');
    this._formMessage.set('');
    this._showCreateForm.set(true);
  }

  closeCreateForm(): void {
    this._showCreateForm.set(false);
  }

  setFormType(type: GiftCardType): void {
    this._formType.set(type);
  }

  selectAmount(amount: number): void {
    this._formAmount.set(amount);
  }

  selectCustomAmount(): void {
    this._formAmount.set(0);
  }

  onFormField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    switch (field) {
      case 'customAmount': this._formCustomAmount.set(Number.parseFloat(value) || 0); break;
      case 'recipientName': this._formRecipientName.set(value); break;
      case 'recipientEmail': this._formRecipientEmail.set(value); break;
      case 'purchaserEmail': this._formPurchaserEmail.set(value); break;
      case 'message': this._formMessage.set(value); break;
    }
  }

  async createCard(): Promise<void> {
    const amount = this.effectiveAmount();
    if (amount <= 0 || this._isSaving()) return;

    this._isSaving.set(true);

    const data: GiftCardFormData = {
      type: this._formType(),
      amount,
      recipientName: this._formRecipientName().trim() || undefined,
      recipientEmail: this._formRecipientEmail().trim() || undefined,
      purchaserEmail: this._formPurchaserEmail().trim() || undefined,
      message: this._formMessage().trim() || undefined,
    };

    const card = await this.giftCardService.createGiftCard(data);
    this._isSaving.set(false);

    if (card) {
      this.closeCreateForm();
      this._showDetail.set(card);
    }
  }

  // --- Search & balance ---

  onSearchInput(event: Event): void {
    this._searchQuery.set((event.target as HTMLInputElement).value);
  }

  onBalanceCodeInput(event: Event): void {
    this._balanceCheckCode.set((event.target as HTMLInputElement).value);
    this._balanceResult.set(null);
  }

  async checkBalance(): Promise<void> {
    const code = this._balanceCheckCode().trim();
    if (!code) return;

    this._isCheckingBalance.set(true);
    const result = await this.giftCardService.checkBalance(code);
    this._isCheckingBalance.set(false);

    if (result) {
      this._balanceResult.set({ balance: result.currentBalance, status: result.status });
    } else {
      this._balanceResult.set(null);
    }
  }

  // --- Detail ---

  async openDetail(card: GiftCard): Promise<void> {
    this._showDetail.set(card);
    const history = await this.giftCardService.getRedemptionHistory(card.id);
    this._redemptions.set(history);
  }

  closeDetail(): void {
    this._showDetail.set(null);
    this._redemptions.set([]);
  }

  async disableCard(card: GiftCard): Promise<void> {
    const success = await this.giftCardService.disableGiftCard(card.id);
    if (success) {
      this.closeDetail();
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'gc-status-active';
      case 'redeemed': return 'gc-status-redeemed';
      case 'expired': return 'gc-status-expired';
      case 'disabled': return 'gc-status-disabled';
      default: return '';
    }
  }

  getBalancePercent(card: GiftCard): number {
    if (card.originalBalance === 0) return 0;
    return (card.currentBalance / card.originalBalance) * 100;
  }

  // --- Physical Card Activation ---

  openActivateForm(): void {
    this._activateCardNumber.set('');
    this._activateAmount.set(25);
    this._activateError.set(null);
    this._showActivateForm.set(true);
  }

  closeActivateForm(): void {
    this._showActivateForm.set(false);
    this._activateError.set(null);
  }

  onActivateField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'cardNumber') this._activateCardNumber.set(value);
    if (field === 'amount') this._activateAmount.set(Number.parseFloat(value) || 0);
  }

  selectActivateAmount(amount: number): void {
    this._activateAmount.set(amount);
  }

  async activateCard(): Promise<void> {
    const cardNumber = this._activateCardNumber().trim();
    const amount = this._activateAmount();
    if (!cardNumber || amount <= 0 || this._isActivating()) return;

    this._isActivating.set(true);
    this._activateError.set(null);

    const activation: GiftCardActivation = { cardNumber, amount };
    const card = await this.giftCardService.activatePhysicalCard(activation);

    this._isActivating.set(false);

    if (card) {
      this.closeActivateForm();
      this._showDetail.set(card);
    } else {
      this._activateError.set(this.giftCardService.error() ?? 'Activation failed');
    }
  }
}
