import { Component, inject, signal, computed, effect, input, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { MenuService } from '../../../services/menu';
import { CartService } from '../../../services/cart';
import { OrderService } from '../../../services/order';
import { AuthService } from '../../../services/auth';
import { LoyaltyService } from '../../../services/loyalty';
import { DeliveryService } from '../../../services/delivery';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { AnalyticsService } from '../../../services/analytics';
import { CustomerService } from '../../../services/customer';
import { MultiLocationService } from '../../../services/multi-location';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import { GiftCardService } from '../../../services/gift-card';
import { MenuItem, Order, OrderType, DeliveryQuote, getOrderIdentifier, LoyaltyProfile, LoyaltyReward, GiftCardBalanceCheck, getTierLabel, getTierColor, tierMeetsMinimum, AllergenType, Allergen, isItemAvailable, getItemAvailabilityLabel, getAllergenLabel, UpsellSuggestion, SavedAddress, OnlineLocation, BusinessHoursCheck } from '../../../models/index';

type OnlineStep = 'location' | 'menu' | 'cart' | 'info' | 'confirm';
type TipPreset = { label: string; percent: number };

@Component({
  selector: 'os-online-ordering',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, LoadingSpinner],
  templateUrl: './online-order-portal.html',
  styleUrl: './online-order-portal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineOrderPortal implements OnDestroy {
  private readonly menuService = inject(MenuService);
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);
  private readonly loyaltyService = inject(LoyaltyService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly giftCardService = inject(GiftCardService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly customerService = inject(CustomerService);
  private readonly multiLocationService = inject(MultiLocationService);

  readonly restaurantSlug = input<string>('');
  readonly table = input<string>('');

  // Tableside mode: detected when table input is provided
  readonly isTableside = computed(() => this.table().trim().length > 0);

  // Tip state
  private readonly _selectedTipPreset = signal<number | null>(null);
  private readonly _customTipAmount = signal<number>(0);
  private readonly _isCustomTip = signal(false);
  readonly selectedTipPreset = this._selectedTipPreset.asReadonly();
  readonly customTipAmount = this._customTipAmount.asReadonly();
  readonly isCustomTip = this._isCustomTip.asReadonly();
  readonly tipAmount = this.cartService.tip;

  readonly tipPresets: TipPreset[] = [
    { label: '15%', percent: 15 },
    { label: '18%', percent: 18 },
    { label: '20%', percent: 20 },
    { label: '25%', percent: 25 },
  ];

  // Multi-round ordering: track existing table order for "Order More"
  private readonly _existingOrderId = signal<string | null>(null);
  private readonly _orderRound = signal(1);
  readonly existingOrderId = this._existingOrderId.asReadonly();
  readonly orderRound = this._orderRound.asReadonly();

  readonly isAuthenticated = this.authService.isAuthenticated;
  private readonly _resolveError = signal<string | null>(null);
  readonly resolveError = this._resolveError.asReadonly();

  private readonly _step = signal<OnlineStep>('menu');
  private readonly _selectedCategory = signal<string | null>(null);
  private readonly _searchTerm = signal('');
  private readonly _orderType = signal<OrderType>('pickup');
  private readonly _customerFirstName = signal('');
  private readonly _customerLastName = signal('');
  private readonly _customerPhone = signal('');
  private readonly _customerEmail = signal('');
  // Structured delivery address
  private readonly _deliveryAddress = signal('');
  private readonly _deliveryAddress2 = signal('');
  private readonly _deliveryCity = signal('');
  private readonly _deliveryStateUS = signal('');
  private readonly _deliveryZip = signal('');
  private readonly _deliveryNotes = signal('');
  // Curbside
  private readonly _vehicleDescription = signal('');

  private readonly _specialInstructions = signal('');
  private readonly _isSubmitting = signal(false);
  private readonly _orderConfirmed = signal(false);
  private readonly _orderNumber = signal('');
  private readonly _error = signal<string | null>(null);

  // Order tracking
  private readonly _submittedOrder = signal<Order | null>(null);
  private _trackingInterval: ReturnType<typeof setInterval> | null = null;

  readonly step = this._step.asReadonly();
  readonly selectedCategory = this._selectedCategory.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly orderType = this._orderType.asReadonly();
  readonly customerFirstName = this._customerFirstName.asReadonly();
  readonly customerLastName = this._customerLastName.asReadonly();
  readonly customerPhone = this._customerPhone.asReadonly();
  readonly customerEmail = this._customerEmail.asReadonly();
  readonly deliveryAddress = this._deliveryAddress.asReadonly();
  readonly deliveryAddress2 = this._deliveryAddress2.asReadonly();
  readonly deliveryCity = this._deliveryCity.asReadonly();
  readonly deliveryStateUS = this._deliveryStateUS.asReadonly();
  readonly deliveryZip = this._deliveryZip.asReadonly();
  readonly deliveryNotes = this._deliveryNotes.asReadonly();
  readonly vehicleDescription = this._vehicleDescription.asReadonly();
  readonly specialInstructions = this._specialInstructions.asReadonly();
  readonly isSubmitting = this._isSubmitting.asReadonly();
  readonly orderConfirmed = this._orderConfirmed.asReadonly();
  readonly orderNumber = this._orderNumber.asReadonly();
  readonly error = this._error.asReadonly();
  readonly submittedOrder = this._submittedOrder.asReadonly();

  readonly categories = this.menuService.categories;
  readonly isLoading = this.menuService.isLoading;
  readonly cartItems = this.cartService.items;
  readonly cartTotal = this.cartService.total;
  readonly cartSubtotal = this.cartService.subtotal;
  readonly cartTax = this.cartService.tax;
  readonly cartItemCount = this.cartService.itemCount;
  readonly surchargeAmount = this.cartService.surchargeAmount;

  // --- Loyalty ---
  private readonly _loyaltyProfile = signal<LoyaltyProfile | null>(null);
  private readonly _isLookingUpLoyalty = signal(false);
  private readonly _loyaltyLookupDone = signal(false);
  private readonly _pointsToRedeem = signal(0);
  private readonly _earnedPointsMessage = signal('');
  private _phoneLookupTimeout: ReturnType<typeof setTimeout> | undefined;

  readonly loyaltyProfile = this._loyaltyProfile.asReadonly();
  readonly isLookingUpLoyalty = this._isLookingUpLoyalty.asReadonly();
  readonly loyaltyLookupDone = this._loyaltyLookupDone.asReadonly();
  readonly pointsToRedeem = this._pointsToRedeem.asReadonly();
  readonly earnedPointsMessage = this._earnedPointsMessage.asReadonly();
  readonly loyaltyEnabled = computed(() => this.loyaltyService.config().enabled);
  readonly loyaltyDiscount = this.cartService.loyaltyDiscount;

  readonly estimatedPointsEarned = computed(() =>
    this.loyaltyService.calculatePointsForOrder(this.cartSubtotal())
  );

  readonly availableRewards = computed(() => {
    const profile = this._loyaltyProfile();
    if (!profile) return [] as LoyaltyReward[];
    return this.loyaltyService.rewards().filter(r =>
      r.isActive && tierMeetsMinimum(profile.tier, r.minTier) && r.pointsCost <= profile.points
    );
  });

  readonly tierLabel = computed(() => {
    const profile = this._loyaltyProfile();
    return profile ? getTierLabel(profile.tier) : '';
  });

  readonly tierColor = computed(() => {
    const profile = this._loyaltyProfile();
    return profile ? getTierColor(profile.tier) : '';
  });

  // --- Delivery DaaS ---
  private readonly _deliveryQuote = signal<DeliveryQuote | null>(null);
  readonly deliveryQuote = this._deliveryQuote.asReadonly();
  readonly deliveryProcessing = this.deliveryService.isProcessing;
  readonly deliveryError = this.deliveryService.error;
  readonly driverInfo = this.deliveryService.driverInfo;

  readonly showDeliveryQuote = computed(() =>
    this._orderType() === 'delivery'
    && this.deliveryService.isConfigured()
    && this.deliveryService.selectedProviderConfigured()
  );

  readonly showQuotesToCustomer = computed(() =>
    this.settingsService.deliverySettings().showQuotesToCustomer
  );

  // --- Gift Cards ---
  private readonly _giftCardCode = signal('');
  private readonly _giftCardBalance = signal<GiftCardBalanceCheck | null>(null);
  private readonly _giftCardAmount = signal(0);
  private readonly _isCheckingGiftCard = signal(false);
  private readonly _giftCardApplied = signal(false);

  readonly giftCardCode = this._giftCardCode.asReadonly();
  readonly giftCardBalance = this._giftCardBalance.asReadonly();
  readonly giftCardAmount = this._giftCardAmount.asReadonly();
  readonly isCheckingGiftCard = this._isCheckingGiftCard.asReadonly();
  readonly giftCardApplied = this._giftCardApplied.asReadonly();

  readonly giftCardDiscount = computed(() =>
    this._giftCardApplied() ? this._giftCardAmount() : 0
  );

  readonly totalAfterGiftCard = computed(() =>
    Math.max(0, this.cartTotal() - this.giftCardDiscount())
  );

  // Allergen filter
  private readonly _excludeAllergens = signal<Set<AllergenType>>(new Set());
  readonly excludeAllergens = this._excludeAllergens.asReadonly();
  private readonly _expandedItemId = signal<string | null>(null);
  readonly expandedItemId = this._expandedItemId.asReadonly();

  readonly allAllergenTypes: AllergenType[] = ['milk', 'eggs', 'fish', 'shellfish', 'tree_nuts', 'peanuts', 'wheat', 'soy', 'sesame'];

  readonly filteredItems = computed(() => {
    let items = this.menuService.allItems().filter(i =>
      i.isActive !== false && !i.eightySixed && i.channelVisibility?.onlineOrdering !== false && isItemAvailable(i) && this.menuService.isItemInActiveDaypart(i)
    );
    const catId = this._selectedCategory();
    const search = this._searchTerm().toLowerCase();
    const excluded = this._excludeAllergens();

    if (catId) {
      items = items.filter(i => i.categoryId === catId);
    }
    if (search) {
      items = items.filter(i =>
        i.name.toLowerCase().includes(search) ||
        (i.description ?? '').toLowerCase().includes(search)
      );
    }
    // Filter out items containing excluded allergens
    if (excluded.size > 0) {
      items = items.filter(i => {
        const allergens = i.allergens ?? [];
        return !allergens.some(a => a.severity === 'contains' && excluded.has(a.type));
      });
    }
    return items;
  });

  // --- Upsell (Step 6) ---
  private readonly _showUpsell = signal(false);
  private readonly _upsellDismissed = signal(false);
  readonly showUpsell = this._showUpsell.asReadonly();
  readonly upsellDismissed = this._upsellDismissed.asReadonly();
  readonly upsellSuggestions = this.analyticsService.upsellSuggestions;
  readonly isLoadingUpsell = this.analyticsService.isLoadingUpsell;

  // --- Saved Addresses (Step 7) ---
  private readonly _selectedAddressId = signal<string | null>(null);
  private readonly _saveNewAddress = signal(false);
  private readonly _newAddressLabel = signal('Home');
  readonly selectedAddressId = this._selectedAddressId.asReadonly();
  readonly saveNewAddress = this._saveNewAddress.asReadonly();
  readonly newAddressLabel = this._newAddressLabel.asReadonly();
  readonly savedAddresses = this.customerService.savedAddresses;
  readonly defaultAddress = this.customerService.defaultAddress;

  // --- Order Again (Step 8) ---
  private readonly _recentOrders = signal<Order[]>([]);
  private readonly _showRecentOrders = signal(false);
  private readonly _isLoadingRecentOrders = signal(false);
  readonly recentOrders = this._recentOrders.asReadonly();
  readonly showRecentOrders = this._showRecentOrders.asReadonly();
  readonly isLoadingRecentOrders = this._isLoadingRecentOrders.asReadonly();

  // --- Age Verification (Step 9) ---
  private readonly _showAgeVerification = signal(false);
  private readonly _ageVerified = signal(false);
  readonly showAgeVerification = this._showAgeVerification.asReadonly();
  readonly ageVerified = this._ageVerified.asReadonly();

  readonly cartRequiresAgeVerification = computed(() =>
    this.cartItems().some(i => i.menuItem.requiresAgeVerification)
  );

  // Estimated ready time from cart items' prep times + queue depth adjustment
  readonly estimatedReadyMinutes = computed(() => {
    const items = this.cartItems();
    if (items.length === 0) return 0;
    const maxPrep = Math.max(0, ...items.map(i => i.menuItem.prepTimeMinutes ?? 0));
    if (maxPrep === 0) return 0;
    const buffer = 5;
    const queueDepth = this.orderService.activeOrderCount();
    return this.analyticsService.getQueueAdjustedEstimate(maxPrep + buffer, queueDepth);
  });

  // Track customer ID for saved address operations
  private readonly _identifiedCustomerId = signal<string | null>(null);
  readonly identifiedCustomerId = this._identifiedCustomerId.asReadonly();

  // --- Multi-Location (Phase 2.5, Step 10) ---
  private readonly _isMultiLocation = signal(false);
  private readonly _selectedLocationId = signal<string | null>(null);
  readonly isMultiLocation = this._isMultiLocation.asReadonly();
  readonly selectedLocationId = this._selectedLocationId.asReadonly();
  readonly onlineLocations = this.multiLocationService.onlineLocations;
  readonly isLoadingLocations = this.multiLocationService.isLoadingLocations;

  // --- Business Hours (Phase 3, Step 11) ---
  private readonly _businessHoursCheck = signal<BusinessHoursCheck | null>(null);
  private readonly _isCheckingHours = signal(false);
  readonly businessHoursCheck = this._businessHoursCheck.asReadonly();
  readonly isCheckingHours = this._isCheckingHours.asReadonly();

  readonly isCurrentlyClosed = computed(() => {
    const check = this._businessHoursCheck();
    return check !== null && !check.isOpen;
  });

  // --- Share Links (Phase 3, Step 12) ---
  private readonly _copiedItemId = signal<string | null>(null);
  readonly copiedItemId = this._copiedItemId.asReadonly();

  readonly canSubmit = computed(() => {
    if (this.cartItemCount() === 0) return false;
    // Age verification required but not done
    if (this.cartRequiresAgeVerification() && !this._ageVerified()) return false;
    // Tableside: no customer info required (dine-in at table)
    if (this.isTableside()) return true;
    const firstName = this._customerFirstName().trim();
    const lastName = this._customerLastName().trim();
    const phone = this._customerPhone().trim();
    if (!firstName || !lastName || !phone) return false;
    if (this._orderType() === 'delivery') {
      if (!this._deliveryAddress().trim() || !this._deliveryCity().trim()
        || !this._deliveryStateUS().trim() || !this._deliveryZip().trim()) return false;
    }
    if (this._orderType() === 'curbside' && !this._vehicleDescription().trim()) return false;
    return true;
  });

  private readonly _dataLoaded = signal(false);

  constructor() {
    effect(() => {
      const provider = this.settingsService.deliverySettings().provider;
      this.deliveryService.setProviderType(provider);
      if (provider === 'doordash' || provider === 'uber') {
        this.deliveryService.loadConfigStatus();
      }
    });

    // Resolve restaurant from slug attribute or fall back to auth selection (one-shot)
    effect(() => {
      if (this._dataLoaded()) return;

      const slug = this.restaurantSlug();
      const authId = this.authService.selectedMerchantId();

      if (slug) {
        this._dataLoaded.set(true);
        this.resolveSlug(slug);
      } else if (authId) {
        this._dataLoaded.set(true);
        this.menuService.loadMenuForRestaurant(authId);
        this.loyaltyService.loadConfig();
        this.loyaltyService.loadRewards();
        this.settingsService.loadSettings();
        this.checkHours(authId);
      }
    });

    // Auto-set dine-in when tableside mode is active
    effect(() => {
      if (this.isTableside()) {
        this._orderType.set('dine-in');
      }
    });

    // Apply surcharge from payment settings
    effect(() => {
      const ps = this.settingsService.paymentSettings();
      this.cartService.setSurcharge(ps.surchargeEnabled, ps.surchargePercent);
    });
  }

  private async resolveSlug(slug: string): Promise<void> {
    this._resolveError.set(null);

    // Check if slug resolves to a multi-location group
    const locations = await this.multiLocationService.loadOnlineLocations(slug);
    if (locations.length > 1) {
      this._isMultiLocation.set(true);
      this._step.set('location');
      this.analyticsService.trackOnlineEvent('page_view', { page: 'location_selector', slug });
      return;
    }

    // Single location or direct restaurant slug
    const restaurant = await this.authService.resolveMerchantBySlug(slug);
    if (restaurant) {
      this.authService.selectMerchant(restaurant.id, restaurant.name, restaurant.logo);
      if (restaurant.taxRate > 0) {
        this.cartService.setTaxRate(restaurant.taxRate);
      }
      this.menuService.loadMenuForRestaurant(restaurant.id);
      this.loyaltyService.loadConfig();
      this.loyaltyService.loadRewards();
      await this.settingsService.loadSettings();
      await this.checkHours(restaurant.id);
      this.analyticsService.trackOnlineEvent('page_view', { page: 'menu', merchantId: restaurant.id });
    } else {
      this._resolveError.set(`Restaurant "${slug}" not found`);
    }
  }

  // --- Multi-Location methods (Phase 2.5) ---

  async selectLocation(location: OnlineLocation): Promise<void> {
    this._selectedLocationId.set(location.id);
    this._isMultiLocation.set(true);

    this.authService.selectMerchant(location.id, location.name, location.logo ?? undefined);
    this.menuService.loadMenuForRestaurant(location.id);
    this.loyaltyService.loadConfig();
    this.loyaltyService.loadRewards();
    await this.settingsService.loadSettings();
    await this.checkHours(location.id);
    this._step.set('menu');
    this.analyticsService.trackOnlineEvent('page_view', { page: 'menu', merchantId: location.id });
  }

  async findNearest(): Promise<void> {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const slug = this.restaurantSlug();
        if (slug) {
          await this.multiLocationService.loadOnlineLocations(slug, pos.coords.latitude, pos.coords.longitude);
        }
      },
      () => {
        // Geolocation denied or unavailable — keep unsorted list
      }
    );
  }

  changeLocation(): void {
    this._step.set('location');
    this._selectedLocationId.set(null);
    this.cartService.clear();
  }

  // --- Business Hours methods (Phase 3, Step 11) ---

  private async checkHours(merchantId: string): Promise<void> {
    this._isCheckingHours.set(true);
    try {
      const check = await this.settingsService.checkBusinessHours(merchantId);
      this._businessHoursCheck.set(check);
    } finally {
      this._isCheckingHours.set(false);
    }
  }

  getNextOpenLabel(): string {
    const check = this._businessHoursCheck();
    if (!check?.nextOpenDay || !check?.nextOpenTime) return '';
    return `Opens ${check.nextOpenDay} at ${check.nextOpenTime}`;
  }

  // --- Share Link methods (Phase 3, Step 12) ---

  async shareItem(item: MenuItem): Promise<void> {
    const slug = this.restaurantSlug() || 'order';
    const url = `${globalThis.location.origin}/order/${slug}?item=${item.id}`;

    this.analyticsService.trackOnlineEvent('share_item', { itemId: item.id, itemName: item.name });

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.name,
          text: `Check out ${item.name}!`,
          url,
        });
      } catch {
        // User cancelled share — fall through to clipboard
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    this._copiedItemId.set(item.id);
    setTimeout(() => this._copiedItemId.set(null), 2000);
  }

  isItemCopied(itemId: string): boolean {
    return this._copiedItemId() === itemId;
  }

  // --- Navigation ---

  setStep(step: OnlineStep): void {
    this._step.set(step);
  }

  selectCategory(categoryId: string | null): void {
    this._selectedCategory.set(categoryId);
  }

  onSearch(event: Event): void {
    this._searchTerm.set((event.target as HTMLInputElement).value);
  }

  addToCart(item: MenuItem): void {
    this.cartService.addItem(item);
    this.analyticsService.trackOnlineEvent('add_to_cart', { itemId: item.id, itemName: item.name, price: item.price });
  }

  getItemQuantity(menuItemId: string): number {
    return this.cartItems().find(i => i.menuItem.id === menuItemId)?.quantity ?? 0;
  }

  getCartItemId(menuItemId: string): string | undefined {
    return this.cartItems().find(i => i.menuItem.id === menuItemId)?.id;
  }

  incrementItem(menuItemId: string): void {
    const cartItemId = this.getCartItemId(menuItemId);
    if (cartItemId) {
      this.cartService.incrementQuantity(cartItemId);
    }
  }

  decrementItem(menuItemId: string): void {
    const item = this.cartItems().find(i => i.menuItem.id === menuItemId);
    if (item) {
      if (item.quantity <= 1) {
        this.cartService.removeItem(item.id);
        this.analyticsService.trackOnlineEvent('remove_from_cart', { itemId: menuItemId });
      } else {
        this.cartService.decrementQuantity(item.id);
      }
    }
  }

  removeFromCart(cartItemId: string): void {
    const item = this.cartItems().find(i => i.id === cartItemId);
    if (item) {
      this.analyticsService.trackOnlineEvent('remove_from_cart', { itemId: item.menuItem.id, itemName: item.menuItem.name });
    }
    this.cartService.removeItem(cartItemId);
  }

  setOrderType(type: OrderType): void {
    this._orderType.set(type);
  }

  onFieldInput(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    switch (field) {
      case 'firstName': this._customerFirstName.set(value); break;
      case 'lastName': this._customerLastName.set(value); break;
      case 'phone': this._customerPhone.set(value); this.debouncedLoyaltyLookup(value); break;
      case 'email': this._customerEmail.set(value); break;
      case 'address': this._deliveryAddress.set(value); break;
      case 'address2': this._deliveryAddress2.set(value); break;
      case 'city': this._deliveryCity.set(value); break;
      case 'stateUS': this._deliveryStateUS.set(value); break;
      case 'zip': this._deliveryZip.set(value); break;
      case 'deliveryNotes': this._deliveryNotes.set(value); break;
      case 'vehicle': this._vehicleDescription.set(value); break;
      case 'instructions': this._specialInstructions.set(value); break;
      case 'addressLabel': this._newAddressLabel.set(value); break;
    }
  }

  goToCart(): void {
    if (this.cartItemCount() > 0) {
      this._step.set('cart');
    }
  }

  goToInfo(): void {
    // Trigger upsell before info step (only once, skip if dismissed)
    if (!this._upsellDismissed() && this.cartItemCount() > 0) {
      const cartItemIds = this.cartItems().map(i => i.menuItem.id);
      this.analyticsService.fetchUpsellSuggestions(cartItemIds);
      this._showUpsell.set(true);
    } else {
      this._step.set('info');
      this.analyticsService.trackOnlineEvent('checkout_start', { itemCount: this.cartItemCount(), subtotal: this.cartSubtotal() });
    }
  }

  // --- Upsell methods (Step 6) ---

  addUpsellItem(suggestion: UpsellSuggestion): void {
    this.cartService.addItem(suggestion.item);
    this.analyticsService.trackOnlineEvent('add_to_cart', { itemId: suggestion.item.id, source: 'upsell' });
  }

  dismissUpsell(): void {
    this._showUpsell.set(false);
    this._upsellDismissed.set(true);
    this.analyticsService.clearUpsellSuggestions();
    this._step.set('info');
    this.analyticsService.trackOnlineEvent('checkout_start', { itemCount: this.cartItemCount(), subtotal: this.cartSubtotal() });
  }

  // --- Saved Address methods (Step 7) ---

  selectSavedAddress(address: SavedAddress): void {
    this._selectedAddressId.set(address.id);
    this._deliveryAddress.set(address.address);
    this._deliveryAddress2.set(address.address2 ?? '');
    this._deliveryCity.set(address.city);
    this._deliveryStateUS.set(address.state);
    this._deliveryZip.set(address.zip);
  }

  clearSelectedAddress(): void {
    this._selectedAddressId.set(null);
    this._deliveryAddress.set('');
    this._deliveryAddress2.set('');
    this._deliveryCity.set('');
    this._deliveryStateUS.set('');
    this._deliveryZip.set('');
  }

  toggleSaveNewAddress(): void {
    this._saveNewAddress.update(v => !v);
  }

  // --- Order Again methods (Step 8) ---

  toggleRecentOrders(): void {
    this._showRecentOrders.update(v => !v);
  }

  getOrderSelections(order: Order): { menuItemGuid: string; menuItemName: string; quantity: number }[] {
    if (!order.checks || order.checks.length === 0) return [];
    return order.checks.flatMap(c => c.selections ?? []).map(s => ({
      menuItemGuid: s.menuItemGuid,
      menuItemName: s.menuItemName,
      quantity: s.quantity,
    }));
  }

  async reorderFromPast(order: Order): Promise<void> {
    const selections = this.getOrderSelections(order);
    if (selections.length === 0) return;
    for (const sel of selections) {
      const menuItem = this.menuService.allItems().find(i => i.id === sel.menuItemGuid);
      if (menuItem && menuItem.isActive !== false && !menuItem.eightySixed) {
        for (let q = 0; q < sel.quantity; q++) {
          this.cartService.addItem(menuItem);
        }
      }
    }
    this._showRecentOrders.set(false);
    this._step.set('cart');
  }

  // --- Age Verification methods (Step 9) ---

  openAgeVerification(): void {
    this._showAgeVerification.set(true);
  }

  confirmAge(): void {
    this._ageVerified.set(true);
    this._showAgeVerification.set(false);
  }

  cancelAgeVerification(): void {
    this._showAgeVerification.set(false);
  }

  // --- Loyalty methods ---

  onPointsToRedeemInput(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10) || 0;
    const maxPoints = this._loyaltyProfile()?.points ?? 0;
    const clamped = Math.max(0, Math.min(value, maxPoints));
    this._pointsToRedeem.set(clamped);
    const discount = this.loyaltyService.calculateRedemptionDiscount(clamped);
    this.cartService.setLoyaltyRedemption(clamped, discount);
  }

  redeemReward(reward: LoyaltyReward): void {
    this._pointsToRedeem.set(reward.pointsCost);
    const discount = reward.discountType === 'percentage'
      ? Math.round(this.cartSubtotal() * (reward.discountValue / 100) * 100) / 100
      : reward.discountValue;
    this.cartService.setLoyaltyRedemption(reward.pointsCost, discount);
  }

  clearRedemption(): void {
    this._pointsToRedeem.set(0);
    this.cartService.clearLoyaltyRedemption();
  }

  private debouncedLoyaltyLookup(phone: string): void {
    if (this._phoneLookupTimeout) clearTimeout(this._phoneLookupTimeout);
    this._loyaltyProfile.set(null);
    this._loyaltyLookupDone.set(false);
    this._pointsToRedeem.set(0);
    this.cartService.clearLoyaltyRedemption();
    this._identifiedCustomerId.set(null);
    this._recentOrders.set([]);
    this._showRecentOrders.set(false);
    this.customerService.clearSavedAddresses();

    const digits = phone.replaceAll(/\D/g, '');
    if (digits.length < 10) return;

    this._phoneLookupTimeout = setTimeout(async () => {
      this._isLookingUpLoyalty.set(true);
      try {
        const customer = await this.loyaltyService.lookupCustomerByPhone(digits);
        if (customer) {
          this._identifiedCustomerId.set(customer.id);
          const profile = await this.loyaltyService.getCustomerLoyalty(customer.id);
          this._loyaltyProfile.set(profile);
          this.cartService.setEstimatedPointsEarned(this.estimatedPointsEarned());

          // Load saved addresses for delivery
          await this.customerService.loadSavedAddresses(customer.id);
          const defaultAddr = this.customerService.defaultAddress();
          if (defaultAddr && this._orderType() === 'delivery') {
            this.selectSavedAddress(defaultAddr);
          }

          // Load recent orders for order-again
          this._isLoadingRecentOrders.set(true);
          try {
            const recent = await this.orderService.getCustomerRecentOrders(digits);
            this._recentOrders.set(recent);
          } finally {
            this._isLoadingRecentOrders.set(false);
          }
        }
      } finally {
        this._isLookingUpLoyalty.set(false);
        this._loyaltyLookupDone.set(true);
      }
    }, 500);
  }

  async requestDeliveryQuote(orderId: string): Promise<void> {
    if (!this.deliveryService.isConfigured()) return;
    if (!await this.deliveryService.ensureSelectedProviderConfigured()) return;
    const quote = await this.deliveryService.requestQuote(orderId);
    if (quote) {
      this._deliveryQuote.set(quote);
    }
  }

  getDispatchStatusLabel(status: string): string {
    switch (status) {
      case 'QUOTED': return 'Quote received';
      case 'DISPATCH_REQUESTED': return 'Requesting driver';
      case 'DRIVER_ASSIGNED': return 'Driver assigned';
      case 'DRIVER_EN_ROUTE_TO_PICKUP': return 'Driver heading to restaurant';
      case 'DRIVER_AT_PICKUP': return 'Driver at restaurant';
      case 'PICKED_UP': return 'Order picked up';
      case 'DRIVER_EN_ROUTE_TO_DROPOFF': return 'Driver on the way';
      case 'DRIVER_AT_DROPOFF': return 'Driver arriving';
      case 'DELIVERED': return 'Delivered';
      case 'CANCELLED': return 'Delivery cancelled';
      case 'FAILED': return 'Delivery failed';
      default: return status;
    }
  }

  // --- Gift Card methods ---

  onGiftCardCodeInput(event: Event): void {
    this._giftCardCode.set((event.target as HTMLInputElement).value);
    this._giftCardBalance.set(null);
    this._giftCardApplied.set(false);
    this._giftCardAmount.set(0);
  }

  async lookupGiftCard(): Promise<void> {
    const code = this._giftCardCode().trim();
    if (!code) return;
    this._isCheckingGiftCard.set(true);
    try {
      const balance = await this.giftCardService.checkBalance(code);
      this._giftCardBalance.set(balance);
      if (balance?.status === 'active' && balance.currentBalance > 0) {
        this._giftCardAmount.set(Math.min(balance.currentBalance, this.cartTotal()));
      }
    } finally {
      this._isCheckingGiftCard.set(false);
    }
  }

  applyGiftCard(): void {
    this._giftCardApplied.set(true);
    this.analyticsService.trackOnlineEvent('promo_applied', { type: 'gift_card', code: this._giftCardCode() });
  }

  clearGiftCard(): void {
    this._giftCardCode.set('');
    this._giftCardBalance.set(null);
    this._giftCardAmount.set(0);
    this._giftCardApplied.set(false);
  }

  onGiftCardAmountInput(event: Event): void {
    const value = Number.parseFloat((event.target as HTMLInputElement).value) || 0;
    const balance = this._giftCardBalance();
    const max = Math.min(balance?.currentBalance ?? 0, this.cartTotal());
    this._giftCardAmount.set(Math.max(0, Math.min(value, max)));
  }

  // --- Tip methods ---

  selectTipPreset(percent: number): void {
    this._selectedTipPreset.set(percent);
    this._isCustomTip.set(false);
    this._customTipAmount.set(0);
    this.cartService.setTipPercentage(percent);
  }

  enableCustomTip(): void {
    this._selectedTipPreset.set(null);
    this._isCustomTip.set(true);
  }

  onCustomTipInput(event: Event): void {
    const value = Number.parseFloat((event.target as HTMLInputElement).value) || 0;
    this._customTipAmount.set(Math.max(0, value));
    this.cartService.setTip(Math.max(0, value));
  }

  clearTip(): void {
    this._selectedTipPreset.set(null);
    this._isCustomTip.set(false);
    this._customTipAmount.set(0);
    this.cartService.setTip(0);
  }

  // --- Multi-round ordering ---

  orderMore(): void {
    this._orderConfirmed.set(false);
    this._step.set('menu');
    this._orderRound.update(r => r + 1);
    // Keep table context and customer info, clear cart for new items
    this.cartService.clear();
    // Restore dine-in type for tableside
    if (this.isTableside()) {
      this._orderType.set('dine-in');
    }
  }

  async submitOrder(): Promise<void> {
    if (!this.canSubmit() || this._isSubmitting()) return;

    if (this.cartRequiresAgeVerification() && !this._ageVerified()) {
      this.openAgeVerification();
      return;
    }

    this._isSubmitting.set(true);
    this._error.set(null);

    try {
      const orderData = this.buildOrderData();
      const order = await this.orderService.createOrder(orderData);
      if (order) {
        await this.handleOrderSuccess(order);
      } else {
        this._error.set(this.orderService.error() ?? 'Failed to submit order');
        this.analyticsService.trackOnlineEvent('order_failed', { error: this.orderService.error() ?? 'unknown' });
      }
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'An unexpected error occurred');
      this.analyticsService.trackOnlineEvent('order_failed', { error: err instanceof Error ? err.message : 'unknown' });
    } finally {
      this._isSubmitting.set(false);
    }
  }

  private buildOrderData(): Record<string, unknown> {
    const type = this._orderType();
    const orderData: Record<string, unknown> = {
      orderType: type,
      orderSource: 'online',
      items: this.cartItems().map(item => ({
        menuItemId: item.menuItem.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        modifiers: (item.selectedModifiers ?? []).map(m => ({
          id: m.id,
          name: m.name,
          priceAdjustment: m.priceAdjustment,
        })),
      })),
      subtotal: this.cartSubtotal(),
      tax: this.cartTax(),
      tip: this.tipAmount(),
      total: this.cartTotal(),
      ...(this.isTableside() ? { tableNumber: this.table().trim() } : {}),
      customer: {
        firstName: this._customerFirstName().trim(),
        lastName: this._customerLastName().trim(),
        phone: this._customerPhone().trim(),
        email: this._customerEmail().trim(),
      },
      specialInstructions: this._specialInstructions().trim() || undefined,
    };

    if (type === 'delivery') {
      orderData['deliveryInfo'] = {
        address: this._deliveryAddress().trim(),
        address2: this._deliveryAddress2().trim() || undefined,
        city: this._deliveryCity().trim(),
        state: this._deliveryStateUS().trim(),
        zip: this._deliveryZip().trim(),
        deliveryNotes: this._deliveryNotes().trim() || undefined,
      };
    }

    if (type === 'curbside') {
      orderData['curbsideInfo'] = {
        vehicleDescription: this._vehicleDescription().trim(),
      };
    }

    if (this._pointsToRedeem() > 0) {
      orderData['loyaltyPointsRedeemed'] = this._pointsToRedeem();
    }

    if (this._giftCardApplied() && this._giftCardAmount() > 0) {
      orderData['giftCardCode'] = this._giftCardCode().trim();
      orderData['giftCardAmount'] = this._giftCardAmount();
    }

    if (this._ageVerified()) {
      orderData['ageVerifiedAt'] = new Date().toISOString();
    }

    return orderData;
  }

  private async handleOrderSuccess(order: Order): Promise<void> {
    const type = this._orderType();

    this._orderNumber.set(getOrderIdentifier(order));
    this._submittedOrder.set(order);
    this._orderConfirmed.set(true);
    this._step.set('confirm');

    if (this.isTableside()) {
      this._existingOrderId.set(order.guid);
    }

    const earned = this.estimatedPointsEarned();
    if (this.loyaltyEnabled() && earned > 0) {
      this._earnedPointsMessage.set(`You earned ${earned} points on this order!`);
    }

    this.analyticsService.trackOnlineEvent('order_placed', {
      orderId: order.guid,
      total: this.cartTotal(),
      itemCount: this.cartItemCount(),
      orderType: type,
    });

    this.cartService.clear();
    await this.saveAddressIfRequested(type);
    await this.redeemGiftCardIfApplied(order.guid);
    this.startTracking(order.guid);

    if (type === 'delivery' && this.deliveryService.isConfigured()) {
      if (await this.deliveryService.ensureSelectedProviderConfigured()) {
        await this.requestDeliveryQuote(order.guid);
      }
    }
  }

  private async saveAddressIfRequested(type: OrderType): Promise<void> {
    const customerId = this._identifiedCustomerId();
    if (!this._saveNewAddress() || !customerId || type !== 'delivery') return;

    await this.customerService.saveAddress(customerId, {
      label: this._newAddressLabel(),
      address: this._deliveryAddress().trim(),
      address2: this._deliveryAddress2().trim() || undefined,
      city: this._deliveryCity().trim(),
      state: this._deliveryStateUS().trim(),
      zip: this._deliveryZip().trim(),
      isDefault: this.savedAddresses().length === 0,
    });
  }

  private async redeemGiftCardIfApplied(orderGuid: string): Promise<void> {
    if (!this._giftCardApplied() || this._giftCardAmount() <= 0) return;

    await this.giftCardService.redeemGiftCard(
      this._giftCardCode().trim(),
      this._giftCardAmount(),
      orderGuid
    );
  }

  startNewOrder(): void {
    this.stopTracking();
    this._orderConfirmed.set(false);
    this._orderNumber.set('');
    this._submittedOrder.set(null);
    this._step.set('menu');
    this._customerFirstName.set('');
    this._customerLastName.set('');
    this._customerPhone.set('');
    this._customerEmail.set('');
    this._deliveryAddress.set('');
    this._deliveryAddress2.set('');
    this._deliveryCity.set('');
    this._deliveryStateUS.set('');
    this._deliveryZip.set('');
    this._deliveryNotes.set('');
    this._vehicleDescription.set('');
    this._specialInstructions.set('');
    this._error.set(null);
    this._loyaltyProfile.set(null);
    this._loyaltyLookupDone.set(false);
    this._pointsToRedeem.set(0);
    this._earnedPointsMessage.set('');
    this.cartService.clearLoyaltyRedemption();
    this._giftCardCode.set('');
    this._giftCardBalance.set(null);
    this._giftCardAmount.set(0);
    this._giftCardApplied.set(false);
    this._deliveryQuote.set(null);
    this.deliveryService.reset();
    // Reset Phase 2 state
    this._showUpsell.set(false);
    this._upsellDismissed.set(false);
    this._selectedAddressId.set(null);
    this._saveNewAddress.set(false);
    this._newAddressLabel.set('Home');
    this._recentOrders.set([]);
    this._showRecentOrders.set(false);
    this._identifiedCustomerId.set(null);
    this._ageVerified.set(false);
    this._showAgeVerification.set(false);
    this._businessHoursCheck.set(null);
    this._copiedItemId.set(null);
    this.customerService.clearSavedAddresses();
    this.analyticsService.clearUpsellSuggestions();
    this.analyticsService.resetOnlineSession();
  }

  ngOnDestroy(): void {
    this.stopTracking();
  }

  getCategoryName(categoryId: string): string {
    return this.categories().find(c => c.id === categoryId)?.name ?? '';
  }

  getDeliveryStateLabel(state: string): string {
    switch (state) {
      case 'PREPARING': return 'Preparing';
      case 'OUT_FOR_DELIVERY': return 'Out for Delivery';
      case 'DELIVERED': return 'Delivered';
      default: return state;
    }
  }

  async notifyArrival(): Promise<void> {
    const order = this._submittedOrder();
    if (!order) return;
    await this.orderService.notifyCurbsideArrival(order.guid);
    // Update local state optimistically
    this._submittedOrder.set({
      ...order,
      curbsideInfo: order.curbsideInfo
        ? { ...order.curbsideInfo, arrivalNotified: true }
        : undefined,
    });
  }

  private startTracking(orderId: string): void {
    this.stopTracking();
    this._trackingInterval = setInterval(async () => {
      const orders = this.orderService.orders();
      const updated = orders.find(o => o.guid === orderId);
      if (updated) {
        this._submittedOrder.set(updated);
        // Stop tracking once order is closed
        if (updated.guestOrderStatus === 'CLOSED') {
          this.stopTracking();
        }
      }
    }, 15000);
  }

  private stopTracking(): void {
    if (this._trackingInterval) {
      clearInterval(this._trackingInterval);
      this._trackingInterval = null;
    }
  }

  // --- Allergen & Availability methods ---

  toggleAllergenFilter(type: AllergenType): void {
    this._excludeAllergens.update(set => {
      const next = new Set(set);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  isAllergenExcluded(type: AllergenType): boolean {
    return this._excludeAllergens().has(type);
  }

  getAllergenLabel(type: AllergenType): string {
    return getAllergenLabel(type);
  }

  getItemAllergens(item: MenuItem): Allergen[] {
    return item.allergens ?? [];
  }

  isItemAvailable(item: MenuItem): boolean {
    return isItemAvailable(item);
  }

  getAvailabilityLabel(item: MenuItem): string {
    return getItemAvailabilityLabel(item);
  }

  toggleItemExpanded(itemId: string): void {
    this._expandedItemId.update(id => id === itemId ? null : itemId);
    this.analyticsService.trackOnlineEvent('item_view', { itemId });
  }

  isItemExpanded(itemId: string): boolean {
    return this._expandedItemId() === itemId;
  }
}
