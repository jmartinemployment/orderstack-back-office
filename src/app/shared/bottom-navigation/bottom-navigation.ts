import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../../services/order';
import { LaborService } from '../../services/labor';
import { BottomNavCheckout } from './checkout/checkout';
import { Transactions } from '../transactions/transactions';
import { DeviceService } from '../../services/device';
import {
  DevicePosMode,
  DEVICE_POS_MODE_CATALOG,
  DEVICE_POS_MODE_ROUTES,
} from '../../models/platform.model';

type BottomNavModal = 'checkout' | 'transactions' | 'notifications' | 'more' | null;

const HIDDEN_MODES: ReadonlySet<DevicePosMode> = new Set(['retail', 'services']);

const ROUTE_TO_MODE: Record<string, DevicePosMode> = Object.fromEntries(
  Object.entries(DEVICE_POS_MODE_ROUTES).map(([mode, route]) => [route, mode as DevicePosMode])
) as Record<string, DevicePosMode>;

@Component({
  selector: 'os-bottom-navigation',
  imports: [BottomNavCheckout, Transactions],
  templateUrl: './bottom-navigation.html',
  styleUrl: './bottom-navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavigation {
  readonly orderService = inject(OrderService);
  private readonly laborService = inject(LaborService);
  private readonly deviceService = inject(DeviceService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly _activeModal = signal<BottomNavModal>(null);
  readonly activeModal = this._activeModal.asReadonly();

  readonly clockOutToast = signal<string | null>(null);

  readonly availableModes = DEVICE_POS_MODE_CATALOG;

  isModeHidden(mode: DevicePosMode): boolean {
    return HIDDEN_MODES.has(mode);
  }

  isModeActive(mode: DevicePosMode): boolean {
    const currentRoute = '/' + this.router.url.split('/')[1];
    return ROUTE_TO_MODE[currentRoute] === mode;
  }

  openModal(modal: BottomNavModal): void {
    this._activeModal.set(modal);
  }

  closeModal(): void {
    this._activeModal.set(null);
  }

  selectMode(mode: DevicePosMode): void {
    this.deviceService.registerBrowserDevice(mode);
    this._activeModal.set(null);
    this.router.navigate([DEVICE_POS_MODE_ROUTES[mode]]);
  }

  async clockOut(): Promise<void> {
    const timecard = this.laborService.activeTimecard();
    const member = this.laborService.activeTeamMember();
    const name = member?.displayName ?? member?.firstName ?? 'Team Member';

    if (timecard) {
      await this.laborService.clockOutWithTips(timecard.id);
    }

    this.laborService.clearPosSession();

    this.clockOutToast.set(`Clocked out, ${name}`);
    this.cdr.markForCheck();

    setTimeout(() => {
      this.clockOutToast.set(null);
      this.cdr.markForCheck();
      this.router.navigate(['/pos-login']);
    }, 1500);
  }

  dismissNotification(id: string): void {
    this.orderService.clearItemReadyNotification(id);
  }

  getTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  }
}
