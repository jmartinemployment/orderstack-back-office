import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Order,
  Check,
  Selection,
  DiscountType,
} from '../models';
import { MenuItem, Modifier } from '../models/menu.model';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

export interface AddItemRequest {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  modifiers: { id: string; name: string; priceAdjustment: number; isTextModifier?: boolean; textValue?: string }[];
  seatNumber?: number;
  specialInstructions?: string;
  courseGuid?: string;
}

export interface SplitByItemRequest {
  itemGuids: string[];
  targetCheckGuid?: string;
}

export interface SplitByEqualRequest {
  numberOfWays: number;
}

export interface TransferCheckRequest {
  targetTableId: string;
}

export interface DiscountRequest {
  type: DiscountType;
  value: number;
  reason: string;
  managerPin?: string;
}

export interface VoidItemRequest {
  reason: string;
  managerPin?: string;
}

export interface CompItemRequest {
  reason: string;
  managerPin?: string;
}

export interface OpenTabRequest {
  tabName: string;
  preauthData?: {
    paymentMethodId: string;
    amount: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class CheckService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _isProcessing = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly isProcessing = this._isProcessing.asReadonly();
  readonly error = this._error.asReadonly();

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  private baseUrl(orderId: string): string {
    return `${this.apiUrl}/merchant/${this.merchantId}/orders/${orderId}`;
  }

  clearError(): void {
    this._error.set(null);
  }

  async addCheck(orderId: string): Promise<Check | null> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return null;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      const raw = await firstValueFrom(
        this.http.post<any>(`${this.baseUrl(orderId)}/checks`, {})
      );
      return this.mapCheck(raw);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to add check');
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async addItemToCheck(
    orderId: string,
    checkGuid: string,
    item: AddItemRequest
  ): Promise<Selection | null> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return null;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      const raw = await firstValueFrom(
        this.http.post<any>(
          `${this.baseUrl(orderId)}/checks/${checkGuid}/items`,
          item
        )
      );
      return this.mapSelection(raw);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to add item');
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async splitCheckByItem(
    orderId: string,
    sourceCheckGuid: string,
    request: SplitByItemRequest
  ): Promise<Order | null> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return null;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      return await firstValueFrom(
        this.http.patch<Order>(
          `${this.baseUrl(orderId)}/checks/${sourceCheckGuid}/split`,
          { mode: 'by_item', ...request }
        )
      );
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to split check');
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async splitCheckByEqual(
    orderId: string,
    sourceCheckGuid: string,
    request: SplitByEqualRequest
  ): Promise<Order | null> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return null;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      return await firstValueFrom(
        this.http.patch<Order>(
          `${this.baseUrl(orderId)}/checks/${sourceCheckGuid}/split`,
          { mode: 'by_equal', ...request }
        )
      );
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to split check');
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async splitCheckBySeat(
    orderId: string,
    sourceCheckGuid: string
  ): Promise<Order | null> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return null;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      return await firstValueFrom(
        this.http.patch<Order>(
          `${this.baseUrl(orderId)}/checks/${sourceCheckGuid}/split`,
          { mode: 'by_seat' }
        )
      );
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to split by seat');
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async mergeChecks(
    orderId: string,
    checkGuids: string[]
  ): Promise<Order | null> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return null;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      return await firstValueFrom(
        this.http.post<Order>(
          `${this.baseUrl(orderId)}/checks/${checkGuids[0]}/merge`,
          { checkGuids }
        )
      );
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to merge checks');
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async transferCheck(
    sourceOrderId: string,
    checkGuid: string,
    request: TransferCheckRequest
  ): Promise<Order | null> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return null;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      return await firstValueFrom(
        this.http.post<Order>(
          `${this.baseUrl(sourceOrderId)}/checks/${checkGuid}/transfer`,
          request
        )
      );
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to transfer check');
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async voidItem(
    orderId: string,
    checkGuid: string,
    selectionGuid: string,
    request: VoidItemRequest
  ): Promise<boolean> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch<any>(
          `${this.baseUrl(orderId)}/checks/${checkGuid}/items/${selectionGuid}/void`,
          request
        )
      );
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to void item');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async compItem(
    orderId: string,
    checkGuid: string,
    selectionGuid: string,
    request: CompItemRequest
  ): Promise<boolean> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch<any>(
          `${this.baseUrl(orderId)}/checks/${checkGuid}/items/${selectionGuid}/comp`,
          request
        )
      );
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to comp item');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async applyDiscount(
    orderId: string,
    checkGuid: string,
    request: DiscountRequest
  ): Promise<boolean> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post<any>(
          `${this.baseUrl(orderId)}/checks/${checkGuid}/discount`,
          request
        )
      );
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to apply discount');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async openTab(
    orderId: string,
    checkGuid: string,
    request: OpenTabRequest
  ): Promise<boolean> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post<any>(
          `${this.baseUrl(orderId)}/preauth`,
          { checkGuid, ...request }
        )
      );
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to open tab');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async splitItemFraction(
    orderId: string,
    sourceCheckGuid: string,
    selectionId: string,
    fractions: number
  ): Promise<Order | null> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return null;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      return await firstValueFrom(
        this.http.patch<Order>(
          `${this.baseUrl(orderId)}/checks/${sourceCheckGuid}/split`,
          { mode: 'by_fraction', selectionId, fractions }
        )
      );
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to split item by fraction');
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async closeTab(orderId: string, checkGuid: string): Promise<boolean> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post<any>(
          `${this.baseUrl(orderId)}/close-tab`,
          { checkGuid }
        )
      );
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to close tab');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async validateManagerPin(pin: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      const result = await firstValueFrom(
        this.http.post<{ valid: boolean }>(
          `${this.apiUrl}/merchant/${this.merchantId}/auth/validate-pin`,
          { pin, requiredRole: 'manager' }
        )
      );
      return result.valid;
    } catch {
      return false;
    }
  }

  buildAddItemRequest(
    menuItem: MenuItem,
    quantity: number,
    selectedModifiers: Modifier[],
    seatNumber?: number,
    specialInstructions?: string,
    courseGuid?: string
  ): AddItemRequest {
    return {
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      quantity,
      unitPrice: Number(menuItem.price),
      modifiers: selectedModifiers.map(m => ({
        id: m.id,
        name: m.name,
        priceAdjustment: m.priceAdjustment,
      })),
      seatNumber,
      specialInstructions,
      courseGuid,
    };
  }

  private mapCheck(raw: any): Check {
    return {
      guid: raw.id ?? raw.guid ?? crypto.randomUUID(),
      displayNumber: raw.displayNumber ?? '1',
      selections: (raw.items || raw.selections || []).map((i: any) => this.mapSelection(i)),
      payments: raw.payments || [],
      paymentStatus: raw.paymentStatus ?? 'OPEN',
      subtotal: Number(raw.subtotal) || 0,
      taxAmount: Number(raw.taxAmount ?? raw.tax) || 0,
      tipAmount: Number(raw.tipAmount ?? raw.tip) || 0,
      totalAmount: Number(raw.totalAmount ?? raw.total) || 0,
      discounts: (raw.discounts || []).map((d: any) => ({
        id: d.id ?? crypto.randomUUID(),
        type: d.type ?? 'flat',
        value: Number(d.value) || 0,
        reason: d.reason ?? '',
        appliedBy: d.appliedBy ?? '',
        approvedBy: d.approvedBy ?? undefined,
      })),
      voidedSelections: raw.voidedSelections || [],
      tabName: raw.tabName ?? undefined,
      tabOpenedAt: raw.tabOpenedAt ? new Date(raw.tabOpenedAt) : undefined,
      tabClosedAt: raw.tabClosedAt ? new Date(raw.tabClosedAt) : undefined,
      preauthId: raw.preauthId ?? undefined,
    };
  }

  private mapSelection(raw: any): Selection {
    return {
      guid: raw.id ?? raw.guid ?? crypto.randomUUID(),
      menuItemGuid: raw.menuItemId ?? '',
      menuItemName: raw.menuItemName || raw.name || '',
      quantity: Number(raw.quantity) || 1,
      unitPrice: Number(raw.unitPrice) || 0,
      totalPrice: Number(raw.totalPrice) || 0,
      fulfillmentStatus: raw.fulfillmentStatus ?? 'NEW',
      modifiers: (raw.modifiers || []).map((m: any) => ({
        guid: m.id ?? crypto.randomUUID(),
        name: m.name ?? '',
        priceAdjustment: Number(m.priceAdjustment) || 0,
      })),
      seatNumber: raw.seatNumber == null ? undefined : Number(raw.seatNumber),
      specialInstructions: raw.specialInstructions,
      isComped: raw.isComped ?? false,
      compReason: raw.compReason ?? undefined,
      compBy: raw.compBy ?? undefined,
    };
  }
}
