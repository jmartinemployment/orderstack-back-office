import { Injectable, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type PwaPlatform = 'android' | 'ios' | 'desktop' | 'unknown';

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  readonly canInstall = signal(false);
  readonly isInstalled = signal(false);
  readonly platform = signal<PwaPlatform>('unknown');
  readonly dismissed = signal(false);

  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  constructor() {
    this.detectPlatform();
    this.detectInstalled();

    // Chrome/Edge/Android fire beforeinstallprompt
    globalThis.window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });

    // Detect app installed
    globalThis.window.addEventListener('appinstalled', () => {
      this.isInstalled.set(true);
      this.canInstall.set(false);
      this.deferredPrompt = null;
    });

    // Check localStorage for dismissal
    if (localStorage.getItem('os-install-dismissed') === 'true') {
      this.dismissed.set(true);
    }
  }

  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) return false;

    await this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      this.canInstall.set(false);
      this.deferredPrompt = null;
      return true;
    }

    return false;
  }

  dismissInstall(): void {
    this.dismissed.set(true);
    localStorage.setItem('os-install-dismissed', 'true');
  }

  get isIos(): boolean {
    return this.platform() === 'ios';
  }

  get shouldShowInstallPrompt(): boolean {
    return (this.canInstall() || this.isIos) && !this.isInstalled() && !this.dismissed();
  }

  private detectPlatform(): void {
    const ua = ((navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.userAgent).toLowerCase();

    if (/iphone|ipad|ipod/.exec(ua)) {
      this.platform.set('ios');
      // iOS doesn't fire beforeinstallprompt — we show manual instructions instead
    } else if (/android/.exec(ua)) {
      this.platform.set('android');
    } else {
      this.platform.set('desktop');
    }
  }

  private detectInstalled(): void {
    // display-mode: standalone means app is already installed as PWA
    if (globalThis.window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled.set(true);
    }
    // iOS: check navigator.standalone
    if ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone) {
      this.isInstalled.set(true);
    }
  }
}
