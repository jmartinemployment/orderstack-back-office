# Retail Feature

## Purpose
Complete retail/e-commerce vertical: catalog management, POS, inventory, purchase orders, vendor management, e-commerce storefront, fulfillment, returns, variation editing, and retail-specific reporting.

## Routes
- `/retail/catalog` — CatalogManagement (auth-guarded)
- `/retail/pos` — RetailPos (auth-guarded)
- `/retail/inventory` — RetailInventory (auth-guarded)
- `/retail/purchase-orders` — RetailPurchaseOrders (auth-guarded)
- `/retail/vendors` — RetailVendorManagement (auth-guarded)
- `/retail/reports` — RetailReports (auth-guarded)
- `/retail/returns` — ReturnProcessing (auth-guarded)
- `/retail/variations` — VariationEditor (auth-guarded, query param `?item=`)
- `/retail/fulfillment` — FulfillmentDashboard (auth-guarded)
- `/shop/:slug` — ProductList (public, no auth)
- `/shop/:slug/product/:id` — ProductDetail (public, no auth)
- `/shop/:slug/checkout` — RetailCheckout (public, no auth)

## Components

### CatalogManagement (`os-catalog-management`)
5-tab catalog manager: items, categories, option-sets, collections, bundles. Grid/list view toggle. Bulk selection with delete and category reassignment. CSV import/export. Items support physical/digital/service types, channel visibility (in-store, online, kiosk), weight-based pricing, barcode scanning. Smart collections with rule-based auto-membership. Bundle pricing with fixed-price and discount-percent modes.

**Services:** RetailCatalogService

### RetailPos (`os-retail-pos`)
Touch-optimized retail point-of-sale. Quick keys with color coding, barcode scanner input, variation picker, price override modal, weight entry for produce. Split payment support. Layaway management. Receipt template customization. Integrates PaymentTerminal shared component.

**Services:** RetailCheckoutService, RetailCatalogService

### RetailInventory (`os-retail-inventory`)
8-tab inventory system: overview, adjustments, transfers, cycle counts, alerts, FIFO cost layers, label printing, reports (aging, sell-through, shrinkage). Stock adjustment with 10 types (received, recount, damage, theft, loss, return, transfer_in/out, sale, correction). Multi-location transfer workflow. Barcode label PDF generation.

**Services:** RetailInventoryService, RetailCatalogService

### RetailPurchaseOrders (`os-retail-purchase-orders`)
Full PO lifecycle: draft → submitted → partially received → received. Line-item creation with catalog item lookup. Receiving workflow updates retail inventory stock automatically via adjustStock().

**Services:** VendorService, RetailCatalogService, RetailInventoryService

### RetailVendorManagement (`os-retail-vendor-management`)
CRUD for retail vendors with search, active/inactive toggle, detail panel. Simpler than the restaurant SupplierManagement — no AI discovery, no known supplier catalog.

**Services:** VendorService

### RetailReports (`os-retail-reports`)
12-tab reporting: overview, items, categories, employees, discounts, tax, COGS, vendor sales, projected profit, sales forecast, demand forecast, year-over-year. Date range picker with period presets and comparison mode. Sortable item/profit tables.

**Services:** ReportService

### ReturnProcessing (`os-return-processing`)
4-tab return system: lookup (receipt/card/customer/date), process, exchange, policy. Manager PIN override for out-of-policy returns. Exchange mode with credit balance tracking. Return policy configuration (window days, receipt required, final sale items).

**Services:** RetailCheckoutService, RetailCatalogService

### VariationEditor (`os-variation-editor`)
Spreadsheet-style inline editing for item variations (sku, barcode, price, cost, stock). Auto-generate variations from option set combinations. Bulk price adjustment (percent or fixed). Navigate from catalog via `?item=` query param.

**Services:** RetailCatalogService

### FulfillmentDashboard (`os-fulfillment-dashboard`)
5-tab order fulfillment: pending, processing, pickup, shipped, completed. Status progression: pending → processing → ready_for_pickup/shipped → out_for_delivery → delivered. Tracking number entry for shipped orders. Supports ship, pickup, curbside, local delivery.

**Services:** RetailEcommerceService

### ProductList (`os-product-list`) — Public
Customer-facing storefront catalog. Filter by category, price range, search. Sort by name, price, newest. Cart drawer with sessionStorage persistence. Input: `storeSlug`.

**Services:** RetailEcommerceService

### ProductDetail (`os-product-detail`) — Public
Customer-facing product page. Variation selector, quantity picker, add-to-cart with feedback animation. Cart count badge. Input: `storeSlug`, `productId`.

**Services:** RetailEcommerceService

### RetailCheckout (`os-retail-checkout`) — Public
Customer-facing checkout: cart review → shipping/fulfillment → payment → confirmation. Ship/pickup/curbside/local delivery options. Shipping method selection with free-above threshold. Tax calculation from store config.

**Services:** RetailEcommerceService

## Models
- `@models/retail.model` — RetailItem, RetailItemVariation, RetailCategory, RetailOptionSet, RetailCollection, RetailBundle, RetailCartItem, RetailPayment, RetailTransaction, ReturnPolicy, QuickKey, LayawayRecord, ReceiptTemplate
- `@models/retail-ecommerce.model` — EcommerceCartItem, EcommerceOrder, StoreConfig, ShippingAddress, FulfillmentOption, EcommerceCheckoutStep, ProductFilterState
- `@models/retail-inventory.model` — RetailStockRecord, StockAdjustment, StockTransfer, RetailCycleCount, CostLayer, LabelTemplate, LabelPrintJob, InventoryAgingBucket, SellThroughReport, ShrinkageReport
- `@models/vendor.model` — Vendor, VendorFormData, PurchaseOrder, PurchaseOrderLineItem
- `@models/report.model` — RetailSalesReport, RetailCogsReport, RetailSalesForecast, RetailYoyReport

## Key Patterns
- E-commerce storefront components are public (no auth guard), use `storeSlug` input for multi-tenant
- E-commerce cart uses sessionStorage (scoped by store slug)
- PO receiving auto-triggers inventory adjustStock()
- Vitest specs exist for product-list, product-detail, retail-checkout, and fulfillment-dashboard
- Variation editor navigable via query param from catalog
- RetailPos uses shared PaymentTerminal component
