import { describe, it, expect } from 'vitest';

// --- Replicate HomeDashboard pure logic for testing ---

interface SetupTask {
  id: string;
  label: string;
  description: string;
  icon: string;
  route: string;
  done: boolean;
  category: 'essential' | 'advanced';
}

interface QuickAction {
  label: string;
  icon: string;
  route: string;
  color: string;
}

function buildSetupTasks(
  completedTasks: Set<string>,
  isRetail: boolean,
  isService: boolean,
): SetupTask[] {
  let itemsLabel = 'Create your first menu items';
  let itemsDesc = 'Add items, categories, and modifiers';
  if (isRetail) { itemsLabel = 'Add your first products'; itemsDesc = 'Add products to your catalog'; }
  else if (isService) { itemsLabel = 'Create your first services'; itemsDesc = 'Set up your service offerings'; }
  const itemsRoute = isRetail ? '/retail/catalog' : '/menu';
  const itemsIcon = isRetail ? 'bi-grid-3x3-gap' : 'bi-book';

  const onlineLabel = isRetail ? 'Set up your online store' : 'Set up online ordering';
  const onlineRoute = isRetail ? '/retail/ecommerce' : '/settings';

  return [
    { id: 'payments', label: 'Set up payments', description: 'Connect PayPal to accept card payments', icon: 'bi-credit-card', route: '/settings', done: completedTasks.has('payments'), category: 'essential' },
    { id: 'items', label: itemsLabel, description: itemsDesc, icon: itemsIcon, route: itemsRoute, done: completedTasks.has('items'), category: 'essential' },
    { id: 'taxes', label: 'Set up taxes', description: 'Configure tax rates for your location', icon: 'bi-percent', route: '/settings', done: completedTasks.has('taxes'), category: 'essential' },
    { id: 'team', label: 'Add team members', description: 'Invite staff and set permissions', icon: 'bi-people', route: '/settings', done: completedTasks.has('team'), category: 'essential' },
    { id: 'hours', label: 'Set your business hours', description: 'Configure your regular operating hours', icon: 'bi-clock', route: '/settings', done: completedTasks.has('hours'), category: 'essential' },
    { id: 'online', label: onlineLabel, description: 'Let customers order from your website', icon: 'bi-globe', route: onlineRoute, done: completedTasks.has('online'), category: 'advanced' },
    { id: 'display', label: 'Configure your display', description: 'Set up KDS, customer display, or kiosk', icon: 'bi-display', route: '/settings', done: completedTasks.has('display'), category: 'advanced' },
    { id: 'discounts', label: 'Create discounts', description: 'Set up promotions and special offers', icon: 'bi-tag', route: '/settings', done: completedTasks.has('discounts'), category: 'advanced' },
    { id: 'pin', label: 'Set owner PIN', description: 'Security PIN for POS access and clock-in', icon: 'bi-shield-lock', route: '/settings', done: completedTasks.has('pin'), category: 'advanced' },
  ];
}

function getEssentialTasks(tasks: SetupTask[]): SetupTask[] {
  return tasks.filter(t => t.category === 'essential');
}

function getAdvancedTasks(tasks: SetupTask[]): SetupTask[] {
  return tasks.filter(t => t.category === 'advanced');
}

function essentialProgress(tasks: SetupTask[]): number {
  const essential = getEssentialTasks(tasks);
  const done = essential.filter(t => t.done).length;
  return Math.round((done / essential.length) * 100);
}

function isEssentialComplete(tasks: SetupTask[]): boolean {
  return essentialProgress(tasks) === 100;
}

function todayAvgTicket(sales: number, orders: number): number {
  return orders > 0 ? sales / orders : 0;
}

function salesChangePercent(today: number, yesterday: number): number {
  if (yesterday === 0) return 0;
  return ((today - yesterday) / yesterday) * 100;
}

function getQuickActions(isRetail: boolean, isService: boolean): QuickAction[] {
  if (isRetail) {
    return [
      { label: 'Scan item', icon: 'bi-upc-scan', route: '/retail/pos', color: 'blue' },
      { label: 'View orders', icon: 'bi-receipt', route: '/orders', color: 'green' },
      { label: 'Add product', icon: 'bi-plus-circle', route: '/retail/catalog', color: 'purple' },
      { label: 'View reports', icon: 'bi-graph-up', route: '/reports', color: 'amber' },
    ];
  }
  if (isService) {
    return [
      { label: 'New invoice', icon: 'bi-file-earmark-text', route: '/invoicing', color: 'blue' },
      { label: 'Bookings', icon: 'bi-calendar-check', route: '/bookings', color: 'green' },
      { label: 'Add service', icon: 'bi-plus-circle', route: '/menu', color: 'purple' },
      { label: 'View reports', icon: 'bi-graph-up', route: '/reports', color: 'amber' },
    ];
  }
  return [
    { label: 'Take payment', icon: 'bi-tv', route: '/pos', color: 'blue' },
    { label: 'View orders', icon: 'bi-receipt', route: '/orders', color: 'green' },
    { label: 'Add item', icon: 'bi-plus-circle', route: '/menu', color: 'purple' },
    { label: 'View reports', icon: 'bi-graph-up', route: '/reports', color: 'amber' },
  ];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

// --- Tests ---

describe('HomeDashboard — Setup Tasks', () => {
  it('returns 9 total tasks (5 essential + 4 advanced)', () => {
    const tasks = buildSetupTasks(new Set(), false, false);
    expect(tasks).toHaveLength(9);
    expect(getEssentialTasks(tasks)).toHaveLength(5);
    expect(getAdvancedTasks(tasks)).toHaveLength(4);
  });

  it('marks tasks as done based on completedTasks set', () => {
    const done = new Set(['payments', 'taxes']);
    const tasks = buildSetupTasks(done, false, false);
    expect(tasks.find(t => t.id === 'payments')?.done).toBe(true);
    expect(tasks.find(t => t.id === 'taxes')?.done).toBe(true);
    expect(tasks.find(t => t.id === 'items')?.done).toBe(false);
    expect(tasks.find(t => t.id === 'team')?.done).toBe(false);
  });

  it('shows retail labels when isRetail is true', () => {
    const tasks = buildSetupTasks(new Set(), true, false);
    const itemTask = tasks.find(t => t.id === 'items');
    expect(itemTask?.label).toBe('Add your first products');
    expect(itemTask?.description).toBe('Add products to your catalog');
    expect(itemTask?.route).toBe('/retail/catalog');
    expect(itemTask?.icon).toBe('bi-grid-3x3-gap');

    const onlineTask = tasks.find(t => t.id === 'online');
    expect(onlineTask?.label).toBe('Set up your online store');
    expect(onlineTask?.route).toBe('/retail/ecommerce');
  });

  it('shows service labels when isService is true', () => {
    const tasks = buildSetupTasks(new Set(), false, true);
    const itemTask = tasks.find(t => t.id === 'items');
    expect(itemTask?.label).toBe('Create your first services');
    expect(itemTask?.description).toBe('Set up your service offerings');
    expect(itemTask?.route).toBe('/menu');
  });

  it('shows restaurant labels by default', () => {
    const tasks = buildSetupTasks(new Set(), false, false);
    const itemTask = tasks.find(t => t.id === 'items');
    expect(itemTask?.label).toBe('Create your first menu items');
    expect(itemTask?.description).toBe('Add items, categories, and modifiers');
    expect(itemTask?.route).toBe('/menu');
    expect(itemTask?.icon).toBe('bi-book');

    const onlineTask = tasks.find(t => t.id === 'online');
    expect(onlineTask?.label).toBe('Set up online ordering');
    expect(onlineTask?.route).toBe('/settings');
  });
});

describe('HomeDashboard — Essential Progress', () => {
  it('returns 0% when no tasks done', () => {
    const tasks = buildSetupTasks(new Set(), false, false);
    expect(essentialProgress(tasks)).toBe(0);
  });

  it('returns 20% when 1 of 5 essential tasks done', () => {
    const tasks = buildSetupTasks(new Set(['payments']), false, false);
    expect(essentialProgress(tasks)).toBe(20);
  });

  it('returns 60% when 3 of 5 essential tasks done', () => {
    const tasks = buildSetupTasks(new Set(['payments', 'items', 'taxes']), false, false);
    expect(essentialProgress(tasks)).toBe(60);
  });

  it('returns 100% when all 5 essential tasks done', () => {
    const tasks = buildSetupTasks(new Set(['payments', 'items', 'taxes', 'team', 'hours']), false, false);
    expect(essentialProgress(tasks)).toBe(100);
  });

  it('ignores advanced tasks for essential progress', () => {
    const tasks = buildSetupTasks(new Set(['online', 'display', 'discounts', 'pin']), false, false);
    expect(essentialProgress(tasks)).toBe(0);
  });

  it('isEssentialComplete is false when not all essential done', () => {
    const tasks = buildSetupTasks(new Set(['payments', 'items', 'taxes', 'team']), false, false);
    expect(isEssentialComplete(tasks)).toBe(false);
  });

  it('isEssentialComplete is true when all essential done', () => {
    const tasks = buildSetupTasks(new Set(['payments', 'items', 'taxes', 'team', 'hours']), false, false);
    expect(isEssentialComplete(tasks)).toBe(true);
  });
});

describe('HomeDashboard — KPI Computeds', () => {
  it('todayAvgTicket returns 0 when no orders', () => {
    expect(todayAvgTicket(500, 0)).toBe(0);
  });

  it('todayAvgTicket computes correctly', () => {
    expect(todayAvgTicket(500, 10)).toBe(50);
  });

  it('salesChangePercent returns 0 when yesterday is 0', () => {
    expect(salesChangePercent(100, 0)).toBe(0);
  });

  it('salesChangePercent computes positive change', () => {
    expect(salesChangePercent(150, 100)).toBe(50);
  });

  it('salesChangePercent computes negative change', () => {
    expect(salesChangePercent(80, 100)).toBe(-20);
  });

  it('salesChangePercent computes zero change', () => {
    expect(salesChangePercent(100, 100)).toBe(0);
  });
});

describe('HomeDashboard — Quick Actions', () => {
  it('returns retail actions for retail mode', () => {
    const actions = getQuickActions(true, false);
    expect(actions).toHaveLength(4);
    expect(actions[0].label).toBe('Scan item');
    expect(actions[0].route).toBe('/retail/pos');
  });

  it('returns service actions for service mode', () => {
    const actions = getQuickActions(false, true);
    expect(actions).toHaveLength(4);
    expect(actions[0].label).toBe('New invoice');
    expect(actions[0].route).toBe('/invoicing');
    expect(actions[1].label).toBe('Bookings');
  });

  it('returns restaurant actions by default', () => {
    const actions = getQuickActions(false, false);
    expect(actions).toHaveLength(4);
    expect(actions[0].label).toBe('Take payment');
    expect(actions[0].route).toBe('/pos');
  });

  it('all actions have required fields', () => {
    for (const actions of [getQuickActions(true, false), getQuickActions(false, true), getQuickActions(false, false)]) {
      for (const action of actions) {
        expect(action.label).toBeTruthy();
        expect(action.icon).toBeTruthy();
        expect(action.route).toBeTruthy();
        expect(action.color).toBeTruthy();
      }
    }
  });
});

describe('HomeDashboard — Formatters', () => {
  it('formatCurrency formats USD', () => {
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
    expect(formatCurrency(99.99)).toBe('$99.99');
  });

  it('formatPercent with positive value', () => {
    expect(formatPercent(12.345)).toBe('+12.3%');
  });

  it('formatPercent with negative value', () => {
    expect(formatPercent(-5.678)).toBe('-5.7%');
  });

  it('formatPercent with zero', () => {
    expect(formatPercent(0)).toBe('+0.0%');
  });
});
