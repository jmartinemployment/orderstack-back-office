# Website — Public Marketing Pages

## Purpose
Public-facing marketing pages for getorderstack.com. These pages are
unauthenticated and use the MarketingLayoutComponent (header + footer).

## Architecture
- Lives in src/app/features/website/ (separate from features/marketing/ which is the internal campaign builder)
- MarketingLayoutComponent is the third layout alongside MainLayout and AuthLayout
- All routes are public (no authGuard)
- All copy comes from marketing.config.ts
- Uses existing --os-* design tokens from src/styles.scss
- Marketing-specific classes use mkt- prefix
- Same blue/white design system as the product

## Components

### C-01 — Scaffold & Layout
- MarketingLayoutComponent: header + router-outlet + footer
- MarketingHeaderComponent: sticky white header, border on scroll, mobile hamburger
- MarketingFooterComponent: dark background, 4-column links, social, copyright
- MarketingSectionComponent: reusable full-width section with background variants (default, alt, dark, hero)
- MarketingHeroComponent: reusable hero block (tag, title, subtitle, CTAs)

### C-02 — Landing Page Content
- SocialProofBarComponent: trust signals strip (icons + labels)
- PainPointsComponent: 3-card grid with stats (marketplace fees, fragmented tools, data ownership)
- FeatureHighlightsComponent: 6-card grid (POS, online ordering, KDS, delivery, analytics, staff)
- StatsStripComponent: 4 big numbers on dark background
- HowItWorksComponent: 3 numbered steps (sign up, configure, go live)
- FinalCtaComponent: dark CTA section with headline + 2 buttons

### C-03 — Pricing Page
- PlanCardsComponent: 3-plan grid (Free/$0, Plus/$29, Premium/$79) with monthly/annual toggle
- ProcessingRatesComponent: 3 rate cards (in-person 3.29%+49c, online 3.79%+49c, keyed-in 3.80%+49c)
- CompetitorComparisonComponent: OrderStack vs Toast vs Square feature table with checkmarks
- PricingFaqComponent: accordion FAQ (8 questions)

### C-04 — Interactive Demo / Product Tour
- DemoBusinessSelectorComponent: pill buttons for Restaurant / Retail / Services
- DemoFeatureTourComponent: vertical tab list (desktop) / horizontal scroll (mobile) + detail pane
- DemoFeatureCardComponent: feature headline, description, 4 workflow steps, screenshot placeholder

12 feature entries covering:
- Shared: POS, Analytics, Staff
- Restaurant: Online Ordering, KDS, Delivery
- Retail: Online Store, Inventory
- Services: Bookings, Invoicing, CRM

Business type selector filters which feature tabs are visible.
Screenshot placeholders ready for future product images.

### C-05 — Blog & Content Hub
- BlogService: injectable service with getAllPosts(), getPostBySlug(), getPostsByCategory(), getFeaturedPosts(), getRelatedPosts()
- BlogPageComponent: category-filtered post list with featured hero card, category pills, 3-col responsive grid
- BlogPostComponent: article detail page with Markdown→HTML rendering (via `marked` library), prose typography, related posts, 404 state
- blog-registry.ts: static registry of blog post front-matter + body as string literals (no runtime file loading)

3 seed posts:
- "Restaurant POS Systems in 2026: What Actually Matters" (featured, Restaurant Tech)
- "How to Eliminate 30% Delivery Commissions Without Losing Customers" (Delivery)
- "BYOD Restaurant Tech: Why Your iPad Is Better Than a $1,200 Terminal" (Restaurant Tech)

Markdown source files in src/content/blog/ (reference copies — the registry is the build-time source of truth).

## Services
- BlogService (services/blog.service.ts): signal-based, reads from static blog-registry.ts

## Dependencies
- `marked` (npm) — Markdown-to-HTML rendering for blog post detail page

## Conventions
- Standalone components, OnPush, signals
- os- selector prefix
- Lazy-loaded routes via loadComponent()
- Bootstrap responsive breakpoints (575.98px, 767.98px, 991.98px)
- Bootstrap Icons (bi-*) for all icons
- Vitest for unit tests
- No @angular/animations
- No hardcoded copy (all from marketing.config.ts)

## Route Integration
Marketing routes are registered in app.routes.ts as the FIRST route block
(before auth routes). The root / loads MarketingLayoutComponent with
LandingComponent as its default child. Blog post detail route (`blog/:slug`)
is registered BEFORE the blog list route (`blog`) so parameterized URLs match first.

## Adding a New Blog Post
1. Write the Markdown file in `src/content/blog/your-slug.md` with YAML front-matter
2. Add a corresponding entry to `BLOG_POSTS_RAW` in `services/blog-registry.ts`
3. The BlogService picks it up automatically (sorted by date descending)

### C-06 — Savings Calculator & Structured Data
- SavingsCalculatorComponent: interactive 3-input calculator comparing OrderStack vs Toast vs Square
  - Signal-based sliders + number inputs (monthlyOrders, avgTicket, deliveryPct)
  - Real-time cost computation with animated count-up results (requestAnimationFrame, ease-out cubic)
  - Fee models from published competitor rates (March 2026) in COMPETITOR_FEE_MODELS
  - Assumptions disclosure below results
  - 150ms input debounce prevents animation spam during slider drag
- Schema.org structured data on pricing page (FAQPage + Product/Offer JSON-LD)
  - Injected via Renderer2 in ngOnInit, removed in ngOnDestroy
- Calculator placed on dark background section between competitor comparison and FAQ

### C-07 — Social Proof & Testimonials
- TestimonialCardComponent: inline template/styles, star rating, initials avatar fallback, decorative quotation mark
- TestimonialSectionComponent: carousel wrapper with CSS translateX slide transition
  - Auto-advance every 6s, pause on hover
  - Touch/swipe via pointer events (pointerdown/pointermove/pointerup, 50px threshold)
  - Navigation dots (clickable, active = --os-primary)
  - afterNextRender for auto-advance init, OnDestroy cleanup
- AnimatedMetricComponent: IntersectionObserver (threshold 0.3), requestAnimationFrame count-up over 1500ms with ease-out cubic, fires once then disconnects
- MetricStripComponent: replaces StatsStripComponent, 4-column grid with AnimatedMetricComponent instances, dark background
- LogoCarouselComponent: CSS @keyframes infinite scroll, logos duplicated in DOM for seamless loop, grayscale→color on hover, animation paused on hover, gradient mask edges
- CaseStudyCardComponent: image/gradient placeholder, business type badge, metric pills, muted "Read Case Study" link (phase 1)
- 8 SVG placeholder logos in src/assets/logos/ (Stripe, DoorDash, Uber, Star Micronics, PayPal, Google, QuickBooks, Xero)

Integration:
- Landing page: StatsStrip swapped for MetricStrip, added testimonials carousel, logo carousel, case studies grid (3-col)
- Pricing page: testimonial carousel added between savings calculator and FAQ

Config added to marketing.config.ts:
- Testimonial interface + TESTIMONIALS_HEADER + TESTIMONIALS (5 entries)
- MetricHighlight interface + METRIC_HIGHLIGHTS (4 entries)
- PartnerLogo interface + PARTNER_LOGOS (8 entries)
- CaseStudyPreview interface + CASE_STUDIES_HEADER + CASE_STUDIES (3 entries)

### C-09 — Integration Ecosystem Page
- IntegrationsPageComponent: `/integrations` route with category filtering + search
  - 18 integration entries across 6 categories (payments, delivery, hardware, accounting, marketing, operations)
  - 3 statuses: available (green), beta (amber), coming_soon (muted dashed)
  - Signal-based filtering: activeCategory + searchQuery -> computed filteredIntegrations
  - Sort order: available first, beta second, coming_soon last
  - Empty state when no results match
- IntegrationCardComponent: reusable card with logo, status badge, description, learn more link
  - 3-line clamp on description, hover lift effect
  - Status badges: green (available), amber (beta), dashed border (coming_soon)
- Featured Star CloudPRNT section (alt background, 3 numbered setup steps, printer placeholder)
- API developer section (dark background, 4 feature pills, docs CTA button)
- 10 new placeholder SVGs in src/assets/logos/ (Square Reader, Nash, Epson, Socket Mobile, FreshBooks, Mailchimp, Meta, 7shifts, Google Calendar, Zapier)

Config added to marketing.config.ts:
- IntegrationStatus, IntegrationCategory types
- Integration, IntegrationCategoryOption interfaces
- INTEGRATION_CATEGORIES (7 entries), INTEGRATIONS (18 entries)
- INTEGRATIONS_HERO, INTEGRATIONS_API_SECTION, INTEGRATIONS_CLOUDPRNT_FEATURE
- INTEGRATIONS_STATUS_LABELS

### C-10 — Lead Capture & CTA System
- ContactPageComponent: `/contact` route with two-column layout
  - Signal-based contact form (name, email, phone, restaurantName, inquiryType, message)
  - Inline validation on blur, disabled submit when invalid
  - Mock submission (console.log) with simulated delay — TODO: wire to backend POST /api/leads
  - Thank-you state replaces form after submission with personalized name
  - Right column: contact info cards + "Prefer a demo?" callout
  - Query param support: `?type=demo_request` pre-selects inquiry type
- EmailCaptureComponent: compact inline email signup, reusable across pages
  - Configurable headline, subtext, button label, tracking source via signal inputs
  - Embedded on blog page in alt-background section
- ExitIntentPopupComponent: once-per-session modal on desktop only
  - Triggers on mouseleave above viewport after 10s delay
  - sessionStorage prevents re-showing
  - Excluded on /contact and /signup pages
  - Close via X button, backdrop click, or Escape key
  - Lives in MarketingLayoutComponent for site-wide coverage
  - Auto-closes 3s after email submit
- All form submissions mock-only (console.log) until backend endpoint exists

Config added to marketing.config.ts:
- CONTACT_HERO, INQUIRY_TYPES, CONTACT_INFO, CONTACT_THANK_YOU, CONTACT_FORM_LABELS, CONTACT_VALIDATION
- EXIT_INTENT_CONFIG

### C-11 — Legal Pages, Company Pages & SEO Meta
- SeoMetaService (services/seo-meta.service.ts): injectable service using Angular `Title` and `Meta`
  - `apply(pageKey)` sets `<title>`, meta description, Open Graph, Twitter Card, canonical link
  - SEO_CONFIGS record in marketing.config.ts with 10 page entries
  - Integrated into all 10 page components via `ngOnInit()`
- LegalPageLayoutComponent: shared wrapper for legal pages (pageTitle, lastUpdated, sections inputs)
- PrivacyPageComponent: /privacy (10 sections, restaurant SaaS-specific content)
- TermsPageComponent: /terms (13 sections, Florida governing law)
- AboutPageComponent: /about (hero, mission pull-quote, 3 value cards, local section, final CTA)
- CareersPageComponent: /careers (empty state placeholder with email link)
- Route redirects: /solutions/* → /features, /help → /contact

Config added to marketing.config.ts:
- PageSeoConfig interface + SEO_CONFIGS (10 entries)
- LegalSection interface + PRIVACY_POLICY (10 sections) + TERMS_OF_SERVICE (13 sections)
- ABOUT_HERO, ABOUT_MISSION, ValueCard interface, ABOUT_VALUES (3 entries), ABOUT_LOCAL
- CAREERS_HERO, CAREERS_EMPTY

## Services
- BlogService (services/blog.service.ts): signal-based, reads from static blog-registry.ts
- SeoMetaService (services/seo-meta.service.ts): Title + Meta injection, canonical link management

## Pages
- LandingComponent: / (full landing page with all sections)
- PricingPageComponent: /pricing (plans, rates, comparison, FAQ)
- DemoPageComponent: /demo (business type selector + feature tour)
- BlogPageComponent: /blog (category-filtered post list with featured hero card + email capture)
- BlogPostComponent: /blog/:slug (article detail with Markdown rendering)
- IntegrationsPageComponent: /integrations (category-filtered integration grid)
- ContactPageComponent: /contact (contact form + demo request)
- PrivacyPageComponent: /privacy (privacy policy with legal page layout)
- TermsPageComponent: /terms (terms of service with legal page layout)
- AboutPageComponent: /about (mission, values, local presence)
- CareersPageComponent: /careers (empty state placeholder)

## Route Redirects
- /solutions/full-service → /features
- /solutions/quick-service → /features
- /solutions/retail → /features
- /solutions/services → /features
- /help → /contact

## Future Prompts
- C-12+: TBD
