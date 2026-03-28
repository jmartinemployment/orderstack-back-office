import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'os-mfa-enrollment-required',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="enrollment">
      <div class="enrollment__icon">
        <i class="bi bi-shield-lock-fill"></i>
      </div>

      <h1 class="enrollment__title">Two-Factor Authentication Required</h1>
      <p class="enrollment__subtitle">
        Your role requires two-factor authentication to meet security compliance standards.
      </p>

      <!-- @if (daysRemaining() !== null && daysRemaining()! > 0) {
        <div class="enrollment__notice enrollment__notice--warning">
          <i class="bi bi-clock-fill"></i>
          <span>You have <strong>{{ daysRemaining() }}</strong> day{{ daysRemaining() === 1 ? '' : 's' }} remaining to set up MFA.</span>
        </div>
      } @else {
        <div class="enrollment__notice enrollment__notice--danger">
          <i class="bi bi-exclamation-triangle-fill"></i>
          <span>Your grace period has expired. You must set up MFA to continue.</span>
        </div>
      } -->

      <!-- <button class="btn btn-primary btn-enroll w-100 mt-4" (click)="goToMfaSettings()">
        Setup Two Factor
      </button> -->
      <!-- <button class="btn btn-link btn-skip w-100 mt-2" (click)="skipForNow()">
        I'll do this later
      </button> -->
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .enrollment {
      text-align: center;

      &__icon {
        font-size: 3rem;
        color: var(--os-primary, #2563eb);
        margin-bottom: 1rem;
      }

      &__title {
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
      }

      &__subtitle {
        color: var(--bs-secondary-color, #6c757d);
        font-size: 0.95rem;
        margin-bottom: 1.5rem;
      }

      &__notice {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        text-align: left;

        &--warning {
          background: #fff8e1;
          color: #7a5c00;
          border: 1px solid #ffc107;
        }

        &--danger {
          background: #fff0f0;
          color: #842029;
          border: 1px solid #f5c2c7;
        }
      }
    }

    .btn-enroll {
      height: 2.75rem;
      font-weight: 600;
    }

    .btn-skip {
      font-size: 0.875rem;
      color: var(--bs-secondary-color, #6c757d);
      text-decoration: none;

      &:hover {
        color: var(--bs-body-color, #212529);
      }
    }
  `],
})
export class MfaEnrollmentRequired implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    // MFA enrollment enforcement replaced by device-based verification — redirect
    this.router.navigate([this.auth.getPostAuthRoute()]);
  }
}
