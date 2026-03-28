import { Injectable, computed, inject, signal } from '@angular/core';
import {
  DeliveryProviderType,
  DeliveryProvider,
  DeliveryContext,
  DeliveryQuote,
  DeliveryDispatchResult,
  DeliveryDriverInfo,
  DoorDashCredentialPayload,
  UberCredentialPayload,
  DeliveryCredentialSummary,
  DeliveryCredentialSecurityMode,
  DeliveryCredentialSecurityProfile,
  MarketplaceProviderType,
  MarketplaceIntegrationsResponse,
  MarketplaceIntegrationSummary,
  MarketplaceIntegrationUpdatePayload,
  MarketplaceMenuMappingsResponse,
  MarketplaceMenuMapping,
  MarketplaceMenuMappingUpsertPayload,
  MarketplaceSyncJobState,
  MarketplaceStatusSyncJobSummary,
  MarketplaceStatusSyncJobsResponse,
  Order,
  Driver,
  DriverFormData,
  DriverStatus,
  DeliveryAssignment,
  DeliveryAssignmentStatus,
  DeliveryTrackingInfo,
  DeliveryAnalyticsReport,
  DeliveryDispatchStatus,
} from '../models';
import { AuthService } from './auth';
import { SocketService, DeliveryLocationEvent } from './socket';
import { environment } from '../environments/environment';
import { DoorDashDeliveryProvider } from './providers/doordash-provider';
import { UberDeliveryProvider } from './providers/uber-provider';

export interface DeliveryConfigStatus {
  doordash: boolean;
  uber: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DeliveryService {
  private readonly authService = inject(AuthService);
  private readonly socketService = inject(SocketService);
  private readonly apiUrl = environment.apiUrl;

  private provider: DeliveryProvider | null = null;

  private readonly _providerType = signal<DeliveryProviderType>('none');
  private readonly _isProcessing = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentQuote = signal<DeliveryQuote | null>(null);
  private readonly _driverInfo = signal<DeliveryDriverInfo | null>(null);
  private readonly _configStatus = signal<DeliveryConfigStatus | null>(null);
  private readonly _credentialsSummary = signal<DeliveryCredentialSummary | null>(null);
  private readonly _credentialSecurityProfile = signal<DeliveryCredentialSecurityProfile | null>(null);
  private readonly _marketplaceIntegrations = signal<MarketplaceIntegrationSummary[]>([]);
  private readonly _marketplaceMenuMappings = signal<MarketplaceMenuMapping[]>([]);
  private readonly _marketplaceStatusSyncJobs = signal<MarketplaceStatusSyncJobSummary[]>([]);

  readonly providerType = this._providerType.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentQuote = this._currentQuote.asReadonly();
  readonly driverInfo = this._driverInfo.asReadonly();
  readonly configStatus = this._configStatus.asReadonly();
  readonly credentialsSummary = this._credentialsSummary.asReadonly();
  readonly credentialSecurityProfile = this._credentialSecurityProfile.asReadonly();
  readonly marketplaceIntegrations = this._marketplaceIntegrations.asReadonly();
  readonly marketplaceMenuMappings = this._marketplaceMenuMappings.asReadonly();
  readonly marketplaceStatusSyncJobs = this._marketplaceStatusSyncJobs.asReadonly();
  readonly selectedProviderConfigured = computed(() =>
    this.isProviderConfiguredFor(this._providerType())
  );

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  private get deliveryContext(): DeliveryContext | null {
    if (!this.merchantId) return null;
    return { merchantId: this.merchantId, apiUrl: this.apiUrl };
  }

  setProviderType(type: DeliveryProviderType): void {
    if (this._providerType() === type && this.provider !== null) return;

    this.provider?.destroy();
    this.provider = null;
    this._providerType.set(type);

    switch (type) {
      case 'doordash':
        this.provider = new DoorDashDeliveryProvider();
        break;
      case 'uber':
        this.provider = new UberDeliveryProvider();
        break;
      case 'self':
      case 'none':
        break;
    }
  }

  isConfigured(): boolean {
    return this.provider !== null && this._providerType() !== 'none' && this._providerType() !== 'self';
  }

  isProviderConfiguredFor(type: DeliveryProviderType): boolean {
    const status = this._configStatus();
    if (!status) return false;
    if (type === 'doordash') return status.doordash;
    if (type === 'uber') return status.uber;
    return false;
  }

  async loadConfigStatus(): Promise<DeliveryConfigStatus | null> {
    if (!this.merchantId) return null;

    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/config-status`,
        { headers: this.buildAuthHeaders() },
      );
      if (response.ok) {
        const status: DeliveryConfigStatus = await response.json();
        this._configStatus.set(status);
        return status;
      }
      return this._configStatus();
    } catch {
      // Config status unavailable — non-critical
      return this._configStatus();
    }
  }

  async ensureSelectedProviderConfigured(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    if (this.isProviderConfiguredFor(this._providerType())) return true;
    const status = await this.loadConfigStatus();
    if (!status) return false;
    return this.isProviderConfiguredFor(this._providerType());
  }

  async loadCredentialSummary(): Promise<DeliveryCredentialSummary | null> {
    if (!this.merchantId) return null;

    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/credentials`,
        { headers: this.buildAuthHeaders() },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to load delivery credentials'));
        return null;
      }
      const summary = await response.json() as DeliveryCredentialSummary;
      this.applyCredentialSummary(summary);
      return summary;
    } catch {
      this._error.set('Failed to load delivery credentials');
      return null;
    }
  }

  async loadCredentialSecurityProfile(): Promise<DeliveryCredentialSecurityProfile | null> {
    if (!this.merchantId) return null;

    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/credentials/security-profile`,
        { headers: this.buildAuthHeaders() },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to load credential security profile'));
        return null;
      }
      const profile = await response.json() as DeliveryCredentialSecurityProfile;
      this._credentialSecurityProfile.set(profile);
      return profile;
    } catch {
      this._error.set('Failed to load credential security profile');
      return null;
    }
  }

  async saveCredentialSecurityProfile(mode: DeliveryCredentialSecurityMode): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/credentials/security-profile`,
        {
          method: 'PUT',
          headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ mode }),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to save credential security profile'));
        return false;
      }
      const profile = await response.json() as DeliveryCredentialSecurityProfile;
      this._credentialSecurityProfile.set(profile);
      return true;
    } catch {
      this._error.set('Failed to save credential security profile');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async saveDoorDashCredentials(payload: DoorDashCredentialPayload): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/credentials/doordash`,
        {
          method: 'PUT',
          headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to save DoorDash credentials'));
        return false;
      }
      const summary = await response.json() as DeliveryCredentialSummary;
      this.applyCredentialSummary(summary);
      return true;
    } catch {
      this._error.set('Failed to save DoorDash credentials');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async saveUberCredentials(payload: UberCredentialPayload): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/credentials/uber`,
        {
          method: 'PUT',
          headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to save Uber credentials'));
        return false;
      }
      const summary = await response.json() as DeliveryCredentialSummary;
      this.applyCredentialSummary(summary);
      return true;
    } catch {
      this._error.set('Failed to save Uber credentials');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async deleteDoorDashCredentials(): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/credentials/doordash`,
        {
          method: 'DELETE',
          headers: this.buildAuthHeaders(),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to delete DoorDash credentials'));
        return false;
      }
      const summary = await response.json() as DeliveryCredentialSummary;
      this.applyCredentialSummary(summary);
      return true;
    } catch {
      this._error.set('Failed to delete DoorDash credentials');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async deleteUberCredentials(): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/credentials/uber`,
        {
          method: 'DELETE',
          headers: this.buildAuthHeaders(),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to delete Uber credentials'));
        return false;
      }
      const summary = await response.json() as DeliveryCredentialSummary;
      this.applyCredentialSummary(summary);
      return true;
    } catch {
      this._error.set('Failed to delete Uber credentials');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async loadMarketplaceIntegrations(): Promise<MarketplaceIntegrationSummary[] | null> {
    if (!this.merchantId) return null;

    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/marketplace/integrations`,
        { headers: this.buildAuthHeaders() },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to load marketplace integrations'));
        return null;
      }
      const body = await response.json() as MarketplaceIntegrationsResponse;
      this._marketplaceIntegrations.set(body.integrations ?? []);
      return this._marketplaceIntegrations();
    } catch {
      this._error.set('Failed to load marketplace integrations');
      return null;
    }
  }

  async updateMarketplaceIntegration(
    provider: MarketplaceProviderType,
    payload: MarketplaceIntegrationUpdatePayload,
  ): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/marketplace/integrations/${provider}`,
        {
          method: 'PUT',
          headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to update marketplace integration'));
        return false;
      }
      const summary = await response.json() as MarketplaceIntegrationSummary;
      this.upsertMarketplaceIntegrationSummary(summary);
      return true;
    } catch {
      this._error.set('Failed to update marketplace integration');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async clearMarketplaceIntegrationSecret(provider: MarketplaceProviderType): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/marketplace/integrations/${provider}/secret`,
        {
          method: 'DELETE',
          headers: this.buildAuthHeaders(),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to clear marketplace integration secret'));
        return false;
      }
      const summary = await response.json() as MarketplaceIntegrationSummary;
      this.upsertMarketplaceIntegrationSummary(summary);
      return true;
    } catch {
      this._error.set('Failed to clear marketplace integration secret');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async loadMarketplaceMenuMappings(provider?: MarketplaceProviderType): Promise<MarketplaceMenuMapping[] | null> {
    if (!this.merchantId) return null;

    try {
      const query = provider ? `?provider=${encodeURIComponent(provider)}` : '';
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/marketplace/menu-mappings${query}`,
        { headers: this.buildAuthHeaders() },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to load marketplace menu mappings'));
        return null;
      }
      const body = await response.json() as MarketplaceMenuMappingsResponse;
      this._marketplaceMenuMappings.set(body.mappings ?? []);
      return this._marketplaceMenuMappings();
    } catch {
      this._error.set('Failed to load marketplace menu mappings');
      return null;
    }
  }

  async upsertMarketplaceMenuMapping(payload: MarketplaceMenuMappingUpsertPayload): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/marketplace/menu-mappings`,
        {
          method: 'POST',
          headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to save marketplace menu mapping'));
        return false;
      }
      const mapping = await response.json() as MarketplaceMenuMapping;
      this.upsertMarketplaceMenuMappingSummary(mapping);
      return true;
    } catch {
      this._error.set('Failed to save marketplace menu mapping');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async deleteMarketplaceMenuMapping(mappingId: string): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/marketplace/menu-mappings/${mappingId}`,
        {
          method: 'DELETE',
          headers: this.buildAuthHeaders(),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to delete marketplace menu mapping'));
        return false;
      }
      this._marketplaceMenuMappings.update((entries) => entries.filter((entry) => entry.id !== mappingId));
      return true;
    } catch {
      this._error.set('Failed to delete marketplace menu mapping');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async loadMarketplaceStatusSyncJobs(options?: {
    status?: MarketplaceSyncJobState;
    limit?: number;
  }): Promise<MarketplaceStatusSyncJobSummary[] | null> {
    if (!this.merchantId) return null;

    try {
      const params = new URLSearchParams();
      if (options?.status) params.set('status', options.status);
      if (options?.limit) params.set('limit', String(options.limit));
      const query = params.toString();

      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/marketplace/status-sync/jobs${query ? '?' + query : ''}`,
        { headers: this.buildAuthHeaders() },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to load marketplace sync jobs'));
        return null;
      }

      const body = await response.json() as MarketplaceStatusSyncJobsResponse;
      this._marketplaceStatusSyncJobs.set(body.jobs ?? []);
      return this._marketplaceStatusSyncJobs();
    } catch {
      this._error.set('Failed to load marketplace sync jobs');
      return null;
    }
  }

  async retryMarketplaceStatusSyncJob(jobId: string): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/marketplace/status-sync/jobs/${jobId}/retry`,
        {
          method: 'POST',
          headers: this.buildAuthHeaders(),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to retry marketplace sync job'));
        return false;
      }

      const summary = await response.json() as MarketplaceStatusSyncJobSummary;
      this.upsertMarketplaceStatusSyncJobSummary(summary);
      return true;
    } catch {
      this._error.set('Failed to retry marketplace sync job');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async processMarketplaceStatusSyncJobs(limit = 20): Promise<boolean> {
    if (!this.merchantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/marketplace/status-sync/process`,
        {
          method: 'POST',
          headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ limit }),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to process marketplace sync jobs'));
        return false;
      }
      return true;
    } catch {
      this._error.set('Failed to process marketplace sync jobs');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async retryMarketplaceSyncForOrder(order: Order): Promise<boolean> {
    const marketplace = order.marketplace;
    if (!marketplace) {
      this._error.set('Order is not linked to a marketplace source');
      return false;
    }

    const deadLetterJobs = await this.loadMarketplaceStatusSyncJobs({
      status: 'DEAD_LETTER',
      limit: 200,
    });
    if (deadLetterJobs === null) return false;

    let candidates = deadLetterJobs.filter(job =>
      job.externalOrderId === marketplace.externalOrderId
    );

    if (candidates.length === 0) {
      const failedJobs = await this.loadMarketplaceStatusSyncJobs({
        status: 'FAILED',
        limit: 200,
      });
      if (failedJobs === null) return false;
      candidates = failedJobs.filter(job =>
        job.externalOrderId === marketplace.externalOrderId
      );
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const retried = await this.retryMarketplaceStatusSyncJob(candidates[0].id);
      if (!retried) return false;
    }

    return this.processMarketplaceStatusSyncJobs(25);
  }

  async requestQuote(orderId: string): Promise<DeliveryQuote | null> {
    if (!this.provider || !this.deliveryContext) {
      this._error.set('Delivery provider not configured');
      return null;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      const quote = await this.provider.requestQuote(orderId, this.deliveryContext);
      this._currentQuote.set(quote);
      return quote;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get delivery quote';
      this._error.set(message);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async acceptQuote(orderId: string, quoteId: string): Promise<DeliveryDispatchResult | null> {
    if (!this.provider || !this.deliveryContext) {
      this._error.set('Delivery provider not configured');
      return null;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      const result = await this.provider.acceptQuote(orderId, quoteId, this.deliveryContext);
      this._currentQuote.set(null);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to dispatch driver';
      this._error.set(message);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async cancelDelivery(orderId: string, deliveryExternalId: string): Promise<boolean> {
    if (!this.provider || !this.deliveryContext) return false;

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      return await this.provider.cancelDelivery(orderId, deliveryExternalId, this.deliveryContext);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel delivery';
      this._error.set(message);
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async getDeliveryStatus(orderId: string, deliveryExternalId: string): Promise<DeliveryDriverInfo | null> {
    if (!this.provider || !this.deliveryContext) return null;

    try {
      const info = await this.provider.getStatus(orderId, deliveryExternalId, this.deliveryContext);
      this._driverInfo.set(info);
      return info;
    } catch {
      return null;
    }
  }

  updateDriverInfo(info: DeliveryDriverInfo): void {
    this._driverInfo.set(info);
  }

  reset(): void {
    // Keep the configured provider; reset is for transient order-level state.
    this._isProcessing.set(false);
    this._error.set(null);
    this._currentQuote.set(null);
    this._driverInfo.set(null);
  }

  clearError(): void {
    this._error.set(null);
  }

  private applyCredentialSummary(summary: DeliveryCredentialSummary): void {
    this._credentialSecurityProfile.set(summary.securityProfile ?? null);
    this._credentialsSummary.set(summary);
    this._configStatus.set({
      doordash: summary.doordash.configured,
      uber: summary.uber.configured,
    });
  }

  private upsertMarketplaceIntegrationSummary(summary: MarketplaceIntegrationSummary): void {
    const next = [...this._marketplaceIntegrations()];
    const index = next.findIndex((entry) => entry.provider === summary.provider);
    if (index >= 0) {
      next[index] = summary;
    } else {
      next.push(summary);
    }
    next.sort((a, b) => a.provider.localeCompare(b.provider));
    this._marketplaceIntegrations.set(next);
  }

  private upsertMarketplaceMenuMappingSummary(summary: MarketplaceMenuMapping): void {
    const next = [...this._marketplaceMenuMappings()];
    const index = next.findIndex((entry) => entry.id === summary.id);
    if (index >= 0) {
      next[index] = summary;
    } else {
      next.push(summary);
    }
    next.sort((a, b) => {
      if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
      return a.externalItemId.localeCompare(b.externalItemId);
    });
    this._marketplaceMenuMappings.set(next);
  }

  private upsertMarketplaceStatusSyncJobSummary(summary: MarketplaceStatusSyncJobSummary): void {
    const next = [...this._marketplaceStatusSyncJobs()];
    const index = next.findIndex((entry) => entry.id === summary.id);
    if (index >= 0) {
      next[index] = summary;
    } else {
      next.push(summary);
    }
    next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    this._marketplaceStatusSyncJobs.set(next);
  }

  private buildAuthHeaders(extra: Record<string, string> = {}): HeadersInit {
    const headers: Record<string, string> = { ...extra };
    const token = this.authService.token();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async readErrorMessage(response: Response, fallback: string): Promise<string> {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      try {
        const body = await response.json() as { error?: string };
        return body.error ?? fallback;
      } catch {
        return fallback;
      }
    }
    try {
      const text = await response.text();
      return text ?? fallback;
    } catch {
      return fallback;
    }
  }

  // ============ In-House Driver Management (GAP-R08) ============

  private readonly _drivers = signal<Driver[]>([]);
  private readonly _activeAssignments = signal<DeliveryAssignment[]>([]);
  private readonly _isLoadingDrivers = signal(false);

  readonly drivers = this._drivers.asReadonly();
  readonly activeAssignments = this._activeAssignments.asReadonly();
  readonly isLoadingDrivers = this._isLoadingDrivers.asReadonly();

  readonly availableDrivers = computed(() =>
    this._drivers().filter(d => d.status === 'available')
  );

  readonly assignedDrivers = computed(() =>
    this._drivers().filter(d => d.status !== 'available' && d.status !== 'offline')
  );

  readonly inTransitAssignments = computed(() =>
    this._activeAssignments().filter(a => a.status === 'en_route')
  );

  async loadDrivers(): Promise<void> {
    this._isLoadingDrivers.set(true);
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/drivers`,
        { headers: this.buildAuthHeaders() }
      );
      if (response.ok) {
        const data = await response.json();
        this._drivers.set(data.drivers ?? data ?? []);
      }
    } catch {
      // Silent — drivers list is supplementary
    } finally {
      this._isLoadingDrivers.set(false);
    }
  }

  async createDriver(data: DriverFormData): Promise<Driver | null> {
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/drivers`,
        { method: 'POST', headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(data) }
      );
      if (response.ok) {
        const driver = await response.json();
        this._drivers.update(list => [...list, driver]);
        return driver;
      }
    } catch {
      // handled by caller
    }
    return null;
  }

  async updateDriver(id: string, data: Partial<DriverFormData>): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/drivers/${id}`,
        { method: 'PATCH', headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(data) }
      );
      if (response.ok) {
        const updated = await response.json();
        this._drivers.update(list => list.map(d => d.id === id ? updated : d));
        return true;
      }
    } catch {
      // handled by caller
    }
    return false;
  }

  async deleteDriver(id: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/drivers/${id}`,
        { method: 'DELETE', headers: this.buildAuthHeaders() }
      );
      if (response.ok) {
        this._drivers.update(list => list.filter(d => d.id !== id));
        return true;
      }
    } catch {
      // handled by caller
    }
    return false;
  }

  async setDriverStatus(id: string, status: DriverStatus): Promise<void> {
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/drivers/${id}/status`,
        { method: 'PATCH', headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ status }) }
      );
      if (response.ok) {
        this._drivers.update(list => list.map(d => d.id === id ? { ...d, status } : d));
      }
    } catch {
      // Silent
    }
  }

  async assignOrderToDriver(orderId: string, driverId: string): Promise<DeliveryAssignment | null> {
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/assign`,
        { method: 'POST', headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ orderId, driverId }) }
      );
      if (response.ok) {
        const assignment: DeliveryAssignment = await response.json();
        this._activeAssignments.update(list => [...list, assignment]);
        this._drivers.update(list => list.map(d =>
          d.id === driverId ? { ...d, status: 'assigned' as DriverStatus, currentOrderId: orderId } : d
        ));
        return assignment;
      }
    } catch {
      // handled by caller
    }
    return null;
  }

  async updateAssignmentStatus(assignmentId: string, status: DeliveryAssignmentStatus): Promise<void> {
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/assignments/${assignmentId}/status`,
        { method: 'PATCH', headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ status }) }
      );
      if (response.ok) {
        this._activeAssignments.update(list =>
          list.map(a => a.id === assignmentId ? { ...a, status } : a)
        );
      }
    } catch {
      // Silent
    }
  }

  async loadActiveAssignments(): Promise<void> {
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/assignments?active=true`,
        { headers: this.buildAuthHeaders() }
      );
      if (response.ok) {
        const data = await response.json();
        this._activeAssignments.set(data.assignments ?? data ?? []);
      }
    } catch {
      // Silent
    }
  }

  getAssignmentForOrder(orderId: string): DeliveryAssignment | undefined {
    return this._activeAssignments().find(a => a.orderId === orderId);
  }

  getDriverById(driverId: string): Driver | undefined {
    return this._drivers().find(d => d.id === driverId);
  }

  // ============ Real-Time Delivery Tracking (GAP-R08 Phase 2) ============

  private readonly _trackingOrders = signal<Map<string, DeliveryTrackingInfo>>(new Map());
  private readonly _deliveryAnalytics = signal<DeliveryAnalyticsReport | null>(null);
  private readonly _isLoadingAnalytics = signal(false);
  private readonly trackingPollingIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private locationUnsubscribe: (() => void) | null = null;

  readonly trackingOrders = this._trackingOrders.asReadonly();
  readonly deliveryAnalytics = this._deliveryAnalytics.asReadonly();
  readonly isLoadingAnalytics = this._isLoadingAnalytics.asReadonly();

  readonly activeTrackingCount = computed(() => {
    let count = 0;
    for (const info of this._trackingOrders().values()) {
      if (info.status !== 'DELIVERED' && info.status !== 'CANCELLED' && info.status !== 'FAILED') {
        count++;
      }
    }
    return count;
  });

  getTrackingForOrder(orderId: string): DeliveryTrackingInfo | undefined {
    return this._trackingOrders().get(orderId);
  }

  startTrackingDelivery(orderId: string, deliveryExternalId: string, provider: DeliveryProviderType): void {
    const initial: DeliveryTrackingInfo = {
      orderId,
      deliveryExternalId,
      provider,
      status: 'DISPATCH_REQUESTED',
      driver: null,
      trackingUrl: null,
      estimatedDeliveryAt: null,
      lastUpdatedAt: new Date().toISOString(),
    };
    this._trackingOrders.update(map => {
      const next = new Map(map);
      next.set(orderId, initial);
      return next;
    });

    // Subscribe to socket location events if not already
    this.locationUnsubscribe ??= this.socketService.onDeliveryLocationEvent(
      (event: DeliveryLocationEvent) => this.handleLocationUpdate(event)
    );

    // Poll delivery status every 30 seconds
    const interval = setInterval(() => {
      void this.pollDeliveryStatus(orderId, deliveryExternalId);
    }, 30000);
    this.trackingPollingIntervals.set(orderId, interval);

    // Fetch initial status
    void this.pollDeliveryStatus(orderId, deliveryExternalId);
  }

  stopTrackingDelivery(orderId: string): void {
    const interval = this.trackingPollingIntervals.get(orderId);
    if (interval) {
      clearInterval(interval);
      this.trackingPollingIntervals.delete(orderId);
    }
    this._trackingOrders.update(map => {
      const next = new Map(map);
      next.delete(orderId);
      return next;
    });

    // Clean up socket listener if no more tracked orders
    if (this.trackingPollingIntervals.size === 0 && this.locationUnsubscribe) {
      this.locationUnsubscribe();
      this.locationUnsubscribe = null;
    }
  }

  stopAllTracking(): void {
    for (const [, interval] of this.trackingPollingIntervals) {
      clearInterval(interval);
    }
    this.trackingPollingIntervals.clear();
    this._trackingOrders.set(new Map());
    if (this.locationUnsubscribe) {
      this.locationUnsubscribe();
      this.locationUnsubscribe = null;
    }
  }

  private async pollDeliveryStatus(orderId: string, deliveryExternalId: string): Promise<void> {
    const info = await this.getDeliveryStatus(orderId, deliveryExternalId);
    if (!info) return;

    this._trackingOrders.update(map => {
      const existing = map.get(orderId);
      if (!existing) return map;
      const next = new Map(map);
      const status = this.inferDispatchStatus(info);
      next.set(orderId, {
        ...existing,
        driver: info,
        status,
        estimatedDeliveryAt: info.estimatedDeliveryAt ?? existing.estimatedDeliveryAt,
        lastUpdatedAt: new Date().toISOString(),
      });
      return next;
    });

    // Auto-stop tracking when delivered
    const updated = this._trackingOrders().get(orderId);
    if (updated && (updated.status === 'DELIVERED' || updated.status === 'CANCELLED')) {
      this.stopTrackingDelivery(orderId);
    }
  }

  private handleLocationUpdate(event: DeliveryLocationEvent): void {
    this._trackingOrders.update(map => {
      const existing = map.get(event.orderId);
      if (!existing) return map;
      const next = new Map(map);
      next.set(event.orderId, {
        ...existing,
        driver: {
          ...existing.driver,
          location: { lat: event.lat, lng: event.lng },
        },
        estimatedDeliveryAt: event.estimatedDeliveryAt ?? existing.estimatedDeliveryAt,
        lastUpdatedAt: new Date().toISOString(),
      });
      return next;
    });
  }

  private inferDispatchStatus(info: DeliveryDriverInfo): DeliveryDispatchStatus {
    if (!info.name && !info.phone) return 'DISPATCH_REQUESTED';
    if (info.location) return 'DRIVER_EN_ROUTE_TO_DROPOFF';
    return 'DRIVER_ASSIGNED';
  }

  // ============ Delivery Analytics (GAP-R08 Phase 2) ============

  async loadDeliveryAnalytics(dateFrom: string, dateTo: string): Promise<DeliveryAnalyticsReport | null> {
    if (!this.merchantId) return null;

    this._isLoadingAnalytics.set(true);
    try {
      const response = await fetch(
        `${this.apiUrl}/merchant/${this.merchantId}/delivery/analytics?from=${encodeURIComponent(dateFrom)}&to=${encodeURIComponent(dateTo)}`,
        { headers: this.buildAuthHeaders() }
      );
      if (response.ok) {
        const report = await response.json() as DeliveryAnalyticsReport;
        this._deliveryAnalytics.set(report);
        return report;
      }
      // Fallback: generate from local assignments
      return this.generateLocalAnalytics(dateFrom, dateTo);
    } catch {
      return this.generateLocalAnalytics(dateFrom, dateTo);
    } finally {
      this._isLoadingAnalytics.set(false);
    }
  }

  private generateLocalAnalytics(dateFrom: string, dateTo: string): DeliveryAnalyticsReport {
    const completed = this._activeAssignments().filter(a => a.status === 'delivered');
    const totalDeliveries = completed.length;

    const driverMap = new Map<string, DeliveryAssignment[]>();
    for (const a of completed) {
      const list = driverMap.get(a.driverId) ?? [];
      list.push(a);
      driverMap.set(a.driverId, list);
    }

    let totalMinutes = 0;
    let onTimeTotal = 0;
    const byDriver = [...driverMap.entries()].map(([driverId, deliveries]) => {
      const stats = this.calculateDriverStats(driverId, deliveries);
      totalMinutes += stats.totalMinutes;
      onTimeTotal += stats.onTimeCount;
      return stats.entry;
    });

    const avgDeliveryMinutes = totalDeliveries > 0 ? Math.round(totalMinutes / totalDeliveries) : 0;
    const onTimePercentage = totalDeliveries > 0 ? Math.round((onTimeTotal / totalDeliveries) * 100) : 0;

    const report: DeliveryAnalyticsReport = {
      dateFrom,
      dateTo,
      totalDeliveries,
      avgDeliveryMinutes,
      onTimePercentage,
      totalDeliveryFees: 0,
      costPerDelivery: 0,
      byDriver,
      byProvider: [{ provider: 'self', count: totalDeliveries, avgMinutes: avgDeliveryMinutes, onTimePercentage, totalFees: 0 }],
    };
    this._deliveryAnalytics.set(report);
    return report;
  }

  private calculateDriverStats(driverId: string, deliveries: DeliveryAssignment[]): {
    entry: DeliveryAnalyticsReport['byDriver'][number];
    totalMinutes: number;
    onTimeCount: number;
  } {
    const driver = this.getDriverById(driverId);
    let totalMinutes = 0;
    let onTime = 0;
    let distance = 0;

    for (const d of deliveries) {
      const minutes = d.estimatedDeliveryMinutes ?? 30;
      totalMinutes += minutes;
      if (d.deliveredAt && d.assignedAt) {
        const actual = (new Date(d.deliveredAt).getTime() - new Date(d.assignedAt).getTime()) / 60000;
        if (actual <= minutes) onTime++;
      }
      distance += d.distanceKm ?? 0;
    }

    return {
      entry: {
        driverId,
        driverName: driver?.name ?? 'Unknown',
        vehicleType: driver?.vehicleType ?? 'car',
        totalDeliveries: deliveries.length,
        onTimeCount: onTime,
        lateCount: deliveries.length - onTime,
        avgDeliveryMinutes: deliveries.length > 0 ? Math.round(totalMinutes / deliveries.length) : 0,
        totalDistanceKm: Math.round(distance * 10) / 10,
        totalFees: 0,
      },
      totalMinutes,
      onTimeCount: onTime,
    };
  }

  getDispatchStatusLabel(status: DeliveryDispatchStatus): string {
    const labels: Record<DeliveryDispatchStatus, string> = {
      QUOTED: 'Quoted',
      DISPATCH_REQUESTED: 'Dispatching...',
      DRIVER_ASSIGNED: 'Driver Assigned',
      DRIVER_EN_ROUTE_TO_PICKUP: 'En Route to Pickup',
      DRIVER_AT_PICKUP: 'At Pickup',
      PICKED_UP: 'Picked Up',
      DRIVER_EN_ROUTE_TO_DROPOFF: 'On the Way',
      DRIVER_AT_DROPOFF: 'Arriving',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
      FAILED: 'Failed',
    };
    return labels[status] ?? status;
  }

  getDispatchStatusClass(status: DeliveryDispatchStatus): string {
    switch (status) {
      case 'DELIVERED': return 'tracking-delivered';
      case 'CANCELLED':
      case 'FAILED': return 'tracking-failed';
      case 'DRIVER_EN_ROUTE_TO_DROPOFF':
      case 'DRIVER_AT_DROPOFF': return 'tracking-active';
      case 'PICKED_UP': return 'tracking-picked-up';
      case 'DRIVER_ASSIGNED':
      case 'DRIVER_EN_ROUTE_TO_PICKUP':
      case 'DRIVER_AT_PICKUP': return 'tracking-assigned';
      default: return 'tracking-pending';
    }
  }
}
