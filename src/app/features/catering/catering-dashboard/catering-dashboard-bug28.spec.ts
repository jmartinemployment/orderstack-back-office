import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * BUG-28: Catering dashboard status filter <select> missing label.
 *
 * Root cause: The status filter dropdown had no accessible label.
 *
 * Fix: Added visually-hidden <label for="catering-status-filter"> + id on the <select>,
 * which satisfies both SonarQube S6853 (label+for) and screen readers.
 */

const templateSource = readFileSync(
  resolve(__dirname, 'catering-dashboard.component.html'),
  'utf-8',
);

describe('catering-dashboard template — status filter accessibility (BUG-28)', () => {
  it('status filter select has id for label association', () => {
    expect(templateSource).toContain('id="catering-status-filter"');
  });

  it('visually-hidden label is paired with the status filter select', () => {
    expect(templateSource).toContain('for="catering-status-filter"');
    expect(templateSource).toContain('class="visually-hidden"');
  });

  it('select element has form-select class for Bootstrap styling', () => {
    const selectMatch = templateSource.match(/<select[^>]*statusFilter[^>]*>/s);
    expect(selectMatch).not.toBeNull();
    expect(selectMatch![0]).toContain('class="form-select"');
  });

  it('search input has placeholder for accessibility', () => {
    expect(templateSource).toContain('placeholder="Search jobs..."');
  });

  it('all select elements in the template are labelled (aria-label or id+for)', () => {
    const selectTags = templateSource.match(/<select[^>]*>/g) ?? [];
    for (const tag of selectTags) {
      const hasAriaLabel = tag.includes('aria-label');
      const hasId = tag.includes('id=');
      expect(hasAriaLabel || hasId, `select element missing accessible label: ${tag}`).toBe(true);
    }
  });

  it('capacity form inputs have associated labels with for attribute', () => {
    expect(templateSource).toContain('for="cap-max-events"');
    expect(templateSource).toContain('for="cap-max-headcount"');
    expect(templateSource).toContain('id="cap-max-events"');
    expect(templateSource).toContain('id="cap-max-headcount"');
  });

  it('conflict alerts checkbox has an associated label with for attribute', () => {
    expect(templateSource).toContain('id="conflictAlerts"');
    expect(templateSource).toContain('for="conflictAlerts"');
  });
});
