import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
// import { CurrencyPipe, DatePipe } from '@angular/common';
// import { CashDrawerService } from '../../../services/cash-drawer';
// import {
//   CashEventType,
//   CashDenomination,
//   getCashEventLabel,
//   getCashEventIcon,
//   isCashInflow,
//   calculateDenominationTotal,
//   emptyDenomination,
// } from '../../../models/cash-drawer.model';

// type DrawerView = 'status' | 'open' | 'close' | 'event';
// type DrawerTab = 'drawer' | 'employees' | 'alerts' | 'report';

// interface DenominationRow {
//   key: keyof CashDenomination;
//   label: string;
//   value: number;
// }

// const DENOMINATION_ROWS: DenominationRow[] = [
//   { key: 'hundreds', label: '$100', value: 100 },
//   { key: 'fifties', label: '$50', value: 50 },
//   { key: 'twenties', label: '$20', value: 20 },
//   { key: 'tens', label: '$10', value: 10 },
//   { key: 'fives', label: '$5', value: 5 },
//   { key: 'ones', label: '$1', value: 1 },
//   { key: 'quarters', label: '25¢', value: 0.25 },
//   { key: 'dimes', label: '10¢', value: 0.1 },
//   { key: 'nickels', label: '5¢', value: 0.05 },
//   { key: 'pennies', label: '1¢', value: 0.01 },
// ];

// const REPORTABLE_EVENT_TYPES: CashEventType[] = [
//   'cash_sale', 'cash_in', 'cash_out', 'paid_out',
//   'tip_payout', 'drop_to_safe', 'petty_cash', 'bank_deposit', 'refund',
// ];

@Component({
  selector: 'os-cash-drawer',
  // imports: [CurrencyPipe, DatePipe],
  templateUrl: './cash-drawer.html',
  styleUrl: './cash-drawer.scss',
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashDrawer {
  //readonly drawerService = inject(CashDrawerService);

//   private readonly _view = signal<DrawerView>('status');
//   private readonly _tab = signal<DrawerTab>('drawer');
//   private readonly _openingFloat = signal(200);
//   private readonly _denomination = signal<CashDenomination>(emptyDenomination());
//   private readonly _eventType = signal<CashEventType>('cash_out');
//   private readonly _eventAmount = signal(0);
//   private readonly _eventReason = signal('');
//   private readonly _thresholdInput = signal(5);

//   readonly view = this._view.asReadonly();
//   readonly tab = this._tab.asReadonly();
//   readonly openingFloat = this._openingFloat.asReadonly();
//   readonly denomination = this._denomination.asReadonly();
//   readonly eventType = this._eventType.asReadonly();
//   readonly eventAmount = this._eventAmount.asReadonly();
//   readonly eventReason = this._eventReason.asReadonly();
//   readonly thresholdInput = this._thresholdInput.asReadonly();
//   readonly denominationRows = DENOMINATION_ROWS;
//   readonly reportableEventTypes = REPORTABLE_EVENT_TYPES;

//   readonly eventLog = computed(() => {
//     const session = this.drawerService.session();
//     if (!session) return [];
//     return [...session.events].reverse();
//   });

//   readonly denominationTotal = computed(() => {
//     return calculateDenominationTotal(this._denomination());
//   });

//   readonly closeVariance = computed(() => {
//     return this.denominationTotal() - this.drawerService.runningBalance();
//   });

//   readonly overShortClass = computed(() => {
//     const session = this.drawerService.session();
//     if (session?.overShort === undefined) return '';
//     if (session.overShort > 0) return 'over';
//     if (session.overShort < 0) return 'short';
//     return 'even';
//   });

//   readonly alertCount = computed(() => this.drawerService.discrepancyAlerts().length);
//   readonly flaggedCount = computed(() => this.drawerService.flaggedEmployees().length);

//   // --- Tab navigation ---

//   selectTab(tab: DrawerTab): void {
//     this._tab.set(tab);
//   }

//   // --- Drawer view methods ---

//   showOpenDrawer(): void {
//     this._openingFloat.set(200);
//     this._view.set('open');
//   }

//   showCloseDrawer(): void {
//     this._denomination.set(emptyDenomination());
//     this._view.set('close');
//   }

//   showAddEvent(): void {
//     this._eventType.set('cash_out');
//     this._eventAmount.set(0);
//     this._eventReason.set('');
//     this._view.set('event');
//   }

//   showQuickEvent(type: CashEventType): void {
//     this._eventType.set(type);
//     this._eventAmount.set(0);
//     this._eventReason.set('');
//     this._view.set('event');
//   }

//   cancelView(): void {
//     this._view.set('status');
//   }

//   setOpeningFloat(val: number): void {
//     this._openingFloat.set(Math.max(0, val));
//   }

//   setDenominationCount(key: keyof CashDenomination, count: number): void {
//     const d = { ...this._denomination() };
//     d[key] = Math.max(0, Math.round(count));
//     this._denomination.set(d);
//   }

//   setEventType(type: CashEventType): void {
//     this._eventType.set(type);
//   }

//   setEventAmount(val: number): void {
//     this._eventAmount.set(Math.max(0, val));
//   }

//   setEventReason(val: string): void {
//     this._eventReason.set(val);
//   }

//   openDrawer(): void {
//     this.drawerService.openDrawer(this._openingFloat());
//     this._view.set('status');
//   }

//   closeDrawer(): void {
//     this.drawerService.closeDrawerWithDenomination(this._denomination());
//     this._view.set('status');
//   }

//   submitEvent(): void {
//     const type = this._eventType();
//     const amount = this._eventAmount();
//     const reason = this._eventReason().trim();
//     if (amount <= 0 || !reason) return;

//     this.drawerService.addEvent(type, amount, reason);
//     this._view.set('status');
//   }

//   startNewSession(): void {
//     this.drawerService.clearSession();
//     this.showOpenDrawer();
//   }

//   // --- Discrepancy threshold ---

//   setThresholdInput(val: number): void {
//     this._thresholdInput.set(Math.max(0, val));
//   }

//   applyThreshold(): void {
//     this.drawerService.setDiscrepancyThreshold(this._thresholdInput());
//   }

//   // --- Report filters ---

//   setReportDateFrom(value: string): void {
//     this.drawerService.setReportDateFrom(value ? new Date(value) : null);
//   }

//   setReportDateTo(value: string): void {
//     this.drawerService.setReportDateTo(value ? new Date(value) : null);
//   }

//   setReportEmployee(value: string): void {
//     this.drawerService.setReportEmployeeFilter(value || null);
//   }

//   setReportType(value: string): void {
//     this.drawerService.setReportTypeFilter((value || null) as CashEventType | null);
//   }

//   clearFilters(): void {
//     this.drawerService.clearReportFilters();
//   }

//   // --- Helpers ---

//   getEventLabel(type: CashEventType): string {
//     return getCashEventLabel(type);
//   }

//   getEventIcon(type: CashEventType): string {
//     return getCashEventIcon(type);
//   }

//   isInflow(type: CashEventType): boolean {
//     return isCashInflow(type);
//   }

//   formatVariance(value: number): string {
//     const abs = Math.abs(value);
//     let prefix: string;
//     if (value > 0) {
//       prefix = '+$';
//     } else if (value < 0) {
//       prefix = '-$';
//     } else {
//       prefix = '$';
//     }
//     return `${prefix}${abs.toFixed(2)}`;
//   }
 }
