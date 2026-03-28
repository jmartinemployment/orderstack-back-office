import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, input } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingSpinner } from '../../../../shared/loading-spinner/loading-spinner';
import { RetailEcommerceService } from '../../../../services/retail-ecommerce';
import { RetailItem, RetailCategory } from '../../../../models/retail.model';
import { ProductFilterState, ProductSortOption, EcommerceCartItem } from '../../../../models/retail-ecommerce.model';

@Component({
  selector: 'os-product-list',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, LoadingSpinner],
  templateUrl: './product-list.html',
  styleUrls: ['./product-list.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductList implements OnInit {
  private readonly ecommerceService = inject(RetailEcommerceService);
  private readonly router = inject(Router);

  readonly storeSlug = input<string>('');

  // Store config
  readonly storeConfig = this.ecommerceService.storeConfig;
  readonly isLoading = this.ecommerceService.isLoadingPublic;
  readonly error = this.ecommerceService.error;

  // Filters
  private readonly _filters = signal<ProductFilterState>({
    categoryId: null,
    minPrice: null,
    maxPrice: null,
    search: '',
    sort: 'name_asc',
  });
  readonly filters = this._filters.asReadonly();

  // Cart
  private readonly _cart = signal<EcommerceCartItem[]>([]);
  readonly cart = this._cart.asReadonly();
  readonly cartItemCount = computed(() =>
    this._cart().reduce((sum, item) => sum + item.quantity, 0),
  );
  readonly cartTotal = computed(() =>
    this._cart().reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );

  // Categories extracted from items
  readonly categories = computed<RetailCategory[]>(() => {
    return [];
  });

  // Filtered + sorted items
  readonly filteredItems = computed(() => {
    const items = this.ecommerceService.publicItems();
    const f = this._filters();
    let result = items.filter(item => item.isActive && item.channelVisibility.online);

    if (f.search) {
      const q = f.search.toLowerCase();
      result = result.filter(
        item => item.name.toLowerCase().includes(q) || (item.sku ?? '').toLowerCase().includes(q),
      );
    }

    if (f.categoryId) {
      result = result.filter(item => item.categoryId === f.categoryId);
    }

    if (f.minPrice !== null) {
      result = result.filter(item => item.basePrice >= f.minPrice!);
    }

    if (f.maxPrice !== null) {
      result = result.filter(item => item.basePrice <= f.maxPrice!);
    }

    // Sort
    switch (f.sort) {
      case 'name_asc':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        result = [...result].sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price_asc':
        result = [...result].sort((a, b) => a.basePrice - b.basePrice);
        break;
      case 'price_desc':
        result = [...result].sort((a, b) => b.basePrice - a.basePrice);
        break;
      case 'newest':
        result = [...result].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
        break;
    }

    return result;
  });

  // Cart drawer
  private readonly _showCart = signal(false);
  readonly showCart = this._showCart.asReadonly();

  ngOnInit(): void {
    const slug = this.storeSlug();
    if (slug) {
      this.ecommerceService.loadStoreConfig(slug);
      this.ecommerceService.loadPublicCatalog(slug);
    }
    // Restore cart from sessionStorage
    const saved = sessionStorage.getItem(`ecom-cart-${slug}`);
    if (saved) {
      try {
        this._cart.set(JSON.parse(saved));
      } catch {
        // ignore corrupt data
      }
    }
  }

  setSearch(value: string): void {
    this._filters.update(f => ({ ...f, search: value }));
  }

  setCategory(categoryId: string | null): void {
    this._filters.update(f => ({ ...f, categoryId }));
  }

  setSort(sort: ProductSortOption): void {
    this._filters.update(f => ({ ...f, sort }));
  }

  getPriceRange(item: RetailItem): string {
    if (!item.variations || item.variations.length === 0) return '';
    const prices = item.variations.filter(v => v.isActive).map(v => v.price);
    if (prices.length === 0) return '';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? '' : `${min} - ${max}`;
  }

  hasVariations(item: RetailItem): boolean {
    return !!item.variations && item.variations.length > 1;
  }

  addToCart(item: RetailItem): void {
    const existing = this._cart().find(c => c.itemId === item.id && c.variationId === null);
    if (existing) {
      this._cart.update(cart =>
        cart.map(c =>
          c.itemId === item.id && c.variationId === null
            ? { ...c, quantity: c.quantity + 1 }
            : c,
        ),
      );
    } else {
      this._cart.update(cart => [
        ...cart,
        {
          itemId: item.id,
          variationId: null,
          name: item.name,
          variationName: null,
          sku: item.sku ?? '',
          imageUrl: item.imageUrl,
          unitPrice: item.basePrice,
          quantity: 1,
          maxQuantity: null,
        },
      ]);
    }
    this.saveCart();
  }

  removeFromCart(index: number): void {
    this._cart.update(cart => cart.filter((_, i) => i !== index));
    this.saveCart();
  }

  updateCartQuantity(index: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(index);
      return;
    }
    this._cart.update(cart =>
      cart.map((item, i) => (i === index ? { ...item, quantity } : item)),
    );
    this.saveCart();
  }

  toggleCart(): void {
    this._showCart.update(v => !v);
  }

  closeCart(): void {
    this._showCart.set(false);
  }

  goToProduct(item: RetailItem): void {
    this.router.navigate(['/shop', this.storeSlug(), 'product', item.id]);
  }

  goToCheckout(): void {
    this.router.navigate(['/shop', this.storeSlug(), 'checkout']);
  }

  private saveCart(): void {
    sessionStorage.setItem(`ecom-cart-${this.storeSlug()}`, JSON.stringify(this._cart()));
  }
}
