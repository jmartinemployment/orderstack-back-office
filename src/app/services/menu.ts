import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  MenuCategory,
  MenuItem,
  AICostEstimationResponse,
  AIBatchResponse,
  ItemVariation,
  ReportingCategory,
  ItemOptionSet,
  CsvImportResult,
  MenuSchedule,
  MenuScheduleFormData,
  Daypart,
  ScheduleOverride,
  SchedulePreviewResult,
  isItemAvailable,
  isDaypartActive,
} from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  // Private writable signals
  private readonly _categories = signal<MenuCategory[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentLanguage = signal<'en' | 'es'>('en');
  private readonly _crudSupported = signal(false);

  // Reporting categories
  private readonly _reportingCategories = signal<ReportingCategory[]>([]);

  // Option sets
  private readonly _optionSets = signal<ItemOptionSet[]>([]);

  // Menu schedules
  private readonly _menuSchedules = signal<MenuSchedule[]>([]);
  private readonly _activeScheduleId = signal<string | null>(null);
  private readonly _scheduleOverrides = signal<ScheduleOverride[]>([]);

  // Public readonly signals
  readonly categories = this._categories.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentLanguage = this._currentLanguage.asReadonly();
  readonly crudSupported = this._crudSupported.asReadonly();
  readonly reportingCategories = this._reportingCategories.asReadonly();
  readonly optionSets = this._optionSets.asReadonly();
  readonly menuSchedules = this._menuSchedules.asReadonly();
  readonly activeScheduleId = this._activeScheduleId.asReadonly();
  readonly scheduleOverrides = this._scheduleOverrides.asReadonly();

  readonly activeSchedule = computed(() => {
    const id = this._activeScheduleId();
    if (!id) return null;
    return this._menuSchedules().find(s => s.id === id) ?? null;
  });

  readonly activeDayparts = computed(() => {
    const schedule = this.activeSchedule();
    if (!schedule) return [];
    const now = new Date();
    return schedule.dayparts.filter(dp => isDaypartActive(dp, now));
  });

  readonly activeDaypartIds = computed(() =>
    this.activeDayparts().map(dp => dp.id)
  );

  readonly activeCategories = computed(() =>
    this._categories().filter(cat => cat.isActive !== false)
  );

  readonly allItems = computed(() => {
    const items: MenuItem[] = [];
    const collectItems = (categories: MenuCategory[]) => {
      for (const cat of categories) {
        if (cat.items) {
          items.push(...cat.items.filter(item => item.isActive !== false));
        }
        if (cat.subcategories) {
          collectItems(cat.subcategories);
        }
      }
    };
    collectItems(this._categories());
    return items;
  });

  // All items regardless of isActive state — for administration and KDS views
  readonly allItemsUnfiltered = computed(() => {
    const items: MenuItem[] = [];
    const collectItems = (categories: MenuCategory[]) => {
      for (const cat of categories) {
        if (cat.items) {
          items.push(...cat.items);
        }
        if (cat.subcategories) {
          collectItems(cat.subcategories);
        }
      }
    };
    collectItems(this._categories());
    return items;
  });

  readonly availableItems = computed(() => {
    const activeDpIds = this.activeDaypartIds();
    return this.allItems().filter(item => {
      if (!isItemAvailable(item)) return false;
      if (activeDpIds.length === 0) return true;
      if (!item.daypartIds || item.daypartIds.length === 0) return true;
      return item.daypartIds.some(id => activeDpIds.includes(id));
    });
  });

  readonly cateringItems = computed(() =>
    this.allItems().filter(item => (item.cateringPricing ?? []).length > 0)
  );

  readonly popularItems = computed(() =>
    this.allItems().filter(item => item.popular || item.isPopular)
  );

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  // ─── Private fetch helper ──────────────────────────────────────────────────
  // Called by CRUD methods after a mutation. Does NOT check _isLoading guard —
  // the guard only lives in loadMenuForRestaurant() to prevent duplicate
  // concurrent loads from the component layer. CRUD methods set _isLoading
  // themselves, so they must bypass the guard when refreshing.

  private async _fetchMenu(): Promise<void> {
    const merchantId = this.merchantId;
    if (!merchantId) return;
    try {
      const response = await firstValueFrom(
        this.http.get<MenuCategory[]>(
          `${this.apiUrl}/merchant/${merchantId}/menu/grouped?lang=${this._currentLanguage()}&includeUnavailable=true`
        )
      );
      this._categories.set(this.normalizeMenuData(response || []));
      this._crudSupported.set(true);
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to load menu');
    }
  }

  // ─── Public load (guarded) ─────────────────────────────────────────────────

  async loadMenu(): Promise<void> {
    return this.loadMenuForRestaurant(this.merchantId);
  }

  async loadMenuForRestaurant(merchantId: string | null): Promise<void> {
    if (!merchantId) {
      this._error.set('No restaurant selected');
      return;
    }

    if (this._isLoading()) {
      return;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await this._fetchMenu();
    } finally {
      this._isLoading.set(false);
    }
  }

  setLanguage(lang: 'en' | 'es'): void {
    this._currentLanguage.set(lang);
    this.loadMenu();
  }

  // ─── Category CRUD ─────────────────────────────────────────────────────────

  async createCategory(data: Partial<MenuCategory>): Promise<MenuCategory | null> {
    if (!this.merchantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const category = await firstValueFrom(
        this.http.post<MenuCategory>(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/categories`,
          data
        )
      );
      await this._fetchMenu();
      return category;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to create category');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateCategory(categoryId: string, data: Partial<MenuCategory>): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/categories/${categoryId}`,
          data
        )
      );
      await this._fetchMenu();
      return true;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to update category');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/categories/${categoryId}`
        )
      );
      await this._fetchMenu();
      return true;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to delete category');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  // ─── Item CRUD ─────────────────────────────────────────────────────────────

  async createItem(data: Partial<MenuItem>): Promise<MenuItem | null> {
    if (!this.merchantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const item = await firstValueFrom(
        this.http.post<MenuItem>(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/items`,
          data
        )
      );
      await this._fetchMenu();
      return item;
    } catch (err: unknown) {
      const httpErr = err as { error?: { error?: string } };
      this._error.set(httpErr.error?.error ?? 'Failed to create item');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateItem(itemId: string, data: Partial<MenuItem>): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/items/${itemId}`,
          data
        )
      );
      await this._fetchMenu();
      return true;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to update item');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteItem(itemId: string): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/items/${itemId}`
        )
      );
      await this._fetchMenu();
      return true;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to delete item');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async toggleEightySix(itemId: string, eightySixed: boolean, reason?: string): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/items/${itemId}/86`,
          { eightySixed, reason: eightySixed ? reason : undefined }
        )
      );
      await this._fetchMenu();
      return true;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to update 86 status');
      return false;
    }
  }

  async estimateItemCost(itemId: string): Promise<AICostEstimationResponse | null> {
    if (!this.merchantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<AICostEstimationResponse>(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/items/${itemId}/estimate-cost`,
          {}
        )
      );
      await this._fetchMenu();
      return response;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to estimate item cost');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async generateItemDescription(itemId: string): Promise<MenuItem | null> {
    if (!this.merchantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const item = await firstValueFrom(
        this.http.post<MenuItem>(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/items/${itemId}/generate-description`,
          {}
        )
      );
      await this._fetchMenu();
      return item;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to generate description');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async estimateAllCosts(): Promise<AIBatchResponse | null> {
    if (!this.merchantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<AIBatchResponse>(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/estimate-all-costs`,
          {}
        )
      );
      await this._fetchMenu();
      return response;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to estimate costs');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async generateAllDescriptions(): Promise<AIBatchResponse | null> {
    if (!this.merchantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<AIBatchResponse>(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/generate-all-descriptions`,
          {}
        )
      );
      await this._fetchMenu();
      return response;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to generate descriptions');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  // ─── Item Variations ───────────────────────────────────────────────────────

  async createVariation(itemId: string, data: Partial<ItemVariation>): Promise<ItemVariation | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const variation = await firstValueFrom(
        this.http.post<ItemVariation>(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/items/${itemId}/variations`,
          data
        )
      );
      await this._fetchMenu();
      return variation;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to create variation');
      return null;
    }
  }

  async updateVariation(itemId: string, variationId: string, data: Partial<ItemVariation>): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/items/${itemId}/variations/${variationId}`,
          data
        )
      );
      await this._fetchMenu();
      return true;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to update variation');
      return false;
    }
  }

  async deleteVariation(itemId: string, variationId: string): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/items/${itemId}/variations/${variationId}`
        )
      );
      await this._fetchMenu();
      return true;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to delete variation');
      return false;
    }
  }

  // ─── Reporting Categories ──────────────────────────────────────────────────

  async loadReportingCategories(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<ReportingCategory[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/reporting-categories`
        )
      );
      this._reportingCategories.set(data);
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to load reporting categories');
    }
  }

  async createReportingCategory(data: Partial<ReportingCategory>): Promise<ReportingCategory | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const category = await firstValueFrom(
        this.http.post<ReportingCategory>(
          `${this.apiUrl}/merchant/${this.merchantId}/reporting-categories`,
          data
        )
      );
      await this.loadReportingCategories();
      return category;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to create reporting category');
      return null;
    }
  }

  async updateReportingCategory(id: string, data: Partial<ReportingCategory>): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/merchant/${this.merchantId}/reporting-categories/${id}`,
          data
        )
      );
      await this.loadReportingCategories();
      return true;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to update reporting category');
      return false;
    }
  }

  async deleteReportingCategory(id: string): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/reporting-categories/${id}`
        )
      );
      await this.loadReportingCategories();
      return true;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to delete reporting category');
      return false;
    }
  }

  // ─── Option Sets ───────────────────────────────────────────────────────────

  async loadOptionSets(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<ItemOptionSet[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/option-sets`
        )
      );
      this._optionSets.set(data);
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to load option sets');
    }
  }

  async createOptionSet(data: Partial<ItemOptionSet>): Promise<ItemOptionSet | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const optionSet = await firstValueFrom(
        this.http.post<ItemOptionSet>(
          `${this.apiUrl}/merchant/${this.merchantId}/option-sets`,
          data
        )
      );
      await this.loadOptionSets();
      return optionSet;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to create option set');
      return null;
    }
  }

  // ─── CSV Import / Export ───────────────────────────────────────────────────

  async importMenuFromCsv(file: File): Promise<CsvImportResult | null> {
    if (!this.merchantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await firstValueFrom(
        this.http.post<CsvImportResult>(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/import`,
          formData
        )
      );
      await this._fetchMenu();
      return result;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to import menu');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async exportMenuToCsv(): Promise<void> {
    if (!this.merchantId) return;

    this._error.set(null);

    try {
      const blob = await firstValueFrom(
        this.http.get(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/export`,
          { responseType: 'blob' }
        )
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'menu-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to export menu');
    }
  }

  // ─── SKU Generation ────────────────────────────────────────────────────────

  async autoGenerateSku(itemId: string): Promise<string | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<{ sku: string }>(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/items/${itemId}/generate-sku`,
          {}
        )
      );
      await this._fetchMenu();
      return result.sku;
    } catch (err: unknown) {
      this._error.set((err as { error?: { error?: string } }).error?.error ?? 'Failed to generate SKU');
      return null;
    }
  }

  clearError(): void {
    this._error.set(null);
  }

  // ─── Menu Schedules ────────────────────────────────────────────────────────

  async loadMenuSchedules(): Promise<void> {
    if (!this.merchantId) return;
    try {
      const schedules = await firstValueFrom(
        this.http.get<MenuSchedule[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/schedules`
        )
      );
      this._menuSchedules.set(schedules);
      const def = schedules.find(s => s.isDefault);
      if (def) this._activeScheduleId.set(def.id);
    } catch {
      this.restoreSchedulesFromStorage();
    }
  }

  async createMenuSchedule(data: MenuScheduleFormData): Promise<MenuSchedule | null> {
    const id = crypto.randomUUID();
    const schedule: MenuSchedule = {
      id,
      merchantId: this.merchantId ?? '',
      name: data.name,
      dayparts: data.dayparts.map(dp => ({ ...dp, id: crypto.randomUUID() })),
      isDefault: data.isDefault,
    };

    if (data.isDefault) {
      this._menuSchedules.update(list => list.map(s => ({ ...s, isDefault: false })));
      this._activeScheduleId.set(id);
    }

    this._menuSchedules.update(list => [...list, schedule]);
    this.persistSchedules();

    try {
      await firstValueFrom(
        this.http.post<MenuSchedule>(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/schedules`,
          data
        )
      );
    } catch {
      // Local-first: schedule persisted in localStorage
    }

    return schedule;
  }

  async updateMenuSchedule(scheduleId: string, data: MenuScheduleFormData): Promise<boolean> {
    this._menuSchedules.update(list =>
      list.map(s => {
        if (s.id === scheduleId) {
          return {
            ...s,
            name: data.name,
            dayparts: data.dayparts.map((dp, i) => ({
              ...dp,
              id: s.dayparts[i]?.id ?? crypto.randomUUID(),
            })),
            isDefault: data.isDefault,
          };
        }
        if (data.isDefault) {
          return { ...s, isDefault: false };
        }
        return s;
      })
    );

    if (data.isDefault) this._activeScheduleId.set(scheduleId);
    this.persistSchedules();

    try {
      await firstValueFrom(
        this.http.put(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/schedules/${scheduleId}`,
          data
        )
      );
    } catch {
      // Local-first
    }

    return true;
  }

  async deleteMenuSchedule(scheduleId: string): Promise<boolean> {
    this._menuSchedules.update(list => list.filter(s => s.id !== scheduleId));
    if (this._activeScheduleId() === scheduleId) {
      this._activeScheduleId.set(null);
    }
    this.persistSchedules();

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/menu/schedules/${scheduleId}`
        )
      );
    } catch {
      // Local-first
    }

    return true;
  }

  setActiveSchedule(scheduleId: string | null): void {
    this._activeScheduleId.set(scheduleId);
    this.persistSchedules();
  }

  async assignItemsToDaypart(itemIds: string[], daypartId: string): Promise<void> {
    const addDaypart = (item: MenuItem): MenuItem => {
      if (!itemIds.includes(item.id)) return item;
      const existing = item.daypartIds ?? [];
      if (existing.includes(daypartId)) return item;
      return { ...item, daypartIds: [...existing, daypartId] };
    };
    this._categories.update(cats =>
      cats.map(cat => ({
        ...cat,
        items: cat.items?.map(addDaypart),
        subcategories: cat.subcategories?.map(sub => ({ ...sub, items: sub.items?.map(addDaypart) })),
      }))
    );
  }

  async removeItemsFromDaypart(itemIds: string[], daypartId: string): Promise<void> {
    const removeDaypart = (item: MenuItem): MenuItem => {
      if (!itemIds.includes(item.id)) return item;
      return { ...item, daypartIds: (item.daypartIds ?? []).filter(id => id !== daypartId) };
    };
    this._categories.update(cats =>
      cats.map(cat => ({
        ...cat,
        items: cat.items?.map(removeDaypart),
        subcategories: cat.subcategories?.map(sub => ({ ...sub, items: sub.items?.map(removeDaypart) })),
      }))
    );
  }

  isItemInActiveDaypart(item: MenuItem): boolean {
    const activeDpIds = this.activeDaypartIds();
    if (activeDpIds.length === 0) return true;
    if (!item.daypartIds || item.daypartIds.length === 0) return true;
    return item.daypartIds.some(id => activeDpIds.includes(id));
  }

  // ─── Schedule Preview & Overrides ─────────────────────────────────────────

  previewMenuAt(targetDate: Date): SchedulePreviewResult[] {
    const schedule = this.activeSchedule();
    if (!schedule) {
      return [{ daypart: null, items: this.allItems(), isOverride: false, isClosed: false }];
    }

    const dateStr = targetDate.toISOString().split('T')[0];
    const override = this._scheduleOverrides().find(o => o.date === dateStr);

    if (override) {
      if (override.mode === 'closed') {
        return [{ daypart: null, items: [], isOverride: true, overrideLabel: override.label, isClosed: true }];
      }
      return override.dayparts
        .filter(dp => isDaypartActive(dp, targetDate))
        .map(dp => ({
          daypart: dp,
          items: this.getItemsForDaypart(dp.id),
          isOverride: true,
          overrideLabel: override.label,
          isClosed: false,
        }));
    }

    const activeDps = schedule.dayparts.filter(dp => isDaypartActive(dp, targetDate));
    if (activeDps.length === 0) {
      return [{ daypart: null, items: this.getAlwaysAvailableItems(), isOverride: false, isClosed: false }];
    }

    return activeDps.map(dp => ({
      daypart: dp,
      items: this.getItemsForDaypart(dp.id),
      isOverride: false,
      isClosed: false,
    }));
  }

  private getItemsForDaypart(daypartId: string): MenuItem[] {
    return this.allItems().filter(item => {
      if (!item.daypartIds || item.daypartIds.length === 0) return true;
      return item.daypartIds.includes(daypartId);
    });
  }

  private getAlwaysAvailableItems(): MenuItem[] {
    return this.allItems().filter(item => !item.daypartIds || item.daypartIds.length === 0);
  }

  getOverrideForDate(dateStr: string): ScheduleOverride | null {
    return this._scheduleOverrides().find(o => o.date === dateStr) ?? null;
  }

  addScheduleOverride(override: Omit<ScheduleOverride, 'id'>): void {
    const newOverride: ScheduleOverride = { ...override, id: crypto.randomUUID() };
    this._scheduleOverrides.update(list => {
      const filtered = list.filter(o => o.date !== override.date);
      return [...filtered, newOverride].sort((a, b) => a.date.localeCompare(b.date));
    });
    this.persistSchedules();
  }

  updateScheduleOverride(id: string, data: Omit<ScheduleOverride, 'id'>): void {
    this._scheduleOverrides.update(list =>
      list.map(o => o.id === id ? { ...o, ...data } : o)
    );
    this.persistSchedules();
  }

  deleteScheduleOverride(id: string): void {
    this._scheduleOverrides.update(list => list.filter(o => o.id !== id));
    this.persistSchedules();
  }

  getUpcomingDaypartChange(): { nextDaypart: Daypart; minutesUntil: number } | null {
    const schedule = this.activeSchedule();
    if (!schedule) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const dayOfWeek = now.getDay();

    let nearest: { daypart: Daypart; minutesUntil: number } | null = null;

    for (const dp of schedule.dayparts) {
      if (!dp.isActive || !dp.daysOfWeek.includes(dayOfWeek)) continue;
      const [startH, startM] = dp.startTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const diff = startMinutes - currentMinutes;
      if (diff > 0 && diff <= 30) {
        if (!nearest || diff < nearest.minutesUntil) {
          nearest = { daypart: dp, minutesUntil: diff };
        }
      }
    }

    return nearest ? { nextDaypart: nearest.daypart, minutesUntil: nearest.minutesUntil } : null;
  }

  private persistSchedules(): void {
    if (!this.merchantId) return;
    const key = `menu-schedules-${this.merchantId}`;
    const data = {
      schedules: this._menuSchedules(),
      activeId: this._activeScheduleId(),
      overrides: this._scheduleOverrides(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  }

  private restoreSchedulesFromStorage(): void {
    if (!this.merchantId) return;
    const key = `menu-schedules-${this.merchantId}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored) as { schedules: MenuSchedule[]; activeId: string | null; overrides?: ScheduleOverride[] };
        this._menuSchedules.set(data.schedules ?? []);
        this._activeScheduleId.set(data.activeId ?? null);
        this._scheduleOverrides.set(data.overrides ?? []);
      }
    } catch {
      // Ignore corrupted storage
    }
  }

  // ─── Item Photos & AI Descriptions ────────────────────────────────────────

  async uploadItemImage(itemId: string, file: File): Promise<{ imageUrl: string; thumbnailUrl: string }> {
    const merchantId = this.authService.selectedMerchantId();
    const formData = new FormData();
    formData.append('image', file);
    formData.append('itemId', itemId);
    formData.append('merchantId', merchantId ?? '');

    const result = await firstValueFrom(
      this.http.post<{ imageUrl: string; thumbnailUrl: string }>(
        `${this.apiUrl}/menu/items/${itemId}/image`,
        formData
      )
    );

    this._categories.update(cats => cats.map(cat => ({
      ...cat,
      items: cat.items?.map(item =>
        item.id === itemId
          ? { ...item, imageUrl: result.imageUrl, thumbnailUrl: result.thumbnailUrl }
          : item
      ),
    })));

    return result;
  }

  async deleteItemImage(itemId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.apiUrl}/menu/items/${itemId}/image`)
    );

    this._categories.update(cats => cats.map(cat => ({
      ...cat,
      items: cat.items?.map(item =>
        item.id === itemId
          ? { ...item, imageUrl: null, thumbnailUrl: null }
          : item
      ),
    })));
  }

  async generateAiDescription(itemId: string): Promise<string> {
    const result = await firstValueFrom(
      this.http.post<{ description: string }>(
        `${this.apiUrl}/menu/items/${itemId}/generate-description`,
        {}
      )
    );

    this._categories.update(cats => cats.map(cat => ({
      ...cat,
      items: cat.items?.map(item =>
        item.id === itemId
          ? { ...item, aiGeneratedDescription: result.description }
          : item
      ),
    })));

    return result.description;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private normalizeMenuData(categories: MenuCategory[]): MenuCategory[] {
    return categories.map(cat => ({
      ...cat,
      isActive: cat.isActive ?? true,
      items: cat.items?.map(item => ({ ...item, isActive: item.isActive ?? true })),
      subcategories: cat.subcategories
        ? this.normalizeMenuData(cat.subcategories)
        : undefined,
    }));
  }
}
