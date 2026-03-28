import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VendorService } from '../../../services/vendor';
import { RetailCatalogService } from '../../../services/retail-catalog';
import { RetailInventoryService } from '../../../services/retail-inventory';
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchaseOrderFormData,
} from '../../../models/vendor.model';

type POTab = 'all' | 'draft' | 'submitted' | 'partially_received' | 'received' | 'cancelled';

@Component({
  selector: 'os-retail-purchase-orders',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, TitleCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './purchase-orders.html',
  styleUrl: './purchase-orders.scss',
})
export class RetailPurchaseOrders implements OnInit {
  private readonly vendorService = inject(VendorService);
  readonly catalogService = inject(RetailCatalogService);
  private readonly inventoryService = inject(RetailInventoryService);

  readonly purchaseOrders = this.vendorService.purchaseOrders;
  readonly vendors = this.vendorService.vendors;
  readonly isLoading = this.vendorService.isLoading;
  readonly error = this.vendorService.error;
  readonly stock = this.inventoryService.stock;

  // UI
  readonly activeFilter = signal<POTab>('all');
  readonly showCreateModal = signal(false);
  readonly expandedPOId = signal<string | null>(null);
  readonly showReceiveModal = signal(false);
  readonly receivePOId = signal<string | null>(null);

  // Create form
  readonly formVendorId = signal('');
  readonly formExpectedDate = signal('');
  readonly formNotes = signal('');
  readonly formLineItems = signal<{ inventoryItemId: string; itemName: string; quantity: number; unitCost: number }[]>([]);

  // Receive form
  readonly receiveItems = signal<{ inventoryItemId: string; receivedQuantity: number }[]>([]);

  readonly filteredOrders = computed(() => {
    const filter = this.activeFilter();
    const orders = this.purchaseOrders();
    if (filter === 'all') return orders;
    return orders.filter(po => po.status === filter);
  });

  readonly orderCountByStatus = computed(() => {
    const orders = this.purchaseOrders();
    return {
      all: orders.length,
      draft: orders.filter(po => po.status === 'draft').length,
      submitted: orders.filter(po => po.status === 'submitted').length,
      partially_received: orders.filter(po => po.status === 'partially_received').length,
      received: orders.filter(po => po.status === 'received').length,
      cancelled: orders.filter(po => po.status === 'cancelled').length,
    };
  });

  readonly totalOpenValue = computed(() =>
    this.purchaseOrders()
      .filter(po => po.status === 'submitted' || po.status === 'partially_received')
      .reduce((sum, po) => sum + po.total, 0)
  );

  readonly receivePO = computed(() => {
    const id = this.receivePOId();
    if (!id) return null;
    return this.purchaseOrders().find(po => po.id === id) ?? null;
  });

  readonly statusFilters: { label: string; value: POTab }[] = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Partial', value: 'partially_received' },
    { label: 'Received', value: 'received' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  ngOnInit(): void {
    this.vendorService.loadPurchaseOrders();
    this.vendorService.loadVendors();
    this.catalogService.loadItems();
  }

  setFilter(filter: POTab): void {
    this.activeFilter.set(filter);
  }

  toggleExpanded(poId: string): void {
    this.expandedPOId.update(id => id === poId ? null : poId);
  }

  getStatusClass(status: PurchaseOrderStatus): string {
    switch (status) {
      case 'draft': return 'badge-secondary';
      case 'submitted': return 'badge-info';
      case 'partially_received': return 'badge-warning';
      case 'received': return 'badge-success';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  getVendorName(vendorId: string): string {
    return this.vendors().find(v => v.id === vendorId)?.name ?? 'Unknown';
  }

  // --- Create PO ---

  openCreateModal(): void {
    this.formVendorId.set('');
    this.formExpectedDate.set('');
    this.formNotes.set('');
    this.formLineItems.set([{ inventoryItemId: '', itemName: '', quantity: 1, unitCost: 0 }]);
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  updateFormVendor(value: string): void { this.formVendorId.set(value); }
  updateFormDate(value: string): void { this.formExpectedDate.set(value); }
  updateFormNotes(value: string): void { this.formNotes.set(value); }

  addLineItem(): void {
    this.formLineItems.update(items => [...items, { inventoryItemId: '', itemName: '', quantity: 1, unitCost: 0 }]);
  }

  removeLineItem(index: number): void {
    this.formLineItems.update(items => items.filter((_, i) => i !== index));
  }

  updateLineItemId(index: number, value: string): void {
    const item = this.catalogService.items().find(i => i.id === value);
    this.formLineItems.update(items => items.map((li, i) =>
      i === index ? { ...li, inventoryItemId: value, itemName: item?.name ?? '' } : li
    ));
  }

  updateLineItemQty(index: number, value: string): void {
    this.formLineItems.update(items => items.map((li, i) =>
      i === index ? { ...li, quantity: Number.parseInt(value, 10) || 1 } : li
    ));
  }

  updateLineItemCost(index: number, value: string): void {
    this.formLineItems.update(items => items.map((li, i) =>
      i === index ? { ...li, unitCost: Number.parseFloat(value) || 0 } : li
    ));
  }

  getFormTotal(): number {
    return this.formLineItems().reduce((sum, li) => sum + (li.quantity * li.unitCost), 0);
  }

  async createPO(): Promise<void> {
    const formData: PurchaseOrderFormData = {
      vendorId: this.formVendorId(),
      expectedDeliveryDate: this.formExpectedDate() || null,
      notes: this.formNotes() || null,
      lineItems: this.formLineItems()
        .filter(li => li.inventoryItemId)
        .map(li => ({
          inventoryItemId: li.inventoryItemId,
          itemName: li.itemName,
          quantity: li.quantity,
          unitCost: li.unitCost,
        })),
    };
    const result = await this.vendorService.createPurchaseOrder(formData);
    if (result) {
      this.showCreateModal.set(false);
    }
  }

  // --- PO Actions ---

  async submitPO(poId: string): Promise<void> {
    await this.vendorService.submitPurchaseOrder(poId);
  }

  async cancelPO(poId: string): Promise<void> {
    await this.vendorService.cancelPurchaseOrder(poId);
  }

  // --- Receive ---

  openReceiveModal(po: PurchaseOrder): void {
    this.receivePOId.set(po.id);
    this.receiveItems.set(
      po.lineItems.map(li => ({
        inventoryItemId: li.inventoryItemId,
        receivedQuantity: li.quantity - (li.receivedQuantity ?? 0),
      }))
    );
    this.showReceiveModal.set(true);
  }

  closeReceiveModal(): void {
    this.showReceiveModal.set(false);
    this.receivePOId.set(null);
  }

  updateReceiveQty(index: number, value: string): void {
    this.receiveItems.update(items => items.map((item, i) =>
      i === index ? { ...item, receivedQuantity: Number.parseInt(value, 10) || 0 } : item
    ));
  }

  async submitReceive(): Promise<void> {
    const poId = this.receivePOId();
    if (!poId) return;
    const result = await this.vendorService.receivePurchaseOrder(poId, this.receiveItems());
    if (result) {
      // Also update retail inventory stock
      const po = this.purchaseOrders().find(p => p.id === poId);
      if (po) {
        for (const item of this.receiveItems()) {
          if (item.receivedQuantity > 0) {
            await this.inventoryService.adjustStock({
              itemId: item.inventoryItemId,
              variationId: null,
              type: 'received',
              quantity: item.receivedQuantity,
              reason: 'PO Receiving',
              note: `PO ${po.id}`,
              costPerUnit: null,
            });
          }
        }
      }
      this.closeReceiveModal();
    }
  }
}
