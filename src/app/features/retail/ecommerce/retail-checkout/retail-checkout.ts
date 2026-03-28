import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, input } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RetailEcommerceService } from '../../../../services/retail-ecommerce';
import {
  EcommerceCartItem,
  EcommerceCheckoutStep,
  ShippingAddress,
  FulfillmentOption,
} from '../../../../models/retail-ecommerce.model';

@Component({
  selector: 'os-retail-checkout',
  standalone: true,
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './retail-checkout.html',
  styleUrls: ['./retail-checkout.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RetailCheckout implements OnInit {
  private readonly ecommerceService = inject(RetailEcommerceService);
  private readonly router = inject(Router);

  readonly storeSlug = input<string>('');

  readonly storeConfig = this.ecommerceService.storeConfig;
  readonly isLoading = this.ecommerceService.isLoadingPublic;
  readonly shippingMethods = this.ecommerceService.activeShippingMethods;

  // Cart
  private readonly _cart = signal<EcommerceCartItem[]>([]);
  readonly cart = this._cart.asReadonly();
  readonly cartSubtotal = computed(() =>
    this._cart().reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );
  readonly cartItemCount = computed(() =>
    this._cart().reduce((sum, item) => sum + item.quantity, 0),
  );

  // Step
  private readonly _step = signal<EcommerceCheckoutStep>('cart');
  readonly step = this._step.asReadonly();

  // Fulfillment
  private readonly _fulfillmentType = signal<FulfillmentOption>('ship');
  readonly fulfillmentType = this._fulfillmentType.asReadonly();

  // Shipping address
  readonly shippingAddress = signal<ShippingAddress>({
    fullName: '',
    line1: '',
    line2: null,
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
  });

  // Customer info
  readonly customerName = signal('');
  readonly customerEmail = signal('');

  // Selected shipping method
  private readonly _selectedShippingMethodId = signal<string | null>(null);
  readonly selectedShippingMethodId = this._selectedShippingMethodId.asReadonly();
  readonly selectedShippingMethod = computed(() => {
    const id = this._selectedShippingMethodId();
    if (!id) return null;
    return this.shippingMethods().find(m => m.id === id) ?? null;
  });
  readonly shippingCost = computed(() => {
    if (this._fulfillmentType() !== 'ship') return 0;
    const method = this.selectedShippingMethod();
    if (!method) return 0;
    if (method.freeAbove && this.cartSubtotal() >= method.freeAbove) return 0;
    return method.rate;
  });

  // Tax
  readonly taxAmount = computed(() => {
    const config = this.storeConfig();
    if (!config) return 0;
    return this.cartSubtotal() * (config.taxRate / 100);
  });

  // Total
  readonly orderTotal = computed(() =>
    this.cartSubtotal() + this.shippingCost() + this.taxAmount(),
  );

  // Processing
  private readonly _isProcessing = signal(false);
  readonly isProcessing = this._isProcessing.asReadonly();
  private readonly _orderError = signal<string | null>(null);
  readonly orderError = this._orderError.asReadonly();
  private readonly _orderSuccess = signal(false);
  readonly orderSuccess = this._orderSuccess.asReadonly();

  // Validation
  readonly canProceedToShipping = computed(() =>
    this._cart().length > 0,
  );

  readonly canProceedToPayment = computed(() => {
    if (!this.customerName() || !this.customerEmail()) return false;
    if (this._fulfillmentType() === 'ship') {
      const addr = this.shippingAddress();
      return !!addr.fullName && !!addr.line1 && !!addr.city && !!addr.state && !!addr.postalCode;
    }
    return true;
  });

  ngOnInit(): void {
    const slug = this.storeSlug();
    if (!this.storeConfig()) {
      this.ecommerceService.loadStoreConfig(slug);
    }
    this.ecommerceService.loadShippingMethods();

    // Restore cart
    const saved = sessionStorage.getItem(`ecom-cart-${slug}`);
    if (saved) {
      try {
        this._cart.set(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }

  goToStep(step: EcommerceCheckoutStep): void {
    this._step.set(step);
  }

  setFulfillmentType(type: FulfillmentOption): void {
    this._fulfillmentType.set(type);
    if (type !== 'ship') {
      this._selectedShippingMethodId.set(null);
    }
  }

  selectShippingMethod(id: string): void {
    this._selectedShippingMethodId.set(id);
  }

  updateAddress(field: keyof ShippingAddress, value: string): void {
    this.shippingAddress.update(addr => ({ ...addr, [field]: value }));
  }

  updateCartQuantity(index: number, quantity: number): void {
    if (quantity <= 0) {
      this._cart.update(cart => cart.filter((_, i) => i !== index));
    } else {
      this._cart.update(cart =>
        cart.map((item, i) => (i === index ? { ...item, quantity } : item)),
      );
    }
    this.saveCart();
  }

  removeItem(index: number): void {
    this._cart.update(cart => cart.filter((_, i) => i !== index));
    this.saveCart();
  }

  async submitOrder(): Promise<void> {
    this._isProcessing.set(true);
    this._orderError.set(null);

    const result = await this.ecommerceService.submitOrder(this.storeSlug(), {
      items: this._cart().map(item => ({
        itemId: item.itemId,
        variationId: item.variationId,
        quantity: item.quantity,
      })),
      customerEmail: this.customerEmail(),
      customerName: this.customerName(),
      fulfillmentType: this._fulfillmentType(),
      shippingAddress: this._fulfillmentType() === 'ship' ? this.shippingAddress() as unknown as Record<string, string> : null,
      shippingMethodId: this._selectedShippingMethodId(),
      paymentMethodId: 'card',
    });

    this._isProcessing.set(false);

    if (result) {
      this._orderSuccess.set(true);
      this._step.set('confirmation');
      sessionStorage.removeItem(`ecom-cart-${this.storeSlug()}`);
      this._cart.set([]);
    } else {
      this._orderError.set('Failed to process your order. Please try again.');
    }
  }

  goBackToStore(): void {
    this.router.navigate(['/shop', this.storeSlug()]);
  }

  private saveCart(): void {
    sessionStorage.setItem(`ecom-cart-${this.storeSlug()}`, JSON.stringify(this._cart()));
  }
}
