import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// BUG-04: Regression guards — staff onboarding must never exist

const ROOT = path.resolve(process.cwd(), 'src/app');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

describe('BUG-04: Staff onboarding feature removed', () => {

  it('TeamMember interface has no onboardingStatus field', () => {
    const source = readSource('models/staff-management.model.ts');
    expect(source).not.toContain('onboardingStatus');
  });

  it('staff-management.model.ts does not export OnboardingChecklist', async () => {
    const exports = await import('@models/staff-management.model');
    expect(exports).not.toHaveProperty('OnboardingChecklist');
  });

  it('staff-management.model.ts does not export OnboardingStep type', () => {
    const source = readSource('models/staff-management.model.ts');
    expect(source).not.toMatch(/export type OnboardingStep/);
  });

  it('staff-management.model.ts does not export OnboardingStepEntry', () => {
    const source = readSource('models/staff-management.model.ts');
    expect(source).not.toMatch(/export interface OnboardingStepEntry/);
  });

  it('StaffManagementService source has no onboarding methods', () => {
    const source = readSource('services/staff-management.ts');
    expect(source).not.toContain('loadOnboardingChecklist');
    expect(source).not.toContain('updateOnboardingStep');
    expect(source).not.toContain('sendOnboardingLink');
    expect(source).not.toContain('completeOnboarding');
    expect(source).not.toContain('OnboardingChecklist');
  });
});
