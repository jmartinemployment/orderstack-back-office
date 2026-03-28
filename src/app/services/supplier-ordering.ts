import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../environments/environment';
import type {
  SupplierCredentialSummary,
  SupplierCredentialPayload,
  SupplierProviderType,
  SupplierConnectionTestResult,
} from '../models/vendor.model';

@Injectable({
  providedIn: 'root',
})
export class SupplierOrderingService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _credentialSummary = signal<SupplierCredentialSummary | null>(null);
  private readonly _isProcessing = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly credentialSummary = this._credentialSummary.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly error = this._error.asReadonly();

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  async loadCredentialSummary(): Promise<SupplierCredentialSummary | null> {
    if (!this.merchantId) return null;
    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const summary = await firstValueFrom(
        this.http.get<SupplierCredentialSummary>(
          `${this.apiUrl}/merchant/${this.merchantId}/supplier-credentials`
        )
      );
      this._credentialSummary.set(summary);
      return summary;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
        const empty: SupplierCredentialSummary = {
          sysco: { configured: false, hasClientId: false, hasClientSecret: false, hasCustomerId: false, mode: 'test', updatedAt: null },
          gfs: { configured: false, hasClientId: false, hasClientSecret: false, hasCustomerId: false, mode: 'test', updatedAt: null },
        };
        this._credentialSummary.set(empty);
        return empty;
      }
      const message = err instanceof Error ? err.message : 'Failed to load supplier credentials';
      this._error.set(message);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async saveSyscoCredentials(payload: SupplierCredentialPayload): Promise<boolean> {
    if (!this.merchantId) return false;
    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const summary = await firstValueFrom(
        this.http.put<SupplierCredentialSummary>(
          `${this.apiUrl}/merchant/${this.merchantId}/supplier-credentials/sysco`,
          payload
        )
      );
      this._credentialSummary.set(summary);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save Sysco credentials';
      this._error.set(message);
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async saveGfsCredentials(payload: SupplierCredentialPayload): Promise<boolean> {
    if (!this.merchantId) return false;
    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const summary = await firstValueFrom(
        this.http.put<SupplierCredentialSummary>(
          `${this.apiUrl}/merchant/${this.merchantId}/supplier-credentials/gfs`,
          payload
        )
      );
      this._credentialSummary.set(summary);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save GFS credentials';
      this._error.set(message);
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async deleteSyscoCredentials(): Promise<boolean> {
    if (!this.merchantId) return false;
    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const summary = await firstValueFrom(
        this.http.delete<SupplierCredentialSummary>(
          `${this.apiUrl}/merchant/${this.merchantId}/supplier-credentials/sysco`
        )
      );
      this._credentialSummary.set(summary);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete Sysco credentials';
      this._error.set(message);
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async deleteGfsCredentials(): Promise<boolean> {
    if (!this.merchantId) return false;
    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const summary = await firstValueFrom(
        this.http.delete<SupplierCredentialSummary>(
          `${this.apiUrl}/merchant/${this.merchantId}/supplier-credentials/gfs`
        )
      );
      this._credentialSummary.set(summary);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete GFS credentials';
      this._error.set(message);
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async testConnection(provider: SupplierProviderType): Promise<SupplierConnectionTestResult | null> {
    if (!this.merchantId) return null;
    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const result = await firstValueFrom(
        this.http.post<SupplierConnectionTestResult>(
          `${this.apiUrl}/merchant/${this.merchantId}/supplier-credentials/test`,
          { provider }
        )
      );
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to test connection';
      this._error.set(message);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  isProviderConfigured(provider: SupplierProviderType): boolean {
    const summary = this._credentialSummary();
    if (!summary) return false;
    return summary[provider].configured;
  }

  clearError(): void {
    this._error.set(null);
  }
}
