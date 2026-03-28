# Settings Feature

## Purpose
Central settings hub with 22 configuration panels accessed via the ControlPanel component. Each panel is a standalone child component.

## Routes
- `/settings` — ControlPanel (auth-guarded, manager+)
- Supports `?tab=` query param for direct deep-linking to a specific panel (e.g., `?tab=suppliers`)

## Components

### ControlPanel (`os-control-panel`)
Settings navigation shell. Left sidebar with grouped setting categories, right panel renders selected settings component. Query param `?tab=` support for deep-linking.

### Setting Panels (22 components)
Each is a standalone component with OnPush, loaded inside ControlPanel:

| Component | Selector | Purpose |
|---|---|---|
| AccountBilling | `os-account-billing` | Subscription plan, billing info, invoices |
| AiSettings | `os-ai-settings` | Claude AI configuration, prompt tuning |
| AutoGratuitySettings | `os-auto-gratuity-settings` | Auto-gratuity rules by party size |
| BarSettings | `os-bar-settings` | Bar-specific workflows, tab management |
| BreakConfig | `os-break-config` | Employee break types, durations, paid/unpaid |
| CancelSubscription | `os-cancel-subscription` | Subscription cancellation flow |
| CateringCalendar | `os-catering-calendar` | Catering event scheduling |
| DeliverySettings | `os-delivery-settings` | Delivery zones, fees, driver settings |
| DeviceHub | `os-device-hub` | Connected device overview |
| DeviceManagement | `os-device-management` | Register, pair, configure devices |
| GiftCardManagement | `os-gift-card-management` | Gift card creation, balance management |
| KitchenOrders | `os-kitchen-orders` | KDS routing rules, station assignment |
| LoyaltySettings | `os-loyalty-settings` | Loyalty program configuration |
| NotificationSettings | `os-notification-settings` | Alert preferences, channels |
| OnlinePricing | `os-online-pricing` | Online ordering price adjustments |
| PaymentSettings | `os-payment-settings` | Stripe/payment processor config |
| PrinterSettings | `os-printer-settings` | Receipt printer configuration, Star CloudPRNT |
| RewardsManagement | `os-rewards-management` | Rewards program rules, tiers |
| StaffManagement | `os-staff-management` | Team member CRUD, roles, PINs, jobs |
| StationSettings | `os-station-settings` | POS station configuration |
| SupplierSettings | `os-supplier-settings` | Supplier API credentials (Sysco, GFS) |
| TipManagement | (empty directory) | Placeholder — tip settings live in tip-mgmt feature |

## Models
- Settings models spread across multiple model files depending on the domain
- RestaurantSettingsService is the primary service for most panels

## Key Patterns
- ControlPanel is the single routed component; all panels are child components
- Deep-link via `?tab=suppliers` navigates directly from other features (e.g., SupplierManagement links here)
- Most panels use RestaurantSettingsService for load/save
- StaffManagement uses StaffManagementService
- PrinterSettings integrates with Star CloudPRNT
- PaymentSettings handles Stripe Connect onboarding
- tip-management subdirectory is empty — tip settings are in the `tip-mgmt` feature
