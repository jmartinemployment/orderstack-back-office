import { describe, it, expect } from 'vitest';
import {
  COMPETITOR_FEE_MODELS,
  SAVINGS_CALC_DEFAULTS,
  CompetitorFees,
} from '../marketing.config';

// Pure calculation function extracted for testability (mirrors component logic)
function calculateResults(
  monthlyOrders: number,
  avgTicket: number,
  deliveryPct: number,
): { name: string; monthlyCost: number; annualCost: number; savings: number }[] {
  const dineInOrders = monthlyOrders * (1 - deliveryPct / 100);
  const deliveryOrders = monthlyOrders * (deliveryPct / 100);

  const results = COMPETITOR_FEE_MODELS.map((fees: CompetitorFees) => {
    const processingCost =
      dineInOrders * avgTicket * fees.inPersonRate +
      dineInOrders * fees.inPersonFixed +
      deliveryOrders * avgTicket * fees.onlineRate +
      deliveryOrders * fees.onlineFixed;

    const deliveryCost =
      fees.daaSFeePerDelivery > 0
        ? deliveryOrders * fees.daaSFeePerDelivery
        : deliveryOrders * avgTicket * fees.deliveryCommission;

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

  const osAnnual = results[0].annualCost;
  return results.map(r => ({
    ...r,
    savings: Math.max(0, r.annualCost - osAnnual),
  }));
}

describe('SavingsCalculator calculations', () => {
  describe('default inputs', () => {
    const results = calculateResults(
      SAVINGS_CALC_DEFAULTS.monthlyOrders,
      SAVINGS_CALC_DEFAULTS.avgTicket,
      SAVINGS_CALC_DEFAULTS.deliveryPct,
    );

    it('produces 3 competitor results', () => {
      expect(results.length).toBe(3);
      expect(results[0].name).toBe('OrderStack');
      expect(results[1].name).toBe('Toast');
      expect(results[2].name).toBe('Square');
    });

    it('OrderStack has zero savings (it is the baseline)', () => {
      expect(results[0].savings).toBe(0);
    });

    it('all savings values are non-negative', () => {
      for (const r of results) {
        expect(r.savings).toBeGreaterThanOrEqual(0);
      }
    });

    it('produces correct OrderStack monthly cost', () => {
      // 1500 orders, $35 avg, 25% delivery
      // dineIn = 1125, delivery = 375
      // processing = 1125*35*0.0329 + 1125*0.49 + 375*35*0.0379 + 375*0.49
      //            = 1295.4375 + 551.25 + 497.4375 + 183.75 = 2527.875
      // deliveryCost = 375 * 6.5 = 2437.5
      // monthly = 29 + 2527.875 + 2437.5 = 4994.375
      expect(results[0].monthlyCost).toBeCloseTo(4994.375, 1);
    });

    it('produces correct Toast monthly cost', () => {
      // processing = 1125*35*0.0249 + 1125*0.15 + 375*35*0.035 + 375*0.15
      //            = 980.4375 + 168.75 + 459.375 + 56.25 = 1664.8125
      // deliveryCost = 375 * 35 * 0.15 = 1968.75
      // monthly = 50 + 1664.8125 + 1968.75 + 25 + 35 + 25 = 3768.5625
      expect(results[1].monthlyCost).toBeCloseTo(3768.5625, 1);
    });

    it('produces correct annual costs (monthly * 12)', () => {
      for (const r of results) {
        expect(r.annualCost).toBeCloseTo(r.monthlyCost * 12, 1);
      }
    });
  });

  describe('0% delivery', () => {
    const results = calculateResults(1500, 35, 0);

    it('zeroes out all delivery costs', () => {
      // With 0% delivery, all orders are dine-in
      // processing = 1500*35*0.0329 + 1500*0.49 = 1727.25 + 735 = 2462.25
      // Wait: 1500 * 35 * 0.0329 = 52500 * 0.0329 = 1727.25
      // monthly = 29 + 1727.25 + 735 + 0 = 2491.25
      expect(results[0].monthlyCost).toBeCloseTo(2491.25, 1);
    });
  });

  describe('100% delivery', () => {
    const results = calculateResults(1500, 35, 100);

    it('OrderStack uses DaaS fee for all orders', () => {
      // dineIn = 0, delivery = 1500
      // processing = 0 + 0 + 1500*35*0.0379 + 1500*0.49
      //            = 1989.75 + 735 = 2724.75
      // DaaS = 1500 * 6.5 = 9750
      // monthly = 29 + 2724.75 + 9750 = 12503.75
      expect(results[0].monthlyCost).toBeCloseTo(12503.75, 1);
    });

    it('Toast uses commission model for all delivery orders', () => {
      // processing = 0 + 0 + 1500*35*0.035 + 1500*0.15
      //            = 1837.5 + 225 = 2062.5
      // deliveryCost = 1500 * 35 * 0.15 = 7875
      // monthly = 50 + 2062.5 + 7875 + 25 + 35 + 25 = 10072.5
      expect(results[1].monthlyCost).toBeCloseTo(10072.5, 1);
    });
  });

  describe('edge case: minimum values', () => {
    const results = calculateResults(100, 5, 0);

    it('produces valid results', () => {
      for (const r of results) {
        expect(r.monthlyCost).toBeGreaterThan(0);
        expect(r.annualCost).toBeGreaterThan(0);
        expect(r.savings).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('edge case: maximum values', () => {
    const results = calculateResults(10000, 200, 100);

    it('produces valid results with large numbers', () => {
      for (const r of results) {
        expect(r.monthlyCost).toBeGreaterThan(0);
        expect(r.annualCost).toBeGreaterThan(0);
      }
    });

    it('Toast has massive delivery commission at high volume + ticket', () => {
      // 10000 * 200 * 0.15 = $300,000/mo in Toast delivery commissions
      // vs OrderStack DaaS: 10000 * 6.5 = $65,000/mo
      // Difference is huge — Toast annual cost >> OrderStack annual cost
      expect(results[1].annualCost).toBeGreaterThan(results[0].annualCost);
    });
  });

  describe('OrderStack wins at high ticket + high delivery', () => {
    // At $60 avg ticket, OrderStack DaaS ($6.50 flat) beats Toast 15% commission ($9.00)
    const results = calculateResults(1500, 60, 50);

    it('OrderStack annual cost is lower than Toast at $60 avg + 50% delivery', () => {
      expect(results[0].annualCost).toBeLessThan(results[1].annualCost);
    });
  });

  describe('calculations produce consistent results across inputs', () => {
    it('higher delivery % increases Toast costs more than OrderStack at high ticket', () => {
      const low = calculateResults(1500, 50, 10);
      const high = calculateResults(1500, 50, 80);
      const toastDelta = high[1].annualCost - low[1].annualCost;
      const osDelta = high[0].annualCost - low[0].annualCost;
      // Toast uses 15% commission which scales with order value; OS uses flat DaaS fee
      expect(toastDelta).toBeGreaterThan(osDelta);
    });

    it('changing inputs produces different results', () => {
      const a = calculateResults(1000, 30, 20);
      const b = calculateResults(2000, 50, 40);
      expect(a[0].annualCost).not.toBe(b[0].annualCost);
    });
  });
});
