import '../../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './status-badge';
import type { GuestOrderStatus } from '@models/order.model';

describe('StatusBadge', () => {
  function createBadge(status: GuestOrderStatus): ComponentFixture<StatusBadge> {
    TestBed.configureTestingModule({ imports: [StatusBadge] });
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createBadge('RECEIVED');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders a badge element', () => {
    const fixture = createBadge('RECEIVED');
    expect(fixture.nativeElement.querySelector('.badge')).toBeTruthy();
  });

  // --- Status labels ---

  it('shows "Received" for RECEIVED status', () => {
    const fixture = createBadge('RECEIVED');
    expect(fixture.nativeElement.querySelector('.badge').textContent.trim()).toBe('Received');
  });

  it('shows "Preparing" for IN_PREPARATION status', () => {
    const fixture = createBadge('IN_PREPARATION');
    expect(fixture.nativeElement.querySelector('.badge').textContent.trim()).toBe('Preparing');
  });

  it('shows "Ready" for READY_FOR_PICKUP status', () => {
    const fixture = createBadge('READY_FOR_PICKUP');
    expect(fixture.nativeElement.querySelector('.badge').textContent.trim()).toBe('Ready');
  });

  it('shows "Completed" for CLOSED status', () => {
    const fixture = createBadge('CLOSED');
    expect(fixture.nativeElement.querySelector('.badge').textContent.trim()).toBe('Completed');
  });

  it('shows "Cancelled" for VOIDED status', () => {
    const fixture = createBadge('VOIDED');
    expect(fixture.nativeElement.querySelector('.badge').textContent.trim()).toBe('Cancelled');
  });

  // --- Badge classes ---

  it('applies bg-secondary for RECEIVED', () => {
    const fixture = createBadge('RECEIVED');
    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge.classList.contains('bg-secondary')).toBe(true);
  });

  it('applies bg-warning for IN_PREPARATION', () => {
    const fixture = createBadge('IN_PREPARATION');
    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge.classList.contains('bg-warning')).toBe(true);
    expect(badge.classList.contains('text-dark')).toBe(true);
  });

  it('applies bg-success for READY_FOR_PICKUP', () => {
    const fixture = createBadge('READY_FOR_PICKUP');
    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge.classList.contains('bg-success')).toBe(true);
  });

  it('applies bg-primary for CLOSED', () => {
    const fixture = createBadge('CLOSED');
    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge.classList.contains('bg-primary')).toBe(true);
  });

  it('applies bg-danger for VOIDED', () => {
    const fixture = createBadge('VOIDED');
    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge.classList.contains('bg-danger')).toBe(true);
  });

  // --- Computed signals ---

  it('badgeClass returns bg-secondary as default', () => {
    const fixture = createBadge('RECEIVED');
    expect(fixture.componentInstance.badgeClass()).toBe('bg-secondary');
  });

  it('statusLabel returns raw status for unknown values', () => {
    const fixture = createBadge('UNKNOWN_STATUS' as GuestOrderStatus);
    expect(fixture.componentInstance.statusLabel()).toBe('UNKNOWN_STATUS');
  });
});
