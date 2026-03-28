# Pricing (Dynamic)

## Purpose
AI-powered dynamic menu pricing — price optimization based on demand, time of day, and inventory levels.

## Route
`/dynamic-pricing` (also accessible via `/pricing` redirect)

## Components
- **DynamicPricing** (`os-dynamic-pricing`) — Price rule builder, demand-based suggestions, A/B test results, margin impact preview

## Services
- `AnalyticsService` — Demand data, price elasticity
- `MenuService` — Current pricing

## Models
- `pricing.model` — PriceRule, PriceSuggestion, DemandSignal

## Note
This is the **internal** dynamic pricing tool. The public-facing marketing pricing page is in `features/website/`.
