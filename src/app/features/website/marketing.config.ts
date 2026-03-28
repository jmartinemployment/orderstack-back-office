// ============================================================================
// NAVIGATION
// ============================================================================

export interface NavLink {
  label: string;
  route: string;
  external?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Home', route: '/' },
  { label: 'Features', route: '/features' },
  { label: 'Pricing', route: '/pricing' },
  { label: 'Demo', route: '/demo' },
  { label: 'Blog', route: '/blog' },
];

export const NAV_CTA = {
  label: 'Start Free Trial',
  route: '/signup',
};

export const NAV_LOGIN = {
  label: 'Sign In',
  route: '/login',
};

// ============================================================================
// FOOTER
// ============================================================================

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', route: '/features' },
      { label: 'Pricing', route: '/pricing' },
      { label: 'Demo', route: '/demo' },
      { label: 'Integrations', route: '/integrations' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Full-Service Restaurants', route: '/solutions/full-service' },
      { label: 'Quick-Service', route: '/solutions/quick-service' },
      { label: 'Bars & Nightlife', route: '/solutions/bar' },
      { label: 'Retail & Shops', route: '/solutions/retail' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog', route: '/blog' },
      { label: 'Help Center', route: '/help' },
      { label: 'API Docs', route: '/docs', external: true },
      { label: 'Status', route: '/status', external: true },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', route: '/about' },
      { label: 'Contact', route: '/contact' },
      { label: 'Careers', route: '/careers' },
      { label: 'Privacy', route: '/privacy' },
      { label: 'Terms', route: '/terms' },
    ],
  },
];

export const FOOTER_SOCIAL = [
  { label: 'LinkedIn', icon: 'bi-linkedin', url: 'https://linkedin.com/company/getorderstack' },
  { label: 'Twitter', icon: 'bi-twitter-x', url: 'https://x.com/getorderstack' },
  { label: 'Instagram', icon: 'bi-instagram', url: 'https://instagram.com/getorderstack' },
  { label: 'Facebook', icon: 'bi-facebook', url: 'https://facebook.com/getorderstack' },
];

export const FOOTER_COPY = {
  brand: 'OrderStack',
  tagline: 'The restaurant operating system that puts you in control.',
  copyright: `\u00A9 ${new Date().getFullYear()} OrderStack. All rights reserved.`,
};

// ============================================================================
// LANDING PAGE HERO
// ============================================================================

export const LANDING_HERO = {
  tag: 'Restaurant Operating System',
  title: 'Stop Losing Money to Third-Party Fees',
  subtitle:
    'OrderStack gives restaurants their own POS, online ordering, KDS, and delivery \u2014 ' +
    'with zero marketplace commissions. Keep 100% of your revenue.',
  primaryCta: { label: 'Start Free Trial', route: '/signup' },
  secondaryCta: { label: 'Watch Demo', route: '/demo' },
};

// ============================================================================
// PAGE TITLES (future prompts fill these in)
// ============================================================================

export const PAGE_TITLES: Record<string, string> = {
  landing: 'OrderStack \u2014 Restaurant Operating System',
  pricing: 'Pricing \u2014 OrderStack',
  demo: 'Interactive Demo \u2014 OrderStack',
  blog: 'Blog \u2014 OrderStack',
  features: 'Features \u2014 OrderStack',
};

// ============================================================================
// SOCIAL PROOF BAR
// ============================================================================

export interface TrustSignal {
  label: string;
  icon: string;
}

export const TRUST_SIGNALS: TrustSignal[] = [
  { label: 'No Long-Term Contracts', icon: 'bi-file-earmark-x' },
  { label: 'Free to Start', icon: 'bi-gift' },
  { label: 'PayPal Ready', icon: 'bi-credit-card-2-front' },
  { label: 'BYOD \u2014 Use Your Own Devices', icon: 'bi-phone' },
  { label: 'Setup in Minutes', icon: 'bi-lightning' },
];

// ============================================================================
// PAIN POINTS
// ============================================================================

export interface PainPoint {
  id: string;
  icon: string;
  title: string;
  description: string;
  stat: string;
  statLabel: string;
}

export const PAIN_POINTS_HEADER = {
  tag: 'The Problem',
  title: 'Restaurants Are Losing Money Every Day',
  subtitle: 'Third-party platforms and disconnected tools are eating into your margins.',
};

export const PAIN_POINTS: PainPoint[] = [
  {
    id: 'fees',
    icon: 'bi-cash-stack',
    title: 'Marketplace Commissions',
    description:
      'DoorDash, Uber Eats, and Grubhub take 15\u201330% of every order. ' +
      'On a $50 delivery, you could lose $15 before food cost.',
    stat: '30%',
    statLabel: 'avg. commission per order',
  },
  {
    id: 'fragmented',
    icon: 'bi-puzzle',
    title: 'Fragmented Systems',
    description:
      'Separate POS, online ordering, KDS, scheduling, and inventory tools ' +
      'that don\'t talk to each other \u2014 creating double-entry and blind spots.',
    stat: '5+',
    statLabel: 'tools the avg. restaurant juggles',
  },
  {
    id: 'data',
    icon: 'bi-lock',
    title: 'You Don\'t Own Your Data',
    description:
      'Third-party platforms own your customer list, order history, and insights. ' +
      'When you leave, your data stays behind.',
    stat: '0%',
    statLabel: 'of customer data you keep on marketplaces',
  },
];

// ============================================================================
// FEATURE HIGHLIGHTS
// ============================================================================

export interface FeatureHighlight {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export const FEATURES_HEADER = {
  tag: 'All-in-One Platform',
  title: 'Everything You Need to Run Your Restaurant',
  subtitle: 'One system. One login. One bill.',
};

export const FEATURE_HIGHLIGHTS: FeatureHighlight[] = [
  {
    id: 'pos',
    icon: 'bi-tv',
    title: 'Point of Sale',
    description:
      'Full-service, quick-service, bar, and register modes. ' +
      'Floor plans, modifiers, split checks, and tipping built in.',
  },
  {
    id: 'online',
    icon: 'bi-globe',
    title: 'Online Ordering',
    description:
      'Your own branded ordering portal \u2014 no commissions. ' +
      'Pickup, delivery, and dine-in QR code ordering.',
  },
  {
    id: 'kds',
    icon: 'bi-display',
    title: 'Kitchen Display System',
    description:
      'Real-time order routing to kitchen stations. ' +
      'Priority queues, prep timers, and bump-bar support.',
  },
  {
    id: 'delivery',
    icon: 'bi-truck',
    title: 'Delivery Management',
    description:
      'Dispatch drivers via DoorDash Drive or Uber Direct \u2014 ' +
      'without the marketplace commission. You keep the margin.',
  },
  {
    id: 'analytics',
    icon: 'bi-bar-chart-line',
    title: 'Analytics & Reports',
    description:
      'Sales dashboards, menu engineering, food cost tracking, ' +
      'and close-of-day reports. Know your numbers in real time.',
  },
  {
    id: 'staff',
    icon: 'bi-people',
    title: 'Staff & Scheduling',
    description:
      'Team management, role-based POS access, time clock, ' +
      'tip pooling, and labor cost tracking.',
  },
];

// ============================================================================
// STATS STRIP
// ============================================================================

export interface StatItem {
  value: string;
  label: string;
}

export const STATS: StatItem[] = [
  { value: '0%', label: 'Marketplace Commissions' },
  { value: '1', label: 'Platform for Everything' },
  { value: '5 min', label: 'Setup Time' },
  { value: '100%', label: 'Your Customer Data' },
];

// ============================================================================
// HOW IT WORKS
// ============================================================================

export interface HowItWorksStep {
  step: number;
  icon: string;
  title: string;
  description: string;
}

export const HOW_IT_WORKS_HEADER = {
  tag: 'Get Started',
  title: 'Up and Running in Three Steps',
};

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    step: 1,
    icon: 'bi-person-plus',
    title: 'Create Your Account',
    description: 'Sign up free \u2014 no credit card required. Tell us about your business.',
  },
  {
    step: 2,
    icon: 'bi-sliders',
    title: 'Configure Your Setup',
    description:
      'Add your menu, connect payment processing, set up floor plans and stations. ' +
      'The setup wizard walks you through it.',
  },
  {
    step: 3,
    icon: 'bi-rocket-takeoff',
    title: 'Go Live',
    description:
      'Start taking orders on any device \u2014 tablet, phone, or laptop. ' +
      'BYOD means no proprietary hardware required.',
  },
];

// ============================================================================
// FINAL CTA
// ============================================================================

export const FINAL_CTA = {
  title: 'Ready to Take Control of Your Restaurant?',
  subtitle: 'Join restaurants saving thousands by cutting out the middleman.',
  primaryCta: { label: 'Start Free Trial', route: '/signup' },
  secondaryCta: { label: 'See Pricing', route: '/pricing' },
};

// ============================================================================
// PRICING PAGE
// ============================================================================

export type BillingInterval = 'monthly' | 'annual';

export interface PricingPlan {
  id: string;
  name: string;
  monthlyCents: number;
  annualMonthlyCents: number;
  annualTotalCents: number;
  description: string;
  features: string[];
  highlighted: boolean;
  cta: { label: string; route: string };
}

export const PRICING_HERO = {
  title: 'Simple, Transparent Pricing',
  subtitle: 'No hidden fees. No long-term contracts. Cancel anytime.',
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyCents: 0,
    annualMonthlyCents: 0,
    annualTotalCents: 0,
    description: 'Everything you need to start taking orders.',
    features: [
      'POS for 1 location',
      'Unlimited transactions',
      'Online ordering page',
      'KDS (Kitchen Display)',
      'Basic reporting',
      'Email support',
    ],
    highlighted: false,
    cta: { label: 'Get Started Free', route: '/signup' },
  },
  {
    id: 'plus',
    name: 'Plus',
    monthlyCents: 2900,
    annualMonthlyCents: 2417,
    annualTotalCents: 29000,
    description: 'For growing restaurants that need more power.',
    features: [
      'Everything in Free, plus:',
      'Multi-location management',
      'Advanced analytics & reports',
      'Staff scheduling & labor tools',
      'Loyalty program',
      'Marketing automations',
      'Inventory management',
      'Priority support',
    ],
    highlighted: true,
    cta: { label: 'Start Free Trial', route: '/signup' },
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyCents: 7900,
    annualMonthlyCents: 6583,
    annualTotalCents: 79000,
    description: 'Full platform for multi-unit and high-volume operations.',
    features: [
      'Everything in Plus, plus:',
      'Menu engineering & AI insights',
      'Course-based firing',
      'Food cost tracking',
      'Franchise compliance tools',
      'Custom reporting & exports',
      'Dedicated account manager',
    ],
    highlighted: false,
    cta: { label: 'Start Free Trial', route: '/signup' },
  },
];

// ============================================================================
// PROCESSING RATES
// ============================================================================

export interface ProcessingRate {
  type: string;
  description: string;
  rate: string;
}

export const PROCESSING_RATES_HEADER = {
  title: 'Processing Rates',
  subtitle: 'One transparent rate. No surprise fees. Same rate on every plan.',
};

export const PROCESSING_RATES: ProcessingRate[] = [
  {
    type: 'In-Person',
    description: 'Tap, dip, or swipe at the terminal',
    rate: '3.29% + 49\u00A2',
  },
  {
    type: 'Online',
    description: 'Orders placed through your online portal',
    rate: '3.79% + 49\u00A2',
  },
  {
    type: 'Keyed-In',
    description: 'Manually entered card numbers',
    rate: '3.80% + 49\u00A2',
  },
];

export const PROCESSING_RATES_NOTE = 'Same rate on every plan. No volume tiers. No hidden surcharges.';

// ============================================================================
// COMPETITOR COMPARISON
// ============================================================================

export interface CompetitorRow {
  feature: string;
  orderstack: string | boolean;
  toast: string | boolean;
  square: string | boolean;
}

export const COMPETITOR_HEADER = {
  tag: 'Compare',
  title: 'How OrderStack Stacks Up',
  subtitle: 'See how we compare to the industry incumbents.',
};

export const COMPETITOR_ROWS: CompetitorRow[] = [
  { feature: 'Monthly starting price', orderstack: 'Free', toast: '$0 (with lock-in)', square: 'Free' },
  { feature: 'In-person processing', orderstack: '3.29% + 49\u00A2', toast: '2.49% + 15\u00A2', square: '2.6% + 10\u00A2' },
  { feature: 'Online ordering commission', orderstack: '0%', toast: '0% (own channel)', square: '0% (own channel)' },
  { feature: 'Marketplace commissions', orderstack: '0% \u2014 use DaaS instead', toast: 'Up to 30%', square: 'N/A' },
  { feature: 'Hardware required', orderstack: 'No \u2014 BYOD', toast: 'Yes \u2014 proprietary', square: 'Yes \u2014 proprietary' },
  { feature: 'Long-term contract', orderstack: false, toast: true, square: false },
  { feature: 'KDS included', orderstack: true, toast: 'Add-on ($25/mo)', square: 'Add-on' },
  { feature: 'Multi-location', orderstack: true, toast: true, square: true },
  { feature: 'Delivery dispatch (DaaS)', orderstack: true, toast: true, square: false },
  { feature: 'Staff scheduling', orderstack: true, toast: 'Add-on', square: 'Add-on ($35/mo)' },
  { feature: 'Loyalty program', orderstack: true, toast: 'Add-on', square: 'Add-on ($45/mo)' },
  { feature: 'Inventory management', orderstack: true, toast: true, square: true },
  { feature: 'AI insights', orderstack: true, toast: false, square: false },
  { feature: 'Own your customer data', orderstack: true, toast: 'Limited', square: 'Limited' },
];

// ============================================================================
// PRICING FAQ
// ============================================================================

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const PRICING_FAQ_HEADER = {
  title: 'Frequently Asked Questions',
};

export const PRICING_FAQS: FaqItem[] = [
  {
    id: 'free-catch',
    question: 'What\'s the catch with the Free plan?',
    answer:
      'No catch. You get a fully functional POS, online ordering, and KDS at no monthly cost. ' +
      'We make money on processing fees \u2014 the same model Square uses. ' +
      'Upgrade to Plus or Premium when you need multi-location support, advanced analytics, or marketing tools.',
  },
  {
    id: 'cancel',
    question: 'Can I cancel anytime?',
    answer:
      'Yes. There are no long-term contracts. Cancel your subscription anytime from Settings. ' +
      'You\'ll keep access through the end of your billing period.',
  },
  {
    id: 'hardware',
    question: 'Do I need to buy hardware?',
    answer:
      'No. OrderStack is BYOD (Bring Your Own Device). Use any tablet, phone, or laptop you already have. ' +
      'We support iPads, Android tablets, and desktop browsers. ' +
      'If you want dedicated hardware, we recommend compatible card readers that work with PayPal Zettle.',
  },
  {
    id: 'processing',
    question: 'Why are processing rates higher than Toast or Square?',
    answer:
      'Our processing rates include the full cost of payment handling with no hidden fees, no hardware lock-in, ' +
      'and no long-term contracts. Toast\'s lower rates come with mandatory proprietary hardware and multi-year agreements. ' +
      'When you factor in monthly add-on costs for KDS ($25), scheduling ($35), and loyalty ($45) that OrderStack includes free, ' +
      'most restaurants actually pay less with us.',
  },
  {
    id: 'switch',
    question: 'Can I switch plans later?',
    answer:
      'Yes. Upgrade or downgrade anytime. When you upgrade, you get immediate access to new features. ' +
      'When you downgrade, you keep your current plan through the end of the billing period.',
  },
  {
    id: 'trial',
    question: 'Is there a free trial for paid plans?',
    answer:
      'Yes. Plus and Premium both come with a 14-day free trial. ' +
      'No credit card required to start. You can explore all features before committing.',
  },
  {
    id: 'annual',
    question: 'How much do I save with annual billing?',
    answer:
      'Annual billing gives you 2 months free \u2014 you pay for 10 months instead of 12. ' +
      'That\'s $58 saved on Plus and $158 saved on Premium per year.',
  },
  {
    id: 'marketplace',
    question: 'How does OrderStack eliminate marketplace fees?',
    answer:
      'Instead of listing on DoorDash or Uber Eats (which charge 15\u201330% commissions), ' +
      'you take orders through your own branded online ordering portal \u2014 commission-free. ' +
      'When you need delivery drivers, we dispatch them via DoorDash Drive or Uber Direct (Delivery as a Service) ' +
      'at a flat per-delivery fee \u2014 typically $5\u20138 instead of 30% of the order.',
  },
];

// ============================================================================
// DEMO PAGE
// ============================================================================

export type DemoBusinessType = 'restaurant' | 'retail' | 'services';

export interface DemoBusinessOption {
  id: DemoBusinessType;
  label: string;
  icon: string;
}

export const DEMO_HERO = {
  title: 'See OrderStack in Action',
  subtitle: 'Explore the features built for your business \u2014 no signup required.',
};

export const DEMO_BUSINESS_TYPES: DemoBusinessOption[] = [
  { id: 'restaurant', label: 'Restaurant', icon: 'bi-cup-hot' },
  { id: 'retail', label: 'Retail', icon: 'bi-bag' },
  { id: 'services', label: 'Services', icon: 'bi-briefcase' },
];

export interface DemoWorkflowStep {
  icon: string;
  title: string;
  description: string;
}

export interface DemoFeature {
  id: string;
  title: string;
  icon: string;
  businessTypes: DemoBusinessType[];
  headline: string;
  description: string;
  steps: DemoWorkflowStep[];
  screenshotAlt: string;
}

export const DEMO_FEATURES: DemoFeature[] = [
  {
    id: 'pos',
    title: 'Point of Sale',
    icon: 'bi-tv',
    businessTypes: ['restaurant', 'retail'],
    headline: 'Fast, Flexible Checkout on Any Device',
    description:
      'Ring up orders on an iPad, Android tablet, or laptop. Full-service mode gives you ' +
      'floor plans, open checks, and coursing. Quick-service mode gives you speed \u2014 ' +
      'conversational modifiers, order numbers, and a customer-facing display.',
    steps: [
      { icon: 'bi-grid-3x3', title: 'Choose a Table or Counter', description: 'Tap a table from the floor plan or start a quick counter order.' },
      { icon: 'bi-book', title: 'Build the Order', description: 'Browse the menu, add items with modifiers, and apply discounts.' },
      { icon: 'bi-credit-card', title: 'Take Payment', description: 'Card tap/dip, cash, split checks, or open a tab.' },
      { icon: 'bi-printer', title: 'Print & Route', description: 'Receipt prints. Order fires to KDS stations automatically.' },
    ],
    screenshotAlt: 'OrderStack POS interface showing menu grid and active order',
  },
  {
    id: 'online-ordering',
    title: 'Online Ordering',
    icon: 'bi-globe',
    businessTypes: ['restaurant'],
    headline: 'Your Own Ordering Portal \u2014 Zero Commissions',
    description:
      'Customers order from your branded portal for pickup, delivery, or dine-in via QR code. ' +
      'No marketplace fees. Orders flow directly into your POS and KDS.',
    steps: [
      { icon: 'bi-qr-code', title: 'Customer Scans or Visits', description: 'QR code at the table, link on your website, or Google listing.' },
      { icon: 'bi-cart', title: 'Browse & Order', description: 'Full menu with photos, allergens, and nutrition. Apply loyalty rewards.' },
      { icon: 'bi-wallet2', title: 'Pay Online', description: 'Secure checkout with tip selection and order confirmation.' },
      { icon: 'bi-bell', title: 'Kitchen Gets the Order', description: 'Appears on KDS instantly. Customer gets real-time status updates.' },
    ],
    screenshotAlt: 'Online ordering portal showing menu categories and cart',
  },
  {
    id: 'kds',
    title: 'Kitchen Display',
    icon: 'bi-display',
    businessTypes: ['restaurant'],
    headline: 'Real-Time Order Flow to Every Station',
    description:
      'Replace paper tickets with a kitchen display system. Orders route to the right station \u2014 ' +
      'grill, fry, expo \u2014 with color-coded timers and bump-bar support.',
    steps: [
      { icon: 'bi-arrow-right-circle', title: 'Order Arrives', description: 'New orders appear instantly, sorted by priority and time.' },
      { icon: 'bi-palette', title: 'Color-Coded Timing', description: 'Green for on time, yellow for getting late, red for overdue.' },
      { icon: 'bi-hand-index', title: 'Bump When Done', description: 'Tap to mark items ready. Expo screen shows what\'s waiting for pickup.' },
      { icon: 'bi-graph-up', title: 'Track Speed', description: 'Avg. ticket times, station performance, and bottleneck detection.' },
    ],
    screenshotAlt: 'KDS display showing order cards with timer badges',
  },
  {
    id: 'delivery',
    title: 'Delivery',
    icon: 'bi-truck',
    businessTypes: ['restaurant'],
    headline: 'Dispatch Drivers Without the 30% Fee',
    description:
      'Use DoorDash Drive or Uber Direct to dispatch delivery drivers on demand \u2014 ' +
      'at a flat per-delivery fee (typically $5\u20138) instead of marketplace commissions.',
    steps: [
      { icon: 'bi-bag-check', title: 'Online Order Placed', description: 'Customer orders delivery through your portal.' },
      { icon: 'bi-send', title: 'Auto-Dispatch', description: 'OrderStack requests a driver via DoorDash Drive or Uber Direct.' },
      { icon: 'bi-geo-alt', title: 'Live Tracking', description: 'You and the customer track the driver in real time.' },
      { icon: 'bi-check-circle', title: 'Delivered', description: 'Flat fee deducted. You keep the rest of the order value.' },
    ],
    screenshotAlt: 'Delivery management screen with driver tracking map',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: 'bi-bar-chart-line',
    businessTypes: ['restaurant', 'retail', 'services'],
    headline: 'Know Your Numbers in Real Time',
    description:
      'Sales dashboards, menu engineering, food cost tracking, and close-of-day reports. ' +
      'See what\'s selling, what\'s not, and where your margins are.',
    steps: [
      { icon: 'bi-speedometer2', title: 'Live Dashboard', description: 'Today\'s sales, order count, and avg. ticket \u2014 updated in real time.' },
      { icon: 'bi-pie-chart', title: 'Menu Engineering', description: 'Stars, plowhorses, puzzles, and dogs \u2014 know which items to promote or cut.' },
      { icon: 'bi-file-earmark-text', title: 'Close-of-Day Report', description: 'One-tap report with sales breakdown, tips, voids, and discounts.' },
      { icon: 'bi-download', title: 'Export & Share', description: 'CSV and PDF exports for your accountant or partners.' },
    ],
    screenshotAlt: 'Analytics dashboard with sales chart and summary cards',
  },
  {
    id: 'staff',
    title: 'Staff & Scheduling',
    icon: 'bi-people',
    businessTypes: ['restaurant', 'retail', 'services'],
    headline: 'Manage Your Team from One Place',
    description:
      'Role-based POS access, time clock, shift scheduling, tip pooling, and labor cost tracking. ' +
      'Staff clock in from the POS \u2014 no third-party app needed.',
    steps: [
      { icon: 'bi-calendar-week', title: 'Build the Schedule', description: 'Drag-and-drop shifts with role requirements and labor budget.' },
      { icon: 'bi-clock-history', title: 'Clock In/Out', description: 'Staff punch in from the POS. Overtime alerts and break tracking.' },
      { icon: 'bi-cash-coin', title: 'Tips & Payroll', description: 'Automatic tip pooling, distribution reports, and payroll export.' },
      { icon: 'bi-shield-lock', title: 'Permissions', description: 'Manager PIN for voids, discounts, and cash drawer access.' },
    ],
    screenshotAlt: 'Staff scheduling calendar with shift blocks',
  },
  {
    id: 'online-store',
    title: 'Online Store',
    icon: 'bi-shop-window',
    businessTypes: ['retail'],
    headline: 'Sell Online and In-Store from One Catalog',
    description:
      'Your product catalog powers both your physical POS and your online store. ' +
      'Inventory syncs automatically \u2014 sell a unit in-store and it updates online instantly.',
    steps: [
      { icon: 'bi-box', title: 'Add Products', description: 'Photos, variants, SKUs, and pricing \u2014 all in one place.' },
      { icon: 'bi-globe', title: 'Publish Your Store', description: 'Branded storefront with categories, search, and filtering.' },
      { icon: 'bi-bag-check', title: 'Customer Orders', description: 'Pickup or shipping. Order appears in your dashboard immediately.' },
      { icon: 'bi-arrow-repeat', title: 'Inventory Syncs', description: 'Stock levels update across online and in-store in real time.' },
    ],
    screenshotAlt: 'Online storefront showing product grid and cart',
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: 'bi-box-seam',
    businessTypes: ['retail'],
    headline: 'Track Every Unit Across Every Channel',
    description:
      'Barcode scanning, low-stock alerts, purchase orders, and supplier management. ' +
      'Know exactly what you have, where it is, and when to reorder.',
    steps: [
      { icon: 'bi-upc-scan', title: 'Scan Items In', description: 'Barcode scan to receive shipments and update stock counts.' },
      { icon: 'bi-bell', title: 'Low-Stock Alerts', description: 'Get notified when items hit reorder thresholds.' },
      { icon: 'bi-file-earmark-plus', title: 'Create PO', description: 'Generate purchase orders and send to suppliers.' },
      { icon: 'bi-clipboard-data', title: 'Audit Trail', description: 'Full history of every stock movement \u2014 receives, sales, adjustments.' },
    ],
    screenshotAlt: 'Inventory management screen with stock levels and alerts',
  },
  {
    id: 'bookings',
    title: 'Bookings',
    icon: 'bi-calendar-check',
    businessTypes: ['services'],
    headline: 'Fill Your Calendar Without the Phone Tag',
    description:
      'Online booking, waitlist management, automated reminders, and calendar sync. ' +
      'Clients book themselves \u2014 you focus on the work.',
    steps: [
      { icon: 'bi-calendar-plus', title: 'Client Books Online', description: 'Your booking page shows availability and lets clients self-schedule.' },
      { icon: 'bi-envelope', title: 'Confirmation Sent', description: 'Automatic email/SMS confirmation with calendar invite.' },
      { icon: 'bi-alarm', title: 'Reminder Before', description: 'Automated reminder reduces no-shows.' },
      { icon: 'bi-check2-all', title: 'Check In & Pay', description: 'Client arrives, you mark complete, and collect payment.' },
    ],
    screenshotAlt: 'Booking calendar with available time slots',
  },
  {
    id: 'invoicing',
    title: 'Invoicing',
    icon: 'bi-receipt-cutoff',
    businessTypes: ['services'],
    headline: 'Send Invoices, Get Paid Faster',
    description:
      'Create and send professional invoices. Clients pay online with one click. ' +
      'Track outstanding balances and send automated follow-ups.',
    steps: [
      { icon: 'bi-file-earmark-plus', title: 'Create Invoice', description: 'Line items, tax, discounts \u2014 ready in seconds.' },
      { icon: 'bi-send', title: 'Send to Client', description: 'Email with a secure payment link.' },
      { icon: 'bi-wallet2', title: 'Client Pays Online', description: 'One-click payment via the invoice link.' },
      { icon: 'bi-check-circle', title: 'Auto-Reconcile', description: 'Payment recorded, receipt sent, books updated.' },
    ],
    screenshotAlt: 'Invoice editor with line items and send button',
  },
  {
    id: 'crm',
    title: 'CRM',
    icon: 'bi-person-rolodex',
    businessTypes: ['services'],
    headline: 'Know Every Client by Name',
    description:
      'Client profiles with visit history, preferences, notes, and lifetime value. ' +
      'Build relationships that drive repeat business.',
    steps: [
      { icon: 'bi-person-plus', title: 'Client Created', description: 'Auto-created on first booking or purchase.' },
      { icon: 'bi-journal-text', title: 'Full History', description: 'Every visit, purchase, and note in one timeline.' },
      { icon: 'bi-tags', title: 'Segment & Tag', description: 'Group clients by service type, spend tier, or custom tags.' },
      { icon: 'bi-megaphone', title: 'Targeted Outreach', description: 'Email or SMS campaigns to specific segments.' },
    ],
    screenshotAlt: 'CRM client profile with visit timeline',
  },
];

export const DEMO_CTA = {
  title: 'Ready to Try It Yourself?',
  subtitle: 'Start free \u2014 no credit card required. Set up in under 5 minutes.',
  primaryCta: { label: 'Start Free Trial', route: '/signup' },
  secondaryCta: { label: 'Talk to Sales', route: '/contact' },
};

// ============================================================================
// BLOG
// ============================================================================

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  image: string;
  readTime: number;
  featured: boolean;
  body: string;
}

export interface BlogCategory {
  id: string;
  label: string;
  icon: string;
}

export const BLOG_CATEGORIES: BlogCategory[] = [
  { id: 'all', label: 'All Posts', icon: 'bi-grid' },
  { id: 'Restaurant Tech', label: 'Restaurant Tech', icon: 'bi-tv' },
  { id: 'Delivery', label: 'Delivery', icon: 'bi-truck' },
  { id: 'AI & Automation', label: 'AI & Automation', icon: 'bi-robot' },
  { id: 'Industry News', label: 'Industry News', icon: 'bi-newspaper' },
];

export const BLOG_HERO = {
  title: 'The OrderStack Blog',
  subtitle: 'Practical insights for restaurant owners who want to run smarter, leaner operations.',
};

// ============================================================================
// SAVINGS CALCULATOR
// ============================================================================

export interface CompetitorFees {
  name: string;
  monthlyBase: number;
  inPersonRate: number;
  inPersonFixed: number;
  onlineRate: number;
  onlineFixed: number;
  deliveryCommission: number;
  daaSFeePerDelivery: number;
  kdsAddon: number;
  schedulingAddon: number;
  loyaltyAddon: number;
}

export const COMPETITOR_FEE_MODELS: CompetitorFees[] = [
  {
    name: 'OrderStack',
    monthlyBase: 29,
    inPersonRate: 0.0329,
    inPersonFixed: 0.49,
    onlineRate: 0.0379,
    onlineFixed: 0.49,
    deliveryCommission: 0,
    daaSFeePerDelivery: 6.5,
    kdsAddon: 0,
    schedulingAddon: 0,
    loyaltyAddon: 0,
  },
  {
    name: 'Toast',
    monthlyBase: 50,
    inPersonRate: 0.0249,
    inPersonFixed: 0.15,
    onlineRate: 0.035,
    onlineFixed: 0.15,
    deliveryCommission: 0.15,
    daaSFeePerDelivery: 0,
    kdsAddon: 25,
    schedulingAddon: 35,
    loyaltyAddon: 25,
  },
  {
    name: 'Square',
    monthlyBase: 60,
    inPersonRate: 0.026,
    inPersonFixed: 0.1,
    onlineRate: 0.029,
    onlineFixed: 0.3,
    deliveryCommission: 0,
    daaSFeePerDelivery: 0,
    kdsAddon: 20,
    schedulingAddon: 35,
    loyaltyAddon: 45,
  },
];

export const SAVINGS_CALC_HEADER = {
  tag: 'Calculate Your Savings',
  title: 'See How Much You\'d Save With OrderStack',
  subtitle: 'Enter your restaurant\'s numbers. The math speaks for itself.',
};

export const SAVINGS_CALC_ASSUMPTIONS =
  'Estimates based on published rates as of March 2026. Toast estimate includes $50/mo hardware amortization ' +
  'and standard add-on pricing. Actual costs may vary. OrderStack delivery estimate uses $6.50 avg DaaS fee ' +
  'via DoorDash Drive.';

export const SAVINGS_CALC_DEFAULTS = {
  monthlyOrders: 1500,
  avgTicket: 35,
  deliveryPct: 25,
};

export interface SavingsCalcInput {
  label: string;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
}

export const SAVINGS_CALC_INPUTS: Record<string, SavingsCalcInput> = {
  monthlyOrders: { label: 'Orders per month', min: 100, max: 10000, step: 50 },
  avgTicket: { label: 'Average order value', min: 5, max: 200, step: 1, prefix: '$' },
  deliveryPct: { label: 'Delivery orders', min: 0, max: 100, step: 1, suffix: '%' },
};

export const SAVINGS_CALC_SUMMARY_TEMPLATE = 'Based on {orders} orders/mo at ${ticket} avg, you\'d save {savings} per year vs Toast.';

// ============================================================================
// TESTIMONIALS
// ============================================================================

export interface Testimonial {
  id: string;
  quote: string;
  authorName: string;
  authorPhoto: string | null;
  restaurantName: string;
  location: string;
  rating: number;
}

export const TESTIMONIALS_HEADER = {
  tag: 'What Restaurants Are Saying',
  title: 'Trusted by Restaurant Owners Like You',
  subtitle: 'Hear from operators who switched to OrderStack and never looked back.',
};

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'marias',
    quote: 'We were losing almost $4,000 a month to DoorDash and Uber Eats commissions. OrderStack let us keep taking delivery orders through our own site. Three months in, we\'ve saved over $12,000.',
    authorName: 'Maria Gonzalez',
    authorPhoto: null,
    restaurantName: 'Maria\'s Kitchen',
    location: 'Delray Beach, FL',
    rating: 5,
  },
  {
    id: 'bourbon',
    quote: 'Setting up was shockingly easy. We used our existing iPads, connected our Star printer, and were taking orders the same afternoon. No hardware guy, no $1,200 terminal.',
    authorName: 'David Chen',
    authorPhoto: null,
    restaurantName: 'Bourbon & Brisket BBQ',
    location: 'Fort Lauderdale, FL',
    rating: 5,
  },
  {
    id: 'coastal',
    quote: 'The KDS alone was worth the switch. Our ticket times dropped from 22 minutes to 14 minutes in the first week. The kitchen just runs smoother now.',
    authorName: 'James Walker',
    authorPhoto: null,
    restaurantName: 'Coastal Catch Seafood',
    location: 'Boca Raton, FL',
    rating: 5,
  },
  {
    id: 'verde',
    quote: 'I was paying Toast $165 a month in add-ons for stuff that OrderStack includes for free. KDS, loyalty, scheduling \u2014 it\'s all just there.',
    authorName: 'Sofia Ramirez',
    authorPhoto: null,
    restaurantName: 'Verde Taqueria',
    location: 'Boynton Beach, FL',
    rating: 4,
  },
  {
    id: 'noodle',
    quote: 'The online ordering QR codes at each table changed everything for us. Customers order and pay from their phones, and our servers handle 30% more tables.',
    authorName: 'Kevin Pham',
    authorPhoto: null,
    restaurantName: 'Noodle House Express',
    location: 'West Palm Beach, FL',
    rating: 5,
  },
];

// ============================================================================
// ANIMATED METRICS
// ============================================================================

export interface MetricHighlight {
  id: string;
  value: number;
  prefix: string;
  suffix: string;
  label: string;
  icon: string;
}

export const METRIC_HIGHLIGHTS: MetricHighlight[] = [
  { id: 'commissions', value: 0, prefix: '', suffix: '%', label: 'Marketplace Commissions', icon: 'bi-cash-stack' },
  { id: 'platform', value: 1, prefix: '', suffix: '', label: 'Platform for Everything', icon: 'bi-layers' },
  { id: 'setup', value: 5, prefix: '', suffix: ' min', label: 'Setup Time', icon: 'bi-lightning' },
  { id: 'data', value: 100, prefix: '', suffix: '%', label: 'Your Customer Data', icon: 'bi-shield-check' },
];

// ============================================================================
// PARTNER LOGOS
// ============================================================================

export interface PartnerLogo {
  name: string;
  imageUrl: string;
  url: string | null;
}

export const PARTNER_LOGOS: PartnerLogo[] = [
  { name: 'DoorDash Drive', imageUrl: 'assets/logos/doordash.svg', url: null },
  { name: 'Uber Direct', imageUrl: 'assets/logos/uber.svg', url: null },
  { name: 'PayPal Zettle', imageUrl: 'assets/logos/paypal.svg', url: null },
  { name: 'Google Business', imageUrl: 'assets/logos/google.svg', url: null },
  { name: 'QuickBooks', imageUrl: 'assets/logos/quickbooks.svg', url: null },
  { name: 'Xero', imageUrl: 'assets/logos/xero.svg', url: null },
];

// ============================================================================
// CASE STUDIES
// ============================================================================

export interface CaseStudyPreview {
  id: string;
  restaurantName: string;
  location: string;
  businessType: string;
  headline: string;
  metrics: { label: string; value: string }[];
  imageUrl: string | null;
  slug: string;
}

export const CASE_STUDIES_HEADER = {
  tag: 'Real Results',
  title: 'See How Restaurants Are Winning With OrderStack',
};

// ============================================================================
// INTEGRATIONS
// ============================================================================

export type IntegrationStatus = 'available' | 'coming_soon' | 'beta';

export type IntegrationCategory =
  | 'all'
  | 'payments'
  | 'delivery'
  | 'hardware'
  | 'accounting'
  | 'marketing'
  | 'operations';

export interface IntegrationCategoryOption {
  id: IntegrationCategory;
  label: string;
  icon: string;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  logoUrl: string;
  learnMoreUrl: string | null;
  featured: boolean;
}

export const INTEGRATION_CATEGORIES: IntegrationCategoryOption[] = [
  { id: 'all', label: 'All Integrations', icon: 'bi-grid' },
  { id: 'payments', label: 'Payments', icon: 'bi-credit-card' },
  { id: 'delivery', label: 'Delivery', icon: 'bi-truck' },
  { id: 'hardware', label: 'Hardware', icon: 'bi-printer' },
  { id: 'accounting', label: 'Accounting', icon: 'bi-calculator' },
  { id: 'marketing', label: 'Marketing', icon: 'bi-megaphone' },
  { id: 'operations', label: 'Operations', icon: 'bi-gear' },
];

export const INTEGRATIONS: Integration[] = [
  // Payments
  {
    id: 'paypal-zettle',
    name: 'PayPal Zettle',
    description: 'Tap-to-pay card readers and in-person payment processing.',
    category: 'payments',
    status: 'available',
    logoUrl: 'src/assets/logos/paypal.svg',
    learnMoreUrl: 'https://www.paypal.com/us/business/accept-payments/zettle',
    featured: true,
  },
  {
    id: 'square-reader',
    name: 'Square Reader',
    description: 'Use existing Square readers as BYOD payment terminals with OrderStack.',
    category: 'payments',
    status: 'coming_soon',
    logoUrl: 'src/assets/logos/square-reader.svg',
    learnMoreUrl: null,
    featured: false,
  },
  // Delivery
  {
    id: 'doordash-drive',
    name: 'DoorDash Drive',
    description: 'Dispatch DoorDash drivers on demand for a flat per-delivery fee, no marketplace commission.',
    category: 'delivery',
    status: 'available',
    logoUrl: 'src/assets/logos/doordash.svg',
    learnMoreUrl: 'https://www.doordash.com/business/drive',
    featured: true,
  },
  {
    id: 'uber-direct',
    name: 'Uber Direct',
    description: 'On-demand delivery through Uber\'s driver network at a flat per-trip rate.',
    category: 'delivery',
    status: 'available',
    logoUrl: 'src/assets/logos/uber.svg',
    learnMoreUrl: 'https://www.uber.com/us/en/business/uber-direct/',
    featured: true,
  },
  {
    id: 'nash',
    name: 'Nash',
    description: 'Multi-carrier delivery orchestration, automatically routes to the cheapest available driver.',
    category: 'delivery',
    status: 'coming_soon',
    logoUrl: 'src/assets/logos/nash.svg',
    learnMoreUrl: null,
    featured: false,
  },
  // Hardware
  {
    id: 'star-cloudprnt',
    name: 'Star CloudPRNT',
    description: 'Cloud-connected receipt and kitchen printers, no local drivers or wires needed.',
    category: 'hardware',
    status: 'available',
    logoUrl: 'src/assets/logos/star.svg',
    learnMoreUrl: 'https://www.starmicronics.com/cloudprnt/',
    featured: true,
  },
  {
    id: 'epson-smart-connect',
    name: 'Epson Smart Connect',
    description: 'Cloud printing for Epson TM-series receipt printers with remote management.',
    category: 'hardware',
    status: 'coming_soon',
    logoUrl: 'src/assets/logos/epson.svg',
    learnMoreUrl: null,
    featured: false,
  },
  {
    id: 'socket-mobile',
    name: 'Socket Mobile',
    description: 'Bluetooth barcode scanners for retail inventory management and quick item lookup.',
    category: 'hardware',
    status: 'available',
    logoUrl: 'assets/logos/socket-mobile.svg',
    learnMoreUrl: 'https://www.socketmobile.com',
    featured: false,
  },
  // Accounting
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    description: 'Auto-sync daily sales summaries, tax collected, and tips to your QuickBooks account.',
    category: 'accounting',
    status: 'available',
    logoUrl: 'src/assets/logos/quickbooks.svg',
    learnMoreUrl: 'https://quickbooks.intuit.com',
    featured: true,
  },
  {
    id: 'xero',
    name: 'Xero',
    description: 'Cloud accounting integration with daily revenue sync and expense categorization.',
    category: 'accounting',
    status: 'available',
    logoUrl: 'src/assets/logos/xero.svg',
    learnMoreUrl: 'https://www.xero.com',
    featured: false,
  },
  {
    id: 'freshbooks',
    name: 'FreshBooks',
    description: 'Sync invoices and sales data for restaurants that bill catering and event clients.',
    category: 'accounting',
    status: 'coming_soon',
    logoUrl: 'src/assets/logos/freshbooks.svg',
    learnMoreUrl: null,
    featured: false,
  },
  // Marketing
  {
    id: 'google-business',
    name: 'Google Business Profile',
    description: 'Sync your menu, hours, and online ordering link directly to your Google listing.',
    category: 'marketing',
    status: 'available',
    logoUrl: 'src/assets/logos/google.svg',
    learnMoreUrl: 'https://business.google.com',
    featured: true,
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Export customer segments and order data to Mailchimp for targeted email campaigns.',
    category: 'marketing',
    status: 'coming_soon',
    logoUrl: 'src/assets/logos/mailchimp.svg',
    learnMoreUrl: null,
    featured: false,
  },
  {
    id: 'meta-pixel',
    name: 'Meta Pixel',
    description: 'Track online ordering conversions and build retargeting audiences on Facebook and Instagram.',
    category: 'marketing',
    status: 'beta',
    logoUrl: 'src/assets/logos/meta.svg',
    learnMoreUrl: 'https://developers.facebook.com/docs/meta-pixel',
    featured: false,
  },
  // Operations
  {
    id: '7shifts',
    name: '7shifts',
    description: 'Restaurant-specific staff scheduling with labor cost forecasting and shift swapping.',
    category: 'operations',
    status: 'coming_soon',
    logoUrl: 'src/assets/logos/7shifts.svg',
    learnMoreUrl: null,
    featured: false,
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync reservation and catering bookings to your team\'s Google Calendar automatically.',
    category: 'operations',
    status: 'available',
    logoUrl: 'src/assets/logos/google-calendar.svg',
    learnMoreUrl: 'https://calendar.google.com',
    featured: false,
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect OrderStack to 5,000+ apps for automation workflows.',
    category: 'operations',
    status: 'coming_soon',
    logoUrl: 'src/assets/logos/zapier.svg',
    learnMoreUrl: null,
    featured: false,
  },
];

export const INTEGRATIONS_HERO = {
  tag: 'Integrations',
  title: 'Connects to the Tools You Already Use',
  subtitle: 'OrderStack integrates with leading payment processors, delivery networks, printers, accounting software, and more.',
};

export const INTEGRATIONS_API_SECTION = {
  tag: 'For Developers',
  title: 'Build on the OrderStack API',
  subtitle: 'RESTful API with webhooks, OAuth 2.0, and comprehensive documentation. Build custom integrations for your restaurant group or POS ecosystem.',
  features: [
    { icon: 'bi-braces', label: 'RESTful JSON API' },
    { icon: 'bi-broadcast', label: 'Real-Time Webhooks' },
    { icon: 'bi-shield-lock', label: 'OAuth 2.0 Auth' },
    { icon: 'bi-book', label: 'Full API Docs' },
  ],
  ctaLabel: 'View API Documentation',
  ctaRoute: '/docs',
  ctaExternal: true,
};

export const INTEGRATIONS_CLOUDPRNT_FEATURE = {
  title: 'Featured: Star CloudPRNT',
  subtitle: 'The easiest way to print orders from any device.',
  description: 'Star CloudPRNT lets your kitchen and receipt printers connect over the internet \u2014 no local drivers, no wired connections, no IT headaches. Orders placed from any device print automatically to the right station.',
  steps: [
    { icon: 'bi-wifi', label: 'Connect printer to WiFi' },
    { icon: 'bi-link-45deg', label: 'Register in OrderStack settings' },
    { icon: 'bi-printer', label: 'Orders print automatically' },
  ],
};

export const INTEGRATIONS_STATUS_LABELS: Record<IntegrationStatus, string> = {
  available: 'Available',
  coming_soon: 'Coming Soon',
  beta: 'Beta',
};

// ============================================================================
// CONTACT PAGE
// ============================================================================

export const CONTACT_HERO = {
  tag: 'Get in Touch',
  title: 'Let\'s Talk About Your Restaurant',
  subtitle: 'Whether you want a demo, have a pricing question, or just want to learn more \u2014 we\'re here to help.',
};

export interface InquiryTypeOption {
  value: string;
  label: string;
}

export const INQUIRY_TYPES: InquiryTypeOption[] = [
  { value: '', label: 'Select a topic...' },
  { value: 'demo_request', label: 'Request a Demo' },
  { value: 'pricing_question', label: 'Pricing Question' },
  { value: 'general', label: 'General Inquiry' },
  { value: 'partnership', label: 'Partnership Opportunity' },
  { value: 'support', label: 'Technical Support' },
];

export const CONTACT_INFO = {
  email: 'hello@getorderstack.com',
  phone: '(561) 555-0123',
  location: 'Delray Beach, FL',
  serviceArea: 'Serving Broward & Palm Beach County',
};

export const CONTACT_THANK_YOU = {
  title: 'Thanks, {name}! We\'ll be in touch within 24 hours.',
  steps: [
    'Confirmation email sent to your inbox',
    'Personalized demo walkthrough',
    'Custom pricing based on your needs',
  ],
};

export const CONTACT_FORM_LABELS = {
  name: 'Your Name',
  email: 'Email Address',
  phone: 'Phone Number (optional)',
  restaurantName: 'Restaurant Name (optional)',
  inquiryType: 'What can we help with?',
  message: 'Your Message',
  submit: 'Send Message',
  submitting: 'Sending...',
};

export const CONTACT_VALIDATION = {
  nameMin: 'Name must be at least 2 characters',
  emailInvalid: 'Please enter a valid email address',
  inquiryRequired: 'Please select a topic',
  messageMin: 'Message must be at least 10 characters',
};

// ============================================================================
// EXIT INTENT POPUP
// ============================================================================

export const EXIT_INTENT_CONFIG = {
  headline: 'Wait \u2014 before you go!',
  subtext: 'Get a free savings report showing how much your restaurant could save by switching to OrderStack.',
  buttonLabel: 'Get My Free Report',
  disclaimer: 'No spam. Unsubscribe anytime.',
  thankYou: 'Check your inbox! Your savings report is on the way.',
  delaySeconds: 10,
};

export const CASE_STUDIES: CaseStudyPreview[] = [
  {
    id: 'marias-case',
    restaurantName: 'Maria\'s Kitchen',
    location: 'Delray Beach, FL',
    businessType: 'Full-Service Restaurant',
    headline: 'Cut delivery costs by 28% in 3 months',
    metrics: [
      { label: 'Monthly Savings', value: '$4,200' },
      { label: 'Delivery Orders', value: '+15%' },
    ],
    imageUrl: null,
    slug: 'marias-kitchen',
  },
  {
    id: 'bourbon-case',
    restaurantName: 'Bourbon & Brisket BBQ',
    location: 'Fort Lauderdale, FL',
    businessType: 'Quick-Service',
    headline: 'BYOD setup saved $3,600 in hardware costs',
    metrics: [
      { label: 'Hardware Savings', value: '$3,600' },
      { label: 'Setup Time', value: '2 hours' },
    ],
    imageUrl: null,
    slug: 'bourbon-brisket',
  },
  {
    id: 'coastal-case',
    restaurantName: 'Coastal Catch Seafood',
    location: 'Boca Raton, FL',
    businessType: 'Full-Service Restaurant',
    headline: 'Reduced ticket times by 36% with KDS',
    metrics: [
      { label: 'Avg Ticket Time', value: '14 min' },
      { label: 'Time Saved', value: '36%' },
    ],
    imageUrl: null,
    slug: 'coastal-catch',
  },
];

// ============================================================================
// SEO META
// ============================================================================

export interface PageSeoConfig {
  title: string;
  description: string;
  path: string;
  ogType?: string;
  ogImage?: string;
  canonical?: string;
}

export const SEO_CONFIGS: Record<string, PageSeoConfig> = {
  landing: {
    title: 'OrderStack \u2014 Restaurant Operating System',
    description: 'All-in-one restaurant OS with POS, online ordering, KDS, and delivery management. Zero marketplace commissions. Free to start.',
    path: '/',
  },
  pricing: {
    title: 'Pricing',
    description: 'Simple, transparent pricing for OrderStack. Free plan available. No long-term contracts, no hidden fees. Compare to Toast and Square.',
    path: '/pricing',
  },
  demo: {
    title: 'Interactive Demo',
    description: 'Explore OrderStack features for restaurants, retail, and services. See POS, online ordering, KDS, delivery, and analytics in action.',
    path: '/demo',
  },
  blog: {
    title: 'Blog',
    description: 'Practical insights for restaurant owners on cutting costs, improving operations, and growing without third-party marketplace fees.',
    path: '/blog',
  },
  integrations: {
    title: 'Integrations',
    description: 'OrderStack connects with PayPal, DoorDash Drive, Uber Direct, Star CloudPRNT, QuickBooks, Xero, and more. See all integrations.',
    path: '/integrations',
  },
  contact: {
    title: 'Contact Us',
    description: 'Get in touch with the OrderStack team. Request a demo, ask about pricing, or learn how we can help your restaurant.',
    path: '/contact',
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'OrderStack privacy policy. Learn how we collect, use, and protect your data. CCPA compliant. PCI DSS payment security.',
    path: '/privacy',
  },
  terms: {
    title: 'Terms of Service',
    description: 'OrderStack terms of service. No long-term contracts, data export anytime, Florida governing law. Read before signing up.',
    path: '/terms',
  },
  about: {
    title: 'About Us',
    description: 'OrderStack is built in South Florida for independent restaurants. Zero marketplace commissions, no hardware lock-in, restaurant-first.',
    path: '/about',
  },
  careers: {
    title: 'Careers',
    description: 'Join the OrderStack team. We\'re building the restaurant operating system that puts operators in control. See open positions.',
    path: '/careers',
  },
};

// ============================================================================
// LEGAL PAGES
// ============================================================================

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export const PRIVACY_POLICY: { lastUpdated: string; sections: LegalSection[] } = {
  lastUpdated: 'March 1, 2026',
  sections: [
    {
      heading: 'Information We Collect',
      paragraphs: [
        'We collect information you provide directly: your name, email address, phone number, restaurant name, and billing information when you create an account or contact us.',
        'We automatically collect usage data including device type, browser, IP address, pages visited, and features used within the OrderStack platform. We also collect order data, menu configurations, and staff activity logs necessary to operate the service.',
        'When you connect third-party integrations (PayPal, DoorDash Drive, Uber Direct, Star CloudPRNT, QuickBooks, etc.), we receive limited data from those services as needed to provide the integration.',
      ],
    },
    {
      heading: 'How We Use Your Information',
      paragraphs: [
        'We use your information to operate and improve the OrderStack platform, process transactions, provide customer support, send service-related communications, and generate analytics reports for your restaurant.',
        'We may use aggregated, anonymized data to improve our products and publish industry benchmarks. This data cannot be traced back to individual restaurants or users.',
      ],
    },
    {
      heading: 'Data Sharing',
      paragraphs: [
        'We share data with third-party service providers necessary to operate OrderStack: PayPal for payment processing, DoorDash Drive and Uber Direct for delivery dispatch, Star Micronics for cloud printing, and cloud infrastructure providers for hosting.',
        'We do not sell your personal information or restaurant data to advertisers, data brokers, or any third party. Your customer list, order history, and business data belong to you.',
      ],
    },
    {
      heading: 'Cookies & Tracking',
      paragraphs: [
        'We use essential cookies for authentication and session management. We use analytics cookies to understand how you use OrderStack and improve the product.',
        'You can control cookie preferences through your browser settings. Disabling essential cookies may prevent you from using certain features of the platform.',
      ],
    },
    {
      heading: 'Data Security',
      paragraphs: [
        'We implement industry-standard security measures including TLS encryption in transit, AES-256 encryption at rest, and PCI DSS compliant payment processing through PayPal. Delivery service credentials are encrypted with AES-256-GCM before storage.',
        'We conduct regular security reviews and maintain access controls to protect your data. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.',
      ],
    },
    {
      heading: 'Data Retention',
      paragraphs: [
        'We retain your account data for as long as your account is active. Order history and transaction records are retained for 7 years for tax and compliance purposes.',
        'When you delete your account, we remove your personal information within 30 days. Aggregated, anonymized data may be retained indefinitely for analytics purposes.',
      ],
    },
    {
      heading: 'Your Rights',
      paragraphs: [
        'You have the right to access, correct, or delete your personal information at any time. You can export all your restaurant data (menu, orders, customers, reports) from the Settings panel in OrderStack.',
        'California residents have additional rights under the CCPA, including the right to know what personal information is collected, the right to delete it, and the right to opt out of its sale. We do not sell personal information.',
      ],
    },
    {
      heading: 'Children\'s Privacy',
      paragraphs: [
        'OrderStack is not intended for use by individuals under 16 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately.',
      ],
    },
    {
      heading: 'Changes to This Policy',
      paragraphs: [
        'We may update this privacy policy from time to time. We will notify you of material changes by email or through a notice in the OrderStack dashboard at least 30 days before the changes take effect.',
      ],
    },
    {
      heading: 'Contact Us',
      paragraphs: [
        'If you have questions about this privacy policy or how we handle your data, contact us at privacy@getorderstack.com or write to us at OrderStack, Delray Beach, FL 33444.',
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: { lastUpdated: string; sections: LegalSection[] } = {
  lastUpdated: 'March 1, 2026',
  sections: [
    {
      heading: 'Acceptance of Terms',
      paragraphs: [
        'By creating an account or using the OrderStack platform, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, do not use the service.',
      ],
    },
    {
      heading: 'Description of Service',
      paragraphs: [
        'OrderStack provides a cloud-based restaurant operating system including point of sale, online ordering, kitchen display system, delivery management, analytics, staff scheduling, and related tools. The service is accessible via web browsers on any device (BYOD).',
      ],
    },
    {
      heading: 'Account Registration',
      paragraphs: [
        'You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account.',
        'You must be at least 18 years old and have the legal authority to bind your restaurant or business to these terms.',
      ],
    },
    {
      heading: 'Fees & Payment',
      paragraphs: [
        'OrderStack offers free and paid subscription plans. Paid plans are billed monthly or annually as selected at signup. All prices are in US dollars and exclude applicable taxes.',
        'Payment processing fees (percentage + per-transaction) are charged on each transaction processed through the platform. Current rates are published on our pricing page and may be updated with 30 days\' notice.',
        'You authorize us to charge your payment method for all fees incurred. Failed payments may result in service suspension after a 7-day grace period.',
      ],
    },
    {
      heading: 'Acceptable Use',
      paragraphs: [
        'You agree to use OrderStack only for lawful business purposes. You may not use the platform to process transactions for illegal goods or services, engage in fraud, or violate any applicable laws or regulations.',
        'You are responsible for ensuring that your use of the platform complies with all food safety, labor, and business regulations applicable to your restaurant.',
      ],
    },
    {
      heading: 'Intellectual Property',
      paragraphs: [
        'OrderStack and its original content, features, and functionality are owned by OrderStack and are protected by copyright, trademark, and other intellectual property laws.',
        'Your restaurant data (menus, orders, customer information, reports) remains your property. We claim no ownership over your business data.',
      ],
    },
    {
      heading: 'Data Ownership',
      paragraphs: [
        'You retain full ownership of all data you input into OrderStack, including menu items, customer records, order history, and business reports. You may export your data at any time through the Settings panel.',
        'Upon account termination, we will make your data available for export for 30 days. After that period, your data will be permanently deleted from our systems.',
      ],
    },
    {
      heading: 'Service Availability',
      paragraphs: [
        'We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance windows will be communicated at least 48 hours in advance.',
        'We are not liable for service interruptions caused by factors beyond our reasonable control, including internet outages, third-party service failures, or force majeure events.',
      ],
    },
    {
      heading: 'Limitation of Liability',
      paragraphs: [
        'To the maximum extent permitted by law, OrderStack shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of revenue, profits, or data.',
        'Our total liability for any claim arising from or related to the service shall not exceed the amount you paid to OrderStack in the 12 months preceding the claim.',
      ],
    },
    {
      heading: 'Termination',
      paragraphs: [
        'You may cancel your subscription at any time from the Settings panel. Cancellation takes effect at the end of your current billing period. No refunds are provided for partial billing periods.',
        'We may suspend or terminate your account for violation of these terms, non-payment, or if required by law. We will provide reasonable notice when possible.',
      ],
    },
    {
      heading: 'Governing Law',
      paragraphs: [
        'These terms shall be governed by and construed in accordance with the laws of the State of Florida, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of Palm Beach County, Florida.',
      ],
    },
    {
      heading: 'Changes to Terms',
      paragraphs: [
        'We may update these terms from time to time. Material changes will be communicated by email or through the OrderStack dashboard at least 30 days before taking effect. Continued use of the service after changes take effect constitutes acceptance of the revised terms.',
      ],
    },
    {
      heading: 'Contact',
      paragraphs: [
        'If you have questions about these terms, contact us at legal@getorderstack.com or write to OrderStack, Delray Beach, FL 33444.',
      ],
    },
  ],
};

// ============================================================================
// ABOUT PAGE
// ============================================================================

export const ABOUT_HERO = {
  tag: 'About Us',
  title: 'Built in South Florida for Independent Restaurants',
  subtitle: 'We started OrderStack because too many restaurants were losing 30% to marketplace commissions and thousands to proprietary hardware. There had to be a better way.',
};

export const ABOUT_MISSION = {
  pullQuote: 'Every dollar a restaurant sends to a marketplace middleman is a dollar that should stay in the kitchen.',
  paragraphs: [
    'OrderStack was born out of conversations with restaurant owners in Delray Beach and across South Florida. The same story came up again and again: operators were losing thousands each month to DoorDash and Uber Eats commissions, locked into multi-year hardware contracts, and juggling five different tools that didn\'t talk to each other.',
    'We built OrderStack to solve all of that in one platform. POS, online ordering, KDS, delivery dispatch, analytics, and staff management \u2014 all running on the devices you already own. No marketplace commissions, no proprietary terminals, no long-term contracts. Just the tools restaurants need to run their business and keep their revenue.',
  ],
};

export interface ValueCard {
  icon: string;
  title: string;
  description: string;
}

export const ABOUT_VALUES: ValueCard[] = [
  {
    icon: 'bi-eye',
    title: 'Transparency',
    description: 'Published pricing, no hidden fees, no surprise rate increases. You always know exactly what you\'re paying and why.',
  },
  {
    icon: 'bi-shop',
    title: 'Restaurant-First',
    description: 'Every feature is built for operators, not investors. We optimize for your margins, your workflow, and your customer relationships.',
  },
  {
    icon: 'bi-unlock',
    title: 'No Lock-In',
    description: 'BYOD hardware, month-to-month billing, and full data export. Your business data belongs to you \u2014 always.',
  },
];

export const ABOUT_LOCAL = {
  title: 'Proudly Serving South Florida',
  description: 'Based in Delray Beach, we serve restaurants across Broward and Palm Beach County with local support and in-person onboarding. We know the community because we\'re part of it.',
};

// ============================================================================
// CAREERS PAGE
// ============================================================================

export const CAREERS_HERO = {
  tag: 'Careers',
  title: 'Join the OrderStack Team',
  subtitle: 'We\'re building the restaurant operating system that puts operators in control. Interested in joining us?',
};

export const CAREERS_EMPTY = {
  title: 'No open positions right now.',
  description: 'We\'re a small team and not actively hiring, but we\'re always interested in hearing from talented people. If you\'re passionate about restaurant tech, send us a note.',
  email: 'careers@getorderstack.com',
};
