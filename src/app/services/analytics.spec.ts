import { describe, it, expect } from 'vitest';

// --- Pure function replicas of AnalyticsService computed logic ---

interface MenuEngineeringItem {
  id: string;
  classification: 'star' | 'cash-cow' | 'puzzle' | 'dog';
}

interface MenuItemBadge {
  type: string;
  label: string;
  cssClass: string;
}

interface TeamMember {
  id: string;
  name: string;
  totalRevenue: number;
}

interface TeamSalesReport {
  members: TeamMember[];
}

interface SalesAlert {
  id: string;
  acknowledged: boolean;
}

function computeItemBadges(items: MenuEngineeringItem[]): Map<string, MenuItemBadge> {
  const badges = new Map<string, MenuItemBadge>();
  for (const item of items) {
    switch (item.classification) {
      case 'star':
        badges.set(item.id, { type: 'best-seller', label: 'Best Seller', cssClass: 'badge-best-seller' });
        break;
      case 'cash-cow':
        badges.set(item.id, { type: 'chefs-pick', label: "Chef's Pick", cssClass: 'badge-chefs-pick' });
        break;
      case 'puzzle':
        badges.set(item.id, { type: 'popular', label: 'Popular', cssClass: 'badge-popular' });
        break;
    }
  }
  return badges;
}

function getItemBadge(badges: Map<string, MenuItemBadge>, itemId: string, createdAt?: string): MenuItemBadge | null {
  if (createdAt) {
    const created = new Date(createdAt);
    const daysOld = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld < 14) {
      return { type: 'new', label: 'New', cssClass: 'badge-new' };
    }
  }
  return badges.get(itemId) ?? null;
}

function unacknowledgedAlertCount(alerts: SalesAlert[]): number {
  return alerts.filter(a => !a.acknowledged).length;
}

function teamLeaderboard(report: TeamSalesReport | null): TeamMember[] {
  if (!report) return [];
  return [...report.members].sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// --- Tests ---

describe('AnalyticsService — computeItemBadges', () => {
  it('maps star to best-seller', () => {
    const badges = computeItemBadges([{ id: 'i-1', classification: 'star' }]);
    expect(badges.get('i-1')?.type).toBe('best-seller');
    expect(badges.get('i-1')?.label).toBe('Best Seller');
  });

  it('maps cash-cow to chefs-pick', () => {
    const badges = computeItemBadges([{ id: 'i-1', classification: 'cash-cow' }]);
    expect(badges.get('i-1')?.type).toBe('chefs-pick');
  });

  it('maps puzzle to popular', () => {
    const badges = computeItemBadges([{ id: 'i-1', classification: 'puzzle' }]);
    expect(badges.get('i-1')?.type).toBe('popular');
  });

  it('does not map dog', () => {
    const badges = computeItemBadges([{ id: 'i-1', classification: 'dog' }]);
    expect(badges.has('i-1')).toBe(false);
  });

  it('returns empty map for empty items', () => {
    expect(computeItemBadges([]).size).toBe(0);
  });

  it('handles multiple items', () => {
    const items: MenuEngineeringItem[] = [
      { id: 'i-1', classification: 'star' },
      { id: 'i-2', classification: 'dog' },
      { id: 'i-3', classification: 'puzzle' },
    ];
    const badges = computeItemBadges(items);
    expect(badges.size).toBe(2);
  });
});

describe('AnalyticsService — getItemBadge', () => {
  const badges = computeItemBadges([{ id: 'i-1', classification: 'star' }]);

  it('returns "new" badge for items created less than 14 days ago', () => {
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const badge = getItemBadge(badges, 'i-1', recentDate);
    expect(badge?.type).toBe('new');
    expect(badge?.label).toBe('New');
  });

  it('returns engineering badge for items older than 14 days', () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const badge = getItemBadge(badges, 'i-1', oldDate);
    expect(badge?.type).toBe('best-seller');
  });

  it('returns engineering badge when no createdAt', () => {
    const badge = getItemBadge(badges, 'i-1');
    expect(badge?.type).toBe('best-seller');
  });

  it('returns null for unknown item without createdAt', () => {
    expect(getItemBadge(badges, 'unknown')).toBeNull();
  });

  it('returns "new" even for unknown engineering item if recent', () => {
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(getItemBadge(badges, 'unknown', recentDate)?.type).toBe('new');
  });
});

describe('AnalyticsService — unacknowledgedAlertCount', () => {
  it('counts unacknowledged alerts', () => {
    const alerts: SalesAlert[] = [
      { id: '1', acknowledged: false },
      { id: '2', acknowledged: true },
      { id: '3', acknowledged: false },
    ];
    expect(unacknowledgedAlertCount(alerts)).toBe(2);
  });

  it('returns 0 for empty', () => {
    expect(unacknowledgedAlertCount([])).toBe(0);
  });

  it('returns 0 when all acknowledged', () => {
    expect(unacknowledgedAlertCount([{ id: '1', acknowledged: true }])).toBe(0);
  });
});

describe('AnalyticsService — teamLeaderboard', () => {
  it('sorts by totalRevenue descending', () => {
    const report: TeamSalesReport = {
      members: [
        { id: '1', name: 'Alice', totalRevenue: 500 },
        { id: '2', name: 'Bob', totalRevenue: 1000 },
        { id: '3', name: 'Charlie', totalRevenue: 750 },
      ],
    };
    const board = teamLeaderboard(report);
    expect(board[0].name).toBe('Bob');
    expect(board[1].name).toBe('Charlie');
    expect(board[2].name).toBe('Alice');
  });

  it('returns empty for null report', () => {
    expect(teamLeaderboard(null)).toEqual([]);
  });

  it('returns single member list', () => {
    const report: TeamSalesReport = {
      members: [{ id: '1', name: 'Solo', totalRevenue: 100 }],
    };
    expect(teamLeaderboard(report)).toHaveLength(1);
  });

  it('does not mutate original array', () => {
    const report: TeamSalesReport = {
      members: [
        { id: '1', name: 'A', totalRevenue: 200 },
        { id: '2', name: 'B', totalRevenue: 300 },
      ],
    };
    teamLeaderboard(report);
    expect(report.members[0].name).toBe('A');
  });
});
