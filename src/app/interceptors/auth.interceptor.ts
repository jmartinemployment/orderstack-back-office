import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';
import { ElectronDeviceService } from '../services/electron-device';

const PUBLIC_ROUTE_PATTERNS = ['/kiosk/', '/order/', '/shop/', '/pay/', '/signup', '/login', '/reset-password'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const deviceService = inject(ElectronDeviceService);
  const currentPath = globalThis.location?.pathname ?? '';
  const isPublicRoute = PUBLIC_ROUTE_PATTERNS.some(p => currentPath.startsWith(p));

  const token = authService.token();
  const deviceInfo = deviceService.info;
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (deviceInfo?.biosUuid) {
    headers['x-device-id'] = deviceInfo.biosUuid;
  }
  if (deviceInfo?.macAddress) {
    headers['x-mac-address'] = deviceInfo.macAddress;
  }

  const clonedReq = req.clone({ setHeaders: headers });

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isPublicRoute) {
        authService.handleSessionExpired();
      }
      // Always propagate — let callers handle errors (loading state, user messages)
      return throwError(() => error);
    })
  );
};
