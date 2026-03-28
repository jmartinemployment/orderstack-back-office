# Bookings

## Purpose
Appointment and reservation booking system with manager dashboard, customer-facing widget, and dedicated terminal.

## Routes
- `/bookings` — Manager dashboard (inside sidebar layout)
- `/bookings-terminal` — Full-screen terminal (no sidebar)

## Components
- **BookingManager** (`os-booking-manager`) — Calendar view, booking list, create/edit/cancel bookings
- **BookingsTerminal** (`os-bookings-terminal`) — Full-screen check-in terminal for front desk
- **Booking** (`os-booking`) — Individual booking display card
- **BookingWidget** (`os-booking-widget`) — Embeddable customer-facing booking form

## Services
- `BookingService` — CRUD bookings, availability checks, waitlist management

## Models
- `booking.model` — Booking, BookingSlot, BookingStatus, WaitlistEntry

## Key Patterns
- BookingsTerminal is a dedicated device mode (full-screen, no sidebar)
- BookingWidget is designed for embedding in customer-facing portals
