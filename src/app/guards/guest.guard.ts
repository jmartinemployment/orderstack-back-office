import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth';

/**
 * Redirects already-authenticated users away from login/signup pages.
 * If authenticated but no merchant yet, sends to /business-type.
 */
export const guestGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true; // Not logged in — allow access to login/signup
  }

  // Authenticated but no merchant — send to business type selection
  const restaurants = auth.merchants();
  if (restaurants.length === 0 && !auth.selectedMerchantId()) {
    return router.createUrlTree(['/business-type']);
  }

  return router.createUrlTree([auth.getPostAuthRoute()]);
};
