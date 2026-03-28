import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { User, UserRestaurant, LoginRequest, LoginResponse, MfaSetupData, MfaStatus, MfaTrustedDevice, Restaurant } from '../models';
import { SignupData } from '../models/platform.model';
import { environment } from '../environments/environment';
import { SessionTimeoutService } from './session-timeout';
import { ElectronDeviceService } from './electron-device';

// sessionStorage keys — cleared on tab close
const SESSION_TOKEN_KEY = 'auth_token';
const SESSION_MERCHANT_ID_KEY = 'selected_merchant_id';
// localStorage keys — non-sensitive display data only, persists across sessions
const MERCHANT_SLUG_KEY = 'selected_merchant_slug';
const MERCHANT_NAME_KEY = 'selected_merchant_name';
const MERCHANT_LOGO_KEY = 'selected_merchant_logo';
const MERCHANT_ADDRESS_KEY = 'selected_merchant_address';
const DEVICE_UUID_KEY = 'registered_device_uuid';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;
  private readonly sessionTimeout = inject(SessionTimeoutService);
  private readonly electronDeviceService = inject(ElectronDeviceService);

  // Core auth state — in-memory only, lost on page refresh
  private readonly _user = signal<User | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _merchants = signal<UserRestaurant[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _selectedMerchantId = signal<string | null>(null);
  private readonly _selectedMerchantName = signal<string | null>(null);
  private readonly _selectedMerchantLogo = signal<string | null>(null);
  private readonly _selectedMerchantAddress = signal<string | null>(null);
  private readonly _sessionExpiredMessage = signal<string | null>(null);

  // Device state — replaces localStorage device_id
  private readonly _deviceId = signal<string | null>(null);
  readonly deviceId = this._deviceId.asReadonly();

  // MFA challenge state
  private readonly _mfaRequired = signal(false);
  private readonly _mfaSessionToken = signal<string | null>(null);
  private readonly _mfaMaskedEmail = signal<string | null>(null);
  readonly mfaRequired = this._mfaRequired.asReadonly();
  readonly mfaSessionToken = this._mfaSessionToken.asReadonly();
  readonly mfaMaskedEmail = this._mfaMaskedEmail.asReadonly();

  // Device MFA verification
  private readonly _deviceMfaExpiresAt = signal<string | null>(null);
  readonly deviceMfaValid = computed(() => {
    const exp = this._deviceMfaExpiresAt();
    return exp !== null && new Date(exp) > new Date();
  });

  // Email verification state (signup only)
  private readonly _verificationSent = signal(false);
  private readonly _verificationMaskedEmail = signal<string | null>(null);
  private readonly _pendingEmail = signal<string | null>(null);
  private readonly _verifiedEmailToken = signal<string | null>(null);
  private readonly _emailVerified = signal(false);
  readonly verificationSent = this._verificationSent.asReadonly();
  readonly verificationMaskedEmail = this._verificationMaskedEmail.asReadonly();
  readonly pendingEmail = this._pendingEmail.asReadonly();
  readonly emailVerified = this._emailVerified.asReadonly();


  // Public readonly signals
  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly selectedMerchantId = this._selectedMerchantId.asReadonly();
  readonly selectedMerchantName = this._selectedMerchantName.asReadonly();
  readonly selectedMerchantLogo = this._selectedMerchantLogo.asReadonly();
  readonly selectedMerchantAddress = this._selectedMerchantAddress.asReadonly();
  readonly sessionExpiredMessage = this._sessionExpiredMessage.asReadonly();

  // Computed signals
  readonly isAuthenticated = computed(() => !!this._token() && !!this._user());
  readonly userMerchants = computed(() => this._merchants().map(r => r.id));
  readonly merchants = this._merchants.asReadonly();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const token = globalThis.sessionStorage?.getItem(SESSION_TOKEN_KEY);
    const merchantId = globalThis.sessionStorage?.getItem(SESSION_MERCHANT_ID_KEY);
    const slug = localStorage.getItem(MERCHANT_SLUG_KEY);
    const name = localStorage.getItem(MERCHANT_NAME_KEY);
    const logo = localStorage.getItem(MERCHANT_LOGO_KEY);
    const address = localStorage.getItem(MERCHANT_ADDRESS_KEY);

    if (token) this._token.set(token);
    if (merchantId) this._selectedMerchantId.set(merchantId);

    if (slug) {
      this._selectedMerchantName.set(name);
      this._selectedMerchantLogo.set(logo);
      this._selectedMerchantAddress.set(address);
      // merchantId is resolved after login from the slug match
    }
  }

  private clearStorage(): void {
    globalThis.sessionStorage?.removeItem(SESSION_TOKEN_KEY);
    globalThis.sessionStorage?.removeItem(SESSION_MERCHANT_ID_KEY);
    localStorage.removeItem(MERCHANT_SLUG_KEY);
    localStorage.removeItem(MERCHANT_NAME_KEY);
    localStorage.removeItem(MERCHANT_LOGO_KEY);
    localStorage.removeItem(MERCHANT_ADDRESS_KEY);
  }

  getPostAuthRoute(): string {
    const user = this._user();
    if (!user) return '/login';
    if (user.role === 'staff') return '/pos-login';
    return '/app/administration';
  }

  async navigatePostAuth(): Promise<void> {
    const merchants = this._merchants();
    const selectedId = this._selectedMerchantId();

    // Auto-select single merchant
    if (merchants.length === 1 && !selectedId) {
      const m = merchants[0];
      this.selectMerchant(m.id, m.name, undefined, undefined, m.onboardingComplete);
    }

    // Check onboarding completion
    const selected = merchants.find(m => m.id === this._selectedMerchantId());
    if (selected && !selected.onboardingComplete) {
      await this.router.navigate(['/setup']);
      return;
    }

    // Multiple merchants, none selected
    if (merchants.length > 1 && !this._selectedMerchantId()) {
      await this.router.navigate(['/select-restaurant']);
      return;
    }

    await this.router.navigate([this.getPostAuthRoute()]);
  }

  // ============ Login ============

  submitLogin(credentials: LoginRequest): void {
    this._isLoading.set(true);
    this._error.set(null);
    this._sessionExpiredMessage.set(null);

    this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials).subscribe({
      next: async (response) => {
        // MFA challenge
        if (response.mfaRequired && response.mfaToken) {
          this._mfaRequired.set(true);
          this._mfaSessionToken.set(response.mfaToken);
          this._mfaMaskedEmail.set(response.maskedEmail ?? null);
          this._isLoading.set(false);
          this.router.navigate(['/mfa-challenge']);
          return;
        }


        // Password expired
        if ((response as { requiresPasswordChange?: boolean }).requiresPasswordChange) {
          this._error.set('Your password has expired. Use "Forgot password?" below to set a new one.');
          this._isLoading.set(false);
          return;
        }

        // Validate response
        if (!response.restaurants?.length) {
          this._error.set('Login failed. Please try again.');
          this._isLoading.set(false);
          return;
        }

        this._token.set(response.token);
        globalThis.sessionStorage?.setItem(SESSION_TOKEN_KEY, response.token);
        this._user.set(response.user);
        this._merchants.set(response.restaurants);
        this._deviceId.set(response.deviceId ?? null);
        this._isLoading.set(false);

        this.sessionTimeout.start(() => this.handleSessionExpired('Your session expired due to inactivity'));

        // Restore merchant selection from localStorage slug
        const storedSlug = localStorage.getItem(MERCHANT_SLUG_KEY);
        if (storedSlug) {
          const match = response.restaurants.find(r => r.slug === storedSlug);
          if (match) {
            this.selectMerchant(match.id, match.name, undefined, undefined, match.onboardingComplete);
          }
        }

        const merchants = this._merchants();
        if (merchants.length === 1 && !this._selectedMerchantId()) {
          const m = merchants[0];
          this.selectMerchant(m.id, m.name, undefined, undefined, m.onboardingComplete);
        }

        await this.navigatePostAuth();
      },
      error: (err: HttpErrorResponse) => {
        this._isLoading.set(false);
        const msg = err.error?.message ?? err.error?.error ?? 'Login failed';
        this._error.set(msg);
      },
    });
  }

  // ============ Signup Email Verification ============

  sendVerification(email: string): void {
    this._isLoading.set(true);
    this._error.set(null);
    this.http.post<{ sent: boolean; maskedEmail: string }>(
      `${this.apiUrl}/auth/send-verification`, { email }
    ).subscribe({
      next: (response) => {
        this._isLoading.set(false);
        this._verificationSent.set(true);
        this._verificationMaskedEmail.set(response.maskedEmail);
        this._pendingEmail.set(email);
      },
      error: (err: HttpErrorResponse) => {
        this._isLoading.set(false);
        this._error.set(err.error?.message ?? err.error?.error ?? 'Failed to send verification email');
      },
    });
  }

  verifySignupEmail(email: string, code: string): void {
    this._isLoading.set(true);
    this._error.set(null);
    this.http.post<{ verified: boolean; verifiedEmailToken: string }>(
      `${this.apiUrl}/auth/verify-email`, { email, code }
    ).subscribe({
      next: (response) => {
        this._isLoading.set(false);
        this._verifiedEmailToken.set(response.verifiedEmailToken);
        this._emailVerified.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this._isLoading.set(false);
        this._error.set(err.error?.message ?? err.error?.error ?? 'Invalid code. Try again.');
      },
    });
  }

  submitSignup(data: SignupData): void {
    const token = this._verifiedEmailToken();
    if (!token) {
      this._error.set('Email verification required. Please verify your email first.');
      return;
    }
    this._isLoading.set(true);
    this._error.set(null);
    const body = { ...data, verifiedEmailToken: token };
    this.http.post<LoginResponse>(`${this.apiUrl}/auth/signup`, body).subscribe({
      next: (response) => {
        if (!response.restaurants?.length) {
          this._error.set('Account creation failed. Please try again.');
          this._isLoading.set(false);
          return;
        }
        this._token.set(response.token);
        globalThis.sessionStorage?.setItem(SESSION_TOKEN_KEY, response.token);
        this._user.set(response.user);
        this._merchants.set(response.restaurants);
        this._deviceId.set(response.deviceId ?? null);
        this._deviceMfaExpiresAt.set(response.deviceMfaExpiresAt ?? null);
        const biosUuid = this.electronDeviceService.info?.biosUuid;
        if (biosUuid) {
          localStorage.setItem(DEVICE_UUID_KEY, biosUuid);
        }
        this._isLoading.set(false);
        this.sessionTimeout.start(() => this.handleSessionExpired('Your session expired due to inactivity'));
        const merchants = this._merchants();
        if (merchants.length === 1 && !this._selectedMerchantId()) {
          const m = merchants[0];
          this.selectMerchant(m.id, m.name, undefined, undefined, m.onboardingComplete);
        }
        // Clear verification state
        this._verificationSent.set(false);
        this._verifiedEmailToken.set(null);
        this._emailVerified.set(false);
        this._pendingEmail.set(null);
        this._verificationMaskedEmail.set(null);
        this.navigatePostAuth();
      },
      error: (err: HttpErrorResponse) => {
        this._isLoading.set(false);
        if (err.status === 401) {
          this._verifiedEmailToken.set(null);
          this._emailVerified.set(false);
          this._verificationSent.set(false);
          this._error.set('Your verification expired. Please verify your email again.');
          return;
        }
        this._error.set(err.error?.message ?? err.error?.error ?? 'Signup failed');
      },
    });
  }

  // ============ Logout ============

  async logout(): Promise<void> {
    this._isLoading.set(true);
    this.sessionTimeout.stop();

    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/auth/logout`, {})
      );
    } catch {
      // Ignore logout errors
    } finally {
      this._token.set(null);
      this._user.set(null);
      this._merchants.set([]);
      this._selectedMerchantId.set(null);
      this._selectedMerchantName.set(null);
      this._selectedMerchantLogo.set(null);
      this._selectedMerchantAddress.set(null);
      this._deviceId.set(null);
      this._deviceMfaExpiresAt.set(null);
      this.clearStorage();
      this._isLoading.set(false);
    }
  }

  handleSessionExpired(reason?: string): void {
    this.sessionTimeout.stop();
    this._token.set(null);
    this._user.set(null);
    this._merchants.set([]);
    this._selectedMerchantId.set(null);
    this._selectedMerchantName.set(null);
    this._selectedMerchantLogo.set(null);
    this._selectedMerchantAddress.set(null);
    this._deviceId.set(null);
    this.clearStorage();
    this._sessionExpiredMessage.set(reason ?? 'Your session has expired. Please sign in again.');
    this.router.navigate(['/login']);
  }

  clearSessionExpiredMessage(): void {
    this._sessionExpiredMessage.set(null);
  }

  // ============ Merchant Selection ============

  selectMerchant(
    merchantId: string,
    merchantName: string,
    merchantLogo?: string,
    merchantAddress?: string,
    onboardingComplete?: boolean,
  ): void {
    if (!merchantId || merchantId === 'undefined') return;

    this._selectedMerchantId.set(merchantId);
    globalThis.sessionStorage?.setItem(SESSION_MERCHANT_ID_KEY, merchantId);
    this._selectedMerchantName.set(merchantName);
    this._selectedMerchantLogo.set(merchantLogo ?? null);
    this._selectedMerchantAddress.set(merchantAddress ?? null);

    // Persist slug (not UUID) for page refresh
    const merchant = this._merchants().find(m => m.id === merchantId);
    if (merchant?.slug) {
      localStorage.setItem(MERCHANT_SLUG_KEY, merchant.slug);
    }
    localStorage.setItem(MERCHANT_NAME_KEY, merchantName);
    if (merchantLogo) {
      localStorage.setItem(MERCHANT_LOGO_KEY, merchantLogo);
    } else {
      localStorage.removeItem(MERCHANT_LOGO_KEY);
    }
    if (merchantAddress) {
      localStorage.setItem(MERCHANT_ADDRESS_KEY, merchantAddress);
    } else {
      localStorage.removeItem(MERCHANT_ADDRESS_KEY);
    }

    const existing = this._merchants().find(m => m.id === merchantId);
    if (!existing) {
      this._merchants.set([
        ...this._merchants(),
        { id: merchantId, name: merchantName, slug: '', role: 'owner', onboardingComplete: onboardingComplete ?? false },
      ]);
    } else if (onboardingComplete !== undefined && existing.onboardingComplete !== onboardingComplete) {
      this._merchants.set(
        this._merchants().map(m =>
          m.id === merchantId ? { ...m, onboardingComplete } : m
        ),
      );
    }
  }

  markOnboardingComplete(merchantId: string): void {
    this._merchants.set(
      this._merchants().map(m =>
        m.id === merchantId ? { ...m, onboardingComplete: true } : m
      ),
    );
  }

  async refreshMerchantsFromServer(): Promise<boolean> {
    if (!this._token()) return false;

    try {
      const response = await firstValueFrom(
        this.http.get<{ user: User; restaurants: UserRestaurant[] }>(`${this.apiUrl}/auth/me`)
      );

      if (response.restaurants?.length) {
        this._merchants.set(response.restaurants);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  // ============ Password ============

  async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/auth/forgot-password`, { email })
      );
      return { success: true };
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'error' in err) {
        const httpErr = err as { error?: { message?: string } };
        return { success: false, error: httpErr.error?.message };
      }
      return { success: false, error: 'Unable to process request. Please try again.' };
    }
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/auth/reset-password`, { token, newPassword })
      );
      return { success: true };
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'error' in err) {
        const httpErr = err as { error?: { message?: string; error?: string } };
        return { success: false, error: httpErr.error?.message ?? httpErr.error?.error };
      }
      return { success: false, error: 'Unable to reset password. Please try again.' };
    }
  }

  async verifyCurrentPassword(password: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ verified: boolean }>(`${this.apiUrl}/auth/verify-password`, { password })
      );
      return response.verified;
    } catch {
      return false;
    }
  }

  // ============ Sessions ============

  async getActiveSessions(): Promise<Array<{ id: string; deviceInfo: string | null; ipAddress: string | null; createdAt: string; expiresAt: string }>> {
    return firstValueFrom(
      this.http.get<Array<{ id: string; deviceInfo: string | null; ipAddress: string | null; createdAt: string; expiresAt: string }>>(`${this.apiUrl}/auth/sessions`)
    );
  }

  async revokeSession(sessionId: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiUrl}/auth/sessions/${sessionId}`));
  }

  // ============ Token ============

  isTokenExpired(token?: string): boolean {
    try {
      const t = token ?? this._token();
      if (!t) return true;
      const payload = JSON.parse(atob(t.split('.')[1])) as { exp: number };
      return Math.floor(Date.now() / 1000) >= payload.exp;
    } catch {
      return true;
    }
  }

  // ============ MFA ============

  async verifyMfaCode(code: string): Promise<{ success: boolean; error?: string }> {
    const mfaToken = this._mfaSessionToken();

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const body: Record<string, string> = { code };
      if (mfaToken) {
        body['mfaToken'] = mfaToken;
      }

      const response = await firstValueFrom(
        this.http.post<LoginResponse & { success?: boolean }>(`${this.apiUrl}/auth/mfa/verify`, body)
      );

      if (mfaToken) {
        this._mfaRequired.set(false);
        this._mfaSessionToken.set(null);
        this._mfaMaskedEmail.set(null);
        this._token.set(response.token);
        globalThis.sessionStorage?.setItem(SESSION_TOKEN_KEY, response.token);
        this._user.set(response.user);
        this._merchants.set(response.restaurants);
        this._deviceId.set(response.deviceId ?? null);
        this.sessionTimeout.start(() => this.handleSessionExpired('Your session expired due to inactivity'));
      }

      return { success: true };
    } catch (err: unknown) {
      const fallback = 'Invalid code. Try again.';
      if (typeof err === 'object' && err !== null && 'error' in err) {
        const httpErr = err as { error?: { message?: string; error?: string } };
        const errorMsg = httpErr.error?.message ?? httpErr.error?.error ?? fallback;
        this._error.set(errorMsg);
        return { success: false, error: errorMsg };
      }
      this._error.set(fallback);
      return { success: false, error: fallback };
    } finally {
      this._isLoading.set(false);
    }
  }

  clearMfaState(): void {
    this._mfaRequired.set(false);
    this._mfaSessionToken.set(null);
    this._mfaMaskedEmail.set(null);
  }

  async getMfaStatus(): Promise<MfaStatus> {
    return firstValueFrom(
      this.http.get<MfaStatus>(`${this.apiUrl}/auth/mfa/status`)
    );
  }

  async setupMfa(): Promise<MfaSetupData> {
    return firstValueFrom(
      this.http.post<MfaSetupData>(`${this.apiUrl}/auth/mfa/setup`, {})
    );
  }

  async disableMfa(): Promise<{ success: boolean; error?: string }> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/auth/mfa/disable`, {})
      );
      return { success: true };
    } catch (err: unknown) {
      const httpErr = err as { error?: { error?: string } };
      return { success: false, error: httpErr.error?.error ?? 'Failed to disable MFA.' };
    }
  }

  async resendMfaOtp(): Promise<{ success: boolean }> {
    const mfaToken = this._mfaSessionToken();
    if (!mfaToken) return { success: false };
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/auth/mfa/challenge/resend`, { mfaToken })
      );
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async getTrustedDevices(restaurantId?: string): Promise<MfaTrustedDevice[]> {
    try {
      const params: Record<string, string> = {};
      if (restaurantId) params['restaurantId'] = restaurantId;
      return await firstValueFrom(
        this.http.get<MfaTrustedDevice[]>(`${this.apiUrl}/auth/mfa/trusted-devices`, { params })
      );
    } catch {
      return [];
    }
  }

  async revokeAllTrust(teamMemberId: string): Promise<{ success: boolean }> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/auth/mfa/revoke-trust`, { teamMemberId })
      );
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async revokeTrustedDevice(id: string): Promise<{ success: boolean }> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/auth/mfa/trusted-devices/${id}`)
      );
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  setLoginError(message: string): void {
    if (message === 'PASSWORD_CHANGE_REQUIRED' || message === 'PASSWORD_EXPIRED') {
      this._error.set('Your password has expired. Use "Forgot password?" below to set a new one.');
    } else if (message === 'MFA_ENROLLMENT_REQUIRED') {
      this._error.set('Your account requires two-factor authentication. Contact your administrator.');
    } else {
      this._error.set(message);
    }
    this._isLoading.set(false);
  }

  clearError(): void {
    this._error.set(null);
  }

  setSession(data: { token: string; user: User; restaurants?: UserRestaurant[] }): void {
    this._token.set(data.token);
    globalThis.sessionStorage?.setItem(SESSION_TOKEN_KEY, data.token);
    this._user.set(data.user);
    this._merchants.set(data.restaurants ?? []);
  }

  async resolveMerchantBySlug(slug: string): Promise<Restaurant | null> {
    try {
      return await firstValueFrom(
        this.http.get<Restaurant>(`${this.apiUrl}/merchant/slug/${slug}`)
      );
    } catch {
      return null;
    }
  }
}
