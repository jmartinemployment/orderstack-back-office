import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  afterNextRender,
  OnDestroy,
  HostListener,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { EXIT_INTENT_CONFIG } from '../marketing.config';

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const SESSION_KEY = 'os_exit_popup_shown';
const EXCLUDED_PATHS = ['/contact', '/signup'];

@Component({
  selector: 'os-exit-intent-popup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exit-intent-popup.component.html',
  styleUrl: './exit-intent-popup.component.scss',
})
export class ExitIntentPopupComponent implements OnDestroy {
  readonly config = EXIT_INTENT_CONFIG;
  readonly visible = signal(false);
  readonly email = signal('');
  readonly touched = signal(false);
  readonly submitting = signal(false);
  readonly submitted = signal(false);

  readonly emailValid = computed(() => EMAIL_RE.exec(this.email()) !== null);
  readonly showError = computed(() => this.touched() && !this.emailValid());

  private readonly router = inject(Router);
  private ready = false;
  private delayTimer: ReturnType<typeof setTimeout> | null = null;
  private autoCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private boundMouseLeave: ((e: MouseEvent) => void) | null = null;

  constructor() {
    afterNextRender(() => {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) return;
      if (globalThis.window !== undefined && globalThis.window.innerWidth < 768) return;

      this.delayTimer = setTimeout(() => {
        this.ready = true;
        this.boundMouseLeave = (e: MouseEvent) => this.onDocumentMouseLeave(e);
        document.documentElement.addEventListener('mouseleave', this.boundMouseLeave);
      }, this.config.delaySeconds * 1000);
    });
  }

  ngOnDestroy(): void {
    if (this.delayTimer !== null) clearTimeout(this.delayTimer);
    if (this.autoCloseTimer !== null) clearTimeout(this.autoCloseTimer);
    if (this.boundMouseLeave) {
      document.documentElement.removeEventListener('mouseleave', this.boundMouseLeave);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible()) this.close();
  }

  close(): void {
    this.visible.set(false);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('mkt-exit-backdrop')) {
      this.close();
    }
  }

  onInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.emailValid() || this.submitting()) return;

    this.submitting.set(true);
    const payload = {
      email: this.email(),
      source: 'exit_intent',
      timestamp: new Date().toISOString(),
    };

    // Replace with actual API call when backend is ready
    console.log('[OrderStack Lead]', payload);

    await new Promise(resolve => setTimeout(resolve, 1500));
    this.submitted.set(true);
    this.submitting.set(false);

    this.autoCloseTimer = setTimeout(() => this.close(), 3000);
  }

  private onDocumentMouseLeave(event: MouseEvent): void {
    if (!this.ready) return;
    if (event.clientY > 0) return;
    if (EXCLUDED_PATHS.some(p => this.router.url.startsWith(p))) return;

    this.visible.set(true);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, '1');
    }

    // Only fire once
    if (this.boundMouseLeave) {
      document.documentElement.removeEventListener('mouseleave', this.boundMouseLeave);
      this.boundMouseLeave = null;
    }
  }
}
