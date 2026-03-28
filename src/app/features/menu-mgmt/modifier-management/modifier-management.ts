import { Component, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { ModifierService } from '../../../services/modifier';
import { AuthService } from '../../../services/auth';
import { ModifierGroup, Modifier } from '../../../models/index';

@Component({
  selector: 'os-modifier-management',
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './modifier-management.html',
  styleUrl: './modifier-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModifierManagement {
  private readonly fb = inject(FormBuilder);
  private readonly modifierService = inject(ModifierService);
  private readonly authService = inject(AuthService);

  readonly groups = this.modifierService.groups;
  readonly isLoading = this.modifierService.isLoading;
  readonly error = this.modifierService.error;

  private readonly _showGroupForm = signal(false);
  private readonly _editingGroup = signal<ModifierGroup | null>(null);
  private readonly _expandedGroupId = signal<string | null>(null);
  private readonly _showOptionForm = signal(false);
  private readonly _editingOption = signal<{ groupId: string; option: Modifier | null } | null>(null);
  private readonly _showDeleteConfirm = signal<{ type: 'group' | 'option'; groupId: string; optionId?: string } | null>(null);
  private readonly _isSaving = signal(false);
  private readonly _successMessage = signal<string | null>(null);

  readonly showGroupForm = this._showGroupForm.asReadonly();
  readonly editingGroup = this._editingGroup.asReadonly();
  readonly expandedGroupId = this._expandedGroupId.asReadonly();
  readonly showOptionForm = this._showOptionForm.asReadonly();
  readonly editingOption = this._editingOption.asReadonly();
  readonly showDeleteConfirm = this._showDeleteConfirm.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly successMessage = this._successMessage.asReadonly();

  readonly groupForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    required: [false],
    multiSelect: [true],
    minSelections: [0],
    maxSelections: [0],
  });

  readonly optionForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
    priceAdjustment: [0, Validators.required],
    isDefault: [false],
  });

  private readonly _loaded = signal(false);

  constructor() {
    effect(() => {
      const merchantId = this.authService.selectedMerchantId();
      if (this.authService.isAuthenticated() && merchantId && !this._loaded()) {
        this._loaded.set(true);
        this.modifierService.loadGroups();
      }
    });
  }

  // ============ Group CRUD ============

  toggleGroup(groupId: string): void {
    this._expandedGroupId.set(this._expandedGroupId() === groupId ? null : groupId);
  }

  isExpanded(groupId: string): boolean {
    return this._expandedGroupId() === groupId;
  }

  openCreateGroup(): void {
    this._editingGroup.set(null);
    this.groupForm.reset({ required: false, multiSelect: true, minSelections: 0, maxSelections: 0 });
    this._showGroupForm.set(true);
  }

  openEditGroup(group: ModifierGroup): void {
    this._editingGroup.set(group);
    this.groupForm.patchValue({
      name: group.name,
      description: group.description ?? '',
      required: group.required,
      multiSelect: group.multiSelect,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
    });
    this._showGroupForm.set(true);
  }

  closeGroupForm(): void {
    this._showGroupForm.set(false);
    this._editingGroup.set(null);
  }

  async saveGroup(): Promise<void> {
    if (this.groupForm.invalid || this._isSaving()) return;
    this._isSaving.set(true);
    const v = this.groupForm.value;
    const data = {
      name: v.name!,
      description: v.description ?? undefined,
      required: v.required ?? false,
      multiSelect: v.multiSelect ?? true,
      minSelections: v.minSelections ?? 0,
      maxSelections: v.maxSelections ?? 0,
    };

    let success: boolean;
    if (this._editingGroup()) {
      success = await this.modifierService.updateGroup(this._editingGroup()!.id, data);
    } else {
      success = await this.modifierService.createGroup(data);
    }

    this._isSaving.set(false);
    if (success) {
      this.closeGroupForm();
      this.showSuccess(this._editingGroup() ? 'Group updated' : 'Group created');
    }
  }

  confirmDeleteGroup(groupId: string): void {
    this._showDeleteConfirm.set({ type: 'group', groupId });
  }

  async executeDelete(): Promise<void> {
    const target = this._showDeleteConfirm();
    if (!target || this._isSaving()) return;
    this._isSaving.set(true);

    let success: boolean;
    if (target.type === 'group') {
      success = await this.modifierService.deleteGroup(target.groupId);
    } else {
      const optionId = target.optionId ?? '';
      success = await this.modifierService.deleteOption(target.groupId, optionId);
    }

    this._isSaving.set(false);
    this._showDeleteConfirm.set(null);
    if (success) {
      this.showSuccess(target.type === 'group' ? 'Group deleted' : 'Option deleted');
    }
  }

  cancelDelete(): void {
    this._showDeleteConfirm.set(null);
  }

  // ============ Option CRUD ============

  openCreateOption(groupId: string): void {
    this._editingOption.set({ groupId, option: null });
    this.optionForm.reset({ priceAdjustment: 0, isDefault: false });
    this._showOptionForm.set(true);
  }

  openEditOption(groupId: string, option: Modifier): void {
    this._editingOption.set({ groupId, option });
    this.optionForm.patchValue({
      name: option.name,
      priceAdjustment: option.priceAdjustment,
      isDefault: option.isDefault,
    });
    this._showOptionForm.set(true);
  }

  closeOptionForm(): void {
    this._showOptionForm.set(false);
    this._editingOption.set(null);
  }

  async saveOption(): Promise<void> {
    if (this.optionForm.invalid || this._isSaving() || !this._editingOption()) return;
    this._isSaving.set(true);
    const v = this.optionForm.value;
    const { groupId, option } = this._editingOption()!;
    const data = {
      name: v.name!,
      priceAdjustment: v.priceAdjustment ?? 0,
      isDefault: v.isDefault ?? false,
    };

    let success: boolean;
    if (option) {
      success = await this.modifierService.updateOption(groupId, option.id, data);
    } else {
      success = await this.modifierService.createOption(groupId, data);
    }

    this._isSaving.set(false);
    if (success) {
      this.closeOptionForm();
      this.showSuccess(option ? 'Option updated' : 'Option added');
    }
  }

  confirmDeleteOption(groupId: string, optionId: string): void {
    this._showDeleteConfirm.set({ type: 'option', groupId, optionId });
  }

  // ============ Helpers ============

  getSelectionLabel(group: ModifierGroup): string {
    if (group.required && group.minSelections > 0) {
      if (group.maxSelections > 0 && group.maxSelections !== group.minSelections) {
        return `Required (${group.minSelections}-${group.maxSelections})`;
      }
      return `Required (${group.minSelections})`;
    }
    if (group.maxSelections > 0) {
      return `Optional (up to ${group.maxSelections})`;
    }
    return 'Optional';
  }

  clearError(): void {
    this.modifierService.clearError();
  }

  private showSuccess(message: string): void {
    this._successMessage.set(message);
    setTimeout(() => this._successMessage.set(null), 3000);
  }
}
