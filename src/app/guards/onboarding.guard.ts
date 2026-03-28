import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth';

export const onboardingGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const merchantId = auth.selectedMerchantId();

  if (!merchantId) {
    const merchants = auth.merchants();
    if (merchants.length > 1) {
      return router.createUrlTree(['/select-restaurant']);
    }
    return false;
  }

  const merchants = auth.merchants();
  const merchant = merchants.find(m => m.id === merchantId);

  if (!merchant) {
    return router.createUrlTree(['/select-restaurant']);
  }

  if (merchant.onboardingComplete === false) {
    return router.createUrlTree(['/setup']);
  }

  return true;
};
