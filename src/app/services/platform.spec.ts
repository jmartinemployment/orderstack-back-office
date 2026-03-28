import { describe, it, expect } from 'vitest';
import type {
  DevicePosMode,
  BusinessVertical,
  ModeFeatureFlags,
  PlatformModule,
} from '@models/platform.model';
import {
  getModePreset,
  getModesForVerticals,
  getModulesForVerticals,
  defaultMerchantProfile,
} from '@models/platform.model';

// --- Pure function replicas of PlatformService computed logic ---

function isRestaurantMode(mode: DevicePosMode): boolean {
  return mode === 'quick_service' || mode === 'full_service' || mode === 'bar';
}

function isRetailMode(mode: DevicePosMode): boolean {
  return mode === 'retail';
}

function isServiceMode(mode: DevicePosMode): boolean {
  return mode === 'services' || mode === 'bookings';
}

function computeFeatureFlags(
  mode: DevicePosMode,
  overrides: Partial<ModeFeatureFlags>,
): ModeFeatureFlags {
  const preset = getModePreset(mode);
  return { ...preset, ...overrides };
}

function computeAvailableModes(
  verticals: BusinessVertical[] | null,
): DevicePosMode[] {
  if (!verticals) return getModesForVerticals(['food_and_drink']);
  return getModesForVerticals(verticals);
}

function computeEnabledModules(
  profileModules: PlatformModule[] | null,
  verticals: BusinessVertical[] | null,
): PlatformModule[] {
  if (!profileModules) return getModulesForVerticals(verticals ?? ['food_and_drink']);
  return profileModules;
}

function resolveDeviceMode(
  preferred: DevicePosMode,
  available: DevicePosMode[],
): DevicePosMode {
  if (available.includes(preferred)) return preferred;
  return available[0] ?? 'standard';
}

function isModuleEnabled(modules: PlatformModule[], mod: PlatformModule): boolean {
  return modules.includes(mod);
}

// --- Tests ---

describe('PlatformService — isRestaurantMode', () => {
  it('true for full_service', () => {
    expect(isRestaurantMode('full_service')).toBe(true);
  });

  it('true for quick_service', () => {
    expect(isRestaurantMode('quick_service')).toBe(true);
  });

  it('true for bar', () => {
    expect(isRestaurantMode('bar')).toBe(true);
  });

  it('false for retail', () => {
    expect(isRestaurantMode('retail')).toBe(false);
  });

  it('false for services', () => {
    expect(isRestaurantMode('services')).toBe(false);
  });
});

describe('PlatformService — isRetailMode', () => {
  it('true for retail', () => {
    expect(isRetailMode('retail')).toBe(true);
  });

  it('false for full_service', () => {
    expect(isRetailMode('full_service')).toBe(false);
  });
});

describe('PlatformService — isServiceMode', () => {
  it('true for services', () => {
    expect(isServiceMode('services')).toBe(true);
  });

  it('true for bookings', () => {
    expect(isServiceMode('bookings')).toBe(true);
  });

  it('false for retail', () => {
    expect(isServiceMode('retail')).toBe(false);
  });
});

describe('PlatformService — computeFeatureFlags', () => {
  it('returns preset for mode without overrides', () => {
    const flags = computeFeatureFlags('full_service', {});
    expect(flags.enableOpenChecks).toBe(true);
    expect(flags.enableFloorPlan).toBe(true);
    expect(flags.enableKds).toBe(true);
  });

  it('quick_service disables open checks and floor plan', () => {
    const flags = computeFeatureFlags('quick_service', {});
    expect(flags.enableOpenChecks).toBe(false);
    expect(flags.enableFloorPlan).toBe(false);
  });

  it('overrides take precedence', () => {
    const flags = computeFeatureFlags('quick_service', {
      enableFloorPlan: true,
      enableOpenChecks: true,
    });
    expect(flags.enableFloorPlan).toBe(true);
    expect(flags.enableOpenChecks).toBe(true);
  });

  it('retail mode has specific flags', () => {
    const flags = computeFeatureFlags('retail', {});
    expect(flags.enableKds).toBe(false);
    expect(flags.enableCoursing).toBe(false);
  });
});

describe('PlatformService — computeAvailableModes', () => {
  it('food_and_drink includes restaurant modes', () => {
    const modes = computeAvailableModes(['food_and_drink']);
    expect(modes).toContain('full_service');
    expect(modes).toContain('quick_service');
  });

  it('retail vertical includes retail mode', () => {
    const modes = computeAvailableModes(['retail']);
    expect(modes).toContain('retail');
  });

  it('null defaults to food_and_drink', () => {
    const modes = computeAvailableModes(null);
    expect(modes).toContain('full_service');
  });

  it('multiple verticals combine modes', () => {
    const modes = computeAvailableModes(['food_and_drink', 'retail']);
    expect(modes).toContain('full_service');
    expect(modes).toContain('retail');
  });
});

describe('PlatformService — computeEnabledModules', () => {
  it('returns profile modules when available', () => {
    const modules: PlatformModule[] = ['menu', 'orders', 'kds'];
    expect(computeEnabledModules(modules, null)).toEqual(modules);
  });

  it('falls back to vertical modules when no profile', () => {
    const modules = computeEnabledModules(null, ['food_and_drink']);
    expect(modules.length).toBeGreaterThan(0);
  });

  it('null verticals defaults to food_and_drink modules', () => {
    const modules = computeEnabledModules(null, null);
    expect(modules.length).toBeGreaterThan(0);
  });
});

describe('PlatformService — resolveDeviceMode', () => {
  it('returns preferred when available', () => {
    expect(resolveDeviceMode('full_service', ['quick_service', 'full_service'])).toBe('full_service');
  });

  it('falls back to first available when preferred not found', () => {
    expect(resolveDeviceMode('retail', ['quick_service', 'full_service'])).toBe('quick_service');
  });

  it('returns standard when no modes available', () => {
    expect(resolveDeviceMode('full_service', [])).toBe('standard');
  });
});

describe('PlatformService — isModuleEnabled', () => {
  it('true when module in list', () => {
    expect(isModuleEnabled(['menu', 'orders', 'kds'], 'kds')).toBe(true);
  });

  it('false when module not in list', () => {
    expect(isModuleEnabled(['menu', 'orders'], 'kds')).toBe(false);
  });

  it('false for empty list', () => {
    expect(isModuleEnabled([], 'menu')).toBe(false);
  });
});

describe('PlatformService — defaultMerchantProfile', () => {
  it('returns food_and_drink as primary vertical', () => {
    const profile = defaultMerchantProfile();
    expect(profile.primaryVertical).toBe('food_and_drink');
  });

  it('returns full_service as default device mode', () => {
    const profile = defaultMerchantProfile();
    expect(profile.defaultDeviceMode).toBe('full_service');
  });

  it('has empty business name', () => {
    const profile = defaultMerchantProfile();
    expect(profile.businessName).toBe('');
  });

  it('has enabled modules for food_and_drink', () => {
    const profile = defaultMerchantProfile();
    expect(profile.enabledModules.length).toBeGreaterThan(0);
  });

  it('has business hours', () => {
    const profile = defaultMerchantProfile();
    expect(profile.businessHours.length).toBe(7);
  });

  it('is marked as onboarding complete', () => {
    const profile = defaultMerchantProfile();
    expect(profile.onboardingComplete).toBe(true);
  });
});

describe('PlatformService — getModePreset', () => {
  it('full_service has floor plan and open checks', () => {
    const preset = getModePreset('full_service');
    expect(preset.enableFloorPlan).toBe(true);
    expect(preset.enableOpenChecks).toBe(true);
    expect(preset.enableCoursing).toBe(true);
  });

  it('quick_service is order-number focused', () => {
    const preset = getModePreset('quick_service');
    expect(preset.enableOrderNumberTracking).toBe(true);
    expect(preset.enableFloorPlan).toBe(false);
  });

  it('bar has open checks but no coursing', () => {
    const preset = getModePreset('bar');
    expect(preset.enableOpenChecks).toBe(true);
    expect(preset.enablePreAuthTabs).toBe(true);
    expect(preset.enableCoursing).toBe(false);
  });
});

describe('PlatformService — getModesForVerticals', () => {
  it('returns non-empty for valid verticals', () => {
    expect(getModesForVerticals(['food_and_drink']).length).toBeGreaterThan(0);
  });

  it('returns non-empty for retail', () => {
    expect(getModesForVerticals(['retail']).length).toBeGreaterThan(0);
  });

  it('deduplicates when combining verticals', () => {
    const combined = getModesForVerticals(['food_and_drink', 'food_and_drink']);
    const unique = [...new Set(combined)];
    expect(combined.length).toBe(unique.length);
  });
});
