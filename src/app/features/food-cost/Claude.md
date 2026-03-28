# Food Cost

## Purpose
Food cost tracking and recipe costing — cost per item, cost percentage, and margin analysis.

## Route
`/food-cost`

## Components
- **FoodCostDashboard** (`os-food-cost-dashboard`) — Tabbed dashboard with overview, per-item costs, recipe costing, and trend analysis

## Services
- `RecipeCostingService` — Recipe ingredient costs, batch cost calculations
- `AnalyticsService` — Food cost percentage trends
- `InventoryService` — Ingredient prices

## Models
- `inventory.model` — InventoryItem with cost fields
- `analytics.model` — Food cost analytics

## Known Issues
- Tab "Overview" not found in Playwright audit (tab label/selector mismatch)
