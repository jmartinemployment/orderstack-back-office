import { describe, it, expect } from 'vitest';

// --- Interfaces ---

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertCategory = 'revenue' | 'inventory' | 'kitchen' | 'orders';

interface MonitoringAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  acknowledged: boolean;
}

interface AnomalyRule {
  id: string;
  name: string;
  category: AlertCategory;
  severity: AlertSeverity;
  enabled: boolean;
}

// --- Pure function replicas ---

function activeAlerts(alerts: MonitoringAlert[]): MonitoringAlert[] {
  return alerts.filter(a => !a.acknowledged);
}

function criticalCount(alerts: MonitoringAlert[]): number {
  return activeAlerts(alerts).filter(a => a.severity === 'critical').length;
}

function warningCount(alerts: MonitoringAlert[]): number {
  return activeAlerts(alerts).filter(a => a.severity === 'warning').length;
}

function alertsByCategory(alerts: MonitoringAlert[]): Map<AlertCategory, MonitoringAlert[]> {
  const active = activeAlerts(alerts);
  const map = new Map<AlertCategory, MonitoringAlert[]>();
  for (const alert of active) {
    const existing = map.get(alert.category) ?? [];
    existing.push(alert);
    map.set(alert.category, existing);
  }
  return map;
}

function toggleRule(rules: AnomalyRule[], ruleId: string): AnomalyRule[] {
  return rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r);
}

function acknowledgeAlert(alerts: MonitoringAlert[], alertId: string): MonitoringAlert[] {
  return alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a);
}

function acknowledgeAll(alerts: MonitoringAlert[]): MonitoringAlert[] {
  return alerts.map(a => ({ ...a, acknowledged: true }));
}

function clearAcknowledged(alerts: MonitoringAlert[]): MonitoringAlert[] {
  return alerts.filter(a => !a.acknowledged);
}

function isRuleEnabled(rules: AnomalyRule[], ruleId: string): boolean {
  return rules.some(r => r.id === ruleId && r.enabled);
}

// --- Tests ---

const alerts: MonitoringAlert[] = [
  { id: 'a-1', category: 'revenue', severity: 'critical', title: 'Revenue Drop', acknowledged: false },
  { id: 'a-2', category: 'inventory', severity: 'warning', title: 'Low Stock', acknowledged: false },
  { id: 'a-3', category: 'inventory', severity: 'critical', title: 'Out of Stock', acknowledged: true },
  { id: 'a-4', category: 'orders', severity: 'info', title: 'Peak Surge', acknowledged: false },
];

describe('MonitoringService — activeAlerts', () => {
  it('filters unacknowledged alerts', () => {
    expect(activeAlerts(alerts)).toHaveLength(3);
  });

  it('returns empty when all acknowledged', () => {
    expect(activeAlerts(acknowledgeAll(alerts))).toHaveLength(0);
  });
});

describe('MonitoringService — criticalCount / warningCount', () => {
  it('counts active critical alerts', () => {
    expect(criticalCount(alerts)).toBe(1); // a-3 is acknowledged
  });

  it('counts active warning alerts', () => {
    expect(warningCount(alerts)).toBe(1);
  });

  it('returns 0 for empty', () => {
    expect(criticalCount([])).toBe(0);
    expect(warningCount([])).toBe(0);
  });
});

describe('MonitoringService — alertsByCategory', () => {
  it('groups active alerts by category', () => {
    const grouped = alertsByCategory(alerts);
    expect(grouped.get('revenue')).toHaveLength(1);
    expect(grouped.get('inventory')).toHaveLength(1); // a-3 is acknowledged
    expect(grouped.get('orders')).toHaveLength(1);
    expect(grouped.has('kitchen')).toBe(false);
  });
});

describe('MonitoringService — toggleRule', () => {
  const rules: AnomalyRule[] = [
    { id: 'r-1', name: 'Revenue Drop', category: 'revenue', severity: 'critical', enabled: true },
    { id: 'r-2', name: 'Low Stock', category: 'inventory', severity: 'warning', enabled: false },
  ];

  it('toggles enabled to disabled', () => {
    const result = toggleRule(rules, 'r-1');
    expect(result[0].enabled).toBe(false);
  });

  it('toggles disabled to enabled', () => {
    const result = toggleRule(rules, 'r-2');
    expect(result[1].enabled).toBe(true);
  });

  it('does not modify non-matching', () => {
    const result = toggleRule(rules, 'r-999');
    expect(result).toEqual(rules);
  });
});

describe('MonitoringService — alert mutations', () => {
  it('acknowledgeAlert sets acknowledged on matching', () => {
    const result = acknowledgeAlert(alerts, 'a-1');
    expect(result[0].acknowledged).toBe(true);
    expect(result[1].acknowledged).toBe(false); // unchanged
  });

  it('acknowledgeAll sets all to acknowledged', () => {
    const result = acknowledgeAll(alerts);
    expect(result.every(a => a.acknowledged)).toBe(true);
  });

  it('clearAcknowledged removes acknowledged alerts', () => {
    const result = clearAcknowledged(alerts);
    expect(result).toHaveLength(3); // a-3 was already acknowledged
    expect(result.find(a => a.id === 'a-3')).toBeUndefined();
  });
});

describe('MonitoringService — isRuleEnabled', () => {
  const rules: AnomalyRule[] = [
    { id: 'r-1', name: 'A', category: 'revenue', severity: 'critical', enabled: true },
    { id: 'r-2', name: 'B', category: 'inventory', severity: 'warning', enabled: false },
  ];

  it('returns true for enabled rule', () => {
    expect(isRuleEnabled(rules, 'r-1')).toBe(true);
  });

  it('returns false for disabled rule', () => {
    expect(isRuleEnabled(rules, 'r-2')).toBe(false);
  });

  it('returns false for unknown rule', () => {
    expect(isRuleEnabled(rules, 'r-999')).toBe(false);
  });
});
