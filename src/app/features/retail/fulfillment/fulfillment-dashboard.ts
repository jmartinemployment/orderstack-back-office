import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import { RetailEcommerceService } from '../../../services/retail-ecommerce';
import {
  EcommerceOrder,
  EcommerceFulfillmentStatus,
  FulfillmentDashboardTab,
} from '../../../models/retail-ecommerce.model';

@Component({
  selector: 'os-fulfillment-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, LoadingSpinner],
  templateUrl: './fulfillment-dashboard.html',
  styleUrls: ['./fulfillment-dashboard.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FulfillmentDashboard implements OnInit {
  private readonly ecommerceService = inject(RetailEcommerceService);

  readonly isLoading = this.ecommerceService.isLoadingOrders;
  readonly orders = this.ecommerceService.orders;

  // Tab
  private readonly _activeTab = signal<FulfillmentDashboardTab>('pending');
  readonly activeTab = this._activeTab.asReadonly();

  // Counts
  readonly pendingCount = computed(() =>
    this.orders().filter(o => o.fulfillmentStatus === 'pending').length,
  );
  readonly processingCount = computed(() =>
    this.orders().filter(o => o.fulfillmentStatus === 'processing').length,
  );
  readonly pickupCount = computed(() =>
    this.orders().filter(o => o.fulfillmentStatus === 'ready_for_pickup').length,
  );
  readonly shippedCount = computed(() =>
    this.orders().filter(o => o.fulfillmentStatus === 'shipped' || o.fulfillmentStatus === 'out_for_delivery').length,
  );
  readonly completedCount = computed(() =>
    this.orders().filter(o => o.fulfillmentStatus === 'delivered' || o.fulfillmentStatus === 'cancelled').length,
  );

  // Filtered orders for current tab
  readonly filteredOrders = computed(() => {
    const tab = this._activeTab();
    const all = this.orders();
    switch (tab) {
      case 'pending':
        return all.filter(o => o.fulfillmentStatus === 'pending');
      case 'processing':
        return all.filter(o => o.fulfillmentStatus === 'processing');
      case 'pickup':
        return all.filter(o => o.fulfillmentStatus === 'ready_for_pickup');
      case 'shipped':
        return all.filter(o => o.fulfillmentStatus === 'shipped' || o.fulfillmentStatus === 'out_for_delivery');
      case 'completed':
        return all.filter(o => o.fulfillmentStatus === 'delivered' || o.fulfillmentStatus === 'cancelled');
      default:
        return all;
    }
  });

  // Selected order for detail
  private readonly _selectedOrderId = signal<string | null>(null);
  readonly selectedOrder = computed<EcommerceOrder | null>(() => {
    const id = this._selectedOrderId();
    if (!id) return null;
    return this.orders().find(o => o.id === id) ?? null;
  });

  // Tracking input
  readonly trackingInput = signal('');

  // Processing state
  private readonly _isProcessing = signal(false);
  readonly isProcessing = this._isProcessing.asReadonly();

  ngOnInit(): void {
    this.ecommerceService.loadOrders();
  }

  setTab(tab: FulfillmentDashboardTab): void {
    this._activeTab.set(tab);
  }

  selectOrder(order: EcommerceOrder): void {
    this._selectedOrderId.set(order.id);
    this.trackingInput.set(order.trackingNumber ?? '');
  }

  closeDetail(): void {
    this._selectedOrderId.set(null);
  }

  async startProcessing(orderId: string): Promise<void> {
    this._isProcessing.set(true);
    await this.ecommerceService.updateFulfillmentStatus(orderId, 'processing');
    this._isProcessing.set(false);
  }

  async markReadyForPickup(orderId: string): Promise<void> {
    this._isProcessing.set(true);
    await this.ecommerceService.markReadyForPickup(orderId);
    this._isProcessing.set(false);
  }

  async markShipped(orderId: string): Promise<void> {
    this._isProcessing.set(true);
    const tracking = this.trackingInput();
    await this.ecommerceService.markShipped(orderId, tracking || undefined);
    this._isProcessing.set(false);
  }

  async markOutForDelivery(orderId: string): Promise<void> {
    this._isProcessing.set(true);
    await this.ecommerceService.updateFulfillmentStatus(orderId, 'out_for_delivery');
    this._isProcessing.set(false);
  }

  async markDelivered(orderId: string): Promise<void> {
    this._isProcessing.set(true);
    await this.ecommerceService.markDelivered(orderId);
    this._isProcessing.set(false);
  }

  async cancelOrder(orderId: string): Promise<void> {
    this._isProcessing.set(true);
    await this.ecommerceService.updateFulfillmentStatus(orderId, 'cancelled');
    this._isProcessing.set(false);
  }

  getStatusLabel(status: EcommerceFulfillmentStatus): string {
    const labels: Record<EcommerceFulfillmentStatus, string> = {
      pending: 'Pending',
      processing: 'Processing',
      ready_for_pickup: 'Ready for Pickup',
      shipped: 'Shipped',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return labels[status] ?? status;
  }

  getStatusClass(status: EcommerceFulfillmentStatus): string {
    const classes: Record<EcommerceFulfillmentStatus, string> = {
      pending: 'badge-pending',
      processing: 'badge-processing',
      ready_for_pickup: 'badge-pickup',
      shipped: 'badge-shipped',
      out_for_delivery: 'badge-delivery',
      delivered: 'badge-delivered',
      cancelled: 'badge-cancelled',
    };
    return classes[status] ?? '';
  }

  getFulfillmentIcon(type: string): string {
    const icons: Record<string, string> = {
      ship: 'bi-truck',
      pickup: 'bi-shop',
      curbside: 'bi-car-front',
      local_delivery: 'bi-bicycle',
    };
    return icons[type] ?? 'bi-box';
  }

  getFulfillmentLabel(type: string): string {
    const labels: Record<string, string> = {
      ship: 'Ship',
      pickup: 'Pickup',
      curbside: 'Curbside',
      local_delivery: 'Local Delivery',
    };
    return labels[type] ?? type;
  }

  getTimeSince(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const minutes = Math.floor((now - then) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
}
