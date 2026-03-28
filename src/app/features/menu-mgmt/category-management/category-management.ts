import { Component, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MenuService } from '../../../services/menu';
import { AuthService } from '../../../services/auth';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../../shared/error-display/error-display';
import { MenuCategory, ReportingCategory } from '../../../models/index';

@Component({
  selector: 'os-category-management',
  imports: [ReactiveFormsModule, LoadingSpinner, ErrorDisplay],
  templateUrl: './category-management.html',
  styleUrl: './category-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryManagement {
  private readonly fb = inject(FormBuilder);
  readonly menuService = inject(MenuService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _editingCategory = signal<MenuCategory | null>(null);
  private readonly _showForm = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _localError = signal<string | null>(null);
  private readonly _menuLoaded = signal(false);
  private readonly _deleteTarget = signal<MenuCategory | null>(null);

  // Reporting categories
  private readonly _showReportingSection = signal(false);
  private readonly _showReportingForm = signal(false);
  private readonly _editingReportingCategory = signal<ReportingCategory | null>(null);
  private readonly _isSavingReporting = signal(false);
  private readonly _deleteReportingTarget = signal<ReportingCategory | null>(null);

  readonly editingCategory = this._editingCategory.asReadonly();
  readonly showForm = this._showForm.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly localError = this._localError.asReadonly();
  readonly deleteTarget = this._deleteTarget.asReadonly();

  readonly showReportingSection = this._showReportingSection.asReadonly();
  readonly showReportingForm = this._showReportingForm.asReadonly();
  readonly editingReportingCategory = this._editingReportingCategory.asReadonly();
  readonly isSavingReporting = this._isSavingReporting.asReadonly();
  readonly deleteReportingTarget = this._deleteReportingTarget.asReadonly();
  readonly reportingCategories = this.menuService.reportingCategories;

  readonly categories = this.menuService.categories;
  readonly isLoading = this.menuService.isLoading;
  readonly crudSupported = this.menuService.crudSupported;

  readonly categoryForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    isActive: [true],
  });

  readonly reportingCategoryForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    displayOrder: [0],
  });

  constructor() {
    effect(() => {
      const merchantId = this.authService.selectedMerchantId();
      if (this.isAuthenticated() && merchantId && !this._menuLoaded()) {
        this._menuLoaded.set(true);
        this.menuService.loadMenu();
        this.menuService.loadReportingCategories();
      }
    });
  }

  // --- Menu Categories ---

  openCreateForm(): void {
    this._editingCategory.set(null);
    this.categoryForm.reset({ name: '', description: '', isActive: true });
    this._showForm.set(true);
  }

  openEditForm(category: MenuCategory): void {
    this._editingCategory.set(category);
    this.categoryForm.patchValue({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive ?? true,
    });
    this._showForm.set(true);
  }

  closeForm(): void {
    this._showForm.set(false);
    this._editingCategory.set(null);
    this.categoryForm.reset();
  }

  onCategoryOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) this.closeForm();
  }

  onReportingOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) this.closeReportingForm();
  }

  onDeleteOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) this.cancelDelete();
  }

  onDeleteReportingOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) this.cancelDeleteReporting();
  }

  async saveCategory(): Promise<void> {
    if (this.categoryForm.invalid || this._isSaving()) return;

    this._isSaving.set(true);
    this._localError.set(null);

    try {
      const formValue = this.categoryForm.value;
      const data = {
        name: formValue.name!,
        description: formValue.description || undefined,
        isActive: formValue.isActive ?? true,
      };

      if (this._editingCategory()) {
        const success = await this.menuService.updateCategory(
          this._editingCategory()!.id,
          data
        );
        if (!success) {
          this._localError.set(this.menuService.error() ?? 'Failed to update category');
          return;
        }
      } else {
        const result = await this.menuService.createCategory(data);
        if (!result) {
          this._localError.set(this.menuService.error() ?? 'Failed to create category');
          return;
        }
      }

      this.closeForm();
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      this._isSaving.set(false);
    }
  }

  confirmDelete(category: MenuCategory): void {
    this._deleteTarget.set(category);
  }

  cancelDelete(): void {
    this._deleteTarget.set(null);
  }

  async executeDelete(): Promise<void> {
    const category = this._deleteTarget();
    if (!category) return;

    this._localError.set(null);
    this._deleteTarget.set(null);
    try {
      const success = await this.menuService.deleteCategory(category.id);
      if (!success) {
        this._localError.set(this.menuService.error() ?? 'Failed to delete category');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  }

  async toggleActive(category: MenuCategory): Promise<void> {
    this._localError.set(null);
    try {
      const success = await this.menuService.updateCategory(
        category.id,
        { isActive: !category.isActive }
      );
      if (!success) {
        this._localError.set(this.menuService.error() ?? 'Failed to update category');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  }

  clearLocalError(): void {
    this._localError.set(null);
  }

  retry(): void {
    this._localError.set(null);
    this.menuService.loadMenu();
  }

  // --- Reporting Categories ---

  toggleReportingSection(): void {
    this._showReportingSection.update(v => !v);
  }

  openReportingCreateForm(): void {
    this._editingReportingCategory.set(null);
    this.reportingCategoryForm.reset({ name: '', displayOrder: this.reportingCategories().length });
    this._showReportingForm.set(true);
  }

  openReportingEditForm(cat: ReportingCategory): void {
    this._editingReportingCategory.set(cat);
    this.reportingCategoryForm.patchValue({
      name: cat.name,
      displayOrder: cat.displayOrder,
    });
    this._showReportingForm.set(true);
  }

  closeReportingForm(): void {
    this._showReportingForm.set(false);
    this._editingReportingCategory.set(null);
    this.reportingCategoryForm.reset();
  }

  async saveReportingCategory(): Promise<void> {
    if (this.reportingCategoryForm.invalid || this._isSavingReporting()) return;

    this._isSavingReporting.set(true);
    this._localError.set(null);

    try {
      const formValue = this.reportingCategoryForm.value;
      const data = {
        name: formValue.name!,
        displayOrder: formValue.displayOrder ?? 0,
      };

      if (this._editingReportingCategory()) {
        const success = await this.menuService.updateReportingCategory(
          this._editingReportingCategory()!.id,
          data
        );
        if (!success) {
          this._localError.set(this.menuService.error() ?? 'Failed to update reporting category');
          return;
        }
      } else {
        const result = await this.menuService.createReportingCategory(data);
        if (!result) {
          this._localError.set(this.menuService.error() ?? 'Failed to create reporting category');
          return;
        }
      }

      this.closeReportingForm();
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      this._isSavingReporting.set(false);
    }
  }

  confirmDeleteReporting(cat: ReportingCategory): void {
    this._deleteReportingTarget.set(cat);
  }

  cancelDeleteReporting(): void {
    this._deleteReportingTarget.set(null);
  }

  async executeDeleteReporting(): Promise<void> {
    const cat = this._deleteReportingTarget();
    if (!cat) return;

    this._localError.set(null);
    this._deleteReportingTarget.set(null);
    try {
      const success = await this.menuService.deleteReportingCategory(cat.id);
      if (!success) {
        this._localError.set(this.menuService.error() ?? 'Failed to delete reporting category');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  }
}
