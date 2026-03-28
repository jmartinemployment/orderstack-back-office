import { Component, ChangeDetectionStrategy, input, signal, computed } from '@angular/core';

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

@Component({
  selector: 'os-email-capture',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mkt-capture">
      @if (!submitted()) {
        @if (headline()) {
          <h3 class="mkt-capture__headline">{{ headline() }}</h3>
        }
        @if (subtext()) {
          <p class="mkt-capture__subtext">{{ subtext() }}</p>
        }
        <form class="mkt-capture__row" (submit)="onSubmit($event)">
          <div class="mkt-capture__field">
            <input
              type="email"
              placeholder="you@restaurant.com"
              [value]="email()"
              (input)="onInput($event)"
              (blur)="touched.set(true)"
              [class.mkt-capture__input--error]="showError()"
              aria-label="Email address"
              required />
            @if (showError()) {
              <span class="mkt-capture__error">Please enter a valid email address</span>
            }
          </div>
          <button
            type="submit"
            class="mkt-capture__btn"
            [disabled]="!formValid() || submitting()">
            @if (submitting()) {
              Sending...
            } @else {
              {{ buttonLabel() }}
            }
          </button>
        </form>
      } @else {
        <div class="mkt-capture__success">
          <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
          <span>You're in! Check your inbox.</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .mkt-capture {
      max-width: 500px;
      margin: 0 auto;
      text-align: center;
    }

    .mkt-capture__headline {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--os-text-primary);
      margin: 0 0 8px;
    }

    .mkt-capture__subtext {
      font-size: 0.9375rem;
      color: var(--os-text-secondary);
      margin: 0 0 20px;
      line-height: 1.5;
    }

    .mkt-capture__row {
      display: flex;
      gap: 8px;

      @media (max-width: 575.98px) {
        flex-direction: column;
      }
    }

    .mkt-capture__field {
      flex: 1;
      text-align: left;
    }

    .mkt-capture__field input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--os-border);
      border-radius: var(--os-radius-lg);
      font-size: 0.9375rem;
      color: var(--os-text-primary);
      background: var(--os-bg-card);
      outline: none;
      transition: border-color 0.15s ease;

      &:focus {
        border-color: var(--os-primary);
      }

      &--error {
        border-color: #dc2626;
      }

      &::placeholder {
        color: var(--os-text-secondary);
        opacity: 0.5;
      }
    }

    .mkt-capture__error {
      display: block;
      font-size: 0.75rem;
      color: #dc2626;
      margin-top: 4px;
    }

    .mkt-capture__btn {
      padding: 10px 24px;
      background: var(--os-primary);
      color: #fff;
      border: none;
      border-radius: var(--os-radius-lg);
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s ease, opacity 0.15s ease;

      &:hover:not(:disabled) {
        opacity: 0.9;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .mkt-capture__success {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px;
      color: #16a34a;
      font-size: 1rem;
      font-weight: 600;

      i {
        font-size: 1.25rem;
      }
    }
  `],
})
export class EmailCaptureComponent {
  readonly headline = input('Stay in the loop');
  readonly subtext = input('Get restaurant tech tips and product updates. No spam, ever.');
  readonly buttonLabel = input('Subscribe');
  readonly source = input('inline_capture');

  readonly email = signal('');
  readonly touched = signal(false);
  readonly submitting = signal(false);
  readonly submitted = signal(false);

  readonly emailValid = computed(() => EMAIL_RE.exec(this.email()) !== null);
  readonly showError = computed(() => this.touched() && !this.emailValid());
  readonly formValid = computed(() => this.emailValid());

  onInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.formValid() || this.submitting()) return;

    this.submitting.set(true);
    const payload = {
      email: this.email(),
      source: this.source(),
      timestamp: new Date().toISOString(),
    };

    // Replace with actual API call when backend is ready
    console.log('[OrderStack Lead]', payload);

    await new Promise(resolve => setTimeout(resolve, 1500));
    this.submitted.set(true);
    this.submitting.set(false);
  }
}
