import '../../../../test-setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { CateringDashboardComponent } from './catering-dashboard.component';
import { CateringJob } from '@models/catering.model';

function createComponent(): CateringDashboardComponent {
  return TestBed.runInInjectionContext(() => new CateringDashboardComponent());
}

function localDateString(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function makeJob(overrides: Partial<CateringJob> = {}): CateringJob {
  return {
    id: 'job-1',
    restaurantId: 'r1',
    title: 'Wedding Reception',
    clientName: 'Jane Doe',
    eventType: 'corporate',
    status: 'deposit_received',
    headcount: 100,
    bookingDate: '2026-03-01',
    fulfillmentDate: localDateString(10),
    locationType: 'off_site',
    subtotalCents: 1000000,
    serviceChargeCents: 0,
    taxCents: 0,
    gratuityCents: 0,
    totalCents: 1000000,
    paidCents: 500000,
    packages: [],
    milestones: [],
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

describe('CateringDashboardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('nextJobDaysAway returns null when no next job', () => {
    const component = createComponent();
    expect(component.nextJobDaysAway()).toBeNull();
  });

  it('nextJobDaysAway returns null when job has empty fulfillmentDate', () => {
    const component = createComponent();
    const service = (component as any).cateringService;
    if (service?._jobs) {
      service._jobs.set([makeJob({ fulfillmentDate: '' })]);
      expect(component.nextJobDaysAway()).toBeNull();
    }
  });

  it('nextJobDaysAway returns null when fulfillmentDate is invalid', () => {
    const component = createComponent();
    const service = (component as any).cateringService;
    if (service?._jobs) {
      service._jobs.set([makeJob({ fulfillmentDate: 'not-a-date' })]);
      expect(component.nextJobDaysAway()).toBeNull();
    }
  });

  it('nextJobDaysAway returns 0 for today', () => {
    const component = createComponent();
    const service = (component as any).cateringService;
    if (service?._jobs) {
      service._jobs.set([makeJob({ fulfillmentDate: localDateString(0) })]);
      expect(component.nextJobDaysAway()).toBe(0);
    }
  });

  it('nextJobDaysAway returns 1 for tomorrow', () => {
    const component = createComponent();
    const service = (component as any).cateringService;
    if (service?._jobs) {
      service._jobs.set([makeJob({ fulfillmentDate: localDateString(1) })]);
      expect(component.nextJobDaysAway()).toBe(1);
    }
  });

  it('nextJobDaysAway returns positive number for future date', () => {
    const component = createComponent();
    const service = (component as any).cateringService;
    if (service?._jobs) {
      service._jobs.set([makeJob({ fulfillmentDate: localDateString(10) })]);
      expect(component.nextJobDaysAway()).toBe(10);
    }
  });

  it('nextJobDaysAway never returns NaN', () => {
    const component = createComponent();
    const service = (component as any).cateringService;
    if (service?._jobs) {
      // Test with various bad values
      for (const bad of ['', 'null', 'undefined', '2026', '2026-13-45']) {
        service._jobs.set([makeJob({ fulfillmentDate: bad })]);
        const result = component.nextJobDaysAway();
        expect(Number.isNaN(result), `NaN for "${bad}"`).toBe(false);
      }
    }
  });

  it('activeTab defaults to active', () => {
    const component = createComponent();
    expect(component.activeTab()).toBe('active');
  });

  it('setTab changes active tab', () => {
    const component = createComponent();
    component.setTab('upcoming');
    expect(component.activeTab()).toBe('upcoming');
  });

  it('searchQuery defaults to empty', () => {
    const component = createComponent();
    expect(component.searchQuery()).toBe('');
  });
});

/**
 * BUG-28: Catering dashboard status filter select missing aria-label.
 */
describe('CateringDashboardComponent template — a11y (BUG-28)', () => {
  const templateSource = (() => {
    const { readFileSync } = require('node:fs');
    const { resolve } = require('node:path');
    return readFileSync(resolve(__dirname, 'catering-dashboard.component.html'), 'utf-8');
  })();

  it('status filter <select> is labelled via visually-hidden label', () => {
    expect(templateSource).toContain('id="catering-status-filter"');
    expect(templateSource).toContain('for="catering-status-filter"');
    expect(templateSource).toContain('class="visually-hidden"');
  });

  it('search input has placeholder text', () => {
    expect(templateSource).toContain('placeholder="Search jobs..."');
  });
});
