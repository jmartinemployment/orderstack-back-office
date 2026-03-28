import '../../../../test-setup';
import { describe, it, expect } from 'vitest';

const templateSource = (() => {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(__dirname, 'online-order-portal.html'), 'utf-8');
})();

describe('OnlineOrderPortal template — a11y (BUG-29)', () => {
  describe('share buttons', () => {
    it('share-btn has aria-label="Share item"', () => {
      expect(templateSource).toContain('class="share-btn" aria-label="Share item"');
    });
  });

  describe('quantity buttons', () => {
    it('all qty-btn elements have aria-label', () => {
      const qtyButtons = templateSource.match(/class="qty-btn"[^>]*>/g) ?? [];
      expect(qtyButtons.length).toBeGreaterThanOrEqual(4); // 2 in menu + 2 in cart
      for (const btn of qtyButtons) {
        expect(btn).toContain('aria-label=');
      }
    });

    it('decrease buttons have aria-label="Decrease quantity"', () => {
      const matches = templateSource.match(/aria-label="Decrease quantity"/g) ?? [];
      expect(matches.length).toBe(2); // menu + cart
    });

    it('increase buttons have aria-label="Increase quantity"', () => {
      const matches = templateSource.match(/aria-label="Increase quantity"/g) ?? [];
      expect(matches.length).toBe(2); // menu + cart
    });
  });

  describe('step dots', () => {
    it('step-dot elements are <button> not <div>', () => {
      const divDots = templateSource.match(/<div[^>]*class="step-dot"/g);
      expect(divDots).toBeNull();
    });

    it('all step-dot buttons have aria-label', () => {
      const stepButtons = templateSource.match(/<button[^>]*class="step-dot"[^>]*>/g) ?? [];
      expect(stepButtons.length).toBeGreaterThanOrEqual(3); // menu, cart, info (location is conditional)
      for (const btn of stepButtons) {
        expect(btn).toContain('aria-label=');
      }
    });

    it('step dots have descriptive aria-labels', () => {
      expect(templateSource).toContain('aria-label="Go to menu"');
      expect(templateSource).toContain('aria-label="Go to cart"');
      expect(templateSource).toContain('aria-label="Go to checkout"');
    });

    it('location step dot has aria-label when present', () => {
      expect(templateSource).toContain('aria-label="Go to location selection"');
    });
  });

  describe('no remaining unlabeled icon-only buttons', () => {
    it('no buttons with only icon children lack aria-label or title', () => {
      // Match buttons that contain only whitespace + <i class="bi..."> + whitespace
      const iconOnlyRegex = /<button[^>]*>[\s]*(?:<i\s+class="bi\b[^"]*"><\/i>[\s]*)+<\/button>/g;
      const iconOnlyButtons = templateSource.match(iconOnlyRegex) ?? [];
      for (const btn of iconOnlyButtons) {
        const hasAccessibleName = btn.includes('aria-label=') || btn.includes('title=');
        expect(hasAccessibleName, `Icon-only button lacks accessible name: ${btn.slice(0, 100)}`).toBe(true);
      }
    });
  });
});
