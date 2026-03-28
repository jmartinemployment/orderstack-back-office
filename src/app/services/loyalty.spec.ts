import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface LoyaltyReward {
  id: string;
  name: string;
  pointCost: number;
  isActive: boolean;
}

// --- Pure function replicas ---

function addReward(rewards: LoyaltyReward[], reward: LoyaltyReward): LoyaltyReward[] {
  return [...rewards, reward];
}

function updateRewardInList(rewards: LoyaltyReward[], id: string, updated: LoyaltyReward): LoyaltyReward[] {
  return rewards.map(r => r.id === id ? updated : r);
}

function deleteRewardFromList(rewards: LoyaltyReward[], id: string): LoyaltyReward[] {
  return rewards.filter(r => r.id !== id);
}

function activeRewards(rewards: LoyaltyReward[]): LoyaltyReward[] {
  return rewards.filter(r => r.isActive);
}

// --- Tests ---

const rewards: LoyaltyReward[] = [
  { id: 'r-1', name: 'Free Coffee', pointCost: 100, isActive: true },
  { id: 'r-2', name: 'Free Dessert', pointCost: 250, isActive: true },
  { id: 'r-3', name: 'Old Reward', pointCost: 50, isActive: false },
];

describe('LoyaltyService — activeRewards', () => {
  it('filters active rewards', () => {
    expect(activeRewards(rewards)).toHaveLength(2);
  });

  it('returns empty when none active', () => {
    expect(activeRewards([rewards[2]])).toHaveLength(0);
  });
});

describe('LoyaltyService — list mutations', () => {
  it('addReward appends', () => {
    const result = addReward(rewards, { id: 'r-4', name: 'New', pointCost: 500, isActive: true });
    expect(result).toHaveLength(4);
  });

  it('updateRewardInList replaces matching', () => {
    const updated = { ...rewards[0], name: 'Updated Coffee', pointCost: 150 };
    const result = updateRewardInList(rewards, 'r-1', updated);
    expect(result[0].name).toBe('Updated Coffee');
    expect(result[0].pointCost).toBe(150);
  });

  it('deleteRewardFromList removes matching', () => {
    expect(deleteRewardFromList(rewards, 'r-3')).toHaveLength(2);
  });

  it('deleteRewardFromList returns same for no match', () => {
    expect(deleteRewardFromList(rewards, 'r-999')).toHaveLength(3);
  });
});
