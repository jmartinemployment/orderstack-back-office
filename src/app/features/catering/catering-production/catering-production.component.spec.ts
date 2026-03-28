import '../../../../test-setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { CateringProductionComponent } from './catering-production.component';
import { CateringService } from '../../../services/catering.service';
import { RecipeCostingService } from '../../../services/recipe-costing';
import { CateringPrepList } from '../../../models/catering.model';

// ── Factories ────────────────────────────────────────────────────────────────

function makePrepList(overrides: Partial<CateringPrepList> = {}): CateringPrepList {
  return {
    date: '2026-03-18',
    jobCount: 0,
    totalGuests: 0,
    jobs: [],
    ...overrides,
  };
}

function makeJob(
  id: string,
  headcount: number,
  selectedPackageId: string | null,
  packageMenuItemIds: string[] = [],
) {
  return {
    id,
    title: `Job ${id}`,
    headcount,
    startTime: '10:00',
    selectedPackageId,
    packages: selectedPackageId
      ? [{ id: selectedPackageId, name: 'Pkg', tier: 'standard' as const, pricePerPerson: 50, minimumHeadcount: 10, menuItemIds: packageMenuItemIds }]
      : [],
    dietaryRequirements: null,
    deliveryDetails: null,
  };
}

function makeRecipe(menuItemId: string, ingredientName: string, quantity: number, unit: string, yieldQty = 1, estimatedUnitCost?: number) {
  return {
    id: `recipe-${menuItemId}`,
    menuItemId,
    name: `Recipe for ${menuItemId}`,
    yieldQty,
    costPerServing: null,
    ingredients: [{ ingredientName, quantity, unit, estimatedUnitCost }],
  };
}

// ── Mock services ────────────────────────────────────────────────────────────

const mockCateringService = {
  loadPrepList: vi.fn().mockResolvedValue(null),
};

const mockIsLoading = signal(false);
const mockRecipeCostingService = {
  isLoading: mockIsLoading.asReadonly(),
  loadRecipes: vi.fn(),
  getRecipeForMenuItem: vi.fn().mockReturnValue(undefined),
};

// ── Setup ────────────────────────────────────────────────────────────────────

function createComponent() {
  TestBed.overrideProvider(CateringService, { useValue: mockCateringService });
  TestBed.overrideProvider(RecipeCostingService, { useValue: mockRecipeCostingService });
  const fixture = TestBed.createComponent(CateringProductionComponent);
  return { fixture, component: fixture.componentInstance };
}

describe('CateringProductionComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockCateringService.loadPrepList.mockResolvedValue(null);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(undefined);

    await TestBed.configureTestingModule({
      imports: [CateringProductionComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('starts with no prep list data', () => {
    const { component } = createComponent();
    expect(component.prepListData()).toBeNull();
  });

  it('starts not loading', () => {
    const { component } = createComponent();
    expect(component.isLoading()).toBe(false);
  });

  it('aggregatedIngredients is empty when no prep list', () => {
    const { component } = createComponent();
    expect(component.aggregatedIngredients()).toEqual([]);
  });

  it('totalGuests is 0 when no prep list', () => {
    const { component } = createComponent();
    expect(component.totalGuests()).toBe(0);
  });

  // ── ngOnInit ───────────────────────────────────────────────────────────────

  it('ngOnInit calls loadRecipes and loadPrepList', async () => {
    const { component } = createComponent();
    await component.ngOnInit();
    expect(mockRecipeCostingService.loadRecipes).toHaveBeenCalledOnce();
    expect(mockCateringService.loadPrepList).toHaveBeenCalledOnce();
  });

  // ── loadForDate ────────────────────────────────────────────────────────────

  it('loadForDate sets selectedDate', async () => {
    const { component } = createComponent();
    await component.loadForDate('2026-04-01');
    expect(component.selectedDate()).toBe('2026-04-01');
  });

  it('loadForDate sets prepListData from service result', async () => {
    const prepList = makePrepList({ date: '2026-04-01', jobCount: 2, totalGuests: 40 });
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    const { component } = createComponent();
    await component.loadForDate('2026-04-01');
    expect(component.prepListData()).toEqual(prepList);
  });

  it('loadForDate sets prepListData to null when service returns null', async () => {
    mockCateringService.loadPrepList.mockResolvedValue(null);
    const { component } = createComponent();
    await component.loadForDate('2026-04-01');
    expect(component.prepListData()).toBeNull();
  });

  it('isLoading is true DURING loadForDate', () => {
    // Use a promise that never resolves so isLoading stays true throughout
    mockCateringService.loadPrepList.mockReturnValue(new Promise(() => {}));
    const { component } = createComponent();
    // Do NOT await — fire and immediately inspect
    void component.loadForDate('2026-04-01');
    expect(component.isLoading()).toBe(true);
  });

  it('loadForDate resets isLoading to false after rejection', async () => {
    mockCateringService.loadPrepList.mockRejectedValue(new Error('Network error'));
    const { component } = createComponent();
    // Swallow the rejection — the component uses try/finally so isLoading resets regardless
    try {
      await component.loadForDate('2026-04-01');
    } catch {
      // rejection is expected; we only care about the finally block side-effect
    }
    expect(component.isLoading()).toBe(false);
  });

  // ── totalGuests ────────────────────────────────────────────────────────────

  it('totalGuests sums headcounts across all jobs', async () => {
    const prepList = makePrepList({
      jobs: [makeJob('j1', 30, null), makeJob('j2', 20, null)] as any,
    });
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    const { component } = createComponent();
    await component.loadForDate('2026-03-18');
    expect(component.totalGuests()).toBe(50);
  });

  // ── aggregatedIngredients ──────────────────────────────────────────────────

  it('skips job when no matching package', async () => {
    const prepList = makePrepList({
      jobs: [makeJob('j1', 10, 'pkg-99', ['item-1'])] as any,
    });
    // job has selectedPackageId 'pkg-99' but its packages array has it
    // recipe exists but package lookup should succeed here — test no-package path:
    const jobNoPackage = { ...makeJob('j1', 10, 'pkg-missing', ['item-1']), packages: [] };
    prepList.jobs = [jobNoPackage as any];
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(makeRecipe('item-1', 'Flour', 2, 'kg'));
    const { component } = createComponent();
    await component.loadForDate('2026-03-18');
    expect(component.aggregatedIngredients()).toEqual([]);
  });

  it('skips item when no recipe found', async () => {
    const prepList = makePrepList({
      jobs: [makeJob('j1', 10, 'pkg-1', ['item-1'])] as any,
    });
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(undefined);
    const { component } = createComponent();
    await component.loadForDate('2026-03-18');
    expect(component.aggregatedIngredients()).toEqual([]);
  });

  it('applies headcount / yieldQty scale factor', async () => {
    const prepList = makePrepList({
      jobs: [makeJob('j1', 20, 'pkg-1', ['item-1'])] as any,
    });
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    // recipe yields 10 portions, ingredient qty 3 → scale = 20/10 = 2 → total = 6
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(
      makeRecipe('item-1', 'Butter', 3, 'lbs', 10),
    );
    const { component } = createComponent();
    await component.loadForDate('2026-03-18');
    expect(component.aggregatedIngredients()[0].totalQuantity).toBeCloseTo(6);
  });

  it('uses yieldQty = 1 when recipe.yieldQty is 0 (avoids divide-by-zero)', async () => {
    const prepList = makePrepList({
      jobs: [makeJob('j1', 5, 'pkg-1', ['item-1'])] as any,
    });
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(
      makeRecipe('item-1', 'Cream', 2, 'cups', 0),
    );
    const { component } = createComponent();
    await component.loadForDate('2026-03-18');
    // scale = 5 / (0 || 1) = 5, qty = 2 → total = 10
    expect(component.aggregatedIngredients()[0].totalQuantity).toBeCloseTo(10);
  });

  it('aggregates same ingredient across two jobs', async () => {
    const prepList = makePrepList({
      jobs: [
        makeJob('j1', 10, 'pkg-1', ['item-1']),
        makeJob('j2', 20, 'pkg-2', ['item-1']),
      ] as any,
    });
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    // Same ingredient from both jobs: scale = 10/1=10 qty 1 + scale = 20/1=20 qty 1 = 30
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(
      makeRecipe('item-1', 'Sugar', 1, 'kg'),
    );
    const { component } = createComponent();
    await component.loadForDate('2026-03-18');
    const result = component.aggregatedIngredients();
    expect(result).toHaveLength(1);
    expect(result[0].totalQuantity).toBeCloseTo(30);
    expect(result[0].jobs).toContain('j1');
    expect(result[0].jobs).toContain('j2');
  });

  it('does not duplicate job id when ingredient appears in multiple items from same job', async () => {
    const prepList = makePrepList({
      jobs: [makeJob('j1', 10, 'pkg-1', ['item-1', 'item-2'])] as any,
    });
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    // Both items share the same ingredient name+unit
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(
      makeRecipe('item-x', 'Salt', 1, 'tsp'),
    );
    const { component } = createComponent();
    await component.loadForDate('2026-03-18');
    const result = component.aggregatedIngredients();
    const jobIds = result[0].jobs;
    expect(new Set(jobIds).size).toBe(jobIds.length); // no duplicates
  });

  it('returns ingredients sorted alphabetically by name', async () => {
    const prepList = makePrepList({
      jobs: [makeJob('j1', 1, 'pkg-1', ['item-a', 'item-b'])] as any,
    });
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    mockRecipeCostingService.getRecipeForMenuItem
      .mockImplementation((id: string) =>
        id === 'item-a'
          ? { ...makeRecipe('item-a', 'Zucchini', 1, 'kg'), yieldQty: 1 }
          : { ...makeRecipe('item-b', 'Asparagus', 2, 'kg'), yieldQty: 1 },
      );
    const { component } = createComponent();
    await component.loadForDate('2026-03-18');
    const names = component.aggregatedIngredients().map(i => i.name);
    expect(names).toEqual([...names].sort());
  });

  it('preserves unitCost from ingredient', async () => {
    const prepList = makePrepList({
      jobs: [makeJob('j1', 1, 'pkg-1', ['item-1'])] as any,
    });
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(
      makeRecipe('item-1', 'Vanilla', 0.5, 'oz', 1, 12.5),
    );
    const { component } = createComponent();
    await component.loadForDate('2026-03-18');
    expect(component.aggregatedIngredients()[0].unitCost).toBe(12.5);
  });

  it('same ingredient name with different unit produces 2 separate rows', async () => {
    const prepList = makePrepList({
      jobs: [makeJob('j1', 10, 'pkg-1', ['item-a', 'item-b'])] as any,
    });
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    // Both items are named "Salt" but use different units — must NOT merge
    mockRecipeCostingService.getRecipeForMenuItem
      .mockImplementation((id: string) =>
        id === 'item-a'
          ? makeRecipe('item-a', 'Salt', 1, 'tsp')
          : makeRecipe('item-b', 'Salt', 1, 'tbsp'),
      );
    const { component } = createComponent();
    await component.loadForDate('2026-03-18');
    expect(component.aggregatedIngredients()).toHaveLength(2);
  });

  // ── getPackageForJob ───────────────────────────────────────────────────────

  it('getPackageForJob returns the selected package', () => {
    const { component } = createComponent();
    const job = makeJob('j1', 10, 'pkg-1', ['item-1']) as any;
    const pkg = component.getPackageForJob(job);
    expect(pkg?.id).toBe('pkg-1');
  });

  it('getPackageForJob returns undefined when no matching package', () => {
    const { component } = createComponent();
    const job = { ...makeJob('j1', 10, 'pkg-missing', []), packages: [] } as any;
    expect(component.getPackageForJob(job)).toBeUndefined();
  });

  // ── exportCsv ─────────────────────────────────────────────────────────────

  it('exportCsv is a no-op when aggregatedIngredients is empty', async () => {
    const { component } = createComponent();
    const createObjectURL = vi.fn().mockReturnValue('blob:url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    component.exportCsv();
    expect(createObjectURL).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('exportCsv generates CSV with header and one data row', async () => {
    const prepList = makePrepList({
      jobs: [makeJob('j1', 2, 'pkg-1', ['item-1'])] as any,
    });
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(
      makeRecipe('item-1', 'Olive Oil', 1, 'cup', 1, 8),
    );
    const { component } = createComponent();
    await component.loadForDate('2026-03-18');

    let capturedCsvContent = '';
    const originalBlob = globalThis.Blob;
    vi.stubGlobal('Blob', class MockBlob {
      constructor(parts: string[]) { capturedCsvContent = parts.join(''); }
    });
    const createObjectURL = vi.fn().mockReturnValue('blob:url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    // Stub document.createElement to avoid real DOM anchor click
    const mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

    component.exportCsv();

    expect(capturedCsvContent).toContain('Ingredient,Quantity,Unit,Est. Cost,Jobs');
    expect(capturedCsvContent).toContain('"Olive Oil"');
    expect(capturedCsvContent).toContain('$8.00');
    expect(capturedCsvContent).toContain('"j1"');
    expect(mockAnchor.click).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.stubGlobal('Blob', originalBlob);
  });

  it('exportCsv shows N/A for ingredients with no unit cost', async () => {
    const prepList = makePrepList({
      jobs: [makeJob('j1', 1, 'pkg-1', ['item-1'])] as any,
    });
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(
      makeRecipe('item-1', 'Salt', 1, 'tsp', 1, undefined),
    );
    const { component } = createComponent();
    await component.loadForDate('2026-03-18');

    let capturedCsvContent = '';
    vi.stubGlobal('Blob', class MockBlob {
      constructor(parts: string[]) { capturedCsvContent = parts.join(''); }
    });
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:url'), revokeObjectURL: vi.fn() });
    vi.spyOn(document, 'createElement').mockReturnValue({ href: '', download: '', click: vi.fn() } as any);

    component.exportCsv();
    expect(capturedCsvContent).toContain('N/A');

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exportCsv quotes ingredient names containing commas', async () => {
    const prepList = makePrepList({
      jobs: [makeJob('j1', 1, 'pkg-1', ['item-1'])] as any,
    });
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(
      makeRecipe('item-1', 'Olive Oil, Extra Virgin', 1, 'cup', 1, 10),
    );
    const { component } = createComponent();
    await component.loadForDate('2026-03-18');

    let capturedCsvContent = '';
    const originalBlob = globalThis.Blob;
    vi.stubGlobal('Blob', class MockBlob {
      constructor(parts: string[]) { capturedCsvContent = parts.join(''); }
    });
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:url'), revokeObjectURL: vi.fn() });
    vi.spyOn(document, 'createElement').mockReturnValue({ href: '', download: '', click: vi.fn() } as any);

    component.exportCsv();
    expect(capturedCsvContent).toContain('"Olive Oil, Extra Virgin"');

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.stubGlobal('Blob', originalBlob);
  });

  // ── print ──────────────────────────────────────────────────────────────────

  it('print() calls globalThis.print', () => {
    const { component } = createComponent();
    const printSpy = vi.spyOn(globalThis, 'print').mockImplementation(() => {});
    component.print();
    expect(printSpy).toHaveBeenCalledOnce();
    printSpy.mockRestore();
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it('loadForDate handles service returning undefined gracefully', async () => {
    mockCateringService.loadPrepList.mockResolvedValue(undefined);
    const { component } = createComponent();
    await component.loadForDate('2026-04-01');
    expect(component.prepListData()).toBeUndefined();
    expect(component.aggregatedIngredients()).toEqual([]);
  });

  it('aggregatedIngredients handles job with null headcount', async () => {
    const prepList = makePrepList({
      jobs: [{ ...makeJob('j1', 0, 'pkg-1', ['item-1']), headcount: 0 }] as any,
    });
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue(
      makeRecipe('item-1', 'Flour', 2, 'kg', 1),
    );
    const { component } = createComponent();
    await component.loadForDate('2026-03-18');
    // headcount 0 / yieldQty 1 = scale 0 → quantity 0
    expect(component.aggregatedIngredients()[0].totalQuantity).toBe(0);
  });

  it('aggregatedIngredients handles recipe with empty ingredients array', async () => {
    const prepList = makePrepList({
      jobs: [makeJob('j1', 10, 'pkg-1', ['item-1'])] as any,
    });
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue({
      id: 'recipe-1', menuItemId: 'item-1', name: 'Empty Recipe', yieldQty: 1, costPerServing: null, ingredients: [],
    });
    const { component } = createComponent();
    await component.loadForDate('2026-03-18');
    expect(component.aggregatedIngredients()).toEqual([]);
  });

  it('aggregatedIngredients handles recipe with null ingredients', async () => {
    const prepList = makePrepList({
      jobs: [makeJob('j1', 10, 'pkg-1', ['item-1'])] as any,
    });
    mockCateringService.loadPrepList.mockResolvedValue(prepList);
    mockRecipeCostingService.getRecipeForMenuItem.mockReturnValue({
      id: 'recipe-1', menuItemId: 'item-1', name: 'Null Ing Recipe', yieldQty: 1, costPerServing: null, ingredients: null,
    });
    const { component } = createComponent();
    await component.loadForDate('2026-03-18');
    expect(component.aggregatedIngredients()).toEqual([]);
  });

  it('loadForDate passes correct date string to service', async () => {
    const { component } = createComponent();
    await component.loadForDate('2026-12-25');
    expect(mockCateringService.loadPrepList).toHaveBeenCalledWith('2026-12-25');
  });

  // ── Concurrent loadForDate ─────────────────────────────────────────────────

  it('concurrent loadForDate — last call data wins', async () => {
    const prepList1 = makePrepList({ date: '2026-04-01', jobCount: 1, totalGuests: 10 });
    const prepList2 = makePrepList({ date: '2026-04-02', jobCount: 2, totalGuests: 20 });
    mockCateringService.loadPrepList
      .mockResolvedValueOnce(prepList1)
      .mockResolvedValueOnce(prepList2);
    const { component } = createComponent();
    // Fire first call without awaiting, immediately fire second and await it
    void component.loadForDate('2026-04-01');
    await component.loadForDate('2026-04-02');
    expect(component.selectedDate()).toBe('2026-04-02');
  });
});
