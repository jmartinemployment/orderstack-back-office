# KDS (Kitchen Display System)

## Purpose
Real-time kitchen order display — orders route to stations with color-coded timers and bump functionality.

## Route
`/kds` — Full-screen (no sidebar), requires auth + onboarding + device init

## Components
- **KdsDisplay** (`os-kds-display`) — Grid of order cards with station filtering, timer colors (green/yellow/red), bump-to-complete
- **OrderCard** (`os-order-card`) — Individual order with items, modifiers, timing badge, bump button
- **StatusBadge** (`os-status-badge`) — Color-coded timer badge (on-time, warning, overdue)

## Services
- `OrderService` — Real-time order stream via WebSocket
- `StationService` — Station assignment and filtering
- `SocketService` — WebSocket connection for live updates

## Models
- `order.model` — Order, OrderItem, OrderStatus
- `station.model` — Station, StationAssignment

## Key Patterns
- Full-screen route (no `MainLayoutComponent`)
- Uses `deviceInitResolver`
- Real-time updates via Socket.io
- Color-coded timing: green (<5min), yellow (5-10min), red (>10min)
- Has Vitest specs for KdsDisplay, OrderCard, StatusBadge
