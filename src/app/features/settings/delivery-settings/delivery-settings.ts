import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { DeliveryService } from '../../../services/delivery';
import { AuthService } from '../../../services/auth';
import { MenuService } from '../../../services/menu';
import {
  DeliveryProviderType,
  DeliveryProviderMode,
  DeliverySettings,
  DeliveryCredentialSecurityMode,
  DoorDashCredentialPayload,
  UberCredentialPayload,
  MenuItem,
  MarketplaceProviderType,
  MarketplaceIntegrationSummary,
  MarketplaceIntegrationUpdatePayload,
  MarketplaceMenuMapping,
  MarketplaceMenuMappingUpsertPayload,
  Driver,
  DriverFormData,
  DriverStatus,
  VehicleType,
  DeliveryDispatchConfig,
  defaultDeliveryDispatchConfig,
} from '@models/index';

@Component({
  selector: 'os-delivery-settings',
  imports: [],
  templateUrl: './delivery-settings.html',
  styleUrl: './delivery-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliverySettingsComponent implements OnInit {
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly authService = inject(AuthService);
  private readonly menuService = inject(MenuService);

  private readonly _provider = signal<DeliveryProviderType>('none');
  private readonly _autoDispatch = signal(false);
  private readonly _showQuotes = signal(true);
  private readonly _defaultTip = signal(15);
  private readonly _saved = signal(false);

  private readonly _doorDashApiKey = signal('');
  private readonly _doorDashSigningSecret = signal('');
  private readonly _doorDashMode = signal<DeliveryProviderMode>('test');

  private readonly _uberClientId = signal('');
  private readonly _uberClientSecret = signal('');
  private readonly _uberCustomerId = signal('');
  private readonly _uberWebhookSigningKey = signal('');

  private readonly _credentialNotice = signal<string | null>(null);
  private readonly _credentialSecurityMode = signal<DeliveryCredentialSecurityMode>('free');
  private readonly _marketplaceNotice = signal<string | null>(null);

  private readonly _marketplaceDoorDashEnabled = signal(false);
  private readonly _marketplaceDoorDashStoreId = signal('');
  private readonly _marketplaceDoorDashWebhookSecret = signal('');

  private readonly _marketplaceUberEnabled = signal(false);
  private readonly _marketplaceUberStoreId = signal('');
  private readonly _marketplaceUberWebhookSecret = signal('');

  private readonly _marketplaceGrubhubEnabled = signal(false);
  private readonly _marketplaceGrubhubStoreId = signal('');
  private readonly _marketplaceGrubhubWebhookSecret = signal('');

  private readonly _menuMappingProvider = signal<MarketplaceProviderType>('doordash_marketplace');
  private readonly _menuMappingExternalItemId = signal('');
  private readonly _menuMappingExternalItemName = signal('');
  private readonly _menuMappingMenuItemId = signal('');

  readonly provider = this._provider.asReadonly();
  readonly autoDispatch = this._autoDispatch.asReadonly();
  readonly showQuotes = this._showQuotes.asReadonly();
  readonly defaultTip = this._defaultTip.asReadonly();
  readonly isSaving = this.settingsService.isSaving;
  readonly saved = this._saved.asReadonly();
  readonly configStatus = this.deliveryService.configStatus;
  readonly providerConfigured = computed(() => this.deliveryService.isProviderConfiguredFor(this._provider()));
  readonly requiresProviderCredentials = computed(() =>
    this.isDaaSProvider(this._provider()) && !this.providerConfigured()
  );
  readonly autoDispatchDisabled = computed(() =>
    this._provider() === 'self'
    || this._provider() === 'none'
    || this.requiresProviderCredentials()
  );

  readonly credentialStatus = this.deliveryService.credentialsSummary;
  readonly credentialSecurityProfile = this.deliveryService.credentialSecurityProfile;
  readonly credentialSecurityMode = this._credentialSecurityMode.asReadonly();
  readonly isCredentialSaving = this.deliveryService.isProcessing;
  readonly credentialError = this.deliveryService.error;
  readonly credentialNotice = this._credentialNotice.asReadonly();
  readonly marketplaceNotice = this._marketplaceNotice.asReadonly();
  readonly marketplaceIntegrations = this.deliveryService.marketplaceIntegrations;
  readonly marketplaceMenuMappings = this.deliveryService.marketplaceMenuMappings;

  readonly doorDashApiKey = this._doorDashApiKey.asReadonly();
  readonly doorDashSigningSecret = this._doorDashSigningSecret.asReadonly();
  readonly doorDashMode = this._doorDashMode.asReadonly();

  readonly uberClientId = this._uberClientId.asReadonly();
  readonly uberClientSecret = this._uberClientSecret.asReadonly();
  readonly uberCustomerId = this._uberCustomerId.asReadonly();
  readonly uberWebhookSigningKey = this._uberWebhookSigningKey.asReadonly();

  readonly marketplaceDoorDashEnabled = this._marketplaceDoorDashEnabled.asReadonly();
  readonly marketplaceDoorDashStoreId = this._marketplaceDoorDashStoreId.asReadonly();
  readonly marketplaceDoorDashWebhookSecret = this._marketplaceDoorDashWebhookSecret.asReadonly();

  readonly marketplaceUberEnabled = this._marketplaceUberEnabled.asReadonly();
  readonly marketplaceUberStoreId = this._marketplaceUberStoreId.asReadonly();
  readonly marketplaceUberWebhookSecret = this._marketplaceUberWebhookSecret.asReadonly();

  readonly marketplaceGrubhubEnabled = this._marketplaceGrubhubEnabled.asReadonly();
  readonly marketplaceGrubhubStoreId = this._marketplaceGrubhubStoreId.asReadonly();
  readonly marketplaceGrubhubWebhookSecret = this._marketplaceGrubhubWebhookSecret.asReadonly();

  readonly menuMappingProvider = this._menuMappingProvider.asReadonly();
  readonly menuMappingExternalItemId = this._menuMappingExternalItemId.asReadonly();
  readonly menuMappingExternalItemName = this._menuMappingExternalItemName.asReadonly();
  readonly menuMappingMenuItemId = this._menuMappingMenuItemId.asReadonly();

  readonly isManagerOrAbove = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'owner' || role === 'manager' || role === 'super_admin';
  });

  readonly showOptions = computed(() => this._provider() !== 'none');

  readonly isDirty = computed(() => {
    const current = this.settingsService.deliverySettings();
    return this._provider() !== current.provider
      || this._autoDispatch() !== current.autoDispatch
      || this._showQuotes() !== current.showQuotesToCustomer
      || this._defaultTip() !== current.defaultTipPercent;
  });

  readonly canSaveDoorDashCredentials = computed(() => {
    if (!this.isManagerOrAbove()) return false;
    if (this.isCredentialSaving()) return false;

    const status = this.credentialStatus()?.doordash;
    const hasApiKey = this._doorDashApiKey().trim().length > 0;
    const hasSigningSecret = this._doorDashSigningSecret().trim().length > 0;
    const modeChanged = this._doorDashMode() !== (status?.mode ?? 'test');

    if (status?.configured) {
      return hasApiKey || hasSigningSecret || modeChanged;
    }
    return hasApiKey && hasSigningSecret;
  });

  readonly canSaveUberCredentials = computed(() => {
    if (!this.isManagerOrAbove()) return false;
    if (this.isCredentialSaving()) return false;

    const status = this.credentialStatus()?.uber;
    const hasClientId = this._uberClientId().trim().length > 0;
    const hasClientSecret = this._uberClientSecret().trim().length > 0;
    const hasCustomerId = this._uberCustomerId().trim().length > 0;
    const hasWebhookSigningKey = this._uberWebhookSigningKey().trim().length > 0;

    if (status?.configured) {
      return hasClientId || hasClientSecret || hasCustomerId || hasWebhookSigningKey;
    }
    return hasClientId && hasClientSecret && hasCustomerId && hasWebhookSigningKey;
  });

  readonly canDeleteDoorDashCredentials = computed(() =>
    this.isManagerOrAbove() && Boolean(this.credentialStatus()?.doordash.configured) && !this.isCredentialSaving()
  );

  readonly canDeleteUberCredentials = computed(() =>
    this.isManagerOrAbove() && Boolean(this.credentialStatus()?.uber.configured) && !this.isCredentialSaving()
  );

  readonly canSaveCredentialSecurityMode = computed(() => {
    if (!this.isManagerOrAbove()) return false;
    if (this.isCredentialSaving()) return false;
    const current = this.credentialSecurityProfile()?.mode ?? 'free';
    return this._credentialSecurityMode() !== current;
  });

  readonly canSaveMarketplaceDoorDash = computed(() => this.canSaveMarketplaceProvider('doordash_marketplace'));
  readonly canSaveMarketplaceUber = computed(() => this.canSaveMarketplaceProvider('ubereats'));
  readonly canSaveMarketplaceGrubhub = computed(() => this.canSaveMarketplaceProvider('grubhub'));

  readonly canClearMarketplaceDoorDashSecret = computed(() => this.canClearMarketplaceSecret('doordash_marketplace'));
  readonly canClearMarketplaceUberSecret = computed(() => this.canClearMarketplaceSecret('ubereats'));
  readonly canClearMarketplaceGrubhubSecret = computed(() => this.canClearMarketplaceSecret('grubhub'));

  readonly availableMenuItems = computed(() => {
    const items = [...this.menuService.allItems()];
    items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  });

  readonly filteredMarketplaceMenuMappings = computed(() =>
    this.marketplaceMenuMappings().filter((mapping) => mapping.provider === this._menuMappingProvider())
  );

  readonly canSaveMarketplaceMenuMapping = computed(() =>
    this.isManagerOrAbove()
    && !this.isCredentialSaving()
    && this._menuMappingExternalItemId().trim().length > 0
    && this._menuMappingMenuItemId().trim().length > 0
  );

  // --- In-House Driver Management (GAP-R08) ---

  readonly drivers = this.deliveryService.drivers;
  readonly isLoadingDrivers = this.deliveryService.isLoadingDrivers;

  private readonly _showDriverForm = signal(false);
  private readonly _editingDriver = signal<Driver | null>(null);
  private readonly _driverName = signal('');
  private readonly _driverPhone = signal('');
  private readonly _driverEmail = signal('');
  private readonly _driverVehicleType = signal<VehicleType>('car');
  private readonly _isSavingDriver = signal(false);
  private readonly _driverNotice = signal<string | null>(null);

  readonly showDriverForm = this._showDriverForm.asReadonly();
  readonly editingDriver = this._editingDriver.asReadonly();
  readonly driverName = this._driverName.asReadonly();
  readonly driverPhone = this._driverPhone.asReadonly();
  readonly driverEmail = this._driverEmail.asReadonly();
  readonly driverVehicleType = this._driverVehicleType.asReadonly();
  readonly isSavingDriver = this._isSavingDriver.asReadonly();
  readonly driverNotice = this._driverNotice.asReadonly();

  readonly canSaveDriver = computed(() =>
    this.isManagerOrAbove()
    && !this._isSavingDriver()
    && this._driverName().trim().length > 0
    && this._driverPhone().trim().length > 0
  );

  // Dispatch Config
  private readonly _dispatchConfig = signal<DeliveryDispatchConfig>(defaultDeliveryDispatchConfig());
  private readonly _isSavingDispatchConfig = signal(false);
  private readonly _dispatchConfigNotice = signal<string | null>(null);

  readonly dispatchConfig = this._dispatchConfig.asReadonly();
  readonly isSavingDispatchConfig = this._isSavingDispatchConfig.asReadonly();
  readonly dispatchConfigNotice = this._dispatchConfigNotice.asReadonly();

  ngOnInit(): void {
    const s = this.settingsService.deliverySettings();
    this._provider.set(s.provider);
    this._autoDispatch.set(s.autoDispatch);
    this._showQuotes.set(s.showQuotesToCustomer);
    this._defaultTip.set(s.defaultTipPercent);
    this._credentialSecurityMode.set(this.credentialSecurityProfile()?.mode ?? 'free');
    this.deliveryService.setProviderType(s.provider);
    this.deliveryService.loadConfigStatus();
    this.deliveryService.loadCredentialSummary().then(() => {
      this._doorDashMode.set(this.credentialStatus()?.doordash.mode ?? 'test');
      this._credentialSecurityMode.set(this.credentialSecurityProfile()?.mode ?? 'free');
    });
    this.deliveryService.loadCredentialSecurityProfile().then((profile) => {
      if (profile) this._credentialSecurityMode.set(profile.mode);
    });
    this.deliveryService.loadMarketplaceIntegrations().then((integrations) => {
      if (integrations) this.syncMarketplaceFormsFromIntegrations(integrations);
    });
    this.menuService.loadMenu();
    this.deliveryService.loadMarketplaceMenuMappings();
    this.deliveryService.loadDrivers();
  }

  onProviderChange(event: Event): void {
    const provider = (event.target as HTMLInputElement).value as DeliveryProviderType;
    this._provider.set(provider);
    this.deliveryService.setProviderType(provider);
    this.deliveryService.loadConfigStatus();

    if (this.isDaaSProvider(provider) && !this.deliveryService.isProviderConfiguredFor(provider)) {
      this._autoDispatch.set(false);
    }

    this._saved.set(false);
  }

  onAutoDispatchChange(event: Event): void {
    this._autoDispatch.set((event.target as HTMLInputElement).checked);
    this._saved.set(false);
  }

  onShowQuotesChange(event: Event): void {
    this._showQuotes.set((event.target as HTMLInputElement).checked);
    this._saved.set(false);
  }

  onDefaultTipInput(event: Event): void {
    this._defaultTip.set(Number.parseInt((event.target as HTMLInputElement).value, 10) || 0);
    this._saved.set(false);
  }

  onDoorDashApiKeyInput(event: Event): void {
    this._doorDashApiKey.set((event.target as HTMLInputElement).value);
    this.clearCredentialNotice();
  }

  onDoorDashSigningSecretInput(event: Event): void {
    this._doorDashSigningSecret.set((event.target as HTMLInputElement).value);
    this.clearCredentialNotice();
  }

  onDoorDashModeChange(event: Event): void {
    this._doorDashMode.set((event.target as HTMLSelectElement).value as DeliveryProviderMode);
    this.clearCredentialNotice();
  }

  onCredentialSecurityModeChange(event: Event): void {
    this._credentialSecurityMode.set((event.target as HTMLSelectElement).value as DeliveryCredentialSecurityMode);
    this.clearCredentialNotice();
  }

  onUberClientIdInput(event: Event): void {
    this._uberClientId.set((event.target as HTMLInputElement).value);
    this.clearCredentialNotice();
  }

  onUberClientSecretInput(event: Event): void {
    this._uberClientSecret.set((event.target as HTMLInputElement).value);
    this.clearCredentialNotice();
  }

  onUberCustomerIdInput(event: Event): void {
    this._uberCustomerId.set((event.target as HTMLInputElement).value);
    this.clearCredentialNotice();
  }

  onUberWebhookSigningKeyInput(event: Event): void {
    this._uberWebhookSigningKey.set((event.target as HTMLInputElement).value);
    this.clearCredentialNotice();
  }

  onMarketplaceDoorDashEnabledChange(event: Event): void {
    this._marketplaceDoorDashEnabled.set((event.target as HTMLInputElement).checked);
    this.clearMarketplaceNotice();
  }

  onMarketplaceDoorDashStoreIdInput(event: Event): void {
    this._marketplaceDoorDashStoreId.set((event.target as HTMLInputElement).value);
    this.clearMarketplaceNotice();
  }

  onMarketplaceDoorDashWebhookSecretInput(event: Event): void {
    this._marketplaceDoorDashWebhookSecret.set((event.target as HTMLInputElement).value);
    this.clearMarketplaceNotice();
  }

  onMarketplaceUberEnabledChange(event: Event): void {
    this._marketplaceUberEnabled.set((event.target as HTMLInputElement).checked);
    this.clearMarketplaceNotice();
  }

  onMarketplaceUberStoreIdInput(event: Event): void {
    this._marketplaceUberStoreId.set((event.target as HTMLInputElement).value);
    this.clearMarketplaceNotice();
  }

  onMarketplaceUberWebhookSecretInput(event: Event): void {
    this._marketplaceUberWebhookSecret.set((event.target as HTMLInputElement).value);
    this.clearMarketplaceNotice();
  }

  onMarketplaceGrubhubEnabledChange(event: Event): void {
    this._marketplaceGrubhubEnabled.set((event.target as HTMLInputElement).checked);
    this.clearMarketplaceNotice();
  }

  onMarketplaceGrubhubStoreIdInput(event: Event): void {
    this._marketplaceGrubhubStoreId.set((event.target as HTMLInputElement).value);
    this.clearMarketplaceNotice();
  }

  onMarketplaceGrubhubWebhookSecretInput(event: Event): void {
    this._marketplaceGrubhubWebhookSecret.set((event.target as HTMLInputElement).value);
    this.clearMarketplaceNotice();
  }

  onMenuMappingProviderChange(event: Event): void {
    this._menuMappingProvider.set((event.target as HTMLSelectElement).value as MarketplaceProviderType);
    this.clearMarketplaceNotice();
  }

  onMenuMappingExternalItemIdInput(event: Event): void {
    this._menuMappingExternalItemId.set((event.target as HTMLInputElement).value);
    this.clearMarketplaceNotice();
  }

  onMenuMappingExternalItemNameInput(event: Event): void {
    this._menuMappingExternalItemName.set((event.target as HTMLInputElement).value);
    this.clearMarketplaceNotice();
  }

  onMenuMappingMenuItemIdChange(event: Event): void {
    this._menuMappingMenuItemId.set((event.target as HTMLSelectElement).value);
    this.clearMarketplaceNotice();
  }

  async save(): Promise<void> {
    const autoDispatch = this.autoDispatchDisabled() ? false : this._autoDispatch();
    if (this._autoDispatch() !== autoDispatch) {
      this._autoDispatch.set(autoDispatch);
    }

    const settings: DeliverySettings = {
      provider: this._provider(),
      autoDispatch,
      showQuotesToCustomer: this._showQuotes(),
      defaultTipPercent: this._defaultTip(),
    };
    await this.settingsService.saveDeliverySettings(settings);
    this.deliveryService.setProviderType(settings.provider);
    this.deliveryService.loadConfigStatus();
    this._saved.set(true);
  }

  async saveDoorDashCredentials(): Promise<void> {
    if (!this.canSaveDoorDashCredentials()) return;

    const status = this.credentialStatus()?.doordash;
    const payload: DoorDashCredentialPayload = {};
    const apiKey = this._doorDashApiKey().trim();
    const signingSecret = this._doorDashSigningSecret().trim();
    const mode = this._doorDashMode();

    if (apiKey) payload.apiKey = apiKey;
    if (signingSecret) payload.signingSecret = signingSecret;
    if (mode !== (status?.mode ?? 'test')) payload.mode = mode;

    const saved = await this.deliveryService.saveDoorDashCredentials(payload);
    if (saved) {
      this._doorDashApiKey.set('');
      this._doorDashSigningSecret.set('');
      this._doorDashMode.set(this.credentialStatus()?.doordash.mode ?? mode);
      this._credentialNotice.set('DoorDash credentials saved.');
      this.deliveryService.loadConfigStatus();
    }
  }

  async saveCredentialSecurityMode(): Promise<void> {
    if (!this.canSaveCredentialSecurityMode()) return;

    const saved = await this.deliveryService.saveCredentialSecurityProfile(this._credentialSecurityMode());
    if (!saved) return;

    await this.deliveryService.loadCredentialSummary();
    this._credentialSecurityMode.set(this.credentialSecurityProfile()?.mode ?? this._credentialSecurityMode());
    this._credentialNotice.set('Credential security mode updated.');
  }

  async saveUberCredentials(): Promise<void> {
    if (!this.canSaveUberCredentials()) return;

    const payload: UberCredentialPayload = {};
    const clientId = this._uberClientId().trim();
    const clientSecret = this._uberClientSecret().trim();
    const customerId = this._uberCustomerId().trim();
    const webhookSigningKey = this._uberWebhookSigningKey().trim();

    if (clientId) payload.clientId = clientId;
    if (clientSecret) payload.clientSecret = clientSecret;
    if (customerId) payload.customerId = customerId;
    if (webhookSigningKey) payload.webhookSigningKey = webhookSigningKey;

    const saved = await this.deliveryService.saveUberCredentials(payload);
    if (saved) {
      this._uberClientId.set('');
      this._uberClientSecret.set('');
      this._uberCustomerId.set('');
      this._uberWebhookSigningKey.set('');
      this._credentialNotice.set('Uber credentials saved.');
      this.deliveryService.loadConfigStatus();
    }
  }

  async deleteDoorDashCredentials(): Promise<void> {
    if (!this.canDeleteDoorDashCredentials()) return;

    const deleted = await this.deliveryService.deleteDoorDashCredentials();
    if (deleted) {
      this._doorDashApiKey.set('');
      this._doorDashSigningSecret.set('');
      this._doorDashMode.set('test');
      this._credentialNotice.set('DoorDash credentials deleted.');
      this.deliveryService.loadConfigStatus();
    }
  }

  async deleteUberCredentials(): Promise<void> {
    if (!this.canDeleteUberCredentials()) return;

    const deleted = await this.deliveryService.deleteUberCredentials();
    if (deleted) {
      this._uberClientId.set('');
      this._uberClientSecret.set('');
      this._uberCustomerId.set('');
      this._uberWebhookSigningKey.set('');
      this._credentialNotice.set('Uber credentials deleted.');
      this.deliveryService.loadConfigStatus();
    }
  }

  async saveMarketplaceDoorDashIntegration(): Promise<void> {
    await this.saveMarketplaceIntegration('doordash_marketplace');
  }

  async saveMarketplaceUberIntegration(): Promise<void> {
    await this.saveMarketplaceIntegration('ubereats');
  }

  async saveMarketplaceGrubhubIntegration(): Promise<void> {
    await this.saveMarketplaceIntegration('grubhub');
  }

  async clearMarketplaceDoorDashSecret(): Promise<void> {
    await this.clearMarketplaceSecret('doordash_marketplace');
  }

  async clearMarketplaceUberSecret(): Promise<void> {
    await this.clearMarketplaceSecret('ubereats');
  }

  async clearMarketplaceGrubhubSecret(): Promise<void> {
    await this.clearMarketplaceSecret('grubhub');
  }

  async saveMarketplaceMenuMapping(): Promise<void> {
    if (!this.canSaveMarketplaceMenuMapping()) return;

    const payload: MarketplaceMenuMappingUpsertPayload = {
      provider: this._menuMappingProvider(),
      externalItemId: this._menuMappingExternalItemId().trim(),
      menuItemId: this._menuMappingMenuItemId().trim(),
    };
    const externalItemName = this._menuMappingExternalItemName().trim();
    if (externalItemName) {
      payload.externalItemName = externalItemName;
    }

    const saved = await this.deliveryService.upsertMarketplaceMenuMapping(payload);
    if (!saved) return;

    this._menuMappingExternalItemId.set('');
    this._menuMappingExternalItemName.set('');
    this._menuMappingMenuItemId.set('');
    this._marketplaceNotice.set('Marketplace menu mapping saved.');
  }

  async deleteMarketplaceMenuMapping(mapping: MarketplaceMenuMapping): Promise<void> {
    if (!this.isManagerOrAbove()) return;
    if (this.isCredentialSaving()) return;
    const deleted = await this.deliveryService.deleteMarketplaceMenuMapping(mapping.id);
    if (!deleted) return;
    this._marketplaceNotice.set('Marketplace menu mapping deleted.');
  }

  discard(): void {
    const s = this.settingsService.deliverySettings();
    this._provider.set(s.provider);
    this._autoDispatch.set(s.autoDispatch);
    this._showQuotes.set(s.showQuotesToCustomer);
    this._defaultTip.set(s.defaultTipPercent);
    this.deliveryService.setProviderType(s.provider);
    this.deliveryService.loadConfigStatus();
    this.syncMarketplaceFormsFromIntegrations(this.marketplaceIntegrations());
    this._menuMappingExternalItemId.set('');
    this._menuMappingExternalItemName.set('');
    this._menuMappingMenuItemId.set('');
    this._saved.set(false);
  }

  // --- In-House Driver Management (GAP-R08) ---

  openAddDriverForm(): void {
    this._editingDriver.set(null);
    this._driverName.set('');
    this._driverPhone.set('');
    this._driverEmail.set('');
    this._driverVehicleType.set('car');
    this._showDriverForm.set(true);
    this._driverNotice.set(null);
  }

  openEditDriverForm(driver: Driver): void {
    this._editingDriver.set(driver);
    this._driverName.set(driver.name);
    this._driverPhone.set(driver.phone);
    this._driverEmail.set(driver.email ?? '');
    this._driverVehicleType.set(driver.vehicleType);
    this._showDriverForm.set(true);
    this._driverNotice.set(null);
  }

  closeDriverForm(): void {
    this._showDriverForm.set(false);
    this._editingDriver.set(null);
  }

  onDriverNameInput(event: Event): void {
    this._driverName.set((event.target as HTMLInputElement).value);
  }

  onDriverPhoneInput(event: Event): void {
    this._driverPhone.set((event.target as HTMLInputElement).value);
  }

  onDriverEmailInput(event: Event): void {
    this._driverEmail.set((event.target as HTMLInputElement).value);
  }

  onDriverVehicleTypeChange(event: Event): void {
    this._driverVehicleType.set((event.target as HTMLSelectElement).value as VehicleType);
  }

  async saveDriver(): Promise<void> {
    if (!this.canSaveDriver()) return;

    this._isSavingDriver.set(true);
    const formData: DriverFormData = {
      name: this._driverName().trim(),
      phone: this._driverPhone().trim(),
      vehicleType: this._driverVehicleType(),
    };
    const email = this._driverEmail().trim();
    if (email) formData.email = email;

    const editing = this._editingDriver();
    if (editing) {
      const updated = await this.deliveryService.updateDriver(editing.id, formData);
      if (updated) {
        this._driverNotice.set(`Driver "${formData.name}" updated.`);
        this.closeDriverForm();
      }
    } else {
      const created = await this.deliveryService.createDriver(formData);
      if (created) {
        this._driverNotice.set(`Driver "${created.name}" added.`);
        this.closeDriverForm();
      }
    }
    this._isSavingDriver.set(false);
  }

  async deleteDriver(driver: Driver): Promise<void> {
    if (!this.isManagerOrAbove()) return;
    await this.deliveryService.deleteDriver(driver.id);
    this._driverNotice.set(`Driver "${driver.name}" removed.`);
  }

  async toggleDriverStatus(driver: Driver): Promise<void> {
    const newStatus: DriverStatus = driver.status === 'offline' ? 'available' : 'offline';
    await this.deliveryService.setDriverStatus(driver.id, newStatus);
  }

  getVehicleIcon(vehicleType: string): string {
    switch (vehicleType) {
      case 'car': return 'bi-car-front';
      case 'bike': return 'bi-bicycle';
      case 'scooter': return 'bi-scooter';
      case 'walk': return 'bi-person-walking';
      default: return 'bi-truck';
    }
  }

  getDriverStatusClass(status: string): string {
    switch (status) {
      case 'available': return 'text-success';
      case 'assigned': return 'text-primary';
      case 'en_route': return 'text-info';
      case 'delivering': return 'text-warning';
      case 'offline': return 'text-muted';
      default: return '';
    }
  }

  // Dispatch Config
  onDispatchConfigChange(field: keyof DeliveryDispatchConfig, event: Event): void {
    const target = event.target as HTMLInputElement;
    this._dispatchConfig.update(config => ({
      ...config,
      [field]: target.type === 'checkbox' ? target.checked : Number.parseFloat(target.value) || 0,
    }));
    this._dispatchConfigNotice.set(null);
  }

  async saveDispatchConfig(): Promise<void> {
    this._isSavingDispatchConfig.set(true);
    // Dispatch config is local for now — will be wired to backend API when available
    this._dispatchConfigNotice.set('Dispatch configuration saved.');
    this._isSavingDispatchConfig.set(false);
  }

  private clearCredentialNotice(): void {
    this._credentialNotice.set(null);
    this.deliveryService.clearError();
  }

  private clearMarketplaceNotice(): void {
    this._marketplaceNotice.set(null);
    this.deliveryService.clearError();
  }

  private integrationByProvider(provider: MarketplaceProviderType): MarketplaceIntegrationSummary | undefined {
    return this.marketplaceIntegrations().find((entry) => entry.provider === provider);
  }

  private canSaveMarketplaceProvider(provider: MarketplaceProviderType): boolean {
    if (!this.isManagerOrAbove()) return false;
    if (this.isCredentialSaving()) return false;

    const existing = this.integrationByProvider(provider);
    const payload = this.buildMarketplacePayload(provider, existing);
    return payload !== null;
  }

  private canClearMarketplaceSecret(provider: MarketplaceProviderType): boolean {
    if (!this.isManagerOrAbove()) return false;
    if (this.isCredentialSaving()) return false;
    const existing = this.integrationByProvider(provider);
    return Boolean(existing?.hasWebhookSigningSecret);
  }

  private buildMarketplacePayload(
    provider: MarketplaceProviderType,
    existing?: MarketplaceIntegrationSummary,
  ): MarketplaceIntegrationUpdatePayload | null {
    const enabled = this.marketplaceEnabledSignalFor(provider)();
    const storeId = this.marketplaceStoreIdSignalFor(provider)().trim();
    const webhookSecret = this.marketplaceSecretSignalFor(provider)().trim();

    const payload: MarketplaceIntegrationUpdatePayload = {};

    if (!existing || enabled !== existing.enabled) {
      payload.enabled = enabled;
    }

    const existingStoreId = (existing?.externalStoreId ?? '').trim();
    if (!existing || storeId !== existingStoreId) {
      if (storeId) payload.externalStoreId = storeId;
    }

    if (webhookSecret) {
      payload.webhookSigningSecret = webhookSecret;
    }

    if (
      payload.enabled === undefined
      && payload.externalStoreId === undefined
      && payload.webhookSigningSecret === undefined
    ) {
      return null;
    }
    return payload;
  }

  private async saveMarketplaceIntegration(provider: MarketplaceProviderType): Promise<void> {
    if (!this.isManagerOrAbove()) return;
    const existing = this.integrationByProvider(provider);
    const payload = this.buildMarketplacePayload(provider, existing);
    if (!payload) return;

    const saved = await this.deliveryService.updateMarketplaceIntegration(provider, payload);
    if (!saved) return;

    this.marketplaceSecretSignalFor(provider).set('');
    this.syncMarketplaceFormsFromIntegrations(this.marketplaceIntegrations());
    this._marketplaceNotice.set(this.marketplaceProviderLabelFor(provider) + ' marketplace integration saved.');
  }

  private async clearMarketplaceSecret(provider: MarketplaceProviderType): Promise<void> {
    if (!this.canClearMarketplaceSecret(provider)) return;

    const cleared = await this.deliveryService.clearMarketplaceIntegrationSecret(provider);
    if (!cleared) return;

    this.marketplaceSecretSignalFor(provider).set('');
    this.syncMarketplaceFormsFromIntegrations(this.marketplaceIntegrations());
    this._marketplaceNotice.set(this.marketplaceProviderLabelFor(provider) + ' marketplace webhook secret cleared.');
  }

  private syncMarketplaceFormsFromIntegrations(integrations: MarketplaceIntegrationSummary[]): void {
    const doordash = integrations.find((entry) => entry.provider === 'doordash_marketplace');
    const ubereats = integrations.find((entry) => entry.provider === 'ubereats');
    const grubhub = integrations.find((entry) => entry.provider === 'grubhub');

    this._marketplaceDoorDashEnabled.set(doordash?.enabled ?? false);
    this._marketplaceDoorDashStoreId.set(doordash?.externalStoreId ?? '');
    this._marketplaceDoorDashWebhookSecret.set('');

    this._marketplaceUberEnabled.set(ubereats?.enabled ?? false);
    this._marketplaceUberStoreId.set(ubereats?.externalStoreId ?? '');
    this._marketplaceUberWebhookSecret.set('');

    this._marketplaceGrubhubEnabled.set(grubhub?.enabled ?? false);
    this._marketplaceGrubhubStoreId.set(grubhub?.externalStoreId ?? '');
    this._marketplaceGrubhubWebhookSecret.set('');
  }

  private marketplaceEnabledSignalFor(provider: MarketplaceProviderType) {
    if (provider === 'doordash_marketplace') return this._marketplaceDoorDashEnabled;
    if (provider === 'ubereats') return this._marketplaceUberEnabled;
    return this._marketplaceGrubhubEnabled;
  }

  private marketplaceStoreIdSignalFor(provider: MarketplaceProviderType) {
    if (provider === 'doordash_marketplace') return this._marketplaceDoorDashStoreId;
    if (provider === 'ubereats') return this._marketplaceUberStoreId;
    return this._marketplaceGrubhubStoreId;
  }

  private marketplaceSecretSignalFor(provider: MarketplaceProviderType) {
    if (provider === 'doordash_marketplace') return this._marketplaceDoorDashWebhookSecret;
    if (provider === 'ubereats') return this._marketplaceUberWebhookSecret;
    return this._marketplaceGrubhubWebhookSecret;
  }

  marketplaceStatus(provider: MarketplaceProviderType): MarketplaceIntegrationSummary | undefined {
    return this.integrationByProvider(provider);
  }

  marketplaceProviderLabelFor(provider: MarketplaceProviderType): string {
    if (provider === 'doordash_marketplace') return 'DoorDash Marketplace';
    if (provider === 'ubereats') return 'Uber Eats';
    return 'Grubhub';
  }

  menuItemOptionLabel(item: MenuItem): string {
    return `${item.name} (${item.id})`;
  }

  private isDaaSProvider(provider: DeliveryProviderType): boolean {
    return provider === 'doordash' || provider === 'uber';
  }
}
