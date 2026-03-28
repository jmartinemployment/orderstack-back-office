import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuService } from '../../../services/menu';
import { OrderService } from '../../../services/order';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { TableService } from '../../../services/table';
import { LoyaltyService } from '../../../services/loyalty';
import { SocketService } from '../../../services/socket';
import { StationService } from '../../../services/station';
import { PaymentService } from '../../../services/payment';
import { AuthService } from '../../../services/auth';
import { CheckoutService } from '../../../services/checkout';
import { PaymentTerminal } from '../../../shared/payment-terminal/payment-terminal';
import { TopNavigation, TopNavigationTab } from '../../../shared/top-navigation';
import { WeightScale } from '../../../shared/weight-scale';
import { Checkout } from '../../../shared/checkout/checkout';
import { BottomNavigation } from '../../../shared/bottom-navigation/bottom-navigation';
import { ItemGrid } from '../../../shared/item-grid';
import { OrderCard } from '../../kds/order-card/order-card';
import { ConnectionStatus } from '../../../shared/connection-status/connection-status';
import {
  MenuCategory,
  MenuItem,
  WEIGHT_UNIT_LABELS,
  GuestOrderStatus,
} from '@models/index';
import {
  QSR_PALETTE,
  collectMenuItems,
  filterTerminalItems,
  computeTerminalGridItems,
  buildCategoryColorMap,
  handleKeypadPress,
  parseItemPrice,
} from '@shared/utils/terminal-menu-utils';

type TopTab = 'keypad' | 'library' | 'favorites' | 'menu';
type BarMode = 'create' | 'incoming';

@Component({
  selector: 'os-bar-terminal',
  imports: [CurrencyPipe, FormsModule, PaymentTerminal, TopNavigation, WeightScale, OrderCard, ConnectionStatus, BottomNavigation, Checkout, ItemGrid],
  templateUrl: './bar-terminal.html',
  styleUrl: './bar-terminal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarTerminal implements OnInit, OnDestroy {
  private readonly menuService = inject(MenuService);
  private readonly orderService = inject(OrderService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly tableService = inject(TableService);
  private readonly loyaltyService = inject(LoyaltyService);
  private readonly socketService = inject(SocketService);
  readonly stationService = inject(StationService);
  private readonly paymentService = inject(PaymentService);
  private readonly authService = inject(AuthService);
  readonly checkout = inject(CheckoutService);

  // --- Bar Mode Toggle (default: incoming) ---
  private readonly _barMode = signal<BarMode>('incoming');
  readonly barMode = this._barMode.asReadonly();

  // Top tab state — default to Menu so beverage category is visible
  readonly topTabs: TopNavigationTab[] = [
    { key: 'keypad', label: 'Keypad' },
    { key: 'library', label: 'Library' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'menu', label: 'Items' },
  ];
  private readonly _activeTopTab = signal<TopTab>('menu');
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

  // Beverage category keywords — bar defaults to drinks if a matching category exists
  private static readonly BEVERAGE_KEYWORDS = /beer|cocktail|drink|beverage|wine|spirit|bar/i;

  // Category color map — same pattern as Quick Service
  readonly categoryColorMap = computed(() => buildCategoryColorMap(this._categories()));

  // Bound function reference for the item-grid component
  readonly getCategoryColorFn = (item: MenuItem): string => {
    const catId = item.categoryId;
    if (!catId) return QSR_PALETTE[0];
    return this.categoryColorMap().get(catId) ?? QSR_PALETTE[0];
  };

  // --- Incoming Orders State ---

  readonly beverageCategoryIds = computed(() => {
    const configured = this.settingsService.barSettings().beverageCategoryIds;
    if (configured.length > 0) {
      return new Set(configured);
    }
    const ids = new Set<string>();
    for (const cat of this._categories()) {
      if (BarTerminal.BEVERAGE_KEYWORDS.exec(cat.name) !== null) {
        ids.add(cat.id);
      }
    }
    return ids;
  });

  readonly barStationId = computed(() => {
    const catMap = this.stationService.categoryToStationMap();
    const bevCats = this.beverageCategoryIds();
    for (const catId of bevCats) {
      const stationId = catMap.get(catId);
      if (stationId) return stationId;
    }
    return null;
  });

  readonly menuItemToStationMap = computed(() => {
    const catToStation = this.stationService.categoryToStationMap();
    const map = new Map<string, string>();
    for (const item of this.menuService.allItems()) {
      if (item.categoryId) {
        const stationId = catToStation.get(item.categoryId);
        if (stationId) {
          map.set(item.id, stationId);
        }
      }
    }
    return map;
  });

  private readonly menuItemToCategoryMap = computed(() => {
    const map = new Map<string, string>();
    for (const item of this.menuService.allItems()) {
      if (item.categoryId) {
        map.set(item.id, item.categoryId);
      }
    }
    return map;
  });

  readonly barOrders = computed(() => {
    const orders = this.orderService.orders();
    const stationId = this.barStationId();
    const itemMap = this.menuItemToStationMap();

    if (stationId && itemMap.size > 0) {
      return orders.filter(o =>
        o.checks.some(c =>
          c.selections.some(s => itemMap.get(s.menuItemGuid) === stationId)
        )
      );
    }

    const bevCats = this.beverageCategoryIds();
    if (bevCats.size > 0) {
      const catMap = this.menuItemToCategoryMap();
      return orders.filter(o =>
        o.checks.some(c =>
          c.selections.some(s => {
            const catId = catMap.get(s.menuItemGuid);
            return catId !== undefined && bevCats.has(catId);
          })
        )
      );
    }

    return [];
  });

  readonly newOrders = computed(() =>
    this.barOrders().filter(o => o.guestOrderStatus === 'RECEIVED')
  );
  readonly cookingOrders = computed(() =>
    this.barOrders().filter(o => o.guestOrderStatus === 'IN_PREPARATION')
  );
  readonly readyOrders = computed(() =>
    this.barOrders().filter(o => o.guestOrderStatus === 'READY_FOR_PICKUP')
  );

  // Payment modal state — same pattern as KDS
  private readonly _paymentOrderId = signal<string | null>(null);
  private readonly _paymentError = signal<string | null>(null);
  private readonly _showPaymentModal = signal(false);

  readonly showPaymentModal = this._showPaymentModal.asReadonly();
  readonly paymentError = this._paymentError.asReadonly();
  readonly showCollectPayment = computed(() =>
    this.settingsService.paymentSettings().processor !== 'none'
  );

  readonly paymentOrder = computed(() => {
    const id = this._paymentOrderId();
    if (!id) return null;
    return this.orderService.getOrderById(id) ?? null;
  });

  readonly paymentCheck = computed(() => this.paymentOrder()?.checks[0] ?? null);
  readonly paymentAmount = computed(() => this.paymentCheck()?.totalAmount ?? 0);

  // --- Menu filtering ---

  private readonly allBarItems = computed(() =>
    filterTerminalItems(collectMenuItems(this._categories()), this.menuService),
  );

  readonly gridItems = computed(() =>
    computeTerminalGridItems(
      this._activeTopTab(),
      this.allBarItems(),
      this._selectedCategoryId(),
      this._categories(),
    ),
  );

  // Keypad state
  private readonly _keypadValue = signal('');
  readonly keypadValue = this._keypadValue.asReadonly();

  // Track previous newOrders count for sound alert
  private _prevNewOrderCount = 0;

  private readonly _soundEffect = effect(() => {
    const count = this.newOrders().length;
    const barSettings = this.settingsService.barSettings();
    if (count > this._prevNewOrderCount && this._prevNewOrderCount >= 0 && barSettings.soundEnabled) {
      const audio = new Audio(`assets/sounds/${barSettings.soundName}.mp3`);
      audio.play().catch(() => {
        // Browser autoplay policy may block — ignore
      });
    }
    this._prevNewOrderCount = count;
  });

  private readonly _categoryEffect = effect(() => {
    const cats = this.menuService.categories();
    if (cats.length > 0) {
      this._categories.set(cats);
      if (!this._selectedCategoryId()) {
        const beverageCat = cats.find(c => BarTerminal.BEVERAGE_KEYWORDS.exec(c.name) !== null);
        this._selectedCategoryId.set((beverageCat ?? cats[0]).id);
      }
    }
  });

  ngOnInit(): void {
    this.menuService.loadMenu();
    this.tableService.loadTables();
    this.settingsService.loadSettings();
    this.loyaltyService.loadConfig();

    const barSettings = this.settingsService.barSettings();
    if (barSettings.defaultMode) {
      this._barMode.set(barSettings.defaultMode);
    }

    this.stationService.loadStations();
    this.stationService.loadCategoryMappings();

    const merchantId = this.authService.selectedMerchantId();
    if (merchantId) {
      this.socketService.connect(merchantId, 'kds');
    }

    this.orderService.loadOrders({ limit: 50 });
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  // --- Bar Mode ---

  setBarMode(mode: BarMode): void {
    this._barMode.set(mode);
  }

  // --- Tab navigation ---

  selectTopTab(tab: string): void {
    this._activeTopTab.set(tab as TopTab);
  }

  selectCategory(categoryId: string): void {
    this._selectedCategoryId.set(categoryId || null);
  }

  // --- Keypad ---

  onKeypadPress(key: string): void {
    this._keypadValue.update(v => handleKeypadPress(v, key));
  }

  // --- Incoming Orders: Status Changes ---

  onStatusChange(event: { orderId: string; status: GuestOrderStatus }): void {
    const order = this.orderService.getOrderById(event.orderId);
    const needsConfirmFirst = event.status === 'IN_PREPARATION' && order?.guestOrderStatus === 'RECEIVED';

    const doUpdate = async (): Promise<void> => {
      if (needsConfirmFirst) {
        const confirmed = await this.orderService.updateOrderStatus(event.orderId, 'RECEIVED');
        if (!confirmed) return;
      }
      await this.orderService.updateOrderStatus(event.orderId, event.status);
    };

    doUpdate();
  }

  // --- Incoming Orders: Payment Modal ---

  onCollectPayment(orderId: string): void {
    const settings = this.settingsService.paymentSettings();
    this.paymentService.setProcessorType(settings.processor);

    this._paymentOrderId.set(orderId);
    this._paymentError.set(null);
    this._showPaymentModal.set(true);
  }

  onBarPaymentComplete(): void {
    const orderId = this._paymentOrderId();
    this.closePaymentModal();
    this.paymentService.reset();

    if (orderId) {
      this.onStatusChange({ orderId, status: 'CLOSED' });
    }
  }

  onBarPaymentFailed(message: string): void {
    this._paymentError.set(message);
  }

  closePaymentModal(): void {
    this._showPaymentModal.set(false);
    this._paymentOrderId.set(null);
    this._paymentError.set(null);
  }

  // --- Helpers ---

  formatPrice(price: number | string): number {
    return parseItemPrice(price);
  }
}
