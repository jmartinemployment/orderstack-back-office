# Catering

## Purpose
Complete catering event management module. Manages the full lifecycle
from inquiry through event completion with financial tracking, proposals,
BEOs, prep lists, and client-facing portals.

## API Base
GET/POST /api/merchant/:id/catering/events
PATCH/DELETE /api/merchant/:id/catering/events/:eventId
PATCH /api/merchant/:id/catering/events/:eventId/milestones/:milestoneId/pay
POST /api/merchant/:id/catering/events/:eventId/clone
POST /api/merchant/:id/catering/events/:eventId/proposal
POST /api/merchant/:id/catering/events/:eventId/contract
GET /api/merchant/:id/catering/events/:eventId/activity
GET /api/merchant/:id/catering/clients
GET /api/merchant/:id/catering/prep-list?date=YYYY-MM-DD
GET /api/merchant/:id/reports/catering/deferred
GET /api/merchant/:id/reports/catering/performance
GET/PUT /api/merchant/:id/catering/capacity

### Public (no auth)
GET /api/catering/proposal/:token
POST /api/catering/proposal/:token/approve
GET /api/catering/portal/:token
POST /api/catering/lead/:merchantSlug

## Routes
- /app/catering — CateringDashboard (5 tabs + KPIs + search + bulk actions)
- /app/catering/job/:id — CateringJobDetail (central hub)
- /app/catering/job/:id/beo — CateringBeo (print-optimized)
- /app/catering/reports — CateringReports (deferred revenue + performance)
- /app/catering/prep-list — CateringPrepList (daily aggregate)
- /catering/proposal/:token — CateringProposal (public, no auth)
- /catering/portal/:token — CateringGuestPortal (public, no auth)
- /catering/inquiry/:merchantSlug — CateringLeadForm (public, no auth)

## Components
- CateringDashboard (os-catering-dashboard) — KPI cards, next event banner, status filter, search, bulk actions, empty state onboarding
- CateringEventCard (os-catering-event-card) — financial summary, payment progress bar, company name
- CateringEventForm (os-catering-event-form) — create/edit slide-out panel with company name
- CateringCalendar (os-catering-calendar) — mini job chips with status colors, click-to-navigate
- CateringJobDetail (os-catering-job-detail) — 7 sections: overview, packages, milestones, dietary, delivery, tastings, activity
- CateringProposal (os-catering-proposal) — public proposal page with package comparison
- CateringBeo (os-catering-beo) — print-optimized Banquet Event Order
- CateringReports (os-catering-reports) — deferred revenue table + performance KPIs
- CateringPrepList (os-catering-prep-list) — daily aggregate prep list with date picker
- CateringLeadForm (os-catering-lead-form) — public inquiry form by merchant slug
- CateringGuestPortal (os-catering-guest-portal) — unified client portal

## Service
CateringService — HttpClient-based, signal state, pipeline metrics

### Key methods
- loadJobs, getJob, createJob, updateJob, deleteJob
- markMilestonePaid, cloneJob, generateProposal, uploadContract
- loadActivity, loadClients, loadPrepList
- loadDeferredRevenue, loadPerformanceReport, bulkUpdateStatus
- getProposal, approveProposal, getPortal, submitLead (public, no auth)

### Sidebar signals
- pendingJobsCount — jobs with status 'inquiry'
- proposalsAwaitingApproval — jobs with status 'proposal_sent'
- milestonesComingDue — milestones due within 7 days and unpaid

## Model
CateringJob — full financial model with packages, milestones, invoicing, dietary, tastings, delivery
DietaryRequirements — structured allergen/dietary counts
CateringTasting — scheduled tastings with notes and outcomes
DeliveryDetails — driver, times, equipment checklist, route notes
CateringActivity — audit trail entries
CateringClientHistory — per-client job count, revenue, repeat rate
CateringPerformanceReport — KPIs and breakdowns
CateringPrepList — daily aggregate with per-job breakdown
Backward compat aliases: CateringEvent = CateringJob

## Fee calculation
subtotalCents (package price * headcount)
+ serviceChargeCents (subtotalCents * serviceChargePercent / 100)
+ taxCents (subtotalCents * taxPercent / 100)
+ gratuityCents (subtotalCents * gratuityPercent / 100)
= totalCents

## Sidebar visibility
Catering mode gets a completely different sidebar nav (buildCateringNav):
Administration, Jobs & Calendar (badge: pending count), Invoices (badge: milestones due),
Prep Lists, Catering Menu, Clients, Reports, Staff/Scheduling, Marketing, Settings

## Status flow
inquiry -> proposal_sent -> contract_signed -> deposit_received -> in_progress -> final_payment -> completed
(cancelled from any state except completed)

## Remaining work
- #14: Invoice branding defaults — needs columns on Restaurant Prisma model
- #23: Transactional email — needs Resend email service (backend)
- #24: Payment reminder cron — needs daily cron job (depends on #23)

## API Base (additions)
POST /api/merchant/:id/catering/events/:eventId/proposal/generate
PATCH /api/merchant/:id/catering/events/:eventId/proposal/content

## AI Proposal Feature (FEATURE-12)
- `CateringJob.aiContent?: ProposalAiContent | null` — stored in `catering_events.ai_content` column
- `ProposalAiContent` — { intro, menuDescriptions[], serviceOverview, dietaryStatement, closing, generatedAt, tone }
- Generate endpoint: 403 when feature disabled, 429+Retry-After within 30s cooldown, 50-item cap
- Save endpoint: merges edits, preserves generatedAt + tone
- Public proposal page renders AI content when present, static fallback when null
- CateringJobDetail has "AI Proposal" tab (8th tab in nav)

## Session Notes

**March 10, 2026 (Session 4 — Follow-up Debug Audit):**
- Full static re-read of all 18 catering components + Playwright browser verification (15 screens)
- Fixed BUG-12: `formatTime()` in prep-list returned raw 24h string — now converts to 12h AM/PM
- Fixed BUG-13: Delivery board card showed raw "14:30" times — added `formatTime()` to `CateringDeliveryComponent`, updated template
- Phase 3 (package edit deep dive): flow confirmed correct, no bug
- Phase 4 (modifier search): zero modifier references in catering — clean
- Zero console errors, zero API 404s across all 15 tested screens
- `jayscatering@gmail.com` still does not exist — `/app/menu/packages` and `/app/invoicing/milestones` still unverified in browser
- Total bugs across both sessions: 15 found, 15 fixed

**March 9, 2026 (Session 3 — Full Debug Audit):**
- Ran complete static code audit + Playwright browser verification across all 18 catering components
- Bug report: `docs/BUG-REPORT-catering-audit.md` — 13 bugs found, 13 fixed
- Fixed BUG-01: `pricePerUnit` (dollars) passed to `formatCents()` — proposal + BEO both showing prices 100× too small
- Fixed BUG-02: `closeRate * 100` in performance reports — was showing 7500% instead of 75%
- Fixed BUG-03/04/05a/05b: Four navigation routes missing `/app` prefix — deferred report, delivery, home dashboard quick actions, revenue report widget
- Fixed BUG-06: Native `<progress>` element broke Bootstrap progress bar in guest portal
- Fixed BUG-07: `proposalSentAt` field added to Prisma schema + pushed to Supabase, backfilled 4 existing rows, frontend model + proposals component updated
- Fixed BUG-08: Package library item filter unified to `cateringPricing.length > 0` (was `menuType === 'catering'`)
- Fixed BUG-09: `uploadContract()` `prompt()` replaced with inline URL form panel in job detail
- Fixed BUG-10: BEO toolbar buttons missing `type="button"`
- Browser health check: ZERO API errors, ZERO console errors across all tested screens
- `jayscatering@gmail.com` does not exist in production — use `owner@taipa.com` for catering testing
- Pending: browser verify `/app/menu/packages` and `/app/invoicing/milestones` once jayscatering is seeded

**March 6, 2026 (Session 1):**
- Implemented all 32 items from FEATURE-05 plan (28 fully done, 4 partial/not done)
- Backend: Prisma schema with all financial/JSON fields, 22 endpoints, activity auto-logging
- Frontend: 10 new components, 40 files changed, 5856 insertions
- Backend commit: 8d46fc2, Frontend commit: 79464bb
- Both pushed to origin/main

**March 7, 2026 (Session 2):**
- Implemented #13: Catering menu pricing
- Backend: Added `cateringPricing` Json column to MenuItem Prisma model, pushed to Supabase
- Backend: POST/PATCH menu item handlers accept and persist cateringPricing, all transform functions include it
- Frontend: CateringPricingTier interface on MenuItem, cateringItems computed signal on MenuService
- Frontend: Collapsible catering pricing tier editor in item-management form (visible only in catering mode)
- Frontend: Package builder in catering-job-detail now has menu item picker with tier selection
- Frontend: Package cards show selected menu items with pricing
- Frontend: CateringPackage model extended with menuItems snapshot (name + pricingTier)
- Tests: 10 new Vitest tests (4 cateringItems filter, 6 item-management pricing tiers) — all pass
- Backend commit: 389ccb1, Frontend commit: 13b9443
- Both pushed to origin/main
