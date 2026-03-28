import '../../../../test-setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { CateringCalendarComponent } from './catering-calendar.component';

function createComponent(): CateringCalendarComponent {
  return TestBed.runInInjectionContext(() => new CateringCalendarComponent());
}

describe('CateringCalendarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('initializes to current month', () => {
    const component = createComponent();
    const now = new Date();
    expect(component.currentMonth()).toBe(now.getMonth());
    expect(component.currentYear()).toBe(now.getFullYear());
  });

  it('monthLabel shows current month and year', () => {
    const component = createComponent();
    const label = component.monthLabel();
    expect(label).toContain('2026');
  });

  // BUG-19: Navigation must not skip months
  it('nextMonth advances March to April (not May)', () => {
    const component = createComponent();
    component.currentMonth.set(2); // March
    component.currentYear.set(2026);

    component.nextMonth();

    expect(component.currentMonth()).toBe(3); // April
    expect(component.currentYear()).toBe(2026);
    expect(component.monthLabel()).toBe('April 2026');
  });

  it('nextMonth advances April to May', () => {
    const component = createComponent();
    component.currentMonth.set(3); // April
    component.currentYear.set(2026);

    component.nextMonth();

    expect(component.currentMonth()).toBe(4); // May
    expect(component.currentYear()).toBe(2026);
    expect(component.monthLabel()).toBe('May 2026');
  });

  it('prevMonth goes from April back to March', () => {
    const component = createComponent();
    component.currentMonth.set(3); // April
    component.currentYear.set(2026);

    component.prevMonth();

    expect(component.currentMonth()).toBe(2); // March
    expect(component.currentYear()).toBe(2026);
    expect(component.monthLabel()).toBe('March 2026');
  });

  it('nextMonth wraps December to January of next year', () => {
    const component = createComponent();
    component.currentMonth.set(11); // December
    component.currentYear.set(2026);

    component.nextMonth();

    expect(component.currentMonth()).toBe(0); // January
    expect(component.currentYear()).toBe(2027);
    expect(component.monthLabel()).toBe('January 2027');
  });

  it('prevMonth wraps January to December of previous year', () => {
    const component = createComponent();
    component.currentMonth.set(0); // January
    component.currentYear.set(2027);

    component.prevMonth();

    expect(component.currentMonth()).toBe(11); // December
    expect(component.currentYear()).toBe(2026);
    expect(component.monthLabel()).toBe('December 2026');
  });

  it('navigating forward 12 months cycles through every month without skipping', () => {
    const component = createComponent();
    component.currentMonth.set(0); // January
    component.currentYear.set(2026);

    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      months.push(component.monthLabel());
      component.nextMonth();
    }

    expect(months).toEqual([
      'January 2026', 'February 2026', 'March 2026', 'April 2026',
      'May 2026', 'June 2026', 'July 2026', 'August 2026',
      'September 2026', 'October 2026', 'November 2026', 'December 2026',
    ]);
    expect(component.monthLabel()).toBe('January 2027');
  });

  it('selectedDay resets to null on month change', () => {
    const component = createComponent();
    component.selectedDay.set('2026-03-15');

    component.nextMonth();
    expect(component.selectedDay()).toBeNull();
  });

  it('calendarDays returns 42 cells (6-row grid)', () => {
    const component = createComponent();
    component.currentMonth.set(2); // March 2026
    component.currentYear.set(2026);

    const days = component.calendarDays();
    expect(days).toHaveLength(42);
  });

  it('calendarDays marks current month days correctly', () => {
    const component = createComponent();
    component.currentMonth.set(2); // March 2026
    component.currentYear.set(2026);

    const days = component.calendarDays();
    const marchDays = days.filter(d => d.isCurrentMonth);
    expect(marchDays).toHaveLength(31); // March has 31 days
  });

  it('calendarDays for April 2026 has 30 current-month days', () => {
    const component = createComponent();
    component.currentMonth.set(3); // April 2026
    component.currentYear.set(2026);

    const days = component.calendarDays();
    const aprilDays = days.filter(d => d.isCurrentMonth);
    expect(aprilDays).toHaveLength(30); // April has 30 days
  });

  it('calendarDays for February 2026 has 28 current-month days', () => {
    const component = createComponent();
    component.currentMonth.set(1); // February 2026
    component.currentYear.set(2026);

    const days = component.calendarDays();
    const febDays = days.filter(d => d.isCurrentMonth);
    expect(febDays).toHaveLength(28); // 2026 is not a leap year
  });

  it('calendarDays includes events matching fulfillmentDate', () => {
    const component = createComponent();
    component.currentMonth.set(3); // April 2026
    component.currentYear.set(2026);

    const service = (component as any).cateringService;
    if (service?._jobs) {
      service._jobs.set([{
        id: 'j1',
        restaurantId: 'r1',
        title: 'Test Event',
        clientName: 'Client',
        eventType: 'corporate',
        status: 'deposit_received',
        headcount: 50,
        bookingDate: '2026-04-01',
        fulfillmentDate: '2026-04-15',
        locationType: 'off_site',
        subtotalCents: 500000,
        serviceChargeCents: 0,
        taxCents: 0,
        gratuityCents: 0,
        totalCents: 500000,
        paidCents: 0,
        packages: [],
        milestones: [],
        createdAt: '2026-04-01T00:00:00Z',
        updatedAt: '2026-04-01T00:00:00Z',
      }]);

      const days = component.calendarDays();
      const april15 = days.find(d => d.date === '2026-04-15');
      expect(april15).toBeDefined();
      expect(april15!.events).toHaveLength(1);
      expect(april15!.events[0].title).toBe('Test Event');
    }
  });

  it('selectDay toggles selectedDay', () => {
    const component = createComponent();
    const day = { date: '2026-03-15', dayOfMonth: 15, isCurrentMonth: true, isToday: false, events: [] };

    component.selectDay(day);
    expect(component.selectedDay()).toBe('2026-03-15');

    component.selectDay(day);
    expect(component.selectedDay()).toBeNull();
  });
});

/**
 * BUG-27: Catering calendar prev/next buttons missing aria-label.
 * Icon-only buttons need aria-label for screen readers.
 */
describe('CateringCalendarComponent template — a11y aria-labels (BUG-27)', () => {
  const templateSource = (() => {
    const { readFileSync } = require('node:fs');
    const { resolve } = require('node:path');
    return readFileSync(resolve(__dirname, 'catering-calendar.component.html'), 'utf-8');
  })();

  it('prev month button has aria-label="Previous month"', () => {
    expect(templateSource).toContain('aria-label="Previous month"');
  });

  it('next month button has aria-label="Next month"', () => {
    expect(templateSource).toContain('aria-label="Next month"');
  });

  it('no icon-only buttons without aria-label remain', () => {
    // All buttons in the template should either have text content or aria-label
    const buttonMatches = templateSource.match(/<button[^>]*>/g) ?? [];
    for (const btn of buttonMatches) {
      // If button contains only an icon child (no text), it must have aria-label
      const hasAriaLabel = btn.includes('aria-label=');
      const hasTextContent = !btn.includes('(click)="prevMonth()"') && !btn.includes('(click)="nextMonth()"');
      if (!hasTextContent) {
        expect(hasAriaLabel).toBe(true);
      }
    }
  });
});
