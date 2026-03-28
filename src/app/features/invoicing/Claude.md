# Invoicing

## Purpose
Create and manage invoices for catering, events, and B2B customers.

## Route
`/invoicing`

## Components
- **InvoiceManager** (`os-invoice-manager`) — Invoice list, create/edit invoice form, line items, tax calculation, send via email, payment tracking

## Services
- `InvoiceService` — Invoice CRUD, send, mark paid, payment history

## Models
- `invoice.model` — Invoice, InvoiceLineItem, InvoiceStatus, PaymentRecord
