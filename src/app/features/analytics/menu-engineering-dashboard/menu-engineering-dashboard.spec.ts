/**
 * MenuEngineeringDashboard — FEATURE-13 Tests
 *
 * Covers:
 * - sortedElasticity computed signal (sort by abs(estimatedRevenueChange))
 * - getElasticityClass (recommendation → CSS class)
 * - getElasticityLabel (recommendation → display label)
 * - getElasticityDescription (elasticity coefficient → plain English)
 * - getCannibalizationSeverity (decline % → CSS class)
 */
import { describe, it, expect } from 'vitest';
import { PriceElasticityIndicator, CannibalizationResult } from '@models/index';

// --- Pure function replicas of MenuEngineeringDashboard methods ---

function sortedElasticity(data: PriceElasticityIndicator[]): PriceElasticityIndicator[] {
  if (!Array.isArray(data)) return [];
  return [...data].sort(
    (a, b) => Math.abs(b.estimatedRevenueChange) - Math.abs(a.estimatedRevenueChange)
  );
}

function getElasticityClass(recommendation: 'increase' | 'decrease' | 'hold'): string {
  switch (recommendation) {
    case 'increase': return 'rec-increase';
    case 'decrease': return 'rec-decrease';
    case 'hold': return 'rec-hold';
  }
}

function getElasticityLabel(recommendation: 'increase' | 'decrease' | 'hold'): string {
  switch (recommendation) {
    case 'increase': return 'Increase Price';
    case 'decrease': return 'Decrease Price';
    case 'hold': return 'Hold Price';
  }
}

function getElasticityDescription(elasticity: number): string {
  const abs = Math.abs(elasticity);
  if (abs < 0.5) return 'Very inelastic — price changes have minimal impact on demand';
  if (abs < 1) return 'Inelastic — demand is relatively stable despite price changes';
  if (abs === 1) return 'Unit elastic — price and demand change proportionally';
  if (abs < 2) return 'Elastic — demand is sensitive to price changes';
  return 'Highly elastic — small price changes cause large demand shifts';
}

function getCannibalizationSeverity(declinePercent: number): string {
  if (declinePercent >= 30) return 'severity-critical';
  if (declinePercent >= 15) return 'severity-warning';
  return 'severity-low';
}

// --- Fixtures ---

function makeElasticityItem(overrides: Partial<PriceElasticityIndicator> = {}): PriceElasticityIndicator {
  return {
    itemId: 'item-1',
    itemName: 'Test Item',
    currentPrice: 12.99,
    elasticity: -0.8,
    recommendation: 'hold',
    estimatedRevenueChange: 50,
    ...overrides,
  };
}

function makeCannibalizationResult(overrides: Partial<CannibalizationResult> = {}): CannibalizationResult {
  return {
    newItemId: 'new-1',
    newItemName: 'New Burger',
    affectedItemId: 'old-1',
    affectedItemName: 'Classic Burger',
    salesDeclinePercent: 25,
    periodStart: '2026-01-15',
    periodEnd: '2026-02-12',
    ...overrides,
  };
}

// --- Tests ---

describe('MenuEngineeringDashboard — sortedElasticity', () => {
  it('sorts by absolute estimatedRevenueChange descending', () => {
    const data: PriceElasticityIndicator[] = [
      makeElasticityItem({ itemId: 'a', estimatedRevenueChange: 10 }),
      makeElasticityItem({ itemId: 'b', estimatedRevenueChange: -80 }),
      makeElasticityItem({ itemId: 'c', estimatedRevenueChange: 50 }),
    ];
    const sorted = sortedElasticity(data);
    expect(sorted[0].itemId).toBe('b');  // abs(80)
    expect(sorted[1].itemId).toBe('c');  // abs(50)
    expect(sorted[2].itemId).toBe('a');  // abs(10)
  });

  it('treats negative and positive revenue changes equally by absolute value', () => {
    const data: PriceElasticityIndicator[] = [
      makeElasticityItem({ itemId: 'pos', estimatedRevenueChange: 100 }),
      makeElasticityItem({ itemId: 'neg', estimatedRevenueChange: -100 }),
    ];
    const sorted = sortedElasticity(data);
    expect(sorted).toHaveLength(2);
    // Both have same abs value — order is stable
    expect(Math.abs(sorted[0].estimatedRevenueChange)).toBe(100);
    expect(Math.abs(sorted[1].estimatedRevenueChange)).toBe(100);
  });

  it('returns empty array for empty input', () => {
    expect(sortedElasticity([])).toEqual([]);
  });

  it('returns single item unchanged', () => {
    const data = [makeElasticityItem({ itemId: 'only' })];
    const sorted = sortedElasticity(data);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].itemId).toBe('only');
  });

  it('does not mutate original array', () => {
    const data: PriceElasticityIndicator[] = [
      makeElasticityItem({ itemId: 'a', estimatedRevenueChange: 10 }),
      makeElasticityItem({ itemId: 'b', estimatedRevenueChange: 50 }),
    ];
    sortedElasticity(data);
    expect(data[0].itemId).toBe('a');
  });

  it('handles non-array input gracefully', () => {
    expect(sortedElasticity(null as unknown as PriceElasticityIndicator[])).toEqual([]);
    expect(sortedElasticity(undefined as unknown as PriceElasticityIndicator[])).toEqual([]);
  });
});

describe('MenuEngineeringDashboard — getElasticityClass', () => {
  it('returns rec-increase for increase', () => {
    expect(getElasticityClass('increase')).toBe('rec-increase');
  });

  it('returns rec-decrease for decrease', () => {
    expect(getElasticityClass('decrease')).toBe('rec-decrease');
  });

  it('returns rec-hold for hold', () => {
    expect(getElasticityClass('hold')).toBe('rec-hold');
  });
});

describe('MenuEngineeringDashboard — getElasticityLabel', () => {
  it('returns "Increase Price" for increase', () => {
    expect(getElasticityLabel('increase')).toBe('Increase Price');
  });

  it('returns "Decrease Price" for decrease', () => {
    expect(getElasticityLabel('decrease')).toBe('Decrease Price');
  });

  it('returns "Hold Price" for hold', () => {
    expect(getElasticityLabel('hold')).toBe('Hold Price');
  });
});

describe('MenuEngineeringDashboard — getElasticityDescription', () => {
  it('returns very inelastic for abs < 0.5', () => {
    expect(getElasticityDescription(0.3)).toContain('Very inelastic');
    expect(getElasticityDescription(-0.2)).toContain('Very inelastic');
    expect(getElasticityDescription(0)).toContain('Very inelastic');
  });

  it('returns inelastic for 0.5 <= abs < 1', () => {
    expect(getElasticityDescription(0.5)).toContain('Inelastic');
    expect(getElasticityDescription(-0.75)).toContain('Inelastic');
    expect(getElasticityDescription(0.99)).toContain('Inelastic');
  });

  it('returns unit elastic for abs === 1', () => {
    expect(getElasticityDescription(1)).toContain('Unit elastic');
    expect(getElasticityDescription(-1)).toContain('Unit elastic');
  });

  it('returns elastic for 1 < abs < 2', () => {
    expect(getElasticityDescription(1.5)).toContain('Elastic');
    expect(getElasticityDescription(-1.2)).toContain('Elastic');
  });

  it('returns highly elastic for abs >= 2', () => {
    expect(getElasticityDescription(2)).toContain('Highly elastic');
    expect(getElasticityDescription(-3.5)).toContain('Highly elastic');
    expect(getElasticityDescription(100)).toContain('Highly elastic');
  });
});

describe('MenuEngineeringDashboard — getCannibalizationSeverity', () => {
  it('returns severity-critical for >= 30%', () => {
    expect(getCannibalizationSeverity(30)).toBe('severity-critical');
    expect(getCannibalizationSeverity(50)).toBe('severity-critical');
    expect(getCannibalizationSeverity(100)).toBe('severity-critical');
  });

  it('returns severity-warning for 15-29%', () => {
    expect(getCannibalizationSeverity(15)).toBe('severity-warning');
    expect(getCannibalizationSeverity(20)).toBe('severity-warning');
    expect(getCannibalizationSeverity(29.9)).toBe('severity-warning');
  });

  it('returns severity-low for < 15%', () => {
    expect(getCannibalizationSeverity(14.9)).toBe('severity-low');
    expect(getCannibalizationSeverity(0)).toBe('severity-low');
    expect(getCannibalizationSeverity(10)).toBe('severity-low');
  });
});

describe('MenuEngineeringDashboard — CannibalizationResult model', () => {
  it('supports optional recommendation field', () => {
    const result = makeCannibalizationResult({ recommendation: 'Consider repositioning Classic Burger' });
    expect(result.recommendation).toBe('Consider repositioning Classic Burger');
  });

  it('recommendation defaults to undefined', () => {
    const result = makeCannibalizationResult();
    expect(result.recommendation).toBeUndefined();
  });
});

describe('MenuEngineeringDashboard — PriceElasticityIndicator model', () => {
  it('supports optional confidence field', () => {
    const item = makeElasticityItem({ confidence: 'high' });
    expect(item.confidence).toBe('high');
  });

  it('supports optional reasoning field', () => {
    const item = makeElasticityItem({ reasoning: 'Strong demand at current price.' });
    expect(item.reasoning).toBe('Strong demand at current price.');
  });

  it('confidence defaults to undefined when not set', () => {
    const item = makeElasticityItem();
    expect(item.confidence).toBeUndefined();
  });

  it('reasoning defaults to undefined when not set', () => {
    const item = makeElasticityItem();
    expect(item.reasoning).toBeUndefined();
  });

  it('accepts all three confidence levels', () => {
    expect(makeElasticityItem({ confidence: 'low' }).confidence).toBe('low');
    expect(makeElasticityItem({ confidence: 'medium' }).confidence).toBe('medium');
    expect(makeElasticityItem({ confidence: 'high' }).confidence).toBe('high');
  });
});
