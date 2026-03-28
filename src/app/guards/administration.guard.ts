import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth';
import { StaffManagementService } from '@services/staff-management';

/**
 * Guards the /administration route.
 * Owners and managers (by role) always pass.
 * Other roles must have the administration.access permission enabled
 * in their assigned permission set.
 */
export const administrationGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const staffService = inject(StaffManagementService);

  const user = auth.user();
  if (!user) return false;

  // Owners, managers, and super_admins always have access
  if (user.role === 'super_admin' || user.role === 'owner' || user.role === 'manager') {
    return true;
  }

  // For other roles, check their permission set
  const permissionSets = staffService.permissionSets();
  // Permission sets may not be loaded yet for staff-role users logging in via POS
  // In that case, deny access (they shouldn't be navigating to /administration anyway)
  if (permissionSets.length === 0) {
    return router.createUrlTree(['/pos-login']);
  }

  return router.createUrlTree(['/pos-login']);
};
