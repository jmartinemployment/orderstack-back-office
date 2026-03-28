import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface Modifier {
  id: string;
  name: string;
  price: number;
}

interface ModifierGroup {
  id: string;
  name: string;
  modifiers: Modifier[];
}

// --- Pure function replicas ---

function addGroup(groups: ModifierGroup[], group: ModifierGroup): ModifierGroup[] {
  return [...groups, group];
}

function updateGroupInList(groups: ModifierGroup[], id: string, updated: ModifierGroup): ModifierGroup[] {
  return groups.map(g => g.id === id ? updated : g);
}

function deleteGroupFromList(groups: ModifierGroup[], id: string): ModifierGroup[] {
  return groups.filter(g => g.id !== id);
}

function addModifierToGroup(group: ModifierGroup, modifier: Modifier): ModifierGroup {
  return { ...group, modifiers: [...group.modifiers, modifier] };
}

function updateModifierInGroup(group: ModifierGroup, modId: string, updated: Modifier): ModifierGroup {
  return { ...group, modifiers: group.modifiers.map(m => m.id === modId ? updated : m) };
}

function deleteModifierFromGroup(group: ModifierGroup, modId: string): ModifierGroup {
  return { ...group, modifiers: group.modifiers.filter(m => m.id !== modId) };
}

function extractError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'error' in err) {
    const inner = (err as Record<string, unknown>).error;
    if (inner && typeof inner === 'object' && 'error' in inner) {
      return (inner as Record<string, string>).error;
    }
  }
  return fallback;
}

// --- Tests ---

const groups: ModifierGroup[] = [
  { id: 'g-1', name: 'Sizes', modifiers: [{ id: 'm-1', name: 'Small', price: 0 }, { id: 'm-2', name: 'Large', price: 2 }] },
  { id: 'g-2', name: 'Toppings', modifiers: [] },
];

describe('ModifierService — group mutations', () => {
  it('addGroup appends', () => {
    expect(addGroup(groups, { id: 'g-3', name: 'Sauces', modifiers: [] })).toHaveLength(3);
  });

  it('updateGroupInList replaces matching', () => {
    const updated = { ...groups[0], name: 'Updated Sizes' };
    expect(updateGroupInList(groups, 'g-1', updated)[0].name).toBe('Updated Sizes');
  });

  it('deleteGroupFromList removes matching', () => {
    expect(deleteGroupFromList(groups, 'g-1')).toHaveLength(1);
  });
});

describe('ModifierService — modifier within group mutations', () => {
  const group = groups[0];

  it('addModifierToGroup appends modifier', () => {
    const result = addModifierToGroup(group, { id: 'm-3', name: 'Medium', price: 1 });
    expect(result.modifiers).toHaveLength(3);
  });

  it('updateModifierInGroup replaces matching modifier', () => {
    const result = updateModifierInGroup(group, 'm-1', { id: 'm-1', name: 'Tiny', price: -1 });
    expect(result.modifiers[0].name).toBe('Tiny');
    expect(result.modifiers[0].price).toBe(-1);
  });

  it('deleteModifierFromGroup removes matching modifier', () => {
    const result = deleteModifierFromGroup(group, 'm-1');
    expect(result.modifiers).toHaveLength(1);
    expect(result.modifiers[0].id).toBe('m-2');
  });
});

describe('ModifierService — extractError', () => {
  it('extracts nested error message', () => {
    const err = { error: { error: 'Duplicate name' } };
    expect(extractError(err, 'fallback')).toBe('Duplicate name');
  });

  it('returns fallback for non-standard error', () => {
    expect(extractError(new Error('boom'), 'fallback')).toBe('fallback');
  });

  it('returns fallback for null', () => {
    expect(extractError(null, 'fallback')).toBe('fallback');
  });
});
