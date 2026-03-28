import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  StaffMember,
  Shift,
  ShiftFormData,
  TimeEntry,
  LaborReport,
  LaborRecommendation,
  LaborTarget,
  SwapRequest,
  AvailabilityPreference,
  StaffEarnings,
  Timecard,
  TimecardBreak,
  BreakType,
  TimecardEdit,
  TimecardEditStatus,
  WorkweekConfig,
  PosSession,
  ScheduleTemplate,
  LiveLaborData,
  StaffNotification,
  PayrollPeriod,
  CommissionRule,
  CommissionCalculation,
  PtoPolicy,
  PtoRequest,
  PtoRequestStatus,
  PtoBalance,
  LaborForecast,
  ComplianceAlert,
  ComplianceSummary,
  TeamMember,
} from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LaborService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  // --- SessionStorage persistence for active shift state ---
  private static readonly SESSION_KEY_TIMECARD = 'os-active-timecard';
  private static readonly SESSION_KEY_MEMBER = 'os-active-member';
  private static readonly SESSION_KEY_POS_SESSION = 'os-pos-session';

  private static rehydrate<T>(key: string): T | null {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : null;
    } catch {
      return null;
    }
  }

  private static persist(key: string, value: unknown): void {
    if (value === null) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  }

  // --- Core signals ---
  private readonly _staffMembers = signal<StaffMember[]>([]);
  private readonly _shifts = signal<Shift[]>([]);
  private readonly _activeClocks = signal<TimeEntry[]>([]);
  private readonly _laborReport = signal<LaborReport | null>(null);
  private readonly _recommendations = signal<LaborRecommendation[]>([]);
  private readonly _laborTargets = signal<LaborTarget[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly staffMembers = this._staffMembers.asReadonly();
  readonly shifts = this._shifts.asReadonly();
  readonly activeClocks = this._activeClocks.asReadonly();
  readonly laborReport = this._laborReport.asReadonly();
  readonly recommendations = this._recommendations.asReadonly();
  readonly laborTargets = this._laborTargets.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // --- Timecard signals ---
  private readonly _timecards = signal<Timecard[]>([]);
  private readonly _breakTypes = signal<BreakType[]>([]);
  private readonly _workweekConfig = signal<WorkweekConfig | null>(null);
  private readonly _posSession = signal<PosSession | null>(
    LaborService.rehydrate<PosSession>(LaborService.SESSION_KEY_POS_SESSION)
  );
  private readonly _timecardEdits = signal<TimecardEdit[]>([]);

  readonly timecards = this._timecards.asReadonly();
  readonly breakTypes = this._breakTypes.asReadonly();
  readonly workweekConfig = this._workweekConfig.asReadonly();
  readonly posSession = this._posSession.asReadonly();
  readonly timecardEdits = this._timecardEdits.asReadonly();

  // --- Active shift signals (shared by clock-out component) ---
  // Rehydrated from sessionStorage so they survive page refreshes / full navigations
  private readonly _activeTimecard = signal<Timecard | null>(
    LaborService.rehydrate<Timecard>(LaborService.SESSION_KEY_TIMECARD)
  );
  private readonly _activeTeamMember = signal<TeamMember | null>(
    LaborService.rehydrate<TeamMember>(LaborService.SESSION_KEY_MEMBER)
  );

  readonly activeTimecard = this._activeTimecard.asReadonly();
  readonly activeTeamMember = this._activeTeamMember.asReadonly();

  setActiveTimecard(tc: Timecard | null): void {
    this._activeTimecard.set(tc);
    LaborService.persist(LaborService.SESSION_KEY_TIMECARD, tc);
  }

  updateActiveTimecard(fn: (tc: Timecard | null) => Timecard | null): void {
    this._activeTimecard.update(fn);
    LaborService.persist(LaborService.SESSION_KEY_TIMECARD, this._activeTimecard());
  }

  setActiveTeamMember(member: TeamMember | null): void {
    this._activeTeamMember.set(member);
    LaborService.persist(LaborService.SESSION_KEY_MEMBER, member);
  }

  // --- Schedule Template signals ---
  private readonly _scheduleTemplates = signal<ScheduleTemplate[]>([]);
  readonly scheduleTemplates = this._scheduleTemplates.asReadonly();

  // --- Live Labor signals ---
  private readonly _liveLabor = signal<LiveLaborData | null>(null);
  readonly liveLabor = this._liveLabor.asReadonly();

  // --- Notification signals ---
  private readonly _notifications = signal<StaffNotification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  // --- Payroll signals ---
  private readonly _payrollPeriods = signal<PayrollPeriod[]>([]);
  private readonly _selectedPayroll = signal<PayrollPeriod | null>(null);
  readonly payrollPeriods = this._payrollPeriods.asReadonly();
  readonly selectedPayroll = this._selectedPayroll.asReadonly();

  // --- Commission signals ---
  private readonly _commissionRules = signal<CommissionRule[]>([]);
  private readonly _commissionCalculations = signal<CommissionCalculation[]>([]);
  readonly commissionRules = this._commissionRules.asReadonly();
  readonly commissionCalculations = this._commissionCalculations.asReadonly();

  // --- PTO signals ---
  private readonly _ptoPolicies = signal<PtoPolicy[]>([]);
  private readonly _ptoRequests = signal<PtoRequest[]>([]);
  private readonly _ptoBalances = signal<PtoBalance[]>([]);
  readonly ptoPolicies = this._ptoPolicies.asReadonly();
  readonly ptoRequests = this._ptoRequests.asReadonly();
  readonly ptoBalances = this._ptoBalances.asReadonly();

  // --- Labor Forecasting signals ---
  private readonly _laborForecast = signal<LaborForecast | null>(null);
  readonly laborForecast = this._laborForecast.asReadonly();

  // --- Compliance signals ---
  private readonly _complianceAlerts = signal<ComplianceAlert[]>([]);
  private readonly _complianceSummary = signal<ComplianceSummary | null>(null);
  readonly complianceAlerts = this._complianceAlerts.asReadonly();
  readonly complianceSummary = this._complianceSummary.asReadonly();

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  async loadStaffMembers(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<StaffMember[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/pins`
        )
      );
      this._staffMembers.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load staff members';
      this._error.set(message);
    }
  }

  async loadShifts(startDate: string, endDate: string): Promise<void> {
    if (!this.merchantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<Shift[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/shifts`,
          { params: { startDate, endDate } }
        )
      );
      this._shifts.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load shifts';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async createShift(data: ShiftFormData): Promise<Shift | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<Shift>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/shifts`,
          data
        )
      );
      this._shifts.update(s => [...s, result]);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create shift';
      this._error.set(message);
      return null;
    }
  }

  async updateShift(shiftId: string, data: Partial<ShiftFormData>): Promise<Shift | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<Shift>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/shifts/${shiftId}`,
          data
        )
      );
      this._shifts.update(s => s.map(sh => sh.id === shiftId ? result : sh));
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update shift';
      this._error.set(message);
      return null;
    }
  }

  async deleteShift(shiftId: string): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/shifts/${shiftId}`
        )
      );
      this._shifts.update(s => s.filter(sh => sh.id !== shiftId));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete shift';
      this._error.set(message);
      return false;
    }
  }

  async publishWeek(weekStartDate: string): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/shifts/publish`,
          { weekStartDate }
        )
      );
      this._shifts.update(s => s.map(sh => ({ ...sh, isPublished: true })));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to publish week';
      this._error.set(message);
      return false;
    }
  }

  async clockIn(staffPinId: string, shiftId?: string): Promise<TimeEntry | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<TimeEntry>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/clock-in`,
          { staffPinId, shiftId }
        )
      );
      this._activeClocks.update(c => [...c, result]);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to clock in';
      this._error.set(message);
      return null;
    }
  }

  async clockOut(timeEntryId: string, breakMinutes?: number): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/clock-out/${timeEntryId}`,
          { breakMinutes }
        )
      );
      this._activeClocks.update(c => c.filter(e => e.id !== timeEntryId));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to clock out';
      this._error.set(message);
      return false;
    }
  }

  async loadActiveClocks(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<TimeEntry[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/active-clocks`
        )
      );
      this._activeClocks.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load active clocks';
      this._error.set(message);
    }
  }

  async loadLaborReport(startDate: string, endDate: string): Promise<void> {
    if (!this.merchantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<LaborReport>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/labor-report`,
          { params: { startDate, endDate } }
        )
      );
      this._laborReport.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load labor report';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadRecommendations(): Promise<void> {
    if (!this.merchantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<LaborRecommendation[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/labor-recommendations`
        )
      );
      this._recommendations.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load recommendations';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadTargets(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<LaborTarget[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/labor-targets`
        )
      );
      // Cast targetPercent from Prisma Decimal (string) to number
      this._laborTargets.set(data.map(t => ({
        ...t,
        targetPercent: Number(t.targetPercent),
        targetCost: t.targetCost === null ? null : Number(t.targetCost),
      })));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load labor targets';
      this._error.set(message);
    }
  }

  // --- Staff Portal methods ---

  async validateStaffPin(pin: string): Promise<StaffMember | null> {
    if (!this.merchantId) return null;

    try {
      const result = await firstValueFrom(
        this.http.post<{ valid: boolean; staffPinId: string; name: string; role: string; permissions?: Record<string, boolean> }>(
          `${this.apiUrl}/merchant/${this.merchantId}/auth/validate-pin`,
          { pin }
        )
      );
      if (result.valid) {
        return { id: result.staffPinId, name: result.name, role: result.role, teamMemberId: null, permissions: result.permissions };
      }
      return null;
    } catch {
      return null;
    }
  }

  async loadStaffShifts(staffPinId: string, startDate: string, endDate: string): Promise<Shift[]> {
    if (!this.merchantId) return [];

    try {
      const data = await firstValueFrom(
        this.http.get<Shift[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/shifts`,
          { params: { startDate, endDate, staffPinId } }
        )
      );
      return data;
    } catch {
      return [];
    }
  }

  async loadStaffEarnings(staffPinId: string, startDate: string, endDate: string): Promise<StaffEarnings | null> {
    if (!this.merchantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<StaffEarnings>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/${staffPinId}/earnings`,
          { params: { startDate, endDate } }
        )
      );
    } catch {
      return null;
    }
  }

  async loadAvailability(staffPinId: string): Promise<AvailabilityPreference[]> {
    if (!this.merchantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<AvailabilityPreference[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/${staffPinId}/availability`
        )
      );
    } catch {
      return [];
    }
  }

  async saveAvailability(staffPinId: string, prefs: Partial<AvailabilityPreference>[]): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.put(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/${staffPinId}/availability`,
          { preferences: prefs }
        )
      );
      return true;
    } catch {
      return false;
    }
  }

  async loadSwapRequests(staffPinId: string): Promise<SwapRequest[]> {
    if (!this.merchantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<SwapRequest[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/${staffPinId}/swap-requests`
        )
      );
    } catch {
      return [];
    }
  }

  async createSwapRequest(shiftId: string, requestorPinId: string, reason: string): Promise<SwapRequest | null> {
    if (!this.merchantId) return null;

    try {
      return await firstValueFrom(
        this.http.post<SwapRequest>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/swap-requests`,
          { shiftId, requestorPinId, reason }
        )
      );
    } catch {
      return null;
    }
  }

  async respondToSwapRequest(requestId: string, action: 'approved' | 'rejected', respondedBy: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/swap-requests/${requestId}`,
          { status: action, respondedBy }
        )
      );
      return true;
    } catch {
      return false;
    }
  }

  async setTarget(dayOfWeek: number, targetPercent: number, targetCost?: number): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.put(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/labor-targets`,
          { dayOfWeek, targetPercent, targetCost }
        )
      );
      await this.loadTargets();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to set labor target';
      this._error.set(message);
      return false;
    }
  }

  // ============ Timecard Methods ============

  async loadTimecards(filters?: { status?: string; startDate?: string; endDate?: string; teamMemberId?: string }): Promise<void> {
    if (!this.merchantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const params: Record<string, string> = {};
      if (filters?.status) params['status'] = filters.status;
      if (filters?.startDate) params['startDate'] = filters.startDate;
      if (filters?.endDate) params['endDate'] = filters.endDate;
      if (filters?.teamMemberId) params['teamMemberId'] = filters.teamMemberId;

      const data = await firstValueFrom(
        this.http.get<Timecard[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/timecards`,
          { params }
        )
      );
      this._timecards.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._timecards.set([]);
      } else {
        this._error.set(err instanceof Error ? err.message : 'Failed to load timecards');
      }
    } finally {
      this._isLoading.set(false);
    }
  }

  async getTimecard(id: string): Promise<Timecard | null> {
    if (!this.merchantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<Timecard>(
          `${this.apiUrl}/merchant/${this.merchantId}/timecards/${id}`
        )
      );
    } catch {
      return null;
    }
  }

  async clockInWithJob(staffPinId: string, jobTitle?: string): Promise<Timecard | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const body: Record<string, string> = { staffPinId };
      if (jobTitle) body['jobTitle'] = jobTitle;

      const raw = await firstValueFrom(
        this.http.post<Record<string, unknown>>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/clock-in`,
          body
        )
      );
      const result: Timecard = {
        id: raw['id'] as string,
        merchantId: this.merchantId,
        locationId: null,
        teamMemberId: raw['staffPinId'] as string,
        teamMemberName: raw['staffName'] as string ?? '',
        clockInAt: raw['clockIn'] as string,
        clockOutAt: null,
        status: 'OPEN',
        jobTitle: jobTitle ?? '',
        hourlyRate: 0,
        isTipEligible: false,
        declaredCashTips: null,
        regularHours: 0,
        overtimeHours: 0,
        totalPaidHours: 0,
        totalBreakMinutes: 0,
        breaks: [],
        deviceId: null,
        createdBy: null,
        modifiedBy: null,
        modificationReason: null,
      };
      this._timecards.update(tc => [...tc, result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to clock in');
      return null;
    }
  }

  async clockOutWithTips(timecardId: string, declaredCashTips?: number): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      const body: Record<string, unknown> = { status: 'CLOSED' };
      if (declaredCashTips !== undefined) body['declaredCashTips'] = declaredCashTips;

      const result = await firstValueFrom(
        this.http.patch<Timecard>(
          `${this.apiUrl}/merchant/${this.merchantId}/timecards/${timecardId}`,
          body
        )
      );
      this._timecards.update(tc => tc.map(t => t.id === timecardId ? result : t));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to clock out');
      return false;
    }
  }

  async startBreak(timecardId: string, breakTypeId: string): Promise<TimecardBreak | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<TimecardBreak>(
          `${this.apiUrl}/merchant/${this.merchantId}/timecards/${timecardId}/breaks`,
          { breakTypeId }
        )
      );
      this._timecards.update(tc => tc.map(t => {
        if (t.id === timecardId) {
          return { ...t, breaks: [...t.breaks, result] };
        }
        return t;
      }));
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to start break');
      return null;
    }
  }

  async endBreak(timecardId: string, breakId: string): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<TimecardBreak>(
          `${this.apiUrl}/merchant/${this.merchantId}/timecards/${timecardId}/breaks/${breakId}`,
          {}
        )
      );
      this._timecards.update(tc => tc.map(t => {
        if (t.id === timecardId) {
          return { ...t, breaks: t.breaks.map(b => b.id === breakId ? result : b) };
        }
        return t;
      }));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to end break');
      return false;
    }
  }

  // ============ Break Types ============

  async loadBreakTypes(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<BreakType[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/break-types`
        )
      );
      this._breakTypes.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load break types');
    }
  }

  async createBreakType(data: Omit<BreakType, 'id' | 'merchantId'>): Promise<BreakType | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<BreakType>(
          `${this.apiUrl}/merchant/${this.merchantId}/break-types`,
          data
        )
      );
      this._breakTypes.update(bt => [...bt, result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to create break type');
      return null;
    }
  }

  async updateBreakType(id: string, data: Partial<BreakType>): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<BreakType>(
          `${this.apiUrl}/merchant/${this.merchantId}/break-types/${id}`,
          data
        )
      );
      this._breakTypes.update(bt => bt.map(b => b.id === id ? result : b));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to update break type');
      return false;
    }
  }

  // ============ Timecard Edits ============

  async loadTimecardEdits(filters?: { status?: string; teamMemberId?: string }): Promise<void> {
    if (!this.merchantId) return;

    try {
      const params: Record<string, string> = {};
      if (filters?.status) params['status'] = filters.status;
      if (filters?.teamMemberId) params['teamMemberId'] = filters.teamMemberId;

      const data = await firstValueFrom(
        this.http.get<TimecardEdit[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/timecard-edits`,
          { params }
        )
      );
      this._timecardEdits.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._timecardEdits.set([]);
      } else {
        this._error.set(err instanceof Error ? err.message : 'Failed to load timecard edits');
      }
    }
  }

  async requestTimecardEdit(data: { timecardId: string; editType: string; originalValue: string; newValue: string; reason: string }): Promise<TimecardEdit | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<TimecardEdit>(
          `${this.apiUrl}/merchant/${this.merchantId}/timecard-edits`,
          data
        )
      );
      this._timecardEdits.update(edits => [...edits, result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to request timecard edit');
      return null;
    }
  }

  async resolveTimecardEdit(id: string, status: TimecardEditStatus): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<TimecardEdit>(
          `${this.apiUrl}/merchant/${this.merchantId}/timecard-edits/${id}`,
          { status }
        )
      );
      this._timecardEdits.update(edits => edits.map(e => e.id === id ? result : e));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to resolve timecard edit');
      return false;
    }
  }

  // ============ Workweek Config ============

  async loadWorkweekConfig(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<WorkweekConfig>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/workweek-config`
        )
      );
      this._workweekConfig.set(data);
    } catch {
      // Default if not configured
      this._workweekConfig.set(null);
    }
  }

  async updateWorkweekConfig(data: Partial<WorkweekConfig>): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.put<WorkweekConfig>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/workweek-config`,
          data
        )
      );
      this._workweekConfig.set(result);
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to update workweek config');
      return false;
    }
  }

  // ============ POS Login ============

  async posLogin(passcode: string, staffPinId: string): Promise<PosSession | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<PosSession>(
          `${this.apiUrl}/merchant/${this.merchantId}/pos/login`,
          { passcode, staffPinId }
        )
      );
      this._posSession.set(result);
      LaborService.persist(LaborService.SESSION_KEY_POS_SESSION, result);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Invalid passcode');
      return null;
    }
  }

  async posLogout(): Promise<void> {
    if (!this.merchantId) return;

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/pos/logout`,
          {}
        )
      );
    } catch {
      // Silent logout failure — clear session anyway
    }

    this._posSession.set(null);
    LaborService.persist(LaborService.SESSION_KEY_POS_SESSION, null);
  }

  clearPosSession(): void {
    this._posSession.set(null);
    this._activeTimecard.set(null);
    this._activeTeamMember.set(null);
    LaborService.persist(LaborService.SESSION_KEY_POS_SESSION, null);
    LaborService.persist(LaborService.SESSION_KEY_TIMECARD, null);
    LaborService.persist(LaborService.SESSION_KEY_MEMBER, null);
  }

  // ============ Schedule Templates ============

  async loadTemplates(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<ScheduleTemplate[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/schedule-templates`
        )
      );
      this._scheduleTemplates.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load templates');
    }
  }

  async saveAsTemplate(name: string, weekStartDate: string): Promise<ScheduleTemplate | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<ScheduleTemplate>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/schedule-templates`,
          { name, weekStartDate }
        )
      );
      this._scheduleTemplates.update(t => [...t, result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to save template');
      return null;
    }
  }

  async applyTemplate(templateId: string, weekStartDate: string): Promise<Shift[]> {
    if (!this.merchantId) return [];

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<Shift[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/schedule-templates/${templateId}/apply`,
          { weekStartDate }
        )
      );
      this._shifts.update(existing => [...existing, ...result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to apply template');
      return [];
    }
  }

  async deleteTemplate(id: string): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/schedule-templates/${id}`
        )
      );
      this._scheduleTemplates.update(t => t.filter(tpl => tpl.id !== id));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to delete template');
      return false;
    }
  }

  async copyPreviousWeek(targetWeekStart: string): Promise<Shift[]> {
    if (!this.merchantId) return [];

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<Shift[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/copy-week`,
          { targetWeekStart }
        )
      );
      this._shifts.update(existing => [...existing, ...result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to copy previous week');
      return [];
    } finally {
      this._isLoading.set(false);
    }
  }

  // ============ Live Labor ============

  async getLiveLabor(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<LiveLaborData>(
          `${this.apiUrl}/merchant/${this.merchantId}/staff/labor-live`
        )
      );
      this._liveLabor.set(data);
    } catch {
      // Silent — gauge simply won't show if API unavailable
      this._liveLabor.set(null);
    }
  }

  // ============ Staff Notifications ============

  async sendScheduleNotification(weekStart: string): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/notifications/schedule-published`,
          { weekStart }
        )
      );
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to send notification');
      return false;
    }
  }

  async sendAnnouncement(message: string, recipientPinIds: string[]): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/notifications/announcement`,
          { message, recipientPinIds }
        )
      );
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to send announcement');
      return false;
    }
  }

  async loadNotifications(pinId: string): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<StaffNotification[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/notifications`,
          { params: { pinId } }
        )
      );
      this._notifications.set(data);
    } catch {
      this._notifications.set([]);
    }
  }

  async markNotificationRead(id: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/notifications/${id}/read`,
          {}
        )
      );
      this._notifications.update(n => n.map(notif => notif.id === id ? { ...notif, isRead: true } : notif));
      return true;
    } catch {
      return false;
    }
  }

  // ============ Payroll ============

  async loadPayrollPeriods(): Promise<void> {
    if (!this.merchantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<PayrollPeriod[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/payroll`
        )
      );
      this._payrollPeriods.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._payrollPeriods.set([]);
      } else {
        this._error.set(err instanceof Error ? err.message : 'Failed to load payroll periods');
      }
    } finally {
      this._isLoading.set(false);
    }
  }

  async generatePayrollPeriod(periodStart: string, periodEnd: string): Promise<PayrollPeriod | null> {
    if (!this.merchantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<PayrollPeriod>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/payroll/generate`,
          { periodStart, periodEnd }
        )
      );
      this._payrollPeriods.update(p => [result, ...p]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to generate payroll period');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async getPayrollPeriod(id: string): Promise<PayrollPeriod | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.get<PayrollPeriod>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/payroll/${id}`
        )
      );
      this._selectedPayroll.set(result);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load payroll period');
      return null;
    }
  }

  async approvePayroll(id: string): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<PayrollPeriod>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/payroll/${id}/approve`,
          {}
        )
      );
      this._payrollPeriods.update(p => p.map(pp => pp.id === id ? result : pp));
      this._selectedPayroll.set(result);
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to approve payroll');
      return false;
    }
  }

  async exportPayroll(id: string, format: 'csv' | 'pdf'): Promise<Blob | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/payroll/${id}/export`,
          { format },
          { responseType: 'blob' }
        )
      );
      return data;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to export payroll');
      return null;
    }
  }

  clearSelectedPayroll(): void {
    this._selectedPayroll.set(null);
  }

  // ============ Commission Rules ============

  async loadCommissionRules(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<CommissionRule[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/commissions/rules`
        )
      );
      this._commissionRules.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._commissionRules.set([]);
      } else {
        this._error.set(err instanceof Error ? err.message : 'Failed to load commission rules');
      }
    }
  }

  async createCommissionRule(data: Omit<CommissionRule, 'id' | 'merchantId'>): Promise<CommissionRule | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<CommissionRule>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/commissions/rules`,
          data
        )
      );
      this._commissionRules.update(r => [...r, result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to create commission rule');
      return null;
    }
  }

  async updateCommissionRule(id: string, data: Partial<CommissionRule>): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<CommissionRule>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/commissions/rules/${id}`,
          data
        )
      );
      this._commissionRules.update(r => r.map(rule => rule.id === id ? result : rule));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to update commission rule');
      return false;
    }
  }

  async deleteCommissionRule(id: string): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/commissions/rules/${id}`
        )
      );
      this._commissionRules.update(r => r.filter(rule => rule.id !== id));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to delete commission rule');
      return false;
    }
  }

  async calculateCommissions(periodStart: string, periodEnd: string): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<CommissionCalculation[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/commissions/calculate`,
          { params: { start: periodStart, end: periodEnd } }
        )
      );
      this._commissionCalculations.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to calculate commissions');
    }
  }

  // ============ PTO Policies ============

  async loadPtoPolicies(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<PtoPolicy[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/pto/policies`
        )
      );
      this._ptoPolicies.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load PTO policies');
    }
  }

  async createPtoPolicy(data: Omit<PtoPolicy, 'id' | 'merchantId'>): Promise<PtoPolicy | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<PtoPolicy>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/pto/policies`,
          data
        )
      );
      this._ptoPolicies.update(p => [...p, result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to create PTO policy');
      return null;
    }
  }

  async updatePtoPolicy(id: string, data: Partial<PtoPolicy>): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<PtoPolicy>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/pto/policies/${id}`,
          data
        )
      );
      this._ptoPolicies.update(p => p.map(policy => policy.id === id ? result : policy));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to update PTO policy');
      return false;
    }
  }

  // ============ PTO Requests ============

  async loadPtoRequests(status?: PtoRequestStatus): Promise<void> {
    if (!this.merchantId) return;

    try {
      const params: Record<string, string> = {};
      if (status) params['status'] = status;

      const data = await firstValueFrom(
        this.http.get<PtoRequest[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/pto/requests`,
          { params }
        )
      );
      this._ptoRequests.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._ptoRequests.set([]);
      } else {
        this._error.set(err instanceof Error ? err.message : 'Failed to load PTO requests');
      }
    }
  }

  async submitPtoRequest(data: { teamMemberId: string; type: string; startDate: string; endDate: string; hoursRequested: number; reason?: string }): Promise<PtoRequest | null> {
    if (!this.merchantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<PtoRequest>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/pto/requests`,
          data
        )
      );
      this._ptoRequests.update(r => [result, ...r]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to submit PTO request');
      return null;
    }
  }

  async approvePtoRequest(id: string): Promise<boolean> {
    return this.changePtoRequestStatus(id, 'approved', 'Failed to approve PTO request');
  }

  async denyPtoRequest(id: string): Promise<boolean> {
    return this.changePtoRequestStatus(id, 'denied', 'Failed to deny PTO request');
  }

  private async changePtoRequestStatus(
    id: string,
    status: 'approved' | 'denied',
    errorMessage: string
  ): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<PtoRequest>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/pto/requests/${id}`,
          { status }
        )
      );
      this._ptoRequests.update(r => r.map(req => req.id === id ? result : req));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : errorMessage);
      return false;
    }
  }

  async getPtoBalances(teamMemberId: string): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<PtoBalance[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/pto/balances/${teamMemberId}`
        )
      );
      this._ptoBalances.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load PTO balances');
    }
  }

  // --- Labor Forecasting ---

  async getLaborForecast(weekStart: string): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<LaborForecast>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/forecast`,
          { params: { weekStart } }
        )
      );
      this._laborForecast.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._laborForecast.set(null);
      } else {
        this._error.set(err instanceof Error ? err.message : 'Failed to load labor forecast');
      }
    }
  }

  // --- Compliance ---

  async loadComplianceAlerts(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<ComplianceAlert[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/compliance/alerts`
        )
      );
      this._complianceAlerts.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._complianceAlerts.set([]);
      } else {
        this._error.set(err instanceof Error ? err.message : 'Failed to load compliance alerts');
      }
    }
  }

  async loadComplianceSummary(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<ComplianceSummary>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/compliance/summary`
        )
      );
      this._complianceSummary.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._complianceSummary.set(null);
      } else {
        this._error.set(err instanceof Error ? err.message : 'Failed to load compliance summary');
      }
    }
  }

  async resolveComplianceAlert(id: string): Promise<boolean> {
    if (!this.merchantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<ComplianceAlert>(
          `${this.apiUrl}/merchant/${this.merchantId}/labor/compliance/alerts/${id}`,
          { isResolved: true }
        )
      );
      this._complianceAlerts.update(alerts =>
        alerts.map(a => a.id === id ? result : a)
      );
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to resolve alert');
      return false;
    }
  }
}
