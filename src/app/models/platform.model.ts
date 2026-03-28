// ===================================================================
// GOS-SPEC-01: Platform Architecture & Mode System
// All types, interfaces, constants, and factory functions for the
// mode-aware platform that controls feature visibility by business
// vertical (account-level) and device POS mode (per-device).
// ===================================================================

// --- Business Verticals ---

export type BusinessVertical =
  | 'food_and_drink'
  | 'retail'
  | 'grocery'
  | 'beauty_wellness'
  | 'healthcare'
  | 'sports_fitness'
  | 'home_repair'
  | 'professional_services';

export interface BusinessVerticalConfig {
  vertical: BusinessVertical;
  label: string;
  description: string;
  icon: string;
  availableModes: DevicePosMode[];
  enabledModules: PlatformModule[];
}

export const BUSINESS_VERTICAL_CATALOG: BusinessVerticalConfig[] = [
  {
    vertical: 'food_and_drink',
    label: 'Food & Drink',
    description: 'Restaurants, cafes, food trucks, bars, breweries',
    icon: 'bi-cup-hot',
    availableModes: ['quick_service', 'full_service', 'bar', 'catering', 'standard'],
    enabledModules: [
      'menu_management', 'table_management', 'kds', 'bookings',
      'catering', 'online_ordering', 'inventory', 'marketing', 'loyalty',
      'delivery', 'gift_cards', 'staff_scheduling', 'payroll',
      'reports', 'crm', 'multi_location',
    ],
  },
  {
    vertical: 'retail',
    label: 'Retail Goods',
    description: 'Boutiques, shops, merchandise, e-commerce',
    icon: 'bi-bag',
    availableModes: ['retail', 'standard'],
    enabledModules: [
      'inventory', 'online_ordering', 'marketing', 'loyalty',
      'gift_cards', 'staff_scheduling', 'payroll', 'reports',
      'crm', 'multi_location',
    ],
  },
  {
    vertical: 'grocery',
    label: 'Grocery / Gourmet / Alcohol',
    description: 'Grocery stores, specialty food, wine shops, liquor stores',
    icon: 'bi-cart',
    availableModes: ['retail', 'standard'],
    enabledModules: [
      'inventory', 'online_ordering', 'marketing', 'loyalty',
      'gift_cards', 'staff_scheduling', 'payroll', 'reports',
      'crm', 'multi_location',
    ],
  },
  {
    vertical: 'beauty_wellness',
    label: 'Beauty & Wellness',
    description: 'Salons, spas, wellness centers',
    icon: 'bi-scissors',
    availableModes: ['bookings', 'retail', 'standard'],
    enabledModules: [
      'appointments', 'inventory', 'marketing', 'loyalty',
      'gift_cards', 'staff_scheduling', 'payroll', 'reports',
      'crm', 'multi_location',
    ],
  },
  {
    vertical: 'healthcare',
    label: 'Healthcare Services',
    description: 'Clinics, dental offices, therapy practices',
    icon: 'bi-heart-pulse',
    availableModes: ['bookings', 'services', 'standard'],
    enabledModules: [
      'appointments', 'invoicing', 'marketing', 'staff_scheduling',
      'payroll', 'reports', 'crm',
    ],
  },
  {
    vertical: 'sports_fitness',
    label: 'Sports & Fitness',
    description: 'Gyms, studios, sports facilities',
    icon: 'bi-lightning',
    availableModes: ['bookings', 'retail', 'standard'],
    enabledModules: [
      'appointments', 'inventory', 'marketing', 'loyalty',
      'gift_cards', 'staff_scheduling', 'payroll', 'reports',
      'crm', 'multi_location',
    ],
  },
  {
    vertical: 'home_repair',
    label: 'Home & Repair Services',
    description: 'Plumbers, electricians, contractors',
    icon: 'bi-tools',
    availableModes: ['services', 'standard'],
    enabledModules: [
      'invoicing', 'marketing', 'staff_scheduling', 'payroll',
      'reports', 'crm',
    ],
  },
  {
    vertical: 'professional_services',
    label: 'Professional Services',
    description: 'Consultants, accountants, agencies',
    icon: 'bi-briefcase',
    availableModes: ['services', 'standard'],
    enabledModules: [
      'invoicing', 'marketing', 'staff_scheduling', 'payroll',
      'reports', 'crm',
    ],
  },
];

// --- Platform Modules ---

export type PlatformModule =
  | 'menu_management'
  | 'table_management'
  | 'kds'
  | 'bookings'
  | 'catering'
  | 'online_ordering'
  | 'inventory'
  | 'invoicing'
  | 'appointments'
  | 'marketing'
  | 'loyalty'
  | 'delivery'
  | 'gift_cards'
  | 'staff_scheduling'
  | 'payroll'
  | 'reports'
  | 'crm'
  | 'multi_location';

// --- Device POS Modes ---

export type DevicePosMode =
  | 'quick_service'
  | 'full_service'
  | 'bar'
  | 'catering'
  | 'retail'
  | 'bookings'
  | 'services'
  | 'standard';

export interface DevicePosModeConfig {
  mode: DevicePosMode;
  label: string;
  description: string;
  icon: string;
  category: 'restaurant' | 'retail' | 'services' | 'general';
  highlights: string[];
  featureFlags: ModeFeatureFlags;
}

// --- Mode Feature Flags ---

export interface ModeFeatureFlags {
  // Order Workflow
  enableOpenChecks: boolean;
  enableCoursing: boolean;
  enableSeatAssignment: boolean;
  enableCheckSplitting: boolean;
  enableCheckTransfer: boolean;
  enablePreAuthTabs: boolean;
  enableConversationalModifiers: boolean;
  enableMultiChannelMenus: boolean;

  // Floor & Table
  enableFloorPlan: boolean;
  enableTableManagement: boolean;
  enableWaitlist: boolean;

  // Kitchen
  enableKds: boolean;
  enableExpoStation: boolean;

  // Inventory
  enableBarcodeScanning: boolean;
  enableReturnsExchanges: boolean;

  // Scheduling & Booking
  enableAppointmentBooking: boolean;
  enableProjectTracking: boolean;

  // Payments
  enableTipping: boolean;
  enableSurcharging: boolean;

  // Display
  enableDarkModeDisplay: boolean;
  showItemImages: boolean;
  showCategoryNavigation: boolean;
  enableOrderNumberTracking: boolean;
}

// --- Mode Presets ---

export const RESTAURANT_MODE_QUICK_SERVICE: ModeFeatureFlags = {
  enableOpenChecks: false,
  enableCoursing: false,
  enableSeatAssignment: false,
  enableCheckSplitting: false,
  enableCheckTransfer: false,
  enablePreAuthTabs: false,
  enableConversationalModifiers: true,
  enableMultiChannelMenus: true,
  enableFloorPlan: false,
  enableTableManagement: false,
  enableWaitlist: false,
  enableKds: true,
  enableExpoStation: false,
  enableBarcodeScanning: false,
  enableReturnsExchanges: false,
  enableAppointmentBooking: false,
  enableProjectTracking: false,
  enableTipping: true,
  enableSurcharging: true,
  enableDarkModeDisplay: false,
  showItemImages: true,
  showCategoryNavigation: true,
  enableOrderNumberTracking: true,
};

export const RESTAURANT_MODE_FULL_SERVICE: ModeFeatureFlags = {
  enableOpenChecks: true,
  enableCoursing: true,
  enableSeatAssignment: true,
  enableCheckSplitting: true,
  enableCheckTransfer: true,
  enablePreAuthTabs: true,
  enableConversationalModifiers: false,
  enableMultiChannelMenus: false,
  enableFloorPlan: true,
  enableTableManagement: true,
  enableWaitlist: true,
  enableKds: true,
  enableExpoStation: true,
  enableBarcodeScanning: false,
  enableReturnsExchanges: false,
  enableAppointmentBooking: false,
  enableProjectTracking: false,
  enableTipping: true,
  enableSurcharging: true,
  enableDarkModeDisplay: false,
  showItemImages: true,
  showCategoryNavigation: true,
  enableOrderNumberTracking: false,
};

export const RESTAURANT_MODE_BAR: ModeFeatureFlags = {
  enableOpenChecks: true,
  enableCoursing: false,
  enableSeatAssignment: false,
  enableCheckSplitting: true,
  enableCheckTransfer: false,
  enablePreAuthTabs: true,
  enableConversationalModifiers: true,
  enableMultiChannelMenus: false,
  enableFloorPlan: false,
  enableTableManagement: false,
  enableWaitlist: false,
  enableKds: true,
  enableExpoStation: false,
  enableBarcodeScanning: false,
  enableReturnsExchanges: false,
  enableAppointmentBooking: false,
  enableProjectTracking: false,
  enableTipping: true,
  enableSurcharging: true,
  enableDarkModeDisplay: true,
  showItemImages: false,
  showCategoryNavigation: true,
  enableOrderNumberTracking: false,
};

export const CATERING_MODE: ModeFeatureFlags = {
  enableOpenChecks: false,
  enableCoursing: false,
  enableSeatAssignment: false,
  enableCheckSplitting: false,
  enableCheckTransfer: false,
  enablePreAuthTabs: false,
  enableConversationalModifiers: false,
  enableMultiChannelMenus: false,
  enableFloorPlan: false,
  enableTableManagement: false,
  enableWaitlist: false,
  enableKds: false,
  enableExpoStation: false,
  enableBarcodeScanning: false,
  enableReturnsExchanges: false,
  enableAppointmentBooking: false,
  enableProjectTracking: true,
  enableTipping: false,
  enableSurcharging: false,
  enableDarkModeDisplay: false,
  showItemImages: true,
  showCategoryNavigation: true,
  enableOrderNumberTracking: false,
};

export const RETAIL_MODE: ModeFeatureFlags = {
  enableOpenChecks: false,
  enableCoursing: false,
  enableSeatAssignment: false,
  enableCheckSplitting: false,
  enableCheckTransfer: false,
  enablePreAuthTabs: false,
  enableConversationalModifiers: false,
  enableMultiChannelMenus: true,
  enableFloorPlan: false,
  enableTableManagement: false,
  enableWaitlist: false,
  enableKds: false,
  enableExpoStation: false,
  enableBarcodeScanning: true,
  enableReturnsExchanges: true,
  enableAppointmentBooking: false,
  enableProjectTracking: false,
  enableTipping: false,
  enableSurcharging: true,
  enableDarkModeDisplay: false,
  showItemImages: true,
  showCategoryNavigation: true,
  enableOrderNumberTracking: false,
};

export const BOOKINGS_MODE: ModeFeatureFlags = {
  enableOpenChecks: false,
  enableCoursing: false,
  enableSeatAssignment: false,
  enableCheckSplitting: false,
  enableCheckTransfer: false,
  enablePreAuthTabs: false,
  enableConversationalModifiers: false,
  enableMultiChannelMenus: false,
  enableFloorPlan: false,
  enableTableManagement: false,
  enableWaitlist: true,
  enableKds: false,
  enableExpoStation: false,
  enableBarcodeScanning: false,
  enableReturnsExchanges: false,
  enableAppointmentBooking: true,
  enableProjectTracking: false,
  enableTipping: true,
  enableSurcharging: true,
  enableDarkModeDisplay: false,
  showItemImages: false,
  showCategoryNavigation: false,
  enableOrderNumberTracking: false,
};

export const SERVICES_MODE: ModeFeatureFlags = {
  enableOpenChecks: false,
  enableCoursing: false,
  enableSeatAssignment: false,
  enableCheckSplitting: false,
  enableCheckTransfer: false,
  enablePreAuthTabs: false,
  enableConversationalModifiers: false,
  enableMultiChannelMenus: false,
  enableFloorPlan: false,
  enableTableManagement: false,
  enableWaitlist: false,
  enableKds: false,
  enableExpoStation: false,
  enableBarcodeScanning: false,
  enableReturnsExchanges: false,
  enableAppointmentBooking: true,
  enableProjectTracking: true,
  enableTipping: false,
  enableSurcharging: true,
  enableDarkModeDisplay: false,
  showItemImages: false,
  showCategoryNavigation: false,
  enableOrderNumberTracking: false,
};

export const STANDARD_MODE: ModeFeatureFlags = {
  enableOpenChecks: false,
  enableCoursing: false,
  enableSeatAssignment: false,
  enableCheckSplitting: false,
  enableCheckTransfer: false,
  enablePreAuthTabs: false,
  enableConversationalModifiers: false,
  enableMultiChannelMenus: false,
  enableFloorPlan: false,
  enableTableManagement: false,
  enableWaitlist: false,
  enableKds: false,
  enableExpoStation: false,
  enableBarcodeScanning: false,
  enableReturnsExchanges: false,
  enableAppointmentBooking: false,
  enableProjectTracking: false,
  enableTipping: true,
  enableSurcharging: true,
  enableDarkModeDisplay: false,
  showItemImages: false,
  showCategoryNavigation: true,
  enableOrderNumberTracking: false,
};

// --- Mode Preset Lookup ---

const MODE_PRESET_MAP: Record<DevicePosMode, ModeFeatureFlags> = {
  quick_service: RESTAURANT_MODE_QUICK_SERVICE,
  full_service: RESTAURANT_MODE_FULL_SERVICE,
  bar: RESTAURANT_MODE_BAR,
  catering: CATERING_MODE,
  retail: RETAIL_MODE,
  bookings: BOOKINGS_MODE,
  services: SERVICES_MODE,
  standard: STANDARD_MODE,
};

export const DEVICE_POS_MODE_CATALOG: DevicePosModeConfig[] = [
  {
    mode: 'quick_service',
    label: 'Quick Service',
    description: 'Speed up ordering with conversational modifiers and multi-channel menus. Ideal for counter service, food trucks, caterers, and ghost kitchens.',
    icon: 'bi-lightning',
    category: 'restaurant',
    highlights: ['Conversational modifiers', 'Multi-channel menus', 'Fast checkout', 'KDS integration'],
    featureFlags: RESTAURANT_MODE_QUICK_SERVICE,
  },
  {
    mode: 'full_service',
    label: 'Full Service',
    description: 'Offer service with open checks, coursing, and customized restaurant floor plans.',
    icon: 'bi-layout-text-sidebar',
    category: 'restaurant',
    highlights: ['Open checks & coursing', 'Table management', 'Floor plan editor', 'Bookings'],
    featureFlags: RESTAURANT_MODE_FULL_SERVICE,
  },
  {
    mode: 'bar',
    label: 'Bar',
    description: 'Place orders using conversational modifiers and allow card pre-authorization.',
    icon: 'bi-cup-straw',
    category: 'restaurant',
    highlights: ['Card pre-authorization', 'Tab management', 'Conversational modifiers', 'Quick reorder'],
    featureFlags: RESTAURANT_MODE_BAR,
  },
  {
    mode: 'catering',
    label: 'Catering',
    description: 'Manage events, send proposals, collect milestone payments, and track your pipeline.',
    icon: 'bi-truck',
    category: 'restaurant',
    highlights: ['Event pipeline', 'Proposals & invoicing', 'Milestone payments', 'Catering menu'],
    featureFlags: CATERING_MODE,
  },
  {
    mode: 'retail',
    label: 'Retail',
    description: 'Manage inventory, orders, and customers across in-person and online sales.',
    icon: 'bi-shop',
    category: 'retail',
    highlights: ['Barcode scanning', 'Smart inventory management', 'Advanced reporting', 'Omnichannel selling'],
    featureFlags: RETAIL_MODE,
  },
  {
    mode: 'bookings',
    label: 'Bookings',
    description: 'Manage your calendar and use waitlists to fill gaps in your schedule.',
    icon: 'bi-calendar-check',
    category: 'services',
    highlights: ['Calendar management', 'Waitlist support', 'Client scheduling', 'Automated reminders'],
    featureFlags: BOOKINGS_MODE,
  },
  {
    mode: 'services',
    label: 'Services',
    description: 'Manage projects, send invoices, and take payments anytime, anywhere.',
    icon: 'bi-clipboard-check',
    category: 'services',
    highlights: ['Project management', 'Invoice generation', 'Mobile payments', 'Client tracking'],
    featureFlags: SERVICES_MODE,
  },
  {
    mode: 'standard',
    label: 'Standard',
    description: 'Accept simple payments without anything extra. Trusted by more than 2 million businesses globally.',
    icon: 'bi-credit-card',
    category: 'general',
    highlights: ['Simple checkout', 'Card & cash payments', 'Basic reporting', 'Receipt printing'],
    featureFlags: STANDARD_MODE,
  },
];

export const DEVICE_POS_MODE_ROUTES: Record<DevicePosMode, string> = {
  standard: '/register',
  quick_service: '/quick-service',
  full_service: '/pos',
  bar: '/bar',
  catering: '/app/catering',
  bookings: '/bookings-terminal',
  retail: '/retail',
  services: '/invoicing',
};

// --- Platform Complexity ---

export type PlatformComplexity =
  | 'full'
  | 'catalog'
  | 'payments_only';

// --- Merchant Profile ---

export interface MerchantProfile {
  id: string;
  businessName: string;
  address: BusinessAddress | null;
  verticals: BusinessVertical[];
  primaryVertical: BusinessVertical;
  complexity: PlatformComplexity;
  enabledModules: PlatformModule[];
  defaultDeviceMode: DevicePosMode;
  taxLocale: TaxLocaleConfig;
  businessHours: BusinessHoursDay[];
  onboardingComplete: boolean;
  createdAt: string;
  businessCategory?: string | null;
  defaultBrandingLogoUrl?: string | null;
  defaultBrandingColor?: string | null;
  defaultInvoiceNotes?: string | null;
}

export interface BusinessAddress {
  street: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  timezone: string;
  phone: string | null;
  lat: number | null;
  lng: number | null;
}

export interface TaxLocaleConfig {
  taxRate: number;
  taxInclusive: boolean;
  currency: string;
  defaultLanguage: 'en' | 'es';
}

export interface BusinessHoursDay {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  open: string;
  close: string;
  closed: boolean;
}

// --- Device Mode Assignment ---

export interface DeviceModeAssignment {
  deviceId: string;
  mode: DevicePosMode;
  featureFlagOverrides: Partial<ModeFeatureFlags>;
  assignedAt: string;
  assignedBy: string;
}

// --- Onboarding ---

export interface OnboardingPinData {
  displayName: string;
  pin: string;
  role: 'owner' | 'manager' | 'staff';
}

// --- Menu Templates ---

export interface MenuTemplate {
  id: string;
  vertical: BusinessVertical;
  name: string;
  description: string;
  categories: MenuTemplateCategory[];
  itemCount: number;
}

export interface MenuTemplateCategory {
  name: string;
  sortOrder: number;
  items: MenuTemplateItem[];
}

export interface MenuTemplateItem {
  name: string;
  description: string | null;
  price: number;
  sortOrder: number;
  prepTimeMinutes: number | null;
  sku: string | null;
  durationMinutes: number | null;
}

// --- Starter Menu Templates ---

export const MENU_TEMPLATES: MenuTemplate[] = [
  {
    id: 'casual-dining',
    vertical: 'food_and_drink',
    name: 'Casual Dining',
    description: 'Full-service restaurant with appetizers, entrees, desserts, and drinks.',
    itemCount: 24,
    categories: [
      {
        name: 'Appetizers', sortOrder: 1, items: [
          { name: 'Wings', description: 'Choice of Buffalo, BBQ, or Garlic Parmesan', price: 12.99, sortOrder: 1, prepTimeMinutes: 15, sku: null, durationMinutes: null },
          { name: 'Mozzarella Sticks', description: 'Served with marinara', price: 9.99, sortOrder: 2, prepTimeMinutes: 10, sku: null, durationMinutes: null },
          { name: 'Nachos', description: 'Loaded with cheese, jalapeños, sour cream', price: 11.99, sortOrder: 3, prepTimeMinutes: 12, sku: null, durationMinutes: null },
          { name: 'Soup of the Day', description: null, price: 6.99, sortOrder: 4, prepTimeMinutes: 5, sku: null, durationMinutes: null },
        ],
      },
      {
        name: 'Entrees', sortOrder: 2, items: [
          { name: 'Grilled Chicken', description: 'With seasonal vegetables and rice', price: 16.99, sortOrder: 1, prepTimeMinutes: 20, sku: null, durationMinutes: null },
          { name: 'Salmon', description: 'Pan-seared with lemon butter sauce', price: 22.99, sortOrder: 2, prepTimeMinutes: 18, sku: null, durationMinutes: null },
          { name: 'Ribeye Steak', description: '12oz with mashed potatoes', price: 28.99, sortOrder: 3, prepTimeMinutes: 25, sku: null, durationMinutes: null },
          { name: 'Pasta Primavera', description: 'Penne with sautéed vegetables in cream sauce', price: 14.99, sortOrder: 4, prepTimeMinutes: 15, sku: null, durationMinutes: null },
          { name: 'Fish & Chips', description: 'Beer-battered cod with fries and coleslaw', price: 15.99, sortOrder: 5, prepTimeMinutes: 18, sku: null, durationMinutes: null },
          { name: 'Burger', description: 'Half-pound Angus beef with lettuce, tomato, fries', price: 14.99, sortOrder: 6, prepTimeMinutes: 15, sku: null, durationMinutes: null },
        ],
      },
      {
        name: 'Sides', sortOrder: 3, items: [
          { name: 'French Fries', description: null, price: 4.99, sortOrder: 1, prepTimeMinutes: 8, sku: null, durationMinutes: null },
          { name: 'Side Salad', description: 'Mixed greens with house dressing', price: 5.99, sortOrder: 2, prepTimeMinutes: 5, sku: null, durationMinutes: null },
          { name: 'Onion Rings', description: null, price: 5.99, sortOrder: 3, prepTimeMinutes: 8, sku: null, durationMinutes: null },
          { name: 'Mac & Cheese', description: null, price: 5.99, sortOrder: 4, prepTimeMinutes: 10, sku: null, durationMinutes: null },
        ],
      },
      {
        name: 'Desserts', sortOrder: 4, items: [
          { name: 'Chocolate Cake', description: 'Triple layer with ganache', price: 8.99, sortOrder: 1, prepTimeMinutes: 5, sku: null, durationMinutes: null },
          { name: 'Cheesecake', description: 'New York style with berry compote', price: 8.99, sortOrder: 2, prepTimeMinutes: 5, sku: null, durationMinutes: null },
          { name: 'Ice Cream Sundae', description: 'Vanilla, chocolate, or strawberry', price: 6.99, sortOrder: 3, prepTimeMinutes: 5, sku: null, durationMinutes: null },
        ],
      },
      {
        name: 'Drinks', sortOrder: 5, items: [
          { name: 'Soft Drink', description: 'Coke, Sprite, Dr Pepper, Lemonade', price: 2.99, sortOrder: 1, prepTimeMinutes: 1, sku: null, durationMinutes: null },
          { name: 'Iced Tea', description: 'Sweet or unsweetened', price: 2.99, sortOrder: 2, prepTimeMinutes: 1, sku: null, durationMinutes: null },
          { name: 'Coffee', description: 'Regular or decaf', price: 3.49, sortOrder: 3, prepTimeMinutes: 3, sku: null, durationMinutes: null },
          { name: 'Fresh Juice', description: 'Orange, apple, or cranberry', price: 3.99, sortOrder: 4, prepTimeMinutes: 2, sku: null, durationMinutes: null },
        ],
      },
    ],
  },
  {
    id: 'quick-service',
    vertical: 'food_and_drink',
    name: 'Quick Service',
    description: 'Counter-service restaurant with combos and grab-and-go items.',
    itemCount: 18,
    categories: [
      {
        name: 'Combos', sortOrder: 1, items: [
          { name: 'Combo #1', description: 'Burger, fries, drink', price: 10.99, sortOrder: 1, prepTimeMinutes: 8, sku: null, durationMinutes: null },
          { name: 'Combo #2', description: 'Chicken sandwich, fries, drink', price: 10.99, sortOrder: 2, prepTimeMinutes: 8, sku: null, durationMinutes: null },
          { name: 'Combo #3', description: '2 tacos, chips & salsa, drink', price: 9.99, sortOrder: 3, prepTimeMinutes: 8, sku: null, durationMinutes: null },
        ],
      },
      {
        name: 'Sandwiches', sortOrder: 2, items: [
          { name: 'Classic Burger', description: 'Beef patty with lettuce, tomato, pickles', price: 7.99, sortOrder: 1, prepTimeMinutes: 8, sku: null, durationMinutes: null },
          { name: 'Chicken Sandwich', description: 'Grilled or crispy', price: 7.99, sortOrder: 2, prepTimeMinutes: 8, sku: null, durationMinutes: null },
          { name: 'Veggie Wrap', description: 'Grilled vegetables with hummus', price: 7.49, sortOrder: 3, prepTimeMinutes: 6, sku: null, durationMinutes: null },
        ],
      },
      {
        name: 'Sides', sortOrder: 3, items: [
          { name: 'Fries', description: 'Regular or seasoned', price: 3.49, sortOrder: 1, prepTimeMinutes: 5, sku: null, durationMinutes: null },
          { name: 'Chips & Salsa', description: null, price: 3.99, sortOrder: 2, prepTimeMinutes: 2, sku: null, durationMinutes: null },
          { name: 'Coleslaw', description: null, price: 2.49, sortOrder: 3, prepTimeMinutes: 1, sku: null, durationMinutes: null },
        ],
      },
      {
        name: 'Drinks', sortOrder: 4, items: [
          { name: 'Fountain Drink', description: 'Small, Medium, Large', price: 1.99, sortOrder: 1, prepTimeMinutes: 1, sku: null, durationMinutes: null },
          { name: 'Bottled Water', description: null, price: 1.49, sortOrder: 2, prepTimeMinutes: 1, sku: null, durationMinutes: null },
          { name: 'Milkshake', description: 'Chocolate, vanilla, or strawberry', price: 4.99, sortOrder: 3, prepTimeMinutes: 3, sku: null, durationMinutes: null },
        ],
      },
      {
        name: 'Extras', sortOrder: 5, items: [
          { name: 'Extra Cheese', description: null, price: 0.99, sortOrder: 1, prepTimeMinutes: 0, sku: null, durationMinutes: null },
          { name: 'Bacon', description: null, price: 1.49, sortOrder: 2, prepTimeMinutes: 0, sku: null, durationMinutes: null },
          { name: 'Avocado', description: null, price: 1.49, sortOrder: 3, prepTimeMinutes: 0, sku: null, durationMinutes: null },
          { name: 'Extra Patty', description: null, price: 2.99, sortOrder: 4, prepTimeMinutes: 5, sku: null, durationMinutes: null },
          { name: 'Side of Ranch', description: null, price: 0.5, sortOrder: 5, prepTimeMinutes: 0, sku: null, durationMinutes: null },
        ],
      },
    ],
  },
  {
    id: 'coffee-shop',
    vertical: 'food_and_drink',
    name: 'Coffee & Bakery',
    description: 'Café with hot and cold drinks, pastries, and light bites.',
    itemCount: 20,
    categories: [
      {
        name: 'Hot Drinks', sortOrder: 1, items: [
          { name: 'Drip Coffee', description: 'House blend, single origin available', price: 3.49, sortOrder: 1, prepTimeMinutes: 2, sku: null, durationMinutes: null },
          { name: 'Latte', description: 'Espresso with steamed milk', price: 4.99, sortOrder: 2, prepTimeMinutes: 4, sku: null, durationMinutes: null },
          { name: 'Cappuccino', description: 'Espresso with foamed milk', price: 4.99, sortOrder: 3, prepTimeMinutes: 4, sku: null, durationMinutes: null },
          { name: 'Americano', description: 'Espresso with hot water', price: 3.99, sortOrder: 4, prepTimeMinutes: 3, sku: null, durationMinutes: null },
          { name: 'Hot Chocolate', description: 'Rich chocolate with whipped cream', price: 4.49, sortOrder: 5, prepTimeMinutes: 3, sku: null, durationMinutes: null },
          { name: 'Tea', description: 'Green, black, chamomile, or Earl Grey', price: 2.99, sortOrder: 6, prepTimeMinutes: 2, sku: null, durationMinutes: null },
        ],
      },
      {
        name: 'Cold Drinks', sortOrder: 2, items: [
          { name: 'Iced Coffee', description: 'House blend over ice', price: 3.99, sortOrder: 1, prepTimeMinutes: 2, sku: null, durationMinutes: null },
          { name: 'Iced Latte', description: 'Espresso with cold milk over ice', price: 5.49, sortOrder: 2, prepTimeMinutes: 3, sku: null, durationMinutes: null },
          { name: 'Cold Brew', description: '12-hour steeped, smooth and bold', price: 4.49, sortOrder: 3, prepTimeMinutes: 1, sku: null, durationMinutes: null },
          { name: 'Smoothie', description: 'Mango, strawberry, or mixed berry', price: 5.99, sortOrder: 4, prepTimeMinutes: 4, sku: null, durationMinutes: null },
        ],
      },
      {
        name: 'Pastries', sortOrder: 3, items: [
          { name: 'Croissant', description: 'Butter or chocolate', price: 3.49, sortOrder: 1, prepTimeMinutes: 1, sku: null, durationMinutes: null },
          { name: 'Muffin', description: 'Blueberry, banana nut, or chocolate chip', price: 3.49, sortOrder: 2, prepTimeMinutes: 1, sku: null, durationMinutes: null },
          { name: 'Scone', description: 'Seasonal flavor', price: 3.49, sortOrder: 3, prepTimeMinutes: 1, sku: null, durationMinutes: null },
          { name: 'Cinnamon Roll', description: 'Freshly baked with cream cheese icing', price: 4.49, sortOrder: 4, prepTimeMinutes: 1, sku: null, durationMinutes: null },
        ],
      },
      {
        name: 'Light Bites', sortOrder: 4, items: [
          { name: 'Avocado Toast', description: 'Sourdough with everything seasoning', price: 7.99, sortOrder: 1, prepTimeMinutes: 5, sku: null, durationMinutes: null },
          { name: 'Breakfast Sandwich', description: 'Egg, cheese, choice of bacon or sausage', price: 6.99, sortOrder: 2, prepTimeMinutes: 8, sku: null, durationMinutes: null },
          { name: 'Yogurt Parfait', description: 'Greek yogurt with granola and berries', price: 5.99, sortOrder: 3, prepTimeMinutes: 3, sku: null, durationMinutes: null },
          { name: 'Bagel & Cream Cheese', description: 'Plain, everything, or sesame', price: 3.99, sortOrder: 4, prepTimeMinutes: 2, sku: null, durationMinutes: null },
        ],
      },
    ],
  },
  {
    id: 'bar-grill',
    vertical: 'food_and_drink',
    name: 'Bar & Grill',
    description: 'Sports bar with pub food, beer, wine, and cocktails.',
    itemCount: 22,
    categories: [
      {
        name: 'Starters', sortOrder: 1, items: [
          { name: 'Wings', description: '10 piece, choice of sauce', price: 13.99, sortOrder: 1, prepTimeMinutes: 15, sku: null, durationMinutes: null },
          { name: 'Loaded Fries', description: 'Cheese, bacon, sour cream, green onion', price: 9.99, sortOrder: 2, prepTimeMinutes: 10, sku: null, durationMinutes: null },
          { name: 'Pretzel Bites', description: 'With beer cheese dip', price: 8.99, sortOrder: 3, prepTimeMinutes: 8, sku: null, durationMinutes: null },
          { name: 'Quesadilla', description: 'Chicken or steak with pico de gallo', price: 10.99, sortOrder: 4, prepTimeMinutes: 10, sku: null, durationMinutes: null },
        ],
      },
      {
        name: 'Burgers & Sandwiches', sortOrder: 2, items: [
          { name: 'Classic Burger', description: 'Angus beef, lettuce, tomato, pickle, fries', price: 13.99, sortOrder: 1, prepTimeMinutes: 12, sku: null, durationMinutes: null },
          { name: 'BBQ Bacon Burger', description: 'BBQ sauce, bacon, cheddar, onion rings', price: 15.99, sortOrder: 2, prepTimeMinutes: 14, sku: null, durationMinutes: null },
          { name: 'Philly Cheesesteak', description: 'Shaved ribeye, peppers, onions, provolone', price: 14.99, sortOrder: 3, prepTimeMinutes: 12, sku: null, durationMinutes: null },
          { name: 'Crispy Chicken Sandwich', description: 'Spicy mayo, pickles, brioche bun', price: 12.99, sortOrder: 4, prepTimeMinutes: 12, sku: null, durationMinutes: null },
        ],
      },
      {
        name: 'Beer', sortOrder: 3, items: [
          { name: 'Draft Beer', description: 'Ask about today\'s rotating taps', price: 6.99, sortOrder: 1, prepTimeMinutes: 1, sku: null, durationMinutes: null },
          { name: 'Domestic Bottle', description: 'Bud Light, Coors Light, Miller Lite', price: 4.99, sortOrder: 2, prepTimeMinutes: 1, sku: null, durationMinutes: null },
          { name: 'Import/Craft Bottle', description: 'Rotating selection', price: 6.99, sortOrder: 3, prepTimeMinutes: 1, sku: null, durationMinutes: null },
          { name: 'Bucket (5)', description: '5 domestic bottles', price: 19.99, sortOrder: 4, prepTimeMinutes: 1, sku: null, durationMinutes: null },
        ],
      },
      {
        name: 'Cocktails', sortOrder: 4, items: [
          { name: 'Margarita', description: 'Classic lime, frozen or on the rocks', price: 9.99, sortOrder: 1, prepTimeMinutes: 3, sku: null, durationMinutes: null },
          { name: 'Old Fashioned', description: 'Bourbon, bitters, orange, cherry', price: 11.99, sortOrder: 2, prepTimeMinutes: 3, sku: null, durationMinutes: null },
          { name: 'Moscow Mule', description: 'Vodka, ginger beer, lime', price: 9.99, sortOrder: 3, prepTimeMinutes: 3, sku: null, durationMinutes: null },
          { name: 'Long Island Iced Tea', description: null, price: 10.99, sortOrder: 4, prepTimeMinutes: 3, sku: null, durationMinutes: null },
        ],
      },
      {
        name: 'Wine', sortOrder: 5, items: [
          { name: 'House Red', description: 'Cabernet Sauvignon', price: 7.99, sortOrder: 1, prepTimeMinutes: 1, sku: null, durationMinutes: null },
          { name: 'House White', description: 'Chardonnay', price: 7.99, sortOrder: 2, prepTimeMinutes: 1, sku: null, durationMinutes: null },
        ],
      },
    ],
  },
];

// --- Navigation ---

export interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  requiredModule?: PlatformModule;
  requiredFeatureFlag?: keyof ModeFeatureFlags;
  verticals?: BusinessVertical[];
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: 'Dashboard', icon: 'bi-grid', route: '/administration' },
  { label: 'Orders', icon: 'bi-receipt', route: '/orders' },
  { label: 'Customers', icon: 'bi-people', route: '/customers', requiredModule: 'crm' },
  { label: 'Reports', icon: 'bi-bar-chart', route: '/reports', requiredModule: 'reports' },
  { label: 'Team', icon: 'bi-person-badge', route: '/team', requiredModule: 'staff_scheduling' },
  { label: 'Settings', icon: 'bi-gear', route: '/settings' },
  { label: 'Menu', icon: 'bi-book', route: '/menu', requiredModule: 'menu_management', verticals: ['food_and_drink'] },
  { label: 'Floor Plan', icon: 'bi-grid-3x3', route: '/floor-plan', requiredFeatureFlag: 'enableFloorPlan' },
  { label: 'KDS', icon: 'bi-display', route: '/kds', requiredFeatureFlag: 'enableKds' },
  { label: 'Bookings', icon: 'bi-calendar-event', route: '/bookings', requiredModule: 'bookings' },
  { label: 'Catalog', icon: 'bi-box', route: '/catalog', verticals: ['retail', 'grocery'] },
  { label: 'Appointments', icon: 'bi-calendar-check', route: '/appointments', requiredFeatureFlag: 'enableAppointmentBooking' },
  { label: 'Invoices', icon: 'bi-receipt-cutoff', route: '/invoices', requiredModule: 'invoicing' },
];

// --- Helper Functions ---

export function getModePreset(mode: DevicePosMode): ModeFeatureFlags {
  return MODE_PRESET_MAP[mode];
}

export function getModesForVerticals(verticals: BusinessVertical[]): DevicePosMode[] {
  const modeSet = new Set<DevicePosMode>();
  for (const vertical of verticals) {
    const config = BUSINESS_VERTICAL_CATALOG.find(c => c.vertical === vertical);
    if (config) {
      for (const mode of config.availableModes) {
        modeSet.add(mode);
      }
    }
  }
  return [...modeSet];
}

export function getModulesForVerticals(verticals: BusinessVertical[]): PlatformModule[] {
  const moduleSet = new Set<PlatformModule>();
  for (const vertical of verticals) {
    const config = BUSINESS_VERTICAL_CATALOG.find(c => c.vertical === vertical);
    if (config) {
      for (const mod of config.enabledModules) {
        moduleSet.add(mod);
      }
    }
  }
  return [...moduleSet];
}

export function defaultBusinessAddress(): BusinessAddress {
  return {
    street: '',
    street2: null,
    city: '',
    state: '',
    zip: '',
    country: 'US',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    phone: null,
    lat: null,
    lng: null,
  };
}

export function defaultTaxLocaleConfig(): TaxLocaleConfig {
  return {
    taxRate: 0,
    taxInclusive: false,
    currency: 'USD',
    defaultLanguage: 'en',
  };
}

export function defaultBusinessHours(): BusinessHoursDay[] {
  const days: BusinessHoursDay['day'][] = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  ];
  return days.map(day => ({
    day,
    open: '09:00',
    close: '17:00',
    closed: false,
  }));
}

export function defaultMerchantProfile(): MerchantProfile {
  return {
    id: '',
    businessName: '',
    address: defaultBusinessAddress(),
    verticals: ['food_and_drink'],
    primaryVertical: 'food_and_drink',
    complexity: 'full',
    enabledModules: getModulesForVerticals(['food_and_drink']),
    defaultDeviceMode: 'full_service',
    taxLocale: defaultTaxLocaleConfig(),
    businessHours: defaultBusinessHours(),
    onboardingComplete: true,
    createdAt: new Date().toISOString(),
    businessCategory: null,
  };
}

// --- Business Categories (Square-style business type selector) ---

export interface BusinessCategory {
  name: string;
  vertical: BusinessVertical;
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  // Food and Drink
  { name: 'Caterer', vertical: 'food_and_drink' },
  { name: 'Food Truck / Cart', vertical: 'food_and_drink' },
  { name: 'Bakery / Pastry Shop', vertical: 'food_and_drink' },
  { name: 'Bar', vertical: 'food_and_drink' },
  { name: 'Coffee / Tea Cafe', vertical: 'food_and_drink' },
  { name: 'Fine Dining', vertical: 'food_and_drink' },
  { name: 'Full Service Restaurant', vertical: 'food_and_drink' },
  { name: 'Fast Food Restaurant', vertical: 'food_and_drink' },
  { name: 'Counter Service Restaurant', vertical: 'food_and_drink' },
  { name: 'Ghost / Virtual Kitchen', vertical: 'food_and_drink' },
  { name: 'Brewery', vertical: 'food_and_drink' },
  { name: 'Club / Lounge', vertical: 'food_and_drink' },
  { name: 'Other Food & Drink', vertical: 'food_and_drink' },

  // Retail
  { name: 'Specialty Shop', vertical: 'retail' },
  { name: 'Electronics', vertical: 'retail' },
  { name: 'Clothing and Accessories', vertical: 'retail' },
  { name: 'Outdoor Markets', vertical: 'retail' },
  { name: 'Books / Mags / Music / Video', vertical: 'retail' },
  { name: 'Jewelry and Watches', vertical: 'retail' },
  { name: 'Beer / Wine Bottle Shops', vertical: 'retail' },
  { name: 'Baby / Children\'s Goods', vertical: 'retail' },
  { name: 'Sporting Goods', vertical: 'retail' },
  { name: 'Antique Shop', vertical: 'retail' },
  { name: 'Art / Photo / Film Shop', vertical: 'retail' },
  { name: 'Beauty Supplies', vertical: 'retail' },
  { name: 'Convenience Store', vertical: 'retail' },
  { name: 'Eyewear', vertical: 'retail' },
  { name: 'Flowers and Gifts', vertical: 'retail' },
  { name: 'Furniture / Home Goods', vertical: 'retail' },
  { name: 'Grocery / Market', vertical: 'retail' },
  { name: 'Hobby / Toy / Game Shop', vertical: 'retail' },
  { name: 'Pet Store', vertical: 'retail' },
  { name: 'Other Retail', vertical: 'retail' },

  // Professional Services
  { name: 'Consulting', vertical: 'professional_services' },
  { name: 'Software Development', vertical: 'professional_services' },
  { name: 'Art and Design', vertical: 'professional_services' },
  { name: 'Marketing / Advertising', vertical: 'professional_services' },
  { name: 'Accounting', vertical: 'professional_services' },
  { name: 'Architect', vertical: 'professional_services' },
  { name: 'Photography', vertical: 'professional_services' },
  { name: 'Printing Services', vertical: 'professional_services' },
  { name: 'Real Estate', vertical: 'professional_services' },
  { name: 'Interior Design', vertical: 'professional_services' },
  { name: 'Child Care', vertical: 'professional_services' },
  { name: 'Graphic Design', vertical: 'professional_services' },
  { name: 'Car Washes', vertical: 'professional_services' },
  { name: 'Delivery', vertical: 'professional_services' },
  { name: 'Other Professional Services', vertical: 'professional_services' },

  // Healthcare
  { name: 'Audiology', vertical: 'healthcare' },
  { name: 'Anesthesiology', vertical: 'healthcare' },
  { name: 'Chiropractor', vertical: 'healthcare' },
  { name: 'Cardiology', vertical: 'healthcare' },
  { name: 'Dentistry', vertical: 'healthcare' },
  { name: 'Emergency Medicine', vertical: 'healthcare' },
  { name: 'Family Medicine', vertical: 'healthcare' },
  { name: 'Nutrition / Dietetics', vertical: 'healthcare' },
  { name: 'Obstetrics / Gynecology', vertical: 'healthcare' },
  { name: 'Optometry / Eyewear', vertical: 'healthcare' },
  { name: 'Pathology', vertical: 'healthcare' },
  { name: 'Psychotherapy', vertical: 'healthcare' },
  { name: 'Other Healthcare', vertical: 'healthcare' },

  // Beauty and Personal Care
  { name: 'Blow Dry Bar', vertical: 'beauty_wellness' },
  { name: 'Brows / Lashes', vertical: 'beauty_wellness' },
  { name: 'Ear / Body Piercing', vertical: 'beauty_wellness' },
  { name: 'Hair Salon', vertical: 'beauty_wellness' },
  { name: 'Makeup Artistry', vertical: 'beauty_wellness' },
  { name: 'Nail Salon', vertical: 'beauty_wellness' },
  { name: 'Skin Care / Esthetics', vertical: 'beauty_wellness' },
  { name: 'Tanning Salon', vertical: 'beauty_wellness' },
  { name: 'Body Grooming', vertical: 'beauty_wellness' },
  { name: 'Day Spa', vertical: 'beauty_wellness' },
  { name: 'Barber Shop', vertical: 'beauty_wellness' },
  { name: 'Other Beauty & Personal Care', vertical: 'beauty_wellness' },

  // Fitness
  { name: 'Barre', vertical: 'sports_fitness' },
  { name: 'Boxing Gym', vertical: 'sports_fitness' },
  { name: 'Dance Studio', vertical: 'sports_fitness' },
  { name: 'Fitness Studio', vertical: 'sports_fitness' },
  { name: 'Gym / Health Club', vertical: 'sports_fitness' },
  { name: 'Martial Arts', vertical: 'sports_fitness' },
  { name: 'Pilates Studio', vertical: 'sports_fitness' },
  { name: 'Swimming / Water Aerobics', vertical: 'sports_fitness' },
  { name: 'Yoga Studio', vertical: 'sports_fitness' },
  { name: 'Other Fitness', vertical: 'sports_fitness' },

  // Home and Repair
  { name: 'Automotive Services', vertical: 'home_repair' },
  { name: 'Cleaning', vertical: 'home_repair' },
  { name: 'Clothing / Shoe Repair / Alterations', vertical: 'home_repair' },
  { name: 'Computer / Electronics / Appliances', vertical: 'home_repair' },
  { name: 'Flooring', vertical: 'home_repair' },
  { name: 'Heating and Air Conditioning', vertical: 'home_repair' },
  { name: 'Installation Services', vertical: 'home_repair' },
  { name: 'Locksmith Services', vertical: 'home_repair' },
  { name: 'Moving and Storage', vertical: 'home_repair' },
  { name: 'Plumbing', vertical: 'home_repair' },
  { name: 'Towing Services', vertical: 'home_repair' },
  { name: 'Other Home & Repair', vertical: 'home_repair' },

  // Leisure and Entertainment
  { name: 'Events / Festivals', vertical: 'professional_services' },
  { name: 'Movies / Film', vertical: 'professional_services' },
  { name: 'Museum / Cultural', vertical: 'professional_services' },
  { name: 'Music', vertical: 'professional_services' },
  { name: 'Performing Arts', vertical: 'professional_services' },
  { name: 'Sports Recreation', vertical: 'professional_services' },
  { name: 'Tourism', vertical: 'professional_services' },
  { name: 'Other Leisure & Entertainment', vertical: 'professional_services' },

  // Charities, Education and Membership
  { name: 'Charitable Organization', vertical: 'professional_services' },
  { name: 'Instructor / Teacher', vertical: 'professional_services' },
  { name: 'Membership Organization', vertical: 'professional_services' },
  { name: 'School', vertical: 'professional_services' },
  { name: 'Tutor', vertical: 'professional_services' },
  { name: 'Other Education & Membership', vertical: 'professional_services' },

  // Pet Care
  { name: 'Pet Boarding / Daycare', vertical: 'professional_services' },
  { name: 'Pet Sitting', vertical: 'professional_services' },
  { name: 'Pet Store (Services)', vertical: 'professional_services' },
  { name: 'Other Pet Care', vertical: 'professional_services' },

  // Transportation
  { name: 'Bus', vertical: 'professional_services' },
  { name: 'Delivery Service', vertical: 'professional_services' },
  { name: 'Private Shuttle', vertical: 'professional_services' },
  { name: 'Taxi', vertical: 'professional_services' },
  { name: 'Town Car', vertical: 'professional_services' },
  { name: 'Other Transportation', vertical: 'professional_services' },

  // Casual Use
  { name: 'Miscellaneous Goods', vertical: 'retail' },
  { name: 'Miscellaneous Services', vertical: 'professional_services' },
  { name: 'Other', vertical: 'professional_services' },
];

// --- Revenue Ranges ---

export interface RevenueRange {
  id: string;
  label: string;
  description: string;
}

export const REVENUE_RANGES: RevenueRange[] = [
  { id: 'under_100k', label: 'Less than $100K', description: 'Just getting started or small operation' },
  { id: '100k_250k', label: '$100K – $250K', description: 'Growing business' },
  { id: '250k_1m', label: '$250K – $1M', description: 'Established business' },
  { id: '1m_5m', label: '$1M – $5M', description: 'Multi-unit or high-volume' },
  { id: 'over_5m', label: '$5M+', description: 'Enterprise' },
  { id: 'not_sure', label: 'Not sure yet', description: 'We\'ll figure it out together' },
];

// --- Signup Data ---

export interface SignupData {
  verifiedEmailToken?: string;
  firstName: string;
  lastName: string;
  password: string;
  businessPhone: string;
  personalPhone: string;
  businessName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  multipleLocations: boolean;
}
