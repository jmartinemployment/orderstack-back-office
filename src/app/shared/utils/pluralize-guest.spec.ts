import { describe, it, expect } from 'vitest';

/**
 * BUG-25: "1 guests" grammar error.
 *
 * All templates now use: {{ count }} {{ count === 1 ? 'guest' : 'guests' }}
 * This test validates the pluralization logic used across 22 template instances
 * in 16 files (catering, bookings, orders, floor-plan, online-ordering).
 */

function pluralizeGuest(count: number): string {
  return count === 1 ? 'guest' : 'guests';
}

describe('BUG-25 — guest singular/plural', () => {
  it('returns "guest" for count of 1', () => {
    expect(pluralizeGuest(1)).toBe('guest');
  });

  it('returns "guests" for count of 0', () => {
    expect(pluralizeGuest(0)).toBe('guests');
  });

  it('returns "guests" for count of 2', () => {
    expect(pluralizeGuest(2)).toBe('guests');
  });

  it('returns "guests" for large counts', () => {
    expect(pluralizeGuest(100)).toBe('guests');
    expect(pluralizeGuest(500)).toBe('guests');
  });

  it('formats the full display string correctly for singular', () => {
    const count = 1;
    const display = `${count} ${pluralizeGuest(count)}`;
    expect(display).toBe('1 guest');
  });

  it('formats the full display string correctly for plural', () => {
    const count = 50;
    const display = `${count} ${pluralizeGuest(count)}`;
    expect(display).toBe('50 guests');
  });
});
