import '../../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { Login } from './login';
import { AuthService } from '../../../services/auth';

function createMockAuthService() {
  const _isLoading = signal(false);
  const _error = signal<string | null>(null);
  const _sessionExpiredMessage = signal<string | null>(null);

  return {
    _isLoading,
    _error,
    _sessionExpiredMessage,
    isLoading: _isLoading.asReadonly(),
    error: _error.asReadonly(),
    sessionExpiredMessage: _sessionExpiredMessage.asReadonly(),
    submitLogin: vi.fn(),
    clearError: vi.fn(),
    clearSessionExpiredMessage: vi.fn(),
    requestPasswordReset: vi.fn().mockResolvedValue({ success: true }),
  };
}

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let component: Login;
  let authService: ReturnType<typeof createMockAuthService>;

  beforeEach(() => {
    authService = createMockAuthService();

    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    });
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // --- Rendering ---

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the two-panel layout', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.auth-layout')).toBeTruthy();
    expect(el.querySelector('.promo-panel')).toBeTruthy();
    expect(el.querySelector('.form-panel')).toBeTruthy();
  });

  it('shows email and password fields only (no firstName/lastName)', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#email')).toBeTruthy();
    expect(el.querySelector('#password')).toBeTruthy();
    expect(el.querySelector('#firstName')).toBeFalsy();
    expect(el.querySelector('#lastName')).toBeFalsy();
  });

  it('shows Sign In button', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.btn-signin')).toBeTruthy();
  });

  it('email input has autocomplete="email"', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#email');
    expect(input.getAttribute('autocomplete')).toBe('email');
  });

  it('password input has autocomplete="current-password"', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#password');
    expect(input.getAttribute('autocomplete')).toBe('current-password');
  });

  // --- Password visibility ---

  it('toggles password visibility', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(true);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(false);
  });

  it('renders password field as password type by default', () => {
    const input = fixture.nativeElement.querySelector('#password');
    expect(input.type).toBe('password');
  });

  it('renders password field as text when visibility toggled', () => {
    component.togglePasswordVisibility();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#password');
    expect(input.type).toBe('text');
  });

  // --- Sign In validation ---

  it('marks form touched on invalid Sign In', () => {
    component.onSignIn();
    expect(component.emailControl?.touched).toBe(true);
    expect(component.passwordControl?.touched).toBe(true);
    expect(authService.submitLogin).not.toHaveBeenCalled();
  });

  it('calls submitLogin with email and password', () => {
    component.form.patchValue({ email: 'user@test.com', password: 'Pass123!abcde' });
    component.onSignIn();
    expect(authService.submitLogin).toHaveBeenCalledWith({
      email: 'user@test.com', password: 'Pass123!abcde',
    });
    expect(authService.clearSessionExpiredMessage).toHaveBeenCalled();
  });

  it('does not call submitLogin when form is invalid', () => {
    component.form.patchValue({ email: 'bad', password: 'short' });
    component.onSignIn();
    expect(authService.submitLogin).not.toHaveBeenCalled();
  });

  // --- Error display ---

  it('shows error when error signal has value', () => {
    authService._error.set('Invalid credentials');
    fixture.detectChanges();
    const errorDisplay = fixture.nativeElement.querySelector('os-error-display');
    expect(errorDisplay).toBeTruthy();
  });

  // --- Session expired ---

  it('shows session expired warning', () => {
    authService._sessionExpiredMessage.set('Session expired');
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('.alert-warning');
    expect(alert?.textContent).toContain('Session expired');
  });

  // --- clearError ---

  it('calls authService.clearError()', () => {
    component.clearError();
    expect(authService.clearError).toHaveBeenCalled();
  });

  // --- Form accessors ---

  it('exposes email and password control accessors', () => {
    expect(component.emailControl).toBe(component.form.get('email'));
    expect(component.passwordControl).toBe(component.form.get('password'));
  });

  // --- Email control validators ---

  it('email control is invalid when empty', () => {
    const email = component.emailControl!;
    email.setValue('');
    expect(email.valid).toBe(false);
    expect(email.errors?.['required']).toBeTruthy();
  });

  it('email control is invalid for non-email string', () => {
    const email = component.emailControl!;
    email.setValue('not-an-email');
    expect(email.valid).toBe(false);
    expect(email.errors?.['email']).toBeTruthy();
  });

  it('email control is valid for properly formatted email', () => {
    const email = component.emailControl!;
    email.setValue('test@example.com');
    expect(email.valid).toBe(true);
    expect(email.errors).toBeNull();
  });
});
