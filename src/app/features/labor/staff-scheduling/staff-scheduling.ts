import { Component, inject, signal, computed, effect, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CurrencyPipe, DecimalPipe, DatePipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LaborService } from '../../../services/labor';
import { AuthService } from '../../../services/auth';
import { StaffManagementService } from '../../../services/staff-management';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../../shared/error-display/error-display';
import {
  StaffScheduleTab,
  ReportRange,
  Shift,
  ShiftFormData,
  ShiftPosition,
  StaffMember,
  TimecardEditStatus,
  TimecardEditType,
  ScheduleTemplate,
  PayrollPeriod,
  PayrollStatus,
  CommissionRule,
  PtoRequestStatus,
  PtoType,
  ComplianceAlertType,
  ComplianceAlertSeverity,
} from '../../../models/index';

@Component({
  selector: 'os-staff-scheduling',
  imports: [CurrencyPipe, DecimalPipe, DatePipe, PercentPipe, FormsModule, LoadingSpinner, ErrorDisplay],
  templateUrl: './staff-scheduling.html',
  styleUrl: './staff-scheduling.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffScheduling implements OnDestroy {
  private readonly laborService = inject(LaborService);
  private readonly authService = inject(AuthService);
  private readonly staffMgmt = inject(StaffManagementService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly staffMembers = this.laborService.staffMembers;
  readonly shifts = this.laborService.shifts;
  readonly activeClocks = this.laborService.activeClocks;
  readonly laborReport = this.laborService.laborReport;
  readonly recommendations = this.laborService.recommendations;
  readonly laborTargets = this.laborService.laborTargets;
  readonly isLoading = this.laborService.isLoading;
  readonly error = this.laborService.error;

  // UI state
  private readonly _activeTab = signal<StaffScheduleTab>('schedule');
  private readonly _weekOffset = signal(0);
  private readonly _showShiftModal = signal(false);
  private readonly _editingShift = signal<Shift | null>(null);
  private readonly _shiftForm = signal<ShiftFormData>({
    staffPinId: '',
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    position: 'server',
    breakMinutes: 0,
    notes: '',
  });
  private readonly _clockInPin = signal('');
  private readonly _clockOutBreak = signal(0);
  private readonly _reportRange = signal<ReportRange>('week');
  private readonly _isSaving = signal(false);
  private readonly _sortField = signal<'name' | 'hours' | 'cost'>('name');
  private readonly _sortAsc = signal(true);

  // Pending edits state
  private readonly _editsFilter = signal<TimecardEditStatus | 'all'>('pending');
  private readonly _isResolvingEdit = signal(false);

  // Template state
  private readonly _showTemplateMenu = signal(false);
  private readonly _showSaveTemplateForm = signal(false);
  private readonly _templateName = signal('');
  private readonly _isCopyingWeek = signal(false);

  // Live labor gauge polling
  private liveLaborInterval: ReturnType<typeof setInterval> | null = null;

  // Payroll state
  private readonly _showGeneratePayroll = signal(false);
  private readonly _payrollStartDate = signal('');
  private readonly _payrollEndDate = signal('');
  private readonly _expandedPayrollId = signal<string | null>(null);
  private readonly _expandedMemberId = signal<string | null>(null);
  private readonly _payrollSortField = signal<'name' | 'hours' | 'gross'>('name');
  private readonly _payrollSortAsc = signal(true);

  // Commission state
  private readonly _showCommissionForm = signal(false);
  private readonly _editingCommission = signal<CommissionRule | null>(null);
  private readonly _commissionForm = signal<{
    name: string;
    jobTitle: string;
    type: 'percentage' | 'flat_per_order';
    rate: number;
    minimumSales: number;
    isActive: boolean;
  }>({ name: '', jobTitle: '', type: 'percentage', rate: 0, minimumSales: 0, isActive: true });

  // PTO state (manager view in edits tab)
  private readonly _ptoFilter = signal<PtoRequestStatus | 'all'>('pending');

  // Compliance state
  private readonly _complianceFilter = signal<ComplianceAlertSeverity | 'all'>('all');
  private readonly _showResolvedAlerts = signal(false);
  private readonly _isResolvingAlert = signal(false);

  // Forecasting state
  private readonly _showForecast = signal(false);

  readonly activeTab = this._activeTab.asReadonly();
  readonly weekOffset = this._weekOffset.asReadonly();
  readonly showShiftModal = this._showShiftModal.asReadonly();
  readonly editingShift = this._editingShift.asReadonly();
  readonly shiftForm = this._shiftForm.asReadonly();
  readonly clockInPin = this._clockInPin.asReadonly();
  readonly clockOutBreak = this._clockOutBreak.asReadonly();
  readonly reportRange = this._reportRange.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly editsFilter = this._editsFilter.asReadonly();
  readonly isResolvingEdit = this._isResolvingEdit.asReadonly();
  readonly timecardEdits = this.laborService.timecardEdits;
  readonly showTemplateMenu = this._showTemplateMenu.asReadonly();
  readonly showSaveTemplateForm = this._showSaveTemplateForm.asReadonly();
  readonly templateName = this._templateName.asReadonly();
  readonly isCopyingWeek = this._isCopyingWeek.asReadonly();
  readonly scheduleTemplates = this.laborService.scheduleTemplates;
  readonly liveLabor = this.laborService.liveLabor;

  // Payroll readonly
  readonly payrollPeriods = this.laborService.payrollPeriods;
  readonly selectedPayroll = this.laborService.selectedPayroll;
  readonly showGeneratePayroll = this._showGeneratePayroll.asReadonly();
  readonly payrollStartDate = this._payrollStartDate.asReadonly();
  readonly payrollEndDate = this._payrollEndDate.asReadonly();
  readonly expandedPayrollId = this._expandedPayrollId.asReadonly();
  readonly expandedMemberId = this._expandedMemberId.asReadonly();

  // Commission readonly
  readonly commissionRules = this.laborService.commissionRules;
  readonly commissionCalculations = this.laborService.commissionCalculations;
  readonly showCommissionForm = this._showCommissionForm.asReadonly();
  readonly editingCommission = this._editingCommission.asReadonly();
  readonly commissionForm = this._commissionForm.asReadonly();

  // PTO readonly
  readonly ptoRequests = this.laborService.ptoRequests;
  readonly ptoFilter = this._ptoFilter.asReadonly();

  // Compliance readonly
  readonly complianceAlerts = this.laborService.complianceAlerts;
  readonly complianceSummary = this.laborService.complianceSummary;
  readonly complianceFilter = this._complianceFilter.asReadonly();
  readonly showResolvedAlerts = this._showResolvedAlerts.asReadonly();
  readonly isResolvingAlert = this._isResolvingAlert.asReadonly();

  // Forecasting readonly
  readonly laborForecast = this.laborService.laborForecast;
  readonly showForecast = this._showForecast.asReadonly();

  readonly filteredComplianceAlerts = computed(() => {
    const alerts = this.laborService.complianceAlerts();
    const severity = this._complianceFilter();
    const showResolved = this._showResolvedAlerts();
    let filtered = showResolved ? alerts : alerts.filter(a => !a.isResolved);
    if (severity !== 'all') {
      filtered = filtered.filter(a => a.severity === severity);
    }
    return filtered;
  });

  readonly unresolvedAlertCount = computed(() =>
    this.laborService.complianceAlerts().filter(a => !a.isResolved).length
  );

  readonly forecastOverUnder = computed(() => {
    const forecast = this.laborForecast();
    if (!forecast) return [];
    return forecast.hourlyBreakdown.map(h => ({
      ...h,
      delta: h.scheduledStaff - h.recommendedStaff,
    }));
  });

  readonly pendingEditsCount = computed(() =>
    this.laborService.timecardEdits().filter(e => e.status === 'pending').length
  );

  readonly pendingPtoCount = computed(() =>
    this.laborService.ptoRequests().filter(r => r.status === 'pending').length
  );

  readonly filteredEdits = computed(() => {
    const edits = this.laborService.timecardEdits();
    const filter = this._editsFilter();
    if (filter === 'all') return edits;
    return edits.filter(e => e.status === filter);
  });

  readonly filteredPtoRequests = computed(() => {
    const requests = this.laborService.ptoRequests();
    const filter = this._ptoFilter();
    if (filter === 'all') return requests;
    return requests.filter(r => r.status === filter);
  });

  // Computed: week boundaries
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

  readonly weekStartStr = computed(() => this.formatDate(this.weekStart()));
  readonly weekEndStr = computed(() => this.formatDate(this.weekEnd()));

  readonly weekDays = computed(() => {
    const days: string[] = [];
    const start = new Date(this.weekStart());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(this.formatDate(d));
    }
    return days;
  });

  // Computed: shifts grouped by day
  readonly shiftsByDay = computed(() => {
    const map = new Map<string, Shift[]>();
    for (const day of this.weekDays()) {
      map.set(day, []);
    }
    for (const shift of this.shifts()) {
      const existing = map.get(shift.date);
      if (existing) {
        existing.push(shift);
      }
    }
    return map;
  });

  // Computed: unique staff on schedule
  readonly staffOnSchedule = computed(() => {
    const ids = new Set(this.shifts().map(s => s.staffPinId));
    return ids.size;
  });

  // Computed: total scheduled hours
  readonly totalScheduledHours = computed(() => {
    return this.shifts().reduce((sum, s) => sum + this.getShiftDuration(s), 0);
  });

  // Computed: all shifts published
  readonly isPublished = computed(() => {
    const s = this.shifts();
    return s.length > 0 && s.every(sh => sh.isPublished);
  });

  // Computed: staff rows for grid — built from TeamMembers (using staffPinId),
  // with fallback to shift-based staff for orphaned StaffPins
  readonly staffRows = computed(() => {
    const staffMap = new Map<string, StaffMember>();

    // First: TeamMembers that have a linked StaffPin (primary source)
    for (const tm of this.staffMgmt.teamMembers()) {
      if (tm.staffPinId && tm.status === 'active') {
        const primaryJob = tm.jobs.find(j => j.isPrimary);
        staffMap.set(tm.staffPinId, {
          id: tm.staffPinId,
          name: tm.displayName,
          role: primaryJob?.jobTitle ?? tm.jobs[0]?.jobTitle ?? '—',
          teamMemberId: tm.id,
        });
      }
    }

    // Second: staff from shifts (orphaned StaffPins not linked to TeamMember)
    for (const shift of this.shifts()) {
      if (!staffMap.has(shift.staffPinId)) {
        staffMap.set(shift.staffPinId, {
          id: shift.staffPinId,
          name: shift.staffName,
          role: shift.staffRole,
          teamMemberId: null,
        });
      }
    }

    // Third: remaining StaffPins from labor service (no shifts, no TeamMember link)
    for (const member of this.staffMembers()) {
      if (!staffMap.has(member.id)) {
        staffMap.set(member.id, member);
      }
    }

    return [...staffMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Computed: sorted staff summaries for report
  readonly sortedStaffSummaries = computed(() => {
    const report = this.laborReport();
    if (!report) return [];
    const summaries = [...report.staffSummaries];
    const field = this._sortField();
    const asc = this._sortAsc();
    summaries.sort((a, b) => {
      let cmp = 0;
      if (field === 'name') cmp = a.staffName.localeCompare(b.staffName);
      else if (field === 'hours') cmp = a.totalHours - b.totalHours;
      else if (field === 'cost') cmp = a.laborCost - b.laborCost;
      return asc ? cmp : -cmp;
    });
    return summaries;
  });

  // Payroll computed: sorted member summaries
  readonly sortedPayrollMembers = computed(() => {
    const payroll = this.selectedPayroll();
    if (!payroll) return [];
    const members = [...payroll.teamMemberSummaries];
    const field = this._payrollSortField();
    const asc = this._payrollSortAsc();
    members.sort((a, b) => {
      let cmp = 0;
      if (field === 'name') cmp = a.displayName.localeCompare(b.displayName);
      else if (field === 'hours') cmp = (a.regularHours + a.overtimeHours) - (b.regularHours + b.overtimeHours);
      else if (field === 'gross') cmp = a.grossPay - b.grossPay;
      return asc ? cmp : -cmp;
    });
    return members;
  });

  readonly payrollTotalRegularHours = computed(() => {
    const payroll = this.selectedPayroll();
    if (!payroll) return 0;
    return payroll.teamMemberSummaries.reduce((sum, m) => sum + m.regularHours, 0);
  });

  readonly payrollTotalOvertimeHours = computed(() => {
    const payroll = this.selectedPayroll();
    if (!payroll) return 0;
    return payroll.teamMemberSummaries.reduce((sum, m) => sum + m.overtimeHours, 0);
  });

  // Workweek config
  readonly workweekConfig = this.laborService.workweekConfig;

  readonly overtimeThresholdLabel = computed(() => {
    const config = this.workweekConfig();
    return config ? `${config.overtimeThresholdHours}h/week` : '40h/week';
  });

  readonly weekStartDayLabel = computed(() => {
    const config = this.workweekConfig();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return config ? days[config.startDay] : 'Sunday';
  });

  // Labor vs sales computeds
  readonly totalOvertimeHours = computed(() => {
    const report = this.laborReport();
    if (!report) return 0;
    return report.staffSummaries.reduce((sum, s) => sum + s.overtimeHours, 0);
  });

  readonly totalOvertimeCost = computed(() => {
    const report = this.laborReport();
    if (!report) return 0;
    return report.overtimeFlags.reduce((sum, f) => sum + (f.overtimeHours * 22.5), 0);
  });

  readonly avgDailyLaborPercent = computed(() => {
    const report = this.laborReport();
    if (!report || report.dailyBreakdown.length === 0) return 0;
    const sum = report.dailyBreakdown.reduce((total, d) => total + d.laborPercent, 0);
    return sum / report.dailyBreakdown.length;
  });

  // Live labor gauge computeds
  readonly laborGaugeClass = computed(() => {
    const data = this.liveLabor();
    if (!data) return '';
    if (data.laborPercent < 25) return 'gauge-good';
    if (data.laborPercent <= 32) return 'gauge-warning';
    return 'gauge-critical';
  });

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated() && this.authService.selectedMerchantId()) {
        this.laborService.loadStaffMembers();
        this.staffMgmt.loadTeamMembers();
        this.loadCurrentWeek();
        this.laborService.loadActiveClocks();
        this.laborService.loadWorkweekConfig();
        this.laborService.loadTemplates();
        this.startLiveLaborPolling();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopLiveLaborPolling();
  }

  // Live labor polling
  private startLiveLaborPolling(): void {
    this.stopLiveLaborPolling();
    this.laborService.getLiveLabor();
    this.liveLaborInterval = setInterval(() => {
      this.laborService.getLiveLabor();
    }, 60000);
  }

  private stopLiveLaborPolling(): void {
    if (this.liveLaborInterval !== null) {
      clearInterval(this.liveLaborInterval);
      this.liveLaborInterval = null;
    }
  }

  // Tab navigation
  setTab(tab: StaffScheduleTab): void {
    this._activeTab.set(tab);
    if (tab === 'labor-report') {
      this.loadReport();
    } else if (tab === 'edits') {
      this.laborService.loadTimecardEdits();
      this.laborService.loadPtoRequests();
    } else if (tab === 'payroll') {
      this.laborService.loadPayrollPeriods();
      this.laborService.loadCommissionRules();
    } else if (tab === 'compliance') {
      this.laborService.loadComplianceAlerts();
      this.laborService.loadComplianceSummary();
    }
  }

  refreshRecommendations(): void {
    this.laborService.loadRecommendations();
  }

  // Compliance
  setComplianceFilter(severity: ComplianceAlertSeverity | 'all'): void {
    this._complianceFilter.set(severity);
  }

  toggleResolvedAlerts(): void {
    this._showResolvedAlerts.update(v => !v);
  }

  async resolveAlert(id: string): Promise<void> {
    this._isResolvingAlert.set(true);
    await this.laborService.resolveComplianceAlert(id);
    this._isResolvingAlert.set(false);
  }

  getAlertSeverityClass(severity: ComplianceAlertSeverity): string {
    if (severity === 'critical') return 'badge bg-danger';
    if (severity === 'warning') return 'badge bg-warning text-dark';
    return 'badge bg-info';
  }

  getAlertTypeIcon(type: ComplianceAlertType): string {
    if (type === 'break_missed') return 'bi-cup-hot';
    if (type === 'overtime_approaching') return 'bi-clock';
    if (type === 'overtime_exceeded') return 'bi-exclamation-triangle';
    if (type === 'minor_violation') return 'bi-person-exclamation';
    return 'bi-currency-dollar';
  }

  // Forecasting
  toggleForecast(): void {
    this._showForecast.update(v => !v);
    if (this._showForecast()) {
      this.laborService.getLaborForecast(this.weekStartStr());
    }
  }

  getForecastBarWidth(scheduled: number, recommended: number): number {
    const max = Math.max(scheduled, recommended, 1);
    return (scheduled / max) * 100;
  }

  getRecommendedBarWidth(scheduled: number, recommended: number): number {
    const max = Math.max(scheduled, recommended, 1);
    return (recommended / max) * 100;
  }

  getDayName(dayOfWeek: number): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayOfWeek] ?? '';
  }

  // Week navigation
  prevWeek(): void {
    this._weekOffset.update(o => o - 1);
    this.loadCurrentWeek();
  }

  nextWeek(): void {
    this._weekOffset.update(o => o + 1);
    this.loadCurrentWeek();
  }

  thisWeek(): void {
    this._weekOffset.set(0);
    this.loadCurrentWeek();
  }

  private loadCurrentWeek(): void {
    this.laborService.loadShifts(this.weekStartStr(), this.weekEndStr());
  }

  // === Schedule Templates ===

  toggleTemplateMenu(): void {
    this._showTemplateMenu.update(v => !v);
  }

  closeTemplateMenu(): void {
    this._showTemplateMenu.set(false);
  }

  openSaveTemplateForm(): void {
    this._showTemplateMenu.set(false);
    this._templateName.set('');
    this._showSaveTemplateForm.set(true);
  }

  closeSaveTemplateForm(): void {
    this._showSaveTemplateForm.set(false);
  }

  setTemplateName(name: string): void {
    this._templateName.set(name);
  }

  async saveCurrentWeekAsTemplate(): Promise<void> {
    const name = this._templateName().trim();
    if (!name) return;

    this._isSaving.set(true);
    await this.laborService.saveAsTemplate(name, this.weekStartStr());
    this._isSaving.set(false);
    this._showSaveTemplateForm.set(false);
  }

  async applyTemplate(template: ScheduleTemplate): Promise<void> {
    this._showTemplateMenu.set(false);
    this._isSaving.set(true);
    await this.laborService.applyTemplate(template.id, this.weekStartStr());
    this._isSaving.set(false);
  }

  async deleteTemplate(template: ScheduleTemplate, event: Event): Promise<void> {
    event.stopPropagation();
    await this.laborService.deleteTemplate(template.id);
  }

  async copyLastWeek(): Promise<void> {
    this._isCopyingWeek.set(true);
    await this.laborService.copyPreviousWeek(this.weekStartStr());
    this._isCopyingWeek.set(false);
  }

  // Shift modal
  openNewShift(staffPinId: string, date: string): void {
    this._editingShift.set(null);
    this._shiftForm.set({
      staffPinId,
      date,
      startTime: '09:00',
      endTime: '17:00',
      position: 'server',
      breakMinutes: 0,
      notes: '',
    });
    this._showShiftModal.set(true);
  }

  openEditShift(shift: Shift): void {
    this._editingShift.set(shift);
    this._shiftForm.set({
      staffPinId: shift.staffPinId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      position: shift.position,
      breakMinutes: shift.breakMinutes,
      notes: shift.notes ?? '',
    });
    this._showShiftModal.set(true);
  }

  closeShiftModal(): void {
    this._showShiftModal.set(false);
    this._editingShift.set(null);
  }

  updateShiftForm(field: keyof ShiftFormData, value: string | number): void {
    this._shiftForm.update(f => ({ ...f, [field]: value }));
  }

  async saveShift(): Promise<void> {
    this._isSaving.set(true);
    const editing = this._editingShift();
    const form = this._shiftForm();

    if (editing) {
      await this.laborService.updateShift(editing.id, form);
    } else {
      await this.laborService.createShift(form);
    }

    this._isSaving.set(false);
    this.closeShiftModal();
  }

  async deleteShift(): Promise<void> {
    const editing = this._editingShift();
    if (!editing) return;

    this._isSaving.set(true);
    await this.laborService.deleteShift(editing.id);
    this._isSaving.set(false);
    this.closeShiftModal();
  }

  async publishAndNotify(): Promise<void> {
    this._isSaving.set(true);
    const published = await this.laborService.publishWeek(this.weekStartStr());
    if (published) {
      await this.laborService.sendScheduleNotification(this.weekStartStr());
    }
    this._isSaving.set(false);
  }

  async publishWeek(): Promise<void> {
    this._isSaving.set(true);
    await this.laborService.publishWeek(this.weekStartStr());
    this._isSaving.set(false);
  }

  // Time clock
  setClockInPin(pinId: string): void {
    this._clockInPin.set(pinId);
  }

  setClockOutBreak(minutes: number): void {
    this._clockOutBreak.set(minutes);
  }

  async clockIn(): Promise<void> {
    const pinId = this._clockInPin();
    if (!pinId) return;
    await this.laborService.clockIn(pinId);
    this._clockInPin.set('');
  }

  async clockOut(timeEntryId: string): Promise<void> {
    await this.laborService.clockOut(timeEntryId, this._clockOutBreak());
    this._clockOutBreak.set(0);
  }

  // Labor report
  setReportRange(range: ReportRange): void {
    this._reportRange.set(range);
    this.loadReport();
  }

  private loadReport(): void {
    const now = new Date();
    const start = new Date(now);
    const range = this._reportRange();

    if (range === 'week') {
      start.setDate(now.getDate() - 7);
    } else if (range === 'biweek') {
      start.setDate(now.getDate() - 14);
    } else {
      start.setDate(now.getDate() - 30);
    }

    this.laborService.loadLaborReport(this.formatDate(start), this.formatDate(now));
  }

  sortReport(field: 'name' | 'hours' | 'cost'): void {
    if (this._sortField() === field) {
      this._sortAsc.update(a => !a);
    } else {
      this._sortField.set(field);
      this._sortAsc.set(true);
    }
  }

  exportCSV(): void {
    const report = this.laborReport();
    if (!report) return;

    const rows = [
      ['Name', 'Role', 'Regular Hours', 'OT Hours', 'Total Hours', 'Labor Cost'],
      ...report.staffSummaries.map(s => [
        s.staffName,
        s.staffRole,
        s.regularHours.toFixed(2),
        s.overtimeHours.toFixed(2),
        s.totalHours.toFixed(2),
        s.laborCost.toFixed(2),
      ]),
    ];

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labor-report-${report.startDate}-to-${report.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Edits
  setEditsFilter(filter: TimecardEditStatus | 'all'): void {
    this._editsFilter.set(filter);
  }

  async approveEdit(editId: string): Promise<void> {
    this._isResolvingEdit.set(true);
    await this.laborService.resolveTimecardEdit(editId, 'approved');
    this._isResolvingEdit.set(false);
  }

  async denyEdit(editId: string): Promise<void> {
    this._isResolvingEdit.set(true);
    await this.laborService.resolveTimecardEdit(editId, 'denied');
    this._isResolvingEdit.set(false);
  }

  getEditTypeLabel(type: TimecardEditType): string {
    const labels: Record<TimecardEditType, string> = {
      clock_in: 'Clock In',
      clock_out: 'Clock Out',
      break_start: 'Break Start',
      break_end: 'Break End',
      job_change: 'Job Title',
    };
    return labels[type] ?? type;
  }

  getEditStatusClass(status: TimecardEditStatus): string {
    if (status === 'approved') return 'badge bg-success';
    if (status === 'denied') return 'badge bg-danger';
    if (status === 'expired') return 'badge bg-secondary';
    return 'badge bg-warning text-dark';
  }

  // === PTO (Manager view in Edits tab) ===

  setPtoFilter(filter: PtoRequestStatus | 'all'): void {
    this._ptoFilter.set(filter);
  }

  async approvePto(id: string): Promise<void> {
    this._isResolvingEdit.set(true);
    await this.laborService.approvePtoRequest(id);
    this._isResolvingEdit.set(false);
  }

  async denyPto(id: string): Promise<void> {
    this._isResolvingEdit.set(true);
    await this.laborService.denyPtoRequest(id);
    this._isResolvingEdit.set(false);
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
    if (status === 'approved') return 'badge bg-success';
    if (status === 'denied') return 'badge bg-danger';
    return 'badge bg-warning text-dark';
  }

  // === Payroll ===

  openGeneratePayroll(): void {
    const now = new Date();
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14);
    this._payrollStartDate.set(this.formatDate(twoWeeksAgo));
    this._payrollEndDate.set(this.formatDate(now));
    this._showGeneratePayroll.set(true);
  }

  closeGeneratePayroll(): void {
    this._showGeneratePayroll.set(false);
  }

  setPayrollStartDate(date: string): void {
    this._payrollStartDate.set(date);
  }

  setPayrollEndDate(date: string): void {
    this._payrollEndDate.set(date);
  }

  async generatePayroll(): Promise<void> {
    const start = this._payrollStartDate();
    const end = this._payrollEndDate();
    if (!start || !end) return;

    this._isSaving.set(true);
    const result = await this.laborService.generatePayrollPeriod(start, end);
    this._isSaving.set(false);

    if (result) {
      this._showGeneratePayroll.set(false);
      this.laborService.clearSelectedPayroll();
      this._expandedPayrollId.set(result.id);
      await this.laborService.getPayrollPeriod(result.id);
    }
  }

  async expandPayroll(period: PayrollPeriod): Promise<void> {
    if (this._expandedPayrollId() === period.id) {
      this._expandedPayrollId.set(null);
      this.laborService.clearSelectedPayroll();
      return;
    }
    this._expandedPayrollId.set(period.id);
    await this.laborService.getPayrollPeriod(period.id);
  }

  toggleMemberExpand(memberId: string): void {
    if (this._expandedMemberId() === memberId) {
      this._expandedMemberId.set(null);
    } else {
      this._expandedMemberId.set(memberId);
    }
  }

  sortPayroll(field: 'name' | 'hours' | 'gross'): void {
    if (this._payrollSortField() === field) {
      this._payrollSortAsc.update(a => !a);
    } else {
      this._payrollSortField.set(field);
      this._payrollSortAsc.set(true);
    }
  }

  async approvePayroll(id: string): Promise<void> {
    this._isSaving.set(true);
    await this.laborService.approvePayroll(id);
    this._isSaving.set(false);
  }

  async exportPayrollCSV(id: string): Promise<void> {
    const blob = await this.laborService.exportPayroll(id, 'csv');
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async exportPayrollPDF(id: string): Promise<void> {
    const blob = await this.laborService.exportPayroll(id, 'pdf');
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  getPayrollStatusClass(status: PayrollStatus): string {
    if (status === 'approved') return 'badge bg-success';
    if (status === 'exported') return 'badge bg-info';
    if (status === 'reviewed') return 'badge bg-primary';
    return 'badge bg-secondary';
  }

  // === Commission Rules ===

  openNewCommission(): void {
    this._editingCommission.set(null);
    this._commissionForm.set({ name: '', jobTitle: '', type: 'percentage', rate: 0, minimumSales: 0, isActive: true });
    this._showCommissionForm.set(true);
  }

  openEditCommission(rule: CommissionRule): void {
    this._editingCommission.set(rule);
    this._commissionForm.set({
      name: rule.name,
      jobTitle: rule.jobTitle,
      type: rule.type,
      rate: rule.rate,
      minimumSales: rule.minimumSales,
      isActive: rule.isActive,
    });
    this._showCommissionForm.set(true);
  }

  closeCommissionForm(): void {
    this._showCommissionForm.set(false);
    this._editingCommission.set(null);
  }

  updateCommissionForm(field: string, value: string | number | boolean): void {
    this._commissionForm.update(f => ({ ...f, [field]: value }));
  }

  async saveCommission(): Promise<void> {
    const form = this._commissionForm();
    if (!form.name.trim() || !form.jobTitle.trim()) return;

    this._isSaving.set(true);
    const editing = this._editingCommission();

    if (editing) {
      await this.laborService.updateCommissionRule(editing.id, form);
    } else {
      await this.laborService.createCommissionRule(form);
    }

    this._isSaving.set(false);
    this.closeCommissionForm();
  }

  async deleteCommission(id: string): Promise<void> {
    await this.laborService.deleteCommissionRule(id);
  }

  // Helpers
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

  getPositionLabel(position: ShiftPosition): string {
    const labels: Record<ShiftPosition, string> = {
      server: 'Server',
      cook: 'Cook',
      bartender: 'Bartender',
      host: 'Host',
      manager: 'Manager',
      expo: 'Expo',
    };
    return labels[position] ?? position;
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
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
  }

  getJobTitle(staffPinId: string): string {
    const member = this.staffRows().find(m => m.id === staffPinId);
    return member?.role ?? '—';
  }

  getElapsedTime(clockIn: string): string {
    const diff = Date.now() - new Date(clockIn).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  getLaborPercentClass(percent: number): string {
    if (percent < 30) return 'labor-good';
    if (percent <= 35) return 'labor-warning';
    return 'labor-critical';
  }

  getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
    if (priority === 'high') return '#dc3545';
    if (priority === 'medium') return '#ffc107';
    return '#28a745';
  }

  getRecommendationIcon(type: string): string {
    if (type === 'overstaffed') return 'bi-person-dash';
    if (type === 'understaffed') return 'bi-person-plus';
    if (type === 'cost_optimization') return 'bi-piggy-bank';
    return 'bi-lightbulb';
  }

  getShiftsForCell(staffId: string, day: string): Shift[] {
    return this.shiftsByDay().get(day)?.filter(s => s.staffPinId === staffId) ?? [];
  }

  trackByShiftId(_index: number, shift: Shift): string {
    return shift.id;
  }
}
