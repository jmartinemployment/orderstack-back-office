import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SupplierOrderingService } from '../../../services/supplier-ordering';
import { AuthService } from '../../../services/auth';
import type { SupplierProviderMode, SupplierCredentialPayload } from '../../../models/index';

@Component({
  selector: 'os-supplier-settings',
  standalone: true,
  imports: [],
  templateUrl: './supplier-settings.html',
  styleUrl: './supplier-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierSettings implements OnInit {
  private readonly supplierService = inject(SupplierOrderingService);
  private readonly authService = inject(AuthService);

  // Sysco form
  private readonly _syscoClientId = signal('');
  private readonly _syscoClientSecret = signal('');
  private readonly _syscoCustomerId = signal('');
  private readonly _syscoMode = signal<SupplierProviderMode>('test');

  // GFS form
  private readonly _gfsClientId = signal('');
  private readonly _gfsClientSecret = signal('');
  private readonly _gfsCustomerId = signal('');
  private readonly _gfsMode = signal<SupplierProviderMode>('test');

  private readonly _notice = signal<string | null>(null);
  private readonly _testResult = signal<string | null>(null);

  readonly credentialSummary = this.supplierService.credentialSummary;
  readonly isProcessing = this.supplierService.isProcessing;
  readonly error = this.supplierService.error;
  readonly notice = this._notice.asReadonly();
  readonly testResult = this._testResult.asReadonly();

  readonly syscoClientId = this._syscoClientId.asReadonly();
  readonly syscoClientSecret = this._syscoClientSecret.asReadonly();
  readonly syscoCustomerId = this._syscoCustomerId.asReadonly();
  readonly syscoMode = this._syscoMode.asReadonly();

  readonly gfsClientId = this._gfsClientId.asReadonly();
  readonly gfsClientSecret = this._gfsClientSecret.asReadonly();
  readonly gfsCustomerId = this._gfsCustomerId.asReadonly();
  readonly gfsMode = this._gfsMode.asReadonly();

  readonly isManagerOrAbove = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'owner' || role === 'manager' || role === 'super_admin';
  });

  readonly canSaveSyscoCredentials = computed(() => {
    if (!this.isManagerOrAbove()) return false;
    if (this.isProcessing()) return false;

    const status = this.credentialSummary()?.sysco;
    const hasClientId = this._syscoClientId().trim().length > 0;
    const hasClientSecret = this._syscoClientSecret().trim().length > 0;
    const hasCustomerId = this._syscoCustomerId().trim().length > 0;
    const modeChanged = this._syscoMode() !== (status?.mode ?? 'test');

    if (status?.configured) {
      return hasClientId || hasClientSecret || hasCustomerId || modeChanged;
    }
    return hasClientId && hasClientSecret && hasCustomerId;
  });

  readonly canSaveGfsCredentials = computed(() => {
    if (!this.isManagerOrAbove()) return false;
    if (this.isProcessing()) return false;

    const status = this.credentialSummary()?.gfs;
    const hasClientId = this._gfsClientId().trim().length > 0;
    const hasClientSecret = this._gfsClientSecret().trim().length > 0;
    const hasCustomerId = this._gfsCustomerId().trim().length > 0;
    const modeChanged = this._gfsMode() !== (status?.mode ?? 'test');

    if (status?.configured) {
      return hasClientId || hasClientSecret || hasCustomerId || modeChanged;
    }
    return hasClientId && hasClientSecret && hasCustomerId;
  });

  readonly canDeleteSyscoCredentials = computed(() =>
    this.isManagerOrAbove() && Boolean(this.credentialSummary()?.sysco.configured) && !this.isProcessing()
  );

  readonly canDeleteGfsCredentials = computed(() =>
    this.isManagerOrAbove() && Boolean(this.credentialSummary()?.gfs.configured) && !this.isProcessing()
  );

  readonly canTestSysco = computed(() =>
    this.isManagerOrAbove() && Boolean(this.credentialSummary()?.sysco.configured) && !this.isProcessing()
  );

  readonly canTestGfs = computed(() =>
    this.isManagerOrAbove() && Boolean(this.credentialSummary()?.gfs.configured) && !this.isProcessing()
  );

  ngOnInit(): void {
    this.supplierService.loadCredentialSummary().then(() => {
      this._syscoMode.set(this.credentialSummary()?.sysco.mode ?? 'test');
      this._gfsMode.set(this.credentialSummary()?.gfs.mode ?? 'test');
    });
  }

  // Sysco form handlers
  onSyscoClientIdInput(event: Event): void {
    this._syscoClientId.set((event.target as HTMLInputElement).value);
    this.clearNotice();
  }

  onSyscoClientSecretInput(event: Event): void {
    this._syscoClientSecret.set((event.target as HTMLInputElement).value);
    this.clearNotice();
  }

  onSyscoCustomerIdInput(event: Event): void {
    this._syscoCustomerId.set((event.target as HTMLInputElement).value);
    this.clearNotice();
  }

  onSyscoModeChange(event: Event): void {
    this._syscoMode.set((event.target as HTMLSelectElement).value as SupplierProviderMode);
    this.clearNotice();
  }

  // GFS form handlers
  onGfsClientIdInput(event: Event): void {
    this._gfsClientId.set((event.target as HTMLInputElement).value);
    this.clearNotice();
  }

  onGfsClientSecretInput(event: Event): void {
    this._gfsClientSecret.set((event.target as HTMLInputElement).value);
    this.clearNotice();
  }

  onGfsCustomerIdInput(event: Event): void {
    this._gfsCustomerId.set((event.target as HTMLInputElement).value);
    this.clearNotice();
  }

  onGfsModeChange(event: Event): void {
    this._gfsMode.set((event.target as HTMLSelectElement).value as SupplierProviderMode);
    this.clearNotice();
  }

  async saveSyscoCredentials(): Promise<void> {
    if (!this.canSaveSyscoCredentials()) return;

    const payload: SupplierCredentialPayload = {};
    const clientId = this._syscoClientId().trim();
    const clientSecret = this._syscoClientSecret().trim();
    const customerId = this._syscoCustomerId().trim();
    const mode = this._syscoMode();

    if (clientId) payload.clientId = clientId;
    if (clientSecret) payload.clientSecret = clientSecret;
    if (customerId) payload.customerId = customerId;
    const status = this.credentialSummary()?.sysco;
    if (mode !== (status?.mode ?? 'test')) payload.mode = mode;

    const saved = await this.supplierService.saveSyscoCredentials(payload);
    if (saved) {
      this._syscoClientId.set('');
      this._syscoClientSecret.set('');
      this._syscoCustomerId.set('');
      this._syscoMode.set(this.credentialSummary()?.sysco.mode ?? mode);
      this._notice.set('Sysco credentials saved successfully.');
    }
  }

  async saveGfsCredentials(): Promise<void> {
    if (!this.canSaveGfsCredentials()) return;

    const payload: SupplierCredentialPayload = {};
    const clientId = this._gfsClientId().trim();
    const clientSecret = this._gfsClientSecret().trim();
    const customerId = this._gfsCustomerId().trim();
    const mode = this._gfsMode();

    if (clientId) payload.clientId = clientId;
    if (clientSecret) payload.clientSecret = clientSecret;
    if (customerId) payload.customerId = customerId;
    const status = this.credentialSummary()?.gfs;
    if (mode !== (status?.mode ?? 'test')) payload.mode = mode;

    const saved = await this.supplierService.saveGfsCredentials(payload);
    if (saved) {
      this._gfsClientId.set('');
      this._gfsClientSecret.set('');
      this._gfsCustomerId.set('');
      this._gfsMode.set(this.credentialSummary()?.gfs.mode ?? mode);
      this._notice.set('GFS credentials saved successfully.');
    }
  }

  async deleteSyscoCredentials(): Promise<void> {
    if (!this.canDeleteSyscoCredentials()) return;
    const deleted = await this.supplierService.deleteSyscoCredentials();
    if (deleted) {
      this._syscoClientId.set('');
      this._syscoClientSecret.set('');
      this._syscoCustomerId.set('');
      this._syscoMode.set('test');
      this._notice.set('Sysco credentials deleted.');
    }
  }

  async deleteGfsCredentials(): Promise<void> {
    if (!this.canDeleteGfsCredentials()) return;
    const deleted = await this.supplierService.deleteGfsCredentials();
    if (deleted) {
      this._gfsClientId.set('');
      this._gfsClientSecret.set('');
      this._gfsCustomerId.set('');
      this._gfsMode.set('test');
      this._notice.set('GFS credentials deleted.');
    }
  }

  async testSyscoConnection(): Promise<void> {
    if (!this.canTestSysco()) return;
    this._testResult.set(null);
    const result = await this.supplierService.testConnection('sysco');
    if (result) {
      this._testResult.set(result.message);
    }
  }

  async testGfsConnection(): Promise<void> {
    if (!this.canTestGfs()) return;
    this._testResult.set(null);
    const result = await this.supplierService.testConnection('gfs');
    if (result) {
      this._testResult.set(result.message);
    }
  }

  private clearNotice(): void {
    this._notice.set(null);
    this._testResult.set(null);
    this.supplierService.clearError();
  }
}
