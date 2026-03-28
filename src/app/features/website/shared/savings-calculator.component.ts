import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  ElementRef,
  viewChildren,
  afterNextRender,
  OnDestroy,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import {
  SAVINGS_CALC_HEADER,
  SAVINGS_CALC_ASSUMPTIONS,
  SAVINGS_CALC_DEFAULTS,
  SAVINGS_CALC_INPUTS,
  COMPETITOR_FEE_MODELS,
  CompetitorFees,
} from '../marketing.config';

interface CompetitorResult {
  name: string;
  monthlyCost: number;
  annualCost: number;
  savings: number;
}

@Component({
  selector: 'os-savings-calculator',
  standalone: true,
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './savings-calculator.component.html',
  styleUrl: './savings-calculator.component.scss',
})
export class SavingsCalculatorComponent implements OnDestroy {
  readonly header = SAVINGS_CALC_HEADER;
  readonly assumptions = SAVINGS_CALC_ASSUMPTIONS;
  readonly defaults = SAVINGS_CALC_DEFAULTS;
  readonly inputConfig = SAVINGS_CALC_INPUTS;

  readonly monthlyOrders = signal(SAVINGS_CALC_DEFAULTS.monthlyOrders);
  readonly avgTicket = signal(SAVINGS_CALC_DEFAULTS.avgTicket);
  readonly deliveryPct = signal(SAVINGS_CALC_DEFAULTS.deliveryPct);

  // Animated display values
  readonly animatedSavingsToast = signal(0);
  readonly animatedSavingsSquare = signal(0);

  private animFrameId = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly savingsEls = viewChildren<ElementRef<HTMLElement>>('savingsEl');

  readonly results = computed<CompetitorResult[]>(() => {
    const orders = this.monthlyOrders();
    const ticket = this.avgTicket();
    const delPct = this.deliveryPct();

    const dineInOrders = orders * (1 - delPct / 100);
    const deliveryOrders = orders * (delPct / 100);

    return COMPETITOR_FEE_MODELS.map((fees: CompetitorFees) => {
      const processingCost =
        dineInOrders * ticket * fees.inPersonRate +
        dineInOrders * fees.inPersonFixed +
        deliveryOrders * ticket * fees.onlineRate +
        deliveryOrders * fees.onlineFixed;

      const deliveryCost =
        fees.daaSFeePerDelivery > 0
          ? deliveryOrders * fees.daaSFeePerDelivery
          : deliveryOrders * ticket * fees.deliveryCommission;

      const monthlyCost =
        fees.monthlyBase +
        processingCost +
        deliveryCost +
        fees.kdsAddon +
        fees.schedulingAddon +
        fees.loyaltyAddon;

      const annualCost = monthlyCost * 12;

      return { name: fees.name, monthlyCost, annualCost, savings: 0 };
    });
  });

  readonly resultsWithSavings = computed<CompetitorResult[]>(() => {
    const r = this.results();
    const osAnnual = r[0].annualCost;
    return r.map(item => ({
      ...item,
      savings: Math.max(0, item.annualCost - osAnnual),
    }));
  });

  readonly summaryText = computed(() => {
    const r = this.resultsWithSavings();
    const toastSavings = r[1].savings;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(toastSavings);
    return `Based on ${this.monthlyOrders().toLocaleString()} orders/mo at $${this.avgTicket()} avg, you'd save ${formatted} per year vs Toast.`;
  });

  constructor() {
    afterNextRender(() => {
      this.triggerAnimation();
    });
  }

  ngOnDestroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  onInputChange(field: 'monthlyOrders' | 'avgTicket' | 'deliveryPct', event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    if (Number.isNaN(value)) return;
    const config = this.inputConfig[field];
    const clamped = Math.max(config.min, Math.min(config.max, value));
    this[field].set(clamped);
    this.scheduleAnimation();
  }

  private scheduleAnimation(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.triggerAnimation(), 150);
  }

  private triggerAnimation(): void {
    const r = this.resultsWithSavings();
    const targetToast = r[1].savings;
    const targetSquare = r[2].savings;
    const startToast = this.animatedSavingsToast();
    const startSquare = this.animatedSavingsSquare();

    if (startToast === targetToast && startSquare === targetSquare) return;

    const duration = 800;
    const startTime = performance.now();

    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const animate = (now: number): void => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      this.animatedSavingsToast.set(Math.round(startToast + (targetToast - startToast) * eased));
      this.animatedSavingsSquare.set(Math.round(startSquare + (targetSquare - startSquare) * eased));

      if (progress < 1) {
        this.animFrameId = requestAnimationFrame(animate);
      }
    };

    this.animFrameId = requestAnimationFrame(animate);
  }
}
