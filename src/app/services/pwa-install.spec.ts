import { describe, it, expect } from 'vitest';

// --- Interfaces ---

type PwaPlatform = 'android' | 'ios' | 'desktop' | 'unknown';

// --- Pure function replicas ---

function detectPlatform(userAgent: string): PwaPlatform {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

function shouldShowInstallPrompt(
  canInstall: boolean,
  isIos: boolean,
  isInstalled: boolean,
  dismissed: boolean,
): boolean {
  return (canInstall || isIos) && !isInstalled && !dismissed;
}

// --- Tests ---

describe('PwaInstallService — detectPlatform', () => {
  it('detects iOS from iPhone UA', () => {
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)')).toBe('ios');
  });

  it('detects iOS from iPad UA', () => {
    expect(detectPlatform('Mozilla/5.0 (iPad; CPU OS 15_0)')).toBe('ios');
  });

  it('detects Android', () => {
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 12; Pixel 6)')).toBe('android');
  });

  it('detects desktop for Chrome on Mac', () => {
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('desktop');
  });

  it('detects desktop for Windows', () => {
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
  });
});

describe('PwaInstallService — shouldShowInstallPrompt', () => {
  it('shows when canInstall and not installed or dismissed', () => {
    expect(shouldShowInstallPrompt(true, false, false, false)).toBe(true);
  });

  it('shows for iOS even without canInstall', () => {
    expect(shouldShowInstallPrompt(false, true, false, false)).toBe(true);
  });

  it('hides when already installed', () => {
    expect(shouldShowInstallPrompt(true, false, true, false)).toBe(false);
  });

  it('hides when dismissed', () => {
    expect(shouldShowInstallPrompt(true, false, false, true)).toBe(false);
  });

  it('hides when not installable and not iOS', () => {
    expect(shouldShowInstallPrompt(false, false, false, false)).toBe(false);
  });
});
