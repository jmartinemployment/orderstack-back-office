import { describe, it, expect } from 'vitest';
import type { DevicePosMode } from '@models/index';

// --- Replicate BusinessTypeSelect pure logic for testing ---

type BusinessTypeOption = 'catering' | 'full_service';

const ZIP_REGEX = /^\d{5}(-\d{4})?$/;

function isValidAddress(
  address: string,
  city: string,
  state: string,
  zip: string,
): boolean {
  const street = address.trim();
  if (street.length < 5) return false;
  if (/\d/.exec(street) === null || /[a-zA-Z]/.exec(street) === null) return false;
  if (city.trim().length === 0) return false;
  if (state.trim().length === 0) return false;
  if (ZIP_REGEX.exec(zip.trim()) === null) return false;
  return true;
}

interface CanProceedOptions {
  selected: BusinessTypeOption | null;
  businessName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  isSubmitting: boolean;
}

function canProceed(opts: CanProceedOptions): boolean {
  if (opts.isSubmitting) return false;
  if (!opts.selected) return false;
  if (opts.businessName.trim().length === 0) return false;
  if (opts.email.trim().length === 0) return false;
  if (!isValidAddress(opts.address, opts.city, opts.state, opts.zip)) return false;
  return true;
}

function resolveBusinessCategory(type: BusinessTypeOption): string {
  return type === 'catering' ? 'Caterer' : 'Full Service Restaurant';
}

function resolveDefaultDeviceMode(type: BusinessTypeOption): DevicePosMode {
  return type === 'catering' ? 'catering' : 'full_service';
}

// --- Tests ---

describe('BusinessTypeSelect — canProceed validation', () => {
  const valid = {
    selected: 'catering' as BusinessTypeOption,
    name: 'My Catering Co',
    email: 'owner@example.com',
    address: '123 Main St',
    city: 'Miami',
    state: 'FL',
    zip: '33101',
  };

  it('returns true when all fields are valid', () => {
    expect(canProceed({
      selected: valid.selected, businessName: valid.name, email: valid.email,
      address: valid.address, city: valid.city, state: valid.state, zip: valid.zip, isSubmitting: false,
    })).toBe(true);
  });

  it('returns false when no business type selected', () => {
    expect(canProceed({
      selected: null, businessName: valid.name, email: valid.email,
      address: valid.address, city: valid.city, state: valid.state, zip: valid.zip, isSubmitting: false,
    })).toBe(false);
  });

  it('returns false when business name is empty', () => {
    expect(canProceed({
      selected: valid.selected, businessName: '', email: valid.email,
      address: valid.address, city: valid.city, state: valid.state, zip: valid.zip, isSubmitting: false,
    })).toBe(false);
  });

  it('returns false when business name is whitespace', () => {
    expect(canProceed({
      selected: valid.selected, businessName: '   ', email: valid.email,
      address: valid.address, city: valid.city, state: valid.state, zip: valid.zip, isSubmitting: false,
    })).toBe(false);
  });

  it('returns false when email is empty', () => {
    expect(canProceed({
      selected: valid.selected, businessName: valid.name, email: '',
      address: valid.address, city: valid.city, state: valid.state, zip: valid.zip, isSubmitting: false,
    })).toBe(false);
  });

  it('returns false when address is too short', () => {
    expect(canProceed({
      selected: valid.selected, businessName: valid.name, email: valid.email,
      address: '1 A', city: valid.city, state: valid.state, zip: valid.zip, isSubmitting: false,
    })).toBe(false);
  });

  it('returns false when address has no digits', () => {
    expect(canProceed({
      selected: valid.selected, businessName: valid.name, email: valid.email,
      address: 'Main Street', city: valid.city, state: valid.state, zip: valid.zip, isSubmitting: false,
    })).toBe(false);
  });

  it('returns false when address has no letters', () => {
    expect(canProceed({
      selected: valid.selected, businessName: valid.name, email: valid.email,
      address: '12345', city: valid.city, state: valid.state, zip: valid.zip, isSubmitting: false,
    })).toBe(false);
  });

  it('returns false when city is empty', () => {
    expect(canProceed({
      selected: valid.selected, businessName: valid.name, email: valid.email,
      address: valid.address, city: '', state: valid.state, zip: valid.zip, isSubmitting: false,
    })).toBe(false);
  });

  it('returns false when state is empty', () => {
    expect(canProceed({
      selected: valid.selected, businessName: valid.name, email: valid.email,
      address: valid.address, city: valid.city, state: '', zip: valid.zip, isSubmitting: false,
    })).toBe(false);
  });

  it('returns false when zip is invalid', () => {
    expect(canProceed({
      selected: valid.selected, businessName: valid.name, email: valid.email,
      address: valid.address, city: valid.city, state: valid.state, zip: '123', isSubmitting: false,
    })).toBe(false);
  });

  it('returns false when submitting', () => {
    expect(canProceed({
      selected: valid.selected, businessName: valid.name, email: valid.email,
      address: valid.address, city: valid.city, state: valid.state, zip: valid.zip, isSubmitting: true,
    })).toBe(false);
  });

  it('accepts full_service business type', () => {
    expect(canProceed({
      selected: 'full_service', businessName: valid.name, email: valid.email,
      address: valid.address, city: valid.city, state: valid.state, zip: valid.zip, isSubmitting: false,
    })).toBe(true);
  });
});

describe('BusinessTypeSelect — isValidAddress', () => {
  it('accepts standard US address', () => {
    expect(isValidAddress('123 Main St', 'Miami', 'FL', '33101')).toBe(true);
  });

  it('accepts ZIP+4 format', () => {
    expect(isValidAddress('456 Oak Ave', 'Tampa', 'FL', '33601-1234')).toBe(true);
  });

  it('rejects address shorter than 5 characters', () => {
    expect(isValidAddress('1 A', 'Miami', 'FL', '33101')).toBe(false);
  });

  it('rejects address without digits', () => {
    expect(isValidAddress('Main Street', 'Miami', 'FL', '33101')).toBe(false);
  });

  it('rejects address without letters', () => {
    expect(isValidAddress('12345', 'Miami', 'FL', '33101')).toBe(false);
  });

  it('rejects empty city', () => {
    expect(isValidAddress('123 Main St', '', 'FL', '33101')).toBe(false);
  });

  it('rejects empty state', () => {
    expect(isValidAddress('123 Main St', 'Miami', '', '33101')).toBe(false);
  });

  it('rejects invalid zip', () => {
    expect(isValidAddress('123 Main St', 'Miami', 'FL', 'abc')).toBe(false);
  });

  it('rejects zip with too few digits', () => {
    expect(isValidAddress('123 Main St', 'Miami', 'FL', '331')).toBe(false);
  });

  it('rejects zip with too many digits', () => {
    expect(isValidAddress('123 Main St', 'Miami', 'FL', '331011')).toBe(false);
  });
});

describe('BusinessTypeSelect — business type mapping', () => {
  it('catering maps to Caterer category', () => {
    expect(resolveBusinessCategory('catering')).toBe('Caterer');
  });

  it('full_service maps to Full Service Restaurant category', () => {
    expect(resolveBusinessCategory('full_service')).toBe('Full Service Restaurant');
  });

  it('catering maps to catering device mode', () => {
    expect(resolveDefaultDeviceMode('catering')).toBe('catering');
  });

  it('full_service maps to full_service device mode', () => {
    expect(resolveDefaultDeviceMode('full_service')).toBe('full_service');
  });
});
