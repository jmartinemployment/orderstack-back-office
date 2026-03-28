import { describe, it, expect } from 'vitest';

// --- Interfaces ---

type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
type PlanTierKey = 'free' | 'plus' | 'premium';

interface Subscription {
  id: string;
  planName: string;
  status: SubscriptionStatus;
  amountCents: number;
  interval: 'month' | 'year';
  cancelAtPeriodEnd: boolean;
  trialStart: string | null;
  trialEnd: string | null;
}

// --- Pure function replicas ---

function status(sub: Subscription | null): SubscriptionStatus {
  if (!sub) return 'active';
  return sub.status;
}

function planTier(sub: Subscription | null): PlanTierKey {
  if (!sub) return 'free';
  const name = sub.planName.toLowerCase();
  if (name === 'plus' || name === 'orderstack plus') return 'plus';
  if (name === 'premium' || name === 'orderstack premium') return 'premium';
  return 'free';
}

function isTrial(sub: Subscription | null): boolean {
  return status(sub) === 'trialing';
}

function isCanceled(sub: Subscription | null): boolean {
  return sub?.status === 'canceled' || sub?.cancelAtPeriodEnd === true;
}

function trialDaysRemaining(sub: Subscription | null, now: Date): number {
  if (!sub?.trialEnd) return 0;
  const end = new Date(sub.trialEnd);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function trialProgress(sub: Subscription | null, now: number): number {
  if (!sub?.trialStart || !sub?.trialEnd) return 0;
  const start = new Date(sub.trialStart).getTime();
  const end = new Date(sub.trialEnd).getTime();
  const total = end - start;
  if (total <= 0) return 100;
  return Math.min(100, Math.round(((now - start) / total) * 100));
}

function formattedAmount(sub: Subscription | null): string {
  if (!sub || sub.amountCents === 0) return 'Free';
  const dollars = sub.amountCents / 100;
  const suffix = sub.interval === 'year' ? '/yr' : '/mo';
  return `$${dollars}${suffix}`;
}

// --- Tests ---

const baseSub: Subscription = {
  id: 'sub-1',
  planName: 'OrderStack Plus',
  status: 'active',
  amountCents: 4900,
  interval: 'month',
  cancelAtPeriodEnd: false,
  trialStart: null,
  trialEnd: null,
};

describe('SubscriptionService — status', () => {
  it('returns active for null subscription', () => {
    expect(status(null)).toBe('active');
  });

  it('returns subscription status', () => {
    expect(status(baseSub)).toBe('active');
    expect(status({ ...baseSub, status: 'trialing' })).toBe('trialing');
  });
});

describe('SubscriptionService — planTier', () => {
  it('returns free for null', () => {
    expect(planTier(null)).toBe('free');
  });

  it('detects plus tier', () => {
    expect(planTier(baseSub)).toBe('plus');
    expect(planTier({ ...baseSub, planName: 'plus' })).toBe('plus');
  });

  it('detects premium tier', () => {
    expect(planTier({ ...baseSub, planName: 'OrderStack Premium' })).toBe('premium');
    expect(planTier({ ...baseSub, planName: 'premium' })).toBe('premium');
  });

  it('defaults to free for unknown name', () => {
    expect(planTier({ ...baseSub, planName: 'OrderStack Free' })).toBe('free');
    expect(planTier({ ...baseSub, planName: 'Basic' })).toBe('free');
  });
});

describe('SubscriptionService — isTrial / isCanceled', () => {
  it('isTrial true for trialing', () => {
    expect(isTrial({ ...baseSub, status: 'trialing' })).toBe(true);
  });

  it('isTrial false for active', () => {
    expect(isTrial(baseSub)).toBe(false);
  });

  it('isCanceled true for canceled status', () => {
    expect(isCanceled({ ...baseSub, status: 'canceled' })).toBe(true);
  });

  it('isCanceled true for cancelAtPeriodEnd', () => {
    expect(isCanceled({ ...baseSub, cancelAtPeriodEnd: true })).toBe(true);
  });

  it('isCanceled false for active', () => {
    expect(isCanceled(baseSub)).toBe(false);
  });

  it('isCanceled false for null', () => {
    expect(isCanceled(null)).toBe(false);
  });
});

describe('SubscriptionService — trialDaysRemaining', () => {
  it('returns days until trial end', () => {
    const now = new Date('2026-02-20T12:00:00Z');
    const sub = { ...baseSub, trialEnd: '2026-02-25T12:00:00Z' };
    expect(trialDaysRemaining(sub, now)).toBe(5);
  });

  it('returns 0 when trial ended', () => {
    const now = new Date('2026-02-26T12:00:00Z');
    const sub = { ...baseSub, trialEnd: '2026-02-25T12:00:00Z' };
    expect(trialDaysRemaining(sub, now)).toBe(0);
  });

  it('returns 0 for no trialEnd', () => {
    expect(trialDaysRemaining(baseSub, new Date())).toBe(0);
  });

  it('returns 0 for null sub', () => {
    expect(trialDaysRemaining(null, new Date())).toBe(0);
  });
});

describe('SubscriptionService — trialProgress', () => {
  it('computes progress percentage', () => {
    const sub = { ...baseSub, trialStart: '2026-02-01T00:00:00Z', trialEnd: '2026-02-15T00:00:00Z' };
    const midpoint = new Date('2026-02-08T00:00:00Z').getTime();
    expect(trialProgress(sub, midpoint)).toBe(50);
  });

  it('caps at 100', () => {
    const sub = { ...baseSub, trialStart: '2026-02-01T00:00:00Z', trialEnd: '2026-02-15T00:00:00Z' };
    const past = new Date('2026-03-01T00:00:00Z').getTime();
    expect(trialProgress(sub, past)).toBe(100);
  });

  it('returns 0 for no trial dates', () => {
    expect(trialProgress(baseSub, Date.now())).toBe(0);
  });

  it('returns 100 when total is 0 or negative', () => {
    const sub = { ...baseSub, trialStart: '2026-02-15T00:00:00Z', trialEnd: '2026-02-15T00:00:00Z' };
    expect(trialProgress(sub, Date.now())).toBe(100);
  });
});

describe('SubscriptionService — formattedAmount', () => {
  it('formats monthly amount', () => {
    expect(formattedAmount(baseSub)).toBe('$49/mo');
  });

  it('formats yearly amount', () => {
    expect(formattedAmount({ ...baseSub, interval: 'year', amountCents: 49900 })).toBe('$499/yr');
  });

  it('returns Free for 0 amount', () => {
    expect(formattedAmount({ ...baseSub, amountCents: 0 })).toBe('Free');
  });

  it('returns Free for null', () => {
    expect(formattedAmount(null)).toBe('Free');
  });
});
