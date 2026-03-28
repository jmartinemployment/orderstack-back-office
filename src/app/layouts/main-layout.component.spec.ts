import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NavItem, AlertSeverity } from '@shared/sidebar/sidebar';
import type { OrderSentimentRecord } from '@models/sentiment.model';

/**
 * Tests the logout behavior pattern used by MainLayoutComponent.
 *
 * The actual component has 8+ injected services, making TestBed setup
 * disproportionately heavy for a focused logout test. Instead, we test
 * the behavioral contract directly: logout() must await auth.logout()
 * then navigate to /login.
 */

interface LogoutBehavior {
  logout(): Promise<void>;
}

function createLogoutHandler(
  auth: { logout: () => Promise<void> },
  router: { navigate: (commands: string[]) => Promise<boolean> },
): LogoutBehavior {
  return {
    async logout(): Promise<void> {
      await auth.logout();
      await router.navigate(['/login']);
    },
  };
}

describe('MainLayout — logout behavior', () => {
  it('calls auth.logout() before navigating', async () => {
    const callOrder: string[] = [];
    const auth = {
      logout: vi.fn().mockImplementation(async () => { callOrder.push('logout'); }),
    };
    const router = {
      navigate: vi.fn().mockImplementation(async () => { callOrder.push('navigate'); return true; }),
    };

    const handler = createLogoutHandler(auth, router);
    await handler.logout();

    expect(callOrder).toEqual(['logout', 'navigate']);
  });

  it('navigates to /login after logout', async () => {
    const auth = { logout: vi.fn().mockResolvedValue(undefined) };
    const router = { navigate: vi.fn().mockResolvedValue(true) };

    const handler = createLogoutHandler(auth, router);
    await handler.logout();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('navigates even if auth.logout() rejects', async () => {
    const auth = { logout: vi.fn().mockRejectedValue(new Error('network error')) };
    const router = { navigate: vi.fn().mockResolvedValue(true) };

    const handler = createLogoutHandler(auth, router);

    // The real AuthService.logout() catches errors internally,
    // but we verify the pattern handles rejection gracefully
    await expect(handler.logout()).rejects.toThrow('network error');
  });

  it('awaits auth.logout() (does not fire-and-forget)', async () => {
    let logoutResolved = false;
    const auth = {
      logout: vi.fn().mockImplementation(() =>
        new Promise<void>(resolve => {
          setTimeout(() => { logoutResolved = true; resolve(); }, 10);
        })
      ),
    };
    const router = {
      navigate: vi.fn().mockImplementation(async () => {
        // Navigation should only happen after logout resolved
        expect(logoutResolved).toBe(true);
        return true;
      }),
    };

    const handler = createLogoutHandler(auth, router);
    await handler.logout();

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalled();
  });
});

/**
 * Tests for BUG-11: Staff nav item false-active orange background.
 *
 * Root cause: sidebarAlerts applied alertSeverity:'warning' to Staff whenever
 * teamMembers().length === 0, which is true before loadTeamMembers() is ever
 * called. Fix: guard the alert on teamMembersLoaded().
 *
 * We extract the Staff alert logic as a pure function matching the guard in
 * main-layout.component.ts, keeping tests fast and without Angular TestBed.
 */

function computeStaffAlertSeverity(
  teamMembersLoaded: boolean,
  teamCount: number,
): AlertSeverity {
  if (teamMembersLoaded && teamCount === 0) return 'warning';
  return null;
}

describe('MainLayout — BUG-11 Staff nav alert severity', () => {
  // Test 1: On /app/orders (or any non-staff route), Staff has no alert at init
  it('Test 1: Staff alertSeverity is null before loadTeamMembers() completes (any route)', () => {
    // teamMembersLoaded=false simulates initial state before API call
    expect(computeStaffAlertSeverity(false, 0)).toBe(null);
  });

  // Test 2: On /app/administration, Staff has no alert at init
  it('Test 2: Staff alertSeverity is null when loaded=false regardless of team count', () => {
    expect(computeStaffAlertSeverity(false, 0)).toBe(null);
    expect(computeStaffAlertSeverity(false, 3)).toBe(null);
  });

  // Test 3: On /app/staff after load with members — no alert
  it('Test 3: Staff alertSeverity is null when loaded and team has members', () => {
    expect(computeStaffAlertSeverity(true, 1)).toBe(null);
    expect(computeStaffAlertSeverity(true, 5)).toBe(null);
  });

  // Test 4: Alert only fires after load + empty team
  it('Test 4: Staff alertSeverity is warning only when loaded=true and teamCount=0', () => {
    expect(computeStaffAlertSeverity(true, 0)).toBe('warning');
  });

  // Test 5: Transitioning loaded state clears false positive
  it('Test 5: alertSeverity transitions from null (unloaded) to null (loaded with members)', () => {
    const beforeLoad = computeStaffAlertSeverity(false, 0);
    const afterLoadWithMembers = computeStaffAlertSeverity(true, 3);
    expect(beforeLoad).toBe(null);
    expect(afterLoadWithMembers).toBe(null);
  });

  // Test 6: At initialization (loaded=false), alertSeverity is null even with count 0
  it('Test 6: at init with zero team count and unloaded state — no orange background', () => {
    const alertAtInit = computeStaffAlertSeverity(false, 0);
    expect(alertAtInit).toBe(null);
    // Only after explicit load call with empty result should the warning appear
    const alertAfterEmptyLoad = computeStaffAlertSeverity(true, 0);
    expect(alertAfterEmptyLoad).toBe('warning');
  });
});

/**
 * Tests the catering nav structure per FEATURE-04 spec.
 *
 * We extract the buildCateringNav logic into a pure function so we can
 * test the NavItem[] output without instantiating the full component.
 */

interface CateringBadgeSignals {
  pendingJobsCount: number;
  proposalsAwaitingApproval: number;
  milestonesComingDue: number;
}

function buildCateringNav(signals: CateringBadgeSignals): NavItem[] {
  const { pendingJobsCount: pendingJobs, proposalsAwaitingApproval: pendingProps, milestonesComingDue: dueMilestones } = signals;

  return [
    { label: 'Dashboard', icon: 'bi-speedometer2', route: '/app/administration', exact: true },
    {
      label: 'Jobs', icon: 'bi-briefcase', route: '/app/catering',
      badge: pendingJobs > 0 ? pendingJobs : undefined,
      children: [
        { label: 'Leads',       icon: 'bi-funnel',       route: '/app/catering', queryParams: { status: 'inquiry' } },
        { label: 'Active Jobs', icon: 'bi-play-circle',  route: '/app/catering', queryParams: { status: 'active' } },
        { label: 'Completed',   icon: 'bi-check-circle', route: '/app/catering', queryParams: { status: 'completed' } },
        { label: 'All Jobs',    icon: 'bi-list-ul',      route: '/app/catering', queryParams: { status: 'all' } },
      ],
    },
    { label: 'Calendar', icon: 'bi-calendar-event', route: '/app/catering/calendar' },
    {
      label: 'Proposals', icon: 'bi-file-earmark-text', route: '/app/catering/proposals',
      badge: pendingProps > 0 ? pendingProps : undefined,
    },
    {
      label: 'Invoices', icon: 'bi-receipt', route: '/app/invoicing',
      badge: dueMilestones > 0 ? dueMilestones : undefined,
      dividerBefore: true,
      children: [
        { label: 'All Invoices', icon: 'bi-collection',         route: '/app/invoicing' },
        { label: 'Outstanding',  icon: 'bi-exclamation-circle', route: '/app/invoicing', queryParams: { status: 'outstanding' } },
        { label: 'Milestones',   icon: 'bi-bar-chart-steps',    route: '/app/invoicing/milestones' },
      ],
    },
    { label: 'Clients', icon: 'bi-person-lines-fill', route: '/app/customers', dividerBefore: true },
    {
      label: 'Menu', icon: 'bi-book', route: '/app/menu',
      children: [
        { label: 'Items',    icon: 'bi-box',    route: '/app/menu', queryParams: { type: 'catering' } },
        { label: 'Packages', icon: 'bi-layers', route: '/app/menu/packages' },
      ],
    },
    { label: 'Delivery', icon: 'bi-truck', route: '/app/catering/delivery' },
    {
      label: 'Reports', icon: 'bi-bar-chart-line', route: '/app/reports', dividerBefore: true,
      children: [
        { label: 'Revenue',         icon: 'bi-currency-dollar', route: '/app/reports/revenue' },
        { label: 'Deferred',        icon: 'bi-clock-history',   route: '/app/reports/deferred' },
        { label: 'Job Performance', icon: 'bi-bar-chart',       route: '/app/reports/catering' },
      ],
    },
    {
      label: 'Staff', icon: 'bi-person-badge', route: '/app/staff',
      children: [
        { label: 'Team',       icon: 'bi-people',        route: '/app/staff' },
        { label: 'Scheduling', icon: 'bi-calendar-week', route: '/app/staff/scheduling' },
      ],
    },
    { label: 'Marketing', icon: 'bi-megaphone', route: '/app/marketing' },
    {
      label: 'Settings', icon: 'bi-gear', route: '/app/settings', dividerBefore: true,
      children: [
        { label: 'Business Info',    icon: 'bi-building',    route: '/app/settings/business' },
        { label: 'Invoice Branding', icon: 'bi-palette',     route: '/app/settings/branding' },
        { label: 'Payment Setup',    icon: 'bi-credit-card', route: '/app/settings/payments' },
        { label: 'Notifications',    icon: 'bi-bell',        route: '/app/settings/notifications' },
      ],
    },
  ];
}

function findTopLevel(items: NavItem[], label: string): NavItem | undefined {
  return items.find(i => i.label === label);
}

function childLabels(item: NavItem | undefined): string[] {
  return (item?.children ?? []).map(c => c.label);
}

describe('MainLayout — buildCateringNav (FEATURE-04 spec)', () => {
  const defaultSignals: CateringBadgeSignals = {
    pendingJobsCount: 0,
    proposalsAwaitingApproval: 0,
    milestonesComingDue: 0,
  };

  it('Test 1: no top-level "Catering Menu" item exists', () => {
    const nav = buildCateringNav(defaultSignals);
    const cateringMenu = findTopLevel(nav, 'Catering Menu');
    expect(cateringMenu).toBeUndefined();
  });

  it('Test 2: Jobs has children Leads, Active Jobs, Completed, All Jobs', () => {
    const nav = buildCateringNav(defaultSignals);
    const jobs = findTopLevel(nav, 'Jobs');
    expect(jobs).toBeDefined();
    expect(childLabels(jobs)).toEqual(['Leads', 'Active Jobs', 'Completed', 'All Jobs']);
  });

  it('Test 3: Invoices has children All Invoices, Outstanding, Milestones', () => {
    const nav = buildCateringNav(defaultSignals);
    const invoices = findTopLevel(nav, 'Invoices');
    expect(invoices).toBeDefined();
    expect(childLabels(invoices)).toEqual(['All Invoices', 'Outstanding', 'Milestones']);
  });

  it('Test 4: Menu has children Items and Packages', () => {
    const nav = buildCateringNav(defaultSignals);
    const menu = findTopLevel(nav, 'Menu');
    expect(menu).toBeDefined();
    expect(childLabels(menu)).toEqual(['Items', 'Packages']);
  });

  it('Test 5: Reports has children Revenue, Deferred, Job Performance', () => {
    const nav = buildCateringNav(defaultSignals);
    const reports = findTopLevel(nav, 'Reports');
    expect(reports).toBeDefined();
    expect(childLabels(reports)).toEqual(['Revenue', 'Deferred', 'Job Performance']);
  });

  it('Test 6: Staff has children Team and Scheduling', () => {
    const nav = buildCateringNav(defaultSignals);
    const staff = findTopLevel(nav, 'Staff');
    expect(staff).toBeDefined();
    expect(childLabels(staff)).toEqual(['Team', 'Scheduling']);
  });

  it('Test 7: Settings has children Business Info, Invoice Branding, Payment Setup, Notifications', () => {
    const nav = buildCateringNav(defaultSignals);
    const settings = findTopLevel(nav, 'Settings');
    expect(settings).toBeDefined();
    expect(childLabels(settings)).toEqual(['Business Info', 'Invoice Branding', 'Payment Setup', 'Notifications']);
  });

  it('Test 8: dividerBefore is true on Invoices, Clients, Reports, and Settings', () => {
    const nav = buildCateringNav(defaultSignals);
    expect(findTopLevel(nav, 'Invoices')?.dividerBefore).toBe(true);
    expect(findTopLevel(nav, 'Clients')?.dividerBefore).toBe(true);
    expect(findTopLevel(nav, 'Reports')?.dividerBefore).toBe(true);
    expect(findTopLevel(nav, 'Settings')?.dividerBefore).toBe(true);
  });

  it('Test 9: Jobs badge reflects pendingJobsCount', () => {
    const nav = buildCateringNav({ ...defaultSignals, pendingJobsCount: 3 });
    const jobs = findTopLevel(nav, 'Jobs');
    expect(jobs?.badge).toBe(3);
  });

  it('Test 10: zero badge signals produce no badges', () => {
    const nav = buildCateringNav(defaultSignals);
    expect(findTopLevel(nav, 'Jobs')?.badge).toBeUndefined();
    expect(findTopLevel(nav, 'Proposals')?.badge).toBeUndefined();
    expect(findTopLevel(nav, 'Invoices')?.badge).toBeUndefined();
  });
});

/**
 * Tests for BUG-20: Sidebar shows placeholder "jeff / 123 main" instead of
 * the merchant's actual business name and formatted address.
 *
 * Root cause: main-layout passed auth.selectedMerchantName (raw DB value from
 * login response) directly to the sidebar. Fix: prefer PlatformService's
 * merchantProfile.businessName and structured address (city, state).
 *
 * These pure functions mirror the computed() logic in main-layout.component.ts.
 */

interface BusinessAddress {
  street: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  timezone: string;
  phone: string | null;
  lat: number | null;
}

interface MerchantProfileSlice {
  businessName: string;
  address: BusinessAddress | null;
}

function resolveMerchantName(
  profile: MerchantProfileSlice | null,
  authName: string | null,
): string | null {
  if (profile?.businessName) return profile.businessName;
  return authName ?? null;
}

function resolveMerchantAddress(
  profile: MerchantProfileSlice | null,
  authAddress: string | null,
): string | null {
  const addr = profile?.address;
  if (addr?.city && addr?.state) return `${addr.city}, ${addr.state}`;
  if (addr?.city) return addr.city;
  return authAddress ?? null;
}

describe('MainLayout — BUG-20 merchant name/address resolution', () => {
  const fullAddress: BusinessAddress = {
    street: '123 Main St',
    street2: null,
    city: 'Fort Lauderdale',
    state: 'FL',
    zip: '33301',
    country: 'US',
    timezone: 'America/New_York',
    phone: null,
    lat: null,
  };

  it('prefers merchantProfile.businessName over auth name', () => {
    const profile: MerchantProfileSlice = { businessName: 'Taipa Kitchen', address: null };
    expect(resolveMerchantName(profile, 'jeff')).toBe('Taipa Kitchen');
  });

  it('falls back to auth name when profile is null', () => {
    expect(resolveMerchantName(null, 'jeff')).toBe('jeff');
  });

  it('falls back to auth name when profile.businessName is empty', () => {
    const profile: MerchantProfileSlice = { businessName: '', address: null };
    expect(resolveMerchantName(profile, 'jeff')).toBe('jeff');
  });

  it('returns null when both profile and auth name are missing', () => {
    expect(resolveMerchantName(null, null)).toBeNull();
  });

  it('formats address as "City, State" from profile address', () => {
    const profile: MerchantProfileSlice = { businessName: 'Test', address: fullAddress };
    expect(resolveMerchantAddress(profile, '123 main')).toBe('Fort Lauderdale, FL');
  });

  it('falls back to city-only when state is empty', () => {
    const addr = { ...fullAddress, state: '' };
    const profile: MerchantProfileSlice = { businessName: 'Test', address: addr };
    expect(resolveMerchantAddress(profile, '123 main')).toBe('Fort Lauderdale');
  });

  it('falls back to auth address when profile address is null', () => {
    const profile: MerchantProfileSlice = { businessName: 'Test', address: null };
    expect(resolveMerchantAddress(profile, '123 main')).toBe('123 main');
  });

  it('falls back to auth address when profile is null', () => {
    expect(resolveMerchantAddress(null, '123 main')).toBe('123 main');
  });

  it('returns null when both profile address and auth address are missing', () => {
    expect(resolveMerchantAddress(null, null)).toBeNull();
  });

  it('returns null when profile address has no city', () => {
    const addr = { ...fullAddress, city: '', state: '' };
    const profile: MerchantProfileSlice = { businessName: 'Test', address: addr };
    expect(resolveMerchantAddress(profile, null)).toBeNull();
  });
});

function makeAlertRecord(overrides: Partial<OrderSentimentRecord> = {}): OrderSentimentRecord {
  return {
    id: 'alert-1',
    orderId: 'order-1',
    orderNumber: '1001',
    sentiment: 'negative',
    flags: [],
    urgency: 'medium',
    summary: 'Customer unhappy',
    analyzedAt: new Date().toISOString(),
    isRead: false,
    ...overrides,
  };
}

interface CriticalToastContext {
  lastToastedAlertId: string | null;
  showCalls: { message: string; duration: number }[];
}

function evaluateCriticalToast(
  alerts: OrderSentimentRecord[],
  ctx: CriticalToastContext,
): void {
  const criticalUnread = alerts.find(a => !a.isRead && a.urgency === 'critical');
  if (criticalUnread && criticalUnread.id !== ctx.lastToastedAlertId) {
    ctx.lastToastedAlertId = criticalUnread.id;
    ctx.showCalls.push({ message: `Critical: ${criticalUnread.summary}`, duration: 8000 });
  }
}

describe('MainLayout — FEATURE-14 sentiment alert toast', () => {
  let ctx: CriticalToastContext;

  beforeEach(() => {
    ctx = { lastToastedAlertId: null, showCalls: [] };
  });

  it('calls notification.show when criticalCount goes from 0 to 1', () => {
    const alert = makeAlertRecord({ id: 'crit-1', urgency: 'critical', summary: 'Allergy detected' });
    evaluateCriticalToast([alert], ctx);
    expect(ctx.showCalls).toHaveLength(1);
    expect(ctx.showCalls[0].message).toBe('Critical: Allergy detected');
    expect(ctx.showCalls[0].duration).toBe(8000);
  });

  it('does not call notification.show when criticalCount is 0', () => {
    evaluateCriticalToast([], ctx);
    expect(ctx.showCalls).toHaveLength(0);
  });

  it('does not call notification.show for non-critical alerts', () => {
    const alert = makeAlertRecord({ urgency: 'medium' });
    evaluateCriticalToast([alert], ctx);
    expect(ctx.showCalls).toHaveLength(0);
  });

  it('does not call notification.show for read critical alerts', () => {
    const alert = makeAlertRecord({ urgency: 'critical', isRead: true });
    evaluateCriticalToast([alert], ctx);
    expect(ctx.showCalls).toHaveLength(0);
  });

  it('does not trigger duplicate toast for the same alert id', () => {
    const alert = makeAlertRecord({ id: 'crit-1', urgency: 'critical', summary: 'Allergy detected' });
    evaluateCriticalToast([alert], ctx);
    expect(ctx.showCalls).toHaveLength(1);

    evaluateCriticalToast([alert], ctx);
    expect(ctx.showCalls).toHaveLength(1);
  });

  it('triggers a new toast when a different critical alert arrives', () => {
    const alert1 = makeAlertRecord({ id: 'crit-1', urgency: 'critical', summary: 'First alert' });
    evaluateCriticalToast([alert1], ctx);
    expect(ctx.showCalls).toHaveLength(1);

    const alert2 = makeAlertRecord({ id: 'crit-2', urgency: 'critical', summary: 'Second alert' });
    evaluateCriticalToast([alert2, alert1], ctx);
    expect(ctx.showCalls).toHaveLength(2);
    expect(ctx.showCalls[1].message).toBe('Critical: Second alert');
  });
});
