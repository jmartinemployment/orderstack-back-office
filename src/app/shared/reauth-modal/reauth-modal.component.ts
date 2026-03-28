import { Component, input, output, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { AuthService } from '../../services/auth';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'os-reauth-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './reauth-modal.component.html',
  styleUrl: './reauth-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.d-block]': 'visible()' },
})
export class ReauthModalComponent {
  private readonly auth = inject(AuthService);

  readonly visible = input.required<boolean>();
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  readonly password = signal('');
  readonly isVerifying = signal(false);
  readonly error = signal<string | null>(null);

  async verify(): Promise<void> {
    if (!this.password()) return;
    this.isVerifying.set(true);
    this.error.set(null);
    try {
      const verified = await this.auth.verifyCurrentPassword(this.password());
      if (verified) {
        this.password.set('');
        this.confirmed.emit();
      } else {
        this.error.set('Incorrect password. Please try again.');
      }
    } finally {
      this.isVerifying.set(false);
    }
  }

  cancel(): void {
    this.password.set('');
    this.error.set(null);
    this.cancelled.emit();
  }
}
