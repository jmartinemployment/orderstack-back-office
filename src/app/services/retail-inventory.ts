import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  RetailStockRecord,
  StockAdjustment,
  StockAdjustmentFormData,
  StockTransfer,
  StockTransferFormData,
  StockAlert,
  RetailCycleCount,
  CostLayer,
  LabelPrintJob,
  InventoryAgingBucket,
  SellThroughReport,
  ShrinkageReport,
} from '../models/retail-inventory.model';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RetailInventoryService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  // Stock
  private readonly _stock = signal<RetailStockRecord[]>([]);
  private readonly _adjustments = signal<StockAdjustment[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Alerts
  private readonly _alerts = signal<StockAlert[]>([]);

  // Transfers
  private readonly _transfers = signal<StockTransfer[]>([]);

  // Counts
  private readonly _activeCounts = signal<RetailCycleCount[]>([]);

  // Cost layers (FIFO)
  private readonly _costLayers = signal<CostLayer[]>([]);

  // Public readonly
  readonly stock = this._stock.asReadonly();
  readonly adjustments = this._adjustments.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly alerts = this._alerts.asReadonly();
  readonly transfers = this._transfers.asReadonly();
  readonly activeCounts = this._activeCounts.asReadonly();
  readonly costLayers = this._costLayers.asReadonly();

  // Computed
  readonly lowStockItems = computed(() =>
    this._stock().filter(s => s.quantityAvailable <= s.lowStockThreshold && s.quantityAvailable > 0)
  );

  readonly outOfStockItems = computed(() =>
    this._stock().filter(s => s.quantityAvailable <= 0)
  );

  readonly totalStockValue = computed(() =>
    this._stock().reduce((sum, s) => sum + s.totalStockValue, 0)
  );

  readonly pendingTransfers = computed(() =>
    this._transfers().filter(t => t.status === 'pending' || t.status === 'in_transit')
  );

  readonly unresolvedAlerts = computed(() =>
    this._alerts().filter(a => !a.acknowledged)
  );

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  // --- Stock ---

  async loadStock(): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<RetailStockRecord[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/stock`
        )
      );
      this._stock.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._stock.set([]);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to load stock';
        this._error.set(message);
      }
    } finally {
      this._isLoading.set(false);
    }
  }

  async getStockForItem(itemId: string): Promise<RetailStockRecord[]> {
    return this._stock().filter(s => s.itemId === itemId);
  }

  async adjustStock(formData: StockAdjustmentFormData): Promise<StockAdjustment | null> {
    if (!this.merchantId) return null;

    try {
      const adj = await firstValueFrom(
        this.http.post<StockAdjustment>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/adjust`,
          formData
        )
      );
      this._adjustments.update(list => [adj, ...list]);
      // Update local stock
      this._stock.update(records => records.map(s => {
        if (s.itemId === formData.itemId && s.variationId === formData.variationId) {
          const newQty = s.quantityOnHand + formData.quantity;
          return {
            ...s,
            quantityOnHand: newQty,
            quantityAvailable: newQty - s.quantityReserved,
            totalStockValue: newQty * s.averageCostPerUnit,
          };
        }
        return s;
      }));
      return adj;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to adjust stock';
      this._error.set(message);
      return null;
    }
  }

  async loadAdjustmentHistory(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<StockAdjustment[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/adjustments`
        )
      );
      this._adjustments.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load adjustments';
      this._error.set(message);
    }
  }

  // --- Alerts ---

  async loadStockAlerts(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<StockAlert[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/alerts`
        )
      );
      this._alerts.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._alerts.set([]);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to load alerts';
        this._error.set(message);
      }
    }
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    if (!this.merchantId) return;

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/alerts/${alertId}/acknowledge`,
          {}
        )
      );
      this._alerts.update(alerts => alerts.map(a =>
        a.id === alertId ? { ...a, acknowledged: true } : a
      ));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to acknowledge alert';
      this._error.set(message);
    }
  }

  // --- Transfers ---

  async createTransfer(formData: StockTransferFormData): Promise<StockTransfer | null> {
    if (!this.merchantId) return null;

    try {
      const transfer = await firstValueFrom(
        this.http.post<StockTransfer>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/transfers`,
          formData
        )
      );
      this._transfers.update(list => [transfer, ...list]);
      return transfer;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create transfer';
      this._error.set(message);
      return null;
    }
  }

  async receiveTransfer(transferId: string, receivedItems: { itemId: string; variationId: string | null; receivedQuantity: number }[]): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.post<StockTransfer>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/transfers/${transferId}/receive`,
          { items: receivedItems }
        )
      );
      this._transfers.update(list => list.map(t => t.id === transferId ? updated : t));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to receive transfer';
      this._error.set(message);
      return false;
    }
  }

  async cancelTransfer(transferId: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/transfers/${transferId}/cancel`,
          {}
        )
      );
      this._transfers.update(list => list.map(t =>
        t.id === transferId ? { ...t, status: 'cancelled' as const } : t
      ));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel transfer';
      this._error.set(message);
      return false;
    }
  }

  async loadTransfers(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<StockTransfer[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/transfers`
        )
      );
      this._transfers.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load transfers';
      this._error.set(message);
    }
  }

  // --- Cycle Counts ---

  async startFullCount(): Promise<RetailCycleCount | null> {
    if (!this.merchantId) return null;

    try {
      const count = await firstValueFrom(
        this.http.post<RetailCycleCount>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/counts`,
          { type: 'full' }
        )
      );
      this._activeCounts.update(list => [...list, count]);
      return count;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start count';
      this._error.set(message);
      return null;
    }
  }

  async startCycleCount(categoryId: string): Promise<RetailCycleCount | null> {
    if (!this.merchantId) return null;

    try {
      const count = await firstValueFrom(
        this.http.post<RetailCycleCount>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/counts`,
          { type: 'cycle', categoryId }
        )
      );
      this._activeCounts.update(list => [...list, count]);
      return count;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start cycle count';
      this._error.set(message);
      return null;
    }
  }

  async submitCountEntry(countId: string, entry: { itemId: string; variationId: string | null; countedQuantity: number }): Promise<void> {
    if (!this.merchantId) return;

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/counts/${countId}/entries`,
          entry
        )
      );
      this._activeCounts.update(list => list.map(c => {
        if (c.id !== countId) return c;
        return {
          ...c,
          entries: c.entries.map(e => {
            if (e.itemId === entry.itemId && e.variationId === entry.variationId) {
              return { ...e, countedQuantity: entry.countedQuantity, variance: entry.countedQuantity - e.expectedQuantity };
            }
            return e;
          }),
        };
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit entry';
      this._error.set(message);
    }
  }

  async completeCount(countId: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.post<RetailCycleCount>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/counts/${countId}/complete`,
          {}
        )
      );
      this._activeCounts.update(list => list.map(c => c.id === countId ? updated : c));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete count';
      this._error.set(message);
      return false;
    }
  }

  async loadCountHistory(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<RetailCycleCount[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/counts`
        )
      );
      this._activeCounts.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load counts';
      this._error.set(message);
    }
  }

  // --- FIFO ---

  async loadCostLayers(itemId: string): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<CostLayer[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/items/${itemId}/cost-layers`
        )
      );
      this._costLayers.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load cost layers';
      this._error.set(message);
    }
  }

  // --- Label Printing ---

  async printLabels(job: LabelPrintJob): Promise<Blob | null> {
    if (!this.merchantId) return null;

    try {
      const blob = await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/labels`,
          job,
          { responseType: 'blob' }
        )
      );
      return blob;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate labels';
      this._error.set(message);
      return null;
    }
  }

  // --- Reports ---

  async getAgingReport(): Promise<InventoryAgingBucket[]> {
    if (!this.merchantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<InventoryAgingBucket[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/reports/aging`
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load aging report';
      this._error.set(message);
      return [];
    }
  }

  async getSellThroughReport(dateRange: { from: string; to: string }): Promise<SellThroughReport[]> {
    if (!this.merchantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<SellThroughReport[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/reports/sell-through`,
          { params: dateRange }
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load sell-through';
      this._error.set(message);
      return [];
    }
  }

  async getShrinkageReport(): Promise<ShrinkageReport[]> {
    if (!this.merchantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<ShrinkageReport[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/retail/inventory/reports/shrinkage`
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load shrinkage';
      this._error.set(message);
      return [];
    }
  }
}
