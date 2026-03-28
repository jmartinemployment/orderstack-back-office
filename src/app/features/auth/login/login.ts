import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { ErrorDisplay } from '../../../shared/error-display/error-display';

@Component({
  selector: 'os-login',
  imports: [ReactiveFormsModule, RouterLink, ErrorDisplay],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly isLoading = this.authService.isLoading;
  readonly error = this.authService.error;
  readonly sessionExpiredMessage = this.authService.sessionExpiredMessage;

  private readonly _showPassword = signal(false);
  readonly showPassword = this._showPassword.asReadonly();

  // Forgot password modal state
  private readonly _showForgotModal = signal(false);
  readonly showForgotModal = this._showForgotModal.asReadonly();

  private readonly _forgotEmail = signal('');
  readonly forgotEmail = this._forgotEmail.asReadonly();

  private readonly _forgotLoading = signal(false);
  readonly forgotLoading = this._forgotLoading.asReadonly();

  private readonly _forgotError = signal<string | null>(null);
  readonly forgotError = this._forgotError.asReadonly();

  private readonly _forgotSuccess = signal(false);
  readonly forgotSuccess = this._forgotSuccess.asReadonly();

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  togglePasswordVisibility(): void {
    this._showPassword.update(show => !show);
  }

  openForgotPassword(): void {
    const emailValue = (this.form.get('email')?.value ?? '').trim();
    this._forgotEmail.set(emailValue);
    this._forgotError.set(null);
    this._forgotSuccess.set(false);
    this._showForgotModal.set(true);
  }

  closeForgotPassword(): void {
    this._showForgotModal.set(false);
    this._forgotEmail.set('');
    this._forgotError.set(null);
    this._forgotSuccess.set(false);
  }

  onForgotEmailInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this._forgotEmail.set(input.value);
  }

  async submitForgotPassword(): Promise<void> {
    const email = this._forgotEmail().trim();
    if (!email) return;

    this._forgotLoading.set(true);
    this._forgotError.set(null);

    const result = await this.authService.requestPasswordReset(email);

    this._forgotLoading.set(false);

    if (result.success) {
      this._forgotSuccess.set(true);
    } else {
      this._forgotError.set(result.error ?? 'Something went wrong. Please try again.');
    }
  }

  onSignIn(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.authService.clearSessionExpiredMessage();
    this.authService.submitLogin({
      email: this.form.value.email,
      password: this.form.value.password,
    });
  }

  clearError(): void {
    this.authService.clearError();
  }

  get emailControl(): AbstractControl | null {
    return this.form.get('email');
  }

  get passwordControl(): AbstractControl | null {
    return this.form.get('password');
  }
}
