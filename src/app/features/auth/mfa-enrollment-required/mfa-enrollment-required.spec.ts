import '../../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { MfaEnrollmentRequired } from './mfa-enrollment-required';
import { AuthService } from '../../../services/auth';

function createMockAuthService() {
  const _mfaEnrollmentRequired = signal(true);
  const _mfaGraceDeadline = signal<string | null>(null);
  const _merchants = signal<{ id: string; name: string; slug: string; role: string; onboardingComplete: boolean }[]>([
    { id: 'r-1', name: 'Test Restaurant', slug: 'test', role: 'owner', onboardingComplete: true },
  ]);
  const _selectedMerchantId = signal<string | null>('r-1');

  return {
    _mfaEnrollmentRequired,
    _mfaGraceDeadline,
    _merchants,
    _selectedMerchantId,
    mfaEnrollmentRequired: _mfaEnrollmentRequired.asReadonly(),
    mfaGraceDeadline: _mfaGraceDeadline.asReadonly(),
    merchants: _merchants.asReadonly(),
    selectedMerchantId: _selectedMerchantId.asReadonly(),
    getPostAuthRoute: vi.fn().mockReturnValue('/app/administration'),
    selectMerchant: vi.fn(),
    clearMfaEnrollmentRequired: vi.fn(),
    navigatePostAuth: vi.fn().mockResolvedValue(undefined),
  };
}

describe('MfaEnrollmentRequired', () => {
  let fixture: ComponentFixture<MfaEnrollmentRequired>;
  let component: MfaEnrollmentRequired;
  let authService: ReturnType<typeof createMockAuthService>;
  let router: Router;

  beforeEach(() => {
    authService = createMockAuthService();

    TestBed.configureTestingModule({
      imports: [MfaEnrollmentRequired],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(MfaEnrollmentRequired);
    component = fixture.componentInstance;
  });

  it('redirects to postAuthRoute on init when mfaEnrollmentRequired is false', () => {
    authService._mfaEnrollmentRequired.set(false);
    const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.ngOnInit();
    expect(spy).toHaveBeenCalledWith(['/app/administration']);
    spy.mockRestore();
  });

  it('does not redirect on init when mfaEnrollmentRequired is true', () => {
    authService._mfaEnrollmentRequired.set(true);
    const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.ngOnInit();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders the enrollment container when mfaEnrollmentRequired is true', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.enrollment')).toBeTruthy();
    expect(el.querySelector('h1')?.textContent).toContain('Two-Factor Authentication Required');
  });

  it('renders the Setup Two Factor button', () => {
    authService._mfaGraceDeadline.set(futureDate(5));
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('.btn-primary');
    expect(btn?.textContent).toContain('Setup Two Factor');
  });

  it('renders the skip button', () => {
    authService._mfaGraceDeadline.set(futureDate(5));
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('.btn-link');
    expect(btn?.textContent?.trim()).toContain("I'll do this later");
  });

  it('returns null when mfaGraceDeadline is null', () => {
    authService._mfaGraceDeadline.set(null);
    fixture.detectChanges();
    expect(component.daysRemaining()).toBeNull();
  });

  it('computes daysRemaining correctly for a future deadline (3 days)', () => {
    authService._mfaGraceDeadline.set(futureDate(3));
    fixture.detectChanges();
    expect(component.daysRemaining()).toBe(3);
  });

  it('computes daysRemaining as 1 for a deadline ~18 hours from now', () => {
    const deadline = new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString();
    authService._mfaGraceDeadline.set(deadline);
    fixture.detectChanges();
    expect(component.daysRemaining()).toBe(1);
  });

  it('computes daysRemaining as 0 when deadline is in the past', () => {
    authService._mfaGraceDeadline.set(pastDate(2));
    fixture.detectChanges();
    expect(component.daysRemaining()).toBe(0);
  });

  it('shows warning notice when daysRemaining > 0', () => {
    authService._mfaGraceDeadline.set(futureDate(5));
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.enrollment__notice--warning')).toBeTruthy();
    expect(el.querySelector('.enrollment__notice--danger')).toBeFalsy();
    expect(el.querySelector('.enrollment__notice--warning')?.textContent).toContain('5');
    expect(el.querySelector('.enrollment__notice--warning')?.textContent).toContain('days');
  });

  it('shows singular "day" when daysRemaining is 1', () => {
    const deadline = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString();
    authService._mfaGraceDeadline.set(deadline);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const text = el.querySelector('.enrollment__notice--warning')?.textContent ?? '';
    expect(text).toContain('1');
    expect(text).toMatch(/1\s*day(?!s)/);
  });

  it('shows danger notice when deadline is in the past', () => {
    authService._mfaGraceDeadline.set(pastDate(1));
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.enrollment__notice--danger')).toBeTruthy();
    expect(el.querySelector('.enrollment__notice--warning')).toBeFalsy();
    expect(el.querySelector('.enrollment__notice--danger')?.textContent).toContain('grace period has expired');
  });

  it('shows danger notice when deadline is null', () => {
    authService._mfaGraceDeadline.set(null);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.enrollment__notice--danger')).toBeTruthy();
  });

  it('goToMfaSettings navigates to /app/settings with tab=security query param', () => {
    const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.goToMfaSettings();
    expect(spy).toHaveBeenCalledWith(['/app/settings'], { queryParams: { tab: 'security' } });
    spy.mockRestore();
  });

  it('skipForNow clears enrollment and calls navigatePostAuth', () => {
    component.skipForNow();
    expect(authService.clearMfaEnrollmentRequired).toHaveBeenCalled();
    expect(authService.navigatePostAuth).toHaveBeenCalled();
  });

  it('goToMfaSettings always navigates to /app/settings regardless of postAuthRoute', () => {
    authService.getPostAuthRoute.mockReturnValue('/pos-login');
    const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.goToMfaSettings();
    expect(spy).toHaveBeenCalledWith(['/app/settings'], { queryParams: { tab: 'security' } });
    spy.mockRestore();
  });
});

function futureDate(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function pastDate(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}
