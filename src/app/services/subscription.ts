import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Subscription, SubscriptionStatus, CancellationFeedback } from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _subscription = signal<Subscription | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly subscription = this._subscription.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly status = computed<SubscriptionStatus>(() => {
    const sub = this._subscription();
    return sub?.status ?? 'suspended';
  });

  readonly isTrial = computed(() => this.status() === 'trialing');
  readonly isActive = computed(() => this.status() === 'active');
  readonly isSuspended = computed(() => this.status() === 'suspended');
  readonly isCanceled = computed(() => {
    const sub = this._subscription();
    return sub?.status === 'canceled' || sub?.cancelAtPeriodEnd === true;
  });

  readonly trialDaysRemaining = computed(() => {
    const sub = this._subscription();
    return sub?.trialDaysRemaining ?? 0;
  });

  readonly trialProgress = computed(() => {
    const sub = this._subscription();
    if (!sub?.trialStart || !sub?.trialEnd) return 0;
    const start = new Date(sub.trialStart).getTime();
    const end = new Date(sub.trialEnd).getTime();
    const now = Date.now();
    const total = end - start;
    if (total <= 0) return 100;
    return Math.min(100, Math.round(((now - start) / total) * 100));
  });

  readonly formattedAmount = computed(() => {
    const sub = this._subscription();
    if (!sub || sub.planPrice === 0) return 'Free Trial';
    return `$${sub.planPrice / 100}/mo`;
  });

  private get merchantId(): string {
    return this.authService.selectedMerchantId() ?? '';
  }

  async loadSubscription(): Promise<void> {
    if (!this.merchantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const sub = await firstValueFrom(
        this.http.get<Subscription>(
          `${this.apiUrl}/merchant/${this.merchantId}/subscription`
        )
      );
      this._subscription.set(sub);
    } catch {
      this._subscription.set(null);
    } finally {
      this._isLoading.set(false);
    }
  }

  async subscribe(paypalSubscriptionId?: string): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.post<Subscription>(
          `${this.apiUrl}/merchant/${this.merchantId}/subscription/subscribe`,
          { paypalSubscriptionId }
        )
      );
      this._subscription.set(updated);
      return true;
    } catch {
      this._error.set('Failed to activate subscription');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async cancelSubscription(feedback: CancellationFeedback): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/subscription/cancel`,
          feedback
        )
      );
      await this.loadSubscription();
      return true;
    } catch {
      this._error.set('Failed to cancel subscription');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async extendTrial(days = 30): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/subscription/extend-trial`,
          { days }
        )
      );
      await this.loadSubscription();
      return true;
    } catch {
      this._error.set('Failed to extend trial');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  reset(): void {
    this._subscription.set(null);
    this._error.set(null);
  }
}
