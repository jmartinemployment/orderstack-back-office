import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DeviceService } from '../../../services/device';
import { ErrorDisplay } from '../../../shared/error-display/error-display';
import type { DeviceHardwareInfo } from '../../../models/device.model';

@Component({
  selector: 'os-pair-device',
  imports: [ReactiveFormsModule, RouterLink, ErrorDisplay],
  templateUrl: './pair-device.html',
  styleUrl: './pair-device.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PairDevice {
  private readonly fb = inject(FormBuilder);
  private readonly deviceService = inject(DeviceService);
  private readonly router = inject(Router);

  readonly isLoading = this.deviceService.isLoading;
  readonly error = this.deviceService.error;

  readonly pairForm = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(5), Validators.pattern(/^[A-Z0-9]{5}$/)]],
  });

  get codeControl() {
    return this.pairForm.get('code');
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase().replaceAll(/[^A-Z0-9]/g, '').slice(0, 5);
    this.codeControl?.setValue(input.value, { emitEvent: false });
  }

  async onSubmit(): Promise<void> {
    if (this.pairForm.invalid) {
      this.pairForm.markAllAsTouched();
      return;
    }

    const code = this.pairForm.value.code ?? '';

    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const hardwareInfo: DeviceHardwareInfo = {
      platform: nav.userAgentData?.platform ?? 'Unknown',
      osVersion: nav.userAgentData?.platform ?? null,
      appVersion: null,
      screenSize: `${globalThis.screen.width}x${globalThis.screen.height}`,
      serialNumber: null,
    };

    const device = await this.deviceService.pairDevice(code, hardwareInfo);

    if (device) {
      this.router.navigate(['/login']);
    }
  }

  clearError(): void {
    this.deviceService.clearError();
  }
}
