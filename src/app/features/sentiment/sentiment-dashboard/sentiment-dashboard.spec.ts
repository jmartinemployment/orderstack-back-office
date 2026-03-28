import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * BUG-25: Sentiment dashboard spinner stuck when no data.
 *
 * Root cause: Template condition `@if (isLoading() && summary().totalAnalyzed === 0)`
 * conflated "still loading" with "loaded but empty". When loading finished with
 * zero entries, neither the spinner nor an empty state was shown.
 *
 * Fix: Three-way branch: @if (isLoading()) → spinner,
 * @else if (totalAnalyzed === 0) → empty state, @else → content.
 */

const templateSource = readFileSync(
  resolve(__dirname, 'sentiment-dashboard.html'),
  'utf-8',
);

describe('sentiment-dashboard template — loading/empty/content states (BUG-25)', () => {
  it('spinner condition uses isLoading() alone, not combined with totalAnalyzed', () => {
    // The spinner block should be gated only by isLoading()
    // It must NOT contain the old combined condition
    expect(templateSource).not.toContain('@if (isLoading() && summary().totalAnalyzed === 0)');
    expect(templateSource).toContain('@if (isLoading())');
  });

  it('has an @else if branch for empty state when totalAnalyzed === 0', () => {
    expect(templateSource).toContain('@else if (summary().totalAnalyzed === 0)');
  });

  it('empty state contains descriptive messaging', () => {
    expect(templateSource).toContain('No Special Instructions Found');
    expect(templateSource).toContain('Orders with special instructions will be analyzed automatically');
  });

  it('has an @else branch for content', () => {
    // After the empty state @else if, there should be an @else for content
    const elseIfIndex = templateSource.indexOf('@else if (summary().totalAnalyzed === 0)');
    const elseIndex = templateSource.indexOf('} @else {', elseIfIndex);
    expect(elseIndex).toBeGreaterThan(elseIfIndex);
  });

  it('does not have a redundant totalAnalyzed === 0 empty state inside Flags tab', () => {
    // The old template had an @if (summary().totalAnalyzed === 0) inside the trends/flags tab
    // This is now unnecessary since the top-level @else if handles it
    // Count occurrences — should be exactly 1 (the top-level @else if)
    const matches = templateSource.match(/summary\(\)\.totalAnalyzed === 0/g);
    expect(matches?.length ?? 0).toBe(1);
  });

  it('spinner block contains the loading message', () => {
    // Find the spinner block between @if (isLoading()) and the next @else
    const loadingStart = templateSource.indexOf('@if (isLoading())');
    const nextElse = templateSource.indexOf('} @else if', loadingStart);
    const spinnerBlock = templateSource.slice(loadingStart, nextElse);
    expect(spinnerBlock).toContain('spinner-border');
    expect(spinnerBlock).toContain('Analyzing order instructions...');
  });
});

describe('sentiment-dashboard — state logic simulation (BUG-25)', () => {
  // Simulate the three states the template now handles

  function resolveView(isLoading: boolean, totalAnalyzed: number): 'spinner' | 'empty' | 'content' {
    if (isLoading) return 'spinner';
    if (totalAnalyzed === 0) return 'empty';
    return 'content';
  }

  it('shows spinner while loading, regardless of totalAnalyzed', () => {
    expect(resolveView(true, 0)).toBe('spinner');
    expect(resolveView(true, 5)).toBe('spinner');
  });

  it('shows empty state when not loading and totalAnalyzed is 0', () => {
    expect(resolveView(false, 0)).toBe('empty');
  });

  it('shows content when not loading and has data', () => {
    expect(resolveView(false, 1)).toBe('content');
    expect(resolveView(false, 100)).toBe('content');
  });

  it('the OLD logic would fail: not loading + no data = neither spinner nor empty', () => {
    // Old condition: isLoading() && totalAnalyzed === 0
    // When isLoading=false, totalAnalyzed=0 → condition is false → falls to @else (content)
    // Content has nothing to show → stuck/blank page
    const isLoading = false;
    const totalAnalyzed = 0;
    const oldShowsSpinner = isLoading && totalAnalyzed === 0;
    const oldShowsContent = !oldShowsSpinner;
    expect(oldShowsSpinner).toBe(false);
    expect(oldShowsContent).toBe(true);

    // New logic correctly shows empty state
    expect(resolveView(false, 0)).toBe('empty');
  });
});

/**
 * BUG-27: Sentiment dashboard stuck spinner — verifying it stays fixed.
 * The fix (BUG-25) ensures loadAndAnalyze() always clears isLoading in finally block,
 * and the template uses three-way branching so the spinner never gets stuck.
 */
describe('sentiment-dashboard — stuck spinner prevention (BUG-27)', () => {
  const tsSource = (() => {
    const { readFileSync } = require('node:fs');
    const { resolve } = require('node:path');
    return readFileSync(resolve(__dirname, 'sentiment-dashboard.ts'), 'utf-8');
  })();

  it('loadAndAnalyze uses try/finally to always clear isLoading', () => {
    expect(tsSource).toContain('finally');
    expect(tsSource).toContain('_isLoading.set(false)');
  });

  it('isLoading is set to true before the API call', () => {
    const setTrueIndex = tsSource.indexOf('_isLoading.set(true)');
    const httpGetIndex = tsSource.indexOf('this.http.get');
    expect(setTrueIndex).toBeGreaterThan(-1);
    expect(httpGetIndex).toBeGreaterThan(setTrueIndex);
  });

  it('error state is captured so spinner does not mask failures', () => {
    expect(tsSource).toContain('_error.set(');
    // Error is set in the catch block
    const catchIndex = tsSource.indexOf('catch (err');
    const errorSetIndex = tsSource.indexOf('_error.set(', catchIndex);
    expect(errorSetIndex).toBeGreaterThan(catchIndex);
  });

  it('template shows error alert when error signal is set', () => {
    expect(templateSource).toContain('error()');
    expect(templateSource).toContain('alert');
  });

  it('HTTP call has a timeout to prevent indefinite hang', () => {
    expect(tsSource).toContain('timeout(15_000)');
  });

  it('timeout error produces a user-friendly message', () => {
    expect(tsSource).toContain("'Request timed out — try refreshing'");
  });

  it('guards against non-array API response', () => {
    expect(tsSource).toContain('Array.isArray(orders)');
  });

  it('effect uses untracked() to prevent infinite loop from _isLoading signal', () => {
    expect(tsSource).toContain('untracked(() => this.loadAndAnalyze())');
  });
});
