# Kiosk

## Purpose
Self-service ordering terminal for customers — touchscreen menu browsing, item customization, and checkout.

## Route
`/kiosk` — Full-screen (no sidebar), requires auth + onboarding + device init

## Components
- **KioskTerminal** (`os-kiosk-terminal`) — Full-screen customer-facing order flow: category browse → item select → modifiers → cart → checkout

## Services
- `MenuService` — Menu categories and items
- `CartService` — Order building
- `PaymentService` — Checkout flow
- `OrderService` — Order submission

## Key Patterns
- Full-screen route, customer-facing (large fonts, big touch targets)
- `/sos` redirects to `/kiosk`
- Redirects to `/home` in audit (likely requires kiosk device mode)
