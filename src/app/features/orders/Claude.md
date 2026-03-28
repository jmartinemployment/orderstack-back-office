# Orders

## Purpose
Order management — pending orders queue, order history with search/filter, and receipt printing.

## Routes
- `/orders` — Pending orders queue
- `/order-history` — Historical order browser

## Components
- **PendingOrders** (`os-pending-orders`) — Real-time pending order list with status updates, accept/reject actions
- **OrderHistory** (`os-order-history`) — Searchable order archive with date range, status filter, order detail view
- **ReceiptPrinter** (`os-receipt-printer`) — Receipt generation and Star CloudPRNT printing

## Services
- `OrderService` — Order CRUD, status updates, real-time stream
- `PrinterService` — Receipt formatting and CloudPRNT integration

## Models
- `order.model` — Order, OrderItem, OrderStatus, OrderSource
- `printer.model` — PrintJob, PrinterConfig

## Key Patterns
- Has Vitest spec for PendingOrders
- Real-time updates via SocketService
