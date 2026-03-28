import '../../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal, computed } from '@angular/core';
import { of, throwError } from 'rxjs';
import { RestaurantSelect } from './restaurant-select';
import { AuthService } from '../../../services/auth';

function createMockAuthService(opts: {
  authenticated?: boolean;
  merchantIds?: string[];
  user?: { firstName: string } | null;
} = {}) {
  const _token = signal(opts.authenticated === false ? null : 'tok');
  const _user = signal(opts.user ?? (opts.authenticated === false ? null : { firstName: 'Jeff' }));
  const _merchants = signal((opts.merchantIds ?? []).map(id => ({ id })));

  return {
    isAuthenticated: computed(() => !!_token() && !!_user()),
    user: _user.asReadonly(),
    userMerchants: computed(() => _merchants().map(r => r.id)),
    selectedMerchantId: signal<string | null>(null).asReadonly(),
    selectMerchant: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    merchants: _merchants.asReadonly(),
    getPostAuthRoute: vi.fn().mockReturnValue('/app/administration'),
    navigatePostAuth: vi.fn().mockResolvedValue(undefined),
    refreshMerchantsFromServer: vi.fn().mockResolvedValue(false),
  };
}

describe('RestaurantSelect', () => {
  let fixture: ComponentFixture<RestaurantSelect>;
  let component: RestaurantSelect;
  let authService: ReturnType<typeof createMockAuthService>;
  let router: Router;
  let httpClient: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = createMockAuthService({
      authenticated: true,
      merchantIds: ['r-1', 'r-2'],
    });
    httpClient = {
      get: vi.fn().mockImplementation((url: string) => {
        if (url.includes('r-1')) return of({ id: 'r-1', name: 'Taipa', address: '123 Main', logo: null });
        if (url.includes('r-2')) return of({ id: 'r-2', name: 'Burger Joint', address: '456 Oak', logo: 'logo.png' });
        return throwError(() => new Error('Not found'));
      }),
    };

    TestBed.configureTestingModule({
      imports: [RestaurantSelect],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: HttpClient, useValue: httpClient },
      ],
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(RestaurantSelect);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows welcome message with user name', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Welcome, Jeff');
  });

  it('renders restaurant list after loading', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.restaurant-item');
    expect(items.length).toBe(2);
  });

  it('shows restaurant names', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const names = fixture.nativeElement.querySelectorAll('.restaurant-name');
    expect(names[0].textContent).toBe('Taipa');
    expect(names[1].textContent).toBe('Burger Joint');
  });

  it('shows logo placeholder when no logo', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const placeholder = fixture.nativeElement.querySelector('.restaurant-logo-placeholder');
    expect(placeholder).toBeTruthy();
    expect(placeholder.textContent.trim()).toBe('T');
  });

  it('shows img when logo exists', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('.restaurant-logo');
    expect(img).toBeTruthy();
    expect(img.src).toContain('logo.png');
  });

  it('navigates on restaurant select', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.restaurant-item');
    items[0].click();
    await fixture.whenStable();
    expect(authService.selectMerchant).toHaveBeenCalledWith('r-1', 'Taipa', null, '123 Main');
    expect(authService.navigatePostAuth).toHaveBeenCalled();
  });

  it('calls logout and navigates to /login on sign out click', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const signOutBtn = fixture.nativeElement.querySelector('.btn-outline-secondary');
    signOutBtn.click();
    await fixture.whenStable();
    expect(authService.logout).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(['/login']);
  });

  it('clears error on clearError()', () => {
    component.clearError();
    expect(component.error()).toBeNull();
  });

  it('does not render when not authenticated', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RestaurantSelect],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: createMockAuthService({ authenticated: false }) },
        { provide: HttpClient, useValue: httpClient },
      ],
    });
    const f = TestBed.createComponent(RestaurantSelect);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.restaurant-select-container')).toBeNull();
  });
});
