import '../../../../test-setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { CateringMilestonesComponent } from './catering-milestones.component';

function createComponent(): CateringMilestonesComponent {
  return TestBed.runInInjectionContext(() => new CateringMilestonesComponent());
}

describe('CateringMilestonesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('filter defaults to all', () => {
    const component = createComponent();
    expect(component._filter()).toBe('all');
  });

  it('setFilter updates filter signal', () => {
    const component = createComponent();
    component.setFilter('overdue');
    expect(component._filter()).toBe('overdue');
  });

  it('getStatusBadge returns Paid for paid milestone', () => {
    const component = createComponent();
    const badge = component.getStatusBadge({
      id: 'm1', jobId: 'j1', jobTitle: 'Test', clientName: 'Client',
      label: 'Deposit', percent: 50, amountCents: 10000,
      paidAt: '2026-03-01T00:00:00Z',
    });
    expect(badge.label).toBe('Paid');
    expect(badge.cssClass).toBe('badge-paid');
  });

  it('getStatusBadge returns Overdue for past-due unpaid milestone', () => {
    const component = createComponent();
    const badge = component.getStatusBadge({
      id: 'm1', jobId: 'j1', jobTitle: 'Test', clientName: 'Client',
      label: 'Deposit', percent: 50, amountCents: 10000,
      dueDate: '2020-01-01',
    });
    expect(badge.label).toBe('Overdue');
    expect(badge.cssClass).toBe('badge-overdue');
  });

  it('getStatusBadge returns Pending for future unpaid milestone', () => {
    const component = createComponent();
    const badge = component.getStatusBadge({
      id: 'm1', jobId: 'j1', jobTitle: 'Test', clientName: 'Client',
      label: 'Final', percent: 50, amountCents: 10000,
      dueDate: '2030-12-31',
    });
    expect(badge.label).toBe('Pending');
    expect(badge.cssClass).toBe('badge-pending');
  });
});
