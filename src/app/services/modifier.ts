import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ModifierGroup, ModifierGroupFormData, ModifierFormData } from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ModifierService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _groups = signal<ModifierGroup[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly groups = this._groups.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  async loadGroups(): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const groups = await firstValueFrom(
        this.http.get<ModifierGroup[]>(`${this.apiUrl}/merchant/${this.merchantId}/modifiers`)
      );
      this._groups.set(groups);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load modifier groups');
    } finally {
      this._isLoading.set(false);
    }
  }

  async createGroup(data: ModifierGroupFormData): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/merchant/${this.merchantId}/modifiers`, data)
      );
      await this.loadGroups();
      return true;
    } catch (err: any) {
      this._error.set(err?.error?.error ?? 'Failed to create modifier group');
      return false;
    }
  }

  async updateGroup(groupId: string, data: Partial<ModifierGroupFormData>): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiUrl}/merchant/${this.merchantId}/modifiers/${groupId}`, data)
      );
      await this.loadGroups();
      return true;
    } catch (err: any) {
      this._error.set(err?.error?.error ?? 'Failed to update modifier group');
      return false;
    }
  }

  async deleteGroup(groupId: string): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/merchant/${this.merchantId}/modifiers/${groupId}`)
      );
      await this.loadGroups();
      return true;
    } catch (err: any) {
      this._error.set(err?.error?.error ?? 'Failed to delete modifier group');
      return false;
    }
  }

  async createOption(groupId: string, data: ModifierFormData): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/merchant/${this.merchantId}/modifiers/${groupId}/options`, data)
      );
      await this.loadGroups();
      return true;
    } catch (err: any) {
      this._error.set(err?.error?.error ?? 'Failed to create modifier option');
      return false;
    }
  }

  async updateOption(groupId: string, optionId: string, data: Partial<ModifierFormData>): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiUrl}/merchant/${this.merchantId}/modifiers/${groupId}/options/${optionId}`, data)
      );
      await this.loadGroups();
      return true;
    } catch (err: any) {
      this._error.set(err?.error?.error ?? 'Failed to update modifier option');
      return false;
    }
  }

  async deleteOption(groupId: string, optionId: string): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/merchant/${this.merchantId}/modifiers/${groupId}/options/${optionId}`)
      );
      await this.loadGroups();
      return true;
    } catch (err: any) {
      this._error.set(err?.error?.error ?? 'Failed to delete modifier option');
      return false;
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
