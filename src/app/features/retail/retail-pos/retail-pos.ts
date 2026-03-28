import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, ElementRef, viewChild, DestroyRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RetailCheckoutService } from '../../../services/retail-checkout';
import { RetailCatalogService } from '../../../services/retail-catalog';
import { PaymentTerminal } from '../../../shared/payment-terminal';
import type {
  RetailItem,
  RetailItemVariation,
  RetailCartItem,
  RetailPayment,
  RetailPaymentMethod,
  QuickKey,
  QuickKeyFormData,
  LayawayRecord,
  ReceiptTemplate,
} from '../../../models/retail.model';

type PosModal = 'none' | 'payment' | 'search' | 'variation-picker' | 'price-override' | 'quick-key-config' | 'weight-entry' | 'layaway' | 'layaway-payment' | 'receipt-settings';
type PaymentStep = 'method' | 'cash' | 'card' | 'gift-card' | 'store-credit' | 'split' | 'complete';

const QUICK_KEY_COLORS = [
  '#006aff', '#16a34a', '#dc2626', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#a855f7', '#0ea5e9', '#65a30d',
  '#ef4444',
];

@Component({
  selector: 'os-retail-pos',
  standalone: true,
  imports: [FormsModule, DecimalPipe, PaymentTerminal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './retail-pos.html',
  styleUrl: './retail-pos.scss',
})
export class RetailPos implements OnInit {
  private readonly checkoutService = inject(RetailCheckoutService);
  readonly catalogService = inject(RetailCatalogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly barcodeInput = viewChild<ElementRef<HTMLInputElement>>('barcodeInput');

  // Service data
  readonly cart = this.checkoutService.cart;
  readonly cartItemCount = this.checkoutService.cartItemCount;
  readonly cartSubtotal = this.checkoutService.cartSubtotal;
  readonly cartTax = this.checkoutService.cartTax;
  readonly cartDiscount = this.checkoutService.cartDiscount;
  readonly cartTotal = this.checkoutService.cartTotal;
  readonly isProcessing = this.checkoutService.isProcessing;
  readonly error = this.checkoutService.error;
  readonly lastTransaction = this.checkoutService.lastTransaction;
  readonly quickKeys = this.checkoutService.quickKeys;

  // UI State
  readonly activeModal = signal<PosModal>('none');
  readonly barcodeValue = signal('');
  readonly searchQuery = signal('');
  readonly isGiftReceipt = signal(false);

  // Barcode flash feedback
  readonly scanFlash = signal(false);
  readonly scanFlashMessage = signal('');

  // Payment
  readonly paymentStep = signal<PaymentStep>('method');
  readonly cashTendered = signal(0);
  readonly splitPayments = signal<RetailPayment[]>([]);

  // Gift Card
  readonly giftCardNumber = signal('');
  readonly giftCardBalance = signal<number | null>(null);
  readonly giftCardApplyAmount = signal(0);
  readonly isLookingUpGiftCard = signal(false);

  // Store Credit
  readonly storeCreditCustomerId = signal('');
  readonly storeCreditBalance = signal<number | null>(null);
  readonly storeCreditApplyAmount = signal(0);
  readonly isLookingUpStoreCredit = signal(false);

  // Split tender
  readonly splitMethod = signal<RetailPaymentMethod>('cash');
  readonly splitAmount = signal(0);

  // Layaway
  readonly layaways = this.checkoutService.activeLayaways;
  readonly layawayCustomerId = signal('');
  readonly layawayDepositAmount = signal(0);
  readonly layawayDepositMethod = signal<RetailPaymentMethod>('cash');
  readonly selectedLayaway = signal<LayawayRecord | null>(null);
  readonly layawayPaymentAmount = signal(0);
  readonly layawayPaymentMethod = signal<RetailPaymentMethod>('cash');

  // Receipt settings
  readonly receiptTemplate = this.checkoutService.receiptTemplate;

  // Variation picker
  readonly pickerItem = signal<RetailItem | null>(null);

  // Price override
  readonly overrideIndex = signal(-1);
  readonly overridePrice = signal(0);
  readonly overrideReason = signal('');

  // Weight entry
  readonly weightIndex = signal(-1);
  readonly weightValue = signal(0);

  // Quick key config
  readonly configPosition = signal(0);
  readonly configItemId = signal('');
  readonly configVariationId = signal<string | null>(null);
  readonly configLabel = signal('');
  readonly configColor = signal('#006aff');

  // Search
  readonly searchResults = computed(() => {
    const q = this.searchQuery();
    if (!q || q.length < 2) return [];
    return this.checkoutService.searchItems(q);
  });

  // Quick key grid (4x4 = 16 positions)
  readonly quickKeyGrid = computed(() => {
    const keys = this.quickKeys();
    const grid: (QuickKey | null)[] = [];
    for (let i = 0; i < 16; i++) {
      grid.push(keys.find(k => k.position === i) ?? null);
    }
    return grid;
  });

  readonly changeAmount = computed(() =>
    this.checkoutService.calculateChange(this.cashTendered())
  );

  readonly splitRemaining = computed(() => {
    const paid = this.splitPayments().reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, this.cartTotal() - paid);
  });

  readonly availableColors = QUICK_KEY_COLORS;

  ngOnInit(): void {
    this.catalogService.loadItems();
    this.checkoutService.loadQuickKeys();
    this.checkoutService.loadLayaways();
    this.checkoutService.loadReceiptTemplate();
    this.focusBarcodeInput();
  }

  // --- Barcode Scanning ---

  updateBarcode(value: string): void {
    this.barcodeValue.set(value);
  }

  async onBarcodeScan(): Promise<void> {
    const barcode = this.barcodeValue().trim();
    if (!barcode) return;

    this.barcodeValue.set('');
    const result = await this.checkoutService.addItemByBarcode(barcode);

    if (result) {
      this.showScanFlash('Added');
    } else if (this.error() === 'VARIATION_PICKER_NEEDED') {
      const item = this.checkoutService.lookupBarcode(barcode);
      if (item) {
        this.pickerItem.set(item);
        this.activeModal.set('variation-picker');
      }
      this.checkoutService.clearError();
    }
    // else error is shown via error signal

    this.focusBarcodeInput();
  }

  private showScanFlash(message: string): void {
    this.scanFlashMessage.set(message);
    this.scanFlash.set(true);
    setTimeout(() => this.scanFlash.set(false), 800);
  }

  private focusBarcodeInput(): void {
    setTimeout(() => {
      this.barcodeInput()?.nativeElement.focus();
    }, 50);
  }

  // --- Item Search ---

  openSearch(): void {
    this.searchQuery.set('');
    this.activeModal.set('search');
  }

  updateSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  selectSearchItem(item: RetailItem): void {
    if (item.variations.length > 0) {
      this.pickerItem.set(item);
      this.activeModal.set('variation-picker');
    } else {
      this.checkoutService.addItemManually(item, null);
      this.activeModal.set('none');
      this.focusBarcodeInput();
    }
  }

  // --- Variation Picker ---

  selectVariation(variation: RetailItemVariation): void {
    const item = this.pickerItem();
    if (!item) return;
    this.checkoutService.addItemManually(item, variation);
    this.activeModal.set('none');
    this.pickerItem.set(null);
    this.focusBarcodeInput();
  }

  // --- Cart Operations ---

  incrementQuantity(index: number): void {
    const item = this.cart()[index];
    if (item) {
      this.checkoutService.updateQuantity(index, item.quantity + 1);
    }
  }

  decrementQuantity(index: number): void {
    const item = this.cart()[index];
    if (item) {
      this.checkoutService.updateQuantity(index, item.quantity - 1);
    }
  }

  removeCartItem(index: number): void {
    this.checkoutService.removeItem(index);
  }

  openWeightEntry(index: number): void {
    this.weightIndex.set(index);
    this.weightValue.set(this.cart()[index]?.weight ?? 0);
    this.activeModal.set('weight-entry');
  }

  updateWeightValue(value: string): void {
    this.weightValue.set(Number.parseFloat(value) || 0);
  }

  submitWeight(): void {
    this.checkoutService.setWeight(this.weightIndex(), this.weightValue());
    this.activeModal.set('none');
  }

  openPriceOverride(index: number): void {
    const item = this.cart()[index];
    if (!item) return;
    this.overrideIndex.set(index);
    this.overridePrice.set(item.priceOverride ?? item.unitPrice);
    this.overrideReason.set('');
    this.activeModal.set('price-override');
  }

  updateOverridePrice(value: string): void {
    this.overridePrice.set(Number.parseFloat(value) || 0);
  }

  updateOverrideReason(value: string): void {
    this.overrideReason.set(value);
  }

  submitPriceOverride(): void {
    this.checkoutService.overridePrice(
      this.overrideIndex(),
      this.overridePrice(),
      this.overrideReason()
    );
    this.activeModal.set('none');
  }

  clearCart(): void {
    this.checkoutService.clearCart();
    this.focusBarcodeInput();
  }

  toggleGiftReceipt(): void {
    this.isGiftReceipt.update(v => !v);
  }

  // --- Payment ---

  openPayment(): void {
    this.paymentStep.set('method');
    this.cashTendered.set(0);
    this.splitPayments.set([]);
    this.activeModal.set('payment');
  }

  readonly cardPaymentOrderId = signal<string | null>(null);
  readonly cardPaymentError = signal<string | null>(null);

  selectPaymentMethod(method: RetailPaymentMethod): void {
    if (method === 'cash') {
      this.paymentStep.set('cash');
    } else if (method === 'card') {
      this.cardPaymentError.set(null);
      this.cardPaymentOrderId.set(crypto.randomUUID());
      this.paymentStep.set('card');
    } else if (method === 'gift_card') {
      this.giftCardNumber.set('');
      this.giftCardBalance.set(null);
      this.giftCardApplyAmount.set(this.cartTotal());
      this.paymentStep.set('gift-card');
    } else if (method === 'store_credit') {
      this.storeCreditCustomerId.set('');
      this.storeCreditBalance.set(null);
      this.storeCreditApplyAmount.set(this.cartTotal());
      this.paymentStep.set('store-credit');
    } else {
      this.processSimplePayment(method);
    }
  }

  async onCardPaymentComplete(): Promise<void> {
    // Card payment collected — record the retail transaction
    const payment: RetailPayment = {
      method: 'card',
      amount: this.cartTotal(),
      reference: null,
    };
    const result = await this.checkoutService.processPayment([payment], this.isGiftReceipt());
    if (result) {
      this.paymentStep.set('complete');
    }
  }

  onCardPaymentFailed(errorMessage: string): void {
    this.cardPaymentError.set(errorMessage);
  }

  updateCashTendered(value: string): void {
    this.cashTendered.set(Number.parseFloat(value) || 0);
  }

  async processCashPayment(): Promise<void> {
    const payment: RetailPayment = {
      method: 'cash',
      amount: this.cartTotal(),
      reference: null,
    };
    const result = await this.checkoutService.processPayment([payment], this.isGiftReceipt());
    if (result) {
      this.paymentStep.set('complete');
    }
  }

  private async processSimplePayment(method: RetailPaymentMethod): Promise<void> {
    const payment: RetailPayment = {
      method,
      amount: this.cartTotal(),
      reference: null,
    };
    const result = await this.checkoutService.processPayment([payment], this.isGiftReceipt());
    if (result) {
      this.paymentStep.set('complete');
    }
  }

  startSplitTender(): void {
    this.paymentStep.set('split');
    this.splitPayments.set([]);
    this.splitMethod.set('cash');
    this.splitAmount.set(0);
  }

  updateSplitMethod(value: RetailPaymentMethod): void {
    this.splitMethod.set(value);
  }

  updateSplitAmount(value: string): void {
    this.splitAmount.set(Number.parseFloat(value) || 0);
  }

  addSplitPayment(): void {
    const amount = this.splitAmount();
    const method = this.splitMethod();
    if (amount <= 0) return;
    this.splitPayments.update(payments => [
      ...payments,
      { method, amount, reference: null },
    ]);
    this.splitAmount.set(0);
  }

  removeSplitPayment(index: number): void {
    this.splitPayments.update(payments => payments.filter((_, i) => i !== index));
  }

  async completeSplitPayment(): Promise<void> {
    const result = await this.checkoutService.processPayment(
      this.splitPayments(),
      this.isGiftReceipt()
    );
    if (result) {
      this.paymentStep.set('complete');
    }
  }

  // --- Gift Card ---

  updateGiftCardNumber(value: string): void {
    this.giftCardNumber.set(value);
  }

  updateGiftCardApplyAmount(value: string): void {
    this.giftCardApplyAmount.set(Number.parseFloat(value) || 0);
  }

  async lookupGiftCard(): Promise<void> {
    const cardNumber = this.giftCardNumber().trim();
    if (!cardNumber) return;
    this.isLookingUpGiftCard.set(true);

    const result = await this.checkoutService.lookupGiftCard(cardNumber);
    if (result) {
      this.giftCardBalance.set(result.balance);
      this.giftCardApplyAmount.set(Math.min(result.balance, this.cartTotal()));
    }
    this.isLookingUpGiftCard.set(false);
  }

  async processGiftCardPayment(): Promise<void> {
    const applyAmount = this.giftCardApplyAmount();
    const balance = this.giftCardBalance() ?? 0;
    const total = this.cartTotal();

    if (applyAmount > balance) return;

    if (applyAmount >= total) {
      // Full payment via gift card
      const payment: RetailPayment = {
        method: 'gift_card',
        amount: total,
        reference: this.giftCardNumber(),
      };
      const result = await this.checkoutService.processPayment([payment], this.isGiftReceipt());
      if (result) {
        this.paymentStep.set('complete');
      }
    } else {
      // Partial — start split tender with gift card as first payment
      this.splitPayments.set([{
        method: 'gift_card',
        amount: applyAmount,
        reference: this.giftCardNumber(),
      }]);
      this.splitAmount.set(0);
      this.paymentStep.set('split');
    }
  }

  // --- Store Credit ---

  updateStoreCreditCustomerId(value: string): void {
    this.storeCreditCustomerId.set(value);
  }

  updateStoreCreditApplyAmount(value: string): void {
    this.storeCreditApplyAmount.set(Number.parseFloat(value) || 0);
  }

  async lookupStoreCredit(): Promise<void> {
    const customerId = this.storeCreditCustomerId().trim();
    if (!customerId) return;
    this.isLookingUpStoreCredit.set(true);

    const result = await this.checkoutService.lookupStoreCredit(customerId);
    if (result) {
      this.storeCreditBalance.set(result.balance);
      this.storeCreditApplyAmount.set(Math.min(result.balance, this.cartTotal()));
    }
    this.isLookingUpStoreCredit.set(false);
  }

  async processStoreCreditPayment(): Promise<void> {
    const applyAmount = this.storeCreditApplyAmount();
    const balance = this.storeCreditBalance() ?? 0;
    const total = this.cartTotal();

    if (applyAmount > balance) return;

    if (applyAmount >= total) {
      const payment: RetailPayment = {
        method: 'store_credit',
        amount: total,
        reference: this.storeCreditCustomerId(),
      };
      const result = await this.checkoutService.processPayment([payment], this.isGiftReceipt());
      if (result) {
        this.paymentStep.set('complete');
      }
    } else {
      this.splitPayments.set([{
        method: 'store_credit',
        amount: applyAmount,
        reference: this.storeCreditCustomerId(),
      }]);
      this.splitAmount.set(0);
      this.paymentStep.set('split');
    }
  }

  // --- Layaway ---

  openLayaway(): void {
    this.layawayCustomerId.set('');
    this.layawayDepositAmount.set(Math.ceil(this.cartTotal() * 0.2 * 100) / 100);
    this.layawayDepositMethod.set('cash');
    this.activeModal.set('layaway');
  }

  updateLayawayCustomerId(value: string): void { this.layawayCustomerId.set(value); }
  updateLayawayDepositAmount(value: string): void { this.layawayDepositAmount.set(Number.parseFloat(value) || 0); }
  updateLayawayDepositMethod(value: RetailPaymentMethod): void { this.layawayDepositMethod.set(value); }

  async createLayaway(): Promise<void> {
    const result = await this.checkoutService.createLayaway(
      this.layawayCustomerId(),
      this.layawayDepositAmount(),
      this.layawayDepositMethod()
    );
    if (result) {
      this.activeModal.set('none');
      this.focusBarcodeInput();
    }
  }

  openLayawayPayment(layaway: LayawayRecord): void {
    this.selectedLayaway.set(layaway);
    this.layawayPaymentAmount.set(layaway.remainingBalance);
    this.layawayPaymentMethod.set('cash');
    this.activeModal.set('layaway-payment');
  }

  updateLayawayPaymentAmount(value: string): void { this.layawayPaymentAmount.set(Number.parseFloat(value) || 0); }
  updateLayawayPaymentMethod(value: RetailPaymentMethod): void { this.layawayPaymentMethod.set(value); }

  async submitLayawayPayment(): Promise<void> {
    const layaway = this.selectedLayaway();
    if (!layaway) return;

    await this.checkoutService.makeLayawayPayment(
      layaway.id,
      this.layawayPaymentAmount(),
      this.layawayPaymentMethod()
    );
    this.activeModal.set('none');
  }

  async cancelLayaway(layawayId: string): Promise<void> {
    await this.checkoutService.cancelLayaway(layawayId);
  }

  // --- Receipt Settings ---

  readonly receiptStoreName = signal('');
  readonly receiptStoreAddress = signal('');
  readonly receiptStorePhone = signal('');
  readonly receiptReturnPolicy = signal('');
  readonly receiptPromoMessage = signal('');
  readonly receiptShowSku = signal(true);
  readonly receiptShowBarcode = signal(false);

  openReceiptSettings(): void {
    const t = this.receiptTemplate();
    this.receiptStoreName.set(t?.storeName ?? '');
    this.receiptStoreAddress.set(t?.storeAddress ?? '');
    this.receiptStorePhone.set(t?.storePhone ?? '');
    this.receiptReturnPolicy.set(t?.returnPolicyText ?? '');
    this.receiptPromoMessage.set(t?.promoMessage ?? '');
    this.receiptShowSku.set(t?.showSku ?? true);
    this.receiptShowBarcode.set(t?.showBarcode ?? false);
    this.activeModal.set('receipt-settings');
  }

  updateReceiptStoreName(value: string): void { this.receiptStoreName.set(value); }
  updateReceiptStoreAddress(value: string): void { this.receiptStoreAddress.set(value); }
  updateReceiptStorePhone(value: string): void { this.receiptStorePhone.set(value); }
  updateReceiptReturnPolicy(value: string): void { this.receiptReturnPolicy.set(value); }
  updateReceiptPromoMessage(value: string): void { this.receiptPromoMessage.set(value); }
  toggleReceiptShowSku(): void { this.receiptShowSku.update(v => !v); }
  toggleReceiptShowBarcode(): void { this.receiptShowBarcode.update(v => !v); }

  async saveReceiptSettings(): Promise<void> {
    const template: ReceiptTemplate = {
      logoUrl: null,
      storeName: this.receiptStoreName(),
      storeAddress: this.receiptStoreAddress(),
      storePhone: this.receiptStorePhone(),
      returnPolicyText: this.receiptReturnPolicy(),
      promoMessage: this.receiptPromoMessage(),
      showSku: this.receiptShowSku(),
      showBarcode: this.receiptShowBarcode(),
    };
    await this.checkoutService.saveReceiptTemplate(template);
    this.activeModal.set('none');
  }

  getPaymentMethodLabel(method: RetailPaymentMethod): string {
    switch (method) {
      case 'cash': return 'Cash';
      case 'card': return 'Card';
      case 'gift_card': return 'Gift Card';
      case 'store_credit': return 'Store Credit';
      case 'layaway_deposit': return 'Layaway';
      default: return method;
    }
  }

  closePayment(): void {
    this.activeModal.set('none');
    this.isGiftReceipt.set(false);
    this.cardPaymentOrderId.set(null);
    this.focusBarcodeInput();
  }

  startNewTransaction(): void {
    this.activeModal.set('none');
    this.isGiftReceipt.set(false);
    this.focusBarcodeInput();
  }

  // --- Quick Keys ---

  onQuickKeyTap(key: QuickKey): void {
    const item = this.catalogService.items().find(i => i.id === key.itemId);
    if (!item) return;

    const variation = key.variationId
      ? item.variations.find(v => v.id === key.variationId) ?? null
      : null;

    this.checkoutService.addItemManually(item, variation);
    this.showScanFlash(key.label);
  }

  openQuickKeyConfig(position: number): void {
    const existing = this.quickKeys().find(k => k.position === position);
    this.configPosition.set(position);
    this.configItemId.set(existing?.itemId ?? '');
    this.configVariationId.set(existing?.variationId ?? null);
    this.configLabel.set(existing?.label ?? '');
    this.configColor.set(existing?.color ?? '#006aff');
    this.activeModal.set('quick-key-config');
  }

  updateConfigItemId(value: string): void {
    this.configItemId.set(value);
    // Auto-fill label from item name
    const item = this.catalogService.items().find(i => i.id === value);
    if (item && !this.configLabel()) {
      this.configLabel.set(item.name);
    }
  }

  updateConfigVariationId(value: string): void {
    this.configVariationId.set(value || null);
  }

  updateConfigLabel(value: string): void {
    this.configLabel.set(value);
  }

  updateConfigColor(value: string): void {
    this.configColor.set(value);
  }

  async saveQuickKey(): Promise<void> {
    const formData: QuickKeyFormData = {
      itemId: this.configItemId(),
      variationId: this.configVariationId(),
      label: this.configLabel(),
      position: this.configPosition(),
      color: this.configColor(),
    };
    await this.checkoutService.saveQuickKey(formData);
    this.activeModal.set('none');
  }

  async deleteQuickKey(keyId: string): Promise<void> {
    await this.checkoutService.deleteQuickKey(keyId);
    this.activeModal.set('none');
  }

  closeModal(): void {
    this.activeModal.set('none');
    this.pickerItem.set(null);
    this.focusBarcodeInput();
  }

  getCartItemPrice(item: RetailCartItem): number {
    return item.priceOverride ?? item.unitPrice;
  }

  getCartItemTotal(item: RetailCartItem): number {
    const price = item.priceOverride ?? item.unitPrice;
    const qty = item.weight ?? item.quantity;
    return (price * qty) - item.discount;
  }

  getConfigItemVariations(): RetailItemVariation[] {
    const itemId = this.configItemId();
    if (!itemId) return [];
    const item = this.catalogService.items().find(i => i.id === itemId);
    return item?.variations ?? [];
  }
}
