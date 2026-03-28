import { Injectable, inject, signal, computed, Signal } from '@angular/core';
import { Cart, CartItem } from '../models/cart.model';
import { MenuItem, Modifier } from '../models/menu.model';
import { OrderType, CustomerInfo } from '../models/order.model';
import { SocketService } from './socket';
import { RestaurantSettingsService } from './restaurant-settings';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly socketService = inject(SocketService);
  private readonly settingsService = inject(RestaurantSettingsService);

  // Tax rate: reads from merchant payment settings by default.
  // setTaxRate() overrides for public ordering (slug-based, no auth).
  private readonly _taxRateOverride = signal<number | null>(null);
  private readonly _taxRate = computed(() => {
    const override = this._taxRateOverride();
    if (override !== null) return override;
    return this.settingsService.paymentSettings().taxRate ?? 0;
  });

  // Private writable signals
  private readonly _items = signal<CartItem[]>([]);
  private readonly _orderType = signal<OrderType>('pickup');
  private readonly _customer = signal<CustomerInfo | undefined>(undefined);
  private readonly _tableId = signal<string | undefined>(undefined);
  private readonly _specialInstructions = signal<string | undefined>(undefined);
  private readonly _tip = signal<number>(0);
  private readonly _isOpen = signal(false);
  private readonly _loyaltyPointsToRedeem = signal(0);
  private readonly _loyaltyDiscount = signal(0);
  private readonly _estimatedPointsEarned = signal(0);
  private readonly _surchargeEnabled = signal(false);
  private readonly _surchargePercent = signal(3.5);

  // Public readonly signals
  readonly items = this._items.asReadonly();
  readonly orderType = this._orderType.asReadonly();
  readonly customer = this._customer.asReadonly();
  readonly tableId = this._tableId.asReadonly();
  readonly specialInstructions = this._specialInstructions.asReadonly();
  readonly tip = this._tip.asReadonly();
  readonly isOpen = this._isOpen.asReadonly();
  readonly loyaltyPointsToRedeem = this._loyaltyPointsToRedeem.asReadonly();
  readonly loyaltyDiscount = this._loyaltyDiscount.asReadonly();
  readonly estimatedPointsEarned = this._estimatedPointsEarned.asReadonly();
  readonly surchargeEnabled = this._surchargeEnabled.asReadonly();
  readonly surchargePercent = this._surchargePercent.asReadonly();

  readonly surchargeAmount = computed(() => {
    if (!this._surchargeEnabled()) return 0;
    return Math.round(this.subtotal() * (this._surchargePercent() / 100) * 100) / 100;
  });

  // Computed signals
  readonly itemCount = computed(() =>
    this._items().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly subtotal = computed(() =>
    this._items().reduce((sum, item) => sum + item.totalPrice, 0)
  );

  readonly taxRate: Signal<number> = this._taxRate;

  readonly tax = computed(() =>
    Math.round(this.subtotal() * this._taxRate() * 100) / 100
  );

  readonly total = computed(() =>
    Math.max(0, Math.round((this.subtotal() + this.tax() + this._tip() + this.surchargeAmount() - this._loyaltyDiscount()) * 100) / 100)
  );

  readonly isEmpty = computed(() => this._items().length === 0);

  readonly cart = computed<Cart>(() => ({
    items: this._items(),
    orderType: this._orderType(),
    customer: this._customer(),
    tableId: this._tableId(),
    specialInstructions: this._specialInstructions(),
    subtotal: this.subtotal(),
    tax: this.tax(),
    tip: this._tip(),
    total: this.total(),
  }));

  open(): void {
    this._isOpen.set(true);
  }

  close(): void {
    this._isOpen.set(false);
  }

  toggle(): void {
    this._isOpen.update(open => !open);
  }

  addItem(
    menuItem: MenuItem,
    quantity = 1,
    selectedModifiers: Modifier[] = [],
    specialInstructions?: string
  ): void {
    const modifierTotal = selectedModifiers.reduce(
      (sum, mod) => sum + mod.priceAdjustment,
      0
    );
    const unitPrice = Number(menuItem.price) + modifierTotal;
    const totalPrice = unitPrice * quantity;

    const newItem: CartItem = {
      id: crypto.randomUUID(),
      menuItem,
      quantity,
      selectedModifiers,
      specialInstructions,
      unitPrice,
      totalPrice,
    };

    this._items.update(items => [...items, newItem]);
  }

  removeItem(itemId: string): void {
    this._items.update(items => items.filter(item => item.id !== itemId));
  }

  updateQuantity(itemId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(itemId);
      return;
    }

    this._items.update(items =>
      items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity,
            totalPrice: item.unitPrice * quantity,
          };
        }
        return item;
      })
    );
  }

  incrementQuantity(itemId: string): void {
    const item = this._items().find(i => i.id === itemId);
    if (item) {
      this.updateQuantity(itemId, item.quantity + 1);
    }
  }

  decrementQuantity(itemId: string): void {
    const item = this._items().find(i => i.id === itemId);
    if (item) {
      this.updateQuantity(itemId, item.quantity - 1);
    }
  }

  updateItemInstructions(itemId: string, instructions: string): void {
    this._items.update(items =>
      items.map(item => {
        if (item.id === itemId) {
          return { ...item, specialInstructions: instructions };
        }
        return item;
      })
    );
  }

  setOrderType(orderType: OrderType): void {
    this._orderType.set(orderType);
    if (orderType !== 'dine-in') {
      this._tableId.set(undefined);
    }
  }

  setCustomer(customer: CustomerInfo): void {
    this._customer.set(customer);
  }

  setTableId(tableId: string): void {
    this._tableId.set(tableId);
  }

  setSpecialInstructions(instructions: string): void {
    this._specialInstructions.set(instructions || undefined);
  }

  setTip(amount: number): void {
    this._tip.set(Math.max(0, amount));
  }

  setTaxRate(rate: number): void {
    this._taxRateOverride.set(Math.max(0, rate));
  }

  setTipPercentage(percentage: number): void {
    const tipAmount = Math.round(this.subtotal() * (percentage / 100) * 100) / 100;
    this._tip.set(tipAmount);
  }

  setLoyaltyRedemption(points: number, discount: number): void {
    this._loyaltyPointsToRedeem.set(points);
    this._loyaltyDiscount.set(discount);
  }

  clearLoyaltyRedemption(): void {
    this._loyaltyPointsToRedeem.set(0);
    this._loyaltyDiscount.set(0);
  }

  setEstimatedPointsEarned(points: number): void {
    this._estimatedPointsEarned.set(points);
  }

  setSurcharge(enabled: boolean, percent: number): void {
    this._surchargeEnabled.set(enabled);
    this._surchargePercent.set(Math.max(0, percent));
  }

  clear(): void {
    this._items.set([]);
    this._orderType.set('pickup');
    this._customer.set(undefined);
    this._tableId.set(undefined);
    this._specialInstructions.set(undefined);
    this._tip.set(0);
    this._isOpen.set(false);
    this._loyaltyPointsToRedeem.set(0);
    this._loyaltyDiscount.set(0);
    this._estimatedPointsEarned.set(0);
    this._surchargeEnabled.set(false);
    this._surchargePercent.set(3.5);
    this._taxRateOverride.set(null);
  }

  getOrderData(): Partial<any> {
    return {
      orderType: this._orderType(),
      customer: this._customer(),
      tableId: this._tableId(),
      specialInstructions: this._specialInstructions(),
      sourceDeviceId: this.socketService.deviceId(),
      items: this._items().map(item => ({
        menuItemId: item.menuItem.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        modifiers: (item.selectedModifiers ?? []).map(mod => ({
          id: mod.id,
          name: mod.name,
          priceAdjustment: mod.priceAdjustment,
        })),
        specialInstructions: item.specialInstructions,
      })),
      subtotal: this.subtotal(),
      tax: this.tax(),
      tip: this._tip(),
      total: this.total(),
      loyaltyPointsRedeemed: this._loyaltyPointsToRedeem(),
      discount: this._loyaltyDiscount(),
      surcharge: this.surchargeAmount(),
    };
  }
}
