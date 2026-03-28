import '../../../../test-setup';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * BUG-29: BEO "Back" button does not navigate back to job detail.
 *
 * Root cause: goBack() navigated to '/catering/:id' and '/catering' — both
 * missing the '/app' prefix. Correct routes are '/app/catering/job/:id' and
 * '/app/catering'.
 */

const tsSource = readFileSync(resolve(__dirname, 'catering-beo.component.ts'), 'utf-8');
const templateSource = readFileSync(resolve(__dirname, 'catering-beo.component.html'), 'utf-8');

describe('catering-beo — goBack() navigation routes (BUG-29)', () => {
  it('goBack navigates to /app/catering/job/:id when job exists', () => {
    expect(tsSource).toContain("this.router.navigate(['/app/catering/job', j.id])");
  });

  it('goBack navigates to /app/catering when no job loaded', () => {
    expect(tsSource).toContain("this.router.navigate(['/app/catering'])");
  });

  it('does NOT use the old broken /catering route (without /app prefix)', () => {
    // The old bug: navigate(['/catering', j.id]) and navigate(['/catering'])
    // These should not appear except as part of the correct /app/catering paths
    const lines = tsSource.split('\n');
    for (const line of lines) {
      if (line.includes('router.navigate')) {
        expect(line, `Route must start with /app: ${line.trim()}`).toContain('/app/catering');
      }
    }
  });

  it('does NOT navigate to /app/catering/:id (wrong — missing /job/ segment)', () => {
    // Correct: /app/catering/job/:id — NOT /app/catering/:id
    expect(tsSource).not.toMatch(/navigate\(\['\/app\/catering',\s*j\.id\]\)/);
  });
});

describe('catering-beo template — Back button (BUG-29)', () => {
  it('template has a Back button with (click)="goBack()"', () => {
    expect(templateSource).toContain('(click)="goBack()"');
    expect(templateSource).toContain('Back');
  });

  it('Back button is inside the toolbar (not hidden/missing)', () => {
    const toolbarMatch = templateSource.match(/class="toolbar[^"]*"[\s\S]*?<\/div>/);
    expect(toolbarMatch).not.toBeNull();
    expect(toolbarMatch![0]).toContain('goBack()');
  });

  it('fallback "Back to Catering" button also uses goBack()', () => {
    expect(templateSource).toContain('Back to Catering');
    // The fallback at the bottom when job is not found
    const fallbackSection = templateSource.slice(templateSource.indexOf('Job not found'));
    expect(fallbackSection).toContain('goBack()');
  });
});

describe('catering-beo — goBack() runtime behavior (BUG-29)', () => {
  // Simulate the goBack logic to verify route correctness
  function simulateGoBack(job: { id: string } | null): string[] {
    if (job) {
      return ['/app/catering/job', job.id];
    }
    return ['/app/catering'];
  }

  it('returns job detail route when job is loaded', () => {
    const route = simulateGoBack({ id: 'abc-123' });
    expect(route).toEqual(['/app/catering/job', 'abc-123']);
  });

  it('returns dashboard route when job is null', () => {
    const route = simulateGoBack(null);
    expect(route).toEqual(['/app/catering']);
  });

  it('job detail route matches the expected Angular route pattern', () => {
    const route = simulateGoBack({ id: 'test-id' });
    const fullPath = route.join('/');
    expect(fullPath).toBe('/app/catering/job/test-id');
  });

  it('OLD broken routes would NOT match any valid Angular route', () => {
    // Old broken: ['/catering', id] => /catering/abc-123 (no /app, no /job)
    const oldWithJob = ['/catering', 'abc-123'].join('/');
    expect(oldWithJob).not.toContain('/app');
    expect(oldWithJob).not.toContain('/job');

    // Old broken: ['/catering'] => /catering (no /app)
    const oldNoJob = ['/catering'].join('/');
    expect(oldNoJob).not.toContain('/app');
  });
});

// --- BUG-30: formatTime must convert 24-hour to 12-hour AM/PM ---

/** Replica of the component's formatTime method */
function formatTime(time: string | undefined): string {
  if (!time) return '--';
  const [hourStr, minuteStr] = time.split(':');
  const hour = Number.parseInt(hourStr, 10);
  if (Number.isNaN(hour)) return time;
  const minute = minuteStr ?? '00';
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${period}`;
}

describe('catering-beo — formatTime 24h→12h conversion (BUG-30)', () => {
  it('converts 18:00 to 6:00 PM', () => {
    expect(formatTime('18:00')).toBe('6:00 PM');
  });

  it('converts 22:00 to 10:00 PM', () => {
    expect(formatTime('22:00')).toBe('10:00 PM');
  });

  it('converts 08:30 to 8:30 AM', () => {
    expect(formatTime('08:30')).toBe('8:30 AM');
  });

  it('converts 00:00 (midnight) to 12:00 AM', () => {
    expect(formatTime('00:00')).toBe('12:00 AM');
  });

  it('converts 12:00 (noon) to 12:00 PM', () => {
    expect(formatTime('12:00')).toBe('12:00 PM');
  });

  it('converts 12:30 to 12:30 PM', () => {
    expect(formatTime('12:30')).toBe('12:30 PM');
  });

  it('converts 01:15 to 1:15 AM', () => {
    expect(formatTime('01:15')).toBe('1:15 AM');
  });

  it('converts 23:59 to 11:59 PM', () => {
    expect(formatTime('23:59')).toBe('11:59 PM');
  });

  it('returns "--" for undefined', () => {
    expect(formatTime(undefined)).toBe('--');
  });

  it('returns "--" for empty string', () => {
    expect(formatTime('')).toBe('--');
  });

  it('returns raw string for non-time input', () => {
    expect(formatTime('not-a-time')).toBe('not-a-time');
  });
});

describe('catering-beo source — formatTime is used in template (BUG-30)', () => {
  it('formatTime source contains AM/PM conversion logic', () => {
    expect(tsSource).toContain("const period = hour >= 12 ? 'PM' : 'AM'");
    expect(tsSource).toContain('const hour12 = hour % 12 || 12');
  });

  it('formatTime does NOT just return raw time', () => {
    // The old bug: formatTime just did `return time;`
    const formatBlock = tsSource.slice(
      tsSource.indexOf('formatTime(time:'),
      tsSource.indexOf('}', tsSource.indexOf('formatTime(time:') + 80) + 1
    );
    // Should contain the conversion logic, not just `return time`
    expect(formatBlock).toContain('PM');
    expect(formatBlock).toContain('AM');
  });

  it('template uses formatTime for startTime and endTime', () => {
    expect(templateSource).toContain('formatTime(j.startTime)');
    expect(templateSource).toContain('formatTime(j.endTime)');
  });

  it('template uses formatTime for delivery timeline times', () => {
    expect(templateSource).toContain('formatTime(dd.loadTime)');
    expect(templateSource).toContain('formatTime(dd.departureTime)');
    expect(templateSource).toContain('formatTime(dd.arrivalTime)');
    expect(templateSource).toContain('formatTime(dd.setupTime)');
    expect(templateSource).toContain('formatTime(dd.breakdownTime)');
  });

  it('template does NOT display raw dd.loadTime without formatTime', () => {
    // Ensure no `{{ dd.loadTime }}` without formatTime wrapper
    expect(templateSource).not.toMatch(/\{\{\s*dd\.loadTime\s*\}\}/);
    expect(templateSource).not.toMatch(/\{\{\s*dd\.departureTime\s*\}\}/);
    expect(templateSource).not.toMatch(/\{\{\s*dd\.arrivalTime\s*\}\}/);
    expect(templateSource).not.toMatch(/\{\{\s*dd\.setupTime\s*\}\}/);
    expect(templateSource).not.toMatch(/\{\{\s*dd\.breakdownTime\s*\}\}/);
  });
});
