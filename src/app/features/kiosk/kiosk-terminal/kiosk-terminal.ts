import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MenuService } from '../../../services/menu';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { TableService } from '../../../services/table';
import { LoyaltyService } from '../../../services/loyalty';
import { CheckoutService } from '../../../services/checkout';
import { WeightScale } from '../../../shared/weight-scale';
import { Checkout } from '../../../shared/checkout/checkout';
import { ItemGrid } from '../../../shared/item-grid';
import {
  MenuCategory,
  MenuItem,
  WEIGHT_UNIT_LABELS,
  isItemAvailable,
} from '../../../models/index';

@Component({
  selector: 'os-kiosk-terminal',
  imports: [CurrencyPipe, WeightScale, Checkout, ItemGrid],
  templateUrl: './kiosk-terminal.html',
  styleUrl: './kiosk-terminal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KioskTerminal implements OnInit {
  private readonly router = inject(Router);
  private readonly menuService = inject(MenuService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly tableService = inject(TableService);
  private readonly loyaltyService = inject(LoyaltyService);
  readonly checkout = inject(CheckoutService);

  // Menu state
  private readonly _categories = signal<MenuCategory[]>([]);
  private readonly _selectedCategoryId = signal<string | null>(null);
  readonly categories = this._categories.asReadonly();
  readonly selectedCategoryId = this._selectedCategoryId.asReadonly();

  // Loading
  readonly isLoading = this.menuService.isLoading;
  readonly menuError = this.menuService.error;

  // Table closing check — blocks ordering when check has been presented
  readonly isTableClosing = computed(() =>
    this.checkout.selectedTable()?.status === 'closing'
  );

  // Helper for weight unit labels in template
  readonly weightUnitLabels = WEIGHT_UNIT_LABELS;

  // Bound function reference for the item-grid component
  readonly getItemImageFn = (item: MenuItem): string | null => {
    return item.imageUrl ?? item.thumbnailUrl ?? item.image ?? null;
  };

  // Collect all items from a category tree (handles nested subcategories)
  private collectItems(cats: MenuCategory[]): MenuItem[] {
    const items: MenuItem[] = [];
    for (const cat of cats) {
      if (cat.items) items.push(...cat.items);
      if (cat.subcategories) items.push(...this.collectItems(cat.subcategories));
    }
    return items;
  }

  private kioskFilter(items: MenuItem[]): MenuItem[] {
    return items.filter(i =>
      i.isActive !== false &&
      !i.eightySixed &&
      i.channelVisibility?.kiosk !== false &&
      isItemAvailable(i) &&
      this.menuService.isItemInActiveDaypart(i)
    );
  }

  // All available kiosk items
  private readonly allKioskItems = computed(() => {
    return this.kioskFilter(this.collectItems(this._categories()));
  });

  // Items filtered by selected category
  readonly gridItems = computed(() => {
    const items = this.allKioskItems();
    const catId = this._selectedCategoryId();
    if (!catId) return items;
    const cat = this._categories().find(c => c.id === catId);
    if (!cat) return items;
    const catItemIds = new Set(this.collectItems([cat]).map(i => i.id));
    return items.filter(i => catItemIds.has(i.id));
  });

  // React to categories loading
  private readonly _categoryEffect = effect(() => {
    const cats = this.menuService.categories();
    if (cats.length > 0) {
      this._categories.set(cats);
    }
  });

  ngOnInit(): void {
    this.menuService.loadMenu();
    this.tableService.loadTables();
    this.settingsService.loadSettings();
    this.loyaltyService.loadConfig();
  }

  selectCategory(categoryId: string | null): void {
    this._selectedCategoryId.set(categoryId);
  }

  formatPrice(price: number | string): number {
    return typeof price === 'string' ? Number.parseFloat(price) : price;
  }

  goBack(): void {
    this.checkout.clearCart();
    this.router.navigate(['/kiosk']);
  }
}
