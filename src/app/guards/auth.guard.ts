import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '@services/auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);

  if (!auth.isAuthenticated()) return false;

  if (auth.isTokenExpired()) {
    auth.handleSessionExpired();
    return false;
  }

  return true;
};
