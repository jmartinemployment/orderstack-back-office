import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  output,
  DestroyRef,
  afterNextRender,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { LaborService } from '../../services/labor';
import { RestaurantSettingsService } from '../../services/restaurant-settings';
import { BreakType, Shift } from '../../models/index';

@Component({
  selector: 'os-clock-out',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe],
  templateUrl: './clock-out.html',
  styleUrl: './clock-out.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClockOut {
  private readonly laborService = inject(LaborService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly clockedOut = output<void>();
  readonly userSwitched = output<void>();

  // --- Internal state ---
  private readonly _showClockOutModal = signal(false);
  private readonly _declaredTips = signal<number | null>(null);
  private readonly _isClockAction = signal(false);
  private readonly _showJobSwitcher = signal(false);
  private readonly _switchJobTitle = signal<string | null>(null);
  private readonly _error = signal<string | null>(null);
  private readonly _breakTypes = signal<BreakType[]>([]);
  private readonly _todayShifts = signal<Shift[]>([]);

  readonly showClockOutModal = this._showClockOutModal.asReadonly();
  readonly declaredTips = this._declaredTips.asReadonly();
  readonly isClockAction = this._isClockAction.asReadonly();
  readonly showJobSwitcher = this._showJobSwitcher.asReadonly();
  readonly switchJobTitle = this._switchJobTitle.asReadonly();
  readonly error = this._error.asReadonly();

  // Auto clock-out timer
  private autoClockOutTimer: ReturnType<typeof setTimeout> | null = null;

  // --- Read from LaborService ---
  readonly activeTimecard = this.laborService.activeTimecard;
  readonly activeTeamMember = this.laborService.activeTeamMember;
  readonly posSession = this.laborService.posSession;

  // --- Computeds ---

  readonly isClockedIn = computed(() => this.activeTimecard() !== null);

  readonly activeBreak = computed(() => {
    const tc = this.activeTimecard();
    if (!tc) return null;
    return tc.breaks.find(b => b.endAt === null) ?? null;
  });

  readonly isOnBreak = computed(() => this.activeBreak() !== null);

  readonly clockedInDuration = computed(() => {
    const tc = this.activeTimecard();
    if (!tc) return '';
    const start = new Date(tc.clockInAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  });

  readonly breakElapsedMinutes = computed(() => {
    const brk = this.activeBreak();
    if (!brk) return 0;
    const start = new Date(brk.startAt);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / 60000);
  });

  readonly shiftSummary = computed(() => {
    const tc = this.activeTimecard();
    if (!tc) return null;

    const clockIn = new Date(tc.clockInAt);
    const now = new Date();
    const totalMs = now.getTime() - clockIn.getTime();
    const totalMinutes = Math.floor(totalMs / 60000);
    const totalHours = totalMinutes / 60;

    const breakMinutes = tc.breaks.reduce((sum, b) => {
      if (b.endAt) {
        return sum + (b.actualMinutes ?? Math.floor((new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 60000));
      }
      return sum;
    }, 0);

    const paidBreakMinutes = tc.breaks.filter(b => b.isPaid && b.endAt).reduce((sum, b) => {
      const endTime = b.endAt ?? b.startAt;
      return sum + (b.actualMinutes ?? Math.floor((new Date(endTime).getTime() - new Date(b.startAt).getTime()) / 60000));
    }, 0);

    const unpaidBreakMinutes = breakMinutes - paidBreakMinutes;
    const netPaidMinutes = totalMinutes - unpaidBreakMinutes;
    const netPaidHours = netPaidMinutes / 60;

    return {
      clockInTime: this.formatTimecardTime(tc.clockInAt),
      clockOutTime: this.formatTimecardTime(now.toISOString()),
      totalHours,
      breakMinutes,
      paidBreakMinutes,
      unpaidBreakMinutes,
      netPaidHours,
      breaks: tc.breaks.filter(b => b.endAt !== null),
      jobTitle: tc.jobTitle,
      hourlyRate: tc.hourlyRate,
      isTipEligible: tc.isTipEligible,
      estimatedPay: netPaidHours * (tc.hourlyRate / 100),
    };
  });

  readonly memberJobs = computed(() => {
    const member = this.activeTeamMember();
    return member?.jobs ?? [];
  });

  readonly canSwitchJob = computed(() => {
    const member = this.activeTeamMember();
    return (member?.jobs?.length ?? 0) > 1 && this.isClockedIn();
  });

  readonly activeBreakTypes = computed(() =>
    this._breakTypes().filter(bt => bt.isActive)
  );

  constructor() {
    afterNextRender(() => {
      this.loadBreakTypes();
      this.startAutoClockOutTimer();
    });

    this.destroyRef.onDestroy(() => {
      this.clearAutoClockOutTimer();
    });
  }

  // === Break Types ===

  private async loadBreakTypes(): Promise<void> {
    await this.laborService.loadBreakTypes();
    this._breakTypes.set(this.laborService.breakTypes());
  }

  // === Auto Clock-Out Timer ===

  private startAutoClockOutTimer(): void {
    this.clearAutoClockOutTimer();

    const tcSettings = this.settingsService.timeclockSettings();
    if (tcSettings.autoClockOutMode === 'never') return;

    const tc = this.activeTimecard();
    if (!tc) return;

    let targetMs: number;

    if (tcSettings.autoClockOutMode === 'after_shift_end') {
      const todayShifts = this._todayShifts();
      const todayShift = todayShifts.length > 0 ? todayShifts[0] : null;
      if (!todayShift) return;

      const [endH, endM] = todayShift.endTime.split(':').map(Number);
      const shiftEnd = new Date();
      shiftEnd.setHours(endH, endM, 0, 0);
      targetMs = shiftEnd.getTime() + (tcSettings.autoClockOutDelayMinutes * 60000) - Date.now();
    } else {
      // business_day_cutoff
      const [cutH, cutM] = tcSettings.businessDayCutoffTime.split(':').map(Number);
      const cutoff = new Date();
      cutoff.setHours(cutH, cutM, 0, 0);
      if (cutoff.getTime() <= Date.now()) {
        cutoff.setDate(cutoff.getDate() + 1);
      }
      targetMs = cutoff.getTime() - Date.now();
    }

    if (targetMs > 0) {
      this.autoClockOutTimer = setTimeout(() => {
        this.doClockOut();
      }, targetMs);
    }
  }

  private clearAutoClockOutTimer(): void {
    if (this.autoClockOutTimer !== null) {
      clearTimeout(this.autoClockOutTimer);
      this.autoClockOutTimer = null;
    }
  }

  // === Clock-Out Flow ===

  openClockOutModal(): void {
    this._declaredTips.set(null);
    this._showClockOutModal.set(true);
  }

  cancelClockOut(): void {
    this._showClockOutModal.set(false);
  }

  setDeclaredTips(amount: number | null): void {
    this._declaredTips.set(amount);
  }

  async doClockOut(): Promise<void> {
    const tc = this.activeTimecard();
    if (!tc || this._isClockAction()) return;

    this._isClockAction.set(true);
    this._error.set(null);

    const tips = this._declaredTips() ?? undefined;
    const success = await this.laborService.clockOutWithTips(tc.id, tips);

    if (success) {
      this.laborService.setActiveTimecard(null);
      this._showClockOutModal.set(false);
      this.clearAutoClockOutTimer();
      this.laborService.clearPosSession();
      this.clockedOut.emit();
    } else {
      this._error.set('Failed to clock out');
    }

    this._isClockAction.set(false);
  }

  // === Break Management ===

  async doStartBreak(breakTypeId: string): Promise<void> {
    const tc = this.activeTimecard();
    if (!tc || this._isClockAction()) return;

    this._isClockAction.set(true);
    this._error.set(null);

    const result = await this.laborService.startBreak(tc.id, breakTypeId);

    if (result) {
      this.laborService.updateActiveTimecard(t => {
        if (!t) return t;
        return { ...t, breaks: [...t.breaks, result] };
      });
    } else {
      this._error.set('Failed to start break');
    }

    this._isClockAction.set(false);
  }

  async doEndBreak(): Promise<void> {
    const tc = this.activeTimecard();
    const brk = this.activeBreak();
    if (!tc || !brk || this._isClockAction()) return;

    this._isClockAction.set(true);
    this._error.set(null);

    const success = await this.laborService.endBreak(tc.id, brk.id);

    if (success) {
      this.laborService.updateActiveTimecard(t => {
        if (!t) return t;
        return {
          ...t,
          breaks: t.breaks.map(b => b.id === brk.id ? { ...b, endAt: new Date().toISOString() } : b),
        };
      });
    } else {
      this._error.set('Failed to end break');
    }

    this._isClockAction.set(false);
  }

  // === Job Switching ===

  openJobSwitcher(): void {
    this._switchJobTitle.set(null);
    this._showJobSwitcher.set(true);
  }

  cancelJobSwitch(): void {
    this._showJobSwitcher.set(false);
    this._switchJobTitle.set(null);
  }

  selectSwitchJob(jobTitle: string): void {
    this._switchJobTitle.set(jobTitle);
  }

  async confirmSwitchJob(): Promise<void> {
    const tc = this.activeTimecard();
    const member = this.activeTeamMember();
    const session = this.posSession();
    const newJob = this._switchJobTitle();
    if (!tc || !member || !session || !newJob || this._isClockAction()) return;

    if (newJob === tc.jobTitle) {
      this._showJobSwitcher.set(false);
      return;
    }

    this._isClockAction.set(true);
    this._error.set(null);

    const clockedOutOk = await this.laborService.clockOutWithTips(tc.id);

    if (!clockedOutOk) {
      this._error.set('Failed to close current timecard');
      this._isClockAction.set(false);
      return;
    }

    const newTimecard = await this.laborService.clockInWithJob(session.teamMemberId, newJob);

    if (newTimecard) {
      this.laborService.setActiveTimecard(newTimecard);
      this._showJobSwitcher.set(false);
      this._switchJobTitle.set(null);
    } else {
      this._error.set('Clocked out but failed to clock in with new job');
    }

    this._isClockAction.set(false);
  }

  // === Switch User ===

  switchUser(): void {
    this.clearAutoClockOutTimer();
    this.laborService.clearPosSession();
    this.userSwitched.emit();
  }

  // === Helpers ===

  dismissError(): void {
    this._error.set(null);
  }

  getInitials(name: string): string {
    const cleaned = name.replaceAll(/\s*\([^)]*\)/g, '').trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    return parts.map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getAvatarColor(name: string): string {
    const colors = ['#7c5cfc', '#e74c3c', '#2ecc71', '#f39c12', '#3498db', '#9b59b6', '#1abc9c', '#e67e22'];
    let hash = 0;
    for (const char of name) {
      hash = (char.codePointAt(0) ?? 0) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  formatTimecardTime(isoString: string): string {
    const d = new Date(isoString);
    const h = d.getHours();
    const m = d.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  }
}
