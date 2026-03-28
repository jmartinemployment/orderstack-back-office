# Online Ordering

## Purpose
Customer-facing online ordering portal, guest check viewer, customer account portal, and scan-to-pay.

## Routes
- `/order/:restaurantSlug` — Public ordering portal (no auth)
- `/guest-check` — Guest check viewer (no auth)
- `/account/:restaurantSlug` — Customer account portal (no auth)
- `/pay/:checkToken` — Scan-to-pay for dine-in (no auth)
- `/online-ordering` — Admin view (authenticated, inside sidebar)

## Components
- **OnlineOrderPortal** (`os-online-order-portal`) — Full menu browsing, cart, checkout for pickup/delivery/dine-in
- **GuestCheck** (`os-guest-check`) — View and pay an open check
- **CustomerPortal** (`os-customer-portal`) — Customer account: order history, loyalty points, saved addresses
- **ScanToPay** (`os-scan-to-pay`) — QR code payment for dine-in checks

## Services
- `MenuService` — Public menu data
- `CartService` — Order building
- `CheckoutService` — Payment processing
- `OrderService` — Order submission and tracking

## Key Patterns
- Public routes (no auth required) for customer-facing pages
- Restaurant identified by slug in URL
- Admin route (`/online-ordering`) redirects to `/home` in audit
