import { describe, it, expect } from 'vitest';
import {
  INTEGRATIONS,
  INTEGRATION_CATEGORIES,
  INTEGRATIONS_STATUS_LABELS,
  Integration,
  IntegrationCategory,
} from '../../marketing.config';

const STATUS_ORDER: Record<string, number> = {
  available: 0,
  beta: 1,
  coming_soon: 2,
};

function filterIntegrations(
  category: IntegrationCategory,
  query: string,
): Integration[] {
  let results = [...INTEGRATIONS];

  if (category !== 'all') {
    results = results.filter(i => i.category === category);
  }

  if (query.trim()) {
    const q = query.toLowerCase().trim();
    results = results.filter(
      i =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q),
    );
  }

  results.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));

  return results;
}

describe('IntegrationsPage — filtering logic', () => {
  it('default state (all, empty search) renders all 17 integrations', () => {
    const results = filterIntegrations('all', '');
    expect(results.length).toBe(17);
  });

  it('payments category filters to 2 cards', () => {
    const results = filterIntegrations('payments', '');
    expect(results.length).toBe(2);
    expect(results.map(r => r.id)).toContain('paypal-zettle');
    expect(results.map(r => r.id)).toContain('square-reader');
  });

  it('delivery category filters to 3 cards', () => {
    const results = filterIntegrations('delivery', '');
    expect(results.length).toBe(3);
  });

  it('hardware category filters to 3 cards', () => {
    const results = filterIntegrations('hardware', '');
    expect(results.length).toBe(3);
  });

  it('accounting category filters to 3 cards', () => {
    const results = filterIntegrations('accounting', '');
    expect(results.length).toBe(3);
  });

  it('marketing category filters to 3 cards', () => {
    const results = filterIntegrations('marketing', '');
    expect(results.length).toBe(3);
  });

  it('operations category filters to 3 cards', () => {
    const results = filterIntegrations('operations', '');
    expect(results.length).toBe(3);
  });

  it('searching "cloudprnt" filters to Star CloudPRNT only', () => {
    const results = filterIntegrations('all', 'cloudprnt');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('star-cloudprnt');
  });

  it('searching "zzz" returns empty results', () => {
    const results = filterIntegrations('all', 'zzz');
    expect(results.length).toBe(0);
  });

  it('category + search combo: accounting + "quick" shows only QuickBooks', () => {
    const results = filterIntegrations('accounting', 'quick');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('quickbooks');
  });

  it('switching back to all with cleared search restores all 17', () => {
    // First filter down
    const filtered = filterIntegrations('payments', 'paypal');
    expect(filtered.length).toBe(1);

    // Then reset
    const restored = filterIntegrations('all', '');
    expect(restored.length).toBe(17);
  });

  it('sort order: available first, beta second, coming_soon last', () => {
    const results = filterIntegrations('all', '');
    const statuses = results.map(r => r.status);
    const availableEnd = statuses.lastIndexOf('available');
    const betaStart = statuses.indexOf('beta');
    const comingSoonStart = statuses.indexOf('coming_soon');

    if (betaStart >= 0) {
      expect(availableEnd).toBeLessThan(betaStart);
    }
    if (comingSoonStart >= 0 && betaStart >= 0) {
      expect(betaStart).toBeLessThan(comingSoonStart);
    }
  });

  it('cards with null learnMoreUrl should be coming_soon status', () => {
    const nullUrls = INTEGRATIONS.filter(i => i.learnMoreUrl === null);
    for (const i of nullUrls) {
      expect(i.status).toBe('coming_soon');
    }
  });

  it('cards with learnMoreUrl should not be coming_soon', () => {
    const withUrls = INTEGRATIONS.filter(i => i.learnMoreUrl !== null);
    for (const i of withUrls) {
      expect(i.status).not.toBe('coming_soon');
    }
  });

  it('all integration IDs are unique', () => {
    const ids = INTEGRATIONS.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('status labels exist for all statuses used', () => {
    const usedStatuses = new Set(INTEGRATIONS.map(i => i.status));
    for (const status of usedStatuses) {
      expect(INTEGRATIONS_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it('all categories have at least one integration', () => {
    for (const cat of INTEGRATION_CATEGORIES) {
      if (cat.id === 'all') continue;
      const count = INTEGRATIONS.filter(i => i.category === cat.id).length;
      expect(count).toBeGreaterThan(0);
    }
  });
});
