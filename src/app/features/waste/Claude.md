# Waste Feature

## Purpose
Track food waste by category, analyze patterns, and generate actionable recommendations to reduce waste costs.

## Routes
- `/waste` — WasteTracker (auth-guarded)

## Components

### WasteTracker (`os-waste-tracker`)
3-tab interface:

- **Log** — Waste entry form: select inventory item, category, quantity, optional reason. Entries list with category filter (all, prep_loss, spoilage, customer_return, damaged, overproduction). Delete individual entries. Estimated cost auto-calculated from `inventoryItem.costPerUnit × quantity`.
- **Summary** — Total waste cost, entries count. Breakdown by category with cost and percentage bars. Top 5 wasted items by cost.
- **Recommendations** — Auto-generated insights: highest waste category, most-wasted individual item (if ≥2 occurrences), peak waste day of week. Priority levels (high/medium/low) based on cost thresholds. Estimated savings shown per recommendation.

**Services:** InventoryService, AuthService

## Models
- `@models/waste.model` — WasteEntry, WasteCategory, WasteSummary, WasteRecommendation, WasteTab

## Key Patterns
- Waste entries stored in component signal (client-side only, no backend persistence yet)
- On waste log, also calls `inventoryService.recordUsage()` to deduct from inventory
- 5 waste categories: prep_loss, spoilage, customer_return, damaged, overproduction
- Recommendations are fully computed (no AI) — threshold-based analysis of entries
- Cost thresholds: >$100 = high priority, >$50 = medium, else low
- Day-of-week analysis requires ≥2 different days of data
