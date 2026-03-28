# Table Management Feature

## Purpose
Interactive floor plan editor and table management with drag-and-drop positioning, status tracking, QR code generation for mobile ordering, and integration with POS and reservations.

## Routes
- `/floor-plan` — FloorPlan (auth-guarded)

## Components

### FloorPlan (`os-floor-plan`)
Two views: floor (visual canvas) and list. Section-based filtering. Drag-and-drop table positioning on a scrollable canvas via pointer events. Table status management (available, occupied, reserved, dirty, maintenance) with color-coded badges. Status counts and total capacity KPIs.

Features: create/edit/delete tables with number, name, capacity, section. Place unplaced tables onto canvas. Table tap navigates to POS with table context. New order creation from table. Bus table (reset to available). QR code generation per table (links to online ordering with restaurant slug and table number). Batch QR code print (opens print window with all tables). Reservation overlay from BookingService.

**Sub-component:** FloorPlanNavigation (`os-floor-plan-navigation`) — section filter bar.

**Shared components used:** TopNavigation, BottomNavigation, LoadingSpinner, ErrorDisplay, ClockOut

**Services:** TableService, OrderService, AuthService, BookingService, CheckoutService, Router

## Models
- RestaurantTable, TableFormData, TableStatus, Booking, Order

## Key Patterns
- Canvas drag uses pointer events (onDragStart/onDragMove/onDragEnd) with offset tracking
- Table position stored as `posX`/`posY` pixels; unplaced tables shown in sidebar
- QR URLs: `geekatyourspot.com/orderstack-online-ordering?restaurant={slug}&table={number}`
- QR images from `api.qrserver.com`
- `CheckoutService.setTableContext()` called before POS navigation
- `tableSelected` output event emits `{table, orders, action}` (not currently consumed externally)
- Restaurant slug derived from merchant name via AuthService
