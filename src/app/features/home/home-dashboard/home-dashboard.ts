import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { PlatformService } from '../../../services/platform';
import { AnalyticsService } from '../../../services/analytics';
import { MenuService } from '../../../services/menu';
import { PwaInstallService } from '../../../services/pwa-install';
import { CateringService } from '../../../services/catering.service';
import { OrderService } from '../../../services/order';
import { TableService } from '../../../services/table';

interface SetupTask {
  id: string;
  label: string;
  description: string;
  icon: string;
  route: string;
  queryParams?: Record<string, string>;
  done: boolean;
  category: 'essential' | 'advanced';
}

interface QuickAction {
  label: string;
  icon: string;
  route: string;
  color: string;
}

interface KpiCard {
  label: string;
  value: number;
  format: 'currency' | 'number';
  changePercent?: number;
}

interface AtAGlanceChip {
  label: string;
  value: number | string;
  icon: string;
  route?: string;
}

type DevicePosMode = 'quick_service' | 'full_service' | 'bar' | 'catering' | 'retail' | 'services';

@Component({
  selector: 'os-home-dashboard',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './home-dashboard.html',
  styleUrl: './home-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeDashboard implements OnInit {
  private readonly router = inject(Router);
  private readonly platform = inject(PlatformService);
  private readonly analytics = inject(AnalyticsService);
  private readonly menuService = inject(MenuService);
  private readonly cateringService = inject(CateringService);
  private readonly orderService = inject(OrderService);
  private readonly tableService = inject(TableService);
  readonly pwaInstall = inject(PwaInstallService);

  readonly businessName = computed(() => this.platform.merchantProfile()?.businessName ?? 'Your Business');
  readonly todayDate = signal(new Date());
  readonly currentMode = computed(() => this.platform.currentDeviceMode());

  readonly pageTitle = computed<string>(() => {
    const titles: Record<string, string> = {
      quick_service: 'Dashboard',
      full_service: 'Dashboard',
      bar: 'Bar Manager',
      catering: 'Catering Admin',
      retail: 'Store Manager',
      services: 'Services Manager',
    };
    return titles[this.currentMode()] ?? 'Dashboard';
  });

  readonly performanceSectionTitle = computed<string>(() => {
    const headings: Record<string, string> = {
      quick_service: "Today's Performance",
      full_service: "Today's Performance",
      bar: "Today's Performance",
      catering: 'Pipeline Overview',
      retail: 'Store Performance',
      services: 'Business Overview',
    };
    return headings[this.currentMode()] ?? "Today's Performance";
  });

  private readonly atAGlanceBuilders: Record<string, () => AtAGlanceChip[]> = {
    catering: () => [
      { label: 'Pending Inquiries',   value: this.cateringService.pendingJobsCount(),           icon: 'bi-inbox',         route: '/app/catering' },
      { label: 'Awaiting Approval',   value: this.cateringService.proposalsAwaitingApproval(),  icon: 'bi-hourglass-split', route: '/app/catering' },
      { label: 'Milestones Due',      value: this.cateringService.milestonesComingDue(),         icon: 'bi-calendar-check', route: '/app/catering' },
    ],
    quick_service: () => [
      { label: 'Active Orders', value: this.orderService.activeOrderCount(),    icon: 'bi-receipt',    route: '/app/orders' },
      { label: 'Avg. Ticket',   value: this.formatCurrency(this.todayAvgTicket()), icon: 'bi-cash-stack' },
      { label: 'Menu Items',    value: this.menuService.categories().reduce((n, c) => n + (c.items?.length ?? 0), 0), icon: 'bi-book', route: '/app/menu' },
    ],
    full_service: () => [
      { label: 'Active Orders',     value: this.orderService.activeOrderCount(),                                                                         icon: 'bi-receipt',      route: '/app/orders' },
      { label: 'Tables Occupied',   value: this.tableService.tables().filter(t => t.status === 'occupied' || t.status === 'closing').length,             icon: 'bi-columns-gap',  route: '/app/floor-plan' },
      { label: 'Tables Available',  value: this.tableService.tables().filter(t => t.status === 'available').length,                                      icon: 'bi-check-circle', route: '/app/floor-plan' },
    ],
    bar: () => [
      { label: 'Open Tabs',     value: this.orderService.activeOrderCount(),    icon: 'bi-cup-straw',  route: '/app/orders' },
      { label: 'Active Orders', value: this.orderService.activeOrderCount(),    icon: 'bi-receipt',    route: '/app/orders' },
      { label: 'Avg. Ticket',   value: this.formatCurrency(this.todayAvgTicket()), icon: 'bi-cash-stack' },
    ],
    retail: () => [
      { label: 'Active Orders', value: this.orderService.activeOrderCount(),    icon: 'bi-receipt',    route: '/app/orders' },
      { label: 'Avg. Ticket',   value: this.formatCurrency(this.todayAvgTicket()), icon: 'bi-cash-stack' },
      { label: 'Menu Items',    value: this.menuService.categories().reduce((n, c) => n + (c.items?.length ?? 0), 0), icon: 'bi-book', route: '/app/retail/catalog' },
    ],
    services: () => [
      { label: 'Active Orders', value: this.orderService.activeOrderCount(),    icon: 'bi-receipt',    route: '/app/orders' },
      { label: 'Avg. Ticket',   value: this.formatCurrency(this.todayAvgTicket()), icon: 'bi-cash-stack' },
      { label: 'Menu Items',    value: this.menuService.categories().reduce((n, c) => n + (c.items?.length ?? 0), 0), icon: 'bi-book', route: '/app/menu' },
    ],
  };

  readonly atAGlance = computed<AtAGlanceChip[]>(() => {
    const builder = this.atAGlanceBuilders[this.currentMode()];
    return builder ? builder() : [];
  });

  readonly _todayNetSales = signal(0);
  readonly _todayOrderCount = signal(0);
  readonly _yesterdayNetSales = signal(0);
  readonly _yesterdayOrderCount = signal(0);

  readonly todayAvgTicket = computed(() => {
    const orders = this._todayOrderCount();
    const sales = this._todayNetSales();
    return orders > 0 ? sales / orders : 0;
  });

  readonly salesChangePercent = computed(() => {
    const yesterday = this._yesterdayNetSales();
    const today = this._todayNetSales();
    if (yesterday === 0) return 0;
    return ((today - yesterday) / yesterday) * 100;
  });

  readonly ordersChangePercent = computed(() => {
    const yesterday = this._yesterdayOrderCount();
    const today = this._todayOrderCount();
    if (yesterday === 0) return 0;
    return ((today - yesterday) / yesterday) * 100;
  });

  readonly _completedTasks = signal<Set<string>>(new Set());
  readonly _showAdvancedTasks = signal(false);
  readonly _menuHasCategories = signal(false);

  // --- Setup Subtitle ---

  readonly setupSubtitle = computed(() => {
    const subtitles: Record<string, string> = {
      quick_service: 'Complete these steps to start taking orders.',
      full_service: 'Complete these steps to start serving guests.',
      bar: 'Complete these steps to start serving drinks.',
      catering: 'Complete these steps to start booking events.',
      retail: 'Complete these steps to start selling.',
      services: 'Complete these steps to start booking clients.',
    };
    return subtitles[this.currentMode()] ?? 'Complete these steps to start taking payments.';
  });

  // --- Setup Tasks (builder map) ---

  private readonly setupTaskBuilders: Record<string, () => SetupTask[]> = {
    quick_service: () => this.buildQuickServiceTasks(),
    full_service: () => this.buildFullServiceTasks(),
    bar: () => this.buildBarTasks(),
    catering: () => this.buildCateringTasks(),
    retail: () => this.buildRetailTasks(),
    services: () => this.buildServiceTasks(),
  };

  readonly setupTasks = computed<SetupTask[]>(() => {
    const mode = this.currentMode();
    const builder = this.setupTaskBuilders[mode];
    return builder ? builder() : this.buildQuickServiceTasks();
  });

  readonly essentialTasks = computed(() =>
    this.setupTasks().filter(t => t.category === 'essential' && !t.done)
  );

  readonly advancedTasks = computed(() =>
    this.setupTasks().filter(t => t.category === 'advanced' && !t.done)
  );

  readonly essentialProgress = computed(() => {
    const tasks = this.setupTasks().filter(t => t.category === 'essential');
    const done = tasks.filter(t => t.done).length;
    return tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 100;
  });

  readonly isEssentialComplete = computed(() => this.essentialProgress() === 100);

  // --- Quick Actions (builder map) ---

  private readonly quickActionBuilders: Record<string, () => QuickAction[]> = {
    quick_service: () => [
      { label: 'Take order', icon: 'bi-lightning', route: '/pos', color: 'blue' },
      { label: 'View orders', icon: 'bi-receipt', route: '/orders', color: 'green' },
      { label: 'Add item', icon: 'bi-plus-circle', route: '/menu', color: 'purple' },
      { label: 'View reports', icon: 'bi-graph-up', route: '/reports', color: 'amber' },
    ],
    full_service: () => [
      { label: 'Open POS', icon: 'bi-tv', route: '/pos', color: 'blue' },
      { label: 'View orders', icon: 'bi-receipt', route: '/orders', color: 'green' },
      { label: 'Floor plan', icon: 'bi-columns-gap', route: '/floor-plan', color: 'purple' },
      { label: 'View reports', icon: 'bi-graph-up', route: '/reports', color: 'amber' },
    ],
    bar: () => [
      { label: 'Open tabs', icon: 'bi-cup-straw', route: '/pos', color: 'blue' },
      { label: 'View orders', icon: 'bi-receipt', route: '/orders', color: 'green' },
      { label: 'Add item', icon: 'bi-plus-circle', route: '/menu', color: 'purple' },
      { label: 'View reports', icon: 'bi-graph-up', route: '/reports', color: 'amber' },
    ],
    catering: () => [
      { label: 'New job', icon: 'bi-plus-circle', route: '/app/catering', color: 'blue' },
      { label: 'Create invoice', icon: 'bi-file-earmark-text', route: '/invoicing', color: 'green' },
      { label: 'View calendar', icon: 'bi-calendar-event', route: '/app/catering/calendar', color: 'purple' },
      { label: 'View reports', icon: 'bi-graph-up', route: '/reports', color: 'amber' },
    ],
    retail: () => [
      { label: 'Scan item', icon: 'bi-upc-scan', route: '/retail/pos', color: 'blue' },
      { label: 'View orders', icon: 'bi-receipt', route: '/orders', color: 'green' },
      { label: 'Add product', icon: 'bi-plus-circle', route: '/retail/catalog', color: 'purple' },
      { label: 'View reports', icon: 'bi-graph-up', route: '/reports', color: 'amber' },
    ],
    services: () => [
      { label: 'New invoice', icon: 'bi-file-earmark-text', route: '/invoicing', color: 'blue' },
      { label: 'Bookings', icon: 'bi-calendar-check', route: '/bookings', color: 'green' },
      { label: 'Add service', icon: 'bi-plus-circle', route: '/menu', color: 'purple' },
      { label: 'View reports', icon: 'bi-graph-up', route: '/reports', color: 'amber' },
    ],
  };

  readonly quickActions = computed<QuickAction[]>(() => {
    const mode = this.currentMode();
    const builder = this.quickActionBuilders[mode];
    return builder ? builder() : this.quickActionBuilders['quick_service']();
  });

  // --- KPI Cards ---

  readonly kpiConfig = computed<KpiCard[]>(() => {
    const mode = this.currentMode();

    if (mode === 'catering') {
      return [
        { label: 'Pipeline Value', value: this.cateringService.totalPipeline() / 100, format: 'currency' },
        { label: 'Outstanding', value: this.cateringService.outstandingBalance() / 100, format: 'currency' },
        { label: 'Jobs This Month', value: this.cateringService.eventsThisMonth(), format: 'number' },
      ];
    }

    const sales = this._todayNetSales();
    const orders = this._todayOrderCount();
    const avgTicket = this.todayAvgTicket();

    if (mode === 'bar') {
      return [
        { label: 'Net Sales', value: sales, format: 'currency', changePercent: this.salesChangePercent() },
        { label: 'Open Tabs', value: this.orderService.activeOrderCount(), format: 'number' },
        { label: 'Avg. Ticket', value: avgTicket, format: 'currency' },
      ];
    }

    return [
      { label: 'Net Sales', value: sales, format: 'currency', changePercent: this.salesChangePercent() },
      { label: 'Orders', value: orders, format: 'number', changePercent: this.ordersChangePercent() },
      { label: 'Avg. Ticket', value: avgTicket, format: 'currency' },
    ];
  });

  ngOnInit(): void {
    this.loadTodayStats();
    this.loadCompletedTasks();
    this.checkMenuSeeded();
  }

  private async loadTodayStats(): Promise<void> {
    try {
      const stats = await this.analytics.getTodaySalesStats();
      if (stats) {
        this._todayNetSales.set(stats.netSales ?? 0);
        this._todayOrderCount.set(stats.orderCount ?? 0);
        this._yesterdayNetSales.set(stats.priorDayNetSales ?? 0);
        this._yesterdayOrderCount.set(stats.priorDayOrderCount ?? 0);
      }
    } catch {
      // Stats will show zeros — acceptable for first load
    }
  }

  private async checkMenuSeeded(): Promise<void> {
    try {
      await this.menuService.loadMenu();
      const categories = this.menuService.categories();
      if (categories.length > 0) {
        this._menuHasCategories.set(true);
      }
    } catch {
      // If menu fetch fails, leave as false — task stays undone
    }
  }

  private loadCompletedTasks(): void {
    const raw = localStorage.getItem('os-setup-tasks');
    if (raw) {
      try {
        const arr = JSON.parse(raw) as string[];
        this._completedTasks.set(new Set(arr));
      } catch {
        // Ignore invalid data
      }
    }
  }

  private saveCompletedTasks(): void {
    const arr = [...this._completedTasks()];
    localStorage.setItem('os-setup-tasks', JSON.stringify(arr));
  }

  markTaskDone(taskId: string): void {
    this._completedTasks.update(set => {
      const next = new Set(set);
      next.add(taskId);
      return next;
    });
    this.saveCompletedTasks();
  }

  toggleAdvancedTasks(): void {
    this._showAdvancedTasks.update(v => !v);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  navigateAndMark(task: SetupTask): void {
    if (!task.done) {
      this.markTaskDone(task.id);
    }
    this.router.navigate([task.route], task.queryParams ? { queryParams: task.queryParams } : {});
  }

  dismissInstallBanner(): void {
    this.pwaInstall.dismissInstall();
  }

  async installApp(): Promise<void> {
    await this.pwaInstall.promptInstall();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  // --- Per-Mode Task Builders ---

  private buildQuickServiceTasks(): SetupTask[] {
    const done = this._completedTasks();
    const menuSeeded = this._menuHasCategories();
    return [
      { id: 'items', label: menuSeeded ? 'Review your menu' : 'Create your first menu items', description: menuSeeded ? 'Review menu categories and items' : 'Add items, categories, and modifiers', icon: 'bi-book', route: '/app/menu', done: done.has('items'), category: 'essential' },
      { id: 'taxes', label: 'Set up taxes', description: 'Configure tax rates for your location', icon: 'bi-percent', route: '/app/settings', done: done.has('taxes'), category: 'essential' },
      { id: 'team', label: 'Add team members', description: 'Invite staff and set permissions', icon: 'bi-people', route: '/app/settings', done: done.has('team'), category: 'essential' },
      { id: 'hours', label: 'Set your business hours', description: 'Configure your regular operating hours', icon: 'bi-clock', route: '/app/settings', done: true, category: 'essential' },
      { id: 'kds', label: 'Set up kitchen display', description: 'Route orders to prep stations in real time', icon: 'bi-display', route: '/app/settings', done: done.has('kds'), category: 'advanced' },
      { id: 'online', label: 'Turn on online ordering', description: 'Accept orders from your website', icon: 'bi-globe', route: '/app/online-ordering', done: done.has('online'), category: 'advanced' },
      { id: 'hardware', label: 'Set up hardware', description: 'Tablets, card readers, printers, and more', icon: 'bi-cpu', route: '/app/hardware-guide', done: done.has('hardware'), category: 'advanced' },
      { id: 'pin', label: 'Set owner PIN', description: 'Security PIN for POS access and clock-in', icon: 'bi-shield-lock', route: '/app/settings', done: done.has('pin'), category: 'advanced' },
    ];
  }

  private buildFullServiceTasks(): SetupTask[] {
    const done = this._completedTasks();
    const menuSeeded = this._menuHasCategories();
    return [
      { id: 'items', label: menuSeeded ? 'Review your menu' : 'Create your first menu items', description: menuSeeded ? 'Review menu categories and items' : 'Add items, categories, and modifiers', icon: 'bi-book', route: '/app/menu', done: done.has('items'), category: 'essential' },
      { id: 'taxes', label: 'Set up taxes', description: 'Configure tax rates for your location', icon: 'bi-percent', route: '/app/settings', done: done.has('taxes'), category: 'essential' },
      { id: 'floor', label: 'Set up your floor plan', description: 'Design your dining room layout with tables', icon: 'bi-columns-gap', route: '/app/floor-plan', done: done.has('floor'), category: 'essential' },
      { id: 'team', label: 'Add team members', description: 'Invite servers, hosts, and kitchen staff', icon: 'bi-people', route: '/app/settings', done: done.has('team'), category: 'essential' },
      { id: 'hours', label: 'Set your business hours', description: 'Configure your regular operating hours', icon: 'bi-clock', route: '/app/settings', done: true, category: 'essential' },
      { id: 'kds', label: 'Set up kitchen display', description: 'Route orders to prep and expo stations', icon: 'bi-display', route: '/app/settings', done: done.has('kds'), category: 'advanced' },
      { id: 'bookings', label: 'Turn on reservations', description: 'Let guests book tables online', icon: 'bi-calendar-event', route: '/app/bookings', done: done.has('bookings'), category: 'advanced' },
      { id: 'online', label: 'Turn on online ordering', description: 'Accept takeout orders from your website', icon: 'bi-globe', route: '/app/online-ordering', done: done.has('online'), category: 'advanced' },
      { id: 'hardware', label: 'Set up hardware', description: 'Tablets, card readers, printers, and more', icon: 'bi-cpu', route: '/app/hardware-guide', done: done.has('hardware'), category: 'advanced' },
      { id: 'pin', label: 'Set owner PIN', description: 'Security PIN for POS access and clock-in', icon: 'bi-shield-lock', route: '/app/settings', done: done.has('pin'), category: 'advanced' },
    ];
  }

  private buildBarTasks(): SetupTask[] {
    const done = this._completedTasks();
    const menuSeeded = this._menuHasCategories();
    return [
      { id: 'items', label: menuSeeded ? 'Review your drink menu' : 'Build your drink menu', description: menuSeeded ? 'Review your cocktails, beers, wines, and food' : 'Add cocktails, beers, wines, and food items', icon: 'bi-cup-straw', route: '/app/menu', done: done.has('items'), category: 'essential' },
      { id: 'taxes', label: 'Set up taxes', description: 'Configure tax rates for your location', icon: 'bi-percent', route: '/app/settings', done: done.has('taxes'), category: 'essential' },
      { id: 'team', label: 'Add team members', description: 'Invite bartenders and staff', icon: 'bi-people', route: '/app/settings', done: done.has('team'), category: 'essential' },
      { id: 'hours', label: 'Set your business hours', description: 'Configure your regular operating hours', icon: 'bi-clock', route: '/app/settings', done: true, category: 'essential' },
      { id: 'kds', label: 'Set up kitchen display', description: 'Route food orders to your kitchen', icon: 'bi-display', route: '/app/settings', done: done.has('kds'), category: 'advanced' },
      { id: 'tabs', label: 'Configure tab pre-auth', description: 'Hold a card on file to open tabs automatically', icon: 'bi-credit-card', route: '/app/settings', done: done.has('tabs'), category: 'advanced' },
      { id: 'hardware', label: 'Set up hardware', description: 'Tablets, card readers, printers, and more', icon: 'bi-cpu', route: '/app/hardware-guide', done: done.has('hardware'), category: 'advanced' },
      { id: 'pin', label: 'Set owner PIN', description: 'Security PIN for POS access and clock-in', icon: 'bi-shield-lock', route: '/app/settings', done: done.has('pin'), category: 'advanced' },
    ];
  }

  private buildCateringTasks(): SetupTask[] {
    const done = this._completedTasks();
    const menuSeeded = this._menuHasCategories();
    return [
      { id: 'menu', label: menuSeeded ? 'Review your catering menu' : 'Build your catering menu', description: menuSeeded ? 'Review items with per-person or per-tray pricing' : 'Add items with per-person or per-tray pricing', icon: 'bi-book', route: '/app/menu', queryParams: { type: 'catering' }, done: done.has('menu'), category: 'essential' },
      { id: 'taxes', label: 'Set up taxes', description: 'Configure tax rates for your location', icon: 'bi-percent', route: '/app/settings', done: done.has('taxes'), category: 'essential' },
      { id: 'estimate', label: 'Create your first estimate', description: 'Send a proposal to land your first job', icon: 'bi-file-earmark-text', route: '/app/catering', done: done.has('estimate'), category: 'essential' },
      { id: 'team', label: 'Add team members', description: 'Invite staff and set permissions', icon: 'bi-people', route: '/app/settings', done: done.has('team'), category: 'essential' },
      { id: 'invoicing', label: 'Set up invoicing', description: 'Configure deposit schedules and payment reminders', icon: 'bi-receipt', route: '/app/invoicing', done: done.has('invoicing'), category: 'advanced' },
      { id: 'branding', label: 'Customize invoice branding', description: 'Add your logo and brand colors to proposals', icon: 'bi-palette', route: '/app/settings', done: done.has('branding'), category: 'advanced' },
      { id: 'hardware', label: 'Set up hardware', description: 'Tablets for on-site event management', icon: 'bi-cpu', route: '/app/hardware-guide', done: done.has('hardware'), category: 'advanced' },
    ];
  }

  private buildRetailTasks(): SetupTask[] {
    const done = this._completedTasks();
    const menuSeeded = this._menuHasCategories();
    return [
      { id: 'items', label: menuSeeded ? 'Review your products' : 'Add your first products', description: menuSeeded ? 'Review and update your catalog' : 'Add products, variations, and pricing', icon: 'bi-grid-3x3-gap', route: '/app/retail/catalog', done: done.has('items'), category: 'essential' },
      { id: 'taxes', label: 'Set up taxes', description: 'Configure tax rates for your location', icon: 'bi-percent', route: '/app/settings', done: done.has('taxes'), category: 'essential' },
      { id: 'team', label: 'Add team members', description: 'Invite staff and set permissions', icon: 'bi-people', route: '/app/settings', done: done.has('team'), category: 'essential' },
      { id: 'hours', label: 'Set your business hours', description: 'Configure your regular store hours', icon: 'bi-clock', route: '/app/settings', done: true, category: 'essential' },
      { id: 'barcode', label: 'Set up barcode scanning', description: 'Speed up checkout with product barcodes', icon: 'bi-upc-scan', route: '/app/settings', done: done.has('barcode'), category: 'advanced' },
      { id: 'ecommerce', label: 'Turn on online store', description: 'Start selling products online', icon: 'bi-globe', route: '/app/retail/ecommerce', done: done.has('ecommerce'), category: 'advanced' },
      { id: 'inventory', label: 'Configure inventory alerts', description: 'Get notified when stock runs low', icon: 'bi-box-seam', route: '/app/retail/inventory', done: done.has('inventory'), category: 'advanced' },
      { id: 'hardware', label: 'Set up hardware', description: 'Tablets, scanners, printers, and more', icon: 'bi-cpu', route: '/app/hardware-guide', done: done.has('hardware'), category: 'advanced' },
      { id: 'pin', label: 'Set owner PIN', description: 'Security PIN for POS access and clock-in', icon: 'bi-shield-lock', route: '/app/settings', done: done.has('pin'), category: 'advanced' },
    ];
  }

  private buildServiceTasks(): SetupTask[] {
    const done = this._completedTasks();
    const menuSeeded = this._menuHasCategories();
    return [
      { id: 'items', label: menuSeeded ? 'Review your services' : 'Create your first services', description: menuSeeded ? 'Review your service offerings' : 'Set up your service offerings and pricing', icon: 'bi-clipboard-check', route: '/app/menu', done: done.has('items'), category: 'essential' },
      { id: 'taxes', label: 'Set up taxes', description: 'Configure tax rates for your location', icon: 'bi-percent', route: '/app/settings', done: done.has('taxes'), category: 'essential' },
      { id: 'team', label: 'Add team members', description: 'Invite staff and set permissions', icon: 'bi-people', route: '/app/settings', done: done.has('team'), category: 'essential' },
      { id: 'invoicing', label: 'Set up invoicing', description: 'Configure invoice templates and reminders', icon: 'bi-file-earmark-text', route: '/app/invoicing', done: done.has('invoicing'), category: 'advanced' },
      { id: 'bookings', label: 'Turn on online booking', description: 'Let clients schedule appointments', icon: 'bi-calendar-check', route: '/app/bookings', done: done.has('bookings'), category: 'advanced' },
      { id: 'hardware', label: 'Set up hardware', description: 'Tablets and card readers', icon: 'bi-cpu', route: '/app/hardware-guide', done: done.has('hardware'), category: 'advanced' },
    ];
  }
}
