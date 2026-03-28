# POS (Point of Sale)

## Purpose
Full-service POS terminal with order building, modifiers, discounts, voids, cash drawer, and customer display.

## Routes
- `/pos` — Full-screen server POS terminal (no sidebar)
- `/cash-drawer` — Cash drawer management (inside sidebar)
- `/customer-display` — Customer-facing order display (public, no auth)

## Components
- **ServerPosTerminal** (`os-server-pos-terminal`) — Full POS: menu grid, order pad, table/seat selection, payment, check splitting
- **CashDrawer** (`os-cash-drawer`) — Open/close drawer, cash counts, pay-in/pay-out
- **CustomerDisplay** (`os-customer-display`) — Customer-facing screen showing current order and total
- **DiscountModal** (`os-discount-modal`) — Apply percentage/dollar/item discounts
- **ManagerPinPrompt** (`os-manager-pin-prompt`) — PIN verification for voids, discounts, drawer access
- **ModifierPrompt** (`os-modifier-prompt`) — Conversational modifier selection when adding items
- **VoidModal** (`os-void-modal`) — Void item or entire order with reason

## Services
- `CartService` — Order building, item add/remove, modifier application
- `PaymentService` — Payment processing (card, cash, split)
- `CashDrawerService` — Drawer state, counts, pay-in/pay-out
- `OrderService` — Order submission and kitchen routing
- `MenuService` — Menu items and categories

## Models
- `order.model`, `cart.model`, `payment.model`, `cash-drawer.model`

## Key Patterns
- Full-screen route (no `MainLayoutComponent`)
- Uses `deviceInitResolver`
- `/order-pad` redirects to `/pos`
- Has Vitest spec for ModifierPrompt
- 1 button without aria-label on Order Pad (accessibility issue)
