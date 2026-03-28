import { Component, input, output, computed, signal, inject, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import {
  Order,
  GuestOrderStatus,
  Selection,
  Course,
  CoursePacingMode,
  CoursePacingConfidence,
  PrintStatus,
  DeliveryQuote,
  isMarketplaceOrder,
  getMarketplaceProviderLabel,
  getMarketplaceSyncState,
  getMarketplaceSyncStateLabel,
  MarketplaceSyncState,
  DispatchState,
  getMarketplaceSyncClass,
} from '../../../models/index';
import type { OrderSentimentRecord } from '../../../models/sentiment.model';
import { SentimentAlertService } from '../../../services/sentiment-alert';
import { StatusBadge } from '../status-badge/status-badge';

export interface CourseGroup {
  course: Course | null;
  label: string;
  selections: SelectionWithDelay[];
  fireStatus: 'PENDING' | 'FIRED' | 'READY';
  maxPrepSeconds: number;
}

export interface SelectionWithDelay {
  selection: Selection;
  prepSeconds: number;
  fireDelaySeconds: number;
}

type TablePaceSource = 'observed_order' | 'historical_baseline';

export interface AutoFireDelayBreakdown {
  targetGapSeconds: number;
  nextCoursePrepSeconds: number;
  kitchenLoadPenaltySeconds: number;
  tablePaceSeconds: number;
  baselineTablePaceSeconds: number;
  observedTablePaceSeconds: number | null;
  tablePaceAdjustmentSeconds: number;
  tablePaceSource: TablePaceSource;
  confidence: CoursePacingConfidence;
  computedDelaySeconds: number;
}

@Component({
  selector: 'os-order-card',
  imports: [StatusBadge, CurrencyPipe],
  templateUrl: './order-card.html',
  styleUrl: './order-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderCard implements OnInit, OnDestroy {
  private readonly sentimentAlertService = inject(SentimentAlertService);

  order = input.required<Order>();
  estimatedPrepMinutes = input<number>(0);
  isRushed = input(false);
  coursePacingMode = input<CoursePacingMode>('disabled');
  prepTimeMap = input<Map<string, number>>(new Map());
  autoFireDelaySeconds = input(300);
  targetCourseServeGapSeconds = input(1200);
  coursePacingBaselineSeconds = input(900);
  coursePacingConfidence = input<CoursePacingConfidence>('low');
  activeOrderCount = input(0);
  overdueOrderCount = input(0);
  prepTimeFiringEnabled = input(false);
  defaultPrepMinutes = input(10);
  printStatus = input<PrintStatus>('none');
  isExpoQueue = input(false);
  isThrottleQueue = input(false);
  showThrottleHoldAction = input(false);
  deliveryQuote = input<DeliveryQuote | null>(null);
  dispatchState = input<DispatchState>('idle');
  dispatchError = input<string | null>(null);
  canDispatchDelivery = input(false);
  stationFilterId = input<string | null>(null);
  menuItemToStationMap = input<Map<string, string>>(new Map());

  showCollectPayment = input(false);

  statusChange = output<{ orderId: string; status: GuestOrderStatus }>();
  rushToggle = output<string>();
  expoCheck = output<string>();
  dispatchDriver = output<string>();
  collectPayment = output<string>();
  fireCourse = output<{ orderId: string; courseGuid: string }>();
  fireItemNow = output<{ orderId: string; selectionGuid: string }>();
  throttleHold = output<string>();
  releaseThrottle = output<string>();
  retryPrint = output<string>();
  recallOrder = output<string>();
  remakeItem = output<{ orderId: string; checkGuid: string; selectionGuid: string }>();

  private readonly _remakeConfirmGuid = signal<string | null>(null);
  readonly remakeConfirmGuid = this._remakeConfirmGuid.asReadonly();

  readonly sentimentAlert = computed<OrderSentimentRecord | null>(() => {
    const orderId = this.order()?.guid;
    if (!orderId) return null;
    return this.sentimentAlertService.alerts().find(a => a.orderId === orderId) ?? null;
  });

  readonly canRemake = computed(() => {
    const status = this.order().guestOrderStatus;
    return status === 'IN_PREPARATION' || status === 'READY_FOR_PICKUP';
  });

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private readonly _elapsedMinutes = signal(0);
  private readonly _now = signal(Date.now());
  private readonly _autoFireCountdowns = signal<Map<string, number>>(new Map());
  private readonly _autoFireDelayBreakdowns = signal<Map<string, AutoFireDelayBreakdown>>(new Map());
  private readonly _staggerStartTime = signal<number | null>(null);
  private readonly _manuallyFiredItems = signal(new Set<string>());
  private readonly _autoFiredCourses = signal(new Set<string>());
  private _lastOrderGuid = '';
  readonly elapsedMinutes = this._elapsedMinutes.asReadonly();
  readonly autoFireCountdowns = this._autoFireCountdowns.asReadonly();

  readonly prepProgress = computed(() => {
    const est = this.estimatedPrepMinutes();
    if (est <= 0) return 0;
    return Math.round((this._elapsedMinutes() / est) * 100);
  });

  readonly prepColorClass = computed(() => {
    const progress = this.prepProgress();
    if (progress >= 100) return 'prep-overdue';
    if (progress >= 70) return 'prep-warning';
    return 'prep-ok';
  });

  readonly remainingMinutes = computed(() => {
    const est = this.estimatedPrepMinutes();
    if (est <= 0) return null;
    return Math.max(0, est - this._elapsedMinutes());
  });

  readonly isUrgent = computed(() => {
    const est = this.estimatedPrepMinutes();
    if (est > 0) return this.prepProgress() >= 100;
    return this._elapsedMinutes() > 10;
  });

  readonly orderTypeClass = computed(() => {
    switch (this.order().diningOption.type) {
      case 'takeout': return 'order-type-pickup';
      case 'delivery': return 'order-type-delivery';
      case 'dine-in': return 'order-type-dinein';
      case 'curbside': return 'order-type-curbside';
      case 'catering': return 'order-type-catering';
      default: return '';
    }
  });

  readonly orderTypeLabel = computed(() => {
    return this.order().diningOption.name;
  });

  readonly isMarketplace = computed(() => isMarketplaceOrder(this.order()));

  readonly marketplaceSourceLabel = computed(() => getMarketplaceProviderLabel(this.order()));

  readonly marketplaceSyncState = computed<MarketplaceSyncState | null>(() =>
    getMarketplaceSyncState(this.order())
  );

  readonly marketplaceSyncLabel = computed(() =>
    getMarketplaceSyncStateLabel(this.marketplaceSyncState())
  );

  readonly marketplaceSyncClass = computed(() => getMarketplaceSyncClass(this.order()));

  readonly deliveryProviderLabel = computed(() => {
    const provider = this.order().deliveryInfo?.deliveryProvider;
    if (!provider || provider === 'self' || provider === 'none') return null;
    return provider === 'doordash' ? 'DoorDash' : 'Uber';
  });

  readonly deliveryProviderClass = computed(() => {
    const provider = this.order().deliveryInfo?.deliveryProvider;
    return provider === 'doordash' ? 'provider-doordash' : 'provider-uber';
  });

  readonly dispatchStatusLabel = computed(() => {
    const status = this.order().deliveryInfo?.dispatchStatus;
    if (!status) return null;
    switch (status) {
      case 'QUOTED': return 'Quoted';
      case 'DISPATCH_REQUESTED': return 'Requesting driver';
      case 'DRIVER_ASSIGNED': return 'Driver assigned';
      case 'DRIVER_EN_ROUTE_TO_PICKUP': return 'Driver en route';
      case 'DRIVER_AT_PICKUP': return 'Driver here';
      case 'PICKED_UP': return 'Picked up';
      case 'DRIVER_EN_ROUTE_TO_DROPOFF': return 'Out for delivery';
      case 'DRIVER_AT_DROPOFF': return 'Driver arriving';
      case 'DELIVERED': return 'Delivered';
      case 'CANCELLED': return 'Cancelled';
      case 'FAILED': return 'Failed';
      default: return null;
    }
  });

  readonly showDispatchButton = computed(() => {
    if (this.isThrottleQueue() || this.isThrottledOrder()) return false;
    if (!this.order().deliveryInfo) return false;
    if (this.dispatchState() === 'dispatched') return false;
    if (this.canDispatchDelivery()) return true;

    return this.dispatchState() === 'quoting'
      || this.dispatchState() === 'dispatching'
      || this.dispatchState() === 'failed';
  });

  readonly isDispatchButtonDisabled = computed(() => {
    if (this.dispatchState() === 'quoting' || this.dispatchState() === 'dispatching') return true;
    return !this.canDispatchDelivery();
  });

  readonly dispatchButtonLabel = computed(() => {
    switch (this.dispatchState()) {
      case 'quoting':
        return 'Quoting...';
      case 'dispatching':
        return 'Dispatching...';
      case 'failed':
        return 'Retry Dispatch';
      default:
        return 'Dispatch';
    }
  });

  readonly allSelections = computed(() =>
    this.order().checks.flatMap(c => c.selections)
  );

  /** Selections filtered to the selected station (or all if no station selected). */
  readonly filteredSelections = computed(() => {
    const stationId = this.stationFilterId();
    if (!stationId) return this.allSelections();
    const itemMap = this.menuItemToStationMap();
    if (itemMap.size === 0) return this.allSelections();
    return this.allSelections().filter(sel => {
      const selStation = itemMap.get(sel.menuItemGuid);
      return selStation === stationId || selStation === undefined;
    });
  });

  /** True when station filter hides some items from this order. */
  readonly isPartialOrder = computed(() =>
    this.filteredSelections().length < this.allSelections().length
  );

  readonly hasCourses = computed(() => {
    if (this.coursePacingMode() === 'disabled') return false;
    return this.filteredSelections().some(s => s.course !== undefined);
  });

  readonly showGroupedView = computed(() => {
    if (this.hasCourses()) return true;
    if (this.prepTimeFiringEnabled()) return true;
    return false;
  });

  readonly courseGroups = computed((): CourseGroup[] => {
    const selections = this.filteredSelections();
    const ptMap = this.prepTimeMap();

    if (!this.hasCourses()) {
      // No course grouping — single "Immediate" group
      const items = this.buildSelectionsWithDelay(selections, ptMap);
      return [{
        course: null,
        label: 'Immediate',
        selections: items,
        fireStatus: 'FIRED',
        maxPrepSeconds: items.reduce((max, s) => Math.max(max, s.prepSeconds), 0),
      }];
    }

    // Group by course
    const courseMap = new Map<string, { course: Course; sels: Selection[] }>();
    const noCourse: Selection[] = [];

    for (const sel of selections) {
      if (sel.course) {
        const key = sel.course.guid;
        const existing = courseMap.get(key);
        if (existing) {
          existing.sels.push(sel);
        } else {
          courseMap.set(key, { course: sel.course, sels: [sel] });
        }
      } else {
        noCourse.push(sel);
      }
    }

    const groups: CourseGroup[] = [];

    // "Immediate" group for items without a course
    if (noCourse.length > 0) {
      const items = this.buildSelectionsWithDelay(noCourse, ptMap);
      groups.push({
        course: null,
        label: 'Immediate',
        selections: items,
        fireStatus: 'FIRED',
        maxPrepSeconds: items.reduce((max, s) => Math.max(max, s.prepSeconds), 0),
      });
    }

    // Course groups sorted by sortOrder
    const sorted = [...courseMap.values()].sort((a, b) => a.course.sortOrder - b.course.sortOrder);
    for (const { course, sels } of sorted) {
      const items = this.buildSelectionsWithDelay(sels, ptMap);
      groups.push({
        course,
        label: course.name,
        selections: items,
        fireStatus: course.fireStatus,
        maxPrepSeconds: items.reduce((max, s) => Math.max(max, s.prepSeconds), 0),
      });
    }

    return groups;
  });

  readonly nextAction = computed<{ label: string; status: GuestOrderStatus } | null>(() => {
    switch (this.order().guestOrderStatus) {
      case 'RECEIVED': return { label: 'START', status: 'IN_PREPARATION' };
      case 'IN_PREPARATION': return { label: 'READY', status: 'READY_FOR_PICKUP' };
      case 'READY_FOR_PICKUP': return { label: 'COMPLETE', status: 'CLOSED' };
      default: return null;
    }
  });

  readonly bumpLabel = computed(() => {
    if (this.isExpoQueue()) return 'CHECKED';
    return this.nextAction()?.label ?? '';
  });

  readonly canRecall = computed(() => {
    const status = this.order().guestOrderStatus;
    return status === 'IN_PREPARATION' || status === 'READY_FOR_PICKUP';
  });

  readonly isThrottledOrder = computed(() => this.order().throttle?.state === 'HELD');

  readonly throttleReasonLabel = computed(() => {
    const reason = this.order().throttle?.reason;
    switch (reason) {
      case 'ACTIVE_OVERLOAD':
        return 'Held: active ticket threshold exceeded';
      case 'OVERDUE_OVERLOAD':
        return 'Held: overdue ticket threshold exceeded';
      case 'MANUAL_HOLD':
        return 'Held manually by operator';
      default:
        return 'Held by throttling guardrail';
    }
  });

  readonly throttleHoldDuration = computed(() => {
    const heldAt = this.order().throttle?.heldAt?.getTime();
    if (!heldAt) return '';
    const elapsedSeconds = Math.max(0, Math.floor((this._now() - heldAt) / 1000));
    return this.formatCountdown(elapsedSeconds);
  });

  readonly showThrottleReleaseButton = computed(() =>
    this.isThrottleQueue() || this.isThrottledOrder()
  );

  readonly showThrottleHoldButton = computed(() =>
    this.showThrottleHoldAction()
    && !this.isThrottleQueue()
    && !this.isThrottledOrder()
    && !this.isExpoQueue()
    && this.order().guestOrderStatus === 'RECEIVED'
  );

  ngOnInit(): void {
    this.updateElapsedTime();
    this._lastOrderGuid = this.order().guid;
    this.timerInterval = setInterval(() => {
      this.updateElapsedTime();
      this._now.set(Date.now());
      this.updateAutoFireCountdowns();
      this.detectStaggerStart();
      this.detectOrderChange();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  formatElapsed(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    return `${Math.floor(hours / 24)}d`;
  }

  private updateElapsedTime(): void {
    const created = this.order().timestamps.createdDate.getTime();
    const now = Date.now();
    const minutes = Math.floor((now - created) / 60000);
    this._elapsedMinutes.set(minutes);
  }

  private buildSelectionsWithDelay(selections: Selection[], ptMap: Map<string, number>): SelectionWithDelay[] {
    let maxPrep = 0;
    const items: { selection: Selection; prepSeconds: number }[] = [];

    for (const sel of selections) {
      const prepMin = ptMap.get(sel.menuItemGuid) ?? this.defaultPrepMinutes();
      const prepSec = prepMin * 60;
      if (prepSec > maxPrep) maxPrep = prepSec;
      items.push({ selection: sel, prepSeconds: prepSec });
    }

    return items.map(item => ({
      ...item,
      fireDelaySeconds: maxPrep > 0 ? maxPrep - item.prepSeconds : 0,
    }));
  }

  private updateAutoFireCountdowns(): void {
    if (this.coursePacingMode() !== 'auto_fire_timed') {
      this.resetAutoFireState();
      return;
    }

    const groups = this.courseGroups();
    const currentCountdowns = this._autoFireCountdowns();
    const countdowns = new Map<string, number>();
    const breakdowns = new Map<string, AutoFireDelayBreakdown>();

    this.pruneAutoFiredCourses(groups);

    for (let i = 1; i < groups.length; i++) {
      const group = groups[i];
      const prevGroup = groups[i - 1];

      if (group.fireStatus === 'PENDING' && prevGroup.fireStatus === 'READY' && group.course) {
        const adaptive = this.calculateAdaptiveAutoFireDelay(prevGroup, group);
        breakdowns.set(group.course.guid, adaptive.breakdown);

        if (this.isCourseReadyForAutoFire(prevGroup)) {
          this.tickCourseCountdown(group.course.guid, currentCountdowns, countdowns, adaptive.delaySeconds);
        }
      }
    }

    this._autoFireCountdowns.set(countdowns);
    this._autoFireDelayBreakdowns.set(breakdowns);
  }

  private resetAutoFireState(): void {
    if (this._autoFireCountdowns().size > 0) {
      this._autoFireCountdowns.set(new Map());
    }
    if (this._autoFireDelayBreakdowns().size > 0) {
      this._autoFireDelayBreakdowns.set(new Map());
    }
    if (this._autoFiredCourses().size > 0) {
      this._autoFiredCourses.set(new Set());
    }
  }

  private pruneAutoFiredCourses(groups: CourseGroup[]): void {
    const pendingCourseGuids = new Set(
      groups
        .filter(group => group.fireStatus === 'PENDING' && group.course)
        .map(group => group.course!.guid)
    );

    this._autoFiredCourses.update(existing => {
      const next = new Set<string>();
      for (const guid of existing) {
        if (pendingCourseGuids.has(guid)) next.add(guid);
      }
      return next;
    });
  }

  private tickCourseCountdown(
    courseGuid: string,
    currentCountdowns: Map<string, number>,
    countdowns: Map<string, number>,
    initialDelay: number
  ): void {
    const existing = currentCountdowns.get(courseGuid);

    if (existing === undefined) {
      if (initialDelay <= 0) {
        this.triggerAutoFire(courseGuid);
      } else {
        countdowns.set(courseGuid, initialDelay);
      }
      return;
    }

    if (existing <= 0) {
      this.triggerAutoFire(courseGuid);
      return;
    }

    const next = existing - 1;
    if (next <= 0) {
      this.triggerAutoFire(courseGuid);
    } else {
      countdowns.set(courseGuid, next);
    }
  }

  private isCourseReadyForAutoFire(group: CourseGroup): boolean {
    return group.selections.every(
      ({ selection }) => selection.fulfillmentStatus === 'SENT' || selection.fulfillmentStatus === 'ON_THE_FLY'
    );
  }

  private triggerAutoFire(courseGuid: string): void {
    if (this._autoFiredCourses().has(courseGuid)) return;
    this._autoFiredCourses.update(existing => {
      const next = new Set(existing);
      next.add(courseGuid);
      return next;
    });
    this.onFireCourse(courseGuid);
  }

  private calculateAdaptiveAutoFireDelay(
    previousGroup: CourseGroup,
    nextGroup: CourseGroup
  ): { delaySeconds: number; breakdown: AutoFireDelayBreakdown } {
    const fallbackDelay = Math.max(0, this.autoFireDelaySeconds());
    const configuredTarget = Math.max(0, this.targetCourseServeGapSeconds());
    const targetGapSeconds = configuredTarget > 0 ? configuredTarget : fallbackDelay;
    const nextCoursePrepSeconds = nextGroup.maxPrepSeconds > 0
      ? nextGroup.maxPrepSeconds
      : this.defaultPrepMinutes() * 60;
    const kitchenLoadPenaltySeconds = this.getKitchenLoadPenaltySeconds();
    const baselineTablePaceSeconds = this.normalizeTablePaceSeconds(this.coursePacingBaselineSeconds());
    const observedTablePaceSeconds = this.getObservedTablePaceSeconds(previousGroup);
    const tablePaceSeconds = observedTablePaceSeconds ?? baselineTablePaceSeconds;
    const tablePaceSource: TablePaceSource = observedTablePaceSeconds === null
      ? 'historical_baseline'
      : 'observed_order';
    const confidence = this.coursePacingConfidence();
    const confidenceWeight = this.getConfidenceWeight(confidence, tablePaceSource);
    const paceDeltaSeconds = tablePaceSeconds - baselineTablePaceSeconds;
    const tablePaceAdjustmentSeconds = this.clamp(
      Math.round(paceDeltaSeconds * confidenceWeight),
      -300,
      300
    );

    const delaySeconds = Math.max(
      0,
      Math.round(targetGapSeconds - nextCoursePrepSeconds - kitchenLoadPenaltySeconds + tablePaceAdjustmentSeconds)
    );

    return {
      delaySeconds,
      breakdown: {
        targetGapSeconds,
        nextCoursePrepSeconds,
        kitchenLoadPenaltySeconds,
        tablePaceSeconds,
        baselineTablePaceSeconds,
        observedTablePaceSeconds,
        tablePaceAdjustmentSeconds,
        tablePaceSource,
        confidence,
        computedDelaySeconds: delaySeconds,
      },
    };
  }

  private getKitchenLoadPenaltySeconds(): number {
    const active = this.activeOrderCount();
    const overdue = this.overdueOrderCount();
    if (active <= 0 && overdue <= 0) return 0;

    const activePenalty = Math.max(0, active - 2) * 20;
    const overduePenalty = overdue * 45;
    return Math.min(360, activePenalty + overduePenalty);
  }

  private getObservedTablePaceSeconds(previousGroup: CourseGroup): number | null {
    const firedAt = previousGroup.course?.firedDate?.getTime();
    if (!firedAt) return null;

    const readyAtFromCourse = previousGroup.course?.readyDate?.getTime() ?? null;
    const readyAtFromItems = previousGroup.selections.reduce((latest, item) => {
      const completed = item.selection.completedAt?.getTime();
      if (!completed) return latest;
      return Math.max(completed, latest);
    }, 0);

    const readyAt = Math.max(readyAtFromCourse ?? 0, readyAtFromItems);
    if (!readyAt || readyAt <= firedAt) return null;

    return Math.round((readyAt - firedAt) / 1000);
  }

  private normalizeTablePaceSeconds(value: number): number {
    if (!Number.isFinite(value)) return 900;
    return this.clamp(Math.round(value), 300, 2700);
  }

  private getConfidenceWeight(
    confidence: CoursePacingConfidence,
    source: TablePaceSource
  ): number {
    // Current-ticket pace observations are direct, so apply full weight.
    if (source === 'observed_order') return 1;

    switch (confidence) {
      case 'high':
        return 0.85;
      case 'medium':
        return 0.6;
      case 'low':
      default:
        return 0.35;
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  getFireDelayDisplay(seconds: number): string {
    if (seconds <= 0) return 'Fire now';
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    if (min > 0) return `+${min}:${sec.toString().padStart(2, '0')}`;
    return `+${sec}s`;
  }

  getCountdownDisplay(courseGuid: string): string {
    const secs = this._autoFireCountdowns().get(courseGuid) ?? 0;
    if (secs <= 0) return '';
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  getDelayBreakdown(courseGuid: string): AutoFireDelayBreakdown | null {
    return this._autoFireDelayBreakdowns().get(courseGuid) ?? null;
  }

  getDelayRationale(breakdown: AutoFireDelayBreakdown): string {
    const paceSign = breakdown.tablePaceAdjustmentSeconds >= 0 ? '+' : '-';
    const paceMagnitude = this.formatDurationCompact(Math.abs(breakdown.tablePaceAdjustmentSeconds));
    return `Delay = ${this.formatDurationCompact(breakdown.targetGapSeconds)} - ${this.formatDurationCompact(
      breakdown.nextCoursePrepSeconds
    )} - ${this.formatDurationCompact(breakdown.kitchenLoadPenaltySeconds)} ${paceSign} ${paceMagnitude}`;
  }

  getDelayRationaleMeta(breakdown: AutoFireDelayBreakdown): string {
    const source = breakdown.tablePaceSource === 'observed_order'
      ? 'ticket pace'
      : 'historical pace';
    return `${source}: ${this.formatDurationCompact(breakdown.tablePaceSeconds)} (${breakdown.confidence} confidence)`;
  }

  private formatDurationCompact(seconds: number): string {
    const sign = seconds < 0 ? '-' : '';
    const absolute = Math.abs(Math.round(seconds));
    if (absolute < 60) return `${sign}${absolute}s`;

    const min = Math.floor(absolute / 60);
    const sec = absolute % 60;
    if (sec === 0) return `${sign}${min}m`;
    return `${sign}${min}m ${sec}s`;
  }

  isItemHeld(sel: Selection): boolean {
    return sel.fulfillmentStatus === 'HOLD' || (sel.course?.fireStatus === 'PENDING' && this.coursePacingMode() !== 'disabled');
  }

  onBump(): void {
    if (this.isExpoQueue()) {
      this.expoCheck.emit(this.order().guid);
      return;
    }
    const action = this.nextAction();
    if (action) {
      this.statusChange.emit({ orderId: this.order().guid, status: action.status });
    }
  }

  onRush(): void {
    this.rushToggle.emit(this.order().guid);
  }

  onThrottleHold(): void {
    this.throttleHold.emit(this.order().guid);
  }

  onReleaseThrottle(): void {
    this.releaseThrottle.emit(this.order().guid);
  }

  onDispatchDriver(): void {
    this.dispatchDriver.emit(this.order().guid);
  }

  onRetryPrint(): void {
    this.retryPrint.emit(this.order().guid);
  }

  onRecall(): void {
    this.recallOrder.emit(this.order().guid);
  }

  onFireCourse(courseGuid: string): void {
    this.fireCourse.emit({ orderId: this.order().guid, courseGuid });
  }

  getItemFireState(item: SelectionWithDelay, courseStartTime?: number): 'active' | 'countdown' | 'waiting' {
    // If prep firing disabled, everything is active
    if (!this.prepTimeFiringEnabled()) return 'active';
    // If item has 0 delay, always active (longest prep item)
    if (item.fireDelaySeconds <= 0) return 'active';
    // If manually fired early
    if (this._manuallyFiredItems().has(item.selection.guid)) return 'active';

    // Determine start time: use course firedDate if available, else order-level stagger start
    const start = courseStartTime ?? this._staggerStartTime();
    if (start === null) return 'waiting';

    // Compute remaining countdown
    const elapsed = (this._now() - start) / 1000;
    if (elapsed >= item.fireDelaySeconds) return 'active';
    return 'countdown';
  }

  getItemCountdownSeconds(item: SelectionWithDelay, courseStartTime?: number): number {
    const start = courseStartTime ?? this._staggerStartTime();
    if (start === null) return item.fireDelaySeconds;
    const elapsed = (this._now() - start) / 1000;
    return Math.max(0, Math.round(item.fireDelaySeconds - elapsed));
  }

  getCourseStartTime(course: Course | undefined | null): number | null {
    if (!course) return this._staggerStartTime();  // No course = use order-level
    if (course.fireStatus !== 'FIRED' && course.fireStatus !== 'READY') return null;
    return course.firedDate?.getTime() ?? null;
  }

  formatCountdown(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  onFireItemNow(selGuid: string): void {
    this._manuallyFiredItems.update(set => {
      const updated = new Set(set);
      updated.add(selGuid);
      return updated;
    });
    this.fireItemNow.emit({ orderId: this.order().guid, selectionGuid: selGuid });
  }

  private detectStaggerStart(): void {
    // Detect when order enters IN_PREPARATION and start stagger timer (non-coursed orders)
    if (this._staggerStartTime() === null && this.order().guestOrderStatus === 'IN_PREPARATION') {
      // Use prepStartDate if available, else fall back to Date.now()
      const prepDate = this.order().timestamps.prepStartDate;
      this._staggerStartTime.set(prepDate ? prepDate.getTime() : Date.now());
    }
  }

  private detectOrderChange(): void {
    // Track order changes to reset stagger state
    if (this.order().guid !== this._lastOrderGuid) {
      this._lastOrderGuid = this.order().guid;
      this._staggerStartTime.set(null);
      this._manuallyFiredItems.set(new Set());
      this._autoFiredCourses.set(new Set());
      this._autoFireCountdowns.set(new Map());
      this._autoFireDelayBreakdowns.set(new Map());
    }
  }

  onRemakeItem(selectionGuid: string): void {
    if (this._remakeConfirmGuid() === selectionGuid) {
      // Second tap — emit
      const checkGuid = this.order().checks[0]?.guid;
      if (checkGuid) {
        this.remakeItem.emit({
          orderId: this.order().guid,
          checkGuid,
          selectionGuid,
        });
      }
      this._remakeConfirmGuid.set(null);
    } else {
      // First tap — enter confirm state
      this._remakeConfirmGuid.set(selectionGuid);
      // Auto-reset after 3 seconds
      setTimeout(() => {
        if (this._remakeConfirmGuid() === selectionGuid) {
          this._remakeConfirmGuid.set(null);
        }
      }, 3000);
    }
  }
}
