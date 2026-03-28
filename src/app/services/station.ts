import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { KdsStation, StationFormData, StationCategoryMapping } from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class StationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _stations = signal<KdsStation[]>([]);
  private readonly _mappings = signal<StationCategoryMapping[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly stations = this._stations.asReadonly();
  readonly mappings = this._mappings.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  /** Map from categoryId → stationId (each category maps to at most one station). */
  readonly categoryToStationMap = computed(() => {
    const map = new Map<string, string>();
    for (const mapping of this._mappings()) {
      map.set(mapping.categoryId, mapping.stationId);
    }
    return map;
  });

  readonly activeStations = computed(() =>
    this._stations().filter(s => s.isActive)
  );

  private get merchantId(): string {
    return this.authService.selectedMerchantId() ?? '';
  }

  async loadStations(): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const stations = await firstValueFrom(
        this.http.get<KdsStation[]>(`${this.apiUrl}/merchant/${this.merchantId}/stations`)
      );
      this._stations.set(stations);
    } catch {
      this._error.set('Failed to load stations');
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadCategoryMappings(): Promise<void> {
    if (!this.merchantId) return;
    try {
      const mappings = await firstValueFrom(
        this.http.get<StationCategoryMapping[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/station-category-mappings`
        )
      );
      this._mappings.set(mappings);
    } catch {
      this._error.set('Failed to load station-category mappings');
    }
  }

  async createStation(data: StationFormData): Promise<KdsStation | null> {
    if (!this.merchantId) return null;
    this._error.set(null);

    try {
      const station = await firstValueFrom(
        this.http.post<KdsStation>(`${this.apiUrl}/merchant/${this.merchantId}/stations`, data)
      );
      this._stations.update(stations => [...stations, station]);
      return station;
    } catch {
      this._error.set('Failed to create station');
      return null;
    }
  }

  async updateStation(stationId: string, data: Partial<StationFormData>): Promise<KdsStation | null> {
    if (!this.merchantId) return null;
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.patch<KdsStation>(
          `${this.apiUrl}/merchant/${this.merchantId}/stations/${stationId}`,
          data
        )
      );
      this._stations.update(stations =>
        stations.map(s => s.id === stationId ? updated : s)
      );
      return updated;
    } catch {
      this._error.set('Failed to update station');
      return null;
    }
  }

  async deleteStation(stationId: string): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/merchant/${this.merchantId}/stations/${stationId}`)
      );
      this._stations.update(stations => stations.filter(s => s.id !== stationId));
      // Also remove mappings for deleted station
      this._mappings.update(mappings => mappings.filter(m => m.stationId !== stationId));
      return true;
    } catch {
      this._error.set('Failed to delete station');
      return false;
    }
  }

  async setCategoryMappings(stationId: string, categoryIds: string[]): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.put(
          `${this.apiUrl}/merchant/${this.merchantId}/stations/${stationId}/categories`,
          { categoryIds }
        )
      );

      // Update local station's categoryIds
      this._stations.update(stations =>
        stations.map(s => s.id === stationId ? { ...s, categoryIds } : s)
      );

      // Refresh mappings to stay in sync (server enforces exclusivity)
      await this.loadCategoryMappings();
      return true;
    } catch {
      this._error.set('Failed to set station categories');
      return false;
    }
  }
}
