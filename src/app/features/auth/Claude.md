# Auth

## Purpose
Authentication flow: login, restaurant selection, POS staff login, and device pairing.

## Routes
- `/login` and `/signup` — Email/password login (uses `AuthLayoutComponent`)
- `/select-restaurant` — Multi-restaurant picker after login
- `/pos-login` — Staff PIN/passcode entry for POS terminals
- `/pair` — Device pairing flow

## Components
- **Login** (`os-login`) — Email + password form, handles redirect after auth
- **RestaurantSelect** (`os-restaurant-select`) — Lists user's restaurants, sets `selectedMerchantId`
- **PosLogin** (`os-pos-login`) — PIN pad for staff clock-in on POS devices
- **PairDevice** (`os-pair-device`) — Device pairing with QR code or manual code entry

## Services
- `AuthService` — Login, logout, token management, `isAuthenticated` signal, `selectedMerchantId` signal

## Guards
- `authGuard` — Returns `false` for unauthenticated (does NOT redirect)
- `guestGuard` — Redirects authenticated users away from login/signup
- `onboardingGuard` — Ensures setup wizard is complete

## Key Patterns
- No automatic redirect to `/login` — guard returns `false` only
- Restaurant selection is a separate step after login for multi-location users
- Has Vitest specs for Login and RestaurantSelect
