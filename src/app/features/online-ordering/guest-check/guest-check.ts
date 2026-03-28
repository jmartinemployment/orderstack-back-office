import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Check } from '@models/index';
import { environment } from '../../../environments/environment';

interface GuestCheckData {
  restaurantName: string;
  orderNumber: string;
  check: Check;
  serverName: string;
  tableName: string | null;
}

@Component({
  selector: 'os-guest-check',
  imports: [CurrencyPipe],
  templateUrl: './guest-check.html',
  styleUrl: './guest-check.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestCheck implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly _checkData = signal<GuestCheckData | null>(null);
  private readonly _isLoading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _tipPercent = signal<number | null>(18);
  private readonly _customTipAmount = signal<number>(0);
  private readonly _showCustomTip = signal(false);
  private readonly _selectedItems = signal(new Set<string>());
  private readonly _splitMode = signal(false);
  private readonly _requestingServer = signal(false);
  private readonly _serverRequested = signal(false);

  readonly checkData = this._checkData.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly tipPercent = this._tipPercent.asReadonly();
  readonly customTipAmount = this._customTipAmount.asReadonly();
  readonly showCustomTip = this._showCustomTip.asReadonly();
  readonly selectedItems = this._selectedItems.asReadonly();
  readonly splitMode = this._splitMode.asReadonly();
  readonly requestingServer = this._requestingServer.asReadonly();
  readonly serverRequested = this._serverRequested.asReadonly();

  readonly tipPresets = [15, 18, 20, 25];

  readonly tipAmount = computed(() => {
    const data = this._checkData();
    if (!data) return 0;
    const subtotal = this._splitMode()
      ? this.splitSubtotal()
      : data.check.subtotal;
    if (this._showCustomTip()) return this._customTipAmount();
    const pct = this._tipPercent();
    if (pct === null) return 0;
    return Math.round(subtotal * pct) / 100;
  });

  readonly splitSubtotal = computed(() => {
    const data = this._checkData();
    if (!data) return 0;
    const selected = this._selectedItems();
    return data.check.selections
      .filter(s => selected.has(s.guid))
      .reduce((sum, s) => sum + s.totalPrice, 0);
  });

  readonly displaySubtotal = computed(() => {
    if (this._splitMode()) return this.splitSubtotal();
    return this._checkData()?.check.subtotal ?? 0;
  });

  readonly displayTax = computed(() => {
    const data = this._checkData();
    if (!data) return 0;
    if (!this._splitMode()) return data.check.taxAmount;
    const ratio = data.check.subtotal > 0
      ? this.splitSubtotal() / data.check.subtotal
      : 0;
    return Math.round(data.check.taxAmount * ratio * 100) / 100;
  });

  readonly displayTotal = computed(() => {
    return this.displaySubtotal() + this.displayTax() + this.tipAmount();
  });

  ngOnInit(): void {
    const orderId = this.route.snapshot.queryParamMap.get('order');
    const checkId = this.route.snapshot.queryParamMap.get('check');

    if (!orderId || !checkId) {
      this._error.set('Invalid check link');
      this._isLoading.set(false);
      return;
    }

    this.loadCheck(orderId, checkId);
  }

  private async loadCheck(orderId: string, checkId: string): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<GuestCheckData>(
          `${this.apiUrl}/guest-check/${orderId}/${checkId}`
        )
      );
      this._checkData.set(data);
    } catch {
      this._error.set('Unable to load check. The link may have expired.');
    } finally {
      this._isLoading.set(false);
    }
  }

  selectTipPercent(pct: number): void {
    this._showCustomTip.set(false);
    this._tipPercent.set(pct);
  }

  selectNoTip(): void {
    this._showCustomTip.set(false);
    this._tipPercent.set(null);
  }

  showCustomTipInput(): void {
    this._showCustomTip.set(true);
    this._tipPercent.set(null);
  }

  setCustomTip(amount: string): void {
    this._customTipAmount.set(Number.parseFloat(amount) || 0);
  }

  toggleSplitMode(): void {
    this._splitMode.update(v => !v);
    if (!this._splitMode()) {
      this._selectedItems.set(new Set());
    }
  }

  toggleItemSelection(selectionGuid: string): void {
    this._selectedItems.update(set => {
      const updated = new Set(set);
      if (updated.has(selectionGuid)) {
        updated.delete(selectionGuid);
      } else {
        updated.add(selectionGuid);
      }
      return updated;
    });
  }

  isItemSelected(selectionGuid: string): boolean {
    return this._selectedItems().has(selectionGuid);
  }

  async requestServer(): Promise<void> {
    const data = this._checkData();
    if (!data || this._requestingServer()) return;

    this._requestingServer.set(true);
    try {
      const orderId = this.route.snapshot.queryParamMap.get('order');
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/guest-check/${orderId}/request-server`, {})
      );
      this._serverRequested.set(true);
    } catch {
      // Silent fail — not critical
    } finally {
      this._requestingServer.set(false);
    }
  }
}
