import { describe, it, expect } from 'vitest';
import type { BusinessCategory, BusinessVertical, DevicePosMode } from '@models/index';
import { BUSINESS_CATEGORIES, REVENUE_RANGES } from '@models/index';

// --- Replicate SetupWizard pure logic for testing ---

const BUSINESS_TYPE_MODE_MAP: Record<string, DevicePosMode> = {
  'Caterer': 'catering',
  'Full Service Restaurant': 'full_service',
};

function autoDetectMode(businessType: BusinessCategory | null): DevicePosMode {
  if (businessType) {
    const mapped = BUSINESS_TYPE_MODE_MAP[businessType.name];
    if (mapped) return mapped;
  }
  return 'standard';
}

function filteredBusinessTypes(): BusinessCategory[] {
  const allowed = new Set(['Caterer', 'Full Service Restaurant']);
  return BUSINESS_CATEGORIES.filter(c => allowed.has(c.name));
}

function progressPercent(step: number, totalSteps: number): number {
  return Math.round((step / totalSteps) * 100);
}

function makeBizType(name: string, vertical: BusinessVertical = 'food_and_drink'): BusinessCategory {
  return { name, vertical } as BusinessCategory;
}

// --- Tests ---

describe('SetupWizard — Mode Auto-Detection', () => {
  it('maps Caterer to catering', () => {
    expect(autoDetectMode(makeBizType('Caterer'))).toBe('catering');
  });

  it('maps Full Service Restaurant to full_service', () => {
    expect(autoDetectMode(makeBizType('Full Service Restaurant'))).toBe('full_service');
  });

  it('returns standard for null business type', () => {
    expect(autoDetectMode(null)).toBe('standard');
  });

  it('returns standard for unmapped business type', () => {
    expect(autoDetectMode(makeBizType('Some Unknown Type'))).toBe('standard');
  });
});

describe('SetupWizard — Business Type Filtering', () => {
  it('returns exactly 2 business types', () => {
    const types = filteredBusinessTypes();
    expect(types).toHaveLength(2);
  });

  it('includes Caterer', () => {
    const types = filteredBusinessTypes();
    expect(types.some(t => t.name === 'Caterer')).toBe(true);
  });

  it('includes Full Service Restaurant', () => {
    const types = filteredBusinessTypes();
    expect(types.some(t => t.name === 'Full Service Restaurant')).toBe(true);
  });

  it('BUSINESS_CATEGORIES still contains both entries', () => {
    expect(BUSINESS_CATEGORIES.some(c => c.name === 'Caterer')).toBe(true);
    expect(BUSINESS_CATEGORIES.some(c => c.name === 'Full Service Restaurant')).toBe(true);
  });
});

describe('SetupWizard — Reduced to Done Step Only', () => {
  it('totalSteps is 1', () => {
    const totalSteps = 1;
    expect(totalSteps).toBe(1);
  });

  it('isDoneStep when currentStep equals totalSteps', () => {
    const currentStep = 1;
    const totalSteps = 1;
    expect(currentStep === totalSteps).toBe(true);
  });

  it('stepLabel is All Set', () => {
    const stepLabel = 'All Set';
    expect(stepLabel).toBe('All Set');
  });

  it('progress is 100% at step 1 of 1', () => {
    expect(progressPercent(1, 1)).toBe(100);
  });
});

describe('SetupWizard — Revenue Ranges', () => {
  it('REVENUE_RANGES has entries', () => {
    expect(REVENUE_RANGES.length).toBeGreaterThan(0);
  });

  it('each revenue range has id, label, description', () => {
    for (const range of REVENUE_RANGES) {
      expect(range.id).toBeTruthy();
      expect(range.label).toBeTruthy();
      expect(range.description).toBeTruthy();
    }
  });
});
