import { Injectable, inject, signal, computed } from '@angular/core';
import { OrderService } from './order';
import { TableService } from './table';
import { LoyaltyService } from './loyalty';
import { RestaurantSettingsService } from './restaurant-settings';
import { NotificationService } from './notification';
import { CartItem } from '../models/cart.model';
import { MenuItem, WeightUnit } from '../models/menu.model';
import { RestaurantTable } from '../models/table.model';
import { WeightScaleResult } from '../shared/weight-scale';

export type DiningOption = 'dine_in' | 'takeout';
export type CheckoutMode = 'charge' | 'send';
export type CheckoutStep =
  | 'idle'
  | 'dining-option'
  | 'table-select'
  | 'customer-info'
  | 'payment'
  | 'loyalty-prompt'
  | 'sending'
  | 'success'
  | 'failed';

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private readonly orderService = inject(OrderService);
  private readonly tableService = inject(TableService);
  private readonly loyaltyService = inject(LoyaltyService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly notificationService = inject(NotificationService);

  // --- Cart state ---

  private readonly _cartItems = signal<CartItem[]>([]);
  readonly cartItems = this._cartItems.asReadonly();

  readonly cartCount = computed(() =>
    this._cartItems().reduce((sum, item) => sum + (item.weightUnit ? 1 : item.quantity), 0)
  );

  readonly subtotal = computed(() =>
    this._cartItems().reduce((sum, item) => sum + item.totalPrice, 0)
  );

  readonly taxRate = computed(() =>
    this.settingsService.paymentSettings().taxRate ?? 0.08
  );

  readonly tax = computed(() =>
    Math.round(this.subtotal() * this.taxRate() * 100) / 100
  );

  readonly total = computed(() =>
    Math.round((this.subtotal() + this.tax()) * 100) / 100
  );

  // --- Weight scale state ---

  private readonly _weightScaleItem = signal<MenuItem | null>(null);
  readonly weightScaleItem = this._weightScaleItem.asReadonly();
  readonly showWeightScale = computed(() => this._weightScaleItem() !== null);

  readonly weightScaleUnitPrice = computed(() => {
    const item = this._weightScaleItem();
    if (!item) return 0;
    return typeof item.price === 'string' ? Number.parseFloat(item.price) : item.price;
  });

  readonly weightScaleUnit = computed<WeightUnit>(() =>
    this._weightScaleItem()?.weightUnit ?? 'lb'
  );

  // --- Checkout flow state ---

  private readonly _checkoutStep = signal<CheckoutStep>('idle');
  private readonly _checkoutMode = signal<CheckoutMode>('charge');
  private readonly _orderSource = signal('');
  private readonly _diningOption = signal<DiningOption | null>(null);
  private readonly _selectedTable = signal<RestaurantTable | null>(null);
  private readonly _createdOrderId = signal<string | null>(null);
  private readonly _checkoutError = signal<string | null>(null);
  private readonly _isCreatingOrder = signal(false);
  private readonly _orderNumber = signal<string | null>(null);

  // --- Present Check state ---

  private readonly _checkPresented = signal(false);
  readonly checkPresented = this._checkPresented.asReadonly();

  readonly canPresentCheck = computed(() =>
    this._cartItems().length > 0 &&
    this._selectedTable() !== null &&
    !this._checkPresented()
  );

  readonly isTableClosing = computed(() =>
    this._checkPresented() || this._selectedTable()?.status === 'closing'
  );

  readonly checkoutStep = this._checkoutStep.asReadonly();
  readonly checkoutMode = this._checkoutMode.asReadonly();
  readonly diningOption = this._diningOption.asReadonly();
  readonly selectedTable = this._selectedTable.asReadonly();
  readonly createdOrderId = this._createdOrderId.asReadonly();
  readonly checkoutError = this._checkoutError.asReadonly();
  readonly isCreatingOrder = this._isCreatingOrder.asReadonly();
  readonly orderNumber = this._orderNumber.asReadonly();

  // Counter service modes skip table selection and customer info
  readonly isCounterService = computed(() => {
    const src = this._orderSource();
    return src === 'quick-service' || src === 'kiosk' || src === 'register';
  });

  // --- Customer info state ---

  private readonly _customerName = signal('');
  private readonly _customerPhone = signal('');
  private readonly _customerEmail = signal('');

  readonly customerName = this._customerName.asReadonly();
  readonly customerPhone = this._customerPhone.asReadonly();
  readonly customerEmail = this._customerEmail.asReadonly();

  readonly hasCustomerContact = computed(() =>
    this._customerName().trim().length > 0 ||
    this._customerPhone().trim().length > 0 ||
    this._customerEmail().trim().length > 0
  );

  // --- Loyalty ---

  readonly loyaltyConfig = this.loyaltyService.config;
  readonly loyaltyEnabled = computed(() => this.loyaltyConfig().enabled);

  readonly showLoyaltyPrompt = computed(() =>
    this.loyaltyEnabled() && this.hasCustomerContact()
  );

  // --- Tables ---

  readonly tablesLoading = this.tableService.isLoading;

  readonly availableTables = computed(() =>
    this.tableService.tables().filter(t => t.status === 'available')
  );

  // --- Payment settings ---

  readonly showOnScreenPayment = computed(() => {
    const p = this.settingsService.paymentSettings().processor;
    return p === 'paypal';
  });

  readonly showCardReader = computed(() => {
    const p = this.settingsService.paymentSettings().processor;
    return p === 'zettle_reader';
  });

  // ==================== Cart Operations ====================

  addItem(item: MenuItem): void {
    if (item.soldByWeight) {
      this._weightScaleItem.set(item);
      return;
    }

    const price = typeof item.price === 'string' ? Number.parseFloat(item.price) : item.price;
    const existing = this._cartItems().find(ci => ci.menuItem.id === item.id && !ci.modifierSummary && !ci.weightUnit);

    if (existing) {
      this._cartItems.update(items =>
        items.map(ci =>
          ci.id === existing.id
            ? { ...ci, quantity: ci.quantity + 1, totalPrice: (ci.quantity + 1) * ci.unitPrice }
            : ci
        )
      );
    } else {
      const cartItem: CartItem = {
        id: crypto.randomUUID(),
        menuItem: item,
        quantity: 1,
        unitPrice: price,
        totalPrice: price,
      };
      this._cartItems.update(items => [...items, cartItem]);
    }
  }

  onWeightConfirmed(result: WeightScaleResult): void {
    const item = this._weightScaleItem();
    if (!item) return;

    const cartItem: CartItem = {
      id: crypto.randomUUID(),
      menuItem: item,
      quantity: result.weight,
      unitPrice: typeof item.price === 'string' ? Number.parseFloat(item.price) : item.price,
      totalPrice: result.totalPrice,
      weightUnit: result.unit,
    };
    this._cartItems.update(items => [...items, cartItem]);
    this._weightScaleItem.set(null);
  }

  closeWeightScale(): void {
    this._weightScaleItem.set(null);
  }

  removeItem(cartItemId: string): void {
    this._cartItems.update(items => items.filter(ci => ci.id !== cartItemId));
  }

  incrementItem(cartItemId: string): void {
    this._cartItems.update(items =>
      items.map(ci =>
        ci.id === cartItemId
          ? { ...ci, quantity: ci.quantity + 1, totalPrice: (ci.quantity + 1) * ci.unitPrice }
          : ci
      )
    );
  }

  decrementItem(cartItemId: string): void {
    this._cartItems.update(items =>
      items
        .map(ci =>
          ci.id === cartItemId
            ? { ...ci, quantity: ci.quantity - 1, totalPrice: (ci.quantity - 1) * ci.unitPrice }
            : ci
        )
        .filter(ci => ci.quantity > 0)
    );
  }

  clearCart(): void {
    this._cartItems.set([]);
  }

  // ==================== Present Check ====================

  async presentCheck(): Promise<void> {
    const table = this._selectedTable();
    if (!table) return;
    this._checkPresented.set(true);
    this.notificationService.show(`Check presented — Table #${table.tableNumber}`);
    await this.tableService.updateStatus(table.id, 'closing');
  }

  // ==================== Checkout Flow ====================

  startCheckout(mode: CheckoutMode, orderSource: string): void {
    if (this._cartItems().length === 0) return;
    this._checkoutMode.set(mode);
    this._orderSource.set(orderSource);
    this._checkoutStep.set('dining-option');
    this._checkoutError.set(null);

    // Auto-trigger closing state when charging a table that hasn't already presented check
    if (mode === 'charge' && this._selectedTable() !== null && !this._checkPresented()) {
      void this.presentCheck();
    }
  }

  selectDiningOption(option: DiningOption): void {
    this._diningOption.set(option);

    // Counter service: skip tables and customer info, send to kitchen then payment
    if (this.isCounterService()) {
      void this.createOrderAndPay();
      return;
    }

    if (option === 'dine_in' && this.availableTables().length > 0) {
      this._checkoutStep.set('table-select');
    } else if (option === 'takeout') {
      // Skip customer-info if already provided from sale panel
      if (this.hasCustomerContact()) {
        this._checkoutMode() === 'charge' ? void this.createOrderAndPay() : void this.createOrder();
      } else {
        this._checkoutStep.set('customer-info');
      }
    } else if (this._checkoutMode() === 'charge') {
      // Skip customer-info if already provided from sale panel
      if (this.hasCustomerContact()) {
        void this.createOrderAndPay();
      } else {
        this._checkoutStep.set('customer-info');
      }
    } else {
      void this.createOrder();
    }
  }

  setTableContext(table: RestaurantTable): void {
    this._selectedTable.set(table);
    this._diningOption.set('dine_in');
  }

  selectTable(table: RestaurantTable): void {
    this._selectedTable.set(table);
    if (this._checkoutMode() === 'charge') {
      if (this.hasCustomerContact()) {
        void this.createOrderAndPay();
      } else {
        this._checkoutStep.set('customer-info');
      }
    } else {
      void this.createOrder();
    }
  }

  skipTableSelection(): void {
    this._selectedTable.set(null);
    if (this._checkoutMode() === 'charge') {
      if (this.hasCustomerContact()) {
        void this.createOrderAndPay();
      } else {
        this._checkoutStep.set('customer-info');
      }
    } else {
      void this.createOrder();
    }
  }

  // --- Customer info ---

  onCustomerNameChange(value: string): void {
    this._customerName.set(value);
  }

  onCustomerPhoneChange(value: string): void {
    this._customerPhone.set(value);
  }

  onCustomerEmailChange(value: string): void {
    this._customerEmail.set(value);
  }

  submitCustomerInfo(): void {
    if (this._checkoutMode() === 'send') {
      void this.createOrder();
    } else {
      void this.createOrderAndPay();
    }
  }

  skipCustomerInfo(): void {
    this._customerName.set('');
    this._customerPhone.set('');
    this._customerEmail.set('');
    if (this._checkoutMode() === 'send') {
      void this.createOrder();
    } else {
      void this.createOrderAndPay();
    }
  }

  // --- Order creation ---

  private buildCustomerInfo(): Record<string, string> | undefined {
    const name = this._customerName().trim();
    const phone = this._customerPhone().trim();
    const email = this._customerEmail().trim();

    if (!name && !phone && !email) return undefined;

    const nameParts = name.split(' ');
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') ?? '';

    return {
      firstName,
      lastName,
      phone,
      email,
    };
  }

  private buildOrderData(): Record<string, unknown> {
    const items = this._cartItems().map(ci => ({
      menuItemId: ci.menuItem.id,
      name: ci.menuItem.name,
      quantity: ci.quantity,
      unitPrice: ci.unitPrice,
      totalPrice: ci.totalPrice,
      modifiers: ci.modifierSummary || undefined,
      ...(ci.weightUnit ? { weightUnit: ci.weightUnit } : {}),
    }));

    const table = this._selectedTable();
    const isDineIn = this._diningOption() === 'dine_in';
    const customerInfo = this.buildCustomerInfo();

    return {
      items,
      orderType: isDineIn ? 'dine-in' : 'takeout',
      orderSource: this._orderSource(),
      ...(table ? { tableId: table.id, tableNumber: table.tableNumber } : {}),
      ...(customerInfo ? { customerInfo } : {}),
    };
  }

  private async createOrderAndPay(): Promise<void> {
    this._isCreatingOrder.set(true);
    this._checkoutError.set(null);

    const order = await this.orderService.createOrder(this.buildOrderData());

    this._isCreatingOrder.set(false);

    if (!order) {
      this._checkoutError.set(this.orderService.error() ?? 'Failed to create order');
      this._checkoutStep.set('failed');
      return;
    }

    this._createdOrderId.set(order.guid);
    this._orderNumber.set(order.orderNumber || order.guid.slice(-4).toUpperCase());
    this._checkoutStep.set('payment');
  }

  private async createOrder(): Promise<void> {
    this._isCreatingOrder.set(true);
    this._checkoutStep.set('sending');
    this._checkoutError.set(null);

    const order = await this.orderService.createOrder(this.buildOrderData());

    this._isCreatingOrder.set(false);

    if (!order) {
      this._checkoutError.set(this.orderService.error() ?? 'Failed to create order');
      this._checkoutStep.set('failed');
      return;
    }

    this._createdOrderId.set(order.guid);
    this._orderNumber.set(order.orderNumber || order.guid.slice(-4).toUpperCase());
    this._checkoutStep.set('success');

    // Auto-dismiss success after 3 seconds for counter service, 2 for others
    const delay = this.isCounterService() ? 3000 : 2000;
    setTimeout(() => this.finishAndNewOrder(), delay);
  }

  // --- Payment callbacks ---

  onPaymentComplete(): void {
    if (this.showLoyaltyPrompt()) {
      this._checkoutStep.set('loyalty-prompt');
    } else {
      this._checkoutStep.set('success');
    }
  }

  onPaymentFailed(errorMsg: string): void {
    this._checkoutError.set(errorMsg);
    this._checkoutStep.set('failed');
  }

  retryPayment(): void {
    this._checkoutError.set(null);
    this._checkoutStep.set('payment');
  }

  retrySend(): void {
    this._checkoutError.set(null);
    this._checkoutStep.set('dining-option');
  }

  // --- Loyalty ---

  joinLoyalty(): void {
    const customerInfo = this.buildCustomerInfo();
    if (customerInfo) {
      const orderId = this._createdOrderId();
      if (orderId) {
        this.loyaltyService.adjustPoints(orderId, 0, `Enrolled via ${this._orderSource()}`).catch(() => {
          // Enrollment is best-effort
        });
      }
    }
    this._checkoutStep.set('success');
  }

  skipLoyalty(): void {
    this._checkoutStep.set('success');
  }

  // --- Reset ---

  private resetCheckout(): void {
    this._checkoutStep.set('idle');
    this._checkoutMode.set('charge');
    this._orderSource.set('');
    this._diningOption.set(null);
    this._selectedTable.set(null);
    this._createdOrderId.set(null);
    this._orderNumber.set(null);
    this._checkoutError.set(null);
    this._isCreatingOrder.set(false);
    this._customerName.set('');
    this._customerPhone.set('');
    this._customerEmail.set('');
    this._checkPresented.set(false);
  }

  finishAndNewOrder(): void {
    this.clearCart();
    this.resetCheckout();
  }

  cancelCheckout(): void {
    // Revert table from closing back to occupied if check was presented this session
    if (this._checkPresented()) {
      const table = this._selectedTable();
      if (table) {
        this.tableService.updateStatus(table.id, 'occupied');
      }
    }
    this.resetCheckout();
  }
}
