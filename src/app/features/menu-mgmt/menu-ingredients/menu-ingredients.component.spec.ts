import '../../../../test-setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { MenuIngredientsComponent } from './menu-ingredients.component';
import { MenuService } from '../../../services/menu';
import { RecipeCostingService } from '../../../services/recipe-costing';
import { MenuItem } from '../../../models/menu.model';

// ── Factories ─────────────────────────────────────────────────────────────────

function makeItem(id: string, name: string, price: number, cateringAllergens?: string[]): Partial<MenuItem> {
  return { id, name, price, cateringAllergens } as Partial<MenuItem>;
}

function makeRecipe(menuItemId: string, costPerServing: number | null = null, ingredients: any[] = []) {
  return { id: `r-${menuItemId}`, menuItemId, name: `Recipe ${menuItemId}`, yieldQty: 1, costPerServing, ingredients };
}

// ── Mock services ─────────────────────────────────────────────────────────────
// IMPORTANT: these signals must NOT be reassigned — use .set() to reset them.
// Reassigning would break the reference captured by mockMenuService.isLoading
// and mockRecipeCostingService.isLoading at declaration time.

const mockCateringItems = signal<Partial<MenuItem>[]>([]);
const mockMenuIsLoading = signal(false);

const mockMenuService = {
  isLoading: mockMenuIsLoading.asReadonly(),
  cateringItems: () => mockCateringItems() as MenuItem[],
  loadMenu: vi.fn(),
};

const mockRecipeIsLoading = signal(false);
const mockRecipeCostingService = {
  isLoading: mockRecipeIsLoading.asReadonly(),
  loadRecipes: vi.fn(),
  getRecipeForMenuItem: vi.fn().mockReturnValue(undefined),
};

// ── Setup ─────────────────────────────────────────────────────────────────────

function createComponent() {
  TestBed.overrideProvider(MenuService, { useValue: mockMenuService });
  TestBed.overrideProvider(RecipeCostingService, { useValue: mockRecipeCostingService });
  const fixture = TestBed.createComponent(MenuIngredientsComponent);
  return { fixture, component: fixture.componentInstance };
}

describe('MenuIngredientsComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset signals via .set() — never reassign the variable
    mockCateringItems.set([]);
    mockMenuIsLoading.set(false);
    mockRecipeIsLoading.set(false);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(undefined);

    await TestBed.configureTestingModule({
      imports: [MenuIngredientsComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  // ── ngOnInit ───────────────────────────────────────────────────────────────

  it('ngOnInit calls loadRecipes and loadMenu', () => {
    const { component } = createComponent();
    component.ngOnInit();
    expect(mockRecipeCostingService.loadRecipes).toHaveBeenCalledOnce();
    expect(mockMenuService.loadMenu).toHaveBeenCalledOnce();
  });

  // ── cateringItems ──────────────────────────────────────────────────────────

  it('cateringItems delegates to menuService.cateringItems', () => {
    mockCateringItems.set([makeItem('i1', 'Salmon', 30)]);
    const { component } = createComponent();
    expect(component.cateringItems()).toHaveLength(1);
    expect(component.cateringItems()[0].id).toBe('i1');
  });

  // ── itemsWithRecipes / itemsWithoutRecipes ─────────────────────────────────

  it('itemsWithRecipes includes items that have a recipe', () => {
    mockCateringItems.set([makeItem('i1', 'Salmon', 30), makeItem('i2', 'Bread', 5)]);
    mockRecipeCostingService.getRecipeForMenuItem.mockImplementation(
      (id: string) => id === 'i1' ? makeRecipe('i1') : undefined,
    );
    const { component } = createComponent();
    expect(component.itemsWithRecipes().map(i => i.id)).toEqual(['i1']);
  });

  it('itemsWithoutRecipes includes items with no recipe', () => {
    mockCateringItems.set([makeItem('i1', 'Salmon', 30), makeItem('i2', 'Bread', 5)]);
    mockRecipeCostingService.getRecipeForMenuItem.mockImplementation(
      (id: string) => id === 'i1' ? makeRecipe('i1') : undefined,
    );
    const { component } = createComponent();
    expect(component.itemsWithoutRecipes().map(i => i.id)).toEqual(['i2']);
  });

  // ── recipeCoveragePercent ──────────────────────────────────────────────────

  it('recipeCoveragePercent is 0 when no catering items', () => {
    mockCateringItems.set([]);
    const { component } = createComponent();
    expect(component.recipeCoveragePercent()).toBe(0);
  });

  it('recipeCoveragePercent is 100 when all items have recipes', () => {
    mockCateringItems.set([makeItem('i1', 'Salmon', 30), makeItem('i2', 'Bread', 5)]);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(makeRecipe('any'));
    const { component } = createComponent();
    expect(component.recipeCoveragePercent()).toBe(100);
  });

  it('recipeCoveragePercent calculates partial coverage', () => {
    mockCateringItems.set([
      makeItem('i1', 'Salmon', 30),
      makeItem('i2', 'Bread', 5),
      makeItem('i3', 'Soup', 12),
      makeItem('i4', 'Salad', 10),
    ]);
    mockRecipeCostingService.getRecipeForMenuItem.mockImplementation(
      (id: string) => (id === 'i1' || id === 'i2') ? makeRecipe(id) : undefined,
    );
    const { component } = createComponent();
    expect(component.recipeCoveragePercent()).toBe(50);
  });

  // ── costAlerts ─────────────────────────────────────────────────────────────

  it('costAlerts returns no-recipe when no recipe found', () => {
    mockCateringItems.set([makeItem('i1', 'Salmon', 30)]);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(undefined);
    const { component } = createComponent();
    const alerts = component.costAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alertType).toBe('no-recipe');
  });

  it('costAlerts returns no-cost-data when recipe has null costPerServing', () => {
    mockCateringItems.set([makeItem('i1', 'Salmon', 30)]);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(makeRecipe('i1', null));
    const { component } = createComponent();
    const alerts = component.costAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alertType).toBe('no-cost-data');
  });

  it('costAlerts returns high-cost when food cost % exceeds 35%', () => {
    // price=10, costPerServing=4 → 40% > 35%
    mockCateringItems.set([makeItem('i1', 'Salmon', 10)]);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(makeRecipe('i1', 4));
    const { component } = createComponent();
    const alerts = component.costAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alertType).toBe('high-cost');
  });

  it('costAlerts excludes items within acceptable cost threshold', () => {
    // price=10, costPerServing=3 → 30% ≤ 35% → no alert
    mockCateringItems.set([makeItem('i1', 'Salmon', 10)]);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(makeRecipe('i1', 3));
    const { component } = createComponent();
    expect(component.costAlerts()).toHaveLength(0);
  });

  it('costAlerts handles zero price without crashing (avoids divide-by-zero)', () => {
    mockCateringItems.set([makeItem('i1', 'Comp Item', 0)]);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(makeRecipe('i1', 5));
    const { component } = createComponent();
    // foodCostPct = null when price = 0, so no high-cost alert; recipe exists so no no-recipe; costPerServing set so no no-cost-data
    // → alertType = null → excluded from results
    expect(component.costAlerts()).toHaveLength(0);
  });

  it('costAlerts includes item and recipe reference on each entry', () => {
    mockCateringItems.set([makeItem('i1', 'Salmon', 30)]);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(undefined);
    const { component } = createComponent();
    const alert = component.costAlerts()[0];
    expect(alert.item.id).toBe('i1');
  });

  it('costAlerts handles multiple items with mixed alert types', () => {
    mockCateringItems.set([
      makeItem('no-recipe', 'Mystery', 20),
      makeItem('no-cost', 'Bread', 5),
      makeItem('high', 'Truffle', 10),
      makeItem('ok', 'Chicken', 20),
    ]);
    mockRecipeCostingService.getRecipeForMenuItem.mockImplementation((id: string) => {
      if (id === 'no-recipe') return undefined;
      if (id === 'no-cost') return makeRecipe(id, null);
      if (id === 'high') return makeRecipe(id, 4);   // 40% > 35%
      if (id === 'ok') return makeRecipe(id, 5);      // 25% ≤ 35%
      return undefined;
    });
    const { component } = createComponent();
    const alerts = component.costAlerts();
    expect(alerts).toHaveLength(3);
    const types = alerts.map(a => a.alertType);
    expect(types).toContain('no-recipe');
    expect(types).toContain('no-cost-data');
    expect(types).toContain('high-cost');
  });

  it('costAlerts with costPerServing=0 (not null) — food cost is 0%, no alert', () => {
    // costPerServing=0 is not nullish → costPerServing !== null → not no-cost-data
    // foodCostPct = 0/20 = 0 → not > 0.35 → not high-cost
    // recipe exists → not no-recipe
    // → alertType = null → excluded
    mockCateringItems.set([makeItem('i1', 'Rice', 20)]);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(makeRecipe('i1', 0));
    const { component } = createComponent();
    expect(component.costAlerts()).toHaveLength(0);
  });

  // ── filteredItems ──────────────────────────────────────────────────────────

  it('filteredItems returns all items when search query is empty', () => {
    mockCateringItems.set([makeItem('i1', 'Salmon', 30), makeItem('i2', 'Bread', 5)]);
    const { component } = createComponent();
    expect(component.filteredItems()).toHaveLength(2);
  });

  it('filteredItems filters by item name (case-insensitive)', () => {
    mockCateringItems.set([makeItem('i1', 'Salmon Fillet', 30), makeItem('i2', 'Chicken Breast', 25)]);
    const { component } = createComponent();
    component.onSearch('salmon');
    expect(component.filteredItems().map(i => i.id)).toEqual(['i1']);
  });

  it('filteredItems matches by ingredient name in recipe', () => {
    mockCateringItems.set([makeItem('i1', 'Pasta Dish', 18), makeItem('i2', 'Salad', 12)]);
    mockRecipeCostingService.getRecipeForMenuItem.mockImplementation((id: string) => {
      if (id === 'i1') return makeRecipe('i1', null, [{ ingredientName: 'Parmigiano', quantity: 1, unit: 'oz' }]);
      if (id === 'i2') return makeRecipe('i2', null, [{ ingredientName: 'Lettuce', quantity: 1, unit: 'cup' }]);
      return undefined;
    });
    const { component } = createComponent();
    component.onSearch('parmig');
    expect(component.filteredItems().map(i => i.id)).toEqual(['i1']);
  });

  it('filteredItems returns empty when no items match', () => {
    mockCateringItems.set([makeItem('i1', 'Salmon', 30)]);
    const { component } = createComponent();
    component.onSearch('xyz-no-match');
    expect(component.filteredItems()).toHaveLength(0);
  });

  it('onSearch updates searchQuery signal', () => {
    const { component } = createComponent();
    component.onSearch('truffle');
    expect(component.searchQuery()).toBe('truffle');
  });

  it('filteredItems search then clear returns full list', () => {
    mockCateringItems.set([
      makeItem('i1', 'Salmon Fillet', 30),
      makeItem('i2', 'Chicken Breast', 25),
      makeItem('i3', 'Beef Stew', 18),
    ]);
    const { component } = createComponent();
    // Narrow down to 1 result
    component.onSearch('salmon');
    expect(component.filteredItems()).toHaveLength(1);
    // Clear search — all 3 items should be returned
    component.onSearch('');
    expect(component.filteredItems()).toHaveLength(3);
  });

  // ── getFoodCostPct ─────────────────────────────────────────────────────────

  it('getFoodCostPct returns null when no recipe', () => {
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(undefined);
    const { component } = createComponent();
    expect(component.getFoodCostPct(makeItem('i1', 'x', 20) as MenuItem)).toBeNull();
  });

  it('getFoodCostPct returns null when recipe has no costPerServing', () => {
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(makeRecipe('i1', null));
    const { component } = createComponent();
    expect(component.getFoodCostPct(makeItem('i1', 'x', 20) as MenuItem)).toBeNull();
  });

  it('getFoodCostPct returns null when price is 0', () => {
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(makeRecipe('i1', 5));
    const { component } = createComponent();
    expect(component.getFoodCostPct(makeItem('i1', 'x', 0) as MenuItem)).toBeNull();
  });

  it('getFoodCostPct calculates food cost percentage correctly', () => {
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(makeRecipe('i1', 7));
    const { component } = createComponent();
    // cost=7, price=20 → 7/20 * 100 = 35%
    expect(component.getFoodCostPct(makeItem('i1', 'x', 20) as MenuItem)).toBeCloseTo(35);
  });

  // ── getCateringAllergens ───────────────────────────────────────────────────

  it('getCateringAllergens returns empty array when undefined', () => {
    const { component } = createComponent();
    expect(component.getCateringAllergens(makeItem('i1', 'x', 10) as MenuItem)).toEqual([]);
  });

  it('getCateringAllergens returns the allergen list', () => {
    const { component } = createComponent();
    const item = { ...makeItem('i1', 'x', 10), cateringAllergens: ['gluten', 'dairy'] } as MenuItem;
    expect(component.getCateringAllergens(item)).toEqual(['gluten', 'dairy']);
  });

  // ── isLoading ──────────────────────────────────────────────────────────────

  it('isLoading reflects combined menu + recipe loading state — both idle', () => {
    const { component } = createComponent();
    expect(component.isLoading()).toBe(false);
  });

  it('isLoading is true when menu service is loading', () => {
    mockMenuIsLoading.set(true);
    const { component } = createComponent();
    expect(component.isLoading()).toBe(true);
  });

  it('isLoading is true when recipe costing service is loading', () => {
    mockRecipeIsLoading.set(true);
    const { component } = createComponent();
    expect(component.isLoading()).toBe(true);
  });

  // ── Error handling (per testing template) ──────────────────────────────────

  it('costAlerts handles item with negative price (no crash)', () => {
    mockCateringItems.set([makeItem('i1', 'Discount', -5)]);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(makeRecipe('i1', 3));
    const { component } = createComponent();
    // price < 0 → foodCostPct = 3/-5 which is negative → not > 0.35 → no high-cost alert
    // recipe exists → no no-recipe; costPerServing set → no no-cost-data
    expect(component.costAlerts()).toHaveLength(0);
  });

  it('costAlerts handles extreme food cost (>100%)', () => {
    // price=5, cost=10 → 200% > 35% → high-cost alert
    mockCateringItems.set([makeItem('i1', 'Loss Leader', 5)]);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(makeRecipe('i1', 10));
    const { component } = createComponent();
    const alerts = component.costAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alertType).toBe('high-cost');
  });

  it('filteredItems search is case-insensitive for ingredient match', () => {
    mockCateringItems.set([makeItem('i1', 'Pasta', 18)]);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(
      makeRecipe('i1', null, [{ ingredientName: 'PARMESAN CHEESE', quantity: 1, unit: 'oz' }]),
    );
    const { component } = createComponent();
    component.onSearch('parmesan');
    expect(component.filteredItems()).toHaveLength(1);
  });

  it('recipeCoveragePercent rounds to nearest integer', () => {
    mockCateringItems.set([
      makeItem('i1', 'A', 10),
      makeItem('i2', 'B', 10),
      makeItem('i3', 'C', 10),
    ]);
    mockRecipeCostingService.getRecipeForMenuItem.mockImplementation(
      (id: string) => id === 'i1' ? makeRecipe(id) : undefined,
    );
    const { component } = createComponent();
    // 1/3 = 33.33% → rounds to 33
    expect(component.recipeCoveragePercent()).toBe(33);
  });
});
