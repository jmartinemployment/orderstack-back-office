import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { DeviceService } from '../services/device';
import { PlatformService } from '../services/platform';
import { AuthService } from '../services/auth';

export const deviceInitResolver: ResolveFn<boolean> = async (_route, state) => {
  const deviceService = inject(DeviceService);
  const platformService = inject(PlatformService);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return false;
  }

  // Ensure merchantId is set before loading anything
  if (!authService.selectedMerchantId()) {
    const restaurants = authService.merchants();

    if (restaurants.length === 1) {
      const r = restaurants[0];
      authService.selectMerchant(r.id, r.name);
    } else if (restaurants.length > 1) {
      router.navigate(['/select-restaurant']);
      return false;
    } else {
      return false;
    }
  }

  // Load merchant profile and device list in parallel
  await Promise.allSettled([
    platformService.loadMerchantProfile(),
    deviceService.loadDevices(),
  ]);

  // Resolve current device from already-loaded list (no extra HTTP call)
  // Uses authService.deviceId() signal instead of localStorage
  deviceService.resolveCurrentDevice();

  const posMode = deviceService.currentDevicePosMode();
  if (posMode) {
    platformService.setDeviceModeFromDevice(posMode);
  }

  // Redirect dedicated device types to their screens when landing on default route
  const device = deviceService.currentDevice();
  const targetPath = state.url.replace(/^\//, '').split('?')[0];
  const isDefaultRoute = targetPath === '' || targetPath === 'administration' || targetPath === 'app' || targetPath === 'app/administration';

  if (device && isDefaultRoute) {
    switch (device.deviceType) {
      case 'kds':
        router.navigate(['/kds']);
        return false;
      case 'kiosk':
        router.navigate(['/kiosk']);
        return false;
      case 'printer':
        break;
      case 'register':
      case 'terminal':
        break;
    }
  }

  return true;
};
