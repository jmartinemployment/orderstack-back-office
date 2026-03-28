# Register

## Purpose
Dedicated register terminal — full-screen checkout station for cashier use.

## Route
`/register` — Full-screen (no sidebar), requires auth + onboarding + device init

## Components
- **RegisterTerminal** (`os-register-terminal`) — Register-mode POS with cash drawer integration, receipt printing, and transaction log

## Services
- Same as POS: `CartService`, `PaymentService`, `OrderService`, `CashDrawerService`, `PrinterService`

## Key Patterns
- Full-screen route (no `MainLayoutComponent`)
- Uses `deviceInitResolver`
- Optimized for cashier workflow: scan/key items, take payment, print receipt, next customer
