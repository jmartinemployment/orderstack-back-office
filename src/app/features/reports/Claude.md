# Reports Feature

## Purpose
Close-of-day reporting, custom report builder, and report dashboard with scheduling and export capabilities.

## Routes
- `/close-of-day` — CloseOfDay (auth-guarded)
- `/reports` — ReportDashboard (auth-guarded, manager+)

## Components

### CloseOfDay (`os-close-of-day`)
9-tab daily report: summary, payments, tips, voids, items, team, taxes, cash, delivery. Date picker to view past days. Computed KPIs from closed orders: revenue, average check, guest count, tips, tax. Payment method breakdown, void/comp/discount summaries with reasons, top 15 sellers, order source breakdown. CSV export and browser print.

**Services:** OrderService, AnalyticsService, TipService, AuthService, ReportService, CashDrawerService, DeliveryService

### ReportBuilder (`os-report-builder`)
Drag-and-drop block-based custom report composer. 15 block types (sales_summary, payment_methods, item_sales, category_sales, modifier_sales, team_member_sales, discounts, voids_comps, taxes_fees, tips, hourly_breakdown, section_sales, channel_breakdown, refunds). Date range with comparison period support (previous_period, previous_year, custom). Input/output component — receives `editingReport`, emits `saved`/`cancelled`.

**Services:** ReportService

### ReportDashboard (`os-report-dashboard`)
Lists saved reports with create/edit/delete. Embeds ReportBuilder in builder view. Schedule modal (daily/weekly/monthly frequency, email recipients). Export modal (PDF/CSV/XLSX format, date range, comparison). Quick links to built-in reports (close-of-day, sales, labor).

**Services:** ReportService, Router

## Models
- `ReportBlock`, `ReportBlockType`, `SavedReport`, `SavedReportFormData`
- `ComparisonPeriod`, `ReportSchedule`, `ReportScheduleFormData`
- `ReportScheduleFrequency`, `ReportExportFormat`, `ReportDateRange`
- `TeamMemberSalesRow`, `TaxServiceChargeReport`, `CashReconciliation`
- `DeliveryAnalyticsReport`

## Key Patterns
- All state via signals with `.asReadonly()` exposure
- CloseOfDay has a Vitest spec (`close-of-day.spec.ts`)
- Tab-lazy loading: team sales, tax report, delivery analytics load on first tab visit
- ReportBuilder is a child component of ReportDashboard (not routed independently)
- CashDrawerService injected as `readonly` (template access needed)
