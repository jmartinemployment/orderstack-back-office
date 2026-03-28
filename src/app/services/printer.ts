import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Printer, PrinterFormData, PrinterCreateResponse, TestPrintResponse } from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PrinterService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _printers = signal<Printer[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly printers = this._printers.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  private get merchantId(): string {
    return this.authService.selectedMerchantId() ?? '';
  }

  async loadPrinters(): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const printers = await firstValueFrom(
        this.http.get<Printer[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/printers`
        )
      );
      this._printers.set(printers);
    } catch {
      this._error.set('Failed to load printers');
    } finally {
      this._isLoading.set(false);
    }
  }

  async createPrinter(data: PrinterFormData): Promise<PrinterCreateResponse | null> {
    if (!this.merchantId) return null;
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<PrinterCreateResponse>(
          `${this.apiUrl}/merchant/${this.merchantId}/printers`,
          data
        )
      );
      this._printers.update(printers => {
        let updated = [...printers, response.printer];
        if (response.printer.isDefault) {
          updated = updated.map(p =>
            p.id === response.printer.id ? p : { ...p, isDefault: false }
          );
        }
        return updated;
      });
      return response;
    } catch {
      this._error.set('Failed to register printer');
      return null;
    }
  }

  async updatePrinter(
    printerId: string,
    data: Partial<Printer>
  ): Promise<Printer | null> {
    if (!this.merchantId) return null;
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.patch<Printer>(
          `${this.apiUrl}/merchant/${this.merchantId}/printers/${printerId}`,
          data
        )
      );
      this._printers.update(printers => {
        let list = printers.map(p => (p.id === printerId ? updated : p));
        if (updated.isDefault) {
          list = list.map(p =>
            p.id === printerId ? p : { ...p, isDefault: false }
          );
        }
        return list;
      });
      return updated;
    } catch {
      this._error.set('Failed to update printer');
      return null;
    }
  }

  async deletePrinter(printerId: string): Promise<boolean> {
    if (!this.merchantId) return false;
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/printers/${printerId}`
        )
      );
      this._printers.update(printers =>
        printers.filter(p => p.id !== printerId)
      );
      return true;
    } catch {
      this._error.set('Failed to delete printer');
      return false;
    }
  }

  async testPrint(printerId: string): Promise<TestPrintResponse | null> {
    if (!this.merchantId) return null;
    this._error.set(null);

    try {
      return await firstValueFrom(
        this.http.post<TestPrintResponse>(
          `${this.apiUrl}/merchant/${this.merchantId}/printers/${printerId}/test`,
          {}
        )
      );
    } catch {
      this._error.set('Test print failed');
      return null;
    }
  }
}
