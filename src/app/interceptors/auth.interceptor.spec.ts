import '../../test-setup';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '@services/auth';

function createMockAuthService(tokenValue: string | null = null) {
  return {
    token: signal(tokenValue).asReadonly(),
    handleSessionExpired: vi.fn(),
    setLoginError: vi.fn(),
  };
}

function configureTestBed(tokenValue: string | null = null) {
  const mockAuth = createMockAuthService(tokenValue);

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: mockAuth },
    ],
  });

  return {
    http: TestBed.inject(HttpClient),
    httpTesting: TestBed.inject(HttpTestingController),
    mockAuth,
  };
}

describe('authInterceptor', () => {
  describe('Authorization header', () => {
    let http: HttpClient;
    let httpTesting: HttpTestingController;

    afterEach(() => {
      httpTesting.verify();
    });

    it('sets Authorization Bearer header when token is present', () => {
      const ctx = configureTestBed('my-jwt-token');
      http = ctx.http;
      httpTesting = ctx.httpTesting;

      http.get('/api/data').subscribe();
      const req = httpTesting.expectOne('/api/data');
      expect(req.request.headers.get('Authorization')).toBe('Bearer my-jwt-token');
      req.flush({});
    });

    it('does not set Authorization header when token is null', () => {
      const ctx = configureTestBed(null);
      http = ctx.http;
      httpTesting = ctx.httpTesting;

      http.get('/api/data').subscribe();
      const req = httpTesting.expectOne('/api/data');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('does not set withCredentials', () => {
      const ctx = configureTestBed('tok');
      http = ctx.http;
      httpTesting = ctx.httpTesting;

      http.get('/api/data').subscribe();
      const req = httpTesting.expectOne('/api/data');
      expect(req.request.withCredentials).toBe(false);
      req.flush({});
    });
  });

  describe('401 on app routes (session expiry)', () => {
    let http: HttpClient;
    let httpTesting: HttpTestingController;
    let mockAuth: ReturnType<typeof createMockAuthService>;
    let originalLocation: Location;

    beforeEach(() => {
      const ctx = configureTestBed();
      http = ctx.http;
      httpTesting = ctx.httpTesting;
      mockAuth = ctx.mockAuth;
      originalLocation = globalThis.location;
      // Simulate an authenticated app route (not public)
      Object.defineProperty(globalThis, 'location', {
        value: { pathname: '/app/administration' },
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(globalThis, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });

    it('401 response triggers handleSessionExpired on app route', () => {
      http.get('/api/protected').subscribe({
        error: () => { /* expected */ },
      });
      const req = httpTesting.expectOne('/api/protected');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(mockAuth.handleSessionExpired).toHaveBeenCalledTimes(1);
    });

    it('401 error is re-thrown to the caller on app route', () => {
      let caughtError: unknown = null;

      http.get('/api/protected').subscribe({
        error: (err) => { caughtError = err; },
      });
      const req = httpTesting.expectOne('/api/protected');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(caughtError).not.toBeNull();
      expect((caughtError as { status: number }).status).toBe(401);
    });

    it('non-401 error (403) does NOT trigger handleSessionExpired', () => {
      http.get('/api/data').subscribe({
        error: () => { /* expected */ },
      });
      const req = httpTesting.expectOne('/api/data');
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

      expect(mockAuth.handleSessionExpired).not.toHaveBeenCalled();
    });

    it('non-401 error (500) does NOT trigger handleSessionExpired', () => {
      http.get('/api/data').subscribe({
        error: () => { /* expected */ },
      });
      const req = httpTesting.expectOne('/api/data');
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      expect(mockAuth.handleSessionExpired).not.toHaveBeenCalled();
    });

    it('successful responses pass through unchanged', () => {
      let result: unknown = null;

      http.get('/api/data').subscribe({
        next: (data) => { result = data; },
      });
      const req = httpTesting.expectOne('/api/data');
      req.flush({ items: [1, 2, 3] });

      expect(result).toEqual({ items: [1, 2, 3] });
      expect(mockAuth.handleSessionExpired).not.toHaveBeenCalled();
    });
  });

  describe('401 on public routes (swallowed)', () => {
    let http: HttpClient;
    let httpTesting: HttpTestingController;
    let mockAuth: ReturnType<typeof createMockAuthService>;
    let originalLocation: Location;

    beforeEach(() => {
      const ctx = configureTestBed();
      http = ctx.http;
      httpTesting = ctx.httpTesting;
      mockAuth = ctx.mockAuth;
      originalLocation = globalThis.location;
    });

    afterEach(() => {
      Object.defineProperty(globalThis, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });

    it('401 on /login route propagates error to caller (not handleSessionExpired)', () => {
      Object.defineProperty(globalThis, 'location', {
        value: { pathname: '/login' },
        writable: true,
        configurable: true,
      });

      let errored = false;

      http.post('/api/auth/login', { email: 'a@b.com', password: 'x' }).subscribe({
        error: () => { errored = true; },
      });
      const req = httpTesting.expectOne('/api/auth/login');
      req.flush({ error: 'Invalid email or password' }, { status: 401, statusText: 'Unauthorized' });

      expect(mockAuth.handleSessionExpired).not.toHaveBeenCalled();
      expect(mockAuth.setLoginError).not.toHaveBeenCalled();
      expect(errored).toBe(true);
    });

    it('401 on /signup route propagates error to caller (not handleSessionExpired)', () => {
      Object.defineProperty(globalThis, 'location', {
        value: { pathname: '/signup' },
        writable: true,
        configurable: true,
      });

      let errored = false;

      http.post('/api/auth/verify-email', { email: 'a@b.com', code: '123456' }).subscribe({
        error: () => { errored = true; },
      });
      const req = httpTesting.expectOne('/api/auth/verify-email');
      req.flush({ error: 'No verification pending for this email' }, { status: 401, statusText: 'Unauthorized' });

      expect(mockAuth.handleSessionExpired).not.toHaveBeenCalled();
      expect(mockAuth.setLoginError).not.toHaveBeenCalled();
      expect(errored).toBe(true);
    });

    it('401 on /kiosk/ route propagates error to caller (not handleSessionExpired)', () => {
      Object.defineProperty(globalThis, 'location', {
        value: { pathname: '/kiosk/order' },
        writable: true,
        configurable: true,
      });

      let errored = false;

      http.get('/api/kiosk/menu').subscribe({
        error: () => { errored = true; },
      });
      const req = httpTesting.expectOne('/api/kiosk/menu');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(mockAuth.handleSessionExpired).not.toHaveBeenCalled();
      expect(errored).toBe(true);
    });

    it('401 on /reset-password route propagates error to caller (not handleSessionExpired)', () => {
      Object.defineProperty(globalThis, 'location', {
        value: { pathname: '/reset-password' },
        writable: true,
        configurable: true,
      });

      let errored = false;

      http.post('/api/auth/reset-password', {}).subscribe({
        error: () => { errored = true; },
      });
      const req = httpTesting.expectOne('/api/auth/reset-password');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(mockAuth.handleSessionExpired).not.toHaveBeenCalled();
      expect(errored).toBe(true);
    });
  });
});
