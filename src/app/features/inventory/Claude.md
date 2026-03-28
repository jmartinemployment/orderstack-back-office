# Inventory

## Purpose
Restaurant ingredient/supply inventory tracking — stock levels, alerts, predictions, unit conversions, cycle counts.

## Route
`/inventory`

## Components
- **InventoryDashboard** (`os-inventory-dashboard`) — Stock list with search/filter, low-stock alerts, stock predictions, adjustment history

## Services
- `InventoryService` — Stock CRUD, alerts, predictions, adjustments, unit conversions, cycle counts

## Models
- `inventory.model` — InventoryItem, InventoryAlert, StockPrediction, StockAdjustment

## Known API Gaps (404s)
- `GET /inventory/unit-conversions` — Not implemented
- `GET /inventory/cycle-counts` — Not implemented

## Key Patterns
- One form input without label (accessibility issue from audit)
- All services handle 404 gracefully (return empty data)
