import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface Combo {
  id: string;
  name: string;
  isActive: boolean;
  price: number;
}

// --- Pure function replicas ---

function activeCombos(combos: Combo[]): Combo[] {
  return combos.filter(c => c.isActive);
}

function addCombo(combos: Combo[], combo: Combo): Combo[] {
  return [...combos, combo];
}

function updateComboInList(combos: Combo[], id: string, updated: Combo): Combo[] {
  return combos.map(c => c.id === id ? updated : c);
}

function deleteComboFromList(combos: Combo[], id: string): Combo[] {
  return combos.filter(c => c.id !== id);
}

// --- Tests ---

const combos: Combo[] = [
  { id: 'c-1', name: 'Lunch Special', isActive: true, price: 12.99 },
  { id: 'c-2', name: 'Dinner Deal', isActive: false, price: 18.99 },
  { id: 'c-3', name: 'Happy Hour', isActive: true, price: 9.99 },
];

describe('ComboService — activeCombos', () => {
  it('filters active combos', () => {
    expect(activeCombos(combos)).toHaveLength(2);
  });

  it('returns empty for no active combos', () => {
    expect(activeCombos([{ id: 'c-1', name: 'A', isActive: false, price: 5 }])).toHaveLength(0);
  });

  it('returns empty for empty list', () => {
    expect(activeCombos([])).toHaveLength(0);
  });
});

describe('ComboService — list mutations', () => {
  it('addCombo appends', () => {
    const result = addCombo(combos, { id: 'c-4', name: 'New', isActive: true, price: 7.99 });
    expect(result).toHaveLength(4);
    expect(result.at(-1)?.id).toBe('c-4');
  });

  it('updateComboInList replaces matching', () => {
    const updated = { ...combos[0], name: 'Updated Lunch', price: 14.99 };
    const result = updateComboInList(combos, 'c-1', updated);
    expect(result[0].name).toBe('Updated Lunch');
    expect(result[0].price).toBe(14.99);
  });

  it('updateComboInList does not modify non-matching', () => {
    const updated = { ...combos[0], name: 'Updated' };
    const result = updateComboInList(combos, 'c-999', updated);
    expect(result).toEqual(combos);
  });

  it('deleteComboFromList removes matching', () => {
    const result = deleteComboFromList(combos, 'c-2');
    expect(result).toHaveLength(2);
    expect(result.find(c => c.id === 'c-2')).toBeUndefined();
  });

  it('deleteComboFromList returns same list when no match', () => {
    const result = deleteComboFromList(combos, 'c-999');
    expect(result).toHaveLength(3);
  });
});
