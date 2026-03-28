import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ProductListing,
  ProductListingFormData,
  EcommerceOrder,
  ShippingMethod,
  ShippingMethodFormData,
  StoreConfig,
  EcommerceFulfillmentStatus,
  ChannelSyncConfig,
  ChannelSyncConfigFormData,
  ChannelPriceOverride,
  SalePricing,
  SalePricingFormData,
  ChannelVisibilitySetting,
} from '../models/retail-ecommerce.model';
import { RetailItem } from '../models/retail.model';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RetailEcommerceService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  // Listings
  private readonly _listings = signal<ProductListing[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Orders
  private readonly _orders = signal<EcommerceOrder[]>([]);
  private readonly _isLoadingOrders = signal(false);

  // Shipping
  private readonly _shippingMethods = signal<ShippingMethod[]>([]);

  // Store config
  private readonly _storeConfig = signal<StoreConfig | null>(null);

  // Public catalog (for public storefront, loaded without auth)
  private readonly _publicItems = signal<RetailItem[]>([]);
  private readonly _isLoadingPublic = signal(false);

  // Read-only signals
  readonly listings = this._listings.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly orders = this._orders.asReadonly();
  readonly isLoadingOrders = this._isLoadingOrders.asReadonly();
  readonly shippingMethods = this._shippingMethods.asReadonly();
  readonly storeConfig = this._storeConfig.asReadonly();
  readonly publicItems = this._publicItems.asReadonly();
  readonly isLoadingPublic = this._isLoadingPublic.asReadonly();

  // Computeds
  readonly publishedListings = computed(() =>
    this._listings().filter(l => l.isPublished),
  );

  readonly pendingOrders = computed(() =>
    this._orders().filter(o => o.fulfillmentStatus === 'pending'),
  );

  readonly readyForPickupOrders = computed(() =>
    this._orders().filter(o => o.fulfillmentStatus === 'ready_for_pickup'),
  );

  readonly shippedOrders = computed(() =>
    this._orders().filter(o => o.fulfillmentStatus === 'shipped' || o.fulfillmentStatus === 'out_for_delivery'),
  );

  readonly activeShippingMethods = computed(() =>
    this._shippingMethods().filter(m => m.isActive),
  );

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  // --- Listings ---

  async loadListings(): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const listings = await firstValueFrom(
        this.http.get<ProductListing[]>(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/listings`),
      );
      this._listings.set(listings);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._listings.set([]);
      } else {
        this._error.set(err instanceof Error ? err.message : 'Failed to load listings');
      }
    } finally {
      this._isLoading.set(false);
    }
  }

  async createListing(data: ProductListingFormData): Promise<ProductListing | null> {
    if (!this.merchantId) return null;
    try {
      const listing = await firstValueFrom(
        this.http.post<ProductListing>(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/listings`, data),
      );
      this._listings.update(list => [...list, listing]);
      return listing;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to create listing');
      return null;
    }
  }

  async updateListing(id: string, data: Partial<ProductListingFormData>): Promise<void> {
    if (!this.merchantId) return;
    try {
      const updated = await firstValueFrom(
        this.http.put<ProductListing>(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/listings/${id}`, data),
      );
      this._listings.update(list => list.map(l => (l.id === id ? updated : l)));
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to update listing');
    }
  }

  async publishListing(id: string): Promise<void> {
    await this.updateListing(id, { isPublished: true } as Partial<ProductListingFormData>);
  }

  async unpublishListing(id: string): Promise<void> {
    await this.updateListing(id, { isPublished: false } as Partial<ProductListingFormData>);
  }

  async deleteListing(id: string): Promise<void> {
    if (!this.merchantId) return;
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/listings/${id}`),
      );
      this._listings.update(list => list.filter(l => l.id !== id));
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to delete listing');
    }
  }

  // --- Orders ---

  async loadOrders(): Promise<void> {
    if (!this.merchantId) return;
    this._isLoadingOrders.set(true);
    try {
      const orders = await firstValueFrom(
        this.http.get<EcommerceOrder[]>(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/orders`),
      );
      this._orders.set(orders);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._orders.set([]);
      } else {
        this._error.set(err instanceof Error ? err.message : 'Failed to load orders');
      }
    } finally {
      this._isLoadingOrders.set(false);
    }
  }

  async getOrder(id: string): Promise<EcommerceOrder | null> {
    if (!this.merchantId) return null;
    try {
      return await firstValueFrom(
        this.http.get<EcommerceOrder>(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/orders/${id}`),
      );
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load order');
      return null;
    }
  }

  async updateFulfillmentStatus(orderId: string, status: EcommerceFulfillmentStatus): Promise<void> {
    if (!this.merchantId) return;
    try {
      const updated = await firstValueFrom(
        this.http.patch<EcommerceOrder>(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/orders/${orderId}/fulfillment`, { status }),
      );
      this._orders.update(list => list.map(o => (o.id === orderId ? updated : o)));
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to update fulfillment status');
    }
  }

  async addTrackingNumber(orderId: string, trackingNumber: string, trackingUrl: string | null): Promise<void> {
    if (!this.merchantId) return;
    try {
      const updated = await firstValueFrom(
        this.http.patch<EcommerceOrder>(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/orders/${orderId}/tracking`, {
          trackingNumber,
          trackingUrl,
        }),
      );
      this._orders.update(list => list.map(o => (o.id === orderId ? updated : o)));
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to add tracking number');
    }
  }

  // --- Shipping Methods ---

  async loadShippingMethods(): Promise<void> {
    if (!this.merchantId) return;
    try {
      const methods = await firstValueFrom(
        this.http.get<ShippingMethod[]>(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/shipping-methods`),
      );
      this._shippingMethods.set(methods);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._shippingMethods.set([]);
      } else {
        this._error.set(err instanceof Error ? err.message : 'Failed to load shipping methods');
      }
    }
  }

  async createShippingMethod(data: ShippingMethodFormData): Promise<void> {
    if (!this.merchantId) return;
    try {
      const method = await firstValueFrom(
        this.http.post<ShippingMethod>(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/shipping-methods`, data),
      );
      this._shippingMethods.update(list => [...list, method]);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to create shipping method');
    }
  }

  async updateShippingMethod(id: string, data: Partial<ShippingMethodFormData>): Promise<void> {
    if (!this.merchantId) return;
    try {
      const updated = await firstValueFrom(
        this.http.put<ShippingMethod>(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/shipping-methods/${id}`, data),
      );
      this._shippingMethods.update(list => list.map(m => (m.id === id ? updated : m)));
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to update shipping method');
    }
  }

  async deleteShippingMethod(id: string): Promise<void> {
    if (!this.merchantId) return;
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/shipping-methods/${id}`),
      );
      this._shippingMethods.update(list => list.filter(m => m.id !== id));
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to delete shipping method');
    }
  }

  // --- Store Config ---

  async loadStoreConfig(storeSlug: string): Promise<StoreConfig | null> {
    this._isLoadingPublic.set(true);
    try {
      const config = await firstValueFrom(
        this.http.get<StoreConfig>(`${this.apiUrl}/retail/ecommerce/store/${storeSlug}/config`),
      );
      this._storeConfig.set(config);
      return config;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Store not found');
      return null;
    } finally {
      this._isLoadingPublic.set(false);
    }
  }

  // --- Public Catalog (no auth) ---

  async loadPublicCatalog(storeSlug: string): Promise<void> {
    this._isLoadingPublic.set(true);
    try {
      const items = await firstValueFrom(
        this.http.get<RetailItem[]>(`${this.apiUrl}/retail/ecommerce/store/${storeSlug}/catalog`),
      );
      this._publicItems.set(items);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load catalog');
    } finally {
      this._isLoadingPublic.set(false);
    }
  }

  // --- Public Order Submission (no auth) ---

  async submitOrder(storeSlug: string, orderData: {
    items: { itemId: string; variationId: string | null; quantity: number }[];
    customerEmail: string;
    customerName: string;
    fulfillmentType: string;
    shippingAddress: Record<string, string> | null;
    shippingMethodId: string | null;
    paymentMethodId: string;
  }): Promise<EcommerceOrder | null> {
    try {
      return await firstValueFrom(
        this.http.post<EcommerceOrder>(`${this.apiUrl}/retail/ecommerce/store/${storeSlug}/orders`, orderData),
      );
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to submit order');
      return null;
    }
  }

  // --- Fulfillment Actions ---

  async markReadyForPickup(orderId: string): Promise<void> {
    await this.updateFulfillmentStatus(orderId, 'ready_for_pickup');
  }

  async markShipped(orderId: string, trackingNumber?: string): Promise<void> {
    if (trackingNumber) {
      await this.addTrackingNumber(orderId, trackingNumber, null);
    }
    await this.updateFulfillmentStatus(orderId, 'shipped');
  }

  async markDelivered(orderId: string): Promise<void> {
    await this.updateFulfillmentStatus(orderId, 'delivered');
  }

  // --- Channel Sync (Phase 3) ---

  private readonly _syncConfig = signal<ChannelSyncConfig | null>(null);
  private readonly _priceOverrides = signal<ChannelPriceOverride[]>([]);
  private readonly _salePricings = signal<SalePricing[]>([]);
  private readonly _channelVisibility = signal<ChannelVisibilitySetting[]>([]);

  readonly syncConfig = this._syncConfig.asReadonly();
  readonly priceOverrides = this._priceOverrides.asReadonly();
  readonly salePricings = this._salePricings.asReadonly();
  readonly channelVisibility = this._channelVisibility.asReadonly();

  readonly activeSales = computed(() =>
    this._salePricings().filter(s => s.isActive),
  );

  async loadSyncConfig(): Promise<void> {
    if (!this.merchantId) return;
    try {
      const config = await firstValueFrom(
        this.http.get<ChannelSyncConfig>(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/channel-sync/config`),
      );
      this._syncConfig.set(config);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._syncConfig.set(null);
      } else {
        this._error.set(err instanceof Error ? err.message : 'Failed to load sync config');
      }
    }
  }

  async saveSyncConfig(data: ChannelSyncConfigFormData): Promise<void> {
    if (!this.merchantId) return;
    try {
      const config = await firstValueFrom(
        this.http.put<ChannelSyncConfig>(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/channel-sync/config`, data),
      );
      this._syncConfig.set(config);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to save sync config');
    }
  }

  async loadPriceOverrides(): Promise<void> {
    if (!this.merchantId) return;
    try {
      const overrides = await firstValueFrom(
        this.http.get<ChannelPriceOverride[]>(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/channel-sync/price-overrides`),
      );
      this._priceOverrides.set(overrides);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._priceOverrides.set([]);
      } else {
        this._error.set(err instanceof Error ? err.message : 'Failed to load price overrides');
      }
    }
  }

  async savePriceOverride(override: ChannelPriceOverride): Promise<void> {
    if (!this.merchantId) return;
    try {
      await firstValueFrom(
        this.http.put(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/channel-sync/price-overrides`, override),
      );
      this._priceOverrides.update(list => {
        const idx = list.findIndex(
          o => o.itemId === override.itemId && o.variationId === override.variationId && o.channel === override.channel,
        );
        if (idx >= 0) {
          return list.map((o, i) => (i === idx ? override : o));
        }
        return [...list, override];
      });
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to save price override');
    }
  }

  async loadSalePricings(): Promise<void> {
    if (!this.merchantId) return;
    try {
      const sales = await firstValueFrom(
        this.http.get<SalePricing[]>(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/channel-sync/sale-pricing`),
      );
      this._salePricings.set(sales);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._salePricings.set([]);
      } else {
        this._error.set(err instanceof Error ? err.message : 'Failed to load sale pricing');
      }
    }
  }

  async createSalePricing(data: SalePricingFormData): Promise<void> {
    if (!this.merchantId) return;
    try {
      const sale = await firstValueFrom(
        this.http.post<SalePricing>(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/channel-sync/sale-pricing`, data),
      );
      this._salePricings.update(list => [...list, sale]);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to create sale pricing');
    }
  }

  async deleteSalePricing(id: string): Promise<void> {
    if (!this.merchantId) return;
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/channel-sync/sale-pricing/${id}`),
      );
      this._salePricings.update(list => list.filter(s => s.id !== id));
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to delete sale pricing');
    }
  }

  async loadChannelVisibility(): Promise<void> {
    if (!this.merchantId) return;
    try {
      const visibility = await firstValueFrom(
        this.http.get<ChannelVisibilitySetting[]>(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/channel-sync/visibility`),
      );
      this._channelVisibility.set(visibility);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._channelVisibility.set([]);
      } else {
        this._error.set(err instanceof Error ? err.message : 'Failed to load channel visibility');
      }
    }
  }

  async updateChannelVisibility(setting: ChannelVisibilitySetting): Promise<void> {
    if (!this.merchantId) return;
    try {
      await firstValueFrom(
        this.http.put(`${this.apiUrl}/merchant/${this.merchantId}/retail/ecommerce/channel-sync/visibility`, setting),
      );
      this._channelVisibility.update(list => {
        const idx = list.findIndex(
          v => v.itemId === setting.itemId && v.variationId === setting.variationId,
        );
        if (idx >= 0) {
          return list.map((v, i) => (i === idx ? setting : v));
        }
        return [...list, setting];
      });
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to update visibility');
    }
  }
}
