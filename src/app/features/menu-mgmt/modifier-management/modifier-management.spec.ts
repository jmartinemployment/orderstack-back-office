import '../../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { signal, computed } from '@angular/core';
import { of } from 'rxjs';
import { ModifierManagement } from './modifier-management';
import { ModifierService } from '../../../services/modifier';
import { AuthService } from '../../../services/auth';
import type { ModifierGroup, Modifier } from '../../../models/index';

function createMockAuthService() {
  return {
    isAuthenticated: computed(() => true),
    selectedMerchantId: signal<string | null>('r-1').asReadonly(),
  };
}

function createMockModifierService() {
  const _groups = signal<ModifierGroup[]>([
    {
      id: 'mg-1', name: 'Sizes', merchantId: 'r-1', description: 'Choose a size',
      required: true, multiSelect: false, minSelections: 1, maxSelections: 1,
      modifiers: [
        { id: 'opt-1', name: 'Small', priceAdjustment: 0, isDefault: true, displayOrder: 0 },
        { id: 'opt-2', name: 'Large', priceAdjustment: 2, isDefault: false, displayOrder: 1 },
      ],
    },
  ]);
  return {
    groups: _groups.asReadonly(),
    isLoading: signal(false).asReadonly(),
    error: signal<string | null>(null).asReadonly(),
    loadGroups: vi.fn(),
    createGroup: vi.fn().mockResolvedValue(true),
    updateGroup: vi.fn().mockResolvedValue(true),
    deleteGroup: vi.fn().mockResolvedValue(true),
    createOption: vi.fn().mockResolvedValue(true),
    updateOption: vi.fn().mockResolvedValue(true),
    deleteOption: vi.fn().mockResolvedValue(true),
    clearError: vi.fn(),
  };
}

describe('ModifierManagement', () => {
  let fixture: ComponentFixture<ModifierManagement>;
  let component: ModifierManagement;
  let modifierService: ReturnType<typeof createMockModifierService>;

  beforeEach(() => {
    modifierService = createMockModifierService();

    TestBed.configureTestingModule({
      imports: [ModifierManagement],
      providers: [
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: ModifierService, useValue: modifierService },
        { provide: HttpClient, useValue: { get: vi.fn().mockReturnValue(of([])) } },
      ],
    });
    fixture = TestBed.createComponent(ModifierManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- Group expand/collapse ---

  it('no group is expanded by default', () => {
    expect(component.expandedGroupId()).toBeNull();
  });

  it('toggleGroup expands a group', () => {
    component.toggleGroup('mg-1');
    expect(component.expandedGroupId()).toBe('mg-1');
  });

  it('toggleGroup collapses when same group toggled', () => {
    component.toggleGroup('mg-1');
    component.toggleGroup('mg-1');
    expect(component.expandedGroupId()).toBeNull();
  });

  it('isExpanded returns correct value', () => {
    expect(component.isExpanded('mg-1')).toBe(false);
    component.toggleGroup('mg-1');
    expect(component.isExpanded('mg-1')).toBe(true);
  });

  // --- Group form ---

  it('showGroupForm is false by default', () => {
    expect(component.showGroupForm()).toBe(false);
  });

  it('openCreateGroup shows form with defaults', () => {
    component.openCreateGroup();
    expect(component.showGroupForm()).toBe(true);
    expect(component.editingGroup()).toBeNull();
    expect(component.groupForm.get('required')?.value).toBe(false);
    expect(component.groupForm.get('multiSelect')?.value).toBe(true);
  });

  it('openEditGroup populates form with group data', () => {
    const group = modifierService.groups()[0];
    component.openEditGroup(group);
    expect(component.showGroupForm()).toBe(true);
    expect(component.editingGroup()).toBe(group);
    expect(component.groupForm.get('name')?.value).toBe('Sizes');
    expect(component.groupForm.get('required')?.value).toBe(true);
  });

  it('closeGroupForm hides form', () => {
    component.openCreateGroup();
    component.closeGroupForm();
    expect(component.showGroupForm()).toBe(false);
    expect(component.editingGroup()).toBeNull();
  });

  // --- Save group ---

  it('saveGroup creates when not editing', async () => {
    component.openCreateGroup();
    component.groupForm.patchValue({ name: 'Toppings', required: false, multiSelect: true });
    await component.saveGroup();
    expect(modifierService.createGroup).toHaveBeenCalledWith(expect.objectContaining({ name: 'Toppings' }));
    expect(component.showGroupForm()).toBe(false);
  });

  it('saveGroup updates when editing', async () => {
    const group = modifierService.groups()[0];
    component.openEditGroup(group);
    component.groupForm.patchValue({ name: 'Updated Sizes' });
    await component.saveGroup();
    expect(modifierService.updateGroup).toHaveBeenCalledWith('mg-1', expect.objectContaining({ name: 'Updated Sizes' }));
  });

  it('saveGroup does nothing when form is invalid', async () => {
    component.openCreateGroup();
    component.groupForm.patchValue({ name: '' });
    await component.saveGroup();
    expect(modifierService.createGroup).not.toHaveBeenCalled();
  });

  // --- Delete group ---

  it('confirmDeleteGroup sets delete confirm', () => {
    component.confirmDeleteGroup('mg-1');
    expect(component.showDeleteConfirm()).toEqual({ type: 'group', groupId: 'mg-1' });
  });

  it('cancelDelete clears confirm', () => {
    component.confirmDeleteGroup('mg-1');
    component.cancelDelete();
    expect(component.showDeleteConfirm()).toBeNull();
  });

  it('executeDelete deletes group', async () => {
    component.confirmDeleteGroup('mg-1');
    await component.executeDelete();
    expect(modifierService.deleteGroup).toHaveBeenCalledWith('mg-1');
    expect(component.showDeleteConfirm()).toBeNull();
  });

  // --- Option form ---

  it('openCreateOption shows option form', () => {
    component.openCreateOption('mg-1');
    expect(component.showOptionForm()).toBe(true);
    expect(component.editingOption()).toEqual({ groupId: 'mg-1', option: null });
  });

  it('openEditOption populates option form', () => {
    const opt: Modifier = { id: 'opt-1', name: 'Small', priceAdjustment: 0, isDefault: true, displayOrder: 0 };
    component.openEditOption('mg-1', opt);
    expect(component.showOptionForm()).toBe(true);
    expect(component.optionForm.get('name')?.value).toBe('Small');
  });

  it('closeOptionForm hides form', () => {
    component.openCreateOption('mg-1');
    component.closeOptionForm();
    expect(component.showOptionForm()).toBe(false);
    expect(component.editingOption()).toBeNull();
  });

  // --- Save option ---

  it('saveOption creates new option', async () => {
    component.openCreateOption('mg-1');
    component.optionForm.patchValue({ name: 'Medium', priceAdjustment: 1, isDefault: false });
    await component.saveOption();
    expect(modifierService.createOption).toHaveBeenCalledWith('mg-1', { name: 'Medium', priceAdjustment: 1, isDefault: false });
    expect(component.showOptionForm()).toBe(false);
  });

  it('saveOption updates existing option', async () => {
    const opt: Modifier = { id: 'opt-1', name: 'Small', priceAdjustment: 0, isDefault: true, displayOrder: 0 };
    component.openEditOption('mg-1', opt);
    component.optionForm.patchValue({ name: 'Tiny', priceAdjustment: -1 });
    await component.saveOption();
    expect(modifierService.updateOption).toHaveBeenCalledWith('mg-1', 'opt-1', expect.objectContaining({ name: 'Tiny' }));
  });

  // --- Delete option ---

  it('confirmDeleteOption sets delete confirm', () => {
    component.confirmDeleteOption('mg-1', 'opt-1');
    expect(component.showDeleteConfirm()).toEqual({ type: 'option', groupId: 'mg-1', optionId: 'opt-1' });
  });

  it('executeDelete deletes option', async () => {
    component.confirmDeleteOption('mg-1', 'opt-1');
    await component.executeDelete();
    expect(modifierService.deleteOption).toHaveBeenCalledWith('mg-1', 'opt-1');
  });

  // --- Helpers ---

  it('getSelectionLabel returns Required with min-max for required groups', () => {
    const group: ModifierGroup = {
      id: 'mg-1', name: 'Sizes', merchantId: 'r-1',
      required: true, multiSelect: false, minSelections: 1, maxSelections: 3, modifiers: [],
    };
    expect(component.getSelectionLabel(group)).toBe('Required (1-3)');
  });

  it('getSelectionLabel returns Required with single count', () => {
    const group: ModifierGroup = {
      id: 'mg-1', name: 'Sizes', merchantId: 'r-1',
      required: true, multiSelect: false, minSelections: 1, maxSelections: 1, modifiers: [],
    };
    expect(component.getSelectionLabel(group)).toBe('Required (1)');
  });

  it('getSelectionLabel returns Optional with max', () => {
    const group: ModifierGroup = {
      id: 'mg-1', name: 'Toppings', merchantId: 'r-1',
      required: false, multiSelect: true, minSelections: 0, maxSelections: 5, modifiers: [],
    };
    expect(component.getSelectionLabel(group)).toBe('Optional (up to 5)');
  });

  it('getSelectionLabel returns Optional with no max', () => {
    const group: ModifierGroup = {
      id: 'mg-1', name: 'Notes', merchantId: 'r-1',
      required: false, multiSelect: true, minSelections: 0, maxSelections: 0, modifiers: [],
    };
    expect(component.getSelectionLabel(group)).toBe('Optional');
  });

  it('clearError delegates to service', () => {
    component.clearError();
    expect(modifierService.clearError).toHaveBeenCalled();
  });

  // --- Success message ---

  it('shows success message after creating group', async () => {
    vi.useFakeTimers();
    component.openCreateGroup();
    component.groupForm.patchValue({ name: 'Toppings' });
    await component.saveGroup();
    expect(component.successMessage()).toBe('Group created');
    vi.advanceTimersByTime(3000);
    expect(component.successMessage()).toBeNull();
  });
});
