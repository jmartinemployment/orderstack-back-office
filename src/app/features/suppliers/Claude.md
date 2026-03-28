# Suppliers Feature

## Purpose
Restaurant supplier/vendor management with AI-powered ordering assistance, known supplier catalog, and API discovery for automated ordering integration.

## Routes
- `/suppliers` — SupplierManagement (auth-guarded)

## Components

### SupplierManagement (`os-supplier-management`)
Vendor CRUD with search filtering. Known supplier catalog (Sysco, US Foods, PFG, Restaurant Depot, GFS, Ben E. Keith, Dot Foods, WebstaurantStore, Costco Business Center, Sam's Club) with one-click add. AI-powered features: generate purchase orders, find cheaper sources, predict weekly needs (via ChatService → Claude). Auto API discovery on new vendor creation — checks known catalog first, then asks AI if supplier has a public ordering API. Links to Settings > Suppliers for API credential entry. Supports `?item=` query param for restock banner from inventory.

**Services:** VendorService, ChatService, PlatformService, SupplierOrderingService, Router, ActivatedRoute

## Models
- `@models/vendor.model` — Vendor, VendorFormData, SupplierProviderType

## Key Patterns
- Known suppliers filtered by business vertical (food_and_drink, retail)
- AI API discovery: local catalog match first, then ChatService fallback
- `credentialSummary` from SupplierOrderingService shows which suppliers have API credentials configured
- Deep-links to `/settings?tab=suppliers` for credential configuration
- Restock banner via `?item=` query param (from inventory low-stock alerts)
