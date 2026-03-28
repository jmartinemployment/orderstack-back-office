import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth';
import { UserRole } from '@models/index';

/**
 * Functional route guard factory that restricts access to specific roles.
 * Usage: canActivate: [roleGuard('owner', 'manager')]
 */
export const roleGuard = (...allowedRoles: UserRole[]) => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const role = auth.user()?.role;

    if (role && allowedRoles.includes(role)) {
      return true;
    }

    return router.createUrlTree(['/app/home']);
  };
};
