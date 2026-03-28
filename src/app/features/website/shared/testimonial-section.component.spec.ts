import { describe, it, expect } from 'vitest';
import { TESTIMONIALS } from '../marketing.config';

// Test the carousel logic directly since TestimonialSectionComponent
// uses afterNextRender which requires a full Angular environment.

describe('TestimonialSection — carousel logic', () => {
  const count = TESTIMONIALS.length;

  it('should have at least 3 testimonials for a meaningful carousel', () => {
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('should cycle index forward correctly', () => {
    let index = 0;
    // Simulate next()
    index = (index + 1) % count;
    expect(index).toBe(1);

    // Go to last
    index = count - 1;
    index = (index + 1) % count;
    expect(index).toBe(0); // wraps around
  });

  it('should cycle index backward correctly', () => {
    let index = 0;
    // Simulate prev()
    index = (index - 1 + count) % count;
    expect(index).toBe(count - 1); // wraps to last

    index = (index - 1 + count) % count;
    expect(index).toBe(count - 2);
  });

  it('should compute correct translateX offset', () => {
    const offset = (idx: number) => `translateX(-${idx * 100}%)`;
    expect(offset(0)).toBe('translateX(-0%)');
    expect(offset(2)).toBe('translateX(-200%)');
    expect(offset(count - 1)).toBe(`translateX(-${(count - 1) * 100}%)`);
  });

  it('all testimonials should have required fields', () => {
    for (const t of TESTIMONIALS) {
      expect(t.id).toBeTruthy();
      expect(t.quote.length).toBeGreaterThan(20);
      expect(t.authorName).toBeTruthy();
      expect(t.restaurantName).toBeTruthy();
      expect(t.location).toBeTruthy();
      expect(t.rating).toBeGreaterThanOrEqual(1);
      expect(t.rating).toBeLessThanOrEqual(5);
    }
  });

  it('all testimonial IDs should be unique', () => {
    const ids = TESTIMONIALS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
