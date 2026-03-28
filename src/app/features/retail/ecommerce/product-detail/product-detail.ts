import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, input } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { LoadingSpinner } from '../../../../shared/loading-spinner/loading-spinner';
import { RetailEcommerceService } from '../../../../services/retail-ecommerce';
import { RetailItem, RetailItemVariation } from '../../../../models/retail.model';
import { EcommerceCartItem } from '../../../../models/retail-ecommerce.model';

@Component({
  selector: 'os-product-detail',
  standalone: true,
  imports: [CurrencyPipe, LoadingSpinner],
  templateUrl: './product-detail.html',
  styleUrls: ['./product-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetail implements OnInit {
  private readonly ecommerceService = inject(RetailEcommerceService);
  private readonly router = inject(Router);

  readonly storeSlug = input<string>('');
  readonly productId = input<string>('');

  readonly isLoading = this.ecommerceService.isLoadingPublic;
  readonly storeConfig = this.ecommerceService.storeConfig;

  // Product
  private readonly _product = signal<RetailItem | null>(null);
  readonly product = this._product.asReadonly();

  // Selected variation
  private readonly _selectedVariationId = signal<string | null>(null);
  readonly selectedVariation = computed<RetailItemVariation | null>(() => {
    const p = this._product();
    const vid = this._selectedVariationId();
    if (!p?.variations || !vid) return null;
    return p.variations.find(v => v.id === vid) ?? null;
  });

  // Current price
  readonly currentPrice = computed(() => {
    const variation = this.selectedVariation();
    if (variation) return variation.price;
    return this._product()?.basePrice ?? 0;
  });

  // Image gallery
  private readonly _selectedImageIndex = signal(0);
  readonly selectedImageIndex = this._selectedImageIndex.asReadonly();
  readonly currentImageUrl = computed(() => {
    const variation = this.selectedVariation();
    if (variation?.imageUrl) return variation.imageUrl;
    return this._product()?.imageUrl ?? null;
  });

  // Quantity
  private readonly _quantity = signal(1);
  readonly quantity = this._quantity.asReadonly();

  // Cart
  private readonly _cart = signal<EcommerceCartItem[]>([]);
  readonly cartItemCount = computed(() =>
    this._cart().reduce((sum, item) => sum + item.quantity, 0),
  );

  // Added to cart feedback
  private readonly _addedToCart = signal(false);
  readonly addedToCart = this._addedToCart.asReadonly();

  // Has variations
  readonly hasVariations = computed(() => {
    const p = this._product();
    return !!p?.variations && p.variations.length > 0;
  });

  readonly activeVariations = computed<RetailItemVariation[]>(() => {
    const p = this._product();
    if (!p?.variations) return [];
    return p.variations.filter(v => v.isActive);
  });

  // In stock
  readonly isInStock = computed(() => {
    const variation = this.selectedVariation();
    if (variation) return variation.stockQuantity > 0;
    return true;
  });

  ngOnInit(): void {
    const slug = this.storeSlug();
    const pid = this.productId();

    // Load store config if not loaded
    if (!this.storeConfig()) {
      this.ecommerceService.loadStoreConfig(slug);
    }

    // Load catalog if not loaded, then find item
    if (this.ecommerceService.publicItems().length === 0) {
      this.ecommerceService.loadPublicCatalog(slug).then(() => {
        this.findProduct(pid);
      });
    } else {
      this.findProduct(pid);
    }

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

  selectVariation(variationId: string): void {
    this._selectedVariationId.set(variationId);
    this._quantity.set(1);
  }

  incrementQuantity(): void {
    this._quantity.update(q => q + 1);
  }

  decrementQuantity(): void {
    this._quantity.update(q => Math.max(1, q - 1));
  }

  addToCart(): void {
    const p = this._product();
    if (!p) return;

    const variation = this.selectedVariation();
    const cartItem: EcommerceCartItem = {
      itemId: p.id,
      variationId: variation?.id ?? null,
      name: p.name,
      variationName: variation?.name ?? null,
      sku: variation?.sku ?? p.sku ?? '',
      imageUrl: variation?.imageUrl ?? p.imageUrl,
      unitPrice: variation?.price ?? p.basePrice,
      quantity: this._quantity(),
      maxQuantity: null,
    };

    const existing = this._cart().findIndex(
      c => c.itemId === cartItem.itemId && c.variationId === cartItem.variationId,
    );

    if (existing >= 0) {
      this._cart.update(cart =>
        cart.map((item, i) =>
          i === existing ? { ...item, quantity: item.quantity + cartItem.quantity } : item,
        ),
      );
    } else {
      this._cart.update(cart => [...cart, cartItem]);
    }

    sessionStorage.setItem(`ecom-cart-${this.storeSlug()}`, JSON.stringify(this._cart()));
    this._addedToCart.set(true);
    setTimeout(() => this._addedToCart.set(false), 2000);
  }

  goBack(): void {
    this.router.navigate(['/shop', this.storeSlug()]);
  }

  goToCart(): void {
    this.router.navigate(['/shop', this.storeSlug()], { queryParams: { cart: 'open' } });
  }

  private findProduct(productId: string): void {
    const items = this.ecommerceService.publicItems();
    const found = items.find(i => i.id === productId);
    this._product.set(found ?? null);

    // Auto-select first variation
    if (found?.variations && found.variations.length > 0) {
      const firstActive = found.variations.find(v => v.isActive);
      if (firstActive) {
        this._selectedVariationId.set(firstActive.id);
      }
    }
  }
}
