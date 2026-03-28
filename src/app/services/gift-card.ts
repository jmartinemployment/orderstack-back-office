import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GiftCard, GiftCardFormData, GiftCardBalanceCheck, GiftCardRedemption, GiftCardActivation } from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GiftCardService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _giftCards = signal<GiftCard[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly giftCards = this._giftCards.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly activeCards = computed(() =>
    this._giftCards().filter(c => c.status === 'active' && c.currentBalance > 0)
  );

  readonly physicalCards = computed(() =>
    this._giftCards().filter(c => c.type === 'physical')
  );

  readonly digitalCards = computed(() =>
    this._giftCards().filter(c => c.type === 'digital')
  );

  readonly totalOutstandingBalance = computed(() =>
    this.activeCards().reduce((sum, c) => sum + c.currentBalance, 0)
  );

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  async loadGiftCards(): Promise<void> {
    if (!this.merchantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<GiftCard[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/gift-cards`
        )
      );
      this._giftCards.set(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load gift cards';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async createGiftCard(data: GiftCardFormData): Promise<GiftCard | null> {
    if (!this.merchantId) return null;

    try {
      const card = await firstValueFrom(
        this.http.post<GiftCard>(
          `${this.apiUrl}/merchant/${this.merchantId}/gift-cards`,
          data
        )
      );
      this._giftCards.update(list => [card, ...list]);
      return card;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create gift card';
      this._error.set(message);
      return null;
    }
  }

  async checkBalance(code: string): Promise<GiftCardBalanceCheck | null> {
    if (!this.merchantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<GiftCardBalanceCheck>(
          `${this.apiUrl}/merchant/${this.merchantId}/gift-cards/balance/${encodeURIComponent(code)}`
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gift card not found';
      this._error.set(message);
      return null;
    }
  }

  async redeemGiftCard(code: string, amount: number, orderId: string): Promise<GiftCardRedemption | null> {
    if (!this.merchantId) return null;

    try {
      const redemption = await firstValueFrom(
        this.http.post<GiftCardRedemption>(
          `${this.apiUrl}/merchant/${this.merchantId}/gift-cards/redeem`,
          { code, amount, orderId }
        )
      );
      await this.loadGiftCards();
      return redemption;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to redeem gift card';
      this._error.set(message);
      return null;
    }
  }

  async disableGiftCard(cardId: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.patch<GiftCard>(
          `${this.apiUrl}/merchant/${this.merchantId}/gift-cards/${cardId}`,
          { status: 'disabled' }
        )
      );
      this._giftCards.update(list => list.map(c => c.id === cardId ? updated : c));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to disable gift card';
      this._error.set(message);
      return false;
    }
  }

  async getRedemptionHistory(cardId: string): Promise<GiftCardRedemption[]> {
    if (!this.merchantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<GiftCardRedemption[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/gift-cards/${cardId}/redemptions`
        )
      );
    } catch {
      return [];
    }
  }

  // --- Physical Card Activation ---

  async activatePhysicalCard(activation: GiftCardActivation): Promise<GiftCard | null> {
    if (!this.merchantId) return null;

    try {
      const card = await firstValueFrom(
        this.http.post<GiftCard>(
          `${this.apiUrl}/merchant/${this.merchantId}/gift-cards/activate`,
          activation
        )
      );
      this._giftCards.update(list => [card, ...list]);
      return card;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to activate physical card';
      this._error.set(message);
      return null;
    }
  }

  async lookupByCardNumber(cardNumber: string): Promise<GiftCardBalanceCheck | null> {
    if (!this.merchantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<GiftCardBalanceCheck>(
          `${this.apiUrl}/merchant/${this.merchantId}/gift-cards/lookup?cardNumber=${encodeURIComponent(cardNumber)}`
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Card not found';
      this._error.set(message);
      return null;
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
