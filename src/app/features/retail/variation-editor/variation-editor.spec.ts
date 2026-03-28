import '../../../../test-setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { VariationEditor } from './variation-editor';

function createComponent(): VariationEditor {
  return TestBed.runInInjectionContext(() => new VariationEditor());
}

describe('VariationEditor', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('creates component', () => {
    const component = createComponent();
    expect(component).toBeDefined();
  });

  it('selectedItemId defaults to null', () => {
    const component = createComponent();
    expect(component.selectedItemId()).toBeNull();
  });

  it('editingCellId defaults to null', () => {
    const component = createComponent();
    expect(component.editingCellId()).toBeNull();
  });

  it('showBulkPriceModal defaults to false', () => {
    const component = createComponent();
    expect(component.showBulkPriceModal()).toBe(false);
  });
});

/**
 * BUG-28: Variation editor back button missing aria-label.
 */
describe('VariationEditor template — a11y (BUG-28)', () => {
  const templateSource = (() => {
    const { readFileSync } = require('node:fs');
    const { resolve } = require('node:path');
    return readFileSync(resolve(__dirname, 'variation-editor.html'), 'utf-8');
  })();

  it('back button has aria-label="Go back"', () => {
    expect(templateSource).toContain('aria-label="Go back"');
  });

  it('no icon-only buttons lack accessible name (aria-label or title)', () => {
    const buttonRegex = /<button[^>]*>[\s]*<i\s+class="bi\b[^"]*"><\/i>[\s]*<\/button>/g;
    const iconOnlyButtons = templateSource.match(buttonRegex) ?? [];
    for (const btn of iconOnlyButtons) {
      const hasAccessibleName = btn.includes('aria-label=') || btn.includes('title=');
      expect(hasAccessibleName, `Button lacks accessible name: ${btn.slice(0, 80)}`).toBe(true);
    }
  });
});

/**
 * BUG-30: Duplicate confirmation — back button aria-label is present and correct.
 */
describe('VariationEditor template — back button a11y (BUG-30)', () => {
  const templateSource = (() => {
    const { readFileSync } = require('node:fs');
    const { resolve } = require('node:path');
    return readFileSync(resolve(__dirname, 'variation-editor.html'), 'utf-8');
  })();

  it('back button element includes aria-label attribute', () => {
    const backBtnMatch = templateSource.match(/<button[^>]*bi-arrow-left[^>]*>/s)
      ?? templateSource.match(/<button[^>]*goBack[^>]*>/s);
    expect(backBtnMatch).not.toBeNull();
    expect(backBtnMatch![0]).toContain('aria-label=');
  });

  it('aria-label value is "Go back"', () => {
    expect(templateSource).toContain('aria-label="Go back"');
  });

  it('back button does NOT render bare text (icon-only is acceptable with aria-label)', () => {
    const match = templateSource.match(/<button[^>]*aria-label="Go back"[^>]*>([\s\S]*?)<\/button>/);
    expect(match).not.toBeNull();
    const innerContent = match![1].replace(/<[^>]+>/g, '').trim();
    // Inner text should be empty (icon only) — the aria-label provides the accessible name
    expect(innerContent).toBe('');
  });
});
