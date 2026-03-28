import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../environments/environment';
import { Invoice, InvoiceFormData, HouseAccount, HouseAccountFormData } from '../models';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly _invoices = signal<Invoice[]>([]);
  private readonly _houseAccounts = signal<HouseAccount[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly invoices = this._invoices.asReadonly();
  readonly houseAccounts = this._houseAccounts.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly activeHouseAccounts = computed(() =>
    this._houseAccounts().filter(a => a.isActive)
  );

  readonly overdueInvoices = computed(() =>
    this._invoices().filter(i => i.status === 'overdue')
  );

  readonly totalOutstanding = computed(() =>
    this._invoices()
      .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
      .reduce((sum, i) => sum + i.amountDue, 0)
  );

  readonly totalCollected = computed(() =>
    this._invoices().reduce((sum, i) => sum + i.amountPaid, 0)
  );

  private get merchantId(): string {
    return this.authService.selectedMerchantId() ?? '';
  }

  private get baseUrl(): string {
    return `${environment.apiUrl}/merchant/${this.merchantId}`;
  }

  async loadInvoices(): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const invoices = await firstValueFrom(
        this.http.get<Invoice[]>(`${this.baseUrl}/invoices`)
      );
      this._invoices.set(invoices);
    } catch {
      this._error.set('Failed to load invoices');
    } finally {
      this._isLoading.set(false);
    }
  }

  async createInvoice(data: InvoiceFormData): Promise<Invoice | null> {
    this._error.set(null);
    try {
      const invoice = await firstValueFrom(
        this.http.post<Invoice>(`${this.baseUrl}/invoices`, data)
      );
      this._invoices.update(list => [invoice, ...list]);
      return invoice;
    } catch {
      this._error.set('Failed to create invoice');
      return null;
    }
  }

  async sendInvoice(invoiceId: string): Promise<void> {
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.post<Invoice>(`${this.baseUrl}/invoices/${invoiceId}/send`, {})
      );
      this._invoices.update(list => list.map(i => i.id === invoiceId ? updated : i));
    } catch {
      this._error.set('Failed to send invoice');
    }
  }

  async recordPayment(invoiceId: string, amount: number): Promise<void> {
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.post<Invoice>(`${this.baseUrl}/invoices/${invoiceId}/payment`, { amount })
      );
      this._invoices.update(list => list.map(i => i.id === invoiceId ? updated : i));
    } catch {
      this._error.set('Failed to record payment');
    }
  }

  async cancelInvoice(invoiceId: string): Promise<void> {
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/invoices/${invoiceId}`)
      );
      this._invoices.update(list => list.map(i => i.id === invoiceId ? { ...i, status: 'cancelled' as const } : i));
    } catch {
      this._error.set('Failed to cancel invoice');
    }
  }

  async loadHouseAccounts(): Promise<void> {
    if (!this.merchantId) return;
    try {
      const accounts = await firstValueFrom(
        this.http.get<HouseAccount[]>(`${this.baseUrl}/house-accounts`)
      );
      this._houseAccounts.set(accounts);
    } catch {
      this._error.set('Failed to load house accounts');
    }
  }

  async createHouseAccount(data: HouseAccountFormData): Promise<HouseAccount | null> {
    this._error.set(null);
    try {
      const account = await firstValueFrom(
        this.http.post<HouseAccount>(`${this.baseUrl}/house-accounts`, data)
      );
      this._houseAccounts.update(list => [account, ...list]);
      return account;
    } catch {
      this._error.set('Failed to create house account');
      return null;
    }
  }

  async updateHouseAccount(accountId: string, data: Partial<HouseAccountFormData>): Promise<void> {
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<HouseAccount>(`${this.baseUrl}/house-accounts/${accountId}`, data)
      );
      this._houseAccounts.update(list => list.map(a => a.id === accountId ? updated : a));
    } catch {
      this._error.set('Failed to update house account');
    }
  }

  async deactivateHouseAccount(accountId: string): Promise<void> {
    await this.updateHouseAccount(accountId, { status: 'suspended' } as any);
    this._houseAccounts.update(list =>
      list.map(a => a.id === accountId ? { ...a, isActive: false } : a)
    );
  }

  clearError(): void {
    this._error.set(null);
  }
}
