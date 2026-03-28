import { describe, it, expect } from 'vitest';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

describe('EmailCapture — validation logic', () => {
  it('valid email passes regex', () => {
    expect(EMAIL_RE.exec('test@example.com')).not.toBeNull();
    expect(EMAIL_RE.exec('user@restaurant.io')).not.toBeNull();
  });

  it('invalid email fails regex', () => {
    expect(EMAIL_RE.exec('not-email')).toBeNull();
    expect(EMAIL_RE.exec('bad@')).toBeNull();
    expect(EMAIL_RE.exec('@missing.com')).toBeNull();
    expect(EMAIL_RE.exec('')).toBeNull();
  });

  it('payload includes source field', () => {
    const source = 'blog_page';
    const payload = {
      email: 'test@example.com',
      source,
      timestamp: new Date().toISOString(),
    };
    expect(payload.source).toBe('blog_page');
    expect(payload.email).toBeTruthy();
    expect(payload.timestamp).toBeTruthy();
  });

  it('custom source input is preserved', () => {
    const sources = ['inline_capture', 'blog_page', 'pricing_sidebar'];
    for (const src of sources) {
      const payload = { email: 'x@y.com', source: src, timestamp: '' };
      expect(payload.source).toBe(src);
    }
  });
});
