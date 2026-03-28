# Tip Management Feature

## Purpose
Manager-facing tip pool/tip-out rule configuration, tip reporting with date ranges, and compliance checking.

## Routes
- `/tip-management` — TipManagement (auth-guarded, manager+)

## Components

### TipManagement (`os-tip-management`)
4-tab interface:

- **Reports** — Date range picker (start/end) with Today/This Week presets. Displays TipService report data. Per-server hours input for pool calculations. CSV download.
- **Pool Rules** — Create/toggle/remove tip pool rules. Methods: even distribution. Participant roles configurable. Rules stored in TipManagementSettings.
- **Tip-Out Rules** — Create/toggle/remove tip-out rules. Methods: percentage_of_tips. Source/target role pairs (e.g., server → bartender). Configurable percentage.
- **Compliance** — Compliance checks per server from TipService. Manager+ role gate via AuthService.

**Services:** TipService, RestaurantSettingsService, AuthService, OrderService

## Models
- TipPoolRule, TipOutRule, TipPoolMethod, TipOutMethod
- TipManagementSettings, ComplianceCheck

## Key Patterns
- Settings saved via `RestaurantSettingsService.saveTipManagementSettings()`
- TipService.setDateRange() drives report data reactively
- Pool/tip-out rules are UUIDs, toggled active/inactive
- `isManagerOrAbove` computed from AuthService user role
- OrderService loads up to 500 orders on init for tip calculations
- Save success toast auto-dismisses after 3 seconds
