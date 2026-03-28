import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { LaborService } from '../../../services/labor';
import { AuthService } from '../../../services/auth';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { BreakType } from '../../../models/labor.model';
import { TimeclockSettings, AutoClockOutMode } from '../../../models/settings.model';

@Component({
  selector: 'os-break-config',
  imports: [],
  templateUrl: './break-config.html',
  styleUrl: './break-config.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreakConfig {
  private readonly laborService = inject(LaborService);
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(RestaurantSettingsService);

  readonly breakTypes = this.laborService.breakTypes;
  readonly workweekConfig = this.laborService.workweekConfig;
  readonly error = this.laborService.error;

  // Break type form
  private readonly _showBreakTypeForm = signal(false);
  private readonly _editingBreakType = signal<BreakType | null>(null);
  private readonly _btName = signal('');
  private readonly _btExpectedMinutes = signal(15);
  private readonly _btIsPaid = signal(false);
  private readonly _btIsActive = signal(true);
  private readonly _isSaving = signal(false);
  private readonly _successMessage = signal<string | null>(null);
  private readonly _confirmDelete = signal<string | null>(null);

  readonly showBreakTypeForm = this._showBreakTypeForm.asReadonly();
  readonly editingBreakType = this._editingBreakType.asReadonly();
  readonly btName = this._btName.asReadonly();
  readonly btExpectedMinutes = this._btExpectedMinutes.asReadonly();
  readonly btIsPaid = this._btIsPaid.asReadonly();
  readonly btIsActive = this._btIsActive.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly successMessage = this._successMessage.asReadonly();
  readonly confirmDelete = this._confirmDelete.asReadonly();

  readonly activeBreakTypes = computed(() => this.breakTypes().filter(bt => bt.isActive));
  readonly inactiveBreakTypes = computed(() => this.breakTypes().filter(bt => !bt.isActive));

  // Workweek config form
  private readonly _wwStartDay = signal(1);
  private readonly _wwStartTime = signal('00:00');
  private readonly _wwOtThreshold = signal(40);
  private readonly _wwIsDirty = signal(false);

  readonly wwStartDay = this._wwStartDay.asReadonly();
  readonly wwStartTime = this._wwStartTime.asReadonly();
  readonly wwOtThreshold = this._wwOtThreshold.asReadonly();
  readonly wwIsDirty = this._wwIsDirty.asReadonly();

  readonly dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Schedule enforcement & auto clock-out signals
  private readonly _tcScheduleEnforcement = signal(false);
  private readonly _tcEarlyGraceMinutes = signal(15);
  private readonly _tcLateThresholdMinutes = signal(10);
  private readonly _tcAllowManagerOverride = signal(true);
  private readonly _tcAutoClockOutMode = signal<AutoClockOutMode>('never');
  private readonly _tcAutoClockOutDelay = signal(30);
  private readonly _tcBusinessDayCutoff = signal('02:00');
  private readonly _tcAlertOpenTimecards = signal(true);
  private readonly _tcIsDirty = signal(false);

  readonly tcScheduleEnforcement = this._tcScheduleEnforcement.asReadonly();
  readonly tcEarlyGraceMinutes = this._tcEarlyGraceMinutes.asReadonly();
  readonly tcLateThresholdMinutes = this._tcLateThresholdMinutes.asReadonly();
  readonly tcAllowManagerOverride = this._tcAllowManagerOverride.asReadonly();
  readonly tcAutoClockOutMode = this._tcAutoClockOutMode.asReadonly();
  readonly tcAutoClockOutDelay = this._tcAutoClockOutDelay.asReadonly();
  readonly tcBusinessDayCutoff = this._tcBusinessDayCutoff.asReadonly();
  readonly tcAlertOpenTimecards = this._tcAlertOpenTimecards.asReadonly();
  readonly tcIsDirty = this._tcIsDirty.asReadonly();

  private readonly _loaded = signal(false);

  constructor() {
    effect(() => {
      if (this.authService.selectedMerchantId() && !this._loaded()) {
        this._loaded.set(true);
        this.laborService.loadBreakTypes();
        this.laborService.loadWorkweekConfig();
      }
    });

    // Sync workweek config to form
    effect(() => {
      const config = this.workweekConfig();
      if (config) {
        this._wwStartDay.set(config.startDay);
        this._wwStartTime.set(config.startTime);
        this._wwOtThreshold.set(config.overtimeThresholdHours);
        this._wwIsDirty.set(false);
      }
    });

    // Sync timeclock settings to form
    effect(() => {
      const s = this.settingsService.timeclockSettings();
      this._tcScheduleEnforcement.set(s.scheduleEnforcementEnabled);
      this._tcEarlyGraceMinutes.set(s.earlyClockInGraceMinutes);
      this._tcLateThresholdMinutes.set(s.lateClockInThresholdMinutes);
      this._tcAllowManagerOverride.set(s.allowManagerOverride);
      this._tcAutoClockOutMode.set(s.autoClockOutMode);
      this._tcAutoClockOutDelay.set(s.autoClockOutDelayMinutes);
      this._tcBusinessDayCutoff.set(s.businessDayCutoffTime ?? '02:00');
      this._tcAlertOpenTimecards.set(s.alertOpenTimecards);
      this._tcIsDirty.set(false);
    });
  }

  // ============ Break Type CRUD ============

  openCreateBreakType(): void {
    this._editingBreakType.set(null);
    this._btName.set('');
    this._btExpectedMinutes.set(15);
    this._btIsPaid.set(false);
    this._btIsActive.set(true);
    this._showBreakTypeForm.set(true);
  }

  openEditBreakType(bt: BreakType): void {
    this._editingBreakType.set(bt);
    this._btName.set(bt.name);
    this._btExpectedMinutes.set(bt.expectedMinutes);
    this._btIsPaid.set(bt.isPaid);
    this._btIsActive.set(bt.isActive);
    this._showBreakTypeForm.set(true);
  }

  closeBreakTypeForm(): void {
    this._showBreakTypeForm.set(false);
    this._editingBreakType.set(null);
  }

  setBtField(field: 'name', value: string): void {
    this._btName.set(value);
  }

  setBtMinutes(value: number): void {
    this._btExpectedMinutes.set(Math.max(1, Math.min(120, value)));
  }

  toggleBtPaid(): void {
    this._btIsPaid.update(v => !v);
  }

  toggleBtActive(): void {
    this._btIsActive.update(v => !v);
  }

  async saveBreakType(): Promise<void> {
    const name = this._btName().trim();
    if (!name || this._isSaving()) return;

    this._isSaving.set(true);

    const editing = this._editingBreakType();
    if (editing) {
      const success = await this.laborService.updateBreakType(editing.id, {
        name,
        expectedMinutes: this._btExpectedMinutes(),
        isPaid: this._btIsPaid(),
        isActive: this._btIsActive(),
      });
      this._isSaving.set(false);
      if (success) {
        this.closeBreakTypeForm();
        this.showSuccess('Break type updated');
      }
    } else {
      const result = await this.laborService.createBreakType({
        name,
        expectedMinutes: this._btExpectedMinutes(),
        isPaid: this._btIsPaid(),
        isActive: this._btIsActive(),
      });
      this._isSaving.set(false);
      if (result) {
        this.closeBreakTypeForm();
        this.showSuccess('Break type created');
      }
    }
  }

  confirmDeleteBreakType(id: string): void {
    this._confirmDelete.set(id);
  }

  cancelDelete(): void {
    this._confirmDelete.set(null);
  }

  async toggleBreakTypeActive(bt: BreakType): Promise<void> {
    await this.laborService.updateBreakType(bt.id, { isActive: !bt.isActive });
  }

  // ============ Workweek Config ============

  setWwStartDay(day: number): void {
    this._wwStartDay.set(day);
    this._wwIsDirty.set(true);
  }

  setWwStartTime(time: string): void {
    this._wwStartTime.set(time);
    this._wwIsDirty.set(true);
  }

  setWwOtThreshold(hours: number): void {
    this._wwOtThreshold.set(Math.max(20, Math.min(60, hours)));
    this._wwIsDirty.set(true);
  }

  async saveWorkweekConfig(): Promise<void> {
    if (this._isSaving()) return;

    this._isSaving.set(true);
    const success = await this.laborService.updateWorkweekConfig({
      startDay: this._wwStartDay(),
      startTime: this._wwStartTime(),
      overtimeThresholdHours: this._wwOtThreshold(),
    });
    this._isSaving.set(false);

    if (success) {
      this._wwIsDirty.set(false);
      this.showSuccess('Workweek config saved');
    }
  }

  discardWorkweekChanges(): void {
    const config = this.workweekConfig();
    if (config) {
      this._wwStartDay.set(config.startDay);
      this._wwStartTime.set(config.startTime);
      this._wwOtThreshold.set(config.overtimeThresholdHours);
    }
    this._wwIsDirty.set(false);
  }

  // ============ Schedule Enforcement & Auto Clock-Out ============

  toggleScheduleEnforcement(): void {
    this._tcScheduleEnforcement.update(v => !v);
    this._tcIsDirty.set(true);
  }

  setTcEarlyGrace(minutes: number): void {
    this._tcEarlyGraceMinutes.set(Math.max(0, Math.min(60, minutes)));
    this._tcIsDirty.set(true);
  }

  setTcLateThreshold(minutes: number): void {
    this._tcLateThresholdMinutes.set(Math.max(1, Math.min(60, minutes)));
    this._tcIsDirty.set(true);
  }

  toggleManagerOverride(): void {
    this._tcAllowManagerOverride.update(v => !v);
    this._tcIsDirty.set(true);
  }

  setAutoClockOutMode(mode: string): void {
    const valid: AutoClockOutMode[] = ['after_shift_end', 'business_day_cutoff', 'never'];
    if (valid.includes(mode as AutoClockOutMode)) {
      this._tcAutoClockOutMode.set(mode as AutoClockOutMode);
      this._tcIsDirty.set(true);
    }
  }

  setAutoClockOutDelay(minutes: number): void {
    this._tcAutoClockOutDelay.set(Math.max(5, Math.min(120, minutes)));
    this._tcIsDirty.set(true);
  }

  setBusinessDayCutoff(time: string): void {
    this._tcBusinessDayCutoff.set(time);
    this._tcIsDirty.set(true);
  }

  toggleAlertOpenTimecards(): void {
    this._tcAlertOpenTimecards.update(v => !v);
    this._tcIsDirty.set(true);
  }

  async saveTimeclockSettings(): Promise<void> {
    if (this._isSaving()) return;

    this._isSaving.set(true);
    const settings: TimeclockSettings = {
      scheduleEnforcementEnabled: this._tcScheduleEnforcement(),
      earlyClockInGraceMinutes: this._tcEarlyGraceMinutes(),
      lateClockInThresholdMinutes: this._tcLateThresholdMinutes(),
      allowManagerOverride: this._tcAllowManagerOverride(),
      autoClockOutMode: this._tcAutoClockOutMode(),
      autoClockOutDelayMinutes: this._tcAutoClockOutDelay(),
      businessDayCutoffTime: this._tcBusinessDayCutoff(),
      alertOpenTimecards: this._tcAlertOpenTimecards(),
    };

    await this.settingsService.saveTimeclockSettings(settings);
    this._isSaving.set(false);
    this._tcIsDirty.set(false);
    this.showSuccess('Time clock settings saved');
  }

  discardTimeclockChanges(): void {
    const s = this.settingsService.timeclockSettings();
    this._tcScheduleEnforcement.set(s.scheduleEnforcementEnabled);
    this._tcEarlyGraceMinutes.set(s.earlyClockInGraceMinutes);
    this._tcLateThresholdMinutes.set(s.lateClockInThresholdMinutes);
    this._tcAllowManagerOverride.set(s.allowManagerOverride);
    this._tcAutoClockOutMode.set(s.autoClockOutMode);
    this._tcAutoClockOutDelay.set(s.autoClockOutDelayMinutes);
    this._tcBusinessDayCutoff.set(s.businessDayCutoffTime);
    this._tcAlertOpenTimecards.set(s.alertOpenTimecards);
    this._tcIsDirty.set(false);
  }

  private showSuccess(message: string): void {
    this._successMessage.set(message);
    setTimeout(() => this._successMessage.set(null), 3000);
  }
}
