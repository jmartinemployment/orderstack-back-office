import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  InventoryItem,
  InventoryAlert,
  StockPrediction,
  InventoryReport,
  CycleCount,
  CycleCountEntry,
  ExpiringItem,
  UnitConversion,
} from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _report = signal<InventoryReport | null>(null);
  private readonly _items = signal<InventoryItem[]>([]);
  private readonly _alerts = signal<InventoryAlert[]>([]);
  private readonly _predictions = signal<StockPrediction[]>([]);
  private readonly _cycleCounts = signal<CycleCount[]>([]);
  private readonly _activeCycleCount = signal<CycleCount | null>(null);
  private readonly _expiringItems = signal<ExpiringItem[]>([]);
  private readonly _unitConversions = signal<UnitConversion[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _isLoadingAlerts = signal(false);
  private readonly _isLoadingPredictions = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly report = this._report.asReadonly();
  readonly items = this._items.asReadonly();
  readonly alerts = this._alerts.asReadonly();
  readonly predictions = this._predictions.asReadonly();
  readonly cycleCounts = this._cycleCounts.asReadonly();
  readonly activeCycleCount = this._activeCycleCount.asReadonly();
  readonly expiringItems = this._expiringItems.asReadonly();
  readonly unitConversions = this._unitConversions.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  async loadReport(): Promise<void> {
    if (!this.merchantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<InventoryReport>(
          `${this.apiUrl}/merchant/${this.merchantId}/inventory/report`
        )
      );
      this._report.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load inventory report';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadItems(): Promise<void> {
    if (!this.merchantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<InventoryItem[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/inventory`
        )
      );
      this._items.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load inventory items';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadAlerts(): Promise<void> {
    if (!this.merchantId) return;
    if (this._isLoadingAlerts()) return;
    this._isLoadingAlerts.set(true);

    try {
      const data = await firstValueFrom(
        this.http.get<InventoryAlert[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/inventory/alerts`
        )
      );
      this._alerts.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load alerts';
      this._error.set(message);
    } finally {
      this._isLoadingAlerts.set(false);
    }
  }

  async loadPredictions(): Promise<void> {
    if (!this.merchantId) return;
    if (this._isLoadingPredictions()) return;
    this._isLoadingPredictions.set(true);

    try {
      const data = await firstValueFrom(
        this.http.get<StockPrediction[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/inventory/predictions`
        )
      );
      this._predictions.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load predictions';
      this._error.set(message);
    } finally {
      this._isLoadingPredictions.set(false);
    }
  }

  async createItem(data: Partial<InventoryItem>): Promise<InventoryItem | null> {
    if (!this.merchantId) return null;

    try {
      const item = await firstValueFrom(
        this.http.post<InventoryItem>(
          `${this.apiUrl}/merchant/${this.merchantId}/inventory`,
          data
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

  async updateStock(itemId: string, stock: number, reason: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/merchant/${this.merchantId}/inventory/${itemId}/stock`,
          { currentStock: stock, reason }
        )
      );
    } catch (err: unknown) {
      if (!(err instanceof HttpErrorResponse && (err.status === 404 || err.status === 400))) {
        const message = err instanceof Error ? err.message : 'Failed to update stock';
        this._error.set(message);
        return false;
      }
    }
    this._items.update(items =>
      items.map(item => item.id === itemId ? { ...item, currentStock: stock } : item)
    );
    return true;
  }

  async recordUsage(itemId: string, quantity: number, reason: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/inventory/${itemId}/usage`,
          { quantity, reason }
        )
      );
    } catch (err: unknown) {
      if (!(err instanceof HttpErrorResponse && err.status === 404)) {
        const message = err instanceof Error ? err.message : 'Failed to record usage';
        this._error.set(message);
        return false;
      }
    }
    this._items.update(items =>
      items.map(item => item.id === itemId
        ? { ...item, currentStock: Math.max(0, item.currentStock - quantity) }
        : item
      )
    );
    return true;
  }

  async recordRestock(itemId: string, quantity: number, invoiceNumber?: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/inventory/${itemId}/restock`,
          { quantity, invoiceNumber }
        )
      );
    } catch (err: unknown) {
      if (!(err instanceof HttpErrorResponse && err.status === 404)) {
        const message = err instanceof Error ? err.message : 'Failed to record restock';
        this._error.set(message);
        return false;
      }
    }
    this._items.update(items =>
      items.map(item => item.id === itemId
        ? { ...item, currentStock: item.currentStock + quantity, lastRestocked: new Date().toISOString() }
        : item
      )
    );
    return true;
  }

  async predictItem(itemId: string): Promise<StockPrediction | null> {
    if (!this.merchantId) return null;

    try {
      const prediction = await firstValueFrom(
        this.http.get<StockPrediction>(
          `${this.apiUrl}/merchant/${this.merchantId}/inventory/${itemId}/predict`
        )
      );
      this._predictions.update(preds => {
        const existing = preds.findIndex(p => p.inventoryItemId === itemId);
        if (existing >= 0) {
          const updated = [...preds];
          updated[existing] = prediction;
          return updated;
        }
        return [...preds, prediction];
      });
      return prediction;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to predict stock';
      this._error.set(message);
      return null;
    }
  }

  // --- Cycle Counts ---

  async loadCycleCounts(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<CycleCount[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/inventory/cycle-counts`
        )
      );
      this._cycleCounts.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load cycle counts';
      this._error.set(message);
    }
  }

  async startCycleCount(category?: string): Promise<CycleCount | null> {
    if (!this.merchantId) return null;

    try {
      const count = await firstValueFrom(
        this.http.post<CycleCount>(
          `${this.apiUrl}/merchant/${this.merchantId}/inventory/cycle-counts`,
          { category: category ?? null }
        )
      );
      this._activeCycleCount.set(count);
      return count;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start cycle count';
      this._error.set(message);
      return null;
    }
  }

  async submitCycleCount(countId: string, entries: CycleCountEntry[]): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      const result = await firstValueFrom(
        this.http.patch<CycleCount>(
          `${this.apiUrl}/merchant/${this.merchantId}/inventory/cycle-counts/${countId}`,
          { entries }
        )
      );
      this._activeCycleCount.set(null);
      this._cycleCounts.update(counts => [result, ...counts]);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit cycle count';
      this._error.set(message);
      return false;
    }
  }

  // --- Expiring Items ---

  async loadExpiringItems(daysAhead: number = 7): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<ExpiringItem[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/inventory/expiring`,
          { params: { days: daysAhead.toString() } }
        )
      );
      this._expiringItems.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load expiring items';
      this._error.set(message);
    }
  }

  // --- Unit Conversions ---

  async loadUnitConversions(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<UnitConversion[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/inventory/unit-conversions`
        )
      );
      this._unitConversions.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load unit conversions';
      this._error.set(message);
    }
  }

  async createUnitConversion(data: Omit<UnitConversion, 'id' | 'merchantId'>): Promise<UnitConversion | null> {
    if (!this.merchantId) return null;

    try {
      const conversion = await firstValueFrom(
        this.http.post<UnitConversion>(
          `${this.apiUrl}/merchant/${this.merchantId}/inventory/unit-conversions`,
          data
        )
      );
      this._unitConversions.update(list => [...list, conversion]);
      return conversion;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create unit conversion';
      this._error.set(message);
      return null;
    }
  }

  async deleteUnitConversion(id: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/inventory/unit-conversions/${id}`
        )
      );
      this._unitConversions.update(list => list.filter(c => c.id !== id));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete unit conversion';
      this._error.set(message);
      return false;
    }
  }

  async refresh(): Promise<void> {
    if (!this.merchantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await Promise.all([
        this.loadReport(),
        this.loadItems(),
        this.loadAlerts(),
        this.loadPredictions(),
      ]);
    } finally {
      this._isLoading.set(false);
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
