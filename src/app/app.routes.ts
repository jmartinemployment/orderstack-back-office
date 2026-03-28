import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { administrationGuard } from './guards/administration.guard';
import { onboardingGuard } from './guards/onboarding.guard';
import { roleGuard } from './guards/role.guard';
import { deviceInitResolver } from './resolvers/device-init.resolver';
import { MainLayoutComponent } from './layouts/main-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout.component';
import { MarketingLayoutComponent } from './features/website/layout/marketing-layout.component';

export const routes: Routes = [
  // Public marketing pages (no auth required)
  {
    path: '',
    component: MarketingLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/website/pages/landing/landing.component').then(m => m.LandingComponent),
      },
      {
        path: 'pricing',
        loadComponent: () =>
          import('./features/website/pages/pricing/pricing.component').then(m => m.PricingPageComponent),
      },
      {
        path: 'demo',
        loadComponent: () =>
          import('./features/website/pages/demo/demo.component').then(m => m.DemoPageComponent),
      },
      {
        path: 'blog/:slug',
        loadComponent: () =>
          import('./features/website/pages/blog-post/blog-post.component').then(m => m.BlogPostComponent),
      },
      {
        path: 'blog',
        loadComponent: () =>
          import('./features/website/pages/blog/blog.component').then(m => m.BlogPageComponent),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./features/website/pages/contact/contact.component').then(m => m.ContactPageComponent),
      },
      {
        path: 'integrations',
        loadComponent: () =>
          import('./features/website/pages/integrations/integrations.component').then(m => m.IntegrationsPageComponent),
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('./features/website/pages/privacy/privacy.component').then(m => m.PrivacyPageComponent),
      },
      {
        path: 'terms',
        loadComponent: () =>
          import('./features/website/pages/terms/terms.component').then(m => m.TermsPageComponent),
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./features/website/pages/about/about.component').then(m => m.AboutPageComponent),
      },
      {
        path: 'careers',
        loadComponent: () =>
          import('./features/website/pages/careers/careers.component').then(m => m.CareersPageComponent),
      },
      {
        path: 'features',
        loadComponent: () =>
          import('./features/website/pages/landing/landing.component').then(m => m.LandingComponent),
        // Temporary: shares landing page until a dedicated features page is built
      },
      // Redirects for dead/legacy routes
      { path: 'solutions/full-service', redirectTo: '/features', pathMatch: 'full' },
      { path: 'solutions/quick-service', redirectTo: '/features', pathMatch: 'full' },
      { path: 'solutions/retail', redirectTo: '/features', pathMatch: 'full' },
      { path: 'solutions/services', redirectTo: '/features', pathMatch: 'full' },
      { path: 'help', redirectTo: '/contact', pathMatch: 'full' },
    ],
  },

  // Public routes (redirect authenticated users away)
  {
    path: 'signup',
    canActivate: [guestGuard],
    component: AuthLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./features/auth/signup/signup').then(m => m.Signup) },
    ],
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    component: AuthLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./features/auth/login/login').then(m => m.Login) },
    ],
  },
  {
    path: 'reset-password',
    component: AuthLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./features/auth/reset-password/reset-password').then(m => m.ResetPassword) },
    ],
  },
  {
    // PCI DSS 8.4.2: MFA challenge — shown after login when the account has MFA enabled.
    // No guestGuard: the user is partially authenticated (mfaRequired state) at this point.
    path: 'mfa-challenge',
    component: AuthLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./features/auth/mfa-challenge/mfa-challenge').then(m => m.MfaChallenge) },
    ],
  },
  {
    // PCI DSS 8.4.2: MFA enrollment required — shown after login for privileged roles
    // that haven't set up MFA yet. No guestGuard: user is authenticated but must enroll.
    path: 'mfa-setup-required',
    canActivate: [authGuard],
    component: AuthLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./features/auth/mfa-enrollment-required/mfa-enrollment-required').then(m => m.MfaEnrollmentRequired) },
    ],
  },
  {
    path: 'pair',
    component: AuthLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./features/auth/pair-device').then(m => m.PairDevice) },
    ],
  },
  {
    path: 'business-type',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/business-type-select/business-type-select').then(m => m.BusinessTypeSelect),
  },
  {
    path: 'setup',
    canActivate: [authGuard],
    loadComponent: () => import('./features/onboarding/setup-wizard/setup-wizard').then(m => m.SetupWizard),
  },
  {
    path: 'device-setup',
    canActivate: [authGuard],
    loadComponent: () => import('./features/onboarding/device-setup/device-setup').then(m => m.DeviceSetup),
  },
  {
    path: 'pos-login',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/pos-login/pos-login').then(m => m.PosLogin),
  },
  {
    path: 'order/:restaurantSlug',
    loadComponent: () => import('./features/online-ordering/online-order-portal/online-order-portal').then(m => m.OnlineOrderPortal),
  },
  {
    path: 'staff',
    loadComponent: () => import('./features/staff/staff-portal/staff-portal').then(m => m.StaffPortal),
  },
  {
    path: 'guest-check',
    loadComponent: () => import('./features/online-ordering/guest-check/guest-check').then(m => m.GuestCheck),
  },
  {
    path: 'account/:restaurantSlug',
    loadComponent: () => import('./features/online-ordering/customer-portal/customer-portal').then(m => m.CustomerPortal),
  },
  {
    // PCI DSS 6.4.1: Scan-to-pay route disabled — the current implementation collects
    // raw card data without a PCI-compliant payment processor SDK (PayPal/Braintree).
    // Re-enable only after integrating a tokenized payment SDK.
    path: 'pay/:checkToken',
    canActivate: [() => false],
    loadComponent: () => import('./features/online-ordering/scan-to-pay/scan-to-pay').then(m => m.ScanToPay),
  },
  {
    path: 'customer-display',
    loadComponent: () => import('./features/pos/customer-display/customer-display').then(m => m.CustomerDisplay),
  },
  // Public catering pages (no auth)
  {
    path: 'catering/proposal/:token',
    loadComponent: () => import('./features/catering/catering-proposal/catering-proposal.component').then(m => m.CateringProposalComponent),
  },
  {
    path: 'catering/portal/:token',
    loadComponent: () => import('./features/catering/catering-guest-portal/catering-guest-portal.component').then(m => m.CateringGuestPortalComponent),
  },
  {
    path: 'catering/inquiry/:merchantSlug',
    loadComponent: () => import('./features/catering/catering-lead-form/catering-lead-form.component').then(m => m.CateringLeadFormComponent),
  },
  {
    path: 'shop/:storeSlug',
    loadComponent: () => import('./features/retail/ecommerce/product-list/product-list').then(m => m.ProductList),
  },
  {
    path: 'shop/:storeSlug/product/:productId',
    loadComponent: () => import('./features/retail/ecommerce/product-detail/product-detail').then(m => m.ProductDetail),
  },
  {
    path: 'shop/:storeSlug/checkout',
    loadComponent: () => import('./features/retail/ecommerce/retail-checkout/retail-checkout').then(m => m.RetailCheckout),
  },
  {
    path: 'select-restaurant',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/restaurant-select/restaurant-select').then(m => m.RestaurantSelect),
  },
  // Dedicated device routes — full-screen, no sidebar
  {
    path: 'kiosk',
    canActivate: [authGuard],
    resolve: { deviceInit: deviceInitResolver },
    loadComponent: () => import('./features/kiosk/kiosk-terminal/kiosk-terminal').then(m => m.KioskTerminal),
  },
  {
    path: 'register',
    canActivate: [authGuard],
    resolve: { deviceInit: deviceInitResolver },
    loadComponent: () => import('./features/register/register-terminal/register-terminal').then(m => m.RegisterTerminal),
  },
  {
    path: 'bar',
    canActivate: [authGuard],
    resolve: { deviceInit: deviceInitResolver },
    loadComponent: () => import('./features/bar/bar-terminal/bar-terminal').then(m => m.BarTerminal),
  },
  {
    path: 'kds',
    canActivate: [authGuard],
    resolve: { deviceInit: deviceInitResolver },
    loadComponent: () => import('./features/kds/kds-display/kds-display').then(m => m.KdsDisplay),
  },

  // Bookings terminal — full-screen, no sidebar
  {
    path: 'bookings-terminal',
    canActivate: [authGuard],
    resolve: { deviceInit: deviceInitResolver },
    loadComponent: () => import('./features/bookings/bookings-terminal/bookings-terminal').then(m => m.BookingsTerminal),
  },

  // POS — full-screen, no sidebar
  {
    path: 'pos',
    canActivate: [authGuard],
    resolve: { deviceInit: deviceInitResolver },
    loadComponent: () => import('./features/pos/server-pos-terminal/server-pos-terminal').then(m => m.ServerPosTerminal),
  },

  // Floor Plan — full-screen, no sidebar (servers land here after POS login)
  {
    path: 'floor-plan',
    canActivate: [authGuard],
    resolve: { deviceInit: deviceInitResolver },
    loadComponent: () => import('./features/table-mgmt/floor-plan/floor-plan').then(m => m.FloorPlan),
  },

  // Quick Service — full-screen, no sidebar
  {
    path: 'quick-service',
    canActivate: [authGuard],
    resolve: { deviceInit: deviceInitResolver },
    loadComponent: () => import('./features/quick-service/quick-service-terminal/quick-service-terminal').then(m => m.QuickServiceTerminal),
  },

  // Online Ordering — full-screen, no sidebar
  {
    path: 'online-ordering',
    canActivate: [authGuard],
    resolve: { deviceInit: deviceInitResolver },
    loadComponent: () => import('./features/online-ordering/online-order-portal/online-order-portal').then(m => m.OnlineOrderPortal),
  },

  // Legacy redirects — catch old bookmarked URLs and redirect to /app/*
  { path: 'dashboard', redirectTo: '/app/administration', pathMatch: 'full' },
  { path: 'administration', redirectTo: '/app/administration', pathMatch: 'full' },
  { path: 'orders', redirectTo: '/app/orders', pathMatch: 'full' },
  { path: 'order-history', redirectTo: '/app/order-history', pathMatch: 'full' },
  { path: 'menu', redirectTo: '/app/menu', pathMatch: 'full' },
  { path: 'combos', redirectTo: '/app/combos', pathMatch: 'full' },
  { path: 'inventory', redirectTo: '/app/inventory', pathMatch: 'full' },
  { path: 'suppliers', redirectTo: '/app/suppliers', pathMatch: 'full' },
  { path: 'customers', redirectTo: '/app/customers', pathMatch: 'full' },
  { path: 'reports', redirectTo: '/app/reports', pathMatch: 'full' },
  { path: 'scheduling', redirectTo: '/app/staff/scheduling', pathMatch: 'full' },
  { path: 'settings', redirectTo: '/app/settings', pathMatch: 'full' },
  { path: 'sales', redirectTo: '/app/sales', pathMatch: 'full' },
  { path: 'command-center', redirectTo: '/app/command-center', pathMatch: 'full' },
  { path: 'close-of-day', redirectTo: '/app/close-of-day', pathMatch: 'full' },
  { path: 'invoicing', redirectTo: '/app/invoicing', pathMatch: 'full' },
  { path: 'marketing', redirectTo: '/app/marketing', pathMatch: 'full' },
  { path: 'food-cost', redirectTo: '/app/food-cost', pathMatch: 'full' },
  { path: 'cash-drawer', redirectTo: '/app/cash-drawer', pathMatch: 'full' },
  { path: 'monitoring', redirectTo: '/app/monitoring', pathMatch: 'full' },
  { path: 'ai-chat', redirectTo: '/app/ai-chat', pathMatch: 'full' },
  { path: 'voice-order', redirectTo: '/app/voice-order', pathMatch: 'full' },
  { path: 'dynamic-pricing', redirectTo: '/app/dynamic-pricing', pathMatch: 'full' },
  { path: 'waste-tracker', redirectTo: '/app/waste-tracker', pathMatch: 'full' },
  { path: 'sentiment', redirectTo: '/app/sentiment', pathMatch: 'full' },
  { path: 'menu-engineering', redirectTo: '/app/menu-engineering', pathMatch: 'full' },
  { path: 'multi-location', redirectTo: '/app/multi-location', pathMatch: 'full' },
  { path: 'tip-management', redirectTo: '/app/tip-management', pathMatch: 'full' },
  { path: 'report-builder', redirectTo: '/app/report-builder', pathMatch: 'full' },
  // /online-ordering (top-level) = customer portal; /app/online-ordering = admin
  { path: 'bookings', redirectTo: '/app/bookings', pathMatch: 'full' },
  { path: 'hardware-guide', redirectTo: '/app/hardware-guide', pathMatch: 'full' },

  // Authenticated routes
  {
    path: 'app',
    component: MainLayoutComponent,
    canActivate: [authGuard, onboardingGuard],
    resolve: { deviceInit: deviceInitResolver },
    children: [

      // Administration (dashboard)
      { path: 'administration', canActivate: [administrationGuard], loadComponent: () => import('./features/home/home-dashboard/home-dashboard').then(m => m.HomeDashboard) },
      { path: 'hardware-guide', loadComponent: () => import('./features/home/hardware-guide/hardware-guide').then(m => m.HardwareGuide) },

      // Orders
      { path: 'orders', loadComponent: () => import('./features/orders/pending-orders/pending-orders').then(m => m.PendingOrders) },
      { path: 'order-history', loadComponent: () => import('./features/orders/order-history/order-history').then(m => m.OrderHistory) },
      { path: 'order-pad', redirectTo: 'pos', pathMatch: 'full' },

      // SOS redirects to kiosk (consolidated)
      { path: 'sos', redirectTo: '/kiosk', pathMatch: 'full' },

      // Front of House
      { path: 'floor-plan', loadComponent: () => import('./features/table-mgmt/floor-plan/floor-plan').then(m => m.FloorPlan) },
      { path: 'tables', redirectTo: 'floor-plan', pathMatch: 'full' },
      { path: 'bookings', loadComponent: () => import('./features/bookings/booking-manager').then(m => m.BookingManager) },
      { path: 'catering', loadComponent: () => import('./features/catering/catering-dashboard/catering-dashboard.component').then(m => m.CateringDashboardComponent) },
      { path: 'catering/job/:id', loadComponent: () => import('./features/catering/catering-job-detail/catering-job-detail.component').then(m => m.CateringJobDetailComponent) },
      { path: 'catering/job/:id/beo', loadComponent: () => import('./features/catering/catering-beo/catering-beo.component').then(m => m.CateringBeoComponent) },
      { path: 'catering/reports', loadComponent: () => import('./features/catering/catering-reports/catering-reports.component').then(m => m.CateringReportsComponent) },
      { path: 'catering/prep-list', loadComponent: () => import('./features/catering/catering-prep-list/catering-prep-list.component').then(m => m.CateringPrepListComponent) },
      { path: 'catering/calendar', loadComponent: () => import('./features/catering/catering-calendar/catering-calendar.component').then(m => m.CateringCalendarComponent) },
      { path: 'catering/proposals', loadComponent: () => import('./features/catering/catering-proposals/catering-proposals.component').then(m => m.CateringProposalsComponent) },
      { path: 'catering/delivery', loadComponent: () => import('./features/catering/catering-delivery/catering-delivery.component').then(m => m.CateringDeliveryComponent) },
      { path: 'catering/production', loadComponent: () => import('./features/catering/catering-production/catering-production.component').then(m => m.CateringProductionComponent) },
      // Menu
      { path: 'menu/beverages', loadComponent: () => import('./features/menu-mgmt/beverages/beverages.component').then(m => m.BeveragesComponent) },
      { path: 'menu/packages', loadComponent: () => import('./features/catering/catering-packages/catering-packages.component').then(m => m.CateringPackagesComponent) },
      { path: 'menu/ingredients', loadComponent: () => import('./features/menu-mgmt/menu-ingredients/menu-ingredients.component').then(m => m.MenuIngredientsComponent) },
      { path: 'menu', loadComponent: () => import('./features/menu-mgmt/menu-management').then(m => m.MenuManagement) },
      { path: 'combos', loadComponent: () => import('./features/menu-mgmt/combo-management/combo-management').then(m => m.ComboManagement) },

      // Inventory
      { path: 'inventory', loadComponent: () => import('./features/inventory/inventory-dashboard/inventory-dashboard').then(m => m.InventoryDashboard) },
      { path: 'suppliers', loadComponent: () => import('./features/suppliers/supplier-management').then(m => m.SupplierManagement) },

      // Analytics
      { path: 'command-center', loadComponent: () => import('./features/analytics/command-center/command-center').then(m => m.CommandCenter) },
      { path: 'sales', loadComponent: () => import('./features/analytics/sales-dashboard/sales-dashboard').then(m => m.SalesDashboard) },
      { path: 'analytics/sales', redirectTo: 'sales', pathMatch: 'full' },
      { path: 'menu-engineering', loadComponent: () => import('./features/analytics/menu-engineering-dashboard/menu-engineering-dashboard').then(m => m.MenuEngineeringDashboard) },
      { path: 'close-of-day', loadComponent: () => import('./features/reports/close-of-day/close-of-day').then(m => m.CloseOfDay) },
      { path: 'reports/revenue', loadComponent: () => import('./features/catering/catering-revenue-report/catering-revenue-report.component').then(m => m.CateringRevenueReportComponent) },
      { path: 'reports/deferred', loadComponent: () => import('./features/catering/catering-deferred-report/catering-deferred-report.component').then(m => m.CateringDeferredReportComponent) },
      { path: 'reports/catering', loadComponent: () => import('./features/catering/catering-reports/catering-reports.component').then(m => m.CateringReportsComponent) },
      { path: 'reports', loadComponent: () => import('./features/reports/report-dashboard/report-dashboard').then(m => m.ReportDashboard) },

      // Customers
      { path: 'customers', loadComponent: () => import('./features/crm/customer-dashboard/customer-dashboard').then(m => m.CustomerDashboard) },
      { path: 'crm', redirectTo: 'customers', pathMatch: 'full' },
      { path: 'marketing', loadComponent: () => import('./features/marketing/campaign-builder/campaign-builder').then(m => m.CampaignBuilder) },

      // Operations
      { path: 'food-cost', loadComponent: () => import('./features/food-cost/food-cost-dashboard/food-cost-dashboard').then(m => m.FoodCostDashboard) },
      {
        path: 'staff',
        canActivate: [roleGuard('owner', 'manager', 'super_admin')],
        children: [
          { path: '', loadComponent: () => import('./features/staff/staff-directory/staff-directory').then(m => m.StaffDirectory) },
          { path: 'scheduling', loadComponent: () => import('./features/labor/staff-scheduling/staff-scheduling').then(m => m.StaffScheduling) },
        ],
      },
      { path: 'scheduling', redirectTo: 'staff/scheduling', pathMatch: 'full' },
      { path: 'labor', redirectTo: 'staff/scheduling', pathMatch: 'full' },
      { path: 'invoicing', loadComponent: () => import('./features/invoicing/invoice-manager/invoice-manager').then(m => m.InvoiceManager) },
      { path: 'invoicing/milestones', loadComponent: () => import('./features/catering/catering-milestones/catering-milestones.component').then(m => m.CateringMilestonesComponent) },
      { path: 'cash-drawer', loadComponent: () => import('./features/pos/cash-drawer/cash-drawer').then(m => m.CashDrawer) },
      { path: 'monitoring', loadComponent: () => import('./features/monitoring/monitoring-agent/monitoring-agent').then(m => m.MonitoringAgent) },

      // AI Tools
      { path: 'ai-chat', loadComponent: () => import('./features/ai-chat/chat-assistant/chat-assistant').then(m => m.ChatAssistant) },
      { path: 'voice-order', loadComponent: () => import('./features/voice-ordering/voice-order/voice-order').then(m => m.VoiceOrder) },
      { path: 'voice-ordering', redirectTo: 'voice-order', pathMatch: 'full' },
      { path: 'dynamic-pricing', loadComponent: () => import('./features/pricing/dynamic-pricing/dynamic-pricing').then(m => m.DynamicPricing) },
      { path: 'pricing', redirectTo: 'dynamic-pricing', pathMatch: 'full' },
      { path: 'waste-tracker', loadComponent: () => import('./features/waste/waste-tracker/waste-tracker').then(m => m.WasteTracker) },
      { path: 'waste', redirectTo: 'waste-tracker', pathMatch: 'full' },
      { path: 'sentiment', loadComponent: () => import('./features/sentiment/sentiment-dashboard/sentiment-dashboard').then(m => m.SentimentDashboard) },

      // Retail
      { path: 'retail/catalog', loadComponent: () => import('./features/retail/catalog-management/catalog-management').then(m => m.CatalogManagement) },
      { path: 'retail/variations', loadComponent: () => import('./features/retail/variation-editor/variation-editor').then(m => m.VariationEditor) },
      { path: 'retail/inventory', loadComponent: () => import('./features/retail/inventory/retail-inventory/retail-inventory').then(m => m.RetailInventory) },
      { path: 'retail/pos', loadComponent: () => import('./features/retail/retail-pos/retail-pos').then(m => m.RetailPos) },
      { path: 'retail/returns', loadComponent: () => import('./features/retail/returns/returns').then(m => m.ReturnProcessing) },
      { path: 'retail/vendors', loadComponent: () => import('./features/retail/vendor-management/vendor-management').then(m => m.RetailVendorManagement) },
      { path: 'retail/purchase-orders', loadComponent: () => import('./features/retail/purchase-orders/purchase-orders').then(m => m.RetailPurchaseOrders) },
      { path: 'retail/reports', loadComponent: () => import('./features/retail/reports/retail-reports').then(m => m.RetailReports) },
      { path: 'retail/fulfillment', loadComponent: () => import('./features/retail/fulfillment/fulfillment-dashboard').then(m => m.FulfillmentDashboard) },
      { path: 'retail/ecommerce', loadComponent: () => import('./features/retail/fulfillment/fulfillment-dashboard').then(m => m.FulfillmentDashboard) },

      // Tip Management
      { path: 'tip-management', loadComponent: () => import('./features/tip-mgmt/tip-management/tip-management').then(m => m.TipManagement) },
      { path: 'tips', redirectTo: 'tip-management', pathMatch: 'full' },

      // Reports
      { path: 'report-builder', loadComponent: () => import('./features/reports/report-builder/report-builder').then(m => m.ReportBuilder) },

      // Admin
      { path: 'multi-location', loadComponent: () => import('./features/multi-location/multi-location-dashboard/multi-location-dashboard').then(m => m.MultiLocationDashboard) },
      { path: 'settings/business', loadComponent: () => import('./features/settings/general-settings/general-settings').then(m => m.GeneralSettings) },
      { path: 'settings/branding', loadComponent: () => import('./features/settings/invoice-branding/invoice-branding').then(m => m.InvoiceBranding) },
      { path: 'settings/payments', loadComponent: () => import('./features/settings/payment-settings/payment-settings').then(m => m.PaymentSettingsComponent) },
      { path: 'settings/ai', loadComponent: () => import('./features/settings/ai-settings/ai-settings').then(m => m.AiSettings) },
      { path: 'settings/notifications', loadComponent: () => import('./features/settings/notification-settings/notification-settings').then(m => m.NotificationSettingsComponent) },
      { path: 'settings', loadComponent: () => import('./features/settings/control-panel/control-panel').then(m => m.ControlPanel) },

      // Online ordering admin (manages channel visibility, online hours) — owner/manager only
      { path: 'online-ordering', canActivate: [roleGuard('owner', 'manager', 'super_admin')], loadComponent: () => import('./features/online-ordering/online-ordering-admin/online-ordering-admin').then(m => m.OnlineOrderingAdmin) },
      { path: 'online', redirectTo: 'online-ordering', pathMatch: 'full' },

      // Legacy aliases
      { path: 'dashboard', redirectTo: 'administration', pathMatch: 'full' },
      { path: 'proposals', redirectTo: 'catering/proposals', pathMatch: 'full' },
      { path: 'home', redirectTo: 'administration', pathMatch: 'full' },
      { path: 'pos', redirectTo: '/pos', pathMatch: 'full' },
      { path: 'kds', redirectTo: '/kds', pathMatch: 'full' },
      { path: 'kiosk', redirectTo: '/kiosk', pathMatch: 'full' },

      // Default — redirect to administration
      { path: '', redirectTo: 'administration', pathMatch: 'full' },

      // Wildcard catch-all — prevents blank page on invalid /app/* paths
      { path: '**', redirectTo: 'administration' },
    ],
  },

];
