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
import { FormsModule } from '@angular/forms';
import { MenuService } from '../../../services/menu';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { TableService } from '../../../services/table';
import { LoyaltyService } from '../../../services/loyalty';
import { CheckoutService } from '../../../services/checkout';
import { TopNavigation, TopNavigationTab } from '../../../shared/top-navigation';
import { WeightScale } from '../../../shared/weight-scale';
import { Checkout } from '../../../shared/checkout/checkout';
import { BottomNavigation } from '../../../shared/bottom-navigation/bottom-navigation';
import { ItemGrid } from '../../../shared/item-grid';
import {
  MenuItem,
  MenuCategory,
  WEIGHT_UNIT_LABELS,
} from '../../../models/index';
import {
  collectMenuItems,
  filterTerminalItems,
  computeTerminalGridItems,
  handleKeypadPress,
  parseItemPrice,
} from '../../../shared/utils/terminal-menu-utils';

type TopTab = 'keypad' | 'library' | 'favorites' | 'menu';

@Component({
  selector: 'os-register-terminal',
  imports: [CurrencyPipe, FormsModule, TopNavigation, WeightScale, BottomNavigation, Checkout, ItemGrid],
  templateUrl: './register-terminal.html',
  styleUrl: './register-terminal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterTerminal implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly tableService = inject(TableService);
  private readonly loyaltyService = inject(LoyaltyService);
  readonly checkout = inject(CheckoutService);

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

  // All available register items
  private readonly allRegisterItems = computed(() =>
    filterTerminalItems(collectMenuItems(this._categories()), this.menuService),
  );

  // Filtered items for the grid based on active top tab + selected category
  readonly gridItems = computed(() =>
    computeTerminalGridItems(
      this._activeTopTab(),
      this.allRegisterItems(),
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
    this.loyaltyService.loadConfig();
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
    this._keypadValue.update(v => handleKeypadPress(v, key));
  }

  formatPrice(price: number | string): number {
    return parseItemPrice(price);
  }
}
