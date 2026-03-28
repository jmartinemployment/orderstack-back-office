import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ComboService } from '../../../services/combo';
import { MenuService } from '../../../services/menu';
import { AuthService } from '../../../services/auth';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import { Combo, ComboFormData, MenuItem } from '../../../models/index';

@Component({
  selector: 'os-combo-management',
  imports: [CurrencyPipe, LoadingSpinner],
  templateUrl: './combo-management.html',
  styleUrl: './combo-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComboManagement {
  private readonly comboService = inject(ComboService);
  private readonly menuService = inject(MenuService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly isLoading = this.comboService.isLoading;
  readonly error = this.comboService.error;
  readonly combos = this.comboService.combos;
  readonly activeCombos = this.comboService.activeCombos;
  readonly menuItems = this.menuService.allItems;
  readonly categories = this.menuService.categories;

  private readonly _showForm = signal(false);
  private readonly _editingCombo = signal<Combo | null>(null);
  private readonly _isSaving = signal(false);
  private readonly _confirmDelete = signal<string | null>(null);

  // Form
  private readonly _formName = signal('');
  private readonly _formDescription = signal('');
  private readonly _formBasePrice = signal(0);
  private readonly _formCategoryId = signal('');
  private readonly _formItems = signal<{ menuItemId: string; quantity: number; isRequired: boolean }[]>([]);
  private readonly _itemSearch = signal('');

  readonly showForm = this._showForm.asReadonly();
  readonly editingCombo = this._editingCombo.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly confirmDelete = this._confirmDelete.asReadonly();
  readonly formName = this._formName.asReadonly();
  readonly formDescription = this._formDescription.asReadonly();
  readonly formBasePrice = this._formBasePrice.asReadonly();
  readonly formCategoryId = this._formCategoryId.asReadonly();
  readonly formItems = this._formItems.asReadonly();
  readonly itemSearch = this._itemSearch.asReadonly();

  readonly regularPrice = computed(() =>
    this._formItems().reduce((sum, fi) => {
      const item = this.menuItems().find(m => m.id === fi.menuItemId);
      let price = 0;
      if (item) {
        price = typeof item.price === 'string' ? Number.parseFloat(item.price) : item.price;
      }
      return sum + (price * fi.quantity);
    }, 0)
  );

  readonly savings = computed(() =>
    Math.max(0, this.regularPrice() - this._formBasePrice())
  );

  readonly savingsPercent = computed(() => {
    const reg = this.regularPrice();
    return reg > 0 ? Math.round((this.savings() / reg) * 100) : 0;
  });

  readonly filteredMenuItems = computed(() => {
    const search = this._itemSearch().toLowerCase();
    const items = this.menuItems().filter(i => i.isActive !== false);
    if (!search) return items;
    return items.filter(i =>
      i.name.toLowerCase().includes(search) ||
      (i.description ?? '').toLowerCase().includes(search)
    );
  });

  readonly selectedItemNames = computed(() => {
    const formItems = this._formItems();
    return formItems.map(fi => {
      const item = this.menuItems().find(m => m.id === fi.menuItemId);
      return item ? `${fi.quantity}x ${item.name}` : fi.menuItemId;
    });
  });

  readonly canSave = computed(() =>
    !!this._formName().trim() && this._formBasePrice() > 0 && this._formItems().length >= 2
  );

  constructor() {
    effect(() => {
      if (this.isAuthenticated()) {
        this.comboService.loadCombos();
      }
    });
  }

  openNewCombo(): void {
    this._editingCombo.set(null);
    this.resetForm();
    this._showForm.set(true);
  }

  openEditCombo(combo: Combo): void {
    this._editingCombo.set(combo);
    this._formName.set(combo.name);
    this._formDescription.set(combo.description ?? '');
    this._formBasePrice.set(combo.basePrice);
    this._formCategoryId.set(combo.categoryId ?? '');
    this._formItems.set(combo.items.map(i => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      isRequired: i.isRequired,
    })));
    this._showForm.set(true);
  }

  closeForm(): void {
    this._showForm.set(false);
    this._editingCombo.set(null);
  }

  onFormField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    switch (field) {
      case 'name': this._formName.set(value); break;
      case 'description': this._formDescription.set(value); break;
      case 'basePrice': this._formBasePrice.set(Number.parseFloat(value) || 0); break;
      case 'categoryId': this._formCategoryId.set(value); break;
      case 'itemSearch': this._itemSearch.set(value); break;
    }
  }

  addItemToCombo(menuItem: MenuItem): void {
    const existing = this._formItems().find(i => i.menuItemId === menuItem.id);
    if (existing) {
      this._formItems.update(items =>
        items.map(i => i.menuItemId === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i)
      );
    } else {
      this._formItems.update(items => [
        ...items,
        { menuItemId: menuItem.id, quantity: 1, isRequired: true },
      ]);
    }
  }

  removeItemFromCombo(menuItemId: string): void {
    this._formItems.update(items => items.filter(i => i.menuItemId !== menuItemId));
  }

  updateItemQuantity(menuItemId: string, event: Event): void {
    const qty = Number.parseInt((event.target as HTMLInputElement).value, 10) || 1;
    this._formItems.update(items =>
      items.map(i => i.menuItemId === menuItemId ? { ...i, quantity: Math.max(1, qty) } : i)
    );
  }

  toggleItemRequired(menuItemId: string): void {
    this._formItems.update(items =>
      items.map(i => i.menuItemId === menuItemId ? { ...i, isRequired: !i.isRequired } : i)
    );
  }

  isItemInCombo(menuItemId: string): boolean {
    return this._formItems().some(i => i.menuItemId === menuItemId);
  }

  getMenuItemName(menuItemId: string): string {
    return this.menuItems().find(m => m.id === menuItemId)?.name ?? 'Unknown';
  }

  getMenuItemPrice(menuItemId: string): number {
    const item = this.menuItems().find(m => m.id === menuItemId);
    if (!item) return 0;
    return typeof item.price === 'string' ? Number.parseFloat(item.price) : item.price;
  }

  async saveCombo(): Promise<void> {
    if (!this.canSave() || this._isSaving()) return;
    this._isSaving.set(true);
    try {
      const data: ComboFormData = {
        name: this._formName().trim(),
        description: this._formDescription().trim() || undefined,
        basePrice: this._formBasePrice(),
        items: this._formItems(),
        categoryId: this._formCategoryId() || undefined,
        isActive: true,
      };

      const editing = this._editingCombo();
      if (editing) {
        await this.comboService.updateCombo(editing.id, data);
      } else {
        await this.comboService.createCombo(data);
      }
      this.closeForm();
    } finally {
      this._isSaving.set(false);
    }
  }

  async toggleActive(combo: Combo): Promise<void> {
    await this.comboService.toggleActive(combo.id, !combo.isActive);
  }

  requestDelete(comboId: string): void {
    this._confirmDelete.set(comboId);
  }

  cancelDelete(): void {
    this._confirmDelete.set(null);
  }

  async confirmDeleteCombo(comboId: string): Promise<void> {
    await this.comboService.deleteCombo(comboId);
    this._confirmDelete.set(null);
  }

  private resetForm(): void {
    this._formName.set('');
    this._formDescription.set('');
    this._formBasePrice.set(0);
    this._formCategoryId.set('');
    this._formItems.set([]);
    this._itemSearch.set('');
  }
}
