# Bar Terminal

## Purpose

The bar terminal is a full-screen, dual-mode interface optimized for bartenders and bar staff. In **Create Orders** mode it functions as a POS with color-coded beverage tiles, a keypad for quick-price entry, and a checkout panel. In **Incoming Orders** mode it displays a three-column KDS (NEW / PREPARING / READY) filtered to bar-relevant orders based on station-to-category mappings or beverage keyword fallback. It connects via Socket.io for real-time order updates and plays configurable sound alerts on new orders. It fits into the OrderStack device ecosystem alongside the Server POS, Quick Service, KDS, Kiosk, and SOS terminals.

## Route

`/bar` — Full-screen (no sidebar/MainLayoutComponent), requires `authGuard` and `deviceInitResolver`.

## Files

| File | Description |
|------|-------------|
| `bar-terminal/bar-terminal.ts` | Component class — signals, services, mode toggle, menu filtering, KDS columns, payment modal, sound effect |
| `bar-terminal/bar-terminal.html` | Template — Create Orders (tabs, pills, grid, sale panel, keypad, weight scale, checkout) and Incoming Orders (3-column KDS, payment modal) |
| `bar-terminal/bar-terminal.scss` | Styles — mode toggle, grid layout, sale panel, keypad, KDS columns, payment modal, animations |
| `bar-terminal/index.ts` | Barrel export for `BarTerminal` |
| `Claude.md` | This file |

## Components

- **BarTerminal** (`os-bar-terminal`) — Standalone component with OnPush change detection, two modes (create/incoming), inject-based DI

## Services

| Service | What it provides |
|---------|-----------------|
| `MenuService` | `allItems()`, `categories()`, `isLoading`, `error`, `loadMenu()` |
| `OrderService` | `orders()`, `getOrderById()`, `updateOrderStatus()`, `loadOrders()` |
| `RestaurantSettingsService` | `barSettings()` (defaultMode, soundEnabled, soundName, beverageCategoryIds), `paymentSettings()` (processor), `loadSettings()` |
| `StationService` | `categoryToStationMap()`, `loadStations()`, `loadCategoryMappings()` |
| `SocketService` | `connect(merchantId, 'kds')`, `disconnect()` |
| `CheckoutService` | `cartItems()`, `cartCount()`, `tax()`, `total()`, `addItem()`, `removeItem()`, `startCheckout()`, weight scale signals and methods |
| `PaymentService` | `setProcessorType()`, `reset()` |
| `AuthService` | `selectedMerchantId()` |
| `LoyaltyService` | `loadConfig()` |
| `TableService` | `loadTables()` |

## Shared Components Used

| Component | Selector | Inputs/Outputs used |
|-----------|----------|---------------------|
| ItemGrid | `os-item-grid` | `[items]`, `[isLoading]`, `tileMode="color"`, `[categoryColorFn]`, `(itemClick)` |
| TopNavigation | `os-top-navigation` | `[tabs]`, `[activeTab]`, `(tabChange)` |
| BottomNavigation | `os-bottom-navigation` | (none) |
| Checkout | `os-checkout` | `[mode]="'charge'"`, `[orderSource]="'bar'"` |
| PaymentTerminal | `os-payment-terminal` | `[amount]`, `[orderId]`, `[showOnScreen]`, `[showCardReader]`, `(paymentComplete)`, `(paymentFailed)` |
| WeightScale | `os-weight-scale` | `[itemName]`, `[unitPrice]`, `[weightUnit]`, `(weightConfirmed)`, `(cancelled)` |
| ConnectionStatus | `os-connection-status` | (none) |
| OrderCard | `os-order-card` | `[order]`, `[stationFilterId]`, `[menuItemToStationMap]`, `[showCollectPayment]`, `(statusChange)`, `(collectPayment)` |

## Key Patterns

- **Full-screen route** — no `MainLayoutComponent`, loaded via `loadComponent()` in `app.routes.ts`
- **`deviceInitResolver`** — initializes device context before component loads
- **Socket.io connection lifecycle** — connects in `ngOnInit()` with `merchantId` and `'kds'` device type, disconnects in `ngOnDestroy()`
- **Sound alert effect** — Angular `effect()` watches `newOrders().length`, plays configurable sound when count increases (respects `barSettings().soundEnabled`)
- **Station-based order filtering** — maps beverage categories to KDS stations via `categoryToStationMap()`, filters orders to those containing items assigned to the bar station
- **Beverage keyword fallback** — if no `beverageCategoryIds` are configured in settings, falls back to regex matching category names against `/beer|cocktail|drink|beverage|wine|spirit|bar/i`
- **Category auto-select** — on menu load, auto-selects the first beverage category (by keyword match) or falls back to the first category
- **terminal-menu-utils** — reuses `QSR_PALETTE`, `collectMenuItems`, `filterTerminalItems`, `computeTerminalGridItems`, `buildCategoryColorMap`, `handleKeypadPress`, `parseItemPrice`

## Known Gaps or Stubs

None. All services connect to real backend endpoints. No in-memory arrays, localStorage substitutes, or hardcoded data.

## Session Notes

**2026-03-09 (Session 8):**
- Full audit of bar terminal: all 11 gap analysis items verified EXISTS AND CORRECT
- Zero gaps found — all services, shared components, utils, models, and route wiring are complete
- `tsc --noEmit` passed with zero errors
- Playwright E2E verified: page loads, mode toggle works, KDS columns render, category pills render (7 categories with Beverages auto-selected), keypad renders, Charge button visible, zero console errors
- Screenshots at `/tmp/bar-terminal-load.png`, `bar-terminal-incoming.png`, `bar-terminal-create.png`, `bar-terminal-keypad.png`
- No code changes were needed — feature was already fully implemented
