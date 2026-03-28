import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { ErrorDisplay } from '../../../shared/error-display/error-display';

type SignupView = 'email' | 'code' | 'form';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

@Component({
  selector: 'os-signup',
  imports: [ReactiveFormsModule, RouterLink, ErrorDisplay],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Signup {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly isLoading = this.authService.isLoading;
  readonly error = this.authService.error;
  readonly verificationSent = this.authService.verificationSent;
  readonly verificationMaskedEmail = this.authService.verificationMaskedEmail;
  readonly emailVerified = this.authService.emailVerified;
  readonly usStates = US_STATES;

  private readonly _showPassword = signal(false);
  readonly showPassword = this._showPassword.asReadonly();

  private readonly _agreedToTerms = signal(false);
  readonly agreedToTerms = this._agreedToTerms.asReadonly();

  private readonly _showTermsError = signal(false);
  readonly showTermsError = this._showTermsError.asReadonly();

  private readonly _passwordValue = signal('');

  private readonly _multipleLocations = signal(false);
  readonly multipleLocations = this._multipleLocations.asReadonly();

  private readonly _showDeviceModal = signal(false);
  readonly showDeviceModal = this._showDeviceModal.asReadonly();

  private readonly _showMultiLocationModal = signal(false);
  readonly showMultiLocationModal = this._showMultiLocationModal.asReadonly();

  private readonly _sameHardware = signal<boolean | null>(null);
  readonly sameHardware = this._sameHardware.asReadonly();

  // 3-view state machine
  readonly currentView = computed<SignupView>(() => {
    if (this.emailVerified()) return 'form';
    if (this.verificationSent()) return 'code';
    return 'email';
  });

  // Step 1: Email form
  emailForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  // Step 2: Code form
  codeForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  // Step 3: Signup form
  signupForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(12)]],
    businessPhone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    personalPhone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    businessName: ['', [Validators.required]],
    address: ['', [Validators.required]],
    city: ['', [Validators.required]],
    state: ['', [Validators.required]],
    zip: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
  });

  constructor() {
    this.signupForm.get('password')?.valueChanges.pipe(
      takeUntilDestroyed(),
    ).subscribe((v: string) => {
      this._passwordValue.set(v ?? '');
    });
  }

  readonly passwordStrength = computed(() => {
    const pw = this._passwordValue();
    return {
      length: pw.length >= 12,
      upper: /[A-Z]/.exec(pw) !== null,
      lower: /[a-z]/.exec(pw) !== null,
      digit: /\d/.exec(pw) !== null,
      special: /[^A-Za-z0-9]/.exec(pw) !== null,
    };
  });

  readonly passwordValid = computed(() => {
    const s = this.passwordStrength();
    return s.length && s.upper && s.lower && s.digit && s.special;
  });

  readonly passwordScore = computed(() => {
    const s = this.passwordStrength();
    return [s.length, s.upper, s.lower, s.digit, s.special].filter(Boolean).length;
  });

  readonly passwordStrengthLabel = computed(() => {
    const score = this.passwordScore();
    if (score <= 2) return { label: 'Weak', color: '#e53e3e' };
    if (score <= 3) return { label: 'Fair', color: '#f59e0b' };
    if (score <= 4) return { label: 'Good', color: '#3b82f6' };
    return { label: 'Strong', color: '#22c55e' };
  });

  // Step 1: Send verification email
  submitEmail(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.authService.sendVerification(this.emailForm.value.email);
  }

  // Step 2: Verify code
  submitCode(): void {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }
    const email = this.authService.pendingEmail();
    if (!email) return;
    this.authService.verifySignupEmail(email, this.codeForm.value.code);
  }

  // Step 3: Create account
  onCreateAccount(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    if (!this.passwordValid()) return;

    if (!this._agreedToTerms()) {
      this._showTermsError.set(true);
      return;
    }

    const v = this.signupForm.value;
    this.authService.submitSignup({
      firstName: v.firstName,
      lastName: v.lastName,
      password: v.password,
      businessPhone: v.businessPhone,
      personalPhone: v.personalPhone,
      businessName: v.businessName,
      address: v.address,
      city: v.city,
      state: v.state,
      zip: v.zip,
      multipleLocations: this._multipleLocations(),
    });
  }

  togglePasswordVisibility(): void {
    this._showPassword.update(show => !show);
  }

  toggleTerms(): void {
    this._agreedToTerms.update(v => !v);
    if (this._agreedToTerms()) {
      this._showTermsError.set(false);
    }
  }

  // Device checkbox — educational, always checked
  onDeviceCheckboxChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (!checked) {
      this._showDeviceModal.set(true);
      // Re-check after modal
    }
  }

  closeDeviceModal(): void {
    this._showDeviceModal.set(false);
  }

  // Multiple locations checkbox
  onMultipleLocationsChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this._showMultiLocationModal.set(true);
    } else {
      this._multipleLocations.set(false);
      this._sameHardware.set(null);
    }
  }

  setSameHardware(same: boolean): void {
    this._sameHardware.set(same);
    this._multipleLocations.set(true);
    this._showMultiLocationModal.set(false);
  }

  closeMultiLocationModal(): void {
    this._showMultiLocationModal.set(false);
    if (this._sameHardware() === null) {
      this._multipleLocations.set(false);
    }
  }

  // Phone mask helper: format raw digits as xxx-xxx-xxxx
  formatPhone(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replaceAll(/\D/g, '').slice(0, 10);
    this.signupForm.get(controlName)?.setValue(digits, { emitEvent: false });

    // Display formatted
    if (digits.length >= 7) {
      input.value = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length >= 4) {
      input.value = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else {
      input.value = digits;
    }
  }

  clearError(): void {
    this.authService.clearError();
  }

  get emailControl(): AbstractControl | null {
    return this.emailForm.get('email');
  }

  get codeControl(): AbstractControl | null {
    return this.codeForm.get('code');
  }
}
