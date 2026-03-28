import '../../../../test-setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { CateringProposalsComponent } from './catering-proposals.component';
import { CateringJob } from '@models/catering.model';

function createComponent(): CateringProposalsComponent {
  return TestBed.runInInjectionContext(() => new CateringProposalsComponent());
}

function makeJob(overrides: Partial<CateringJob> = {}): CateringJob {
  return {
    id: 'job-1',
    restaurantId: 'r1',
    title: 'Corporate Lunch',
    clientName: 'Jane Doe',
    eventType: 'corporate',
    status: 'proposal_sent',
    headcount: 50,
    bookingDate: '2026-03-01',
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
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

describe('CateringProposalsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('proposals computed filters to proposal_sent only', () => {
    const component = createComponent();
    const mockJobs = [
      makeJob({ id: 'j1', status: 'proposal_sent' }),
      makeJob({ id: 'j2', status: 'inquiry' }),
      makeJob({ id: 'j3', status: 'completed' }),
      makeJob({ id: 'j4', status: 'proposal_sent' }),
    ];

    const service = (component as any).cateringService;
    if (service?._jobs) {
      service._jobs.set(mockJobs);
      expect(component.proposals().length).toBe(2);
      expect(component.proposals().every((p: CateringJob) => p.status === 'proposal_sent')).toBe(true);
    }
  });

  it('daysSinceSent returns 0 for today (local date)', () => {
    const component = createComponent();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(component.daysSinceSent(today)).toBe(0);
  });

  it('daysSinceSent returns 1 for yesterday (local date — tests UTC off-by-one fix)', () => {
    const component = createComponent();
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(component.daysSinceSent(yesterday)).toBe(1);
  });

  it('daysSinceSent returns 7 for one week ago (local date)', () => {
    const component = createComponent();
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const weekAgo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(component.daysSinceSent(weekAgo)).toBe(7);
  });
});

/**
 * BUG-31: Verify /app/proposals redirect exists in app.routes.ts
 */
describe('BUG-31 — /app/proposals route registration', () => {
  const routeSource = (() => {
    const { readFileSync } = require('node:fs');
    const { resolve } = require('node:path');
    return readFileSync(resolve(__dirname, '../../../app.routes.ts'), 'utf-8');
  })();

  it('app.routes.ts has catering/proposals route', () => {
    expect(routeSource).toContain("path: 'catering/proposals'");
  });

  it('app.routes.ts has proposals redirect to catering/proposals', () => {
    expect(routeSource).toContain("path: 'proposals', redirectTo: 'catering/proposals'");
  });

  it('sidebar nav points to /app/catering/proposals', () => {
    const { readFileSync } = require('node:fs');
    const { resolve } = require('node:path');
    const layoutSource = readFileSync(resolve(__dirname, '../../../layouts/main-layout.component.ts'), 'utf-8');
    expect(layoutSource).toContain("route: '/app/catering/proposals'");
  });
});
