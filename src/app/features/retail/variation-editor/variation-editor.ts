import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RetailCatalogService } from '../../../services/retail-catalog';
import type { RetailItem, RetailItemVariation } from '../../../models/retail.model';

@Component({
  selector: 'os-variation-editor',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './variation-editor.html',
  styleUrl: './variation-editor.scss',
})
export class VariationEditor implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogService = inject(RetailCatalogService);

  readonly items = this.catalogService.items;
  readonly optionSets = this.catalogService.optionSets;

  readonly selectedItemId = signal<string | null>(null);
  readonly editingCellId = signal<string | null>(null);
  readonly editingField = signal<string | null>(null);
  readonly editValue = signal('');

  // Bulk price
  readonly showBulkPriceModal = signal(false);
  readonly bulkPriceType = signal<'percent' | 'fixed'>('percent');
  readonly bulkPriceValue = signal(0);

  // Auto-generate
  readonly showGenerateModal = signal(false);
  readonly selectedOptionSetIds = signal<string[]>([]);

  readonly selectedItem = computed<RetailItem | null>(() => {
    const id = this.selectedItemId();
    if (!id) return null;
    return this.items().find(i => i.id === id) ?? null;
  });

  readonly variations = computed<RetailItemVariation[]>(() =>
    this.selectedItem()?.variations ?? []
  );

  readonly itemsWithVariations = computed(() =>
    this.items().filter(i => i.variations.length > 0)
  );

  ngOnInit(): void {
    this.catalogService.loadItems();
    this.catalogService.loadOptionSets();

    const itemId = this.route.snapshot.queryParamMap.get('item');
    if (itemId) {
      this.selectedItemId.set(itemId);
    }
  }

  selectItem(itemId: string): void {
    this.selectedItemId.set(itemId);
    this.editingCellId.set(null);
  }

  // --- Inline Editing ---

  startEdit(variationId: string, field: string, currentValue: string | number | null): void {
    this.editingCellId.set(variationId);
    this.editingField.set(field);
    this.editValue.set(String(currentValue ?? ''));
  }

  cancelEdit(): void {
    this.editingCellId.set(null);
    this.editingField.set(null);
  }

  async saveEdit(variationId: string): Promise<void> {
    const itemId = this.selectedItemId();
    const field = this.editingField();
    if (!itemId || !field) return;

    const val = this.editValue();
    const data: Partial<RetailItemVariation> = {};

    switch (field) {
      case 'sku':
        data.sku = val || null;
        break;
      case 'barcode':
        data.barcode = val || null;
        break;
      case 'price':
        data.price = Number.parseFloat(val) || 0;
        break;
      case 'cost':
        data.cost = val ? Number.parseFloat(val) : null;
        break;
      case 'stockQuantity':
        data.stockQuantity = Number.parseInt(val, 10) || 0;
        break;
    }

    await this.catalogService.updateVariation(itemId, variationId, data);
    this.cancelEdit();
  }

  isEditing(variationId: string, field: string): boolean {
    return this.editingCellId() === variationId && this.editingField() === field;
  }

  // --- Bulk Price ---

  openBulkPrice(): void {
    this.bulkPriceType.set('percent');
    this.bulkPriceValue.set(0);
    this.showBulkPriceModal.set(true);
  }

  async applyBulkPrice(): Promise<void> {
    const itemId = this.selectedItemId();
    if (!itemId) return;

    await this.catalogService.bulkUpdateVariationPrices(itemId, {
      type: this.bulkPriceType(),
      value: this.bulkPriceValue(),
    });
    this.showBulkPriceModal.set(false);
  }

  // --- Auto Generate ---

  openGenerate(): void {
    this.selectedOptionSetIds.set([]);
    this.showGenerateModal.set(true);
  }

  toggleOptionSet(id: string): void {
    this.selectedOptionSetIds.update(ids => {
      if (ids.includes(id)) return ids.filter(i => i !== id);
      return [...ids, id];
    });
  }

  readonly previewVariations = computed(() => {
    const itemId = this.selectedItemId();
    const osIds = this.selectedOptionSetIds();
    if (!itemId || osIds.length === 0) return [];
    return this.catalogService.generateVariationsFromOptionSets(itemId, osIds);
  });

  async generateVariations(): Promise<void> {
    const itemId = this.selectedItemId();
    if (!itemId) return;

    const variations = this.previewVariations();
    for (const v of variations) {
      await this.catalogService.createVariation(itemId, v);
    }
    this.showGenerateModal.set(false);
  }

  async deleteVariation(variationId: string): Promise<void> {
    const itemId = this.selectedItemId();
    if (!itemId) return;
    await this.catalogService.deleteVariation(itemId, variationId);
  }

  async toggleActive(variation: RetailItemVariation): Promise<void> {
    const itemId = this.selectedItemId();
    if (!itemId) return;
    await this.catalogService.updateVariation(itemId, variation.id, {
      isActive: !variation.isActive,
    });
  }

  autoGenerateBarcode(variationId: string): void {
    const barcode = `${Date.now()}`.substring(1, 13);
    const itemId = this.selectedItemId();
    if (!itemId) return;
    this.catalogService.updateVariation(itemId, variationId, { barcode });
  }

  goBack(): void {
    this.router.navigate(['/app/retail/catalog']);
  }
}
