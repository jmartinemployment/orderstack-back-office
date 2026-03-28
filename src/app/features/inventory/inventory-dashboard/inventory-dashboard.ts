import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../../../services/inventory';
import { AuthService } from '../../../services/auth';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../../shared/error-display/error-display';
import {
  InventoryItem,
  InventoryTab,
  StockActionType,
  CycleCountEntry,
} from '../../../models/index';

@Component({
  selector: 'os-inventory-dashboard',
  imports: [CurrencyPipe, DecimalPipe, DatePipe, FormsModule, LoadingSpinner, ErrorDisplay],
  templateUrl: './inventory-dashboard.html',
  styleUrl: './inventory-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryDashboard implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly report = this.inventoryService.report;
  readonly items = this.inventoryService.items;
  readonly alerts = this.inventoryService.alerts;
  readonly predictions = this.inventoryService.predictions;
  readonly cycleCounts = this.inventoryService.cycleCounts;
  readonly activeCycleCount = this.inventoryService.activeCycleCount;
  readonly expiringItems = this.inventoryService.expiringItems;
  readonly unitConversions = this.inventoryService.unitConversions;
  readonly isLoading = this.inventoryService.isLoading;
  readonly error = this.inventoryService.error;

  private readonly _activeTab = signal<InventoryTab>('overview');
  private readonly _searchTerm = signal('');
  private readonly _categoryFilter = signal('all');
  private readonly _stockFilter = signal<'all' | 'low' | 'out' | 'overstock' | 'ok'>('all');
  private readonly _sortField = signal<'name' | 'currentStock' | 'costPerUnit' | 'category'>('name');
  private readonly _sortAsc = signal(true);
  private readonly _showStockModal = signal(false);
  private readonly _stockActionType = signal<StockActionType>('restock');
  private readonly _selectedItem = signal<InventoryItem | null>(null);
  private readonly _stockQuantity = signal(0);
  private readonly _stockReason = signal('');
  private readonly _invoiceNumber = signal('');
  private readonly _isSubmitting = signal(false);
  private readonly _showAddForm = signal(false);
  private readonly _newItemName = signal('');
  private readonly _newItemUnit = signal('units');
  private readonly _newItemCategory = signal('');
  private readonly _newItemMinStock = signal(0);
  private readonly _newItemMaxStock = signal(100);
  private readonly _newItemCostPerUnit = signal(0);
  private readonly _newItemSupplier = signal('');

  // Cycle count state
  private readonly _cycleCountCategory = signal('');
  private readonly _cycleCountEntries = signal<CycleCountEntry[]>([]);
  private readonly _isStartingCount = signal(false);

  // Unit conversion form
  private readonly _showConversionForm = signal(false);
  private readonly _convFromUnit = signal('');
  private readonly _convToUnit = signal('');
  private readonly _convFactor = signal(1);

  // Expiring items config
  private readonly _expirationDays = signal(7);

  readonly expiredItems = computed(() =>
    this.expiringItems().filter(e => e.daysUntilExpiration < 0)
  );

  readonly expiringSoonItems = computed(() =>
    this.expiringItems().filter(e => e.daysUntilExpiration >= 0)
  );

  readonly activeTab = this._activeTab.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly categoryFilter = this._categoryFilter.asReadonly();
  readonly stockFilter = this._stockFilter.asReadonly();
  readonly sortField = this._sortField.asReadonly();
  readonly sortAsc = this._sortAsc.asReadonly();
  readonly showStockModal = this._showStockModal.asReadonly();
  readonly stockActionType = this._stockActionType.asReadonly();
  readonly selectedItem = this._selectedItem.asReadonly();
  readonly stockQuantity = this._stockQuantity.asReadonly();
  readonly stockReason = this._stockReason.asReadonly();
  readonly invoiceNumber = this._invoiceNumber.asReadonly();
  readonly isSubmitting = this._isSubmitting.asReadonly();
  readonly showAddForm = this._showAddForm.asReadonly();
  readonly newItemName = this._newItemName.asReadonly();
  readonly newItemUnit = this._newItemUnit.asReadonly();
  readonly newItemCategory = this._newItemCategory.asReadonly();
  readonly newItemMinStock = this._newItemMinStock.asReadonly();
  readonly newItemMaxStock = this._newItemMaxStock.asReadonly();
  readonly newItemCostPerUnit = this._newItemCostPerUnit.asReadonly();
  readonly newItemSupplier = this._newItemSupplier.asReadonly();
  readonly cycleCountCategory = this._cycleCountCategory.asReadonly();
  readonly cycleCountEntries = this._cycleCountEntries.asReadonly();
  readonly isStartingCount = this._isStartingCount.asReadonly();
  readonly showConversionForm = this._showConversionForm.asReadonly();
  readonly convFromUnit = this._convFromUnit.asReadonly();
  readonly convToUnit = this._convToUnit.asReadonly();
  readonly convFactor = this._convFactor.asReadonly();
  readonly expirationDays = this._expirationDays.asReadonly();

  readonly categories = computed(() => {
    const cats = new Set(this.items().map(item => item.category));
    return ['all', ...Array.from(cats).sort((a, b) => a.localeCompare(b))];
  });

  readonly filteredItems = computed(() => {
    let result = [...this.items()];

    const search = this._searchTerm().toLowerCase();
    if (search) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(search) ||
        (item.nameEn?.toLowerCase().includes(search) ?? false) ||
        item.category.toLowerCase().includes(search) ||
        (item.supplier?.toLowerCase().includes(search) ?? false)
      );
    }

    const cat = this._categoryFilter();
    if (cat !== 'all') {
      result = result.filter(item => item.category === cat);
    }

    const stock = this._stockFilter();
    if (stock !== 'all') {
      result = result.filter(item => {
        switch (stock) {
          case 'out': return item.currentStock === 0;
          case 'low': return item.currentStock > 0 && item.currentStock <= item.minStock;
          case 'overstock': return item.currentStock > item.maxStock;
          case 'ok': return item.currentStock > item.minStock && item.currentStock <= item.maxStock;
        }
      });
    }

    const field = this._sortField();
    const asc = this._sortAsc();
    result.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return asc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return result;
  });

  readonly sortedPredictions = computed(() => {
    return [...this.predictions()].sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);
  });

  readonly criticalAlerts = computed(() =>
    this.alerts().filter(a => a.severity === 'critical')
  );

  readonly warningAlerts = computed(() =>
    this.alerts().filter(a => a.severity === 'warning')
  );

  readonly infoAlerts = computed(() =>
    this.alerts().filter(a => a.severity === 'info')
  );

  readonly submittedCycleCounts = computed(() =>
    this.cycleCounts().filter(c => c.status === 'submitted')
  );

  readonly linkedItemCount = computed(() =>
    this.items().filter(i => i.linkedVariationId).length
  );

  readonly unlinkedItemCount = computed(() =>
    this.items().filter(i => !i.linkedVariationId).length
  );

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.inventoryService.refresh();
      this.inventoryService.loadExpiringItems(this._expirationDays());
    }
  }

  setTab(tab: InventoryTab): void {
    this._activeTab.set(tab);
    if (tab === 'cycle-counts') {
      this.inventoryService.loadCycleCounts();
      this.inventoryService.loadUnitConversions();
    }
  }

  setSearchTerm(term: string): void {
    this._searchTerm.set(term);
  }

  setCategoryFilter(category: string): void {
    this._categoryFilter.set(category);
  }

  setStockFilter(filter: 'all' | 'low' | 'out' | 'overstock' | 'ok'): void {
    this._stockFilter.set(filter);
  }

  setSort(field: 'name' | 'currentStock' | 'costPerUnit' | 'category'): void {
    if (this._sortField() === field) {
      this._sortAsc.update(v => !v);
    } else {
      this._sortField.set(field);
      this._sortAsc.set(true);
    }
  }

  getStockPercent(item: InventoryItem): number {
    if (item.maxStock === 0) return 0;
    return Math.min(100, (item.currentStock / item.maxStock) * 100);
  }

  getStockBarClass(item: InventoryItem): string {
    const pct = this.getStockPercent(item);
    if (pct <= 0) return 'stock-empty';
    if (pct < 25) return 'stock-critical';
    if (pct < 50) return 'stock-warning';
    return 'stock-good';
  }

  getAlertSeverityClass(severity: string): string {
    switch (severity) {
      case 'critical': return 'alert-critical';
      case 'warning': return 'alert-warning-custom';
      default: return 'alert-info-custom';
    }
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'out_of_stock': return '!!';
      case 'low_stock': return '!';
      case 'reorder_soon': return 'R';
      default: return 'i';
    }
  }

  getPredictionUrgencyClass(days: number): string {
    if (days < 7) return 'urgency-critical';
    if (days < 14) return 'urgency-warning';
    if (days >= 999) return 'urgency-plenty';
    return 'urgency-ok';
  }

  getConfidenceClass(confidence: string): string {
    switch (confidence) {
      case 'high': return 'badge-confidence-high';
      case 'medium': return 'badge-confidence-medium';
      default: return 'badge-confidence-low';
    }
  }

  openStockAction(item: InventoryItem, actionType: StockActionType): void {
    this._selectedItem.set(item);
    this._stockActionType.set(actionType);
    this._stockQuantity.set(0);
    this._stockReason.set('');
    this._invoiceNumber.set('');
    this._showStockModal.set(true);
  }

  closeStockModal(): void {
    this._showStockModal.set(false);
    this._selectedItem.set(null);
  }

  orderMore(item: InventoryItem): void {
    this.closeStockModal();
    this.router.navigate(['/app/suppliers'], { queryParams: { item: item.name } });
  }

  orderMoreByName(itemName: string): void {
    this.router.navigate(['/app/suppliers'], { queryParams: { item: itemName } });
  }

  setStockQuantity(qty: number): void {
    this._stockQuantity.set(qty);
  }

  setStockReason(reason: string): void {
    this._stockReason.set(reason);
  }

  setInvoiceNumber(num: string): void {
    this._invoiceNumber.set(num);
  }

  async submitStockAction(): Promise<void> {
    const item = this._selectedItem();
    const qty = this._stockQuantity();
    if (!item || qty <= 0) return;

    this._isSubmitting.set(true);

    let success = false;
    switch (this._stockActionType()) {
      case 'restock':
        success = await this.inventoryService.recordRestock(
          item.id,
          qty,
          this._invoiceNumber() || undefined
        );
        break;
      case 'usage':
        success = await this.inventoryService.recordUsage(item.id, qty, this._stockReason());
        break;
      case 'adjustment':
        success = await this.inventoryService.updateStock(item.id, qty, this._stockReason());
        break;
    }

    this._isSubmitting.set(false);

    if (success) {
      this.closeStockModal();
    }
  }

  async predictItem(item: InventoryItem): Promise<void> {
    await this.inventoryService.predictItem(item.id);
  }

  toggleAddForm(): void {
    this._showAddForm.update(v => !v);
    if (!this._showAddForm()) {
      this.resetAddForm();
    }
  }

  setNewItemName(name: string): void { this._newItemName.set(name); }
  setNewItemUnit(unit: string): void { this._newItemUnit.set(unit); }
  setNewItemCategory(cat: string): void { this._newItemCategory.set(cat); }
  setNewItemMinStock(min: number): void { this._newItemMinStock.set(min); }
  setNewItemMaxStock(max: number): void { this._newItemMaxStock.set(max); }
  setNewItemCostPerUnit(cost: number): void { this._newItemCostPerUnit.set(cost); }
  setNewItemSupplier(supplier: string): void { this._newItemSupplier.set(supplier); }

  async addItem(): Promise<void> {
    const name = this._newItemName().trim();
    if (!name) return;

    this._isSubmitting.set(true);

    const result = await this.inventoryService.createItem({
      name,
      unit: this._newItemUnit(),
      category: this._newItemCategory() || 'General',
      minStock: this._newItemMinStock(),
      maxStock: this._newItemMaxStock(),
      costPerUnit: this._newItemCostPerUnit(),
      supplier: this._newItemSupplier() || null,
    });

    this._isSubmitting.set(false);

    if (result) {
      this.resetAddForm();
      this._showAddForm.set(false);
    }
  }

  getStockActionLabel(): string {
    switch (this._stockActionType()) {
      case 'restock': return 'Restock';
      case 'usage': return 'Record Usage';
      case 'adjustment': return 'Adjust Stock';
    }
  }

  retry(): void {
    this.inventoryService.refresh();
    this.inventoryService.loadExpiringItems(this._expirationDays());
  }

  // ── Cycle Counts ──

  setCycleCountCategory(cat: string): void {
    this._cycleCountCategory.set(cat);
  }

  async startCycleCount(): Promise<void> {
    this._isStartingCount.set(true);
    const cat = this._cycleCountCategory() || undefined;
    const count = await this.inventoryService.startCycleCount(cat);
    this._isStartingCount.set(false);
    if (count) {
      this._cycleCountEntries.set(count.entries);
    }
  }

  updateCycleEntry(index: number, actualQuantity: number): void {
    this._cycleCountEntries.update(entries => {
      const updated = [...entries];
      const entry = { ...updated[index] };
      entry.actualQuantity = actualQuantity;
      entry.varianceQuantity = actualQuantity - entry.expectedQuantity;
      updated[index] = entry;
      return updated;
    });
  }

  async submitCycleCount(): Promise<void> {
    const count = this.activeCycleCount();
    if (!count) return;
    this._isSubmitting.set(true);
    await this.inventoryService.submitCycleCount(count.id, this._cycleCountEntries());
    this._isSubmitting.set(false);
    this._cycleCountEntries.set([]);
  }

  getCycleCountVarianceClass(variance: number): string {
    if (variance === 0) return 'variance-ok';
    if (variance > 0) return 'variance-over';
    return 'variance-under';
  }

  // ── Expiring Items ──

  async changeExpirationDays(days: number): Promise<void> {
    this._expirationDays.set(days);
    await this.inventoryService.loadExpiringItems(days);
  }

  getExpirationUrgencyClass(days: number): string {
    if (days < 0) return 'urgency-critical';
    if (days === 0) return 'urgency-critical';
    if (days <= 3) return 'urgency-warning';
    return 'urgency-ok';
  }

  getExpirationBadgeLabel(days: number): string {
    if (days < 0) return 'Expired';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    return `${days} days`;
  }

  getExpirationBadgeClass(days: number): string {
    if (days < 0) return 'bg-danger';
    if (days === 0) return 'bg-danger';
    if (days <= 3) return 'bg-danger';
    return 'bg-warning';
  }

  // ── Unit Conversions ──

  toggleConversionForm(): void {
    this._showConversionForm.update(v => !v);
    if (!this._showConversionForm()) {
      this._convFromUnit.set('');
      this._convToUnit.set('');
      this._convFactor.set(1);
    }
  }

  setConvFromUnit(unit: string): void { this._convFromUnit.set(unit); }
  setConvToUnit(unit: string): void { this._convToUnit.set(unit); }
  setConvFactor(factor: number): void { this._convFactor.set(factor); }

  async addConversion(): Promise<void> {
    const from = this._convFromUnit().trim();
    const to = this._convToUnit().trim();
    const factor = this._convFactor();
    if (!from || !to || factor <= 0) return;

    this._isSubmitting.set(true);
    const result = await this.inventoryService.createUnitConversion({
      fromUnit: from,
      toUnit: to,
      factor,
    });
    this._isSubmitting.set(false);

    if (result) {
      this.toggleConversionForm();
    }
  }

  async deleteConversion(id: string): Promise<void> {
    await this.inventoryService.deleteUnitConversion(id);
  }

  private resetAddForm(): void {
    this._newItemName.set('');
    this._newItemUnit.set('units');
    this._newItemCategory.set('');
    this._newItemMinStock.set(0);
    this._newItemMaxStock.set(100);
    this._newItemCostPerUnit.set(0);
    this._newItemSupplier.set('');
  }
}
