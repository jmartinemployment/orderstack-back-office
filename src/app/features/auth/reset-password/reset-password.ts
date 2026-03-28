import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'os-reset-password',
  imports: [RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  private readonly _token = signal<string | null>(null);
  private readonly _newPassword = signal('');
  private readonly _showPassword = signal(false);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _success = signal(false);

  readonly token = this._token.asReadonly();
  readonly newPassword = this._newPassword.asReadonly();
  readonly showPassword = this._showPassword.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly success = this._success.asReadonly();

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    this._token.set(token);
  }

  onPasswordInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this._newPassword.set(input.value);
  }

  togglePasswordVisibility(): void {
    this._showPassword.update(v => !v);
  }

  async submit(): Promise<void> {
    const token = this._token();
    const password = this._newPassword();

    if (!token) {
      this._error.set('Invalid reset link. Please request a new one.');
      return;
    }

    if (password.length < 8) {
      this._error.set('Password must be at least 8 characters.');
      return;
    }

    this._isLoading.set(true);
    this._error.set(null);

    const result = await this.authService.resetPasswordWithToken(token, password);

    this._isLoading.set(false);

    if (result.success) {
      this._success.set(true);
    } else {
      this._error.set(result.error ?? 'Something went wrong. Please try again.');
    }
  }
}
