import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  RetailItem,
  RetailItemFormData,
  RetailItemVariation,
  RetailOptionSet,
  RetailOptionSetFormData,
  RetailCategory,
  RetailCategoryFormData,
  RetailCatalogImportResult,
  RetailCollection,
  RetailCollectionFormData,
  RetailBundle,
  RetailBundleFormData,
  CategoryTaxRule,
  generateVariationMatrix,
  formatVariationName,
} from '../models/retail.model';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RetailCatalogService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  // Items
  private readonly _items = signal<RetailItem[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Option Sets
  private readonly _optionSets = signal<RetailOptionSet[]>([]);

  // Categories
  private readonly _categories = signal<RetailCategory[]>([]);

  // Collections
  private readonly _collections = signal<RetailCollection[]>([]);

  // Bundles
  private readonly _bundles = signal<RetailBundle[]>([]);

  // Tax Rules
  private readonly _taxRules = signal<CategoryTaxRule[]>([]);

  // Public readonly signals
  readonly items = this._items.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly optionSets = this._optionSets.asReadonly();
  readonly categories = this._categories.asReadonly();
  readonly collections = this._collections.asReadonly();
  readonly bundles = this._bundles.asReadonly();
  readonly taxRules = this._taxRules.asReadonly();

  // Computed signals
  readonly activeItems = computed(() =>
    this._items().filter(i => i.isActive)
  );

  readonly itemsByCategory = computed(() => {
    const map = new Map<string, RetailItem[]>();
    for (const item of this._items()) {
      const key = item.categoryId ?? 'uncategorized';
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  });

  readonly categoryTree = computed(() => {
    const flat = this._categories();
    const roots: RetailCategory[] = [];
    const map = new Map<string, RetailCategory>();

    for (const cat of flat) {
      map.set(cat.id, { ...cat, children: [] });
    }

    for (const cat of map.values()) {
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children.push(cat);
      } else {
        roots.push(cat);
      }
    }

    return roots.sort((a, b) => a.sortOrder - b.sortOrder);
  });

  readonly lowStockItems = computed(() =>
    this._items().filter(i => {
      if (!i.trackInventory) return false;
      if (i.variations.length > 0) {
        return i.variations.some(v => v.stockQuantity <= v.lowStockThreshold);
      }
      return false;
    })
  );

  readonly activeBundles = computed(() =>
    this._bundles().filter(b => b.isActive)
  );

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  // --- Items CRUD ---

  async loadItems(): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<RetailItem[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/items`
        )
      );
      this._items.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._items.set([]);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to load items';
        this._error.set(message);
      }
    } finally {
      this._isLoading.set(false);
    }
  }

  async createItem(formData: RetailItemFormData): Promise<RetailItem | null> {
    if (!this.merchantId) return null;

    try {
      const item = await firstValueFrom(
        this.http.post<RetailItem>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/items`,
          formData
        )
      );
      this._items.update(items => [...items, item]);
      return item;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create item';
      this._error.set(message);
      return null;
    }
  }

  async updateItem(itemId: string, formData: Partial<RetailItemFormData>): Promise<RetailItem | null> {
    if (!this.merchantId) return null;

    try {
      const item = await firstValueFrom(
        this.http.put<RetailItem>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/items/${itemId}`,
          formData
        )
      );
      this._items.update(items => items.map(i => i.id === itemId ? item : i));
      return item;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update item';
      this._error.set(message);
      return null;
    }
  }

  async deleteItem(itemId: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/items/${itemId}`
        )
      );
      this._items.update(items => items.filter(i => i.id !== itemId));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete item';
      this._error.set(message);
      return false;
    }
  }

  async searchItems(query: string): Promise<RetailItem[]> {
    const q = query.toLowerCase();
    return this._items().filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.sku?.toLowerCase().includes(q) ?? false) ||
      (i.barcode?.toLowerCase().includes(q) ?? false) ||
      i.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  lookupByBarcode(barcode: string): RetailItem | null {
    for (const item of this._items()) {
      if (item.barcode === barcode) return item;
      const variation = item.variations.find(v => v.barcode === barcode);
      if (variation) return item;
    }
    return null;
  }

  lookupVariationByBarcode(barcode: string): { item: RetailItem; variation: RetailItemVariation } | null {
    for (const item of this._items()) {
      const variation = item.variations.find(v => v.barcode === barcode);
      if (variation) return { item, variation };
      if (item.barcode === barcode && item.variations.length > 0) {
        return { item, variation: item.variations[0] };
      }
    }
    return null;
  }

  lookupBySku(sku: string): RetailItem | null {
    return this._items().find(i =>
      i.sku === sku || i.variations.some(v => v.sku === sku)
    ) ?? null;
  }

  // --- Variations ---

  async createVariation(itemId: string, variation: Omit<RetailItemVariation, 'id' | 'itemId'>): Promise<RetailItemVariation | null> {
    if (!this.merchantId) return null;

    try {
      const created = await firstValueFrom(
        this.http.post<RetailItemVariation>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/items/${itemId}/variations`,
          variation
        )
      );
      this._items.update(items => items.map(i => {
        if (i.id !== itemId) return i;
        return { ...i, variations: [...i.variations, created] };
      }));
      return created;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create variation';
      this._error.set(message);
      return null;
    }
  }

  async updateVariation(itemId: string, variationId: string, data: Partial<RetailItemVariation>): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.put<RetailItemVariation>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/items/${itemId}/variations/${variationId}`,
          data
        )
      );
      this._items.update(items => items.map(i => {
        if (i.id !== itemId) return i;
        return { ...i, variations: i.variations.map(v => v.id === variationId ? updated : v) };
      }));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update variation';
      this._error.set(message);
      return false;
    }
  }

  async deleteVariation(itemId: string, variationId: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/items/${itemId}/variations/${variationId}`
        )
      );
      this._items.update(items => items.map(i => {
        if (i.id !== itemId) return i;
        return { ...i, variations: i.variations.filter(v => v.id !== variationId) };
      }));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete variation';
      this._error.set(message);
      return false;
    }
  }

  generateVariationsFromOptionSets(itemId: string, optionSetIds: string[]): RetailItemVariation[] {
    const sets = this._optionSets().filter(os => optionSetIds.includes(os.id));
    const matrix = generateVariationMatrix(sets);
    const item = this._items().find(i => i.id === itemId);

    return matrix.map((combo, idx) => ({
      id: `temp-${idx}`,
      itemId,
      name: formatVariationName(combo),
      sku: null,
      barcode: null,
      price: item?.basePrice ?? 0,
      cost: item?.cost ?? null,
      weight: null,
      dimensions: null,
      stockQuantity: 0,
      lowStockThreshold: 5,
      reorderPoint: 10,
      optionValues: combo,
      imageUrl: null,
      isActive: true,
    }));
  }

  async bulkUpdateVariationPrices(itemId: string, adjustment: { type: 'percent' | 'fixed'; value: number }): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.post<RetailItemVariation[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/items/${itemId}/variations/bulk-price`,
          adjustment
        )
      );
      this._items.update(items => items.map(i => {
        if (i.id !== itemId) return i;
        return { ...i, variations: updated };
      }));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update prices';
      this._error.set(message);
      return false;
    }
  }

  // --- Option Sets ---

  async loadOptionSets(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<RetailOptionSet[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/option-sets`
        )
      );
      this._optionSets.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._optionSets.set([]);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to load option sets';
        this._error.set(message);
      }
    }
  }

  async createOptionSet(formData: RetailOptionSetFormData): Promise<RetailOptionSet | null> {
    if (!this.merchantId) return null;

    try {
      const created = await firstValueFrom(
        this.http.post<RetailOptionSet>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/option-sets`,
          formData
        )
      );
      this._optionSets.update(sets => [...sets, created]);
      return created;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create option set';
      this._error.set(message);
      return null;
    }
  }

  async updateOptionSet(id: string, formData: RetailOptionSetFormData): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.put<RetailOptionSet>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/option-sets/${id}`,
          formData
        )
      );
      this._optionSets.update(sets => sets.map(s => s.id === id ? updated : s));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update option set';
      this._error.set(message);
      return false;
    }
  }

  async deleteOptionSet(id: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/option-sets/${id}`
        )
      );
      this._optionSets.update(sets => sets.filter(s => s.id !== id));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete option set';
      this._error.set(message);
      return false;
    }
  }

  // --- Categories ---

  async loadCategories(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<RetailCategory[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/categories`
        )
      );
      this._categories.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._categories.set([]);
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to load categories';
      this._error.set(message);
    }
  }

  async createCategory(formData: RetailCategoryFormData): Promise<RetailCategory | null> {
    if (!this.merchantId) return null;

    try {
      const created = await firstValueFrom(
        this.http.post<RetailCategory>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/categories`,
          formData
        )
      );
      this._categories.update(cats => [...cats, created]);
      return created;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create category';
      this._error.set(message);
      return null;
    }
  }

  async updateCategory(id: string, formData: Partial<RetailCategoryFormData>): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.put<RetailCategory>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/categories/${id}`,
          formData
        )
      );
      this._categories.update(cats => cats.map(c => c.id === id ? updated : c));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update category';
      this._error.set(message);
      return false;
    }
  }

  async deleteCategory(id: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/categories/${id}`
        )
      );
      this._categories.update(cats => cats.filter(c => c.id !== id));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete category';
      this._error.set(message);
      return false;
    }
  }

  async moveCategory(id: string, direction: 'up' | 'down'): Promise<void> {
    const cats = [...this._categories()].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = cats.findIndex(c => c.id === id);
    if (idx < 0) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= cats.length) return;

    const temp = cats[idx].sortOrder;
    cats[idx] = { ...cats[idx], sortOrder: cats[swapIdx].sortOrder };
    cats[swapIdx] = { ...cats[swapIdx], sortOrder: temp };
    this._categories.set(cats);

    if (this.merchantId) {
      try {
        await firstValueFrom(
          this.http.post(
            `${this.apiUrl}/merchant/${this.merchantId}/retail/categories/${id}/move`,
            { direction }
          )
        );
      } catch {
        // Optimistic update already applied
      }
    }
  }

  // --- Collections ---

  async loadCollections(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<RetailCollection[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/collections`
        )
      );
      this._collections.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load collections';
      this._error.set(message);
    }
  }

  async createCollection(formData: RetailCollectionFormData): Promise<RetailCollection | null> {
    if (!this.merchantId) return null;

    try {
      const created = await firstValueFrom(
        this.http.post<RetailCollection>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/collections`,
          formData
        )
      );
      this._collections.update(cols => [...cols, created]);
      return created;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create collection';
      this._error.set(message);
      return null;
    }
  }

  async updateCollection(id: string, formData: Partial<RetailCollectionFormData>): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.put<RetailCollection>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/collections/${id}`,
          formData
        )
      );
      this._collections.update(cols => cols.map(c => c.id === id ? updated : c));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update collection';
      this._error.set(message);
      return false;
    }
  }

  async deleteCollection(id: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/collections/${id}`
        )
      );
      this._collections.update(cols => cols.filter(c => c.id !== id));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete collection';
      this._error.set(message);
      return false;
    }
  }

  // --- Bundles ---

  async loadBundles(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<RetailBundle[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/bundles`
        )
      );
      this._bundles.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load bundles';
      this._error.set(message);
    }
  }

  async createBundle(formData: RetailBundleFormData): Promise<RetailBundle | null> {
    if (!this.merchantId) return null;

    try {
      const created = await firstValueFrom(
        this.http.post<RetailBundle>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/bundles`,
          formData
        )
      );
      this._bundles.update(bundles => [...bundles, created]);
      return created;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create bundle';
      this._error.set(message);
      return null;
    }
  }

  async updateBundle(id: string, formData: Partial<RetailBundleFormData>): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.put<RetailBundle>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/bundles/${id}`,
          formData
        )
      );
      this._bundles.update(bundles => bundles.map(b => b.id === id ? updated : b));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update bundle';
      this._error.set(message);
      return false;
    }
  }

  async deleteBundle(id: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/bundles/${id}`
        )
      );
      this._bundles.update(bundles => bundles.filter(b => b.id !== id));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete bundle';
      this._error.set(message);
      return false;
    }
  }

  // --- Tax Rules ---

  async loadTaxRules(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<CategoryTaxRule[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/tax-rules`
        )
      );
      this._taxRules.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load tax rules';
      this._error.set(message);
    }
  }

  async saveTaxRule(categoryId: string, taxRateId: string, isExempt: boolean): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      const rule = await firstValueFrom(
        this.http.post<CategoryTaxRule>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/tax-rules`,
          { categoryId, taxRateId, isExempt }
        )
      );
      this._taxRules.update(rules => {
        const existing = rules.findIndex(r => r.categoryId === categoryId);
        if (existing >= 0) {
          return rules.map((r, idx) => idx === existing ? rule : r);
        }
        return [...rules, rule];
      });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save tax rule';
      this._error.set(message);
      return false;
    }
  }

  // --- Import / Export ---

  async importFromCsv(file: File): Promise<RetailCatalogImportResult | null> {
    if (!this.merchantId) return null;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await firstValueFrom(
        this.http.post<RetailCatalogImportResult>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/items/import`,
          formData
        )
      );
      await this.loadItems();
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to import CSV';
      this._error.set(message);
      return null;
    }
  }

  async exportToCsv(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const blob = await firstValueFrom(
        this.http.get(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/items/export`,
          { responseType: 'blob' }
        )
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'retail-catalog.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to export CSV';
      this._error.set(message);
    }
  }

  autoGenerateSku(itemName: string): string {
    const prefix = itemName
      .replaceAll(/[^a-zA-Z0-9]/g, '')
      .substring(0, 4)
      .toUpperCase();
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${suffix}`;
  }

  // --- Bulk Operations ---

  async bulkUpdateCategory(itemIds: string[], categoryId: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/items/bulk`,
          { itemIds, action: 'update_category', categoryId }
        )
      );
      this._items.update(items => items.map(i =>
        itemIds.includes(i.id) ? { ...i, categoryId } : i
      ));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to bulk update';
      this._error.set(message);
      return false;
    }
  }

  async bulkUpdatePrice(itemIds: string[], adjustment: { type: 'percent' | 'fixed'; value: number }): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/items/bulk`,
          { itemIds, action: 'update_price', ...adjustment }
        )
      );
      this._items.update(items => items.map(i => {
        if (!itemIds.includes(i.id)) return i;
        const newPrice = adjustment.type === 'percent'
          ? i.basePrice * (1 + adjustment.value / 100)
          : i.basePrice + adjustment.value;
        return { ...i, basePrice: Math.round(newPrice * 100) / 100 };
      }));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to bulk update prices';
      this._error.set(message);
      return false;
    }
  }

  async bulkUpdateVisibility(itemIds: string[], visibility: Partial<RetailItem['channelVisibility']>): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/items/bulk`,
          { itemIds, action: 'update_visibility', ...visibility }
        )
      );
      this._items.update(items => items.map(i => {
        if (!itemIds.includes(i.id)) return i;
        return { ...i, channelVisibility: { ...i.channelVisibility, ...visibility } };
      }));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to bulk update visibility';
      this._error.set(message);
      return false;
    }
  }

  async bulkDelete(itemIds: string[]): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/items/bulk`,
          { itemIds, action: 'delete' }
        )
      );
      this._items.update(items => items.filter(i => !itemIds.includes(i.id)));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to bulk delete';
      this._error.set(message);
      return false;
    }
  }
}
