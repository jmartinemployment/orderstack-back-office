import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  LoyaltyConfig,
  LoyaltyProfile,
  LoyaltyTransaction,
  LoyaltyReward,
  defaultLoyaltyConfig,
  Customer,
} from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LoyaltyService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _config = signal<LoyaltyConfig>(defaultLoyaltyConfig());
  private readonly _rewards = signal<LoyaltyReward[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _isLoadingConfig = signal(false);
  private readonly _isLoadingRewards = signal(false);
  private readonly _error = signal<string | null>(null);

  // Per-merchant loaded cache — prevents repeated fetches for the same merchant
  private _configLoadedForMerchant = '';
  private _rewardsLoadedForMerchant = '';

  readonly config = this._config.asReadonly();
  readonly rewards = this._rewards.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  private get merchantId(): string {
    return this.authService.selectedMerchantId() ?? '';
  }

  // --- Config ---

  async loadConfig(): Promise<void> {
    if (!this.merchantId) return;
    if (this._isLoadingConfig()) return;
    if (this._configLoadedForMerchant === this.merchantId) return;
    this._isLoadingConfig.set(true);
    this._error.set(null);

    try {
      const config = await firstValueFrom(
        this.http.get<LoyaltyConfig>(
          `${this.apiUrl}/merchant/${this.merchantId}/loyalty/config`
        )
      );
      this._config.set(config);
      this._configLoadedForMerchant = this.merchantId;
    } catch {
      this._error.set('Failed to load loyalty config');
      this._configLoadedForMerchant = this.merchantId;
    } finally {
      this._isLoadingConfig.set(false);
    }
  }

  async saveConfig(config: Partial<LoyaltyConfig>): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.patch<LoyaltyConfig>(
          `${this.apiUrl}/merchant/${this.merchantId}/loyalty/config`,
          config
        )
      );
      this._config.set(updated);
      return true;
    } catch {
      this._error.set('Failed to save loyalty config');
      return false;
    }
  }

  // --- Rewards ---

  async loadRewards(): Promise<void> {
    if (!this.merchantId) return;
    if (this._isLoadingRewards()) return;
    if (this._rewardsLoadedForMerchant === this.merchantId) return;
    this._isLoadingRewards.set(true);
    this._error.set(null);

    try {
      const rewards = await firstValueFrom(
        this.http.get<LoyaltyReward[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/loyalty/rewards`
        )
      );
      this._rewards.set(rewards);
      this._rewardsLoadedForMerchant = this.merchantId;
    } catch {
      this._error.set('Failed to load loyalty rewards');
      this._rewardsLoadedForMerchant = this.merchantId;
    } finally {
      this._isLoadingRewards.set(false);
    }
  }

  async createReward(data: Partial<LoyaltyReward>): Promise<LoyaltyReward | null> {
    if (!this.merchantId) return null;
    this._error.set(null);

    try {
      const reward = await firstValueFrom(
        this.http.post<LoyaltyReward>(
          `${this.apiUrl}/merchant/${this.merchantId}/loyalty/rewards`,
          data
        )
      );
      this._rewards.update(rewards => [...rewards, reward]);
      return reward;
    } catch {
      this._error.set('Failed to create reward');
      return null;
    }
  }

  async updateReward(id: string, data: Partial<LoyaltyReward>): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.patch<LoyaltyReward>(
          `${this.apiUrl}/merchant/${this.merchantId}/loyalty/rewards/${id}`,
          data
        )
      );
      this._rewards.update(rewards => rewards.map(r => r.id === id ? updated : r));
      return true;
    } catch {
      this._error.set('Failed to update reward');
      return false;
    }
  }

  async deleteReward(id: string): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/loyalty/rewards/${id}`
        )
      );
      this._rewards.update(rewards => rewards.filter(r => r.id !== id));
      return true;
    } catch {
      this._error.set('Failed to delete reward');
      return false;
    }
  }

  // --- Customer Loyalty ---

  async getCustomerLoyalty(customerId: string): Promise<LoyaltyProfile | null> {
    if (!this.merchantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<LoyaltyProfile>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/${customerId}/loyalty`
        )
      );
    } catch {
      return null;
    }
  }

  async getPointsHistory(customerId: string): Promise<LoyaltyTransaction[]> {
    if (!this.merchantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<LoyaltyTransaction[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/${customerId}/loyalty/history`
        )
      );
    } catch {
      return [];
    }
  }

  async adjustPoints(customerId: string, points: number, reason: string): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/${customerId}/loyalty/adjust`,
          { points, reason }
        )
      );
      return true;
    } catch {
      this._error.set('Failed to adjust points');
      return false;
    }
  }

  async lookupCustomerByPhone(phone: string): Promise<Customer | null> {
    if (!this.merchantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<Customer>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/lookup?phone=${encodeURIComponent(phone)}`
        )
      );
    } catch {
      return null;
    }
  }

  async getAvailableRewards(customerId: string): Promise<LoyaltyReward[]> {
    if (!this.merchantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<LoyaltyReward[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/${customerId}/loyalty/rewards`
        )
      );
    } catch {
      return [];
    }
  }

  // --- Local computation ---

  calculatePointsForOrder(subtotal: number): number {
    const config = this._config();
    if (!config.enabled) return 0;
    return Math.floor(subtotal * config.pointsPerDollar);
  }

  calculateRedemptionDiscount(points: number): number {
    const config = this._config();
    return Math.round(points * config.pointsRedemptionRate * 100) / 100;
  }
}
