import { describe, it, expect } from 'vitest';
import type { DevicePosMode, ModeFeatureFlags } from '@models/index';

// --- Replicate MainLayout nav logic for testing ---

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

function hasModule(modules: readonly string[], mod: string): boolean {
  return modules.includes(mod);
}

interface NavBuildContext {
  mode: DevicePosMode;
  isRetail: boolean;
  isService: boolean;
  isRestaurant: boolean;
  flags: Partial<ModeFeatureFlags>;
  modules: string[];
}

function addPosItems(items: NavItem[], ctx: NavBuildContext): void {
  if (!ctx.isService) {
    items.push({ label: 'Orders', icon: 'bi-receipt', route: '/orders' });
  }
  if (ctx.isRetail) {
    items.push({ label: 'POS', icon: 'bi-upc-scan', route: '/retail/pos' });
  } else if (!ctx.isService) {
    items.push({ label: 'POS', icon: 'bi-tv', route: '/pos' });
  }
}

function addCatalogItems(items: NavItem[], ctx: NavBuildContext): void {
  if (ctx.isRetail) {
    items.push({ label: 'Items', icon: 'bi-grid-3x3-gap', route: '/retail/catalog' });
    items.push({ label: 'Online Store', icon: 'bi-globe', route: '/retail/ecommerce' });
  } else if (ctx.isService) {
    items.push({ label: 'Items & Services', icon: 'bi-grid-3x3-gap', route: '/menu' });
  } else {
    if (hasModule(ctx.modules, 'menu_management')) {
      items.push({ label: 'Items', icon: 'bi-book', route: '/menu' });
    }
    if (ctx.isRestaurant && hasModule(ctx.modules, 'online_ordering')) {
      items.push({ label: 'Online', icon: 'bi-globe', route: '/online-ordering' });
    }
  }
}

function addModeSpecificItems(items: NavItem[], ctx: NavBuildContext): void {
  if (ctx.isRetail) {
    items.push({ label: 'Inventory', icon: 'bi-box-seam', route: '/retail/inventory' });
  } else if (hasModule(ctx.modules, 'inventory')) {
    items.push({ label: 'Inventory', icon: 'bi-box-seam', route: '/inventory' });
  }

  if (ctx.mode === 'full_service' || ctx.mode === 'bar') {
    if (ctx.flags.enableFloorPlan) items.push({ label: 'Floor Plan', icon: 'bi-columns-gap', route: '/floor-plan' });
    if (hasModule(ctx.modules, 'bookings')) items.push({ label: 'Bookings', icon: 'bi-calendar-event', route: '/bookings' });
  }

  if (ctx.isRetail) {
    items.push({ label: 'Vendors', icon: 'bi-truck', route: '/retail/vendors' });
    items.push({ label: 'Fulfillment', icon: 'bi-box2', route: '/retail/fulfillment' });
  }

  if (ctx.mode === 'bookings') items.push({ label: 'Bookings', icon: 'bi-calendar-check', route: '/bookings' });
  if (ctx.mode === 'services' && hasModule(ctx.modules, 'invoicing')) items.push({ label: 'Invoices', icon: 'bi-file-earmark-text', route: '/invoicing' });
}

function buildNavItems(
  mode: DevicePosMode,
  isRetail: boolean,
  isService: boolean,
  isRestaurant: boolean,
  flags: Partial<ModeFeatureFlags>,
  modules: string[],
): NavItem[] {
  const ctx: NavBuildContext = { mode, isRetail, isService, isRestaurant, flags, modules };
  const items: NavItem[] = [
    { label: 'Administration', icon: 'bi-house', route: '/administration' },
  ];

  addPosItems(items, ctx);
  addCatalogItems(items, ctx);
  items.push(
    { label: 'Customers', icon: 'bi-people', route: '/customers' },
    { label: 'Reports', icon: 'bi-bar-chart-line', route: '/reports' },
    { label: 'Staff', icon: 'bi-person-badge', route: '/scheduling' },
  );
  addModeSpecificItems(items, ctx);
  items.push({ label: 'Settings', icon: 'bi-gear', route: '/settings' });

  return items;
}

function getLabels(items: NavItem[]): string[] {
  return items.map(i => i.label);
}

// --- Tests ---

describe('MainLayout — Full Service mode', () => {
  const items = buildNavItems(
    'full_service', false, false, true,
    { enableFloorPlan: true },
    ['menu_management', 'inventory', 'online_ordering', 'bookings'],
  );
  const labels = getLabels(items);

  it('starts with Home', () => {
    expect(labels[0]).toBe('Administration');
  });

  it('ends with Settings', () => {
    expect(labels.at(-1)).toBe('Settings');
  });

  it('includes Orders and POS', () => {
    expect(labels).toContain('Orders');
    expect(labels).toContain('POS');
  });

  it('POS routes to /pos (not retail)', () => {
    const pos = items.find(i => i.label === 'POS');
    expect(pos?.route).toBe('/pos');
  });

  it('includes Items with /menu route', () => {
    const itemsNav = items.find(i => i.label === 'Items');
    expect(itemsNav?.route).toBe('/menu');
  });

  it('includes Online ordering', () => {
    expect(labels).toContain('Online');
  });

  it('includes Floor Plan and Bookings', () => {
    expect(labels).toContain('Floor Plan');
    expect(labels).toContain('Bookings');
  });

  it('includes Inventory at /inventory', () => {
    const inv = items.find(i => i.label === 'Inventory');
    expect(inv?.route).toBe('/inventory');
  });

  it('does NOT include retail-specific items', () => {
    expect(labels).not.toContain('Vendors');
    expect(labels).not.toContain('Fulfillment');
    expect(labels).not.toContain('Online Store');
  });

  it('does NOT include service-specific items', () => {
    expect(labels).not.toContain('Invoices');
    expect(labels).not.toContain('Appointments');
    expect(labels).not.toContain('Items & Services');
  });
});

describe('MainLayout — Retail mode', () => {
  const items = buildNavItems(
    'retail', true, false, false,
    {},
    ['inventory'],
  );
  const labels = getLabels(items);

  it('includes Home, Orders, POS, Items', () => {
    expect(labels).toContain('Administration');
    expect(labels).toContain('Orders');
    expect(labels).toContain('POS');
    expect(labels).toContain('Items');
  });

  it('POS routes to /retail/pos', () => {
    const pos = items.find(i => i.label === 'POS');
    expect(pos?.route).toBe('/retail/pos');
    expect(pos?.icon).toBe('bi-upc-scan');
  });

  it('Items routes to /retail/catalog', () => {
    const itemsNav = items.find(i => i.label === 'Items');
    expect(itemsNav?.route).toBe('/retail/catalog');
  });

  it('includes Online Store', () => {
    expect(labels).toContain('Online Store');
    const online = items.find(i => i.label === 'Online Store');
    expect(online?.route).toBe('/retail/ecommerce');
  });

  it('includes Inventory at /retail/inventory', () => {
    const inv = items.find(i => i.label === 'Inventory');
    expect(inv?.route).toBe('/retail/inventory');
  });

  it('includes Vendors and Fulfillment', () => {
    expect(labels).toContain('Vendors');
    expect(labels).toContain('Fulfillment');
  });

  it('does NOT include Floor Plan or Bookings', () => {
    expect(labels).not.toContain('Floor Plan');
    expect(labels).not.toContain('Bookings');
  });

  it('always includes Customers, Reports, Staff, Settings', () => {
    expect(labels).toContain('Customers');
    expect(labels).toContain('Reports');
    expect(labels).toContain('Staff');
    expect(labels).toContain('Settings');
  });
});

describe('MainLayout — Services mode', () => {
  const items = buildNavItems(
    'services', false, true, false,
    {},
    ['invoicing'],
  );
  const labels = getLabels(items);

  it('does NOT include Orders or POS', () => {
    expect(labels).not.toContain('Orders');
    expect(labels).not.toContain('POS');
  });

  it('shows Items & Services label', () => {
    expect(labels).toContain('Items & Services');
    const itemsNav = items.find(i => i.label === 'Items & Services');
    expect(itemsNav?.route).toBe('/menu');
  });

  it('includes Invoices', () => {
    expect(labels).toContain('Invoices');
    const inv = items.find(i => i.label === 'Invoices');
    expect(inv?.route).toBe('/invoicing');
  });

  it('does NOT include Bookings (services != bookings)', () => {
    expect(labels).not.toContain('Bookings');
  });
});

describe('MainLayout — Bookings mode', () => {
  const items = buildNavItems(
    'bookings', false, true, false,
    {},
    ['appointments'],
  );
  const labels = getLabels(items);

  it('includes Bookings', () => {
    expect(labels).toContain('Bookings');
    const booking = items.find(i => i.label === 'Bookings');
    expect(booking?.route).toBe('/bookings');
  });
});

describe('MainLayout — Bar mode', () => {
  const items = buildNavItems(
    'bar', false, false, true,
    { enableFloorPlan: true },
    ['menu_management', 'bookings'],
  );
  const labels = getLabels(items);

  it('includes Floor Plan and Bookings (same as full_service)', () => {
    expect(labels).toContain('Floor Plan');
    expect(labels).toContain('Bookings');
  });
});

describe('MainLayout — Quick Service mode (minimal)', () => {
  const items = buildNavItems(
    'quick_service', false, false, true,
    { enableFloorPlan: false },
    ['menu_management'],
  );
  const labels = getLabels(items);

  it('does NOT include Floor Plan when flag is false', () => {
    expect(labels).not.toContain('Floor Plan');
  });

  it('does NOT include Inventory when module not enabled', () => {
    expect(labels).not.toContain('Inventory');
  });

  it('includes Items when menu_management enabled', () => {
    expect(labels).toContain('Items');
  });

  it('total items is around 8 (Home, Orders, POS, Items, Customers, Reports, Staff, Settings)', () => {
    expect(items.length).toBeGreaterThanOrEqual(7);
    expect(items.length).toBeLessThanOrEqual(10);
  });
});

describe('MainLayout — Always-present items', () => {
  const modes: Array<{ mode: DevicePosMode; isRetail: boolean; isService: boolean; isRestaurant: boolean }> = [
    { mode: 'full_service', isRetail: false, isService: false, isRestaurant: true },
    { mode: 'retail', isRetail: true, isService: false, isRestaurant: false },
    { mode: 'services', isRetail: false, isService: true, isRestaurant: false },
    { mode: 'bookings', isRetail: false, isService: true, isRestaurant: false },
    { mode: 'quick_service', isRetail: false, isService: false, isRestaurant: true },
  ];

  for (const { mode, isRetail, isService, isRestaurant } of modes) {
    it(`${mode} mode always has Home, Customers, Reports, Staff, Settings`, () => {
      const items = buildNavItems(mode, isRetail, isService, isRestaurant, {}, []);
      const labels = getLabels(items);
      expect(labels).toContain('Administration');
      expect(labels).toContain('Customers');
      expect(labels).toContain('Reports');
      expect(labels).toContain('Staff');
      expect(labels).toContain('Settings');
    });
  }
});
