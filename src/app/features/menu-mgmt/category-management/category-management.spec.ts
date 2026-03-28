import '../../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal, computed } from '@angular/core';
import { of } from 'rxjs';
import { CategoryManagement } from './category-management';
import { MenuService } from '../../../services/menu';
import { AuthService } from '../../../services/auth';
import type { MenuCategory, ReportingCategory } from '../../../models/index';

function createMockAuthService() {
  const _token = signal('tok');
  const _user = signal({ firstName: 'Jeff' });
  return {
    isAuthenticated: computed(() => !!_token() && !!_user()),
    user: _user.asReadonly(),
    selectedMerchantId: signal<string | null>('r-1').asReadonly(),
    selectedMerchantName: signal<string | null>('Test').asReadonly(),
    merchants: signal([{ id: 'r-1' }]).asReadonly(),
    userMerchants: computed(() => ['r-1']),
    selectMerchant: vi.fn(),
  };
}

function createMockMenuService() {
  return {
    categories: signal<MenuCategory[]>([
      { id: 'cat-1', name: 'Appetizers', merchantId: 'r-1', isActive: true, displayOrder: 0 },
      { id: 'cat-2', name: 'Entrees', merchantId: 'r-1', isActive: true, displayOrder: 1 },
    ]).asReadonly(),
    isLoading: signal(false).asReadonly(),
    error: signal<string | null>(null).asReadonly(),
    crudSupported: signal(true).asReadonly(),
    reportingCategories: signal<ReportingCategory[]>([]).asReadonly(),
    loadMenu: vi.fn(),
    loadReportingCategories: vi.fn(),
    createCategory: vi.fn().mockResolvedValue({ id: 'cat-new', name: 'Desserts' }),
    updateCategory: vi.fn().mockResolvedValue(true),
    deleteCategory: vi.fn().mockResolvedValue(true),
    createReportingCategory: vi.fn().mockResolvedValue({ id: 'rc-1', name: 'Food' }),
    updateReportingCategory: vi.fn().mockResolvedValue(true),
    deleteReportingCategory: vi.fn().mockResolvedValue(true),
  };
}

describe('CategoryManagement', () => {
  let fixture: ComponentFixture<CategoryManagement>;
  let component: CategoryManagement;
  let menuService: ReturnType<typeof createMockMenuService>;

  beforeEach(() => {
    menuService = createMockMenuService();

    TestBed.configureTestingModule({
      imports: [CategoryManagement],
      providers: [
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: MenuService, useValue: menuService },
        { provide: HttpClient, useValue: { get: vi.fn().mockReturnValue(of([])) } },
      ],
    });
    fixture = TestBed.createComponent(CategoryManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- Form open/close ---

  it('showForm is false by default', () => {
    expect(component.showForm()).toBe(false);
  });

  it('openCreateForm shows form with empty values', () => {
    component.openCreateForm();
    expect(component.showForm()).toBe(true);
    expect(component.editingCategory()).toBeNull();
    expect(component.categoryForm.get('name')?.value).toBe('');
  });

  it('openEditForm shows form with category values', () => {
    const cat: MenuCategory = { id: 'cat-1', name: 'Appetizers', merchantId: 'r-1', isActive: true, displayOrder: 0 };
    component.openEditForm(cat);
    expect(component.showForm()).toBe(true);
    expect(component.editingCategory()).toBe(cat);
    expect(component.categoryForm.get('name')?.value).toBe('Appetizers');
  });

  it('closeForm hides form and clears editing', () => {
    component.openCreateForm();
    component.closeForm();
    expect(component.showForm()).toBe(false);
    expect(component.editingCategory()).toBeNull();
  });

  // --- Save category ---

  it('saveCategory does nothing when form is invalid', async () => {
    component.openCreateForm();
    component.categoryForm.patchValue({ name: '' });
    await component.saveCategory();
    expect(menuService.createCategory).not.toHaveBeenCalled();
  });

  it('saveCategory creates new category with valid form', async () => {
    component.openCreateForm();
    component.categoryForm.patchValue({ name: 'Desserts', description: 'Sweet treats', isActive: true });
    await component.saveCategory();
    expect(menuService.createCategory).toHaveBeenCalledWith({
      name: 'Desserts',
      description: 'Sweet treats',
      isActive: true,
    });
    expect(component.showForm()).toBe(false);
  });

  it('saveCategory updates existing category', async () => {
    const cat: MenuCategory = { id: 'cat-1', name: 'Appetizers', merchantId: 'r-1', isActive: true, displayOrder: 0 };
    component.openEditForm(cat);
    component.categoryForm.patchValue({ name: 'Starters' });
    await component.saveCategory();
    expect(menuService.updateCategory).toHaveBeenCalledWith('cat-1', expect.objectContaining({ name: 'Starters' }));
    expect(component.showForm()).toBe(false);
  });

  it('saveCategory shows error on create failure', async () => {
    menuService.createCategory.mockResolvedValue(null);
    component.openCreateForm();
    component.categoryForm.patchValue({ name: 'Desserts' });
    await component.saveCategory();
    expect(component.localError()).toBeTruthy();
    expect(component.showForm()).toBe(true);
  });

  it('saveCategory shows error on update failure', async () => {
    menuService.updateCategory.mockResolvedValue(false);
    const cat: MenuCategory = { id: 'cat-1', name: 'Appetizers', merchantId: 'r-1', isActive: true, displayOrder: 0 };
    component.openEditForm(cat);
    component.categoryForm.patchValue({ name: 'Starters' });
    await component.saveCategory();
    expect(component.localError()).toBeTruthy();
  });

  it('saveCategory handles thrown errors', async () => {
    menuService.createCategory.mockRejectedValue(new Error('Network failure'));
    component.openCreateForm();
    component.categoryForm.patchValue({ name: 'Desserts' });
    await component.saveCategory();
    expect(component.localError()).toBe('Network failure');
  });

  // --- Delete ---

  it('confirmDelete sets delete target', () => {
    const cat: MenuCategory = { id: 'cat-1', name: 'Appetizers', merchantId: 'r-1', isActive: true, displayOrder: 0 };
    component.confirmDelete(cat);
    expect(component.deleteTarget()).toBe(cat);
  });

  it('cancelDelete clears delete target', () => {
    const cat: MenuCategory = { id: 'cat-1', name: 'Appetizers', merchantId: 'r-1', isActive: true, displayOrder: 0 };
    component.confirmDelete(cat);
    component.cancelDelete();
    expect(component.deleteTarget()).toBeNull();
  });

  it('executeDelete calls service and clears target', async () => {
    const cat: MenuCategory = { id: 'cat-1', name: 'Appetizers', merchantId: 'r-1', isActive: true, displayOrder: 0 };
    component.confirmDelete(cat);
    await component.executeDelete();
    expect(menuService.deleteCategory).toHaveBeenCalledWith('cat-1');
    expect(component.deleteTarget()).toBeNull();
  });

  it('executeDelete does nothing when no target', async () => {
    await component.executeDelete();
    expect(menuService.deleteCategory).not.toHaveBeenCalled();
  });

  it('executeDelete shows error on failure', async () => {
    menuService.deleteCategory.mockResolvedValue(false);
    const cat: MenuCategory = { id: 'cat-1', name: 'Appetizers', merchantId: 'r-1', isActive: true, displayOrder: 0 };
    component.confirmDelete(cat);
    await component.executeDelete();
    expect(component.localError()).toBeTruthy();
  });

  // --- Toggle active ---

  it('toggleActive calls updateCategory with inverted isActive', async () => {
    const cat: MenuCategory = { id: 'cat-1', name: 'Appetizers', merchantId: 'r-1', isActive: true, displayOrder: 0 };
    await component.toggleActive(cat);
    expect(menuService.updateCategory).toHaveBeenCalledWith('cat-1', { isActive: false });
  });

  // --- Error handling ---

  it('clearLocalError clears the error', () => {
    // Trigger an error state by calling saveCategory with failure
    component.openCreateForm();
    component.clearLocalError();
    expect(component.localError()).toBeNull();
  });

  it('retry clears error and reloads menu', () => {
    component.retry();
    expect(component.localError()).toBeNull();
    expect(menuService.loadMenu).toHaveBeenCalled();
  });

  // --- Reporting categories ---

  it('toggleReportingSection toggles visibility', () => {
    expect(component.showReportingSection()).toBe(false);
    component.toggleReportingSection();
    expect(component.showReportingSection()).toBe(true);
    component.toggleReportingSection();
    expect(component.showReportingSection()).toBe(false);
  });

  it('openReportingCreateForm shows form', () => {
    component.openReportingCreateForm();
    expect(component.showReportingForm()).toBe(true);
    expect(component.editingReportingCategory()).toBeNull();
  });

  it('openReportingEditForm shows form with values', () => {
    const rc: ReportingCategory = { id: 'rc-1', name: 'Food', merchantId: 'r-1', displayOrder: 0 };
    component.openReportingEditForm(rc);
    expect(component.showReportingForm()).toBe(true);
    expect(component.editingReportingCategory()).toBe(rc);
    expect(component.reportingCategoryForm.get('name')?.value).toBe('Food');
  });

  it('closeReportingForm hides form', () => {
    component.openReportingCreateForm();
    component.closeReportingForm();
    expect(component.showReportingForm()).toBe(false);
  });

  it('saveReportingCategory creates new reporting category', async () => {
    component.openReportingCreateForm();
    component.reportingCategoryForm.patchValue({ name: 'Beverages', displayOrder: 1 });
    await component.saveReportingCategory();
    expect(menuService.createReportingCategory).toHaveBeenCalledWith({ name: 'Beverages', displayOrder: 1 });
    expect(component.showReportingForm()).toBe(false);
  });

  it('saveReportingCategory does nothing when form is invalid', async () => {
    component.openReportingCreateForm();
    component.reportingCategoryForm.patchValue({ name: '' });
    await component.saveReportingCategory();
    expect(menuService.createReportingCategory).not.toHaveBeenCalled();
  });

  it('deleteReporting flow works', async () => {
    const rc: ReportingCategory = { id: 'rc-1', name: 'Food', merchantId: 'r-1', displayOrder: 0 };
    component.confirmDeleteReporting(rc);
    expect(component.deleteReportingTarget()).toBe(rc);
    await component.executeDeleteReporting();
    expect(menuService.deleteReportingCategory).toHaveBeenCalledWith('rc-1');
    expect(component.deleteReportingTarget()).toBeNull();
  });

  it('cancelDeleteReporting clears target', () => {
    const rc: ReportingCategory = { id: 'rc-1', name: 'Food', merchantId: 'r-1', displayOrder: 0 };
    component.confirmDeleteReporting(rc);
    component.cancelDeleteReporting();
    expect(component.deleteReportingTarget()).toBeNull();
  });
});
