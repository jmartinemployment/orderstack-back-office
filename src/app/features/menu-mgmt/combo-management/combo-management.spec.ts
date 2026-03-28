import '../../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal, computed } from '@angular/core';
import { of } from 'rxjs';
import { ComboManagement } from './combo-management';
import { ComboService } from '../../../services/combo';
import { MenuService } from '../../../services/menu';
import { AuthService } from '../../../services/auth';
import type { Combo, MenuItem, MenuCategory } from '../../../models/index';

function createMockAuthService() {
  return {
    isAuthenticated: computed(() => true),
    selectedMerchantId: signal<string | null>('r-1').asReadonly(),
    selectedMerchantName: signal<string | null>('Test').asReadonly(),
  };
}

function createMockMenuItems(): MenuItem[] {
  return [
    { id: 'mi-1', name: 'Burger', price: 10, categoryId: 'cat-1', merchantId: 'r-1', isActive: true } as MenuItem,
    { id: 'mi-2', name: 'Fries', price: 5, categoryId: 'cat-1', merchantId: 'r-1', isActive: true } as MenuItem,
    { id: 'mi-3', name: 'Soda', price: 3, categoryId: 'cat-1', merchantId: 'r-1', isActive: true } as MenuItem,
    { id: 'mi-4', name: 'Inactive Item', price: 8, categoryId: 'cat-1', merchantId: 'r-1', isActive: false } as MenuItem,
  ];
}

function createMockCombo(): Combo {
  return {
    id: 'combo-1', merchantId: 'r-1', name: 'Burger Meal', description: 'A classic combo',
    image: null, basePrice: 15, regularPrice: 18, savings: 3,
    items: [
      { menuItemId: 'mi-1', menuItemName: 'Burger', quantity: 1, isRequired: true },
      { menuItemId: 'mi-2', menuItemName: 'Fries', quantity: 1, isRequired: true },
      { menuItemId: 'mi-3', menuItemName: 'Soda', quantity: 1, isRequired: false },
    ],
    substituteGroups: [], isActive: true, displayOrder: 0, categoryId: null,
    createdAt: '2025-01-01', updatedAt: '2025-01-01',
  };
}

function createMockComboService() {
  const _combos = signal<Combo[]>([createMockCombo()]);
  return {
    combos: _combos.asReadonly(),
    activeCombos: computed(() => _combos().filter(c => c.isActive)),
    isLoading: signal(false).asReadonly(),
    error: signal<string | null>(null).asReadonly(),
    loadCombos: vi.fn(),
    createCombo: vi.fn().mockResolvedValue(undefined),
    updateCombo: vi.fn().mockResolvedValue(undefined),
    deleteCombo: vi.fn().mockResolvedValue(undefined),
    toggleActive: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockMenuService() {
  return {
    allItems: signal<MenuItem[]>(createMockMenuItems()).asReadonly(),
    categories: signal<MenuCategory[]>([
      { id: 'cat-1', name: 'Mains', merchantId: 'r-1', isActive: true, displayOrder: 0 },
    ]).asReadonly(),
    isLoading: signal(false).asReadonly(),
    error: signal<string | null>(null).asReadonly(),
    crudSupported: signal(true).asReadonly(),
    reportingCategories: signal([]).asReadonly(),
    loadMenu: vi.fn(),
    loadReportingCategories: vi.fn(),
  };
}

describe('ComboManagement', () => {
  let fixture: ComponentFixture<ComboManagement>;
  let component: ComboManagement;
  let comboService: ReturnType<typeof createMockComboService>;

  beforeEach(() => {
    comboService = createMockComboService();

    TestBed.configureTestingModule({
      imports: [ComboManagement],
      providers: [
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: ComboService, useValue: comboService },
        { provide: MenuService, useValue: createMockMenuService() },
        { provide: HttpClient, useValue: { get: vi.fn().mockReturnValue(of([])) } },
      ],
    });
    fixture = TestBed.createComponent(ComboManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads combos on init', () => {
    expect(comboService.loadCombos).toHaveBeenCalled();
  });

  // --- Form open/close ---

  it('showForm is false by default', () => {
    expect(component.showForm()).toBe(false);
  });

  it('openNewCombo resets form and shows it', () => {
    component.openNewCombo();
    expect(component.showForm()).toBe(true);
    expect(component.editingCombo()).toBeNull();
    expect(component.formName()).toBe('');
    expect(component.formBasePrice()).toBe(0);
    expect(component.formItems().length).toBe(0);
  });

  it('openEditCombo populates form with combo data', () => {
    const combo = createMockCombo();
    component.openEditCombo(combo);
    expect(component.showForm()).toBe(true);
    expect(component.editingCombo()).toBe(combo);
    expect(component.formName()).toBe('Burger Meal');
    expect(component.formBasePrice()).toBe(15);
    expect(component.formItems().length).toBe(3);
  });

  it('closeForm hides form and clears editing', () => {
    component.openNewCombo();
    component.closeForm();
    expect(component.showForm()).toBe(false);
    expect(component.editingCombo()).toBeNull();
  });

  // --- Form field updates ---

  it('onFormField updates name', () => {
    component.openNewCombo();
    const event = { target: { value: 'Test Combo' } } as unknown as Event;
    component.onFormField('name', event);
    expect(component.formName()).toBe('Test Combo');
  });

  it('onFormField updates basePrice', () => {
    component.openNewCombo();
    const event = { target: { value: '12.99' } } as unknown as Event;
    component.onFormField('basePrice', event);
    expect(component.formBasePrice()).toBe(12.99);
  });

  // --- Item management ---

  it('addItemToCombo adds a new item', () => {
    component.openNewCombo();
    const item = createMockMenuItems()[0];
    component.addItemToCombo(item);
    expect(component.formItems().length).toBe(1);
    expect(component.formItems()[0].menuItemId).toBe('mi-1');
    expect(component.formItems()[0].quantity).toBe(1);
  });

  it('addItemToCombo increments quantity for existing item', () => {
    component.openNewCombo();
    const item = createMockMenuItems()[0];
    component.addItemToCombo(item);
    component.addItemToCombo(item);
    expect(component.formItems().length).toBe(1);
    expect(component.formItems()[0].quantity).toBe(2);
  });

  it('removeItemFromCombo removes item', () => {
    component.openNewCombo();
    const items = createMockMenuItems();
    component.addItemToCombo(items[0]);
    component.addItemToCombo(items[1]);
    component.removeItemFromCombo('mi-1');
    expect(component.formItems().length).toBe(1);
    expect(component.formItems()[0].menuItemId).toBe('mi-2');
  });

  it('toggleItemRequired flips isRequired', () => {
    component.openNewCombo();
    component.addItemToCombo(createMockMenuItems()[0]);
    expect(component.formItems()[0].isRequired).toBe(true);
    component.toggleItemRequired('mi-1');
    expect(component.formItems()[0].isRequired).toBe(false);
  });

  it('isItemInCombo returns correct value', () => {
    component.openNewCombo();
    expect(component.isItemInCombo('mi-1')).toBe(false);
    component.addItemToCombo(createMockMenuItems()[0]);
    expect(component.isItemInCombo('mi-1')).toBe(true);
  });

  // --- Computed values ---

  it('regularPrice sums item prices * quantities', () => {
    component.openNewCombo();
    const items = createMockMenuItems();
    component.addItemToCombo(items[0]); // $10
    component.addItemToCombo(items[1]); // $5
    expect(component.regularPrice()).toBe(15);
  });

  it('savings = regularPrice - basePrice', () => {
    component.openNewCombo();
    const items = createMockMenuItems();
    component.addItemToCombo(items[0]); // $10
    component.addItemToCombo(items[1]); // $5
    const event = { target: { value: '12' } } as unknown as Event;
    component.onFormField('basePrice', event);
    expect(component.savings()).toBe(3);
  });

  it('savings is never negative', () => {
    component.openNewCombo();
    component.addItemToCombo(createMockMenuItems()[2]); // $3
    const event = { target: { value: '10' } } as unknown as Event;
    component.onFormField('basePrice', event);
    expect(component.savings()).toBe(0);
  });

  it('canSave requires name, basePrice > 0, and >= 2 items', () => {
    component.openNewCombo();
    expect(component.canSave()).toBe(false);

    const nameEvent = { target: { value: 'Test' } } as unknown as Event;
    component.onFormField('name', nameEvent);
    expect(component.canSave()).toBe(false);

    const priceEvent = { target: { value: '10' } } as unknown as Event;
    component.onFormField('basePrice', priceEvent);
    expect(component.canSave()).toBe(false);

    const items = createMockMenuItems();
    component.addItemToCombo(items[0]);
    expect(component.canSave()).toBe(false);

    component.addItemToCombo(items[1]);
    expect(component.canSave()).toBe(true);
  });

  it('filteredMenuItems excludes inactive items', () => {
    expect(component.filteredMenuItems().length).toBe(3);
    expect(component.filteredMenuItems().every(i => i.isActive !== false)).toBe(true);
  });

  it('filteredMenuItems filters by search', () => {
    component.openNewCombo();
    const event = { target: { value: 'burg' } } as unknown as Event;
    component.onFormField('itemSearch', event);
    expect(component.filteredMenuItems().length).toBe(1);
    expect(component.filteredMenuItems()[0].name).toBe('Burger');
  });

  // --- Save ---

  it('saveCombo creates new combo', async () => {
    component.openNewCombo();
    const nameEvent = { target: { value: 'Test Combo' } } as unknown as Event;
    const priceEvent = { target: { value: '12' } } as unknown as Event;
    component.onFormField('name', nameEvent);
    component.onFormField('basePrice', priceEvent);
    const items = createMockMenuItems();
    component.addItemToCombo(items[0]);
    component.addItemToCombo(items[1]);

    await component.saveCombo();
    expect(comboService.createCombo).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test Combo',
      basePrice: 12,
    }));
    expect(component.showForm()).toBe(false);
  });

  it('saveCombo updates existing combo', async () => {
    component.openEditCombo(createMockCombo());
    await component.saveCombo();
    expect(comboService.updateCombo).toHaveBeenCalledWith('combo-1', expect.anything());
  });

  it('saveCombo does nothing when canSave is false', async () => {
    component.openNewCombo();
    await component.saveCombo();
    expect(comboService.createCombo).not.toHaveBeenCalled();
  });

  // --- Delete ---

  it('requestDelete sets confirmation id', () => {
    component.requestDelete('combo-1');
    expect(component.confirmDelete()).toBe('combo-1');
  });

  it('cancelDelete clears confirmation', () => {
    component.requestDelete('combo-1');
    component.cancelDelete();
    expect(component.confirmDelete()).toBeNull();
  });

  it('confirmDeleteCombo calls service', async () => {
    await component.confirmDeleteCombo('combo-1');
    expect(comboService.deleteCombo).toHaveBeenCalledWith('combo-1');
    expect(component.confirmDelete()).toBeNull();
  });

  // --- Toggle active ---

  it('toggleActive calls service with inverted state', async () => {
    const combo = createMockCombo();
    await component.toggleActive(combo);
    expect(comboService.toggleActive).toHaveBeenCalledWith('combo-1', false);
  });

  // --- Helpers ---

  it('getMenuItemName returns name or Unknown', () => {
    expect(component.getMenuItemName('mi-1')).toBe('Burger');
    expect(component.getMenuItemName('nonexistent')).toBe('Unknown');
  });

  it('getMenuItemPrice returns price or 0', () => {
    expect(component.getMenuItemPrice('mi-1')).toBe(10);
    expect(component.getMenuItemPrice('nonexistent')).toBe(0);
  });

  it('selectedItemNames returns formatted names', () => {
    component.openEditCombo(createMockCombo());
    const names = component.selectedItemNames();
    expect(names).toContain('1x Burger');
    expect(names).toContain('1x Fries');
    expect(names).toContain('1x Soda');
  });
});
