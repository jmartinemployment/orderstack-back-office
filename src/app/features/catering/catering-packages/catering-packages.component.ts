import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CateringService } from '../../../services/catering.service';
import { MenuService } from '../../../services/menu';
import { CateringPackageTemplate } from '../../../models/catering.model';

type PricingModel = 'per_person' | 'per_tray' | 'flat';
type Tier = 'standard' | 'premium' | 'custom';

interface FormState {
  name: string;
  tier: Tier;
  pricingModel: PricingModel;
  pricePerUnitDollars: number;
  minimumHeadcount: number;
  description: string;
  menuItemIds: string[];
}

@Component({
  selector: 'os-catering-packages',
  standalone: true,
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './catering-packages.component.html',
  styleUrl: './catering-packages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
})
export class CateringPackagesComponent implements OnInit {
  private readonly cateringService = inject(CateringService);
  readonly menuService = inject(MenuService);

  readonly _showForm = signal(false);
  readonly _editingId = signal<string | null>(null);
  readonly _saving = signal(false);
  readonly _error = signal<string | null>(null);
  readonly _expandedId = signal<string | null>(null);
  readonly _confirmDeleteId = signal<string | null>(null);
  readonly _itemFilter = signal('');

  readonly _form = signal<FormState>({
    name: '',
    tier: 'standard',
    pricingModel: 'per_person',
    pricePerUnitDollars: 0,
    minimumHeadcount: 1,
    description: '',
    menuItemIds: [],
  });

  readonly templates = this.cateringService.packageTemplates;

  readonly cateringMenuItems = computed(() =>
    this.menuService.allItems().filter(i => i.isActive !== false)
  );

  readonly filteredMenuItems = computed(() => {
    const filter = this._itemFilter().toLowerCase();
    if (!filter) return this.cateringMenuItems();
    return this.cateringMenuItems().filter(i =>
      i.name.toLowerCase().includes(filter)
    );
  });

  readonly suggestedPricePerUnit = computed(() => {
    const selectedIds = this._form().menuItemIds;
    if (selectedIds.length === 0) return null;
    const items = this.menuService.allItems();
    const total = selectedIds.reduce((sum, id) => {
      const item = items.find(i => i.id === id);
      return sum + (item ? Number(item.price) : 0);
    }, 0);
    return total;
  });

  readonly pricingModelLabels: Record<PricingModel, string> = {
    per_person: 'Per Person',
    per_tray: 'Per Tray',
    flat: 'Flat Fee',
  };

  readonly tierLabels: Record<Tier, string> = {
    standard: 'Standard',
    premium: 'Premium',
    custom: 'Custom',
  };

  ngOnInit(): void {
    this.cateringService.loadPackageTemplates();
    this.menuService.loadMenu();
  }

  getItemName(itemId: string): string {
    const item = this.menuService.allItems().find(i => i.id === itemId);
    return item?.name ?? '(deleted item)';
  }

  toggleExpand(id: string): void {
    this._expandedId.update(v => v === id ? null : id);
  }

  openNewForm(): void {
    this._editingId.set(null);
    this._form.set({
      name: '',
      tier: 'standard',
      pricingModel: 'per_person',
      pricePerUnitDollars: 0,
      minimumHeadcount: 1,
      description: '',
      menuItemIds: [],
    });
    this._itemFilter.set('');
    this._showForm.set(true);
  }

  openEditForm(t: CateringPackageTemplate): void {
    this._editingId.set(t.id);
    this._form.set({
      name: t.name,
      tier: t.tier,
      pricingModel: t.pricingModel,
      pricePerUnitDollars: t.pricePerUnitCents / 100,
      minimumHeadcount: t.minimumHeadcount,
      description: t.description ?? '',
      menuItemIds: [...t.menuItemIds],
    });
    this._itemFilter.set('');
    this._showForm.set(true);
  }

  closeForm(): void {
    this._showForm.set(false);
    this._editingId.set(null);
  }

  updateField<K extends keyof FormState>(field: K, value: FormState[K]): void {
    this._form.update(f => ({ ...f, [field]: value }));
  }

  toggleMenuItem(itemId: string): void {
    this._form.update(f => {
      const ids = f.menuItemIds.includes(itemId)
        ? f.menuItemIds.filter(id => id !== itemId)
        : [...f.menuItemIds, itemId];
      return { ...f, menuItemIds: ids };
    });
  }

  isItemSelected(itemId: string): boolean {
    return this._form().menuItemIds.includes(itemId);
  }

  async saveForm(): Promise<void> {
    const form = this._form();
    this._saving.set(true);
    this._error.set(null);
    try {
      const data = {
        name: form.name,
        tier: form.tier,
        pricingModel: form.pricingModel,
        pricePerUnitCents: Math.round(form.pricePerUnitDollars * 100),
        minimumHeadcount: form.minimumHeadcount,
        description: form.description || undefined,
        menuItemIds: form.menuItemIds,
      };

      const editId = this._editingId();
      let result: unknown;
      if (editId) {
        result = await this.cateringService.updatePackageTemplate(editId, data);
      } else {
        result = await this.cateringService.createPackageTemplate(data);
      }

      if (!result) {
        this._error.set('Failed to save package. Please try again.');
        return;
      }
      this.closeForm();
    } finally {
      this._saving.set(false);
    }
  }

  confirmDelete(id: string): void {
    this._confirmDeleteId.set(id);
  }

  cancelDelete(): void {
    this._confirmDeleteId.set(null);
  }

  async executeDelete(id: string): Promise<void> {
    await this.cateringService.deletePackageTemplate(id);
    this._confirmDeleteId.set(null);
  }
}
