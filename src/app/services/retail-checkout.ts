import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  RetailItem,
  RetailItemVariation,
  RetailCartItem,
  RetailTransaction,
  RetailPayment,
  RetailPaymentMethod,
  QuickKey,
  QuickKeyFormData,
  StoreCredit,
  LayawayRecord,
  ReceiptTemplate,
  ReturnRequest,
  ReturnPolicy,
} from '../models/retail.model';
import { RetailCatalogService } from './retail-catalog';
import { RetailInventoryService } from './retail-inventory';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RetailCheckoutService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly catalogService = inject(RetailCatalogService);
  private readonly inventoryService = inject(RetailInventoryService);
  private readonly apiUrl = environment.apiUrl;

  // Cart
  private readonly _cart = signal<RetailCartItem[]>([]);
  private readonly _isProcessing = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _lastTransaction = signal<RetailTransaction | null>(null);

  // Quick Keys
  private readonly _quickKeys = signal<QuickKey[]>([]);

  // Public readonly
  readonly cart = this._cart.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly error = this._error.asReadonly();
  readonly lastTransaction = this._lastTransaction.asReadonly();
  readonly quickKeys = this._quickKeys.asReadonly();

  // Computeds
  readonly cartItems = computed(() => this._cart());
  readonly cartItemCount = computed(() =>
    this._cart().reduce((sum, item) => sum + item.quantity, 0)
  );
  readonly cartSubtotal = computed(() =>
    this._cart().reduce((sum, item) => {
      const price = item.priceOverride ?? item.unitPrice;
      const qty = item.weight ?? item.quantity;
      return sum + (price * qty) - item.discount;
    }, 0)
  );
  readonly cartDiscount = computed(() =>
    this._cart().reduce((sum, item) => sum + item.discount, 0)
  );
  readonly cartTax = computed(() =>
    this.cartSubtotal() * 0.07 // Default 7% — will be configurable
  );
  readonly cartTotal = computed(() =>
    this.cartSubtotal() + this.cartTax()
  );

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  // --- Cart Operations ---

  async addItemByBarcode(barcode: string): Promise<boolean> {
    const item = this.catalogService.items().find(i =>
      i.barcode === barcode ||
      i.variations.some(v => v.barcode === barcode)
    );

    if (!item) {
      this._error.set('Item not found');
      return false;
    }

    // Check if barcode matches a specific variation
    const variation = item.variations.find(v => v.barcode === barcode);
    if (variation) {
      this.addToCart(item, variation);
      return true;
    }

    // If item has variations but barcode is on the item itself
    if (item.variations.length > 0) {
      // Caller should show variation picker — return false to signal this
      this._error.set('VARIATION_PICKER_NEEDED');
      return false;
    }

    this.addToCart(item, null);
    return true;
  }

  async addItemBySku(sku: string): Promise<boolean> {
    const item = this.catalogService.items().find(i =>
      i.sku === sku ||
      i.variations.some(v => v.sku === sku)
    );

    if (!item) {
      this._error.set('Item not found');
      return false;
    }

    const variation = item.variations.find(v => v.sku === sku);
    if (variation) {
      this.addToCart(item, variation);
      return true;
    }

    if (item.variations.length > 0) {
      this._error.set('VARIATION_PICKER_NEEDED');
      return false;
    }

    this.addToCart(item, null);
    return true;
  }

  addItemManually(item: RetailItem, variation: RetailItemVariation | null): void {
    this.addToCart(item, variation);
  }

  private addToCart(item: RetailItem, variation: RetailItemVariation | null): void {
    this._error.set(null);
    const variationId = variation?.id ?? null;

    // Check if already in cart
    const existing = this._cart().findIndex(c =>
      c.itemId === item.id && c.variationId === variationId
    );

    if (existing >= 0) {
      this._cart.update(cart => cart.map((c, i) =>
        i === existing ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      const cartItem: RetailCartItem = {
        itemId: item.id,
        variationId,
        item,
        variation,
        quantity: 1,
        unitPrice: variation?.price ?? item.basePrice,
        priceOverride: null,
        priceOverrideReason: null,
        weight: null,
        discount: 0,
      };
      this._cart.update(cart => [...cart, cartItem]);
    }
  }

  removeItem(index: number): void {
    this._cart.update(cart => cart.filter((_, i) => i !== index));
  }

  updateQuantity(index: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(index);
      return;
    }
    this._cart.update(cart => cart.map((c, i) =>
      i === index ? { ...c, quantity } : c
    ));
  }

  setWeight(index: number, weight: number): void {
    this._cart.update(cart => cart.map((c, i) =>
      i === index ? { ...c, weight } : c
    ));
  }

  applyItemDiscount(index: number, discount: number): void {
    this._cart.update(cart => cart.map((c, i) =>
      i === index ? { ...c, discount } : c
    ));
  }

  overridePrice(index: number, price: number, reason: string): void {
    this._cart.update(cart => cart.map((c, i) =>
      i === index ? { ...c, priceOverride: price, priceOverrideReason: reason } : c
    ));
  }

  clearCart(): void {
    this._cart.set([]);
    this._error.set(null);
  }

  clearError(): void {
    this._error.set(null);
  }

  // --- Payment ---

  async processPayment(payments: RetailPayment[], isGiftReceipt: boolean = false): Promise<RetailTransaction | null> {
    if (!this.merchantId) return null;
    this._isProcessing.set(true);
    this._error.set(null);

    try {
      const transaction = await firstValueFrom(
        this.http.post<RetailTransaction>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/checkout`,
          {
            items: this._cart().map(c => ({
              itemId: c.itemId,
              variationId: c.variationId,
              quantity: c.quantity,
              unitPrice: c.priceOverride ?? c.unitPrice,
              discount: c.discount,
              weight: c.weight,
            })),
            payments,
            isGiftReceipt,
          }
        )
      );

      // Decrement stock for each item
      for (const cartItem of this._cart()) {
        await this.inventoryService.adjustStock({
          itemId: cartItem.itemId,
          variationId: cartItem.variationId,
          type: 'sale',
          quantity: -(cartItem.weight ?? cartItem.quantity),
          reason: 'POS Sale',
          note: `Transaction ${transaction.receiptNumber}`,
          costPerUnit: null,
        });
      }

      this._lastTransaction.set(transaction);
      this._cart.set([]);
      return transaction;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      this._error.set(message);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  calculateChange(tendered: number): number {
    return Math.max(0, tendered - this.cartTotal());
  }

  // --- Search ---

  searchItems(query: string): RetailItem[] {
    const q = query.toLowerCase();
    return this.catalogService.items().filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.sku?.toLowerCase().includes(q)) ||
      (i.barcode?.toLowerCase().includes(q))
    );
  }

  lookupBarcode(barcode: string): RetailItem | null {
    return this.catalogService.items().find(i =>
      i.barcode === barcode ||
      i.variations.some(v => v.barcode === barcode)
    ) ?? null;
  }

  // --- Quick Keys ---

  async loadQuickKeys(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<QuickKey[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/quick-keys`
        )
      );
      this._quickKeys.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._quickKeys.set([]);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to load quick keys';
        this._error.set(message);
      }
    }
  }

  async saveQuickKey(formData: QuickKeyFormData): Promise<QuickKey | null> {
    if (!this.merchantId) return null;

    try {
      const key = await firstValueFrom(
        this.http.post<QuickKey>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/quick-keys`,
          formData
        )
      );
      this._quickKeys.update(keys => {
        const existing = keys.findIndex(k => k.position === key.position);
        if (existing >= 0) {
          return keys.map((k, i) => i === existing ? key : k);
        }
        return [...keys, key];
      });
      return key;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save quick key';
      this._error.set(message);
      return null;
    }
  }

  async deleteQuickKey(keyId: string): Promise<void> {
    if (!this.merchantId) return;

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/quick-keys/${keyId}`
        )
      );
      this._quickKeys.update(keys => keys.filter(k => k.id !== keyId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete quick key';
      this._error.set(message);
    }
  }

  // --- Gift Card ---

  async lookupGiftCard(cardNumber: string): Promise<{ balance: number; cardNumber: string } | null> {
    if (!this.merchantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<{ balance: number; cardNumber: string }>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/gift-cards/lookup`,
          { params: { cardNumber } }
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gift card not found';
      this._error.set(message);
      return null;
    }
  }

  // --- Store Credit ---

  private readonly _storeCredits = signal<StoreCredit[]>([]);
  readonly storeCredits = this._storeCredits.asReadonly();

  async lookupStoreCredit(customerId: string): Promise<StoreCredit | null> {
    if (!this.merchantId) return null;

    try {
      const credit = await firstValueFrom(
        this.http.get<StoreCredit>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/store-credits/${customerId}`
        )
      );
      return credit;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No store credit found';
      this._error.set(message);
      return null;
    }
  }

  async issueStoreCredit(customerId: string, amount: number, reason: string): Promise<StoreCredit | null> {
    if (!this.merchantId) return null;

    try {
      return await firstValueFrom(
        this.http.post<StoreCredit>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/store-credits`,
          { customerId, amount, reason }
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to issue store credit';
      this._error.set(message);
      return null;
    }
  }

  // --- Layaway ---

  private readonly _layaways = signal<LayawayRecord[]>([]);
  readonly layaways = this._layaways.asReadonly();

  readonly activeLayaways = computed(() =>
    this._layaways().filter(l => l.status === 'active')
  );

  async loadLayaways(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<LayawayRecord[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/layaways`
        )
      );
      this._layaways.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._layaways.set([]);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to load layaways';
        this._error.set(message);
      }
    }
  }

  async createLayaway(customerId: string, depositAmount: number, depositMethod: RetailPaymentMethod): Promise<LayawayRecord | null> {
    if (!this.merchantId) return null;
    this._isProcessing.set(true);

    try {
      const record = await firstValueFrom(
        this.http.post<LayawayRecord>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/layaways`,
          {
            customerId,
            items: this._cart().map(c => ({
              itemId: c.itemId,
              variationId: c.variationId,
              quantity: c.quantity,
              unitPrice: c.priceOverride ?? c.unitPrice,
              discount: c.discount,
              weight: c.weight,
            })),
            depositAmount,
            depositMethod,
          }
        )
      );
      this._layaways.update(list => [...list, record]);
      this._cart.set([]);
      return record;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create layaway';
      this._error.set(message);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async makeLayawayPayment(layawayId: string, amount: number, method: RetailPaymentMethod): Promise<LayawayRecord | null> {
    if (!this.merchantId) return null;
    this._isProcessing.set(true);

    try {
      const updated = await firstValueFrom(
        this.http.post<LayawayRecord>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/layaways/${layawayId}/payments`,
          { amount, method }
        )
      );
      this._layaways.update(list => list.map(l => l.id === layawayId ? updated : l));
      return updated;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process layaway payment';
      this._error.set(message);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async cancelLayaway(layawayId: string): Promise<void> {
    if (!this.merchantId) return;

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/layaways/${layawayId}/cancel`,
          {}
        )
      );
      this._layaways.update(list => list.map(l =>
        l.id === layawayId ? { ...l, status: 'cancelled' as const } : l
      ));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel layaway';
      this._error.set(message);
    }
  }

  // --- Receipt Template ---

  private readonly _receiptTemplate = signal<ReceiptTemplate | null>(null);
  readonly receiptTemplate = this._receiptTemplate.asReadonly();

  async loadReceiptTemplate(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const template = await firstValueFrom(
        this.http.get<ReceiptTemplate>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/receipt-template`
        )
      );
      this._receiptTemplate.set(template);
    } catch {
      // 404 means no receipt template configured yet — fall back to null (component uses defaults)
      this._receiptTemplate.set(null);
    }
  }

  async saveReceiptTemplate(template: ReceiptTemplate): Promise<void> {
    if (!this.merchantId) return;

    try {
      const saved = await firstValueFrom(
        this.http.put<ReceiptTemplate>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/receipt-template`,
          template
        )
      );
      this._receiptTemplate.set(saved);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save receipt template';
      this._error.set(message);
    }
  }

  // --- Transaction Lookup ---

  async lookupTransaction(receiptNumber: string): Promise<RetailTransaction | null> {
    if (!this.merchantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<RetailTransaction>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/transactions/lookup`,
          { params: { receiptNumber } }
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transaction not found';
      this._error.set(message);
      return null;
    }
  }

  async searchTransactions(params: {
    receiptNumber?: string;
    customerPhone?: string;
    cardLast4?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<RetailTransaction[]> {
    if (!this.merchantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<RetailTransaction[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/transactions/search`,
          { params: params as Record<string, string> }
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Search failed';
      this._error.set(message);
      return [];
    }
  }

  // --- Returns & Exchanges ---

  private readonly _returnPolicy = signal<ReturnPolicy | null>(null);
  readonly returnPolicy = this._returnPolicy.asReadonly();

  async loadReturnPolicy(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const policy = await firstValueFrom(
        this.http.get<ReturnPolicy>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/return-policy`
        )
      );
      this._returnPolicy.set(policy);
    } catch {
      // 404 means no return policy configured yet — fall back to built-in defaults
      this._returnPolicy.set({
        returnWindowDays: 30,
        requireReceipt: true,
        noReceiptLimit: 25,
        managerOverrideRequired: false,
        finalSaleExemptions: [],
      });
    }
  }

  async saveReturnPolicy(policy: ReturnPolicy): Promise<void> {
    if (!this.merchantId) return;

    try {
      const saved = await firstValueFrom(
        this.http.put<ReturnPolicy>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/return-policy`,
          policy
        )
      );
      this._returnPolicy.set(saved);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save return policy';
      this._error.set(message);
    }
  }

  async processReturn(request: ReturnRequest): Promise<RetailTransaction | null> {
    if (!this.merchantId) return null;
    this._isProcessing.set(true);
    this._error.set(null);

    try {
      const transaction = await firstValueFrom(
        this.http.post<RetailTransaction>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/returns`,
          request
        )
      );

      // Re-stock returned items if flagged
      for (const item of request.items) {
        if (item.restock) {
          const originalItem = this.catalogService.items().find(i =>
            i.id === this.getItemIdFromTransactionItem(request.originalTransactionId, item.transactionItemId)
          );
          if (originalItem) {
            await this.inventoryService.adjustStock({
              itemId: originalItem.id,
              variationId: null,
              type: 'return',
              quantity: item.quantity,
              reason: 'Return',
              note: `Return from transaction`,
              costPerUnit: null,
            });
          }
        }
      }

      this._lastTransaction.set(transaction);
      return transaction;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Return failed';
      this._error.set(message);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async processExchange(
    returnRequest: ReturnRequest,
    newPayments: RetailPayment[],
    isGiftReceipt: boolean
  ): Promise<RetailTransaction | null> {
    if (!this.merchantId) return null;
    this._isProcessing.set(true);
    this._error.set(null);

    try {
      const transaction = await firstValueFrom(
        this.http.post<RetailTransaction>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/exchanges`,
          {
            returnRequest,
            newItems: this._cart().map(c => ({
              itemId: c.itemId,
              variationId: c.variationId,
              quantity: c.quantity,
              unitPrice: c.priceOverride ?? c.unitPrice,
              discount: c.discount,
              weight: c.weight,
            })),
            payments: newPayments,
            isGiftReceipt,
          }
        )
      );

      this._lastTransaction.set(transaction);
      this._cart.set([]);
      return transaction;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Exchange failed';
      this._error.set(message);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  isWithinReturnWindow(transaction: RetailTransaction): boolean {
    const policy = this._returnPolicy();
    if (!policy) return true;
    const transactionDate = new Date(transaction.createdAt);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - policy.returnWindowDays);
    return transactionDate >= cutoff;
  }

  isItemFinalSale(itemId: string): boolean {
    const policy = this._returnPolicy();
    if (!policy) return false;
    return policy.finalSaleExemptions.includes(itemId);
  }

  private getItemIdFromTransactionItem(transactionId: string, transactionItemId: string): string {
    // This would normally resolve from the transaction data
    // For now return the transactionItemId as a placeholder
    return transactionItemId;
  }
}
