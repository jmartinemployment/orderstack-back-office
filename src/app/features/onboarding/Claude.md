# Onboarding

## Purpose
New merchant setup — multi-step wizard and device setup.

## Routes
- `/setup` — Setup wizard (requires auth)
- `/device-setup` — Device configuration (requires auth)

## Components
- **SetupWizard** (`os-setup-wizard`) — Multi-step wizard (9 steps food & drink, 7 others): business info, menu import, payment connection, floor plan, stations, delivery, hardware, review
- **DeviceSetup** (`os-device-setup`) — Device name, mode selection, station assignment

## Key Patterns
- Setup wizard is the source of truth for step count, business type mapping, hardware products, delivery providers, plan tiers
- Has a "Skip (testing only)" button that MUST be removed before production (search `TODO: Remove skip`)
- `onboardingGuard` ensures wizard completion before accessing main app
- Has Vitest spec for SetupWizard
