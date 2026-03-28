import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const deviceModeRedirectGuard = () => {
  const router = inject(Router);
  return router.createUrlTree(['/app/administration']);
};
