import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RetailCatalogService } from '../../../services/retail-catalog';
import type {
  RetailItem,
  RetailItemFormData,
  RetailCategory,
  RetailCategoryFormData,
  RetailOptionSet,
  RetailOptionSetFormData,
  RetailCatalogImportResult,
  RetailChannelVisibility,
  RetailItemType,
  RetailCollection,
  RetailCollectionFormData,
  CollectionRule,
  CollectionRuleField,
  CollectionRuleOperator,
  RetailBundle,
  RetailBundleFormData,
  BundleComponent,
  BundleType,
} from '../../../models/retail.model';
import { calculateBundleDiscount } from '../../../models/retail.model';

type CatalogTab = 'items' | 'categories' | 'option-sets' | 'collections' | 'bundles';
type ViewMode = 'grid' | 'list';

@Component({
  selector: 'os-catalog-management',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalog-management.html',
  styleUrl: './catalog-management.scss',
})
export class CatalogManagement implements OnInit {
  private readonly catalogService = inject(RetailCatalogService);

  // Tab state
  readonly activeTab = signal<CatalogTab>('items');
  readonly viewMode = signal<ViewMode>('grid');

  // Service signals
  readonly items = this.catalogService.items;
  readonly categories = this.catalogService.categories;
  readonly categoryTree = this.catalogService.categoryTree;
  readonly optionSets = this.catalogService.optionSets;
  readonly collections = this.catalogService.collections;
  readonly bundles = this.catalogService.bundles;
  readonly isLoading = this.catalogService.isLoading;
  readonly lowStockItems = this.catalogService.lowStockItems;

  // Search & filter
  readonly searchQuery = signal('');
  readonly filterCategoryId = signal<string | null>(null);

  // Item modal
  readonly showItemModal = signal(false);
  readonly editingItem = signal<RetailItem | null>(null);
  readonly itemForm = signal<RetailItemFormData>(this.emptyItemForm());
  readonly showItemAdvanced = signal(false);

  // Category modal
  readonly showCategoryModal = signal(false);
  readonly editingCategory = signal<RetailCategory | null>(null);
  readonly categoryForm = signal<RetailCategoryFormData>({ name: '', parentId: null, taxRuleId: null, imageUrl: null });

  // Option set modal
  readonly showOptionSetModal = signal(false);
  readonly editingOptionSet = signal<RetailOptionSet | null>(null);
  readonly optionSetForm = signal<RetailOptionSetFormData>({ name: '', values: [] });
  readonly newOptionValue = signal('');

  // Collection modal
  readonly showCollectionModal = signal(false);
  readonly editingCollection = signal<RetailCollection | null>(null);
  readonly collectionForm = signal<RetailCollectionFormData>({ name: '', type: 'manual', rules: [], itemIds: [] });
  readonly newRule = signal<CollectionRule>({ field: 'price', operator: 'greater_than', value: '' });

  // Bundle modal
  readonly showBundleModal = signal(false);
  readonly editingBundle = signal<RetailBundle | null>(null);
  readonly bundleForm = signal<RetailBundleFormData>({
    name: '', sku: null, barcode: null, price: 0,
    bundleType: 'fixed_price', discountPercent: null, components: [],
  });
  readonly bundleComponentSearch = signal('');

  // CSV import
  readonly showImportModal = signal(false);
  readonly importResult = signal<RetailCatalogImportResult | null>(null);
  readonly importFile = signal<File | null>(null);

  // Bulk selection
  readonly selectedItemIds = signal<Set<string>>(new Set());
  readonly showBulkActions = computed(() => this.selectedItemIds().size > 0);

  // Filtered items
  readonly filteredItems = computed(() => {
    let result = this.items();
    const q = this.searchQuery().toLowerCase();
    const catId = this.filterCategoryId();

    if (q) {
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.sku?.toLowerCase().includes(q) ?? false) ||
        (i.barcode?.toLowerCase().includes(q) ?? false) ||
        i.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (catId) {
      result = result.filter(i => i.categoryId === catId || i.subcategoryId === catId);
    }
    return result;
  });

  // Bundle savings preview
  readonly bundleSavings = computed(() => {
    const form = this.bundleForm();
    const components = form.components.map(c => {
      const item = this.items().find(i => i.id === c.itemId);
      return {
        ...c,
        itemName: item?.name ?? '',
        variationName: null as string | null,
        unitPrice: item?.basePrice ?? 0,
      } satisfies BundleComponent;
    });
    return calculateBundleDiscount(form.bundleType, components, form.price, form.discountPercent);
  });

  readonly bundleSearchResults = computed(() => {
    const q = this.bundleComponentSearch().toLowerCase();
    if (!q) return [];
    return this.items().filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.sku?.toLowerCase().includes(q) ?? false)
    ).slice(0, 10);
  });

  ngOnInit(): void {
    this.catalogService.loadItems();
    this.catalogService.loadCategories();
    this.catalogService.loadOptionSets();
  }

  setTab(tab: CatalogTab): void {
    this.activeTab.set(tab);
    if (tab === 'collections' && this.collections().length === 0) {
      this.catalogService.loadCollections();
    }
    if (tab === 'bundles' && this.bundles().length === 0) {
      this.catalogService.loadBundles();
    }
  }

  // --- Items ---

  openCreateItem(): void {
    this.editingItem.set(null);
    this.itemForm.set(this.emptyItemForm());
    this.showItemAdvanced.set(false);
    this.showItemModal.set(true);
  }

  openEditItem(item: RetailItem): void {
    this.editingItem.set(item);
    this.itemForm.set({
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      barcodeFormat: item.barcodeFormat,
      description: item.description,
      basePrice: item.basePrice,
      cost: item.cost,
      imageUrl: item.imageUrl,
      categoryId: item.categoryId,
      subcategoryId: item.subcategoryId,
      vendorId: item.vendorId,
      vendorCode: item.vendorCode,
      itemType: item.itemType,
      taxable: item.taxable,
      trackInventory: item.trackInventory,
      weightBased: item.weightBased,
      weightUnit: item.weightUnit,
      tags: [...item.tags],
      channelVisibility: { ...item.channelVisibility },
    });
    this.showItemAdvanced.set(false);
    this.showItemModal.set(true);
  }

  async saveItem(): Promise<void> {
    const form = this.itemForm();
    const editing = this.editingItem();

    if (editing) {
      await this.catalogService.updateItem(editing.id, form);
    } else {
      await this.catalogService.createItem(form);
    }
    this.showItemModal.set(false);
  }

  async deleteItem(item: RetailItem): Promise<void> {
    await this.catalogService.deleteItem(item.id);
  }

  autoGenerateSku(): void {
    const form = this.itemForm();
    const sku = this.catalogService.autoGenerateSku(form.name);
    this.itemForm.update(f => ({ ...f, sku }));
  }

  updateItemForm(partial: Partial<RetailItemFormData>): void {
    this.itemForm.update(f => ({ ...f, ...partial }));
  }

  updateItemType(type: string): void {
    this.itemForm.update(f => ({ ...f, itemType: type as RetailItemType }));
  }

  updateChannelVisibility(key: keyof RetailChannelVisibility, value: boolean): void {
    this.itemForm.update(f => ({
      ...f,
      channelVisibility: { ...f.channelVisibility, [key]: value },
    }));
  }

  // --- Selection ---

  toggleItemSelection(id: string): void {
    this.selectedItemIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  clearSelection(): void {
    this.selectedItemIds.set(new Set());
  }

  toggleSelectAll(): void {
    const all = this.filteredItems().map(i => i.id);
    const selected = this.selectedItemIds();
    if (selected.size === all.length) {
      this.selectedItemIds.set(new Set());
    } else {
      this.selectedItemIds.set(new Set(all));
    }
  }

  async bulkDelete(): Promise<void> {
    const ids = [...this.selectedItemIds()];
    await this.catalogService.bulkDelete(ids);
    this.selectedItemIds.set(new Set());
  }

  async bulkChangeCategory(categoryId: string): Promise<void> {
    const ids = [...this.selectedItemIds()];
    await this.catalogService.bulkUpdateCategory(ids, categoryId);
    this.selectedItemIds.set(new Set());
  }

  // --- Form Update Helpers ---

  updateCategoryName(name: string): void {
    this.categoryForm.update(f => ({ ...f, name }));
  }

  updateCategoryParent(parentId: string | null): void {
    this.categoryForm.update(f => ({ ...f, parentId }));
  }

  updateOptionSetName(name: string): void {
    this.optionSetForm.update(f => ({ ...f, name }));
  }

  updateCollectionName(name: string): void {
    this.collectionForm.update(f => ({ ...f, name }));
  }

  updateNewRuleValue(value: string): void {
    this.newRule.update(r => ({ ...r, value }));
  }

  toggleItemAdvanced(): void {
    this.showItemAdvanced.update(v => !v);
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
    this.importResult.set(null);
    this.importFile.set(null);
  }

  // --- Categories ---

  openCreateCategory(parentId: string | null = null): void {
    this.editingCategory.set(null);
    this.categoryForm.set({ name: '', parentId, taxRuleId: null, imageUrl: null });
    this.showCategoryModal.set(true);
  }

  openEditCategory(cat: RetailCategory): void {
    this.editingCategory.set(cat);
    this.categoryForm.set({
      name: cat.name,
      parentId: cat.parentId,
      taxRuleId: cat.taxRuleId,
      imageUrl: cat.imageUrl,
    });
    this.showCategoryModal.set(true);
  }

  async saveCategory(): Promise<void> {
    const form = this.categoryForm();
    const editing = this.editingCategory();

    if (editing) {
      await this.catalogService.updateCategory(editing.id, form);
    } else {
      await this.catalogService.createCategory(form);
    }
    this.showCategoryModal.set(false);
  }

  async deleteCategory(cat: RetailCategory): Promise<void> {
    await this.catalogService.deleteCategory(cat.id);
  }

  async moveCategoryUp(cat: RetailCategory): Promise<void> {
    await this.catalogService.moveCategory(cat.id, 'up');
  }

  async moveCategoryDown(cat: RetailCategory): Promise<void> {
    await this.catalogService.moveCategory(cat.id, 'down');
  }

  // --- Option Sets ---

  openCreateOptionSet(): void {
    this.editingOptionSet.set(null);
    this.optionSetForm.set({ name: '', values: [] });
    this.newOptionValue.set('');
    this.showOptionSetModal.set(true);
  }

  openEditOptionSet(os: RetailOptionSet): void {
    this.editingOptionSet.set(os);
    this.optionSetForm.set({ name: os.name, values: [...os.values] });
    this.newOptionValue.set('');
    this.showOptionSetModal.set(true);
  }

  addOptionValue(): void {
    const val = this.newOptionValue().trim();
    if (!val) return;
    this.optionSetForm.update(f => ({ ...f, values: [...f.values, val] }));
    this.newOptionValue.set('');
  }

  removeOptionValue(index: number): void {
    this.optionSetForm.update(f => ({
      ...f,
      values: f.values.filter((_, i) => i !== index),
    }));
  }

  async saveOptionSet(): Promise<void> {
    const form = this.optionSetForm();
    const editing = this.editingOptionSet();

    if (editing) {
      await this.catalogService.updateOptionSet(editing.id, form);
    } else {
      await this.catalogService.createOptionSet(form);
    }
    this.showOptionSetModal.set(false);
  }

  async deleteOptionSet(os: RetailOptionSet): Promise<void> {
    await this.catalogService.deleteOptionSet(os.id);
  }

  // --- Collections ---

  openCreateCollection(): void {
    this.editingCollection.set(null);
    this.collectionForm.set({ name: '', type: 'manual', rules: [], itemIds: [] });
    this.showCollectionModal.set(true);
  }

  openEditCollection(col: RetailCollection): void {
    this.editingCollection.set(col);
    this.collectionForm.set({
      name: col.name,
      type: col.type,
      rules: [...col.rules],
      itemIds: [...col.itemIds],
    });
    this.showCollectionModal.set(true);
  }

  addCollectionRule(): void {
    const rule = { ...this.newRule() };
    if (!rule.value) return;
    this.collectionForm.update(f => ({ ...f, rules: [...f.rules, rule] }));
    this.newRule.set({ field: 'price', operator: 'greater_than', value: '' });
  }

  removeCollectionRule(index: number): void {
    this.collectionForm.update(f => ({
      ...f,
      rules: f.rules.filter((_, i) => i !== index),
    }));
  }

  updateNewRuleField(field: string): void {
    this.newRule.update(r => ({ ...r, field: field as CollectionRuleField }));
  }

  updateNewRuleOperator(op: string): void {
    this.newRule.update(r => ({ ...r, operator: op as CollectionRuleOperator }));
  }

  updateCollectionType(type: string): void {
    this.collectionForm.update(f => ({ ...f, type: type as 'smart' | 'manual' }));
  }

  async saveCollection(): Promise<void> {
    const form = this.collectionForm();
    const editing = this.editingCollection();

    if (editing) {
      await this.catalogService.updateCollection(editing.id, form);
    } else {
      await this.catalogService.createCollection(form);
    }
    this.showCollectionModal.set(false);
  }

  async deleteCollection(col: RetailCollection): Promise<void> {
    await this.catalogService.deleteCollection(col.id);
  }

  // --- Bundles ---

  openCreateBundle(): void {
    this.editingBundle.set(null);
    this.bundleForm.set({
      name: '', sku: null, barcode: null, price: 0,
      bundleType: 'fixed_price', discountPercent: null, components: [],
    });
    this.bundleComponentSearch.set('');
    this.showBundleModal.set(true);
  }

  openEditBundle(bundle: RetailBundle): void {
    this.editingBundle.set(bundle);
    this.bundleForm.set({
      name: bundle.name,
      sku: bundle.sku,
      barcode: bundle.barcode,
      price: bundle.price,
      bundleType: bundle.bundleType,
      discountPercent: bundle.discountPercent,
      components: bundle.components.map(c => ({
        itemId: c.itemId,
        variationId: c.variationId,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        isRequired: c.isRequired,
      })),
    });
    this.bundleComponentSearch.set('');
    this.showBundleModal.set(true);
  }

  addBundleComponent(item: RetailItem): void {
    this.bundleForm.update(f => ({
      ...f,
      components: [...f.components, {
        itemId: item.id,
        variationId: null,
        quantity: 1,
        unitPrice: item.basePrice,
        isRequired: true,
      }],
    }));
    this.bundleComponentSearch.set('');
  }

  removeBundleComponent(index: number): void {
    this.bundleForm.update(f => ({
      ...f,
      components: f.components.filter((_, i) => i !== index),
    }));
  }

  updateBundleType(type: string): void {
    this.bundleForm.update(f => ({ ...f, bundleType: type as BundleType }));
  }

  updateBundleName(name: string): void {
    this.bundleForm.update(f => ({ ...f, name }));
  }

  updateBundleDiscount(value: number | null): void {
    this.bundleForm.update(f => ({ ...f, discountPercent: value }));
  }

  updateBundlePrice(value: number): void {
    this.bundleForm.update(f => ({ ...f, price: value ?? 0 }));
  }

  getItemName(itemId: string): string {
    return this.items().find(i => i.id === itemId)?.name ?? 'Unknown';
  }

  getItemPrice(itemId: string): number {
    return this.items().find(i => i.id === itemId)?.basePrice ?? 0;
  }

  async saveBundle(): Promise<void> {
    const form = this.bundleForm();
    const editing = this.editingBundle();

    if (editing) {
      await this.catalogService.updateBundle(editing.id, form);
    } else {
      await this.catalogService.createBundle(form);
    }
    this.showBundleModal.set(false);
  }

  async deleteBundle(bundle: RetailBundle): Promise<void> {
    await this.catalogService.deleteBundle(bundle.id);
  }

  // --- CSV ---

  onImportFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.importFile.set(file);
  }

  async runImport(): Promise<void> {
    const file = this.importFile();
    if (!file) return;
    const result = await this.catalogService.importFromCsv(file);
    this.importResult.set(result);
  }

  async exportCsv(): Promise<void> {
    await this.catalogService.exportToCsv();
  }

  getCategoryName(id: string | null): string {
    if (!id) return 'Uncategorized';
    return this.categories().find(c => c.id === id)?.name ?? 'Unknown';
  }

  private emptyItemForm(): RetailItemFormData {
    return {
      name: '',
      sku: null,
      barcode: null,
      barcodeFormat: null,
      description: '',
      basePrice: 0,
      cost: null,
      imageUrl: null,
      categoryId: null,
      subcategoryId: null,
      vendorId: null,
      vendorCode: null,
      itemType: 'physical',
      taxable: true,
      trackInventory: true,
      weightBased: false,
      weightUnit: null,
      tags: [],
      channelVisibility: { inStore: true, online: true, kiosk: false },
    };
  }
}
