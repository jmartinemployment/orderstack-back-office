import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface CampaignPerformance {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  revenueAttributed: number;
}

interface Campaign {
  id: string;
  status: 'draft' | 'sent' | 'scheduled';
  performance: CampaignPerformance;
}

interface MarketingAutomation {
  id: string;
  isActive: boolean;
  sentCount: number;
}

// --- Pure function replicas ---

function draftCampaigns(campaigns: Campaign[]): Campaign[] {
  return campaigns.filter(c => c.status === 'draft');
}

function sentCampaigns(campaigns: Campaign[]): Campaign[] {
  return campaigns.filter(c => c.status === 'sent');
}

function scheduledCampaigns(campaigns: Campaign[]): Campaign[] {
  return campaigns.filter(c => c.status === 'scheduled');
}

function totalSent(campaigns: Campaign[]): number {
  return campaigns.reduce((sum, c) => sum + c.performance.sent, 0);
}

function avgOpenRate(campaigns: Campaign[]): number {
  const sent = campaigns.filter(c => c.status === 'sent');
  if (sent.length === 0) return 0;
  const totalOpened = sent.reduce((s, c) => s + c.performance.opened, 0);
  const totalDelivered = sent.reduce((s, c) => s + c.performance.delivered, 0);
  return totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0;
}

function totalRevenue(campaigns: Campaign[]): number {
  return campaigns.reduce((sum, c) => sum + c.performance.revenueAttributed, 0);
}

function activeAutomations(automations: MarketingAutomation[]): MarketingAutomation[] {
  return automations.filter(a => a.isActive);
}

function totalAutomationsSent(automations: MarketingAutomation[]): number {
  return automations.reduce((sum, a) => sum + a.sentCount, 0);
}

// --- Tests ---

const campaigns: Campaign[] = [
  { id: '1', status: 'draft', performance: { sent: 0, delivered: 0, opened: 0, clicked: 0, revenueAttributed: 0 } },
  { id: '2', status: 'sent', performance: { sent: 100, delivered: 95, opened: 40, clicked: 10, revenueAttributed: 500 } },
  { id: '3', status: 'sent', performance: { sent: 200, delivered: 190, opened: 80, clicked: 20, revenueAttributed: 1000 } },
  { id: '4', status: 'scheduled', performance: { sent: 0, delivered: 0, opened: 0, clicked: 0, revenueAttributed: 0 } },
];

describe('MarketingService — campaign filters', () => {
  it('draftCampaigns', () => expect(draftCampaigns(campaigns)).toHaveLength(1));
  it('sentCampaigns', () => expect(sentCampaigns(campaigns)).toHaveLength(2));
  it('scheduledCampaigns', () => expect(scheduledCampaigns(campaigns)).toHaveLength(1));
});

describe('MarketingService — totalSent', () => {
  it('sums sent across all campaigns', () => {
    expect(totalSent(campaigns)).toBe(300);
  });

  it('returns 0 for empty', () => {
    expect(totalSent([])).toBe(0);
  });
});

describe('MarketingService — avgOpenRate', () => {
  it('computes weighted average open rate for sent campaigns', () => {
    // (40 + 80) / (95 + 190) = 120 / 285 ≈ 42%
    expect(avgOpenRate(campaigns)).toBe(42);
  });

  it('returns 0 when no sent campaigns', () => {
    expect(avgOpenRate([campaigns[0]])).toBe(0);
  });

  it('returns 0 when delivered is 0', () => {
    const zeroCampaigns: Campaign[] = [
      { id: '1', status: 'sent', performance: { sent: 10, delivered: 0, opened: 0, clicked: 0, revenueAttributed: 0 } },
    ];
    expect(avgOpenRate(zeroCampaigns)).toBe(0);
  });
});

describe('MarketingService — totalRevenue', () => {
  it('sums revenue from all campaigns', () => {
    expect(totalRevenue(campaigns)).toBe(1500);
  });
});

describe('MarketingService — automations', () => {
  const automations: MarketingAutomation[] = [
    { id: 'a-1', isActive: true, sentCount: 50 },
    { id: 'a-2', isActive: false, sentCount: 20 },
    { id: 'a-3', isActive: true, sentCount: 30 },
  ];

  it('activeAutomations filters active', () => {
    expect(activeAutomations(automations)).toHaveLength(2);
  });

  it('totalAutomationsSent sums all', () => {
    expect(totalAutomationsSent(automations)).toBe(100);
  });
});
