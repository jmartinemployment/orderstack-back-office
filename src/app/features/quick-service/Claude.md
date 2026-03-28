# Quick Service

## Purpose
Quick-service (counter) POS terminal — optimized for speed with conversational ordering, order numbers, and fast payment.

## Route
`/quick-service` — Full-screen (no sidebar), requires auth + onboarding + device init

## Components
- **QuickServiceTerminal** (`os-quick-service-terminal`) — Streamlined POS: category tiles, quick-add items, order number assignment, fast cash/card payment

## Services
- Same as POS: `CartService`, `PaymentService`, `OrderService`, `MenuService`

## Key Patterns
- Full-screen route (no `MainLayoutComponent`)
- Uses `deviceInitResolver`
- Designed for counter service (no table/seat selection unlike server POS)
- Large touch targets, minimal steps to complete an order
