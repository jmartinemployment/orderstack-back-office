import { describe, it, expect } from 'vitest';
import type {
  FulfillmentOption,
  EcommerceFulfillmentStatus,
  ProductImage,
  ProductListing,
  ProductListingFormData,
  ShippingMethod,
  ShippingMethodFormData,
  EcommerceOrderItem,
  ShippingAddress,
  EcommerceOrder,
  ShippingLabel,
  EcommerceCartItem,
  EcommerceCheckoutStep,
  StoreConfig,
  FulfillmentDashboardTab,
  PickListItem,
  PackingSlip,
  CustomerNotificationConfig,
  BopisConfig,
  SyncChannel,
  ChannelSyncConfig,
  ChannelSyncConfigFormData,
  ChannelPriceOverride,
  SalePricing,
  SalePricingFormData,
  ChannelVisibilitySetting,
  ProductSortOption,
  ProductFilterState,
} from './retail-ecommerce.model';

describe('retail-ecommerce.model types', () => {
  // --- FulfillmentOption ---
  describe('FulfillmentOption', () => {
    it('should accept all valid fulfillment options', () => {
      const options: FulfillmentOption[] = ['ship', 'pickup', 'curbside', 'local_delivery'];
      expect(options).toHaveLength(4);
    });
  });

  // --- EcommerceFulfillmentStatus ---
  describe('EcommerceFulfillmentStatus', () => {
    it('should accept all valid statuses', () => {
      const statuses: EcommerceFulfillmentStatus[] = [
        'pending', 'processing', 'ready_for_pickup', 'shipped',
        'out_for_delivery', 'delivered', 'cancelled',
      ];
      expect(statuses).toHaveLength(7);
    });
  });

  // --- ProductImage ---
  describe('ProductImage', () => {
    it('should construct a valid product image', () => {
      const image: ProductImage = {
        id: 'img-1',
        url: 'https://example.com/image.jpg',
        altText: 'A red shirt',
        position: 0,
        isPrimary: true,
      };
      expect(image.id).toBe('img-1');
      expect(image.isPrimary).toBe(true);
      expect(image.position).toBe(0);
    });
  });

  // --- ProductListing ---
  describe('ProductListing', () => {
    it('should construct a valid product listing', () => {
      const listing: ProductListing = {
        id: 'pl-1',
        retailItemId: 'ri-1',
        merchantId: 'r-1',
        title: 'Red Shirt',
        description: 'A nice red shirt',
        seoTitle: 'Red Shirt - Buy Online',
        seoDescription: 'Buy the best red shirt.',
        slug: 'red-shirt',
        images: [],
        isPublished: true,
        channelVisibility: { inStore: true, online: true, kiosk: false },
        fulfillmentOptions: ['ship', 'pickup'],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      };
      expect(listing.isPublished).toBe(true);
      expect(listing.fulfillmentOptions).toContain('ship');
      expect(listing.channelVisibility.kiosk).toBe(false);
    });
  });

  // --- ProductListingFormData ---
  describe('ProductListingFormData', () => {
    it('should construct form data without merchantId', () => {
      const form: ProductListingFormData = {
        retailItemId: 'ri-1',
        title: 'Blue Pants',
        description: 'Comfy pants',
        seoTitle: '',
        seoDescription: '',
        slug: 'blue-pants',
        images: [],
        isPublished: false,
        fulfillmentOptions: ['pickup'],
      };
      expect(form.isPublished).toBe(false);
      expect((form as Record<string, unknown>)['merchantId']).toBeUndefined();
    });
  });

  // --- ShippingMethod ---
  describe('ShippingMethod', () => {
    it('should support all shipping rate types', () => {
      const types: ShippingMethod['type'][] = [
        'flat_rate', 'by_weight', 'by_order_total', 'by_quantity', 'carrier_api',
      ];
      expect(types).toHaveLength(5);
    });

    it('should construct a flat rate method', () => {
      const method: ShippingMethod = {
        id: 'sm-1',
        merchantId: 'r-1',
        name: 'Standard Shipping',
        type: 'flat_rate',
        rate: 5.99,
        freeAbove: 50,
        carrier: null,
        estimatedDays: 5,
        isActive: true,
      };
      expect(method.freeAbove).toBe(50);
      expect(method.carrier).toBeNull();
    });
  });

  // --- ShippingMethodFormData ---
  describe('ShippingMethodFormData', () => {
    it('should construct form data without id or merchantId', () => {
      const form: ShippingMethodFormData = {
        name: 'Express',
        type: 'flat_rate',
        rate: 9.99,
        freeAbove: null,
        carrier: 'USPS',
        estimatedDays: 2,
        isActive: true,
      };
      expect(form.carrier).toBe('USPS');
    });
  });

  // --- EcommerceOrderItem ---
  describe('EcommerceOrderItem', () => {
    it('should construct an order item', () => {
      const item: EcommerceOrderItem = {
        itemId: 'i-1',
        variationId: 'v-1',
        name: 'T-Shirt',
        variationName: 'Large / Red',
        sku: 'TS-LG-RED',
        quantity: 2,
        unitPrice: 24.99,
        lineTotal: 49.98,
        imageUrl: null,
      };
      expect(item.lineTotal).toBe(49.98);
      expect(item.variationId).toBe('v-1');
    });

    it('should allow null variation fields', () => {
      const item: EcommerceOrderItem = {
        itemId: 'i-2',
        variationId: null,
        name: 'Sticker',
        variationName: null,
        sku: 'STK-001',
        quantity: 1,
        unitPrice: 3.50,
        lineTotal: 3.50,
        imageUrl: null,
      };
      expect(item.variationId).toBeNull();
      expect(item.variationName).toBeNull();
    });
  });

  // --- ShippingAddress ---
  describe('ShippingAddress', () => {
    it('should construct a valid address', () => {
      const addr: ShippingAddress = {
        fullName: 'Jane Doe',
        line1: '123 Main St',
        line2: 'Apt 4',
        city: 'Miami',
        state: 'FL',
        postalCode: '33101',
        country: 'US',
        phone: '555-0100',
      };
      expect(addr.state).toBe('FL');
      expect(addr.line2).toBe('Apt 4');
    });

    it('should allow null line2', () => {
      const addr: ShippingAddress = {
        fullName: 'John Smith',
        line1: '456 Oak Ave',
        line2: null,
        city: 'Fort Lauderdale',
        state: 'FL',
        postalCode: '33301',
        country: 'US',
        phone: '555-0200',
      };
      expect(addr.line2).toBeNull();
    });
  });

  // --- EcommerceOrder ---
  describe('EcommerceOrder', () => {
    it('should construct a full order with all fields', () => {
      const order: EcommerceOrder = {
        id: 'o-1',
        orderNumber: 'ORD-1001',
        merchantId: 'r-1',
        customerId: 'c-1',
        customerEmail: 'jane@example.com',
        customerName: 'Jane Doe',
        items: [],
        shippingAddress: null,
        shippingMethod: null,
        shippingCost: 0,
        fulfillmentType: 'pickup',
        fulfillmentStatus: 'pending',
        subtotal: 100,
        taxTotal: 7,
        discountTotal: 0,
        total: 107,
        trackingNumber: null,
        trackingUrl: null,
        notes: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      expect(order.total).toBe(107);
      expect(order.fulfillmentType).toBe('pickup');
      expect(order.trackingNumber).toBeNull();
    });

    it('should allow a shipped order with tracking', () => {
      const order: EcommerceOrder = {
        id: 'o-2',
        orderNumber: 'ORD-1002',
        merchantId: 'r-1',
        customerId: null,
        customerEmail: 'guest@example.com',
        customerName: 'Guest User',
        items: [],
        shippingAddress: {
          fullName: 'Guest User',
          line1: '789 Pine Rd',
          line2: null,
          city: 'Boca Raton',
          state: 'FL',
          postalCode: '33431',
          country: 'US',
          phone: '555-0300',
        },
        shippingMethod: 'Standard',
        shippingCost: 5.99,
        fulfillmentType: 'ship',
        fulfillmentStatus: 'shipped',
        subtotal: 59.99,
        taxTotal: 4.20,
        discountTotal: 0,
        total: 70.18,
        trackingNumber: '1Z999AA10123456784',
        trackingUrl: 'https://tracking.example.com/1Z999AA10123456784',
        notes: 'Leave at door',
        createdAt: '2026-01-05T00:00:00Z',
        updatedAt: '2026-01-06T00:00:00Z',
      };
      expect(order.trackingNumber).toBe('1Z999AA10123456784');
      expect(order.fulfillmentStatus).toBe('shipped');
      expect(order.customerId).toBeNull();
    });
  });

  // --- ShippingLabel ---
  describe('ShippingLabel', () => {
    it('should construct a shipping label', () => {
      const label: ShippingLabel = {
        id: 'sl-1',
        orderId: 'o-1',
        carrier: 'USPS',
        trackingNumber: '9400111899223100000',
        labelUrl: 'https://labels.example.com/sl-1.pdf',
        cost: 4.95,
      };
      expect(label.carrier).toBe('USPS');
      expect(label.cost).toBe(4.95);
    });
  });

  // --- EcommerceCartItem ---
  describe('EcommerceCartItem', () => {
    it('should construct a cart item with variation', () => {
      const item: EcommerceCartItem = {
        itemId: 'i-1',
        variationId: 'v-1',
        name: 'Hoodie',
        variationName: 'XL / Black',
        sku: 'HD-XL-BLK',
        imageUrl: 'https://example.com/hoodie.jpg',
        unitPrice: 49.99,
        quantity: 1,
        maxQuantity: 10,
      };
      expect(item.variationName).toBe('XL / Black');
      expect(item.maxQuantity).toBe(10);
    });

    it('should construct a cart item without variation', () => {
      const item: EcommerceCartItem = {
        itemId: 'i-2',
        variationId: null,
        name: 'Poster',
        variationName: null,
        sku: 'PST-001',
        imageUrl: null,
        unitPrice: 12.00,
        quantity: 3,
        maxQuantity: null,
      };
      expect(item.variationId).toBeNull();
      expect(item.maxQuantity).toBeNull();
    });
  });

  // --- EcommerceCheckoutStep ---
  describe('EcommerceCheckoutStep', () => {
    it('should accept all checkout steps', () => {
      const steps: EcommerceCheckoutStep[] = ['cart', 'shipping', 'payment', 'confirmation'];
      expect(steps).toHaveLength(4);
    });
  });

  // --- StoreConfig ---
  describe('StoreConfig', () => {
    it('should construct a store config with all fulfillment options enabled', () => {
      const config: StoreConfig = {
        merchantId: 'r-1',
        storeSlug: 'cool-store',
        storeName: 'Cool Store',
        logoUrl: 'https://example.com/logo.png',
        bannerUrl: null,
        description: 'The coolest store',
        contactEmail: 'store@example.com',
        contactPhone: '555-0400',
        currency: 'USD',
        taxRate: 7,
        enableGuestCheckout: true,
        enablePickup: true,
        enableCurbside: true,
        enableShipping: true,
        enableLocalDelivery: false,
        minOrderAmount: 10,
        pickupInstructions: 'Come to the back door.',
      };
      expect(config.taxRate).toBe(7);
      expect(config.enableLocalDelivery).toBe(false);
      expect(config.minOrderAmount).toBe(10);
    });

    it('should allow null optional fields', () => {
      const config: StoreConfig = {
        merchantId: 'r-2',
        storeSlug: 'basic-shop',
        storeName: 'Basic Shop',
        logoUrl: null,
        bannerUrl: null,
        description: '',
        contactEmail: 'basic@example.com',
        contactPhone: '',
        currency: 'USD',
        taxRate: 0,
        enableGuestCheckout: false,
        enablePickup: false,
        enableCurbside: false,
        enableShipping: false,
        enableLocalDelivery: false,
        minOrderAmount: null,
        pickupInstructions: null,
      };
      expect(config.minOrderAmount).toBeNull();
      expect(config.pickupInstructions).toBeNull();
    });
  });

  // --- FulfillmentDashboardTab ---
  describe('FulfillmentDashboardTab', () => {
    it('should accept all dashboard tabs', () => {
      const tabs: FulfillmentDashboardTab[] = ['pending', 'processing', 'pickup', 'shipped', 'completed'];
      expect(tabs).toHaveLength(5);
    });
  });

  // --- PickListItem ---
  describe('PickListItem', () => {
    it('should construct a pick list item', () => {
      const item: PickListItem = {
        orderItemId: 'oi-1',
        itemName: 'Widget',
        variationName: 'Blue',
        sku: 'WDG-BLU',
        quantity: 3,
        locationHint: 'Aisle 4, Shelf B',
        isPicked: false,
      };
      expect(item.isPicked).toBe(false);
      expect(item.locationHint).toBe('Aisle 4, Shelf B');
    });
  });

  // --- PackingSlip ---
  describe('PackingSlip', () => {
    it('should construct a packing slip', () => {
      const slip: PackingSlip = {
        orderId: 'o-1',
        orderNumber: 'ORD-1001',
        customerName: 'Jane Doe',
        items: [
          { orderItemId: 'oi-1', itemName: 'Hat', variationName: null, sku: 'HAT-1', quantity: 1, locationHint: null, isPicked: true },
        ],
        shippingAddress: null,
        notes: 'Gift wrap please',
      };
      expect(slip.items).toHaveLength(1);
      expect(slip.items[0].isPicked).toBe(true);
    });
  });

  // --- CustomerNotificationConfig ---
  describe('CustomerNotificationConfig', () => {
    it('should construct notification config', () => {
      const config: CustomerNotificationConfig = {
        enableEmail: true,
        enableSms: false,
        templates: {
          orderConfirmed: 'Your order has been confirmed!',
          readyForPickup: 'Your order is ready for pickup.',
          shipped: 'Your order has been shipped.',
          outForDelivery: 'Your order is out for delivery.',
          delivered: 'Your order has been delivered.',
        },
      };
      expect(config.enableEmail).toBe(true);
      expect(config.enableSms).toBe(false);
      expect(Object.keys(config.templates)).toHaveLength(5);
    });
  });

  // --- BopisConfig ---
  describe('BopisConfig', () => {
    it('should construct BOPIS config', () => {
      const config: BopisConfig = {
        pickupWindowHours: 24,
        enableCurbside: true,
        vehicleDescriptionRequired: false,
      };
      expect(config.pickupWindowHours).toBe(24);
    });
  });

  // --- SyncChannel ---
  describe('SyncChannel', () => {
    it('should accept all sync channels', () => {
      const channels: SyncChannel[] = ['pos', 'online', 'kiosk'];
      expect(channels).toHaveLength(3);
    });
  });

  // --- ChannelSyncConfig ---
  describe('ChannelSyncConfig', () => {
    it('should construct a channel sync config', () => {
      const config: ChannelSyncConfig = {
        merchantId: 'r-1',
        enableRealTimeInventorySync: true,
        enablePriceSync: true,
        bufferStockPerChannel: 5,
        perChannelPricing: false,
        outOfStockBehavior: 'show_sold_out',
      };
      expect(config.outOfStockBehavior).toBe('show_sold_out');
      expect(config.bufferStockPerChannel).toBe(5);
    });

    it('should accept all out-of-stock behaviors', () => {
      const behaviors: ChannelSyncConfig['outOfStockBehavior'][] = [
        'hide', 'show_sold_out', 'show_backorder',
      ];
      expect(behaviors).toHaveLength(3);
    });
  });

  // --- ChannelSyncConfigFormData ---
  describe('ChannelSyncConfigFormData', () => {
    it('should not include merchantId', () => {
      const form: ChannelSyncConfigFormData = {
        enableRealTimeInventorySync: false,
        enablePriceSync: false,
        bufferStockPerChannel: 0,
        perChannelPricing: true,
        outOfStockBehavior: 'hide',
      };
      expect((form as Record<string, unknown>)['merchantId']).toBeUndefined();
    });
  });

  // --- ChannelPriceOverride ---
  describe('ChannelPriceOverride', () => {
    it('should construct a price override', () => {
      const override: ChannelPriceOverride = {
        itemId: 'i-1',
        variationId: 'v-1',
        channel: 'online',
        price: 19.99,
      };
      expect(override.channel).toBe('online');
      expect(override.price).toBe(19.99);
    });

    it('should allow null variationId', () => {
      const override: ChannelPriceOverride = {
        itemId: 'i-2',
        variationId: null,
        channel: 'pos',
        price: 24.99,
      };
      expect(override.variationId).toBeNull();
    });
  });

  // --- SalePricing ---
  describe('SalePricing', () => {
    it('should construct a sale pricing', () => {
      const sale: SalePricing = {
        id: 'sp-1',
        itemId: 'i-1',
        variationId: null,
        salePrice: 14.99,
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        channels: ['pos', 'online'],
        isActive: true,
      };
      expect(sale.channels).toHaveLength(2);
      expect(sale.isActive).toBe(true);
    });
  });

  // --- SalePricingFormData ---
  describe('SalePricingFormData', () => {
    it('should construct sale form data without id or isActive', () => {
      const form: SalePricingFormData = {
        itemId: 'i-1',
        variationId: null,
        salePrice: 9.99,
        startDate: '2026-04-01',
        endDate: '2026-04-15',
        channels: ['kiosk'],
      };
      expect((form as Record<string, unknown>)['id']).toBeUndefined();
      expect((form as Record<string, unknown>)['isActive']).toBeUndefined();
    });
  });

  // --- ChannelVisibilitySetting ---
  describe('ChannelVisibilitySetting', () => {
    it('should construct visibility settings', () => {
      const setting: ChannelVisibilitySetting = {
        itemId: 'i-1',
        variationId: null,
        inStore: true,
        online: true,
        kiosk: false,
      };
      expect(setting.kiosk).toBe(false);
    });
  });

  // --- ProductSortOption ---
  describe('ProductSortOption', () => {
    it('should accept all sort options', () => {
      const sorts: ProductSortOption[] = [
        'name_asc', 'name_desc', 'price_asc', 'price_desc', 'newest',
      ];
      expect(sorts).toHaveLength(5);
    });
  });

  // --- ProductFilterState ---
  describe('ProductFilterState', () => {
    it('should construct a default filter state', () => {
      const state: ProductFilterState = {
        categoryId: null,
        minPrice: null,
        maxPrice: null,
        search: '',
        sort: 'name_asc',
      };
      expect(state.search).toBe('');
      expect(state.categoryId).toBeNull();
    });

    it('should construct an active filter state', () => {
      const state: ProductFilterState = {
        categoryId: 'cat-1',
        minPrice: 10,
        maxPrice: 100,
        search: 'shirt',
        sort: 'price_asc',
      };
      expect(state.minPrice).toBe(10);
      expect(state.maxPrice).toBe(100);
    });
  });
});
