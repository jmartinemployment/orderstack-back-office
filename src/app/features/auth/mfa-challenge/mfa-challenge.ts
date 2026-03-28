import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { ErrorDisplay } from '../../../shared/error-display/error-display';

@Component({
  selector: 'os-mfa-challenge',
  imports: [ReactiveFormsModule, ErrorDisplay],
  templateUrl: './mfa-challenge.html',
  styleUrl: './mfa-challenge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaChallenge implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = this.authService.isLoading;
  readonly error = this.authService.error;
  readonly maskedEmail = this.authService.mfaMaskedEmail;

  private readonly _resent = signal(false);
  readonly resent = this._resent.asReadonly();

  form: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  ngOnInit(): void {
    if (!this.authService.mfaRequired()) {
      this.router.navigate(['/login']);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const code = (this.form.value.code as string).trim();
    const result = await this.authService.verifyMfaCode(code);

    if (result.success) {
      await this.authService.navigatePostAuth();
    }
  }

  async resendCode(): Promise<void> {
    this._resent.set(false);
    this.authService.clearError();
    const result = await this.authService.resendMfaOtp();
    if (result.success) {
      this._resent.set(true);
    }
  }

  cancelMfa(): void {
    this.authService.clearMfaState();
    this.authService.clearError();
    this.router.navigate(['/login']);
  }

  clearError(): void {
    this.authService.clearError();
  }
}
