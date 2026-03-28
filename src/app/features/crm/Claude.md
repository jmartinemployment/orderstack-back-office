# CRM

## Purpose
Customer relationship management — profiles, visit history, segmentation, messaging, and feedback.

## Route
`/customers` (also accessible via `/crm` redirect)

## Components
- **CustomerDashboard** (`os-customer-dashboard`) — Customer list with search, detail view with visit timeline, smart groups, messaging threads, feedback tab

## Services
- `CustomerService` — Customer CRUD, search, feedback, smart groups, messaging

## Models
- `customer.model` — Customer, CustomerVisit, SmartGroup, MessageThread, MessageTemplate

## Known API Gaps (404s)
- `GET /customers/feedback` — Not implemented on backend
- `GET /customers/smart-groups` — Not implemented
- `GET /customers/messages/threads` — Not implemented
- `GET /customers/messages/templates` — Not implemented

## Key Patterns
- Loading spinner stuck on Insights tab (known accessibility issue from audit)
