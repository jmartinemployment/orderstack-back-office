import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface Recipe {
  id: string;
  name: string;
  menuItemId?: string;
  totalCost?: number;
}

// --- Pure function replicas of RecipeCostingService computed logic ---

function recipesWithCost(recipes: Recipe[]): Recipe[] {
  return recipes.filter(r => r.totalCost !== undefined && r.totalCost > 0);
}

function getRecipeForMenuItem(recipes: Recipe[], menuItemId: string): Recipe | undefined {
  return recipes.find(r => r.menuItemId === menuItemId);
}

// List mutations
function addRecipe(recipes: Recipe[], recipe: Recipe): Recipe[] {
  return [...recipes, recipe];
}

function updateRecipeInList(recipes: Recipe[], id: string, updated: Recipe): Recipe[] {
  return recipes.map(r => r.id === id ? updated : r);
}

function deleteRecipeFromList(recipes: Recipe[], id: string): Recipe[] {
  return recipes.filter(r => r.id !== id);
}

// --- Tests ---

describe('RecipeCostingService — recipesWithCost', () => {
  it('includes recipes with positive totalCost', () => {
    const recipes: Recipe[] = [
      { id: '1', name: 'A', totalCost: 5.50 },
      { id: '2', name: 'B', totalCost: 0 },
      { id: '3', name: 'C' },
      { id: '4', name: 'D', totalCost: 12.00 },
    ];
    const result = recipesWithCost(recipes);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toEqual(['1', '4']);
  });

  it('returns empty for no costed recipes', () => {
    expect(recipesWithCost([{ id: '1', name: 'A' }])).toHaveLength(0);
  });

  it('returns empty for empty list', () => {
    expect(recipesWithCost([])).toHaveLength(0);
  });
});

describe('RecipeCostingService — getRecipeForMenuItem', () => {
  const recipes: Recipe[] = [
    { id: 'r-1', name: 'Recipe A', menuItemId: 'mi-1' },
    { id: 'r-2', name: 'Recipe B', menuItemId: 'mi-2' },
  ];

  it('finds matching recipe', () => {
    expect(getRecipeForMenuItem(recipes, 'mi-1')?.id).toBe('r-1');
  });

  it('returns undefined for no match', () => {
    expect(getRecipeForMenuItem(recipes, 'mi-999')).toBeUndefined();
  });

  it('returns undefined for empty list', () => {
    expect(getRecipeForMenuItem([], 'mi-1')).toBeUndefined();
  });
});

describe('RecipeCostingService — list mutations', () => {
  const recipes: Recipe[] = [{ id: 'r-1', name: 'Recipe A', totalCost: 5 }];

  it('addRecipe appends', () => {
    expect(addRecipe(recipes, { id: 'r-2', name: 'B' })).toHaveLength(2);
  });

  it('updateRecipeInList replaces matching', () => {
    const updated: Recipe = { id: 'r-1', name: 'Updated', totalCost: 10 };
    expect(updateRecipeInList(recipes, 'r-1', updated)[0].name).toBe('Updated');
  });

  it('deleteRecipeFromList removes matching', () => {
    expect(deleteRecipeFromList(recipes, 'r-1')).toHaveLength(0);
  });
});
