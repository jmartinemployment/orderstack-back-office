import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DeviceService } from '../../../services/device';
import { PlatformService } from '../../../services/platform';
import { AuthService } from '../../../services/auth';
import { DeviceHardwareInfo } from '../../../models/index';

type SetupPhase = 'device' | 'pin' | 'pin-entry' | 'success';

interface OwnerInfo {
  displayName: string;
  pin: string;
}

@Component({
  selector: 'os-device-setup',
  standalone: true,
  imports: [],
  templateUrl: './device-setup.html',
  styleUrl: './device-setup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceSetup implements OnInit {
  private readonly router = inject(Router);
  private readonly deviceService = inject(DeviceService);
  private readonly platformService = inject(PlatformService);
  private readonly authService = inject(AuthService);

  // --- Phase ---
  readonly phase = signal<SetupPhase>('device');

  // --- Device pairing ---
  readonly pairingCode = signal('');
  readonly isPairing = signal(false);
  readonly pairingError = signal<string | null>(null);
  readonly pairingSuccess = signal(false);

  readonly codeDigits = computed(() => {
    const code = this.pairingCode();
    return code.toUpperCase().split('').slice(0, 5);
  });

  readonly isCodeComplete = computed(() => this.pairingCode().length === 5);

  // --- PIN login ---
  readonly ownerInfo = signal<OwnerInfo | null>(null);
  readonly pinDigits = signal('');
  readonly pinError = signal<string | null>(null);
  readonly isAuthenticating = signal(false);
  readonly failedAttempts = signal(0);

  readonly pinDots = computed(() => {
    const len = this.pinDigits().length;
    return Array.from({ length: 6 }, (_, i) => i < len);
  });

  readonly ownerInitials = computed(() => {
    const name = this.ownerInfo()?.displayName ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  });

  readonly ownerColor = computed(() => {
    const name = this.ownerInfo()?.displayName ?? '';
    const colors = ['#7c5cfc', '#e74c3c', '#2ecc71', '#f39c12', '#3498db', '#9b59b6', '#1abc9c', '#e67e22'];
    let hash = 0;
    for (const char of name) {
      hash = (char.codePointAt(0) ?? 0) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  });

  // === Init ===

  ngOnInit(): void {
    // If device is already paired (e.g., user refreshed after "Get Started"),
    // skip directly to the PIN phase instead of showing device setup again.
    if (this.deviceService.isCurrentDevicePaired()) {
      this.enterPinPhase();
    }
  }

  // === Device Phase ===

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replaceAll(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5);
    this.pairingCode.set(value);
    this.pairingError.set(null);
  }

  async submitCode(): Promise<void> {
    if (!this.isCodeComplete()) return;

    this.isPairing.set(true);
    this.pairingError.set(null);

    const hardwareInfo = this.detectHardwareInfo();
    const device = await this.deviceService.pairDevice(this.pairingCode(), hardwareInfo);

    if (device) {
      this.pairingSuccess.set(true);
      if (device.posMode) {
        this.platformService.setDeviceModeFromDevice(device.posMode);
      }
      setTimeout(() => this.enterPinPhase(), 1500);
    } else {
      this.pairingError.set(this.deviceService.error() ?? 'Invalid or expired pairing code');
    }

    this.isPairing.set(false);
  }

  async getStarted(): Promise<void> {
    const profile = this.platformService.merchantProfile();
    const defaultMode = profile?.defaultDeviceMode ?? 'full_service';

    // Register this browser as a device via the backend
    const device = await this.deviceService.registerBrowserDevice(defaultMode);
    if (!device) {
      this.pairingError.set(this.deviceService.error() ?? 'Failed to register device');
      return;
    }

    this.platformService.setDeviceModeFromDevice(defaultMode);
    this.enterPinPhase();
  }

  // === PIN Phase ===

  private enterPinPhase(): void {
    const owner = this.loadOwnerInfo();
    if (owner) {
      this.ownerInfo.set(owner);
      this.phase.set('pin');
    } else {
      // No owner PIN configured — go straight to landing
      this.navigateToLanding();
    }
  }

  private loadOwnerInfo(): OwnerInfo | null {
    const raw = localStorage.getItem('onboarding-payload');
    if (!raw) return null;
    try {
      const payload = JSON.parse(raw) as { ownerPin?: { displayName: string; pin: string } };
      if (payload.ownerPin?.displayName && payload.ownerPin?.pin) {
        return { displayName: payload.ownerPin.displayName, pin: payload.ownerPin.pin };
      }
    } catch {
      // Corrupt
    }
    return null;
  }

  onPinDigit(digit: string): void {
    if (this.isAuthenticating()) return;
    const current = this.pinDigits();
    if (current.length >= 6) return;

    const updated = current + digit;
    this.pinDigits.set(updated);
    this.pinError.set(null);

    // Auto-submit when PIN length matches owner's PIN length
    const owner = this.ownerInfo();
    if (updated.length === owner?.pin.length) {
      this.validatePin(updated);
    }
  }

  onPinBackspace(): void {
    this.pinDigits.update(d => d.slice(0, -1));
    this.pinError.set(null);
  }

  onPinClear(): void {
    this.pinDigits.set('');
    this.pinError.set(null);
  }

  private validatePin(entered: string): void {
    const owner = this.ownerInfo();
    if (!owner) return;

    this.isAuthenticating.set(true);

    if (entered === owner.pin) {
      this.phase.set('success');
      setTimeout(() => this.navigateToLanding(), 1000);
    } else {
      const attempts = this.failedAttempts() + 1;
      this.failedAttempts.set(attempts);
      this.pinError.set(attempts >= 5 ? 'Too many attempts. Please refresh and try again.' : `Wrong PIN (${5 - attempts} attempts left)`);
      this.pinDigits.set('');
    }

    this.isAuthenticating.set(false);
  }

  // === Navigation ===

  private navigateToLanding(): void {
    const posMode = this.platformService.currentDeviceMode();

    switch (posMode) {
      case 'full_service':
        this.router.navigate(['/floor-plan']);
        break;
      case 'quick_service':
        this.router.navigate(['/pos']);
        break;
      case 'bar':
        this.router.navigate(['/pos']);
        break;
      case 'bookings':
        this.router.navigate(['/bookings-terminal']);
        break;
      case 'services':
        this.router.navigate(['/app/invoicing']);
        break;
      default:
        this.router.navigate(['/app/orders']);
        break;
    }
  }

  private detectHardwareInfo(): DeviceHardwareInfo {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const uaPlatform = nav.userAgentData?.platform ?? '';
    const ua = uaPlatform || navigator.userAgent;
    let platform = 'Browser';
    if (/iPad/i.exec(ua)) platform = 'iPad';
    else if (/Android/i.exec(ua)) platform = 'Android';
    else if (/Windows/i.exec(ua)) platform = 'Windows';
    else if (/Mac/i.exec(ua)) platform = 'Mac';

    return {
      platform,
      osVersion: uaPlatform || null,
      appVersion: null,
      screenSize: `${globalThis.screen.width}x${globalThis.screen.height}`,
      serialNumber: null,
    };
  }
}
