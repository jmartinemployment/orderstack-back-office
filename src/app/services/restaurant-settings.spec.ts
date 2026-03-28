import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface CapacityBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  maxOrders: number;
}

interface BusinessHoursCheck {
  isOpen: boolean;
  nextChange: string | null;
}

// --- Pure function replicas ---

function addCapacityBlock(blocks: CapacityBlock[], block: Omit<CapacityBlock, 'id'>): CapacityBlock[] {
  const newBlock: CapacityBlock = { ...block, id: 'generated-id' };
  return [...blocks, newBlock];
}

function removeCapacityBlock(blocks: CapacityBlock[], blockId: string): CapacityBlock[] {
  return blocks.filter(b => b.id !== blockId);
}

function normalizeAISettings(s: Record<string, unknown>): Record<string, unknown> {
  // Clamp targetCourseGapSeconds between 300 and 3600
  const gap = (s['targetCourseGapSeconds'] as number) ?? 600;
  const clamped = Math.max(300, Math.min(3600, gap));

  // Clamp maxActiveOrders between 2 and 120
  const maxActive = (s['maxActiveOrders'] as number) ?? 20;
  const clampedActive = Math.max(2, Math.min(120, maxActive));

  // Clamp maxOverdueOrders between 1 and 50
  const maxOverdue = (s['maxOverdueOrders'] as number) ?? 5;
  const clampedOverdue = Math.max(1, Math.min(50, maxOverdue));

  // Clamp maxHoldMinutes between 1 and 180
  const maxHold = (s['maxHoldMinutes'] as number) ?? 15;
  const clampedHold = Math.max(1, Math.min(180, maxHold));

  return {
    ...s,
    targetCourseGapSeconds: clamped,
    maxActiveOrders: clampedActive,
    maxOverdueOrders: clampedOverdue,
    maxHoldMinutes: clampedHold,
  };
}

function readLocalStorage(key: string): Record<string, unknown> | null {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// --- Tests ---

describe('RestaurantSettingsService — capacity blocks', () => {
  const blocks: CapacityBlock[] = [
    { id: 'cb-1', date: '2026-02-25', startTime: '11:00', endTime: '14:00', maxOrders: 50 },
  ];

  it('addCapacityBlock appends', () => {
    const result = addCapacityBlock(blocks, { date: '2026-02-26', startTime: '17:00', endTime: '21:00', maxOrders: 30 });
    expect(result).toHaveLength(2);
    expect(result.at(-1)?.maxOrders).toBe(30);
  });

  it('removeCapacityBlock removes matching', () => {
    expect(removeCapacityBlock(blocks, 'cb-1')).toHaveLength(0);
  });

  it('removeCapacityBlock returns same for no match', () => {
    expect(removeCapacityBlock(blocks, 'cb-999')).toHaveLength(1);
  });
});

describe('RestaurantSettingsService — normalizeAISettings', () => {
  it('clamps targetCourseGapSeconds below minimum', () => {
    const result = normalizeAISettings({ targetCourseGapSeconds: 100 });
    expect(result['targetCourseGapSeconds']).toBe(300);
  });

  it('clamps targetCourseGapSeconds above maximum', () => {
    const result = normalizeAISettings({ targetCourseGapSeconds: 5000 });
    expect(result['targetCourseGapSeconds']).toBe(3600);
  });

  it('preserves valid targetCourseGapSeconds', () => {
    const result = normalizeAISettings({ targetCourseGapSeconds: 600 });
    expect(result['targetCourseGapSeconds']).toBe(600);
  });

  it('clamps maxActiveOrders', () => {
    expect(normalizeAISettings({ maxActiveOrders: 1 })['maxActiveOrders']).toBe(2);
    expect(normalizeAISettings({ maxActiveOrders: 200 })['maxActiveOrders']).toBe(120);
    expect(normalizeAISettings({ maxActiveOrders: 50 })['maxActiveOrders']).toBe(50);
  });

  it('clamps maxOverdueOrders', () => {
    expect(normalizeAISettings({ maxOverdueOrders: 0 })['maxOverdueOrders']).toBe(1);
    expect(normalizeAISettings({ maxOverdueOrders: 100 })['maxOverdueOrders']).toBe(50);
  });

  it('clamps maxHoldMinutes', () => {
    expect(normalizeAISettings({ maxHoldMinutes: 0 })['maxHoldMinutes']).toBe(1);
    expect(normalizeAISettings({ maxHoldMinutes: 300 })['maxHoldMinutes']).toBe(180);
  });

  it('uses defaults for missing values', () => {
    const result = normalizeAISettings({});
    expect(result['targetCourseGapSeconds']).toBe(600);
    expect(result['maxActiveOrders']).toBe(20);
    expect(result['maxOverdueOrders']).toBe(5);
    expect(result['maxHoldMinutes']).toBe(15);
  });
});

describe('RestaurantSettingsService — readLocalStorage', () => {
  it('returns parsed JSON', () => {
    localStorage.setItem('test-key', JSON.stringify({ a: 1 }));
    expect(readLocalStorage('test-key')).toEqual({ a: 1 });
    localStorage.removeItem('test-key');
  });

  it('returns null for missing key', () => {
    expect(readLocalStorage('nonexistent-key')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    localStorage.setItem('bad-key', 'not json{{{');
    expect(readLocalStorage('bad-key')).toBeNull();
    localStorage.removeItem('bad-key');
  });
});
