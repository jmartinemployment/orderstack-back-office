import '../../../../test-setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { BeveragesComponent } from './beverages.component';
import { MenuService } from '../../../services/menu';
import { MenuItem } from '../../../models/menu.model';

// ── Factory ───────────────────────────────────────────────────────────────────

function makeItem(
  id: string,
  name: string,
  price: number,
  itemCategory?: string,
  beverageType?: string,
): Partial<MenuItem> {
  return { id, name, price, itemCategory, beverageType } as Partial<MenuItem>;
}

// ── Mock service ──────────────────────────────────────────────────────────────

let mockAllItems = signal<Partial<MenuItem>[]>([]);
const mockIsLoading = signal(false);

const mockMenuService = {
  isLoading: mockIsLoading.asReadonly(),
  allItems: () => mockAllItems() as MenuItem[],
  loadMenu: vi.fn(),
  updateItem: vi.fn().mockResolvedValue(undefined),
};

// ── Setup ─────────────────────────────────────────────────────────────────────

function createComponent() {
  TestBed.overrideProvider(MenuService, { useValue: mockMenuService });
  const fixture = TestBed.createComponent(BeveragesComponent);
  return { fixture, component: fixture.componentInstance };
}

describe('BeveragesComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockAllItems = signal<Partial<MenuItem>[]>([]);
    mockIsLoading.set(false);

    await TestBed.configureTestingModule({
      imports: [BeveragesComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  // ── ngOnInit ───────────────────────────────────────────────────────────────

  it('ngOnInit calls loadMenu', () => {
    const { component } = createComponent();
    component.ngOnInit();
    expect(mockMenuService.loadMenu).toHaveBeenCalledOnce();
  });

  // ── isLoading ──────────────────────────────────────────────────────────────

  it('isLoading reflects true when menuService.isLoading is true', () => {
    mockIsLoading.set(true);
    const { component } = createComponent();
    expect(component.isLoading()).toBe(true);
    mockIsLoading.set(false);
    expect(component.isLoading()).toBe(false);
  });

  // ── beverageItems ──────────────────────────────────────────────────────────

  it('beverageItems is empty when no items', () => {
    mockAllItems.set([]);
    const { component } = createComponent();
    expect(component.beverageItems()).toEqual([]);
  });

  it('beverageItems filters to itemCategory === beverage from all items', () => {
    mockAllItems.set([
      makeItem('b1', 'Wine', 12, 'beverage', 'wine'),
      makeItem('f1', 'Chicken', 25, 'entree'),
      makeItem('b2', 'Beer', 8, 'beverage', 'beer'),
    ]);
    const { component } = createComponent();
    const ids = component.beverageItems().map(i => i.id);
    expect(ids).toEqual(['b1', 'b2']);
  });

  it('beverageItems excludes items with no itemCategory', () => {
    mockAllItems.set([makeItem('x1', 'Water', 0)]);
    const { component } = createComponent();
    expect(component.beverageItems()).toHaveLength(0);
  });

  it('beverageItems includes items that have no cateringPricing', () => {
    mockAllItems.set([
      { id: 'b1', name: 'Soda', price: 3, itemCategory: 'beverage', cateringPricing: [] } as any,
    ]);
    const { component } = createComponent();
    expect(component.beverageItems()).toHaveLength(1);
  });

  it('Signal reactivity — beverageItems updates when allItems changes', () => {
    mockAllItems.set([makeItem('b1', 'Wine', 12, 'beverage', 'wine')]);
    const { component } = createComponent();
    expect(component.beverageItems()).toHaveLength(1);
    mockAllItems.set([
      makeItem('b1', 'Wine', 12, 'beverage', 'wine'),
      makeItem('b2', 'Beer', 8, 'beverage', 'beer'),
    ]);
    expect(component.beverageItems()).toHaveLength(2);
  });

  // ── nonBeverageItems ───────────────────────────────────────────────────────

  it('nonBeverageItems excludes beverage items', () => {
    mockAllItems.set([
      makeItem('b1', 'Wine', 12, 'beverage'),
      makeItem('f1', 'Chicken', 25, 'entree'),
    ]);
    const { component } = createComponent();
    const ids = component.nonBeverageItems().map(i => i.id);
    expect(ids).toEqual(['f1']);
  });

  it('nonBeverageItems includes items with no itemCategory', () => {
    mockAllItems.set([makeItem('x1', 'Bread', 3)]);
    const { component } = createComponent();
    expect(component.nonBeverageItems()).toHaveLength(1);
  });

  it('nonBeverageItems shows all non-beverage items regardless of cateringPricing', () => {
    mockAllItems.set([
      { id: 'f1', name: 'Pasta', price: 18, itemCategory: 'food', cateringPricing: [] } as any,
      { id: 'f2', name: 'Steak', price: 35, itemCategory: 'food', cateringPricing: [{ tier: 'standard', price: 40 }] } as any,
    ]);
    const { component } = createComponent();
    expect(component.nonBeverageItems()).toHaveLength(2);
  });

  // ── beverageGroupEntries ───────────────────────────────────────────────────

  it('beverageGroupEntries is empty when no beverages', () => {
    mockAllItems.set([]);
    const { component } = createComponent();
    expect(component.beverageGroupEntries()).toEqual([]);
  });

  it('beverageGroupEntries groups by beverageType', () => {
    mockAllItems.set([
      makeItem('w1', 'Red Wine', 14, 'beverage', 'wine'),
      makeItem('w2', 'White Wine', 12, 'beverage', 'wine'),
      makeItem('b1', 'Lager', 8, 'beverage', 'beer'),
    ]);
    const { component } = createComponent();
    const entries = component.beverageGroupEntries();
    const wineGroup = entries.find(e => e.type === 'wine');
    const beerGroup = entries.find(e => e.type === 'beer');
    expect(wineGroup?.items).toHaveLength(2);
    expect(beerGroup?.items).toHaveLength(1);
  });

  it('beverageGroupEntries defaults beverageType to "other" when undefined', () => {
    mockAllItems.set([makeItem('x1', 'Mystery Drink', 10, 'beverage', undefined)]);
    const { component } = createComponent();
    const entries = component.beverageGroupEntries();
    expect(entries[0].type).toBe('other');
  });

  it('beverageGroupEntries ordering — entries appear in insertion order', () => {
    mockAllItems.set([
      makeItem('w1', 'Merlot', 14, 'beverage', 'wine'),
      makeItem('b1', 'Lager', 8, 'beverage', 'beer'),
      makeItem('s1', 'Vodka', 10, 'beverage', 'spirit'),
    ]);
    const { component } = createComponent();
    const entries = component.beverageGroupEntries();
    expect(entries[0].type).toBe('wine');
  });

  // ── avgPricePerHead ────────────────────────────────────────────────────────

  it('avgPricePerHead is 0 when no beverages', () => {
    mockAllItems.set([]);
    const { component } = createComponent();
    expect(component.avgPricePerHead()).toBe(0);
  });

  it('avgPricePerHead calculates mean of beverage prices', () => {
    mockAllItems.set([
      makeItem('b1', 'Wine', 10, 'beverage', 'wine'),
      makeItem('b2', 'Beer', 6, 'beverage', 'beer'),
      makeItem('b3', 'Juice', 4, 'beverage', 'non-alcoholic'),
    ]);
    const { component } = createComponent();
    expect(component.avgPricePerHead()).toBeCloseTo(20 / 3);
  });

  it('avgPricePerHead excludes non-beverage items from calculation', () => {
    mockAllItems.set([
      makeItem('b1', 'Wine', 12, 'beverage', 'wine'),
      makeItem('f1', 'Chicken', 100, 'entree'),
    ]);
    const { component } = createComponent();
    expect(component.avgPricePerHead()).toBeCloseTo(12);
  });

  // ── beverageTypeCount ──────────────────────────────────────────────────────

  it('beverageTypeCount is 0 when no beverages', () => {
    mockAllItems.set([]);
    const { component } = createComponent();
    expect(component.beverageTypeCount()).toBe(0);
  });

  it('beverageTypeCount counts unique types', () => {
    mockAllItems.set([
      makeItem('b1', 'Red', 14, 'beverage', 'wine'),
      makeItem('b2', 'White', 12, 'beverage', 'wine'),
      makeItem('b3', 'Lager', 8, 'beverage', 'beer'),
    ]);
    const { component } = createComponent();
    expect(component.beverageTypeCount()).toBe(2);
  });

  // ── typeLabel ──────────────────────────────────────────────────────────────

  it('typeLabel maps known types to human-readable labels', () => {
    const { component } = createComponent();
    expect(component.typeLabel('spirit')).toBe('Spirits');
    expect(component.typeLabel('wine')).toBe('Wine');
    expect(component.typeLabel('beer')).toBe('Beer');
    expect(component.typeLabel('non-alcoholic')).toBe('Non-Alcoholic');
    expect(component.typeLabel('coffee-tea')).toBe('Coffee & Tea');
    expect(component.typeLabel('other')).toBe('Other');
  });

  it('typeLabel passes through unknown types unchanged', () => {
    const { component } = createComponent();
    expect(component.typeLabel('kombucha')).toBe('kombucha');
  });

  // ── getCateringAllergens ───────────────────────────────────────────────────

  it('getCateringAllergens returns empty array when undefined', () => {
    const { component } = createComponent();
    const item = makeItem('x', 'Wine', 10) as MenuItem;
    expect(component.getCateringAllergens(item)).toEqual([]);
  });

  it('getCateringAllergens returns the cateringAllergens array', () => {
    const { component } = createComponent();
    const item = { ...makeItem('x', 'Wine', 10), cateringAllergens: ['sulfites', 'gluten'] } as MenuItem;
    expect(component.getCateringAllergens(item)).toEqual(['sulfites', 'gluten']);
  });

  // ── markAsBeverage ────────────────────────────────────────────────────────

  it('markAsBeverage calls updateItem with itemCategory beverage', async () => {
    const { component } = createComponent();
    const item = makeItem('item-1', 'Juice', 5, 'entree') as MenuItem;
    await component.markAsBeverage(item);
    expect(mockMenuService.updateItem).toHaveBeenCalledWith('item-1', { itemCategory: 'beverage' });
  });

  it('markAsBeverage handles updateItem rejection without crashing', async () => {
    mockMenuService.updateItem.mockRejectedValue(new Error('Network error'));
    const { component } = createComponent();
    const item = makeItem('item-1', 'Juice', 5, 'entree') as MenuItem;
    await expect(component.markAsBeverage(item)).rejects.toThrow('Network error');
  });

  it('markAsBeverage rejection — beverageItems count unchanged', async () => {
    mockAllItems.set([
      makeItem('b1', 'Wine', 12, 'beverage', 'wine'),
      makeItem('b2', 'Beer', 8, 'beverage', 'beer'),
    ]);
    mockMenuService.updateItem.mockRejectedValue(new Error('Network error'));
    const { component } = createComponent();
    const item = makeItem('item-1', 'Juice', 5, 'entree') as MenuItem;
    try {
      await component.markAsBeverage(item);
    } catch {
      // expected rejection
    }
    expect(component.beverageItems()).toHaveLength(2);
  });

  it('beverageItems handles items with non-string price', () => {
    mockAllItems.set([
      { id: 'b1', name: 'Wine', price: '12.99' as any, itemCategory: 'beverage', beverageType: 'wine' },
    ]);
    const { component } = createComponent();
    expect(component.beverageItems()).toHaveLength(1);
    expect(component.avgPricePerHead()).toBeCloseTo(12.99);
  });

  it('beverageGroupEntries handles multiple items with same undefined beverageType', () => {
    mockAllItems.set([
      makeItem('x1', 'Custom 1', 5, 'beverage', undefined),
      makeItem('x2', 'Custom 2', 7, 'beverage', undefined),
    ]);
    const { component } = createComponent();
    const entries = component.beverageGroupEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe('other');
    expect(entries[0].items).toHaveLength(2);
  });

  it('avgPricePerHead handles zero-price beverages', () => {
    mockAllItems.set([
      makeItem('b1', 'Free Water', 0, 'beverage', 'non-alcoholic'),
      makeItem('b2', 'Wine', 20, 'beverage', 'wine'),
    ]);
    const { component } = createComponent();
    expect(component.avgPricePerHead()).toBeCloseTo(10);
  });
});
