import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../environments/environment';
import { Combo, ComboFormData } from '../models';

@Injectable({ providedIn: 'root' })
export class ComboService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly _combos = signal<Combo[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly combos = this._combos.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly activeCombos = computed(() =>
    this._combos().filter(c => c.isActive)
  );

  private get merchantId(): string {
    return this.authService.selectedMerchantId() ?? '';
  }

  private get baseUrl(): string {
    return `${environment.apiUrl}/merchant/${this.merchantId}`;
  }

  async loadCombos(): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const combos = await firstValueFrom(
        this.http.get<Combo[]>(`${this.baseUrl}/combos`)
      );
      this._combos.set(combos);
    } catch {
      this._error.set('Failed to load combos');
    } finally {
      this._isLoading.set(false);
    }
  }

  async createCombo(data: ComboFormData): Promise<Combo | null> {
    this._error.set(null);
    try {
      const combo = await firstValueFrom(
        this.http.post<Combo>(`${this.baseUrl}/combos`, data)
      );
      this._combos.update(list => [...list, combo]);
      return combo;
    } catch {
      this._error.set('Failed to create combo');
      return null;
    }
  }

  async updateCombo(comboId: string, data: Partial<ComboFormData>): Promise<void> {
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<Combo>(`${this.baseUrl}/combos/${comboId}`, data)
      );
      this._combos.update(list => list.map(c => c.id === comboId ? updated : c));
    } catch {
      this._error.set('Failed to update combo');
    }
  }

  async deleteCombo(comboId: string): Promise<void> {
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/combos/${comboId}`)
      );
      this._combos.update(list => list.filter(c => c.id !== comboId));
    } catch {
      this._error.set('Failed to delete combo');
    }
  }

  async toggleActive(comboId: string, isActive: boolean): Promise<void> {
    await this.updateCombo(comboId, { isActive });
  }

  clearError(): void {
    this._error.set(null);
  }
}
