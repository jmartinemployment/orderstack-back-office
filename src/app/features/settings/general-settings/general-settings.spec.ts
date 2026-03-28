import '../../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { GeneralSettings } from './general-settings';
import { PlatformService } from '../../../services/platform';
import type { MerchantProfile } from '../../../models/index';

function makeProfile(overrides: Partial<MerchantProfile> = {}): MerchantProfile {
  return {
    id: 'mp-1',
    businessName: 'Test Restaurant',
    address: {
      street: '123 Main St',
      street2: null,
      city: 'Miami',
      state: 'FL',
      zip: '33101',
      country: 'US',
      timezone: 'America/New_York',
      phone: '305-555-1234',
      lat: null,
      lng: null,
    },
    verticals: ['food_and_drink'],
    primaryVertical: 'food_and_drink',
    complexity: 'full',
    enabledModules: [],
    defaultDeviceMode: 'full_service',
    taxLocale: { taxRate: 7, taxInclusive: false, currency: 'USD', defaultLanguage: 'en' },
    businessHours: [],
    onboardingComplete: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as MerchantProfile;
}

function createMockPlatformService(initialProfile: MerchantProfile | null = null) {
  const _merchantProfile = signal<MerchantProfile | null>(initialProfile);
  return {
    merchantProfile: _merchantProfile.asReadonly(),
    isLoading: signal(false).asReadonly(),
    saveMerchantProfile: vi.fn().mockResolvedValue(undefined),
    _merchantProfile,
  };
}

describe('GeneralSettings', () => {
  let fixture: ComponentFixture<GeneralSettings>;
  let component: GeneralSettings;
  let mockPlatform: ReturnType<typeof createMockPlatformService>;

  function setup(initialProfile: MerchantProfile | null = null) {
    mockPlatform = createMockPlatformService(initialProfile);

    TestBed.configureTestingModule({
      imports: [GeneralSettings],
      providers: [
        { provide: PlatformService, useValue: mockPlatform },
      ],
    });
    fixture = TestBed.createComponent(GeneralSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('does not throw when merchantProfile is null and form stays at initial values', () => {
    expect(() => setup(null)).not.toThrow();

    expect(component.businessName()).toBe('');
    expect(component.street()).toBe('');
    expect(component.city()).toBe('');
    expect(component.state()).toBe('');
    expect(component.zip()).toBe('');
    expect(component.phone()).toBe('');
    expect(component.timezone()).toBe('America/New_York');
  });

  it('populates form when merchantProfile signal emits a profile with address: null', () => {
    setup(null);

    // Simulate async profile load with null address
    const profile = makeProfile({
      businessName: 'Null Address Bistro',
      address: null,
    });
    mockPlatform._merchantProfile.set(profile);
    TestBed.flushEffects();

    expect(component.businessName()).toBe('Null Address Bistro');
    expect(component.street()).toBe('');
    expect(component.city()).toBe('');
    expect(component.state()).toBe('');
    expect(component.zip()).toBe('');
    expect(component.phone()).toBe('');
    expect(component.timezone()).toBe('America/New_York');
  });

  it('populates all fields when merchantProfile has a full address', () => {
    const profile = makeProfile({
      businessName: 'Full Address Cafe',
      address: {
        street: '456 Oak Ave',
        street2: 'Suite 200',
        city: 'Fort Lauderdale',
        state: 'FL',
        zip: '33301',
        country: 'US',
        timezone: 'America/Chicago',
        phone: '954-555-9999',
        lat: 26.12,
        lng: -80.14,
      },
    });
    setup(profile);

    expect(component.businessName()).toBe('Full Address Cafe');
    expect(component.street()).toBe('456 Oak Ave');
    expect(component.street2()).toBe('Suite 200');
    expect(component.city()).toBe('Fort Lauderdale');
    expect(component.state()).toBe('FL');
    expect(component.zip()).toBe('33301');
    expect(component.phone()).toBe('954-555-9999');
    expect(component.timezone()).toBe('America/Chicago');
  });

  it('handles partially populated address with null/undefined sub-properties', () => {
    const profile = makeProfile({
      address: {
        street: '789 Elm Blvd',
        street2: null,
        city: undefined as unknown as string,
        state: null as unknown as string,
        zip: '',
        country: 'US',
        timezone: 'America/Denver',
        phone: null,
        lat: null,
        lng: null,
      },
    });
    setup(profile);

    expect(component.street()).toBe('789 Elm Blvd');
    expect(component.street2()).toBe('');
    expect(component.city()).toBe('');
    expect(component.state()).toBe('');
    expect(component.zip()).toBe('');
    expect(component.phone()).toBe('');
    expect(component.timezone()).toBe('America/Denver');
  });

  it('updates form when merchantProfile signal changes to a new profile', () => {
    const first = makeProfile({
      businessName: 'First Place',
      address: {
        street: '100 First St',
        street2: null,
        city: 'Miami',
        state: 'FL',
        zip: '33101',
        country: 'US',
        timezone: 'America/New_York',
        phone: '305-111-1111',
        lat: null,
        lng: null,
      },
    });
    setup(first);

    expect(component.businessName()).toBe('First Place');
    expect(component.street()).toBe('100 First St');

    // Switch to second profile
    const second = makeProfile({
      businessName: 'Second Place',
      address: {
        street: '200 Second Ave',
        street2: 'Unit B',
        city: 'Tampa',
        state: 'FL',
        zip: '33602',
        country: 'US',
        timezone: 'America/Chicago',
        phone: '813-222-2222',
        lat: null,
        lng: null,
      },
    });
    mockPlatform._merchantProfile.set(second);
    TestBed.flushEffects();

    expect(component.businessName()).toBe('Second Place');
    expect(component.street()).toBe('200 Second Ave');
    expect(component.street2()).toBe('Unit B');
    expect(component.city()).toBe('Tampa');
    expect(component.timezone()).toBe('America/Chicago');
    expect(component.phone()).toBe('813-222-2222');
  });
});
