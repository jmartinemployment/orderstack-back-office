import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { LaborService } from '../../../services/labor';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { StaffManagementService } from '../../../services/staff-management';
import {
  StaffMember,
  Shift,
  StaffPortalTab,
  AvailabilityPreference,
  SwapRequest,
  StaffEarnings,
  ShiftPosition,
  Timecard,
  BreakType,
  TimeclockTab,
  TimecardEditType,
  PtoType,
  PtoRequest,
  PtoRequestStatus,
  PtoBalance,
  TeamMember,
} from '../../../models/index';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'os-staff-portal',
  imports: [CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './staff-portal.html',
  styleUrl: './staff-portal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffPortal {
  private readonly laborService = inject(LaborService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly staffManagementService = inject(StaffManagementService);

  // --- PIN login state ---
  private readonly _pinDigits = signal('');
  private readonly _pinError = signal<string | null>(null);
  private readonly _isValidating = signal(false);
  private readonly _loggedInStaff = signal<StaffMember | null>(null);

  readonly pinDigits = this._pinDigits.asReadonly();
  readonly pinError = this._pinError.asReadonly();
  readonly isValidating = this._isValidating.asReadonly();
  readonly loggedInStaff = this._loggedInStaff.asReadonly();
  readonly isLoggedIn = computed(() => !!this._loggedInStaff());

  readonly pinDots = computed(() => {
    const len = this._pinDigits().length;
    return Array.from({ length: 6 }, (_, i) => i < len);
  });

  // --- Tab state ---
  private readonly _activeTab = signal<StaffPortalTab>('schedule');
  readonly activeTab = this._activeTab.asReadonly();

  // --- Schedule state ---
  private readonly _weekOffset = signal(0);
  private readonly _myShifts = signal<Shift[]>([]);
  private readonly _earnings = signal<StaffEarnings | null>(null);
  private readonly _isLoadingShifts = signal(false);

  readonly myShifts = this._myShifts.asReadonly();
  readonly earnings = this._earnings.asReadonly();
  readonly isLoadingShifts = this._isLoadingShifts.asReadonly();

  readonly weekStart = computed(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + this._weekOffset() * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  readonly weekEnd = computed(() => {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() + 6);
    return d;
  });

  readonly weekLabel = computed(() => {
    const s = this.weekStart();
    const e = this.weekEnd();
    return `${s.getMonth() + 1}/${s.getDate()} – ${e.getMonth() + 1}/${e.getDate()}`;
  });

  readonly shiftsByDay = computed(() => {
    const map = new Map<string, Shift[]>();
    const start = new Date(this.weekStart());

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = this.formatDate(d);
      map.set(key, []);
    }

    for (const shift of this._myShifts()) {
      const existing = map.get(shift.date);
      if (existing) {
        existing.push(shift);
      }
    }

    return map;
  });

  readonly weekDays = computed(() => {
    return [...this.shiftsByDay().keys()];
  });

  readonly totalWeekHours = computed(() => {
    return this._myShifts().reduce((sum, s) => sum + this.getShiftDuration(s), 0);
  });

  // --- Availability state ---
  private readonly _availability = signal<AvailabilityPreference[]>([]);
  private readonly _editingAvailability = signal<Map<number, { available: boolean; start: string; end: string; notes: string }>>(new Map());
  private readonly _isEditingAvailability = signal(false);
  private readonly _isSavingAvailability = signal(false);

  readonly availability = this._availability.asReadonly();
  readonly isEditingAvailability = this._isEditingAvailability.asReadonly();
  readonly isSavingAvailability = this._isSavingAvailability.asReadonly();
  readonly editingAvailability = this._editingAvailability.asReadonly();
  readonly dayNames = DAY_NAMES;

  // --- Swap state ---
  private readonly _swapRequests = signal<SwapRequest[]>([]);
  private readonly _showSwapForm = signal(false);
  private readonly _swapShiftId = signal('');
  private readonly _swapReason = signal('');
  private readonly _isSubmittingSwap = signal(false);

  readonly swapRequests = this._swapRequests.asReadonly();
  readonly showSwapForm = this._showSwapForm.asReadonly();
  readonly swapShiftId = this._swapShiftId.asReadonly();
  readonly swapReason = this._swapReason.asReadonly();
  readonly isSubmittingSwap = this._isSubmittingSwap.asReadonly();

  readonly pendingIncoming = computed(() =>
    this._swapRequests().filter(r => r.status === 'pending' && r.targetPinId === this._loggedInStaff()?.id)
  );

  readonly myOutgoing = computed(() =>
    this._swapRequests().filter(r => r.requestorPinId === this._loggedInStaff()?.id)
  );

  readonly swappableShifts = computed(() => {
    const now = new Date();
    return this._myShifts().filter(s => new Date(s.date + 'T' + s.endTime) > now);
  });

  // --- Time Clock state ---
  private readonly _timeclockSubTab = signal<TimeclockTab>('clock');
  private readonly _activeTimecard = signal<Timecard | null>(null);
  private readonly _todayTimecards = signal<Timecard[]>([]);
  private readonly _breakTypes = signal<BreakType[]>([]);
  private readonly _isClockAction = signal(false);
  private readonly _showClockOutConfirm = signal(false);
  private readonly _declaredTips = signal<number | null>(null);
  private readonly _selectedJobTitle = signal<string | null>(null);

  readonly timeclockSubTab = this._timeclockSubTab.asReadonly();
  readonly activeTimecard = this._activeTimecard.asReadonly();
  readonly todayTimecards = this._todayTimecards.asReadonly();
  readonly breakTypes = this._breakTypes.asReadonly();
  readonly isClockAction = this._isClockAction.asReadonly();
  readonly showClockOutConfirm = this._showClockOutConfirm.asReadonly();
  readonly declaredTips = this._declaredTips.asReadonly();
  readonly selectedJobTitle = this._selectedJobTitle.asReadonly();

  // --- Job switch state ---
  private readonly _teamMemberRecord = signal<TeamMember | null>(null);
  private readonly _showJobSwitcher = signal(false);
  private readonly _switchJobTitle = signal<string | null>(null);

  readonly showJobSwitcher = this._showJobSwitcher.asReadonly();
  readonly switchJobTitle = this._switchJobTitle.asReadonly();
  readonly teamMemberRecord = this._teamMemberRecord.asReadonly();

  readonly canSwitchJob = computed(() => {
    const record = this._teamMemberRecord();
    return (record?.jobs?.length ?? 0) > 1 && this._activeTimecard() !== null;
  });

  readonly isClockedIn = computed(() => this._activeTimecard() !== null);

  readonly activeBreak = computed(() => {
    const tc = this._activeTimecard();
    if (!tc) return null;
    return tc.breaks.find(b => b.endAt === null) ?? null;
  });

  readonly isOnBreak = computed(() => this.activeBreak() !== null);

  readonly clockedInDuration = computed(() => {
    const tc = this._activeTimecard();
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

  readonly todayTotalHours = computed(() => {
    return this._todayTimecards().reduce((sum, tc) => sum + tc.totalPaidHours, 0);
  });

  readonly todayTotalBreakMinutes = computed(() => {
    return this._todayTimecards().reduce((sum, tc) => sum + tc.totalBreakMinutes, 0);
  });

  /** Shift summary computed for clock-out modal */
  readonly shiftSummary = computed(() => {
    const tc = this._activeTimecard();
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

    const paidBreakMinutes = tc.breaks.filter((b): b is typeof b & { endAt: string } => b.isPaid && b.endAt !== null && b.endAt !== undefined).reduce((sum, b) => {
      return sum + (b.actualMinutes ?? Math.floor((new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 60000));
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

  // --- Timecard Edit Request ---
  private readonly _showEditForm = signal(false);
  private readonly _editTimecardId = signal<string | null>(null);
  private readonly _editType = signal<TimecardEditType>('clock_in');
  private readonly _editOriginalValue = signal('');
  private readonly _editNewValue = signal('');
  private readonly _editReason = signal('');
  private readonly _isSubmittingEdit = signal(false);

  readonly showEditForm = this._showEditForm.asReadonly();
  readonly editTimecardId = this._editTimecardId.asReadonly();
  readonly editType = this._editType.asReadonly();
  readonly editOriginalValue = this._editOriginalValue.asReadonly();
  readonly editNewValue = this._editNewValue.asReadonly();
  readonly editReason = this._editReason.asReadonly();
  readonly isSubmittingEdit = this._isSubmittingEdit.asReadonly();

  readonly editTypeOptions: { value: TimecardEditType; label: string }[] = [
    { value: 'clock_in', label: 'Clock In Time' },
    { value: 'clock_out', label: 'Clock Out Time' },
    { value: 'break_start', label: 'Break Start' },
    { value: 'break_end', label: 'Break End' },
    { value: 'job_change', label: 'Job Title' },
  ];

  // --- Schedule enforcement ---
  private readonly _scheduleBlockMessage = signal<string | null>(null);
  private readonly _showManagerOverride = signal(false);
  private readonly _managerOverridePin = signal('');
  readonly scheduleBlockMessage = this._scheduleBlockMessage.asReadonly();
  readonly showManagerOverride = this._showManagerOverride.asReadonly();
  readonly managerOverridePin = this._managerOverridePin.asReadonly();

  // --- Auto clock-out timer ---
  private autoClockOutTimer: ReturnType<typeof setTimeout> | null = null;

  // --- Notifications ---
  private readonly _showNotifications = signal(false);
  readonly showNotifications = this._showNotifications.asReadonly();
  readonly notifications = this.laborService.notifications;

  readonly unreadCount = computed(() =>
    this.laborService.notifications().filter(n => !n.isRead).length
  );

  // --- PTO state ---
  private readonly _showPtoForm = signal(false);
  private readonly _ptoType = signal<PtoType>('vacation');
  private readonly _ptoStartDate = signal('');
  private readonly _ptoEndDate = signal('');
  private readonly _ptoHours = signal(8);
  private readonly _ptoReason = signal('');
  private readonly _isSubmittingPto = signal(false);
  private readonly _ptoBalances = signal<PtoBalance[]>([]);
  private readonly _myPtoRequests = signal<PtoRequest[]>([]);

  readonly showPtoForm = this._showPtoForm.asReadonly();
  readonly ptoType = this._ptoType.asReadonly();
  readonly ptoStartDate = this._ptoStartDate.asReadonly();
  readonly ptoEndDate = this._ptoEndDate.asReadonly();
  readonly ptoHours = this._ptoHours.asReadonly();
  readonly ptoReason = this._ptoReason.asReadonly();
  readonly isSubmittingPto = this._isSubmittingPto.asReadonly();
  readonly ptoBalances = this._ptoBalances.asReadonly();
  readonly myPtoRequests = this._myPtoRequests.asReadonly();

  readonly pendingPtoRequests = computed(() =>
    this._myPtoRequests().filter(r => r.status === 'pending')
  );

  // --- Error ---
  private readonly _error = signal<string | null>(null);
  readonly error = this._error.asReadonly();

  // === PIN Login ===

  onDigit(digit: string): void {
    const current = this._pinDigits();
    if (current.length >= 6) return;

    const updated = current + digit;
    this._pinDigits.set(updated);
    this._pinError.set(null);

    if (updated.length >= 4) {
      this.attemptLogin(updated);
    }
  }

  onBackspace(): void {
    this._pinDigits.update(d => d.slice(0, -1));
    this._pinError.set(null);
  }

  onClearPin(): void {
    this._pinDigits.set('');
    this._pinError.set(null);
  }

  private async attemptLogin(pin: string): Promise<void> {
    this._isValidating.set(true);
    this._pinError.set(null);

    const staff = await this.laborService.validateStaffPin(pin);

    if (staff) {
      this._loggedInStaff.set(staff);
      this._pinDigits.set('');
      await this.loadScheduleData();
      this.laborService.loadNotifications(staff.id);
      this.loadMyPtoRequests();
      this.loadTeamMemberRecord(staff.id);
    } else {
      this._pinError.set('Invalid PIN');
      this._pinDigits.set('');
    }

    this._isValidating.set(false);
  }

  logout(): void {
    this.clearAutoClockOutTimer();
    this._loggedInStaff.set(null);
    this._pinDigits.set('');
    this._activeTab.set('schedule');
    this._myShifts.set([]);
    this._earnings.set(null);
    this._availability.set([]);
    this._swapRequests.set([]);
  }

  // === Tab Navigation ===

  setTab(tab: StaffPortalTab): void {
    this._activeTab.set(tab);

    if (tab === 'schedule') {
      this.loadMyPtoRequests();
    } else if (tab === 'availability') {
      this.loadAvailability();
    } else if (tab === 'swaps') {
      this.loadSwapRequests();
    } else if (tab === 'timeclock') {
      this.loadTimeclockData();
    }
  }

  // === Schedule ===

  prevWeek(): void {
    this._weekOffset.update(o => o - 1);
    this.loadScheduleData();
  }

  nextWeek(): void {
    this._weekOffset.update(o => o + 1);
    this.loadScheduleData();
  }

  thisWeek(): void {
    this._weekOffset.set(0);
    this.loadScheduleData();
  }

  private async loadScheduleData(): Promise<void> {
    const staff = this._loggedInStaff();
    if (!staff) return;

    this._isLoadingShifts.set(true);

    const startStr = this.formatDate(this.weekStart());
    const endStr = this.formatDate(this.weekEnd());

    const [shifts, earnings] = await Promise.all([
      this.laborService.loadStaffShifts(staff.id, startStr, endStr),
      this.laborService.loadStaffEarnings(staff.id, startStr, endStr),
    ]);

    this._myShifts.set(shifts);
    this._earnings.set(earnings);
    this._isLoadingShifts.set(false);
  }

  // === Availability ===

  private async loadAvailability(): Promise<void> {
    const staff = this._loggedInStaff();
    if (!staff) return;

    const prefs = await this.laborService.loadAvailability(staff.id);
    this._availability.set(prefs);
  }

  startEditAvailability(): void {
    const map = new Map<number, { available: boolean; start: string; end: string; notes: string }>();

    for (let day = 0; day < 7; day++) {
      const existing = this._availability().find(a => a.dayOfWeek === day);
      map.set(day, {
        available: existing?.isAvailable ?? true,
        start: existing?.preferredStart ?? '09:00',
        end: existing?.preferredEnd ?? '22:00',
        notes: existing?.notes ?? '',
      });
    }

    this._editingAvailability.set(map);
    this._isEditingAvailability.set(true);
  }

  cancelEditAvailability(): void {
    this._isEditingAvailability.set(false);
  }

  toggleDayAvailability(day: number): void {
    this._editingAvailability.update(map => {
      const updated = new Map(map);
      const current = updated.get(day);
      if (current) {
        updated.set(day, { ...current, available: !current.available });
      }
      return updated;
    });
  }

  updateAvailabilityTime(day: number, field: 'start' | 'end', value: string): void {
    this._editingAvailability.update(map => {
      const updated = new Map(map);
      const current = updated.get(day);
      if (current) {
        updated.set(day, { ...current, [field]: value });
      }
      return updated;
    });
  }

  updateAvailabilityNotes(day: number, value: string): void {
    this._editingAvailability.update(map => {
      const updated = new Map(map);
      const current = updated.get(day);
      if (current) {
        updated.set(day, { ...current, notes: value });
      }
      return updated;
    });
  }

  getEditDay(day: number): { available: boolean; start: string; end: string; notes: string } {
    return this._editingAvailability().get(day) ?? { available: true, start: '09:00', end: '22:00', notes: '' };
  }

  async saveAvailability(): Promise<void> {
    const staff = this._loggedInStaff();
    if (!staff) return;

    this._isSavingAvailability.set(true);

    const prefs: Partial<AvailabilityPreference>[] = [];
    for (const [day, data] of this._editingAvailability()) {
      prefs.push({
        dayOfWeek: day,
        isAvailable: data.available,
        preferredStart: data.available ? data.start : null,
        preferredEnd: data.available ? data.end : null,
        notes: data.notes || null,
      });
    }

    const success = await this.laborService.saveAvailability(staff.id, prefs);
    if (success) {
      this._isEditingAvailability.set(false);
      await this.loadAvailability();
    } else {
      this._error.set('Failed to save availability');
    }

    this._isSavingAvailability.set(false);
  }

  // === Swap Requests ===

  private async loadSwapRequests(): Promise<void> {
    const staff = this._loggedInStaff();
    if (!staff) return;

    const requests = await this.laborService.loadSwapRequests(staff.id);
    this._swapRequests.set(requests);
  }

  openSwapForm(): void {
    this._swapShiftId.set('');
    this._swapReason.set('');
    this._showSwapForm.set(true);
  }

  closeSwapForm(): void {
    this._showSwapForm.set(false);
  }

  setSwapShiftId(id: string): void {
    this._swapShiftId.set(id);
  }

  setSwapReason(reason: string): void {
    this._swapReason.set(reason);
  }

  async submitSwapRequest(): Promise<void> {
    const staff = this._loggedInStaff();
    const shiftId = this._swapShiftId();
    const reason = this._swapReason().trim();
    if (!staff || !shiftId || !reason) return;

    this._isSubmittingSwap.set(true);

    const result = await this.laborService.createSwapRequest(shiftId, staff.id, reason);
    if (result) {
      this._showSwapForm.set(false);
      await this.loadSwapRequests();
    } else {
      this._error.set('Failed to submit swap request');
    }

    this._isSubmittingSwap.set(false);
  }

  async respondToSwap(requestId: string, action: 'approved' | 'rejected'): Promise<void> {
    const staff = this._loggedInStaff();
    if (!staff) return;

    const success = await this.laborService.respondToSwapRequest(requestId, action, staff.id);
    if (success) {
      await this.loadSwapRequests();
    }
  }

  // === Notifications ===

  toggleNotifications(): void {
    this._showNotifications.update(v => !v);
  }

  closeNotifications(): void {
    this._showNotifications.set(false);
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.laborService.markNotificationRead(notificationId);
  }

  async markAllRead(): Promise<void> {
    const unread = this.laborService.notifications().filter(n => !n.isRead);
    for (const n of unread) {
      await this.laborService.markNotificationRead(n.id);
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'schedule_published': return 'bi-calendar-check';
      case 'shift_changed': return 'bi-calendar-event';
      case 'swap_approved': return 'bi-check-circle';
      case 'swap_rejected': return 'bi-x-circle';
      case 'timecard_approved': return 'bi-clock-history';
      case 'timecard_rejected': return 'bi-clock';
      case 'announcement': return 'bi-megaphone';
      default: return 'bi-bell';
    }
  }

  // === PTO ===

  openPtoForm(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this._ptoType.set('vacation');
    this._ptoStartDate.set(this.formatDate(tomorrow));
    this._ptoEndDate.set(this.formatDate(tomorrow));
    this._ptoHours.set(8);
    this._ptoReason.set('');
    this._showPtoForm.set(true);
    this.loadPtoBalances();
  }

  closePtoForm(): void {
    this._showPtoForm.set(false);
  }

  setPtoType(type: PtoType): void {
    this._ptoType.set(type);
  }

  setPtoStartDate(date: string): void {
    this._ptoStartDate.set(date);
  }

  setPtoEndDate(date: string): void {
    this._ptoEndDate.set(date);
  }

  setPtoHours(hours: number): void {
    this._ptoHours.set(hours);
  }

  setPtoReason(reason: string): void {
    this._ptoReason.set(reason);
  }

  private async loadPtoBalances(): Promise<void> {
    const staff = this._loggedInStaff();
    if (!staff) return;

    await this.laborService.getPtoBalances(staff.id);
    this._ptoBalances.set(this.laborService.ptoBalances());
  }

  private async loadMyPtoRequests(): Promise<void> {
    const staff = this._loggedInStaff();
    if (!staff) return;

    await this.laborService.loadPtoRequests();
    const all = this.laborService.ptoRequests();
    this._myPtoRequests.set(all.filter(r => r.teamMemberId === staff.id));
  }

  async submitPtoRequest(): Promise<void> {
    const staff = this._loggedInStaff();
    const start = this._ptoStartDate();
    const end = this._ptoEndDate();
    const hours = this._ptoHours();
    if (!staff || !start || !end || hours <= 0) return;

    this._isSubmittingPto.set(true);
    this._error.set(null);

    const result = await this.laborService.submitPtoRequest({
      teamMemberId: staff.id,
      type: this._ptoType(),
      startDate: start,
      endDate: end,
      hoursRequested: hours,
      reason: this._ptoReason().trim() || undefined,
    });

    if (result) {
      this._showPtoForm.set(false);
      await this.loadMyPtoRequests();
    } else {
      this._error.set('Failed to submit time off request');
    }

    this._isSubmittingPto.set(false);
  }

  getPtoTypeLabel(type: PtoType): string {
    const labels: Record<PtoType, string> = {
      vacation: 'Vacation',
      sick: 'Sick',
      personal: 'Personal',
      holiday: 'Holiday',
    };
    return labels[type] ?? type;
  }

  getPtoStatusClass(status: PtoRequestStatus): string {
    if (status === 'approved') return 'status-approved';
    if (status === 'denied') return 'status-rejected';
    return 'status-pending';
  }

  // === Job Switching ===

  private async loadTeamMemberRecord(staffId: string): Promise<void> {
    await this.staffManagementService.loadTeamMembers();
    const members = this.staffManagementService.teamMembers();
    const match = members.find(m => m.id === staffId) ?? null;
    this._teamMemberRecord.set(match);
  }

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
    const tc = this._activeTimecard();
    const staff = this._loggedInStaff();
    const newJob = this._switchJobTitle();
    if (!tc || !staff || !newJob || this._isClockAction()) return;

    if (newJob === tc.jobTitle) {
      this._showJobSwitcher.set(false);
      return;
    }

    this._isClockAction.set(true);
    this._error.set(null);

    const clockedOut = await this.laborService.clockOutWithTips(tc.id);

    if (!clockedOut) {
      this._error.set('Failed to close current timecard');
      this._isClockAction.set(false);
      return;
    }

    const newTimecard = await this.laborService.clockInWithJob(staff.id, newJob);

    if (newTimecard) {
      this._activeTimecard.set(newTimecard);
      this._todayTimecards.update(tc => [...tc, newTimecard]);
      this._showJobSwitcher.set(false);
      this._switchJobTitle.set(null);
    } else {
      this._error.set('Clocked out but failed to clock in with new job');
    }

    this._isClockAction.set(false);
  }

  // === Helpers ===

  getShiftDuration(shift: Shift): number {
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    if (endMinutes <= startMinutes) {
      endMinutes += 1440;
    }
    return (endMinutes - startMinutes) / 60 - (shift.breakMinutes / 60);
  }

  formatTime(hhmm: string): string {
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  }

  formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  formatDayLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    return `${DAY_ABBR[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
  }

  getPositionColor(position: ShiftPosition): string {
    const colors: Record<ShiftPosition, string> = {
      server: '#4a90d9',
      cook: '#d94a4a',
      bartender: '#9b59b6',
      host: '#27ae60',
      manager: '#f39c12',
      expo: '#e67e22',
    };
    return colors[position] ?? '#6c757d';
  }

  getStatusClass(status: string): string {
    if (status === 'approved') return 'status-approved';
    if (status === 'rejected') return 'status-rejected';
    return 'status-pending';
  }

  // === Time Clock ===

  setTimeclockSubTab(tab: TimeclockTab): void {
    this._timeclockSubTab.set(tab);
  }

  private async loadTimeclockData(): Promise<void> {
    const staff = this._loggedInStaff();
    if (!staff) return;

    const today = this.formatDate(new Date());

    await Promise.all([
      this.laborService.loadTimecards({ teamMemberId: staff.id, startDate: today, endDate: today }),
      this.laborService.loadBreakTypes(),
    ]);

    this._todayTimecards.set(this.laborService.timecards());
    this._breakTypes.set(this.laborService.breakTypes());

    const open = this._todayTimecards().find(tc => tc.status === 'OPEN');
    this._activeTimecard.set(open ?? null);

    if (open) {
      this.startAutoClockOutTimer();
    }
  }

  setSelectedJobTitle(title: string): void {
    this._selectedJobTitle.set(title);
  }

  async doClockIn(): Promise<void> {
    const staff = this._loggedInStaff();
    if (!staff || this._isClockAction()) return;

    // Schedule enforcement check
    const tcSettings = this.settingsService.timeclockSettings();
    if (tcSettings.scheduleEnforcementEnabled) {
      const blockReason = this.checkScheduleEnforcement(staff.id, tcSettings.earlyClockInGraceMinutes);
      if (blockReason) {
        if (tcSettings.allowManagerOverride) {
          this._scheduleBlockMessage.set(blockReason);
          this._showManagerOverride.set(true);
          return;
        }
        this._error.set(blockReason);
        return;
      }
    }

    await this.executeClockIn();
  }

  private async executeClockIn(): Promise<void> {
    const staff = this._loggedInStaff();
    if (!staff) return;

    this._isClockAction.set(true);
    this._error.set(null);

    const jobTitle = this._selectedJobTitle() ?? undefined;
    const timecard = await this.laborService.clockInWithJob(staff.id, jobTitle);

    if (timecard) {
      this._activeTimecard.set(timecard);
      this._todayTimecards.update(tc => [...tc, timecard]);
      this._selectedJobTitle.set(null);
      this.startAutoClockOutTimer();
    } else {
      this._error.set('Failed to clock in');
    }

    this._isClockAction.set(false);
  }

  private checkScheduleEnforcement(staffId: string, graceMinutes: number): string | null {
    const now = new Date();
    const todayStr = this.formatDate(now);
    const todayShifts = this._myShifts().filter(s => s.date === todayStr);

    if (todayShifts.length === 0) {
      return 'No scheduled shift found for today. Clock-in requires a scheduled shift.';
    }

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const hasUpcoming = todayShifts.some(s => {
      const [h, m] = s.startTime.split(':').map(Number);
      const shiftStart = h * 60 + m;
      return nowMinutes >= (shiftStart - graceMinutes);
    });

    if (!hasUpcoming) {
      return `Too early to clock in. Your shift doesn't start for more than ${graceMinutes} minutes.`;
    }

    return null;
  }

  // Manager override for schedule enforcement
  setManagerOverridePin(pin: string): void {
    this._managerOverridePin.set(pin);
  }

  async submitManagerOverride(): Promise<void> {
    const pin = this._managerOverridePin();
    if (pin.length < 4) return;

    this._isClockAction.set(true);
    const staff = await this.laborService.validateStaffPin(pin);

    if (staff && (staff.role === 'manager' || staff.role === 'owner')) {
      this._showManagerOverride.set(false);
      this._scheduleBlockMessage.set(null);
      this._managerOverridePin.set('');
      await this.executeClockIn();
    } else {
      this._error.set('Invalid manager PIN');
      this._managerOverridePin.set('');
    }

    this._isClockAction.set(false);
  }

  cancelManagerOverride(): void {
    this._showManagerOverride.set(false);
    this._scheduleBlockMessage.set(null);
    this._managerOverridePin.set('');
  }

  // Auto clock-out timer
  private startAutoClockOutTimer(): void {
    this.clearAutoClockOutTimer();

    const tcSettings = this.settingsService.timeclockSettings();
    if (tcSettings.autoClockOutMode === 'never') return;

    const tc = this._activeTimecard();
    if (!tc) return;

    let targetMs: number;

    if (tcSettings.autoClockOutMode === 'after_shift_end') {
      const todayStr = this.formatDate(new Date());
      const todayShift = this._myShifts().find(s => s.date === todayStr);
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

  openClockOutConfirm(): void {
    this._declaredTips.set(null);
    this._showClockOutConfirm.set(true);
  }

  cancelClockOut(): void {
    this._showClockOutConfirm.set(false);
  }

  setDeclaredTips(amount: number | null): void {
    this._declaredTips.set(amount);
  }

  async doClockOut(): Promise<void> {
    const tc = this._activeTimecard();
    if (!tc || this._isClockAction()) return;

    this._isClockAction.set(true);
    this._error.set(null);

    const tips = this._declaredTips() ?? undefined;
    const success = await this.laborService.clockOutWithTips(tc.id, tips);

    if (success) {
      this.clearAutoClockOutTimer();
      this._activeTimecard.set(null);
      this._showClockOutConfirm.set(false);
      await this.loadTimeclockData();
    } else {
      this._error.set('Failed to clock out');
    }

    this._isClockAction.set(false);
  }

  async doStartBreak(breakTypeId: string): Promise<void> {
    const tc = this._activeTimecard();
    if (!tc || this._isClockAction()) return;

    this._isClockAction.set(true);
    this._error.set(null);

    const result = await this.laborService.startBreak(tc.id, breakTypeId);

    if (result) {
      this._activeTimecard.update(t => {
        if (!t) return t;
        return { ...t, breaks: [...t.breaks, result] };
      });
    } else {
      this._error.set('Failed to start break');
    }

    this._isClockAction.set(false);
  }

  async doEndBreak(): Promise<void> {
    const tc = this._activeTimecard();
    const brk = this.activeBreak();
    if (!tc || !brk || this._isClockAction()) return;

    this._isClockAction.set(true);
    this._error.set(null);

    const success = await this.laborService.endBreak(tc.id, brk.id);

    if (success) {
      this._activeTimecard.update(t => {
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

  formatTimecardTime(isoString: string): string {
    const d = new Date(isoString);
    const h = d.getHours();
    const m = d.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  }

  dismissError(): void {
    this._error.set(null);
  }

  // === Timecard Edit Requests ===

  openEditRequest(tc: Timecard): void {
    this._editTimecardId.set(tc.id);
    this._editType.set('clock_in');
    this._editOriginalValue.set(tc.clockInAt);
    this._editNewValue.set('');
    this._editReason.set('');
    this._showEditForm.set(true);
  }

  closeEditRequest(): void {
    this._showEditForm.set(false);
    this._editTimecardId.set(null);
  }

  setEditType(type: TimecardEditType): void {
    this._editType.set(type);
    // Update original value based on type
    const tc = this._todayTimecards().find(t => t.id === this._editTimecardId());
    if (tc) {
      if (type === 'clock_in') this._editOriginalValue.set(tc.clockInAt);
      else if (type === 'clock_out') this._editOriginalValue.set(tc.clockOutAt ?? 'N/A');
      else if (type === 'job_change') this._editOriginalValue.set(tc.jobTitle);
      else this._editOriginalValue.set('');
    }
  }

  setEditNewValue(value: string): void {
    this._editNewValue.set(value);
  }

  setEditReason(reason: string): void {
    this._editReason.set(reason);
  }

  async submitEditRequest(): Promise<void> {
    const timecardId = this._editTimecardId();
    const newValue = this._editNewValue().trim();
    const reason = this._editReason().trim();
    if (!timecardId || !newValue || !reason) return;

    this._isSubmittingEdit.set(true);
    this._error.set(null);

    const result = await this.laborService.requestTimecardEdit({
      timecardId,
      editType: this._editType(),
      originalValue: this._editOriginalValue(),
      newValue,
      reason,
    });

    if (result) {
      this._showEditForm.set(false);
      this._editTimecardId.set(null);
    } else {
      this._error.set('Failed to submit edit request');
    }

    this._isSubmittingEdit.set(false);
  }
}
