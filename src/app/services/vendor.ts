import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Vendor,
  VendorFormData,
  PurchaseInvoice,
  PurchaseInvoiceFormData,
  PurchaseInvoiceStatus,
  IngredientPriceHistory,
  PurchaseOrder,
  PurchaseOrderFormData,
  PurchaseOrderStatus,
} from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class VendorService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _vendors = signal<Vendor[]>([]);
  private readonly _invoices = signal<PurchaseInvoice[]>([]);
  private readonly _priceHistory = signal<IngredientPriceHistory[]>([]);
  private readonly _purchaseOrders = signal<PurchaseOrder[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _isUploading = signal(false);

  readonly vendors = this._vendors.asReadonly();
  readonly invoices = this._invoices.asReadonly();
  readonly priceHistory = this._priceHistory.asReadonly();
  readonly purchaseOrders = this._purchaseOrders.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isUploading = this._isUploading.asReadonly();

  readonly activeVendors = computed(() =>
    this._vendors().filter(v => v.isActive)
  );

  readonly invoicesByStatus = computed(() => {
    const map = new Map<PurchaseInvoiceStatus, PurchaseInvoice[]>();
    for (const inv of this._invoices()) {
      const list = map.get(inv.status) ?? [];
      list.push(inv);
      map.set(inv.status, list);
    }
    return map;
  });

  readonly pendingInvoiceCount = computed(() =>
    this._invoices().filter(i => i.status === 'pending_review').length
  );

  readonly purchaseOrdersByStatus = computed(() => {
    const map = new Map<PurchaseOrderStatus, PurchaseOrder[]>();
    for (const po of this._purchaseOrders()) {
      const list = map.get(po.status) ?? [];
      list.push(po);
      map.set(po.status, list);
    }
    return map;
  });

  readonly draftPOCount = computed(() =>
    this._purchaseOrders().filter(po => po.status === 'draft').length
  );

  readonly openPOCount = computed(() =>
    this._purchaseOrders().filter(po =>
      po.status === 'submitted' || po.status === 'partially_received'
    ).length
  );

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  // ── Vendors ──

  async loadVendors(): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const vendors = await firstValueFrom(
        this.http.get<Vendor[]>(`${this.apiUrl}/merchant/${this.merchantId}/vendors`)
      );
      this._vendors.set(vendors);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load vendors';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async createVendor(data: VendorFormData): Promise<Vendor | null> {
    if (!this.merchantId) return null;
    this._error.set(null);
    try {
      const vendor = await firstValueFrom(
        this.http.post<Vendor>(`${this.apiUrl}/merchant/${this.merchantId}/vendors`, data)
      );
      this._vendors.update(list => [...list, vendor]);
      return vendor;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create vendor';
      this._error.set(message);
      return null;
    }
  }

  async updateVendor(id: string, data: Partial<VendorFormData> & { isActive?: boolean }): Promise<void> {
    if (!this.merchantId) return;
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<Vendor>(`${this.apiUrl}/merchant/${this.merchantId}/vendors/${id}`, data)
      );
      this._vendors.update(list => list.map(v => v.id === id ? updated : v));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update vendor';
      this._error.set(message);
    }
  }

  async deleteVendor(id: string): Promise<void> {
    if (!this.merchantId) return;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/merchant/${this.merchantId}/vendors/${id}`)
      );
      this._vendors.update(list => list.filter(v => v.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete vendor';
      this._error.set(message);
    }
  }

  // ── Invoices ──

  async loadInvoices(): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const invoices = await firstValueFrom(
        this.http.get<PurchaseInvoice[]>(`${this.apiUrl}/merchant/${this.merchantId}/purchase-invoices`)
      );
      this._invoices.set(invoices);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load invoices';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async uploadInvoice(file: File): Promise<PurchaseInvoice | null> {
    if (!this.merchantId) return null;
    this._isUploading.set(true);
    this._error.set(null);
    try {
      const formData = new FormData();
      formData.append('invoice', file);
      const invoice = await firstValueFrom(
        this.http.post<PurchaseInvoice>(
          `${this.apiUrl}/merchant/${this.merchantId}/purchase-invoices/upload`,
          formData
        )
      );
      this._invoices.update(list => [invoice, ...list]);
      return invoice;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload invoice';
      this._error.set(message);
      return null;
    } finally {
      this._isUploading.set(false);
    }
  }

  async createInvoice(data: PurchaseInvoiceFormData): Promise<PurchaseInvoice | null> {
    if (!this.merchantId) return null;
    this._error.set(null);
    try {
      const invoice = await firstValueFrom(
        this.http.post<PurchaseInvoice>(
          `${this.apiUrl}/merchant/${this.merchantId}/purchase-invoices`,
          data
        )
      );
      this._invoices.update(list => [invoice, ...list]);
      return invoice;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create invoice';
      this._error.set(message);
      return null;
    }
  }

  async approveInvoice(id: string): Promise<void> {
    if (!this.merchantId) return;
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<PurchaseInvoice>(
          `${this.apiUrl}/merchant/${this.merchantId}/purchase-invoices/${id}/approve`,
          {}
        )
      );
      this._invoices.update(list => list.map(i => i.id === id ? updated : i));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve invoice';
      this._error.set(message);
    }
  }

  async markInvoicePaid(id: string): Promise<void> {
    if (!this.merchantId) return;
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<PurchaseInvoice>(
          `${this.apiUrl}/merchant/${this.merchantId}/purchase-invoices/${id}/paid`,
          {}
        )
      );
      this._invoices.update(list => list.map(i => i.id === id ? updated : i));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark invoice as paid';
      this._error.set(message);
    }
  }

  async deleteInvoice(id: string): Promise<void> {
    if (!this.merchantId) return;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/merchant/${this.merchantId}/purchase-invoices/${id}`)
      );
      this._invoices.update(list => list.filter(i => i.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete invoice';
      this._error.set(message);
    }
  }

  async loadPriceHistory(ingredientName?: string): Promise<void> {
    if (!this.merchantId) return;
    this._error.set(null);
    try {
      const params: Record<string, string> = {};
      if (ingredientName) params['ingredient'] = ingredientName;
      const history = await firstValueFrom(
        this.http.get<IngredientPriceHistory[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/purchase-invoices/price-history`,
          { params }
        )
      );
      this._priceHistory.set(history);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load price history';
      this._error.set(message);
    }
  }

  // ── Purchase Orders ──

  async loadPurchaseOrders(): Promise<void> {
    if (!this.merchantId) return;
    this._error.set(null);
    try {
      const data = await firstValueFrom(
        this.http.get<PurchaseOrder[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/purchase-orders`
        )
      );
      this._purchaseOrders.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load purchase orders';
      this._error.set(message);
    }
  }

  async createPurchaseOrder(data: PurchaseOrderFormData): Promise<PurchaseOrder | null> {
    if (!this.merchantId) return null;
    this._error.set(null);
    try {
      const po = await firstValueFrom(
        this.http.post<PurchaseOrder>(
          `${this.apiUrl}/merchant/${this.merchantId}/purchase-orders`,
          data
        )
      );
      this._purchaseOrders.update(list => [po, ...list]);
      return po;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create purchase order';
      this._error.set(message);
      return null;
    }
  }

  async submitPurchaseOrder(poId: string): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<PurchaseOrder>(
          `${this.apiUrl}/merchant/${this.merchantId}/purchase-orders/${poId}/submit`,
          {}
        )
      );
      this._purchaseOrders.update(list => list.map(po => po.id === poId ? updated : po));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit purchase order';
      this._error.set(message);
      return false;
    }
  }

  async receivePurchaseOrder(poId: string, receivedItems: { inventoryItemId: string; receivedQuantity: number }[]): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<PurchaseOrder>(
          `${this.apiUrl}/merchant/${this.merchantId}/purchase-orders/${poId}/receive`,
          { receivedItems }
        )
      );
      this._purchaseOrders.update(list => list.map(po => po.id === poId ? updated : po));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to receive purchase order';
      this._error.set(message);
      return false;
    }
  }

  async cancelPurchaseOrder(poId: string): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<PurchaseOrder>(
          `${this.apiUrl}/merchant/${this.merchantId}/purchase-orders/${poId}/cancel`,
          {}
        )
      );
      this._purchaseOrders.update(list => list.map(po => po.id === poId ? updated : po));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel purchase order';
      this._error.set(message);
      return false;
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
