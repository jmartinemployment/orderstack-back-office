import {
  Component, inject, signal, computed, OnInit, ChangeDetectionStrategy,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../services/auth';
import { MfaStatus, MfaTrustedDevice } from '../../../models/index';

type MfaView = 'status' | 'enter-code' | 'disable-confirm';

@Component({
  selector: 'os-mfa-settings',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './mfa-settings.html',
  styleUrl: './mfa-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaSettings implements OnInit {
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  private readonly _view = signal<MfaView>('status');
  readonly view = this._view.asReadonly();

  private readonly _status = signal<MfaStatus | null>(null);
  readonly status = this._status.asReadonly();

  private readonly _maskedEmail = signal<string | null>(null);
  readonly maskedEmail = this._maskedEmail.asReadonly();

  private readonly _isLoading = signal(false);
  readonly isLoading = this._isLoading.asReadonly();

  private readonly _error = signal<string | null>(null);
  readonly error = this._error.asReadonly();

  private readonly _success = signal<string | null>(null);
  readonly success = this._success.asReadonly();

  private readonly _trustedDevices = signal<MfaTrustedDevice[]>([]);
  readonly trustedDevices = this._trustedDevices.asReadonly();

  private readonly _revoking = signal<string | null>(null);
  readonly revoking = this._revoking.asReadonly();

  readonly mfaEnabled = computed(() => this._status()?.enabled ?? false);
  readonly isPrivileged = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'owner' || role === 'super_admin';
  });

  codeForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  async ngOnInit(): Promise<void> {
    await this.loadStatus();
  }

  private async loadStatus(): Promise<void> {
    try {
      const status = await this.authService.getMfaStatus();
      this._status.set(status);
      if (status.enabled) {
        await this.loadTrustedDevices();
      }
    } catch {
      this._error.set('Could not load MFA status.');
    }
  }

  private async loadTrustedDevices(): Promise<void> {
    const merchantId = this.authService.selectedMerchantId();
    const devices = await this.authService.getTrustedDevices(
      this.isPrivileged() && merchantId ? merchantId : undefined
    );
    this._trustedDevices.set(devices);
  }

  async startSetup(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const data = await this.authService.setupMfa();
      this._maskedEmail.set(data.maskedEmail);
      this.codeForm.reset();
      this._view.set('enter-code');
    } catch {
      this._error.set('Failed to send verification code. Please try again.');
    } finally {
      this._isLoading.set(false);
    }
  }

  async submitCode(): Promise<void> {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }

    this._isLoading.set(true);
    this._error.set(null);

    const code = (this.codeForm.value.code as string).trim();
    const result = await this.authService.verifyMfaCode(code);

    this._isLoading.set(false);

    if (result.success) {
      this._status.set({ enabled: true });
      this._success.set('Two-factor authentication is now enabled on your account.');
      this._view.set('status');
      await this.loadTrustedDevices();
    } else {
      this._error.set(result.error ?? 'Invalid code. Please try again.');
    }
  }

  showDisableConfirm(): void {
    this._error.set(null);
    this._view.set('disable-confirm');
  }

  cancelDisable(): void {
    this._view.set('status');
  }

  async confirmDisable(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    const result = await this.authService.disableMfa();

    this._isLoading.set(false);

    if (result.success) {
      this._status.set({ enabled: false });
      this._trustedDevices.set([]);
      this._success.set('Two-factor authentication has been disabled.');
      this._view.set('status');
    } else {
      this._error.set(result.error ?? 'Failed to disable MFA. Please try again.');
    }
  }

  async revokeTrustedDevice(id: string): Promise<void> {
    this._revoking.set(id);
    const result = await this.authService.revokeTrustedDevice(id);
    this._revoking.set(null);

    if (result.success) {
      this._trustedDevices.update(devices => devices.filter(d => d.id !== id));
      this._success.set('Trusted device revoked. That browser will require MFA on next login.');
    } else {
      this._error.set('Failed to revoke trusted device.');
    }
  }

  async revokeAllTrust(teamMemberId: string): Promise<void> {
    this._isLoading.set(true);
    const result = await this.authService.revokeAllTrust(teamMemberId);
    this._isLoading.set(false);

    if (result.success) {
      this._trustedDevices.update(devices => devices.filter(d => d.teamMemberId !== teamMemberId));
      this._success.set('All trusted devices revoked for this user.');
    } else {
      this._error.set('Failed to revoke trusted devices.');
    }
  }

  isExpired(expiresAt: string): boolean {
    return new Date(expiresAt) <= new Date();
  }

  dismissSuccess(): void {
    this._success.set(null);
  }

  dismissError(): void {
    this._error.set(null);
  }
}
