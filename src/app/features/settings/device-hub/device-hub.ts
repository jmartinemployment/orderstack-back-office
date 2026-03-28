import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeviceService } from '../../../services/device';
import { PlatformService } from '../../../services/platform';
import { PrinterService } from '../../../services/printer';
import { StationService } from '../../../services/station';
import { MenuService } from '../../../services/menu';
import { PrinterSettings } from '../printer-settings';
import { StationSettings } from '../station-settings';
import { StaffManagementService } from '../../../services/staff-management';
import {
  DeviceHubTab,
  DeviceType,
  DeviceFormData,
  DeviceMode,
  DeviceModeFormData,
  DeviceModeSettings,
  PrinterProfile,
  PrinterProfileFormData,
  PrintJobType,
  PrintRoutingRule,
  PeripheralType,
  PeripheralConnectionType,
  PeripheralDevice,
  KioskProfile,
  KioskProfileFormData,
  CustomerDisplayConfig,
  defaultModeSettings,
  defaultModeSettingsForPosMode,
  defaultCustomerDisplayConfig,
} from '../../../models/index';
import type { DevicePosMode } from '../../../models/index';

const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  register: 'Register',
  terminal: 'Terminal',
  kds: 'KDS',
  kiosk: 'Kiosk',
  printer: 'Printer',
  bar: 'Bar',
};

const DEVICE_TYPE_ICONS: Record<DeviceType, string> = {
  register: 'bi-shop',
  terminal: 'bi-tablet',
  kds: 'bi-display',
  kiosk: 'bi-phone',
  printer: 'bi-printer',
  bar: 'bi-cup-straw',
};

const PRINT_JOB_LABELS: Record<PrintJobType, string> = {
  customer_receipt: 'Customer Receipt',
  kitchen_ticket: 'Kitchen Ticket',
  bar_ticket: 'Bar Ticket',
  expo_ticket: 'Expo Ticket',
  order_summary: 'Order Summary',
  close_of_day: 'Close of Day',
};

const PERIPHERAL_TYPE_LABELS: Record<PeripheralType, string> = {
  cash_drawer: 'Cash Drawer',
  barcode_scanner: 'Barcode Scanner',
  card_reader: 'Card Reader',
  customer_display: 'Customer Display',
  scale: 'Scale',
};

const PERIPHERAL_TYPE_ICONS: Record<PeripheralType, string> = {
  cash_drawer: 'bi-box-seam',
  barcode_scanner: 'bi-upc-scan',
  card_reader: 'bi-credit-card',
  customer_display: 'bi-display',
  scale: 'bi-speedometer',
};


@Component({
  selector: 'os-device-hub',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, FormsModule, PrinterSettings, StationSettings],
  templateUrl: './device-hub.html',
  styleUrl: './device-hub.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceHub implements OnInit {
  private readonly deviceService = inject(DeviceService);
  private readonly platformService = inject(PlatformService);
  private readonly printerService = inject(PrinterService);
  private readonly stationService = inject(StationService);
  private readonly menuService = inject(MenuService);
  private readonly staffService = inject(StaffManagementService);
  // --- Tab state ---
  readonly activeTab = signal<DeviceHubTab>('devices');

  // --- Data from services ---
  readonly devices = this.deviceService.devices;
  readonly modes = this.deviceService.modes;
  readonly printerProfiles = this.deviceService.printerProfiles;
  readonly peripherals = this.deviceService.peripherals;
  readonly kioskProfiles = this.deviceService.kioskProfiles;
  readonly printers = this.printerService.printers;
  readonly stations = this.stationService.stations;
  readonly categories = this.menuService.categories;
  readonly teamMembers = this.staffService.teamMembers;
  readonly isLoading = this.deviceService.isLoading;
  readonly error = this.deviceService.error;

  // --- Computed ---
  readonly activeDevices = this.deviceService.activeDevices;
  readonly pendingDevices = this.deviceService.pendingDevices;
  readonly healthSummary = this.deviceService.deviceHealthSummary;

  readonly showKioskTab = computed(() => {
    const profile = this.platformService.merchantProfile();
    if (!profile) return true;
    return profile.verticals.some(v => v === 'food_and_drink' || v === 'retail');
  });

  readonly tabs = computed<{ key: DeviceHubTab; label: string; icon: string }[]>(() => {
    const base: { key: DeviceHubTab; label: string; icon: string }[] = [
      { key: 'devices', label: 'Devices', icon: 'bi-cpu' },
      { key: 'modes', label: 'Modes', icon: 'bi-sliders' },
      { key: 'printer-profiles', label: 'Printer Profiles', icon: 'bi-printer' },
      { key: 'peripherals', label: 'Peripherals', icon: 'bi-usb-drive' },
    ];
    if (this.showKioskTab()) {
      base.push({ key: 'kiosk-profiles', label: 'Kiosk Profiles', icon: 'bi-phone' });
    }
    return base;
  });

  readonly kdsDevices = computed(() =>
    this.activeDevices().filter(d => d.deviceType === 'kds')
  );

  readonly unassignedStations = computed(() =>
    this.stations().filter(s => !s.boundDeviceId)
  );

  // --- Device code generation ---
  readonly showCodeForm = signal(false);
  readonly newDeviceName = signal('');
  readonly newDeviceType = signal<DeviceType>('register');
  readonly newDeviceTeamMember = signal<string>('');
  readonly generatedCode = signal<string | null>(null);
  readonly codeExpiry = signal<string | null>(null);

  // --- Mode editing ---
  readonly showModeForm = signal(false);
  readonly editingMode = signal<DeviceMode | null>(null);
  readonly modeFormName = signal('');
  readonly modeFormType = signal<DeviceType>('register');
  readonly modeFormSettings = signal<DeviceModeSettings>(defaultModeSettings());
  readonly modeFormPosMode = signal<DevicePosMode>('full_service');

  // --- Printer profile editing ---
  readonly showProfileForm = signal(false);
  readonly editingProfile = signal<PrinterProfile | null>(null);
  readonly profileFormName = signal('');
  readonly profileFormRules = signal<PrintRoutingRule[]>([]);

  // --- Peripheral registration ---
  readonly showPeripheralForm = signal(false);
  readonly peripheralParentDevice = signal('');
  readonly peripheralType = signal<PeripheralType>('cash_drawer');
  readonly peripheralName = signal('');
  readonly peripheralConnection = signal<PeripheralConnectionType>('usb');

  // --- Peripheral config ---
  readonly peripheralTestResult = signal<{ id: string; result: string } | null>(null);

  // --- Kiosk profile editing ---
  readonly showKioskForm = signal(false);
  readonly editingKiosk = signal<KioskProfile | null>(null);
  readonly kioskFormName = signal('');
  readonly kioskFormWelcome = signal('Welcome! Place your order here.');
  readonly kioskFormShowImages = signal(true);
  readonly kioskFormRequireName = signal(false);
  readonly kioskFormTimeout = signal(120);
  readonly kioskFormAccessibility = signal(false);
  readonly kioskFormPrimaryColor = signal('#006aff');
  readonly kioskFormAccentColor = signal('#22c55e');
  readonly kioskFormCategories = signal<string[]>([]);
  readonly kioskFormCategoryOrder = signal<string[]>([]);
  readonly showKioskPreview = signal(false);

  // --- Confirm dialogs ---
  readonly confirmRevokeId = signal<string | null>(null);
  readonly confirmDeleteModeId = signal<string | null>(null);

  // --- Labels ---
  readonly deviceTypeLabels = DEVICE_TYPE_LABELS;
  readonly deviceTypeIcons = DEVICE_TYPE_ICONS;
  readonly printJobLabels = PRINT_JOB_LABELS;
  readonly peripheralTypeLabels = PERIPHERAL_TYPE_LABELS;
  readonly peripheralTypeIcons = PERIPHERAL_TYPE_ICONS;
  readonly deviceTypes: DeviceType[] = ['register', 'terminal', 'kds', 'kiosk', 'printer', 'bar'];
  readonly printJobTypes: PrintJobType[] = ['customer_receipt', 'kitchen_ticket', 'bar_ticket', 'expo_ticket', 'order_summary', 'close_of_day'];
  readonly peripheralTypes: PeripheralType[] = ['cash_drawer', 'barcode_scanner', 'card_reader', 'customer_display', 'scale'];
  readonly connectionTypes: PeripheralConnectionType[] = ['usb', 'bluetooth', 'network'];
  readonly availableModes = this.platformService.availableModes;

  ngOnInit(): void {
    this.deviceService.loadDevices();
    this.deviceService.loadModes();
    this.deviceService.loadPrinterProfiles();
    this.deviceService.loadPeripherals();
    this.deviceService.loadKioskProfiles();
    this.stationService.loadStations();
    this.menuService.loadMenu();
    this.staffService.loadTeamMembers();
  }

  setTab(tab: DeviceHubTab): void {
    this.activeTab.set(tab);
  }

  // === Device Code Generation ===

  openCodeForm(): void {
    this.showCodeForm.set(true);
    this.newDeviceName.set('');
    this.newDeviceType.set('register');
    this.newDeviceTeamMember.set('');
    this.generatedCode.set(null);
    this.codeExpiry.set(null);
  }

  closeCodeForm(): void {
    this.showCodeForm.set(false);
  }

  async generateCode(): Promise<void> {
    const teamMemberId = this.newDeviceTeamMember() || undefined;
    const data: DeviceFormData = {
      deviceName: this.newDeviceName() || 'New Device',
      deviceType: this.newDeviceType(),
      teamMemberId,
    };
    const device = await this.deviceService.generateDeviceCode(data);
    if (device) {
      this.generatedCode.set(device.deviceCode);
      this.codeExpiry.set(device.expiresAt);
    }
  }

  copyCode(): void {
    const code = this.generatedCode();
    if (code) {
      navigator.clipboard.writeText(code);
    }
  }

  // === Device Actions ===

  confirmRevoke(id: string): void {
    this.confirmRevokeId.set(id);
  }

  cancelRevoke(): void {
    this.confirmRevokeId.set(null);
  }

  async revokeDevice(): Promise<void> {
    const id = this.confirmRevokeId();
    if (!id) return;
    await this.deviceService.revokeDevice(id);
    this.confirmRevokeId.set(null);
  }

  // === Station-Device Binding (Step 11) ===

  getStationForDevice(deviceId: string): string {
    const station = this.stations().find(s => s.boundDeviceId === deviceId);
    return station?.id ?? '';
  }

  async assignStation(deviceId: string, stationId: string): Promise<void> {
    const oldStation = this.stations().find(s => s.boundDeviceId === deviceId);
    if (oldStation) {
      await this.stationService.updateStation(oldStation.id, { boundDeviceId: null });
    }
    if (stationId) {
      await this.stationService.updateStation(stationId, { boundDeviceId: deviceId });
    }
  }

  // === Mode CRUD ===

  openModeForm(mode?: DeviceMode): void {
    this.showModeForm.set(true);
    if (mode) {
      this.editingMode.set(mode);
      this.modeFormName.set(mode.name);
      this.modeFormType.set(mode.deviceType);
      this.modeFormSettings.set(structuredClone(mode.settings));
    } else {
      this.editingMode.set(null);
      this.modeFormName.set('');
      this.modeFormType.set('register');
      this.modeFormSettings.set(defaultModeSettings());
    }
  }

  closeModeForm(): void {
    this.showModeForm.set(false);
    this.editingMode.set(null);
  }

  onPosModeChange(posMode: DevicePosMode): void {
    this.modeFormPosMode.set(posMode);
    this.modeFormSettings.set(defaultModeSettingsForPosMode(posMode));
  }

  async saveMode(): Promise<void> {
    const data: DeviceModeFormData = {
      name: this.modeFormName(),
      deviceType: this.modeFormType(),
      settings: this.modeFormSettings(),
    };

    const existing = this.editingMode();
    if (existing) {
      await this.deviceService.updateMode(existing.id, data);
    } else {
      await this.deviceService.createMode(data);
    }
    this.closeModeForm();
  }

  confirmDeleteMode(id: string): void {
    this.confirmDeleteModeId.set(id);
  }

  cancelDeleteMode(): void {
    this.confirmDeleteModeId.set(null);
  }

  async deleteMode(): Promise<void> {
    const id = this.confirmDeleteModeId();
    if (!id) return;
    await this.deviceService.deleteMode(id);
    this.confirmDeleteModeId.set(null);
  }

  // === Printer Profile CRUD ===

  openProfileForm(profile?: PrinterProfile): void {
    this.showProfileForm.set(true);
    if (profile) {
      this.editingProfile.set(profile);
      this.profileFormName.set(profile.name);
      this.profileFormRules.set(structuredClone(profile.routingRules));
    } else {
      this.editingProfile.set(null);
      this.profileFormName.set('');
      this.profileFormRules.set(
        this.printJobTypes.map(jobType => ({
          jobType,
          printerId: '',
          copies: 1,
          enabled: false,
        }))
      );
    }
  }

  closeProfileForm(): void {
    this.showProfileForm.set(false);
    this.editingProfile.set(null);
  }

  updateRule(index: number, field: keyof PrintRoutingRule, value: unknown): void {
    this.profileFormRules.update(rules => {
      const updated = [...rules];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async saveProfile(): Promise<void> {
    const data: PrinterProfileFormData = {
      name: this.profileFormName(),
      routingRules: this.profileFormRules(),
    };

    const existing = this.editingProfile();
    if (existing) {
      await this.deviceService.updatePrinterProfile(existing.id, data);
    } else {
      await this.deviceService.createPrinterProfile(data);
    }
    this.closeProfileForm();
  }

  async deleteProfile(id: string): Promise<void> {
    await this.deviceService.deletePrinterProfile(id);
  }

  // === Peripheral Registration ===

  openPeripheralForm(): void {
    this.showPeripheralForm.set(true);
    this.peripheralParentDevice.set('');
    this.peripheralType.set('cash_drawer');
    this.peripheralName.set('');
    this.peripheralConnection.set('usb');
  }

  closePeripheralForm(): void {
    this.showPeripheralForm.set(false);
  }

  async registerPeripheral(): Promise<void> {
    await this.deviceService.registerPeripheral({
      parentDeviceId: this.peripheralParentDevice(),
      type: this.peripheralType(),
      name: this.peripheralName() || this.peripheralTypeLabels[this.peripheralType()],
      connectionType: this.peripheralConnection(),
    });
    this.closePeripheralForm();
  }

  async removePeripheral(id: string): Promise<void> {
    await this.deviceService.removePeripheral(id);
  }

  // === Peripheral Config (Step 12) ===

  testPeripheral(peripheral: PeripheralDevice): void {
    this.peripheralTestResult.set({ id: peripheral.id, result: 'testing' });
    setTimeout(() => {
      this.peripheralTestResult.set({ id: peripheral.id, result: 'success' });
      setTimeout(() => this.peripheralTestResult.set(null), 3000);
    }, 1500);
  }

  getTestResult(peripheralId: string): string | null {
    const result = this.peripheralTestResult();
    if (result?.id === peripheralId) return result.result;
    return null;
  }

  getPeripheralIcon(type: PeripheralType): string {
    return this.peripheralTypeIcons[type];
  }

  // === Kiosk Profile CRUD (Step 13) ===

  openKioskForm(profile?: KioskProfile): void {
    this.showKioskForm.set(true);
    if (profile) {
      this.editingKiosk.set(profile);
      this.kioskFormName.set(profile.name);
      this.kioskFormWelcome.set(profile.welcomeMessage);
      this.kioskFormShowImages.set(profile.showImages);
      this.kioskFormRequireName.set(profile.requireNameForOrder);
      this.kioskFormTimeout.set(profile.maxIdleSeconds);
      this.kioskFormAccessibility.set(profile.enableAccessibility);
      this.kioskFormPrimaryColor.set(profile.brandingPrimaryColor);
      this.kioskFormAccentColor.set(profile.brandingAccentColor);
      this.kioskFormCategories.set([...profile.enabledCategories]);
      this.kioskFormCategoryOrder.set([...profile.categoryDisplayOrder]);
    } else {
      this.editingKiosk.set(null);
      this.kioskFormName.set('');
      this.kioskFormWelcome.set('Welcome! Place your order here.');
      this.kioskFormShowImages.set(true);
      this.kioskFormRequireName.set(false);
      this.kioskFormTimeout.set(120);
      this.kioskFormAccessibility.set(false);
      this.kioskFormPrimaryColor.set('#006aff');
      this.kioskFormAccentColor.set('#22c55e');
      this.kioskFormCategories.set(this.categories().map(c => c.id));
      this.kioskFormCategoryOrder.set(this.categories().map(c => c.id));
    }
  }

  closeKioskForm(): void {
    this.showKioskForm.set(false);
    this.editingKiosk.set(null);
    this.showKioskPreview.set(false);
  }

  toggleKioskCategory(categoryId: string): void {
    this.kioskFormCategories.update(ids => {
      if (ids.includes(categoryId)) {
        return ids.filter(id => id !== categoryId);
      }
      return [...ids, categoryId];
    });
  }

  moveCategoryUp(index: number): void {
    if (index <= 0) return;
    this.kioskFormCategoryOrder.update(order => {
      const updated = [...order];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated;
    });
  }

  moveCategoryDown(index: number): void {
    const order = this.kioskFormCategoryOrder();
    if (index >= order.length - 1) return;
    this.kioskFormCategoryOrder.update(o => {
      const updated = [...o];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated;
    });
  }

  getCategoryName(categoryId: string): string {
    return this.categories().find(c => c.id === categoryId)?.name ?? 'Unknown';
  }

  toggleKioskPreview(): void {
    this.showKioskPreview.update(v => !v);
  }

  async saveKioskProfile(): Promise<void> {
    const data: KioskProfileFormData = {
      name: this.kioskFormName(),
      welcomeMessage: this.kioskFormWelcome(),
      showImages: this.kioskFormShowImages(),
      requireNameForOrder: this.kioskFormRequireName(),
      maxIdleSeconds: this.kioskFormTimeout(),
      enableAccessibility: this.kioskFormAccessibility(),
      brandingPrimaryColor: this.kioskFormPrimaryColor(),
      brandingAccentColor: this.kioskFormAccentColor(),
      enabledCategories: this.kioskFormCategories(),
      categoryDisplayOrder: this.kioskFormCategoryOrder(),
    };

    const existing = this.editingKiosk();
    if (existing) {
      await this.deviceService.updateKioskProfile(existing.id, data);
    } else {
      await this.deviceService.createKioskProfile(data);
    }
    this.closeKioskForm();
  }

  async deleteKioskProfile(id: string): Promise<void> {
    await this.deviceService.deleteKioskProfile(id);
  }

  // === Device Health (Step 14) ===

  getRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  getLastSeenClass(dateStr: string | null): string {
    if (!dateStr) return 'text-secondary';
    const minutes = (Date.now() - new Date(dateStr).getTime()) / 60000;
    if (minutes < 10) return 'text-success';
    if (minutes < 60) return 'text-warning';
    return 'text-danger';
  }

  // === Helpers ===

  hasPeripherals(deviceId: string): boolean {
    return this.peripherals().some(p => p.parentDeviceId === deviceId);
  }

  getPeripheralsForDevice(deviceId: string): PeripheralDevice[] {
    return this.peripherals().filter(p => p.parentDeviceId === deviceId);
  }

  updateCheckoutSetting(key: string, value: unknown): void {
    this.modeFormSettings.update(s => ({
      ...s,
      checkout: { ...s.checkout, [key]: value },
    }));
  }

  updateReceiptSetting(key: string, value: unknown): void {
    this.modeFormSettings.update(s => ({
      ...s,
      receipt: { ...s.receipt, [key]: value },
    }));
  }

  updateSecuritySetting(key: string, value: unknown): void {
    this.modeFormSettings.update(s => ({
      ...s,
      security: { ...s.security, [key]: value },
    }));
  }

  updateDisplaySetting(key: string, value: unknown): void {
    this.modeFormSettings.update(s => ({
      ...s,
      display: { ...s.display, [key]: value },
    }));
  }

  getModeName(modeId: string | null): string {
    if (!modeId) return 'None';
    return this.modes().find(m => m.id === modeId)?.name ?? 'Unknown';
  }

  getDeviceName(deviceId: string): string {
    return this.devices().find(d => d.id === deviceId)?.deviceName ?? 'Unknown';
  }

  clearError(): void {
    this.deviceService.clearError();
  }

  // --- Customer-Facing Display Config (GAP-R10) ---

  private readonly _customerDisplayConfig = signal<CustomerDisplayConfig>(defaultCustomerDisplayConfig());
  readonly customerDisplayConfig = this._customerDisplayConfig.asReadonly();

  updateCustomerDisplayConfig(field: keyof CustomerDisplayConfig, value: unknown): void {
    this._customerDisplayConfig.update(cfg => ({ ...cfg, [field]: value }));
  }

  updateTipPreset(index: number, value: string): void {
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) return;
    this._customerDisplayConfig.update(cfg => {
      const presets = [...cfg.tipPresets];
      presets[index] = num;
      return { ...cfg, tipPresets: presets };
    });
  }
}
