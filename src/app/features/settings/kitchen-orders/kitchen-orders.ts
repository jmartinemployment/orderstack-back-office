import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { AuthService } from '../../../services/auth';
import { CoursePacingMode } from '../../../models/index';

@Component({
  selector: 'os-kitchen-orders',
  imports: [FormsModule],
  templateUrl: './kitchen-orders.html',
  styleUrl: './kitchen-orders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitchenOrders implements OnInit {
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly authService = inject(AuthService);

  readonly isLoading = this.settingsService.isLoading;
  readonly isSaving = this.settingsService.isSaving;

  // Local form signals
  private readonly _approvalTimeoutHours = signal(24);
  private readonly _expoStationEnabled = signal(false);
  private readonly _coursePacingMode = signal<CoursePacingMode>('disabled');
  private readonly _targetCourseServeGapSeconds = signal(1200);
  private readonly _defaultCourseNames = signal<string[]>(['Appetizer', 'Entree', 'Dessert']);
  private readonly _autoFireFirstCourse = signal(true);
  private readonly _newCourseName = signal('');
  private readonly _orderThrottlingEnabled = signal(false);
  private readonly _maxActiveOrders = signal(18);
  private readonly _maxOverdueOrders = signal(6);
  private readonly _releaseActiveOrders = signal(14);
  private readonly _releaseOverdueOrders = signal(3);
  private readonly _maxHoldMinutes = signal(20);
  private readonly _allowRushThrottle = signal(false);
  private readonly _hasUnsavedChanges = signal(false);
  private readonly _showSaveSuccess = signal(false);

  readonly approvalTimeoutHours = this._approvalTimeoutHours.asReadonly();
  readonly expoStationEnabled = this._expoStationEnabled.asReadonly();
  readonly coursePacingMode = this._coursePacingMode.asReadonly();
  readonly targetCourseServeGapSeconds = this._targetCourseServeGapSeconds.asReadonly();
  readonly defaultCourseNames = this._defaultCourseNames.asReadonly();
  readonly autoFireFirstCourse = this._autoFireFirstCourse.asReadonly();
  readonly newCourseName = this._newCourseName.asReadonly();
  readonly orderThrottlingEnabled = this._orderThrottlingEnabled.asReadonly();
  readonly maxActiveOrders = this._maxActiveOrders.asReadonly();
  readonly maxOverdueOrders = this._maxOverdueOrders.asReadonly();
  readonly releaseActiveOrders = this._releaseActiveOrders.asReadonly();
  readonly releaseOverdueOrders = this._releaseOverdueOrders.asReadonly();
  readonly maxHoldMinutes = this._maxHoldMinutes.asReadonly();
  readonly allowRushThrottle = this._allowRushThrottle.asReadonly();
  readonly hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();
  readonly showSaveSuccess = this._showSaveSuccess.asReadonly();

  readonly coursePacingEnabled = computed(() => this._coursePacingMode() !== 'disabled');

  readonly pacingModeOptions: { value: CoursePacingMode; label: string; description: string }[] = [
    { value: 'disabled', label: 'Disabled', description: 'All items fire immediately when sent to kitchen.' },
    { value: 'server_fires', label: 'Server Fires', description: 'Server manually fires each course from their device.' },
    { value: 'auto_fire_timed', label: 'Auto-Fire Timed', description: 'Next course fires automatically after a delay when the previous course completes.' },
  ];

  readonly currentModeDescription = computed(() =>
    this.pacingModeOptions.find(o => o.value === this._coursePacingMode())?.description ?? ''
  );

  readonly targetCourseServeGapMinutes = computed(() =>
    Math.round(this._targetCourseServeGapSeconds() / 60)
  );

  readonly targetCourseGapDescription = computed(() => {
    const minutes = this.targetCourseServeGapMinutes();
    return `Target gap between completed course and next course landing: ~${minutes} minute${minutes === 1 ? '' : 's'}.`;
  });

  readonly throttlingDescription = computed(() => {
    if (this._orderThrottlingEnabled()) {
      return `Auto-hold triggers at ${this._maxActiveOrders()} active or ${this._maxOverdueOrders()} overdue tickets, and resumes below ${this._releaseActiveOrders()} active / ${this._releaseOverdueOrders()} overdue.`;
    }
    return 'Throttling is disabled. New tickets flow immediately to the kitchen queue.';
  });

  readonly timeoutDescription = computed(() => {
    const hours = this._approvalTimeoutHours();
    return `Catering orders awaiting approval will be auto-rejected after ${hours} hour${hours === 1 ? '' : 's'}.`;
  });

  readonly isManagerOrAbove = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'owner' || role === 'manager' || role === 'super_admin';
  });

  ngOnInit(): void {
    this.loadFromService();
  }

  private loadFromService(): void {
    const s = this.settingsService.aiSettings();
    this._approvalTimeoutHours.set(s.approvalTimeoutHours);
    this._expoStationEnabled.set(s.expoStationEnabled);
    this._coursePacingMode.set(s.coursePacingMode);
    this._targetCourseServeGapSeconds.set(this.normalizeTargetCourseServeGapSeconds(s.targetCourseServeGapSeconds));
    this._defaultCourseNames.set(s.defaultCourseNames?.length > 0 ? [...s.defaultCourseNames] : ['Appetizer', 'Entree', 'Dessert']);
    this._autoFireFirstCourse.set(s.autoFireFirstCourse ?? true);
    this._orderThrottlingEnabled.set(s.orderThrottlingEnabled);
    this._maxActiveOrders.set(this.normalizeMaxActiveOrders(s.maxActiveOrders));
    this._maxOverdueOrders.set(this.normalizeMaxOverdueOrders(s.maxOverdueOrders));
    this._releaseActiveOrders.set(this.normalizeReleaseActiveOrders(s.releaseActiveOrders, s.maxActiveOrders));
    this._releaseOverdueOrders.set(this.normalizeReleaseOverdueOrders(s.releaseOverdueOrders, s.maxOverdueOrders));
    this._maxHoldMinutes.set(this.normalizeMaxHoldMinutes(s.maxHoldMinutes));
    this._allowRushThrottle.set(s.allowRushThrottle);
    this._hasUnsavedChanges.set(false);
  }

  onApprovalTimeoutChange(event: Event): void {
    const val = Number.parseInt((event.target as HTMLInputElement).value, 10) || 24;
    this._approvalTimeoutHours.set(val);
    this._hasUnsavedChanges.set(true);
  }

  onExpoStationToggle(event: Event): void {
    this._expoStationEnabled.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  onCoursePacingModeChange(value: CoursePacingMode): void {
    this._coursePacingMode.set(value);
    this._hasUnsavedChanges.set(true);
  }

  onTargetCourseServeGapMinutesChange(event: Event): void {
    const rawMinutes = Number.parseInt((event.target as HTMLInputElement).value, 10);
    const minutes = Number.isFinite(rawMinutes) ? rawMinutes : 20;
    this._targetCourseServeGapSeconds.set(this.normalizeTargetCourseServeGapSeconds(minutes * 60));
    this._hasUnsavedChanges.set(true);
  }

  onNewCourseNameInput(event: Event): void {
    this._newCourseName.set((event.target as HTMLInputElement).value);
  }

  addCourseName(): void {
    const name = this._newCourseName().trim();
    if (!name) return;
    const current = this._defaultCourseNames();
    if (current.some(n => n.toLowerCase() === name.toLowerCase())) return;
    this._defaultCourseNames.set([...current, name]);
    this._newCourseName.set('');
    this._hasUnsavedChanges.set(true);
  }

  removeCourseName(index: number): void {
    this._defaultCourseNames.update(names => names.filter((_, i) => i !== index));
    this._hasUnsavedChanges.set(true);
  }

  moveCourseUp(index: number): void {
    if (index <= 0) return;
    this._defaultCourseNames.update(names => {
      const updated = [...names];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated;
    });
    this._hasUnsavedChanges.set(true);
  }

  moveCourseDown(index: number): void {
    const names = this._defaultCourseNames();
    if (index >= names.length - 1) return;
    this._defaultCourseNames.update(n => {
      const updated = [...n];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated;
    });
    this._hasUnsavedChanges.set(true);
  }

  onAutoFireFirstCourseToggle(event: Event): void {
    this._autoFireFirstCourse.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  onOrderThrottlingToggle(event: Event): void {
    this._orderThrottlingEnabled.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  onMaxActiveOrdersChange(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    const normalized = this.normalizeMaxActiveOrders(value);
    this._maxActiveOrders.set(normalized);
    this._releaseActiveOrders.set(this.normalizeReleaseActiveOrders(this._releaseActiveOrders(), normalized));
    this._hasUnsavedChanges.set(true);
  }

  onMaxOverdueOrdersChange(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    const normalized = this.normalizeMaxOverdueOrders(value);
    this._maxOverdueOrders.set(normalized);
    this._releaseOverdueOrders.set(this.normalizeReleaseOverdueOrders(this._releaseOverdueOrders(), normalized));
    this._hasUnsavedChanges.set(true);
  }

  onReleaseActiveOrdersChange(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    this._releaseActiveOrders.set(this.normalizeReleaseActiveOrders(value, this._maxActiveOrders()));
    this._hasUnsavedChanges.set(true);
  }

  onReleaseOverdueOrdersChange(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    this._releaseOverdueOrders.set(this.normalizeReleaseOverdueOrders(value, this._maxOverdueOrders()));
    this._hasUnsavedChanges.set(true);
  }

  onMaxHoldMinutesChange(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    this._maxHoldMinutes.set(this.normalizeMaxHoldMinutes(value));
    this._hasUnsavedChanges.set(true);
  }

  onAllowRushThrottleToggle(event: Event): void {
    this._allowRushThrottle.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  async save(): Promise<void> {
    const current = this.settingsService.aiSettings();
    await this.settingsService.saveAISettings({
      aiOrderApprovalEnabled: current.aiOrderApprovalEnabled,
      timeThresholdHours: current.timeThresholdHours,
      valueThresholdDollars: current.valueThresholdDollars,
      quantityThreshold: current.quantityThreshold,
      coursePacingMode: this._coursePacingMode(),
      targetCourseServeGapSeconds: this._targetCourseServeGapSeconds(),
      defaultCourseNames: this._defaultCourseNames(),
      autoFireFirstCourse: this._autoFireFirstCourse(),
      orderThrottlingEnabled: this._orderThrottlingEnabled(),
      maxActiveOrders: this._maxActiveOrders(),
      maxOverdueOrders: this._maxOverdueOrders(),
      releaseActiveOrders: this._releaseActiveOrders(),
      releaseOverdueOrders: this._releaseOverdueOrders(),
      maxHoldMinutes: this._maxHoldMinutes(),
      allowRushThrottle: this._allowRushThrottle(),
      expoStationEnabled: this._expoStationEnabled(),
      approvalTimeoutHours: this._approvalTimeoutHours(),
    });
    this._hasUnsavedChanges.set(false);
    this._showSaveSuccess.set(true);
    setTimeout(() => this._showSaveSuccess.set(false), 3000);
  }

  discard(): void {
    this.loadFromService();
  }

  private normalizeTargetCourseServeGapSeconds(value: number): number {
    const rounded = Math.round(value);
    return Math.max(300, Math.min(3600, rounded));
  }

  private normalizeMaxActiveOrders(value: number): number {
    return Math.max(2, Math.min(120, Math.round(value || 18)));
  }

  private normalizeMaxOverdueOrders(value: number): number {
    return Math.max(1, Math.min(50, Math.round(value || 6)));
  }

  private normalizeReleaseActiveOrders(value: number, maxActiveOrders: number): number {
    const cappedMax = Math.max(1, maxActiveOrders - 1);
    return Math.max(0, Math.min(cappedMax, Math.round(value || 14)));
  }

  private normalizeReleaseOverdueOrders(value: number, maxOverdueOrders: number): number {
    const cappedMax = Math.max(0, maxOverdueOrders - 1);
    return Math.max(0, Math.min(cappedMax, Math.round(value || 3)));
  }

  private normalizeMaxHoldMinutes(value: number): number {
    return Math.max(1, Math.min(180, Math.round(value || 20)));
  }
}
