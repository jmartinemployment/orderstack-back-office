import { Component, ChangeDetectionStrategy, signal, inject, computed, effect, untracked } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth';
import { PlatformService } from '../services/platform';
import { InventoryService } from '../services/inventory';
import { StaffManagementService } from '../services/staff-management';
import { MenuService } from '../services/menu';
import { TableService } from '../services/table';
import { OrderService } from '../services/order';
import { CateringService } from '../services/catering.service';
import { SessionTimeoutService } from '../services/session-timeout';
import { NotificationService } from '../services/notification';
import { SentimentAlertService } from '../services/sentiment-alert';
import { Sidebar, type AlertSeverity, type NavItem } from '../shared/sidebar/sidebar';
import type { ModeFeatureFlags } from '../models/index';

@Component({
  selector: 'os-main-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  readonly auth = inject(AuthService);
  private readonly platform = inject(PlatformService);
  private readonly inventoryService = inject(InventoryService);
  private readonly staffService = inject(StaffManagementService);
  private readonly menuService = inject(MenuService);
  private readonly tableService = inject(TableService);
  private readonly orderService = inject(OrderService);
  private readonly cateringService = inject(CateringService);
  readonly sessionTimeout = inject(SessionTimeoutService);
  readonly notification = inject(NotificationService);
  readonly sentimentAlerts = inject(SentimentAlertService);
  private readonly isQuickServiceMode = this.platform.isQuickServiceMode;

  private readonly _lastToastedAlertId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const alerts = this.sentimentAlerts.alerts();
      const criticalUnread = alerts.find(a => !a.isRead && a.urgency === 'critical');
      if (criticalUnread && criticalUnread.id !== untracked(() => this._lastToastedAlertId())) {
        untracked(() => {
          this._lastToastedAlertId.set(criticalUnread.id);
          this.notification.show(`Critical: ${criticalUnread.summary}`, 8000);
        });
      }
    });
  }

  readonly sidebarCollapsed = signal(false);
  readonly mobileMenuOpen = signal(false);

  readonly user = this.auth.user;

  readonly selectedMerchantName = computed(() => {
    const profile = this.platform.merchantProfile();
    if (profile?.businessName) return profile.businessName;
    return this.auth.selectedMerchantName() ?? null;
  });

  readonly selectedMerchantAddress = computed(() => {
    const profile = this.platform.merchantProfile();
    const addr = profile?.address;
    if (addr?.city && addr?.state) return `${addr.city}, ${addr.state}`;
    if (addr?.city) return addr.city;
    return this.auth.selectedMerchantAddress() ?? null;
  });

  readonly userName = computed(() => this.user()?.firstName ?? null);

  private readonly sidebarAlerts = computed<Record<string, AlertSeverity>>(() => {
    const alerts: Record<string, AlertSeverity> = {};

    // Inventory — severity from alert data
    const invAlerts = this.inventoryService.alerts();
    if (invAlerts.length > 0) {
      const hasCritical = invAlerts.some(a => a.severity === 'critical' || a.type === 'out_of_stock');
      alerts['/app/inventory'] = hasCritical ? 'critical' : 'warning';
      alerts['/app/retail/inventory'] = alerts['/app/inventory'];
    }

    // Orders — pending count drives severity
    const pending = this.orderService.pendingOrders().length;
    const ready = this.orderService.readyOrders().length;
    if (pending > 5 || ready > 3) {
      alerts['/app/orders'] = 'critical';
    } else if (pending > 0 || ready > 0) {
      alerts['/app/orders'] = 'warning';
    }

    // POS — active orders
    const active = this.orderService.activeOrderCount();
    if (active > 10) {
      alerts['/pos'] = 'critical';
      alerts['/app/retail/pos'] = 'critical';
    } else if (active > 0) {
      alerts['/pos'] = 'info';
      alerts['/app/retail/pos'] = 'info';
    }

    // Staff — only warn after loadTeamMembers() has completed; avoids false-active
    // orange background on every page while the service hasn't been loaded yet
    const team = this.staffService.teamMembers();
    if (this.staffService.teamMembersLoaded() && team.length === 0) {
      alerts['/app/staff'] = 'warning';
    }

    // Items — empty menu is info-level
    const items = this.menuService.allItems();
    if (items.length === 0) {
      alerts['/app/menu'] = 'info';
      alerts['/app/retail/catalog'] = 'info';
    }

    // Floor Plan — no tables configured
    const tables = this.tableService.tables();
    if (tables.length === 0) {
      alerts['/app/floor-plan'] = 'warning';
    }

    // KDS — pending ticket count
    const kdsTickets = this.orderService.pendingOrders().length;
    if (kdsTickets > 5) {
      alerts['/app/kds'] = 'critical';
    } else if (kdsTickets > 0) {
      alerts['/app/kds'] = 'warning';
    }

    // Sentiment — unread alert count
    const sentimentUnread = this.sentimentAlerts.unreadCount();
    if (sentimentUnread > 0) {
      const hasCritical = this.sentimentAlerts.criticalCount() > 0;
      alerts['/app/sentiment'] = hasCritical ? 'critical' : 'warning';
    }

    return alerts;
  });

  readonly navItems = computed<NavItem[]>(() => {
    const catering = this.platform.isCateringMode();
    const retail = this.platform.isRetailMode();
    const service = this.platform.isServiceMode();
    const restaurant = this.platform.isRestaurantMode();
    const mode = this.platform.currentDeviceMode();
    const flags = this.platform.featureFlags();
    const modules = this.platform.enabledModules();
    const alerts = this.sidebarAlerts();

    let items: NavItem[];
    if (catering) {
      items = this.buildCateringNav();
    } else if (this.isQuickServiceMode()) {
      items = this.buildQuickServiceNav(flags, modules);
    } else {
      items = this.buildDefaultNav(retail, service, restaurant, mode, flags, modules);
    }

    // Apply alert severities from service signals
    for (const item of items) {
      item.alertSeverity = alerts[item.route] ?? null;
    }

    return items;
  });

  private buildCateringNav(): NavItem[] {
    const pendingJobs = this.cateringService.pendingJobsCount();
    const pendingProps = this.cateringService.proposalsAwaitingApproval();
    const dueMilestones = this.cateringService.milestonesComingDue();

    return [
      // Pipeline
      {
        label: 'Dashboard',
        icon: 'bi-speedometer2',
        route: '/app/administration',
        exact: true,
      },
      {
        label: 'Jobs',
        icon: 'bi-briefcase',
        route: '/app/catering',
        badge: pendingJobs > 0 ? pendingJobs : undefined,
        children: [
          { label: 'Leads',       icon: 'bi-funnel',       route: '/app/catering', queryParams: { status: 'inquiry' } },
          { label: 'Active Jobs', icon: 'bi-play-circle',  route: '/app/catering', queryParams: { status: 'active' } },
          { label: 'Completed',   icon: 'bi-check-circle', route: '/app/catering', queryParams: { status: 'completed' } },
          { label: 'All Jobs',    icon: 'bi-list-ul',      route: '/app/catering', queryParams: { status: 'all' } },
        ],
      },
      {
        label: 'Calendar',
        icon: 'bi-calendar-event',
        route: '/app/catering/calendar',
      },
      {
        label: 'Proposals',
        icon: 'bi-file-earmark-text',
        route: '/app/catering/proposals',
        badge: pendingProps > 0 ? pendingProps : undefined,
      },

      // Billing
      {
        label: 'Invoices',
        icon: 'bi-receipt',
        route: '/app/invoicing',
        badge: dueMilestones > 0 ? dueMilestones : undefined,
        dividerBefore: true,
        children: [
          { label: 'All Invoices', icon: 'bi-collection',         route: '/app/invoicing' },
          { label: 'Outstanding',  icon: 'bi-exclamation-circle', route: '/app/invoicing', queryParams: { status: 'outstanding' } },
          { label: 'Milestones',   icon: 'bi-bar-chart-steps',    route: '/app/invoicing/milestones' },
        ],
      },

      // Operations
      {
        label: 'Clients',
        icon: 'bi-person-lines-fill',
        route: '/app/customers',
        dividerBefore: true,
      },
      {
        label: 'Menu',
        icon: 'bi-book',
        route: '/app/menu',
        children: [
          { label: 'Items',        icon: 'bi-list-ul',   route: '/app/menu' },
          { label: 'Beverages',    icon: 'bi-cup-straw', route: '/app/menu/beverages' },
          { label: 'Ingredients',  icon: 'bi-egg-fill',  route: '/app/menu/ingredients' },
          { label: 'Packages',     icon: 'bi-layers',    route: '/app/menu/packages' },
        ],
      },
      {
        label: 'Delivery',
        icon: 'bi-truck',
        route: '/app/catering/delivery',
      },
      {
        label: 'Suppliers',
        icon: 'bi-building',
        route: '/app/suppliers',
      },

      // Business
      {
        label: 'Reports',
        icon: 'bi-bar-chart-line',
        route: '/app/reports',
        dividerBefore: true,
        children: [
          { label: 'Revenue',         icon: 'bi-currency-dollar',  route: '/app/reports/revenue' },
          { label: 'Deferred',        icon: 'bi-clock-history',    route: '/app/reports/deferred' },
          { label: 'Job Performance', icon: 'bi-bar-chart',        route: '/app/reports/catering' },
          { label: 'Production',      icon: 'bi-clipboard-check',  route: '/app/catering/production' },
        ],
      },
      {
        label: 'Staff',
        icon: 'bi-person-badge',
        route: '/app/staff',
        children: [
          { label: 'Team',       icon: 'bi-people',        route: '/app/staff' },
          { label: 'Scheduling', icon: 'bi-calendar-week', route: '/app/staff/scheduling' },
        ],
      },
      {
        label: 'Marketing',
        icon: 'bi-megaphone',
        route: '/app/marketing',
      },
      {
        label: 'Sentiment',
        icon: 'bi-emoji-neutral',
        route: '/app/sentiment',
        badge: this.sentimentAlerts.unreadCount() > 0 ? this.sentimentAlerts.unreadCount() : undefined,
      },

      // Config
      {
        label: 'Settings',
        icon: 'bi-gear',
        route: '/app/settings',
        dividerBefore: true,
        children: [
          { label: 'Business Info',    icon: 'bi-building',    route: '/app/settings/business' },
          { label: 'Invoice Branding', icon: 'bi-palette',     route: '/app/settings/branding' },
          { label: 'Payment Setup',    icon: 'bi-credit-card', route: '/app/settings/payments' },
          { label: 'AI Settings',      icon: 'bi-robot',       route: '/app/settings/ai' },
          { label: 'Notifications',    icon: 'bi-bell',        route: '/app/settings/notifications' },
        ],
      },
    ];
  }

  private buildQuickServiceNav(flags: ModeFeatureFlags, modules: readonly string[]): NavItem[] {
    const activeOrderCount = this.orderService.activeOrderCount();
    const kdsCount = this.orderService.pendingOrders().length;

    const items: NavItem[] = [
      // Operations
      { label: 'Administration', icon: 'bi-speedometer2', route: '/app/administration', exact: true },
      {
        label: 'Orders', icon: 'bi-receipt', route: '/app/orders',
        badge: activeOrderCount > 0 ? activeOrderCount : undefined,
        children: [
          { label: 'Open', icon: 'bi-circle', route: '/app/orders', queryParams: { status: 'open' } },
          { label: 'In Progress', icon: 'bi-arrow-repeat', route: '/app/orders', queryParams: { status: 'in_progress' } },
          { label: 'Ready', icon: 'bi-check-circle', route: '/app/orders', queryParams: { status: 'ready' } },
          { label: 'Order History', icon: 'bi-clock-history', route: '/app/orders/history' },
        ],
      },
      { label: 'POS', icon: 'bi-tv', route: '/quick-service' },
    ];

    if (flags['enableKds']) {
      items.push({
        label: 'Kitchen (KDS)', icon: 'bi-display', route: '/app/kds',
        badge: kdsCount > 0 ? kdsCount : undefined,
      });
    }

    if (hasModule(modules, 'online_ordering')) {
      items.push({ label: 'Online Orders', icon: 'bi-globe', route: '/app/online-ordering' });
    }

    // Menu & Promotions
    items.push(
      {
        label: 'Items', icon: 'bi-book', route: '/app/menu', dividerBefore: true,
        children: [
          { label: 'Categories', icon: 'bi-grid', route: '/app/menu/categories' },
          { label: 'Modifiers', icon: 'bi-sliders', route: '/app/menu/modifiers' },
          { label: 'Combos', icon: 'bi-layers', route: '/app/menu/combos' },
          { label: 'Beverages', icon: 'bi-cup-straw', route: '/app/menu/beverages' },
          { label: 'Ingredients', icon: 'bi-egg-fill', route: '/app/menu/ingredients' },
        ],
      },
      { label: 'Discounts', icon: 'bi-tag', route: '/app/discounts' },
      { label: 'Gift Cards', icon: 'bi-gift', route: '/app/gift-cards' },
      { label: 'Customers', icon: 'bi-people', route: '/app/customers', dividerBefore: true },
    );
    if (hasModule(modules, 'loyalty')) {
      items.push({ label: 'Loyalty', icon: 'bi-star', route: '/app/loyalty' });
    }

    // Business
    items.push(
      {
        label: 'Reports', icon: 'bi-bar-chart-line', route: '/app/reports', dividerBefore: true,
        children: [
          { label: 'Sales Summary', icon: 'bi-graph-up', route: '/app/reports/sales' },
          { label: 'Hourly Sales', icon: 'bi-clock', route: '/app/reports/hourly' },
          { label: 'Item Velocity', icon: 'bi-speedometer', route: '/app/reports/items' },
          { label: 'Labor Cost', icon: 'bi-person-workspace', route: '/app/reports/labor' },
        ],
      },
      {
        label: 'Staff', icon: 'bi-person-badge', route: '/app/staff',
        children: [
          { label: 'Team', icon: 'bi-people', route: '/app/staff' },
          { label: 'Scheduling', icon: 'bi-calendar-week', route: '/app/staff/scheduling' },
          { label: 'Time Clock', icon: 'bi-stopwatch', route: '/app/staff/time-clock' },
        ],
      },
    );
    if (hasModule(modules, 'inventory')) {
      items.push(
        { label: 'Inventory', icon: 'bi-box-seam', route: '/app/inventory' },
        { label: 'Suppliers', icon: 'bi-truck', route: '/app/suppliers' },
      );
    }
    // Config
    const sentimentBadge = this.sentimentAlerts.unreadCount();
    items.push(
      { label: 'Marketing', icon: 'bi-megaphone', route: '/app/marketing' },
      {
        label: 'Sentiment', icon: 'bi-emoji-neutral', route: '/app/sentiment',
        badge: sentimentBadge > 0 ? sentimentBadge : undefined,
      },
      {
        label: 'Settings', icon: 'bi-gear', route: '/app/settings', dividerBefore: true,
        children: [
          { label: 'Hardware', icon: 'bi-printer', route: '/app/settings/hardware' },
          { label: 'Payments', icon: 'bi-credit-card', route: '/app/settings/payments' },
          { label: 'Tax & Fees', icon: 'bi-percent', route: '/app/settings/tax' },
          { label: 'Notifications', icon: 'bi-bell', route: '/app/settings/notifications' },
          { label: 'Integrations', icon: 'bi-plug', route: '/app/settings/integrations' },
        ],
      },
    );

    return items;
  }

  private buildDefaultNav(
    retail: boolean,
    service: boolean,
    restaurant: boolean,
    mode: string,
    flags: ModeFeatureFlags,
    modules: readonly string[],
  ): NavItem[] {
    const items: NavItem[] = [
      { label: 'Administration', icon: 'bi-speedometer2', route: '/app/administration' },
    ];

    this.addCoreNavItems(items, retail, service, modules);
    this.addOnlineAndCustomerItems(items, retail, service, restaurant, modules);
    this.addModeSpecificItems(items, retail, service, mode, flags, modules);

    items.push({ label: 'Settings', icon: 'bi-gear', route: '/app/settings' });

    return items;
  }

  /** Adds orders, POS, items, and inventory nav items based on business mode. */
  private addCoreNavItems(
    items: NavItem[],
    retail: boolean,
    service: boolean,
    modules: readonly string[],
  ): void {
    if (!service) {
      items.push({ label: 'Orders', icon: 'bi-receipt', route: '/app/orders' });
    }

    if (retail) {
      items.push({ label: 'POS', icon: 'bi-upc-scan', route: '/app/retail/pos' });
    } else if (!service) {
      items.push({ label: 'POS', icon: 'bi-tv', route: '/pos' });
    }

    if (retail) {
      items.push({ label: 'Items', icon: 'bi-grid-3x3-gap', route: '/app/retail/catalog' });
    } else if (service) {
      items.push({ label: 'Items & Services', icon: 'bi-grid-3x3-gap', route: '/app/menu' });
    } else if (hasModule(modules, 'menu_management')) {
      items.push({
        label: 'Items', icon: 'bi-book', route: '/app/menu',
        children: [
          { label: 'Beverages', icon: 'bi-cup-straw', route: '/app/menu/beverages' },
          { label: 'Ingredients', icon: 'bi-egg-fill', route: '/app/menu/ingredients' },
        ],
      });
    }
  }

  /** Adds online ordering, customers, reports, staff, inventory, and suppliers. */
  private addOnlineAndCustomerItems(
    items: NavItem[],
    retail: boolean,
    service: boolean,
    restaurant: boolean,
    modules: readonly string[],
  ): void {
    if (retail) {
      items.push({ label: 'Online Store', icon: 'bi-globe', route: '/app/retail/ecommerce' });
    } else if (restaurant && hasModule(modules, 'online_ordering')) {
      items.push({ label: 'Online', icon: 'bi-globe', route: '/app/online-ordering' });
    }

    const sentimentBadge = this.sentimentAlerts.unreadCount();
    items.push(
      { label: 'Customers', icon: 'bi-people', route: '/app/customers' },
      {
        label: 'Sentiment', icon: 'bi-emoji-neutral', route: '/app/sentiment',
        badge: sentimentBadge > 0 ? sentimentBadge : undefined,
      },
      { label: 'Reports', icon: 'bi-bar-chart-line', route: '/app/reports' },
      {
        label: 'Staff',
        icon: 'bi-person-badge',
        route: '/app/staff',
        children: [
          { label: 'Scheduling', icon: 'bi-calendar-week', route: '/app/staff/scheduling' },
        ],
      },
    );

    if (retail) {
      items.push({ label: 'Inventory', icon: 'bi-box-seam', route: '/app/retail/inventory' });
    } else if (hasModule(modules, 'inventory')) {
      items.push({ label: 'Inventory', icon: 'bi-box-seam', route: '/app/inventory' });
    }

    if (!retail && !service && hasModule(modules, 'inventory')) {
      items.push({ label: 'Suppliers', icon: 'bi-truck', route: '/app/suppliers' });
    }
  }

  /** Adds floor plan, bookings, vendors, fulfillment, and invoicing for specific modes. */
  private addModeSpecificItems(
    items: NavItem[],
    retail: boolean,
    service: boolean,
    mode: string,
    flags: ModeFeatureFlags,
    modules: readonly string[],
  ): void {
    if (mode === 'full_service' || mode === 'bar') {
      if (flags['enableFloorPlan']) {
        items.push({ label: 'Floor Plan', icon: 'bi-columns-gap', route: '/app/floor-plan' });
      }
      if (hasModule(modules, 'bookings')) {
        items.push({ label: 'Bookings', icon: 'bi-calendar-event', route: '/app/bookings' });
      }
    }


    if (retail) {
      items.push(
        { label: 'Vendors', icon: 'bi-truck', route: '/app/retail/vendors' },
        { label: 'Fulfillment', icon: 'bi-box2', route: '/app/retail/fulfillment' },
      );
    }

    if (mode === 'bookings') {
      items.push({ label: 'Bookings', icon: 'bi-calendar-check', route: '/app/bookings' });
    }

    if (mode === 'services' && hasModule(modules, 'invoicing')) {
      items.push({ label: 'Invoices', icon: 'bi-file-earmark-text', route: '/app/invoicing' });
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  private readonly router = inject(Router);

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}

function hasModule(modules: readonly string[], mod: string): boolean {
  return modules.includes(mod);
}
