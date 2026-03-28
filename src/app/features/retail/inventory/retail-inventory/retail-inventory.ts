import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RetailInventoryService } from '../../../../services/retail-inventory';
import { RetailCatalogService } from '../../../../services/retail-catalog';
import type {
  RetailStockRecord,
  StockAdjustmentFormData,
  StockAdjustmentType,
  StockTransfer,
  StockTransferFormData,
  StockAlertType,
  RetailCycleCount,
  LabelSize,
  LabelTemplate,
  LabelPrintJob,
  InventoryAgingBucket,
  SellThroughReport,
  ShrinkageReport,
} from '../../../../models/retail-inventory.model';
import { ADJUSTMENT_TYPE_LABELS, ALERT_TYPE_LABELS } from '../../../../models/retail-inventory.model';

type InventoryTab = 'overview' | 'adjustments' | 'transfers' | 'counts' | 'alerts' | 'fifo' | 'labels' | 'reports';
type AdjustmentFilterType = 'all' | StockAdjustmentType;
type AlertFilterType = 'all' | StockAlertType;
type ReportView = 'aging' | 'sell-through' | 'shrinkage';

@Component({
  selector: 'os-retail-inventory',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, TitleCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './retail-inventory.html',
  styleUrl: './retail-inventory.scss',
})
export class RetailInventory implements OnInit {
  private readonly inventoryService = inject(RetailInventoryService);
  private readonly catalogService = inject(RetailCatalogService);

  // Service data
  readonly stock = this.inventoryService.stock;
  readonly adjustments = this.inventoryService.adjustments;
  readonly transfers = this.inventoryService.transfers;
  readonly activeCounts = this.inventoryService.activeCounts;
  readonly alerts = this.inventoryService.alerts;
  readonly costLayers = this.inventoryService.costLayers;
  readonly isLoading = this.inventoryService.isLoading;
  readonly error = this.inventoryService.error;
  readonly lowStockItems = this.inventoryService.lowStockItems;
  readonly outOfStockItems = this.inventoryService.outOfStockItems;
  readonly totalStockValue = this.inventoryService.totalStockValue;
  readonly pendingTransfers = this.inventoryService.pendingTransfers;
  readonly unresolvedAlerts = this.inventoryService.unresolvedAlerts;

  // Catalog items for lookups
  readonly catalogItems = this.catalogService.items;

  // UI state
  readonly activeTab = signal<InventoryTab>('overview');
  readonly searchQuery = signal('');

  // Overview
  readonly showAdjustModal = signal(false);
  readonly adjustItemId = signal('');
  readonly adjustVariationId = signal<string | null>(null);
  readonly adjustType = signal<StockAdjustmentType>('received');
  readonly adjustQuantity = signal(0);
  readonly adjustReason = signal('');
  readonly adjustNote = signal('');
  readonly adjustCostPerUnit = signal<number | null>(null);

  // Adjustments tab
  readonly adjustmentFilter = signal<AdjustmentFilterType>('all');

  // Transfers tab
  readonly showTransferModal = signal(false);
  readonly transferFromLocation = signal('');
  readonly transferToLocation = signal('');
  readonly transferNote = signal('');
  readonly transferItems = signal<{ itemId: string; variationId: string | null; quantity: number }[]>([]);
  readonly showReceiveModal = signal(false);
  readonly receiveTransferId = signal<string | null>(null);

  // Counts tab
  readonly showStartCountModal = signal(false);
  readonly countType = signal<'full' | 'cycle'>('full');
  readonly countCategoryId = signal('');
  readonly activeCountId = signal<string | null>(null);

  // Alerts tab
  readonly alertFilter = signal<AlertFilterType>('all');
  readonly showResolvedAlerts = signal(false);

  // FIFO tab
  readonly fifoItemId = signal('');
  readonly fifoItemSearch = signal('');

  // Labels tab
  readonly labelSize = signal<LabelSize>('standard');
  readonly labelShowName = signal(true);
  readonly labelShowVariation = signal(true);
  readonly labelShowPrice = signal(true);
  readonly labelShowBarcode = signal(true);
  readonly labelShowSku = signal(false);
  readonly labelSelectedItems = signal<Set<string>>(new Set());
  readonly labelQuantity = signal(1);
  readonly isPrinting = signal(false);

  // Reports tab
  readonly reportView = signal<ReportView>('aging');
  readonly agingBuckets = signal<InventoryAgingBucket[]>([]);
  readonly sellThroughData = signal<SellThroughReport[]>([]);
  readonly shrinkageData = signal<ShrinkageReport[]>([]);
  readonly reportDateFrom = signal('');
  readonly reportDateTo = signal('');
  readonly isLoadingReport = signal(false);

  // Computeds
  readonly filteredStock = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const items = this.stock();
    if (!query) return items;
    return items.filter(s =>
      s.itemName.toLowerCase().includes(query) ||
      (s.variationName?.toLowerCase().includes(query)) ||
      (s.sku?.toLowerCase().includes(query)) ||
      (s.barcode?.toLowerCase().includes(query))
    );
  });

  readonly totalSkus = computed(() => this.stock().length);

  readonly lowStockCount = computed(() => this.lowStockItems().length);

  readonly outOfStockCount = computed(() => this.outOfStockItems().length);

  readonly filteredAdjustments = computed(() => {
    const filter = this.adjustmentFilter();
    const items = this.adjustments();
    if (filter === 'all') return items;
    return items.filter(a => a.type === filter);
  });

  readonly filteredAlerts = computed(() => {
    const filter = this.alertFilter();
    const showResolved = this.showResolvedAlerts();
    let items = this.alerts();
    if (!showResolved) {
      items = items.filter(a => !a.acknowledged);
    }
    if (filter === 'all') return items;
    return items.filter(a => a.alertType === filter);
  });

  readonly activeCount = computed(() => {
    const id = this.activeCountId();
    if (!id) return null;
    return this.activeCounts().find(c => c.id === id) ?? null;
  });

  readonly receiveTransferRecord = computed(() => {
    const id = this.receiveTransferId();
    if (!id) return null;
    return this.transfers().find(t => t.id === id) ?? null;
  });

  readonly fifoFilteredStock = computed(() => {
    const query = this.fifoItemSearch().toLowerCase();
    if (!query) return this.stock().slice(0, 20);
    return this.stock().filter(s =>
      s.itemName.toLowerCase().includes(query) ||
      (s.sku?.toLowerCase().includes(query))
    ).slice(0, 20);
  });

  readonly fifoTotalValue = computed(() =>
    this.costLayers().reduce((sum, l) => sum + (l.quantityRemaining * l.costPerUnit), 0)
  );

  readonly fifoTotalUnits = computed(() =>
    this.costLayers().reduce((sum, l) => sum + l.quantityRemaining, 0)
  );

  readonly fifoWeightedAvgCost = computed(() => {
    const total = this.fifoTotalUnits();
    if (total === 0) return 0;
    return this.fifoTotalValue() / total;
  });

  readonly labelFilteredStock = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.stock();
    return this.stock().filter(s =>
      s.itemName.toLowerCase().includes(query) ||
      (s.sku?.toLowerCase().includes(query)) ||
      (s.barcode?.toLowerCase().includes(query))
    );
  });

  readonly labelSelectedCount = computed(() => this.labelSelectedItems().size);

  readonly agingTotalValue = computed(() =>
    this.agingBuckets().reduce((sum, b) => sum + b.totalValue, 0)
  );

  readonly agingTotalItems = computed(() =>
    this.agingBuckets().reduce((sum, b) => sum + b.itemCount, 0)
  );

  readonly sellThroughAvgRate = computed(() => {
    const data = this.sellThroughData();
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.sellThroughRate, 0) / data.length;
  });

  readonly shrinkageTotalVariance = computed(() =>
    this.shrinkageData().reduce((sum, d) => sum + d.varianceValue, 0)
  );

  readonly adjustmentTypeLabels = ADJUSTMENT_TYPE_LABELS;
  readonly alertTypeLabels = ALERT_TYPE_LABELS;

  readonly adjustmentTypes: StockAdjustmentType[] = [
    'received', 'recount', 'damage', 'theft', 'loss', 'return',
    'transfer_in', 'transfer_out', 'sale', 'correction',
  ];

  readonly alertTypes: StockAlertType[] = [
    'low_stock', 'out_of_stock', 'overstock', 'expiring',
  ];

  ngOnInit(): void {
    this.inventoryService.loadStock();
    this.inventoryService.loadStockAlerts();
  }

  setTab(tab: InventoryTab): void {
    this.activeTab.set(tab);
    if (tab === 'adjustments' && this.adjustments().length === 0) {
      this.inventoryService.loadAdjustmentHistory();
    }
    if (tab === 'transfers' && this.transfers().length === 0) {
      this.inventoryService.loadTransfers();
    }
    if (tab === 'counts' && this.activeCounts().length === 0) {
      this.inventoryService.loadCountHistory();
    }
    if (tab === 'reports' && this.agingBuckets().length === 0) {
      this.loadAgingReport();
    }
  }

  updateSearch(value: string): void {
    this.searchQuery.set(value);
  }

  // --- Overview: Quick Adjust ---

  openQuickAdjust(record: RetailStockRecord): void {
    this.adjustItemId.set(record.itemId);
    this.adjustVariationId.set(record.variationId);
    this.adjustType.set('received');
    this.adjustQuantity.set(0);
    this.adjustReason.set('');
    this.adjustNote.set('');
    this.adjustCostPerUnit.set(null);
    this.showAdjustModal.set(true);
  }

  closeAdjustModal(): void {
    this.showAdjustModal.set(false);
  }

  updateAdjustType(value: string): void {
    this.adjustType.set(value as StockAdjustmentType);
  }

  updateAdjustQuantity(value: string): void {
    this.adjustQuantity.set(Number.parseInt(value, 10) || 0);
  }

  updateAdjustReason(value: string): void {
    this.adjustReason.set(value);
  }

  updateAdjustNote(value: string): void {
    this.adjustNote.set(value);
  }

  updateAdjustCost(value: string): void {
    this.adjustCostPerUnit.set(value ? Number.parseFloat(value) : null);
  }

  async submitAdjustment(): Promise<void> {
    const formData: StockAdjustmentFormData = {
      itemId: this.adjustItemId(),
      variationId: this.adjustVariationId(),
      type: this.adjustType(),
      quantity: this.adjustQuantity(),
      reason: this.adjustReason(),
      note: this.adjustNote(),
      costPerUnit: this.adjustCostPerUnit(),
    };
    const result = await this.inventoryService.adjustStock(formData);
    if (result) {
      this.showAdjustModal.set(false);
    }
  }

  // --- Adjustments ---

  setAdjustmentFilter(filter: string): void {
    this.adjustmentFilter.set(filter as AdjustmentFilterType);
  }

  // --- Transfers ---

  openTransferModal(): void {
    this.transferFromLocation.set('');
    this.transferToLocation.set('');
    this.transferNote.set('');
    this.transferItems.set([{ itemId: '', variationId: null, quantity: 1 }]);
    this.showTransferModal.set(true);
  }

  closeTransferModal(): void {
    this.showTransferModal.set(false);
  }

  updateTransferFrom(value: string): void {
    this.transferFromLocation.set(value);
  }

  updateTransferTo(value: string): void {
    this.transferToLocation.set(value);
  }

  updateTransferNote(value: string): void {
    this.transferNote.set(value);
  }

  addTransferItem(): void {
    this.transferItems.update(items => [...items, { itemId: '', variationId: null, quantity: 1 }]);
  }

  removeTransferItem(index: number): void {
    this.transferItems.update(items => items.filter((_, i) => i !== index));
  }

  updateTransferItemId(index: number, value: string): void {
    this.transferItems.update(items => items.map((item, i) =>
      i === index ? { ...item, itemId: value } : item
    ));
  }

  updateTransferItemQty(index: number, value: string): void {
    this.transferItems.update(items => items.map((item, i) =>
      i === index ? { ...item, quantity: Number.parseInt(value, 10) || 1 } : item
    ));
  }

  async submitTransfer(): Promise<void> {
    const formData: StockTransferFormData = {
      fromLocationId: this.transferFromLocation(),
      toLocationId: this.transferToLocation(),
      items: this.transferItems().filter(i => i.itemId),
      note: this.transferNote(),
    };
    const result = await this.inventoryService.createTransfer(formData);
    if (result) {
      this.showTransferModal.set(false);
    }
  }

  openReceiveModal(transfer: StockTransfer): void {
    this.receiveTransferId.set(transfer.id);
    this.showReceiveModal.set(true);
  }

  closeReceiveModal(): void {
    this.showReceiveModal.set(false);
    this.receiveTransferId.set(null);
  }

  async receiveTransfer(transferId: string, items: { itemId: string; variationId: string | null; receivedQuantity: number }[]): Promise<void> {
    await this.inventoryService.receiveTransfer(transferId, items);
    this.closeReceiveModal();
  }

  async cancelTransfer(transferId: string): Promise<void> {
    await this.inventoryService.cancelTransfer(transferId);
  }

  getTransferStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'badge-warning';
      case 'in_transit': return 'badge-info';
      case 'partial': return 'badge-amber';
      case 'received': return 'badge-success';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  // --- Counts ---

  openStartCountModal(): void {
    this.countType.set('full');
    this.countCategoryId.set('');
    this.showStartCountModal.set(true);
  }

  closeStartCountModal(): void {
    this.showStartCountModal.set(false);
  }

  updateCountType(value: string): void {
    this.countType.set(value as 'full' | 'cycle');
  }

  updateCountCategory(value: string): void {
    this.countCategoryId.set(value);
  }

  async startCount(): Promise<void> {
    const type = this.countType();
    let count: RetailCycleCount | null = null;
    if (type === 'full') {
      count = await this.inventoryService.startFullCount();
    } else {
      count = await this.inventoryService.startCycleCount(this.countCategoryId());
    }
    if (count) {
      this.activeCountId.set(count.id);
      this.showStartCountModal.set(false);
    }
  }

  selectCount(countId: string): void {
    this.activeCountId.set(countId);
  }

  async submitCountEntry(countId: string, itemId: string, variationId: string | null, countedQuantity: number): Promise<void> {
    await this.inventoryService.submitCountEntry(countId, { itemId, variationId, countedQuantity });
  }

  async completeCount(countId: string): Promise<void> {
    await this.inventoryService.completeCount(countId);
  }

  getCountStatusClass(status: string): string {
    switch (status) {
      case 'in_progress': return 'badge-info';
      case 'submitted': return 'badge-warning';
      case 'approved': return 'badge-success';
      default: return 'badge-secondary';
    }
  }

  // --- Alerts ---

  setAlertFilter(filter: string): void {
    this.alertFilter.set(filter as AlertFilterType);
  }

  toggleShowResolved(): void {
    this.showResolvedAlerts.update(v => !v);
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    await this.inventoryService.acknowledgeAlert(alertId);
  }

  getAlertIcon(type: StockAlertType): string {
    switch (type) {
      case 'low_stock': return 'bi-exclamation-triangle';
      case 'out_of_stock': return 'bi-x-circle';
      case 'overstock': return 'bi-box-seam';
      case 'expiring': return 'bi-clock-history';
      default: return 'bi-bell';
    }
  }

  getAlertClass(type: StockAlertType): string {
    switch (type) {
      case 'low_stock': return 'alert-warning';
      case 'out_of_stock': return 'alert-danger';
      case 'overstock': return 'alert-info';
      case 'expiring': return 'alert-amber';
      default: return 'alert-secondary';
    }
  }

  getStockBadgeClass(record: RetailStockRecord): string {
    if (record.quantityAvailable <= 0) return 'badge-danger';
    if (record.quantityAvailable <= record.lowStockThreshold) return 'badge-warning';
    return 'badge-success';
  }

  getStockBadgeLabel(record: RetailStockRecord): string {
    if (record.quantityAvailable <= 0) return 'Out of Stock';
    if (record.quantityAvailable <= record.lowStockThreshold) return 'Low Stock';
    return 'In Stock';
  }

  // --- FIFO ---

  updateFifoSearch(value: string): void {
    this.fifoItemSearch.set(value);
  }

  selectFifoItem(itemId: string): void {
    this.fifoItemId.set(itemId);
    this.inventoryService.loadCostLayers(itemId);
  }

  getCostLayerSourceLabel(type: string): string {
    switch (type) {
      case 'purchase_order': return 'Purchase Order';
      case 'adjustment': return 'Adjustment';
      case 'return': return 'Return';
      default: return type;
    }
  }

  // --- Labels ---

  updateLabelSize(value: string): void {
    this.labelSize.set(value as LabelSize);
  }

  updateLabelQuantity(value: string): void {
    this.labelQuantity.set(Number.parseInt(value, 10) || 1);
  }

  toggleLabelShowName(): void { this.labelShowName.update(v => !v); }
  toggleLabelShowVariation(): void { this.labelShowVariation.update(v => !v); }
  toggleLabelShowPrice(): void { this.labelShowPrice.update(v => !v); }
  toggleLabelShowBarcode(): void { this.labelShowBarcode.update(v => !v); }
  toggleLabelShowSku(): void { this.labelShowSku.update(v => !v); }

  toggleLabelItem(recordId: string): void {
    this.labelSelectedItems.update(set => {
      const next = new Set(set);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return next;
    });
  }

  selectAllLabelItems(): void {
    const allIds = this.labelFilteredStock().map(s => s.id);
    this.labelSelectedItems.set(new Set(allIds));
  }

  deselectAllLabelItems(): void {
    this.labelSelectedItems.set(new Set());
  }

  isLabelItemSelected(recordId: string): boolean {
    return this.labelSelectedItems().has(recordId);
  }

  async printLabels(): Promise<void> {
    const selected = this.labelSelectedItems();
    if (selected.size === 0) return;

    this.isPrinting.set(true);

    const items = this.stock()
      .filter(s => selected.has(s.id))
      .map(s => ({ itemId: s.itemId, variationId: s.variationId, quantity: this.labelQuantity() }));

    const template: LabelTemplate = {
      size: this.labelSize(),
      showItemName: this.labelShowName(),
      showVariationName: this.labelShowVariation(),
      showPrice: this.labelShowPrice(),
      showBarcode: this.labelShowBarcode(),
      showSku: this.labelShowSku(),
    };

    const job: LabelPrintJob = { items, template };
    const blob = await this.inventoryService.printLabels(job);

    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `labels-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }

    this.isPrinting.set(false);
  }

  getLabelSizeLabel(size: LabelSize): string {
    switch (size) {
      case 'small': return 'Small (1" × 0.5")';
      case 'standard': return 'Standard (2" × 1")';
      case 'shelf': return 'Shelf (3" × 1.25")';
      default: return size;
    }
  }

  // --- Reports ---

  setReportView(view: string): void {
    this.reportView.set(view as ReportView);
    if (view === 'aging' && this.agingBuckets().length === 0) {
      this.loadAgingReport();
    }
    if (view === 'sell-through' && this.sellThroughData().length === 0) {
      this.loadSellThroughReport();
    }
    if (view === 'shrinkage' && this.shrinkageData().length === 0) {
      this.loadShrinkageReport();
    }
  }

  updateReportDateFrom(value: string): void {
    this.reportDateFrom.set(value);
  }

  updateReportDateTo(value: string): void {
    this.reportDateTo.set(value);
  }

  async loadAgingReport(): Promise<void> {
    this.isLoadingReport.set(true);
    const data = await this.inventoryService.getAgingReport();
    this.agingBuckets.set(data);
    this.isLoadingReport.set(false);
  }

  async loadSellThroughReport(): Promise<void> {
    this.isLoadingReport.set(true);
    const from = this.reportDateFrom() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = this.reportDateTo() || new Date().toISOString().split('T')[0];
    const data = await this.inventoryService.getSellThroughReport({ from, to });
    this.sellThroughData.set(data);
    this.isLoadingReport.set(false);
  }

  async loadShrinkageReport(): Promise<void> {
    this.isLoadingReport.set(true);
    const data = await this.inventoryService.getShrinkageReport();
    this.shrinkageData.set(data);
    this.isLoadingReport.set(false);
  }

  getBenchmarkClass(benchmark: string): string {
    switch (benchmark) {
      case 'good': return 'benchmark-good';
      case 'average': return 'benchmark-avg';
      case 'slow': return 'benchmark-slow';
      default: return '';
    }
  }

  getAgingBucketClass(index: number): string {
    switch (index) {
      case 0: return 'aging-fresh';
      case 1: return 'aging-aging';
      case 2: return 'aging-stale';
      case 3: return 'aging-dead';
      default: return '';
    }
  }
}
