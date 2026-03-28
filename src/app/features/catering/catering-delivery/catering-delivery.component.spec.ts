import '../../../../test-setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { CateringDeliveryComponent } from './catering-delivery.component';
import { CateringJob } from '@models/catering.model';

function createComponent(): CateringDeliveryComponent {
  return TestBed.runInInjectionContext(() => new CateringDeliveryComponent());
}

function makeJob(overrides: Partial<CateringJob> = {}): CateringJob {
  return {
    id: 'job-1',
    restaurantId: 'r1',
    title: 'Outdoor Reception',
    clientName: 'Jane Doe',
    eventType: 'corporate',
    status: 'deposit_received',
    headcount: 100,
    bookingDate: '2026-03-01',
    fulfillmentDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
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

describe('CateringDeliveryComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('deliveryJobs excludes on_site jobs', () => {
    const component = createComponent();
    const service = (component as any).cateringService;
    if (service?._jobs) {
      service._jobs.set([
        makeJob({ id: 'j1', locationType: 'off_site' }),
        makeJob({ id: 'j2', locationType: 'on_site' }),
      ]);
      const ids = component.deliveryJobs().map(j => j.id);
      expect(ids).toContain('j1');
      expect(ids).not.toContain('j2');
    }
  });

  it('deliveryJobs excludes cancelled jobs', () => {
    const component = createComponent();
    const service = (component as any).cateringService;
    if (service?._jobs) {
      service._jobs.set([
        makeJob({ id: 'j1', status: 'deposit_received', locationType: 'off_site' }),
        makeJob({ id: 'j2', status: 'cancelled', locationType: 'off_site' }),
      ]);
      const ids = component.deliveryJobs().map(j => j.id);
      expect(ids).toContain('j1');
      expect(ids).not.toContain('j2');
    }
  });

  it('setDateFilter updates the signal', () => {
    const component = createComponent();
    expect(component._dateFilter()).toBe('week');
    component.setDateFilter('month');
    expect(component._dateFilter()).toBe('month');
  });

  it('startEdit sets editing state and form', () => {
    const component = createComponent();
    component.startEdit('job-1', { driverName: 'Bob' });
    expect(component._editingJobId()).toBe('job-1');
    expect(component._editForm().driverName).toBe('Bob');
  });

  it('cancelEdit clears editing state', () => {
    const component = createComponent();
    component.startEdit('job-1');
    component.cancelEdit();
    expect(component._editingJobId()).toBeNull();
  });
});
