# Home

## Purpose
Main authenticated dashboard and hardware setup guide.

## Routes
- `/administration` — Home dashboard (requires `administrationGuard`)
- `/hardware-guide` — Recommended hardware and setup instructions

## Components
- **HomeDashboard** (`os-home-dashboard`) — Overview cards with today's sales, orders, active alerts, quick links to key features
- **HardwareGuide** (`os-hardware-guide`) — Compatible hardware recommendations, buy links, setup instructions

## Services
- `AnalyticsService`, `OrderService` — Dashboard KPIs
- `DeviceService` — Hardware compatibility info

## Key Patterns
- `/administration` requires `administrationGuard` (owner/manager roles)
- HomeDashboard is the default landing page for authenticated users
- Has Vitest spec for HomeDashboard
