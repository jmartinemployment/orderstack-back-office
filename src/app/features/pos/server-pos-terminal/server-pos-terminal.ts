import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuService } from '../../../services/menu';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { TableService } from '../../../services/table';
import { CheckoutService } from '../../../services/checkout';
import { NotificationService } from '../../../services/notification';
import { TopNavigation, TopNavigationTab } from '../../../shared/top-navigation';
import { WeightScale } from '../../../shared/weight-scale';
import { Checkout } from '../../../shared/checkout/checkout';
import { BottomNavigation } from '../../../shared/bottom-navigation/bottom-navigation';
import { ItemGrid } from '../../../shared/item-grid';
import {
  MenuCategory,
  MenuItem,
  WEIGHT_UNIT_LABELS,
} from '../../../models/index';
import {
  collectMenuItems,
  filterTerminalItems,
  computeTerminalGridItems,
} from '../../../shared/utils/terminal-menu-utils';

type TopTab = 'keypad' | 'library' | 'favorites' | 'menu';

@Component({
  selector: 'os-pos-terminal',
  imports: [CurrencyPipe, FormsModule, TopNavigation, WeightScale, BottomNavigation, Checkout, ItemGrid],
  templateUrl: './server-pos-terminal.html',
  styleUrl: './server-pos-terminal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerPosTerminal implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly tableService = inject(TableService);
  readonly checkout = inject(CheckoutService);
  readonly notification = inject(NotificationService);
  private readonly _cdr = inject(ChangeDetectorRef);

  // Top tab state — default to Favorites
  readonly topTabs: TopNavigationTab[] = [
    { key: 'keypad', label: 'Keypad' },
    { key: 'library', label: 'Library' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'menu', label: 'Items' },
  ];
  private readonly _activeTopTab = signal<TopTab>('favorites');
  readonly activeTopTab = this._activeTopTab.asReadonly();

  // Menu state
  private readonly _categories = signal<MenuCategory[]>([]);
  private readonly _selectedCategoryId = signal<string | null>(null);
  readonly categories = this._categories.asReadonly();
  readonly selectedCategoryId = this._selectedCategoryId.asReadonly();

  // Loading
  readonly isLoading = this.menuService.isLoading;
  readonly menuError = this.menuService.error;

  // Helper for weight unit labels in template
  readonly weightUnitLabels = WEIGHT_UNIT_LABELS;

  // Bound function reference for the item-grid component
  readonly getItemImageFn = (item: MenuItem): string | null => {
    return item.imageUrl ?? item.thumbnailUrl ?? item.image ?? null;
  };

  // --- Customer inline form state ---
  readonly showCustomerForm = signal(false);
  readonly customerName = signal('');
  readonly customerPhone = signal('');
  readonly customerEmail = signal('');
  readonly hasCustomer = computed(() =>
    this.checkout.customerName().trim().length > 0 ||
    this.checkout.customerPhone().trim().length > 0 ||
    this.checkout.customerEmail().trim().length > 0
  );
  readonly customerDisplayName = computed(() => {
    const name = this.checkout.customerName().trim();
    if (name) return name;
    const phone = this.checkout.customerPhone().trim();
    if (phone) return phone;
    return this.checkout.customerEmail().trim();
  });

  // All available items (used for Favorites fallback)
  private readonly allItems = computed(() =>
    filterTerminalItems(collectMenuItems(this._categories()), this.menuService),
  );

  // Filtered items for the grid based on active top tab + selected category
  readonly gridItems = computed(() =>
    computeTerminalGridItems(
      this._activeTopTab(),
      this.allItems(),
      this._selectedCategoryId(),
      this._categories(),
    ),
  );

  // Keypad state
  private readonly _keypadValue = signal('');
  readonly keypadValue = this._keypadValue.asReadonly();

  // React to categories loading — field initializer keeps injection context
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
  }

  // --- Tab navigation ---

  selectTopTab(tab: string): void {
    this._activeTopTab.set(tab as TopTab);
  }

  selectCategory(categoryId: string | null): void {
    this._selectedCategoryId.set(categoryId);
  }

  // --- Keypad ---

  onKeypadPress(key: string): void {
    if (key === 'clear') {
      this._keypadValue.set('');
    } else if (key === 'backspace') {
      this._keypadValue.update(v => v.slice(0, -1));
    } else {
      this._keypadValue.update(v => v + key);
    }
  }

  formatPrice(price: number | string): number {
    return typeof price === 'string' ? Number.parseFloat(price) : price;
  }

  // --- Customer management ---

  toggleCustomerForm(): void {
    if (this.hasCustomer()) {
      // If customer already set, clicking opens form to edit
      this.customerName.set(this.checkout.customerName());
      this.customerPhone.set(this.checkout.customerPhone());
      this.customerEmail.set(this.checkout.customerEmail());
    } else {
      this.customerName.set('');
      this.customerPhone.set('');
      this.customerEmail.set('');
    }
    this.showCustomerForm.update(v => !v);
    this._cdr.markForCheck();
  }

  saveCustomer(): void {
    this.checkout.onCustomerNameChange(this.customerName());
    this.checkout.onCustomerPhoneChange(this.customerPhone());
    this.checkout.onCustomerEmailChange(this.customerEmail());
    this.showCustomerForm.set(false);
  }

  clearCustomer(): void {
    this.customerName.set('');
    this.customerPhone.set('');
    this.customerEmail.set('');
    this.checkout.onCustomerNameChange('');
    this.checkout.onCustomerPhoneChange('');
    this.checkout.onCustomerEmailChange('');
    this.showCustomerForm.set(false);
  }
}
