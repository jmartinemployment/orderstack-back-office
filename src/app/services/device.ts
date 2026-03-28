import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Device,
  DeviceFormData,
  DeviceHardwareInfo,
  DeviceHealthSummary,
  DeviceMode,
  DeviceModeFormData,
  DeviceType,
  PrinterProfile,
  PrinterProfileFormData,
  PeripheralDevice,
  PeripheralType,
  PeripheralConnectionType,
  KioskProfile,
  KioskProfileFormData,
} from '../models';
import type { DevicePosMode } from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  // --- Private writable signals ---
  private readonly _devices = signal<Device[]>([]);
  private readonly _modes = signal<DeviceMode[]>([]);
  private readonly _printerProfiles = signal<PrinterProfile[]>([]);
  private readonly _peripherals = signal<PeripheralDevice[]>([]);
  private readonly _kioskProfiles = signal<KioskProfile[]>([]);
  private readonly _currentDevice = signal<Device | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  // --- Public readonly signals ---
  readonly devices = this._devices.asReadonly();
  readonly modes = this._modes.asReadonly();
  readonly printerProfiles = this._printerProfiles.asReadonly();
  readonly peripherals = this._peripherals.asReadonly();
  readonly kioskProfiles = this._kioskProfiles.asReadonly();
  readonly currentDevice = this._currentDevice.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // --- Computed signals ---
  readonly activeDevices = computed(() => this._devices().filter(d => d.status === 'active'));
  readonly pendingDevices = computed(() =>
    this._devices().filter(d => d.status === 'pending' && (!d.expiresAt || new Date(d.expiresAt) > new Date()))
  );

  readonly isCurrentDevicePaired = computed(() => {
    const device = this._currentDevice();
    return device !== null && device.status === 'active';
  });

  readonly currentDevicePosMode = computed(() => {
    const device = this._currentDevice();
    return device?.posMode ?? null;
  });

  readonly currentDeviceMode = computed(() => {
    const device = this._currentDevice();
    if (!device?.modeId) return null;
    return this._modes().find(m => m.id === device.modeId) ?? null;
  });

  readonly defaultPrinterProfile = computed(() =>
    this._printerProfiles().find(p => p.isDefault) ?? null
  );

  readonly devicesByType = computed(() => {
    const devices = this._devices();
    const types: DeviceType[] = ['terminal', 'kds', 'kiosk', 'printer', 'register'];
    return types.map(type => ({
      type,
      count: devices.filter(d => d.deviceType === type && d.status === 'active').length,
    }));
  });

  readonly deviceHealthSummary = computed<DeviceHealthSummary>(() => {
    const devices = this._devices().filter(d => d.status === 'active');
    const now = Date.now();
    const staleThreshold = 60 * 60 * 1000; // 1 hour

    const staleDevices = devices
      .filter(d => d.lastSeenAt !== null && (now - new Date(d.lastSeenAt).getTime()) > staleThreshold)
      .map(d => ({ id: d.id, name: d.deviceName, lastSeenAt: d.lastSeenAt! }));

    const online = devices.filter(d =>
      d.lastSeenAt !== null && (now - new Date(d.lastSeenAt).getTime()) <= staleThreshold
    ).length;

    return {
      total: devices.length,
      online,
      offline: devices.length - online,
      byType: this.devicesByType(),
      staleDevices,
    };
  });

  private get merchantId(): string {
    return this.authService.selectedMerchantId() ?? '';
  }

  private get baseUrl(): string {
    return `${this.apiUrl}/merchant/${this.merchantId}`;
  }

  // --- Device CRUD ---

  async loadDevices(): Promise<void> {
    if (!this.merchantId) {
      console.warn('[DeviceService] loadDevices called with no merchantId');
      return;
    }
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const devices = await firstValueFrom(
        this.http.get<Device[]>(`${this.baseUrl}/devices`)
      );
      this._devices.set(devices);
      this.persistData('devices', devices);
    } catch {
      this.loadFallback('devices', this._devices);
    } finally {
      this._isLoading.set(false);
    }
  }

  async generateDeviceCode(data: DeviceFormData): Promise<Device | null> {
    if (!this.merchantId) {
      console.warn('[DeviceService] generateDeviceCode called with no merchantId');
      return null;
    }
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const device = await firstValueFrom(
        this.http.post<Device>(`${this.baseUrl}/devices`, data)
      );
      this._devices.update(list => [...list, device]);
      this.persistData('devices', this._devices());
      return device;
    } catch {
      this._error.set('Failed to generate device code');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async pairDevice(code: string, hardwareInfo: DeviceHardwareInfo): Promise<Device | null> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const device = await firstValueFrom(
        this.http.post<Device>(`${this.apiUrl}/devices/pair`, { code, hardwareInfo })
      );
      this._devices.update(list =>
        list.map(d => d.id === device.id ? device : d)
      );
      this._currentDevice.set(device);
      // Device ID tracked in-memory via authService.deviceId signal
      this.persistData('devices', this._devices());
      return device;
    } catch {
      this._error.set('Invalid or expired pairing code');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateDevice(id: string, data: Partial<DeviceFormData>): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.patch<Device>(`${this.baseUrl}/devices/${id}`, data)
      );
      this._devices.update(list =>
        list.map(d => d.id === id ? updated : d)
      );
      this.persistData('devices', this._devices());
    } catch {
      this._error.set('Failed to update device');
    } finally {
      this._isLoading.set(false);
    }
  }

  async revokeDevice(id: string): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/devices/${id}`)
      );
      this._devices.update(list =>
        list.map(d => d.id === id ? { ...d, status: 'revoked' as const } : d)
      );
      this.persistData('devices', this._devices());
    } catch {
      this._error.set('Failed to revoke device');
    } finally {
      this._isLoading.set(false);
    }
  }

  // --- Resolve current device (called by resolver on app init) ---

  resolveCurrentDevice(): void {
    // Skip if already resolved
    if (this._currentDevice() !== null) return;

    const deviceId = this.authService.deviceId();
    if (!deviceId) {
      this._currentDevice.set(null);
      return;
    }

    // Match against the already-loaded device list — no extra HTTP call
    const match = this._devices().find(d => d.id === deviceId);
    if (match) {
      this._currentDevice.set(match);
    } else {
      this._currentDevice.set(null);
    }
  }

  async registerBrowserDevice(posMode: DevicePosMode): Promise<Device | null> {
    if (!this.merchantId) {
      this._error.set('No restaurant selected');
      return null;
    }

    this._isLoading.set(true);
    this._error.set(null);

    const hardwareInfo: DeviceHardwareInfo = {
      platform: 'Browser',
      osVersion: (navigator as any).userAgentData?.platform ?? null,
      appVersion: null,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      serialNumber: null,
    };

    try {
      const device = await firstValueFrom(
        this.http.post<Device>(`${this.baseUrl}/devices/register-browser`, {
          posMode,
          hardwareInfo,
        })
      );
      this._currentDevice.set(device);
      // Device ID tracked in-memory via authService.deviceId signal
      this._devices.update(list => [...list, device]);
      this.persistData('devices', this._devices());
      return device;
    } catch {
      this._error.set('Failed to register device. Please check your connection and try again.');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  // --- Mode CRUD ---

  async loadModes(): Promise<void> {
    if (!this.merchantId) {
      console.warn('[DeviceService] loadModes called with no merchantId');
      return;
    }
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const modes = await firstValueFrom(
        this.http.get<DeviceMode[]>(`${this.baseUrl}/device-modes`)
      );
      this._modes.set(modes);
      this.persistData('device-modes', modes);
    } catch {
      this.loadFallback('device-modes', this._modes);
    } finally {
      this._isLoading.set(false);
    }
  }

  async createMode(data: DeviceModeFormData): Promise<DeviceMode | null> {
    if (!this.merchantId) return null;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const mode = await firstValueFrom(
        this.http.post<DeviceMode>(`${this.baseUrl}/device-modes`, data)
      );
      this._modes.update(list => [...list, mode]);
      this.persistData('device-modes', this._modes());
      return mode;
    } catch {
      this._error.set('Failed to create device mode');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateMode(id: string, data: Partial<DeviceModeFormData>): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.patch<DeviceMode>(`${this.baseUrl}/device-modes/${id}`, data)
      );
      this._modes.update(list =>
        list.map(m => m.id === id ? updated : m)
      );
      this.persistData('device-modes', this._modes());
    } catch {
      this._error.set('Failed to update device mode');
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteMode(id: string): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/device-modes/${id}`)
      );
      this._modes.update(list => list.filter(m => m.id !== id));
      this.persistData('device-modes', this._modes());
    } catch {
      this._error.set('Failed to delete device mode');
    } finally {
      this._isLoading.set(false);
    }
  }

  async assignModeToDevice(deviceId: string, modeId: string): Promise<void> {
    await this.updateDevice(deviceId, { modeId } as Partial<DeviceFormData>);
  }

  // --- Printer Profile CRUD ---

  async loadPrinterProfiles(): Promise<void> {
    if (!this.merchantId) {
      console.warn('[DeviceService] loadPrinterProfiles called with no merchantId');
      return;
    }
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const profiles = await firstValueFrom(
        this.http.get<PrinterProfile[]>(`${this.baseUrl}/printer-profiles`)
      );
      this._printerProfiles.set(profiles);
      this.persistData('printer-profiles', profiles);
    } catch {
      this.loadFallback('printer-profiles', this._printerProfiles);
    } finally {
      this._isLoading.set(false);
    }
  }

  async createPrinterProfile(data: PrinterProfileFormData): Promise<PrinterProfile | null> {
    if (!this.merchantId) return null;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const profile = await firstValueFrom(
        this.http.post<PrinterProfile>(`${this.baseUrl}/printer-profiles`, data)
      );
      this._printerProfiles.update(list => [...list, profile]);
      this.persistData('printer-profiles', this._printerProfiles());
      return profile;
    } catch {
      this._error.set('Failed to create printer profile');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updatePrinterProfile(id: string, data: Partial<PrinterProfileFormData>): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.patch<PrinterProfile>(`${this.baseUrl}/printer-profiles/${id}`, data)
      );
      this._printerProfiles.update(list =>
        list.map(p => p.id === id ? updated : p)
      );
      this.persistData('printer-profiles', this._printerProfiles());
    } catch {
      this._error.set('Failed to update printer profile');
    } finally {
      this._isLoading.set(false);
    }
  }

  async deletePrinterProfile(id: string): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/printer-profiles/${id}`)
      );
      this._printerProfiles.update(list => list.filter(p => p.id !== id));
      this.persistData('printer-profiles', this._printerProfiles());
    } catch {
      this._error.set('Failed to delete printer profile');
    } finally {
      this._isLoading.set(false);
    }
  }

  // --- Peripheral CRUD ---

  async loadPeripherals(): Promise<void> {
    if (!this.merchantId) {
      console.warn('[DeviceService] loadPeripherals called with no merchantId');
      return;
    }
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const peripherals = await firstValueFrom(
        this.http.get<PeripheralDevice[]>(`${this.baseUrl}/peripherals`)
      );
      this._peripherals.set(peripherals);
      this.persistData('peripherals', peripherals);
    } catch {
      this.loadFallback('peripherals', this._peripherals);
    } finally {
      this._isLoading.set(false);
    }
  }

  async registerPeripheral(data: {
    parentDeviceId: string;
    type: PeripheralType;
    name: string;
    connectionType: PeripheralConnectionType;
  }): Promise<PeripheralDevice | null> {
    if (!this.merchantId) return null;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const peripheral = await firstValueFrom(
        this.http.post<PeripheralDevice>(`${this.baseUrl}/peripherals`, data)
      );
      this._peripherals.update(list => [...list, peripheral]);
      this.persistData('peripherals', this._peripherals());
      return peripheral;
    } catch {
      this._error.set('Failed to register peripheral');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async removePeripheral(id: string): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/peripherals/${id}`)
      );
      this._peripherals.update(list => list.filter(p => p.id !== id));
      this.persistData('peripherals', this._peripherals());
    } catch {
      this._error.set('Failed to remove peripheral');
    } finally {
      this._isLoading.set(false);
    }
  }

  async updatePeripheral(id: string, data: Partial<{ name: string; connectionType: PeripheralConnectionType }>): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.patch<PeripheralDevice>(`${this.baseUrl}/peripherals/${id}`, data)
      );
      this._peripherals.update(list =>
        list.map(p => p.id === id ? updated : p)
      );
      this.persistData('peripherals', this._peripherals());
    } catch {
      this._error.set('Failed to update peripheral');
    } finally {
      this._isLoading.set(false);
    }
  }

  // --- Kiosk Profile CRUD ---

  async loadKioskProfiles(): Promise<void> {
    if (!this.merchantId) {
      console.warn('[DeviceService] loadKioskProfiles called with no merchantId');
      return;
    }
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const profiles = await firstValueFrom(
        this.http.get<KioskProfile[]>(`${this.baseUrl}/kiosk-profiles`)
      );
      this._kioskProfiles.set(profiles);
      this.persistData('kiosk-profiles', profiles);
    } catch {
      this.loadFallback('kiosk-profiles', this._kioskProfiles);
    } finally {
      this._isLoading.set(false);
    }
  }

  async createKioskProfile(data: KioskProfileFormData): Promise<KioskProfile | null> {
    if (!this.merchantId) return null;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const profile = await firstValueFrom(
        this.http.post<KioskProfile>(`${this.baseUrl}/kiosk-profiles`, data)
      );
      this._kioskProfiles.update(list => [...list, profile]);
      this.persistData('kiosk-profiles', this._kioskProfiles());
      return profile;
    } catch {
      this._error.set('Failed to create kiosk profile');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateKioskProfile(id: string, data: Partial<KioskProfileFormData>): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.patch<KioskProfile>(`${this.baseUrl}/kiosk-profiles/${id}`, data)
      );
      this._kioskProfiles.update(list =>
        list.map(p => p.id === id ? updated : p)
      );
      this.persistData('kiosk-profiles', this._kioskProfiles());
    } catch {
      this._error.set('Failed to update kiosk profile');
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteKioskProfile(id: string): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/kiosk-profiles/${id}`)
      );
      this._kioskProfiles.update(list => list.filter(p => p.id !== id));
      this.persistData('kiosk-profiles', this._kioskProfiles());
    } catch {
      this._error.set('Failed to delete kiosk profile');
    } finally {
      this._isLoading.set(false);
    }
  }

  // --- Utilities ---

  clearError(): void {
    this._error.set(null);
  }

  getDevicesForType(type: DeviceType): Device[] {
    return this._devices().filter(d => d.deviceType === type);
  }

  getDefaultMode(type: DeviceType): DeviceMode | null {
    return this._modes().find(m => m.deviceType === type && m.isDefault) ?? null;
  }

  getPeripheralsForDevice(deviceId: string): PeripheralDevice[] {
    return this._peripherals().filter(p => p.parentDeviceId === deviceId);
  }

  // --- Persistence helpers ---

  private persistData<T>(_key: string, _data: T): void {
    // No-op: localStorage caching removed for PCI compliance
  }

  private loadFallback<T>(_key: string, target: ReturnType<typeof signal<T[]>>): void {
    target.set([]);
  }
}
