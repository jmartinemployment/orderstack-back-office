# Analytics

## Purpose
Business intelligence dashboards: unified command center, sales analytics, and menu engineering.

## Routes
- `/command-center` — Unified KPI dashboard with tabs: Overview, Insights, Alerts, Forecast
- `/sales` — Sales dashboard with goals, team performance, funnel, alerts, real-time KPIs
- `/menu-engineering` — Menu quadrant analysis (Stars/Cash Cows/Puzzles/Dogs) with deep-dive tabs

## Components
- **CommandCenter** (`os-command-center`) — KPI cards, unified insights feed, inventory alerts, predictions, predictive analytics (revenue forecast, demand forecast, staffing recommendations), proactive AI insights, pinned widgets
- **SalesDashboard** (`os-sales-dashboard`) — Period toggle (daily/weekly), sales goals CRUD, team leaderboard with chart, conversion funnel, sales alerts with acknowledgment, real-time KPIs refreshing every 60s
- **MenuEngineeringDashboard** (`os-menu-engineering`) — Quadrant filter/sort, deep-dive tabs (profitability trends, price elasticity, cannibalization, seasonal patterns, prep time accuracy)

## Services
- `AnalyticsService` — Sales reports, menu engineering, goals, team reports, funnel, alerts, forecasts, AI insights, prep time accuracy
- `InventoryService` — Alerts, stock predictions
- `OrderService` — Active order count, recent profit summary
- `ReportService` — Real-time KPIs

## Models
- `analytics.model` — SalesReport, MenuEngineeringResult, MenuQuadrant, RevenueForecast, DemandForecastItem, StaffingRecommendation, AiInsightCard, PinnedWidget, GoalProgress, TeamMemberSales, FunnelStep, SalesAlert, RealTimeKpi, PrepTimeAccuracyRow, etc.

## Key Patterns
- Tab-based navigation within each dashboard
- `effect()` to auto-load data when authenticated
- Chart.js integration via `@shared/utils/chart-helpers`
- Computed signals for derived KPIs and filtered/sorted lists
