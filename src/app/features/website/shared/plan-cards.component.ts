import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { PRICING_PLANS, BillingInterval, PricingPlan } from '../marketing.config';

@Component({
  selector: 'os-plan-cards',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-cards.component.html',
  styleUrl: './plan-cards.component.scss',
})
export class PlanCardsComponent {
  readonly plans = PRICING_PLANS;
  readonly interval = signal<BillingInterval>('monthly');

  readonly isAnnual = computed(() => this.interval() === 'annual');

  toggleInterval(): void {
    this.interval.update(v => v === 'monthly' ? 'annual' : 'monthly');
  }

  displayPrice(plan: PricingPlan): number {
    if (plan.monthlyCents === 0) return 0;
    const cents = this.isAnnual() ? plan.annualMonthlyCents : plan.monthlyCents;
    return cents / 100;
  }
}
