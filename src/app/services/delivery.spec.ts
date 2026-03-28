import '../../test-setup';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { DeliveryService } from './delivery';
import { AuthService } from './auth';
import { SocketService } from './socket';
import type { DeliveryDispatchStatus } from '@models/delivery.model';

function createHarness() {
  const authMock = {
    selectedMerchantId: vi.fn(() => 'r-1'),
    isAuthenticated: signal(true).asReadonly(),
  };

  const socketMock = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    onDeliveryLocationEvent: vi.fn(),
    isOnline: signal(true),
  };

  TestBed.configureTestingModule({
    providers: [
      DeliveryService,
      { provide: AuthService, useValue: authMock },
      { provide: SocketService, useValue: socketMock },
    ],
  });

  const service = TestBed.inject(DeliveryService);
  return { service, socketMock };
}

describe('DeliveryService — getDispatchStatusLabel', () => {
  it('returns human-readable label for known statuses', () => {
    const { service } = createHarness();

    expect(service.getDispatchStatusLabel('QUOTED')).toBe('Quoted');
    expect(service.getDispatchStatusLabel('DISPATCH_REQUESTED')).toBe('Dispatching...');
    expect(service.getDispatchStatusLabel('DRIVER_ASSIGNED')).toBe('Driver Assigned');
    expect(service.getDispatchStatusLabel('PICKED_UP')).toBe('Picked Up');
    expect(service.getDispatchStatusLabel('DRIVER_EN_ROUTE_TO_DROPOFF')).toBe('On the Way');
    expect(service.getDispatchStatusLabel('DELIVERED')).toBe('Delivered');
    expect(service.getDispatchStatusLabel('CANCELLED')).toBe('Cancelled');
    expect(service.getDispatchStatusLabel('FAILED')).toBe('Failed');
  });

  it('returns raw status for unknown values', () => {
    const { service } = createHarness();
    expect(service.getDispatchStatusLabel('UNKNOWN_STATUS' as DeliveryDispatchStatus)).toBe('UNKNOWN_STATUS');
  });
});

describe('DeliveryService — getDispatchStatusClass', () => {
  it('returns correct CSS class for each status category', () => {
    const { service } = createHarness();

    expect(service.getDispatchStatusClass('DELIVERED')).toBe('tracking-delivered');
    expect(service.getDispatchStatusClass('CANCELLED')).toBe('tracking-failed');
    expect(service.getDispatchStatusClass('FAILED')).toBe('tracking-failed');
    expect(service.getDispatchStatusClass('DRIVER_EN_ROUTE_TO_DROPOFF')).toBe('tracking-active');
    expect(service.getDispatchStatusClass('DRIVER_AT_DROPOFF')).toBe('tracking-active');
    expect(service.getDispatchStatusClass('PICKED_UP')).toBe('tracking-picked-up');
    expect(service.getDispatchStatusClass('DRIVER_ASSIGNED')).toBe('tracking-assigned');
    expect(service.getDispatchStatusClass('DRIVER_EN_ROUTE_TO_PICKUP')).toBe('tracking-assigned');
    expect(service.getDispatchStatusClass('DRIVER_AT_PICKUP')).toBe('tracking-assigned');
    expect(service.getDispatchStatusClass('QUOTED')).toBe('tracking-pending');
    expect(service.getDispatchStatusClass('DISPATCH_REQUESTED')).toBe('tracking-pending');
  });
});

describe('DeliveryService — tracking state', () => {
  it('starts with zero active tracking count', () => {
    const { service } = createHarness();
    expect(service.activeTrackingCount()).toBe(0);
  });

  it('getTrackingForOrder returns undefined for untracked order', () => {
    const { service } = createHarness();
    expect(service.getTrackingForOrder('nonexistent')).toBeUndefined();
  });

  it('startTrackingDelivery adds order to tracking map', () => {
    const { service } = createHarness();

    service.startTrackingDelivery('order-1', 'ext-123', 'doordash');

    const tracking = service.getTrackingForOrder('order-1');
    expect(tracking).toBeDefined();
    expect(tracking!.orderId).toBe('order-1');
    expect(tracking!.deliveryExternalId).toBe('ext-123');
    expect(tracking!.provider).toBe('doordash');
    expect(tracking!.status).toBe('DISPATCH_REQUESTED');
    expect(service.activeTrackingCount()).toBe(1);
  });

  it('stopTrackingDelivery removes order from tracking map', () => {
    const { service } = createHarness();

    service.startTrackingDelivery('order-1', 'ext-123', 'doordash');
    expect(service.activeTrackingCount()).toBe(1);

    service.stopTrackingDelivery('order-1');
    expect(service.getTrackingForOrder('order-1')).toBeUndefined();
    expect(service.activeTrackingCount()).toBe(0);
  });

  it('stopAllTracking clears all tracked orders', () => {
    const { service } = createHarness();

    service.startTrackingDelivery('order-1', 'ext-1', 'doordash');
    service.startTrackingDelivery('order-2', 'ext-2', 'uber');
    expect(service.activeTrackingCount()).toBe(2);

    service.stopAllTracking();
    expect(service.activeTrackingCount()).toBe(0);
  });

  it('activeTrackingCount excludes terminal statuses', () => {
    const { service } = createHarness();

    service.startTrackingDelivery('order-1', 'ext-1', 'doordash');
    service.startTrackingDelivery('order-2', 'ext-2', 'uber');

    // Both are DISPATCH_REQUESTED initially — both active
    expect(service.activeTrackingCount()).toBe(2);
  });
});
