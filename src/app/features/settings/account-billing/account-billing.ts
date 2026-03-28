import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SubscriptionService } from '../../../services/subscription';
import { CancelSubscription } from '../cancel-subscription';
import { PLAN_PRICE_DISPLAY, PAYPAL_RATES } from '../../../models/subscription.model';

@Component({
  selector: 'os-account-billing',
  imports: [DatePipe, CancelSubscription],
  templateUrl: './account-billing.html',
  styleUrl: './account-billing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountBilling implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);

  readonly subscription = this.subscriptionService.subscription;
  readonly status = this.subscriptionService.status;
  readonly isTrial = this.subscriptionService.isTrial;
  readonly isActive = this.subscriptionService.isActive;
  readonly isSuspended = this.subscriptionService.isSuspended;
  readonly isCanceled = this.subscriptionService.isCanceled;
  readonly trialDaysRemaining = this.subscriptionService.trialDaysRemaining;
  readonly trialProgress = this.subscriptionService.trialProgress;
  readonly isLoading = this.subscriptionService.isLoading;
  readonly error = this.subscriptionService.error;

  readonly planPrice = PLAN_PRICE_DISPLAY;
  readonly paypalRates = PAYPAL_RATES;

  readonly showCancelModal = signal(false);
  readonly _subscribing = signal(false);

  readonly statusLabel = computed(() => {
    switch (this.status()) {
      case 'active': return 'Active';
      case 'trialing': return 'Free Trial';
      case 'canceled': return 'Canceled';
      case 'suspended': return 'Suspended';
      default: return 'Unknown';
    }
  });

  readonly statusClass = computed(() => {
    switch (this.status()) {
      case 'active': return 'bg-success';
      case 'trialing': return 'bg-primary';
      case 'canceled': return 'bg-warning text-dark';
      case 'suspended': return 'bg-danger';
      default: return 'bg-secondary';
    }
  });

  readonly canSubscribe = computed(() => this.isTrial() || this.isSuspended());
  readonly canCancel = computed(() => this.isActive() && !this.isCanceled());

  ngOnInit(): void {
    this.subscriptionService.loadSubscription();
  }

  async subscribe(): Promise<void> {
    this._subscribing.set(true);
    await this.subscriptionService.subscribe();
    this._subscribing.set(false);
  }

  openCancelModal(): void {
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    this.showCancelModal.set(false);
  }
}
