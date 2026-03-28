import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ReportService } from '../../../services/report';
import { ReportBuilder } from '../report-builder/report-builder';
import {
  SavedReport,
  ReportSchedule,
  ReportScheduleFormData,
  ReportScheduleFrequency,
  ReportExportFormat,
  ReportDateRange,
  ComparisonPeriod,
} from '../../../models/index';

type DashboardView = 'list' | 'builder';

@Component({
  selector: 'os-report-dashboard',
  imports: [FormsModule, DatePipe, ReportBuilder],
  templateUrl: './report-dashboard.html',
  styleUrl: './report-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDashboard implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly router = inject(Router);

  readonly savedReports = this.reportService.savedReports;
  readonly schedules = this.reportService.schedules;
  readonly isLoading = this.reportService.isLoading;
  readonly error = this.reportService.error;

  private readonly _view = signal<DashboardView>('list');
  private readonly _editingReport = signal<SavedReport | null>(null);

  // Schedule modal
  private readonly _showScheduleModal = signal(false);
  private readonly _scheduleReportId = signal('');
  private readonly _scheduleFrequency = signal<ReportScheduleFrequency>('daily');
  private readonly _scheduleDayOfWeek = signal(1);
  private readonly _scheduleDayOfMonth = signal(1);
  private readonly _scheduleTime = signal('08:00');
  private readonly _scheduleEmails = signal('');
  private readonly _isSavingSchedule = signal(false);

  // Export modal
  private readonly _showExportModal = signal(false);
  private readonly _exportReportId = signal('');
  private readonly _exportFormat = signal<ReportExportFormat>('pdf');
  private readonly _exportStartDate = signal('');
  private readonly _exportEndDate = signal('');
  private readonly _exportComparison = signal<ComparisonPeriod | ''>('');
  private readonly _isExporting = signal(false);

  readonly view = this._view.asReadonly();
  readonly editingReport = this._editingReport.asReadonly();
  readonly showScheduleModal = this._showScheduleModal.asReadonly();
  readonly scheduleReportId = this._scheduleReportId.asReadonly();
  readonly scheduleFrequency = this._scheduleFrequency.asReadonly();
  readonly scheduleDayOfWeek = this._scheduleDayOfWeek.asReadonly();
  readonly scheduleDayOfMonth = this._scheduleDayOfMonth.asReadonly();
  readonly scheduleTime = this._scheduleTime.asReadonly();
  readonly scheduleEmails = this._scheduleEmails.asReadonly();
  readonly isSavingSchedule = this._isSavingSchedule.asReadonly();
  readonly showExportModal = this._showExportModal.asReadonly();
  readonly exportReportId = this._exportReportId.asReadonly();
  readonly exportFormat = this._exportFormat.asReadonly();
  readonly exportStartDate = this._exportStartDate.asReadonly();
  readonly exportEndDate = this._exportEndDate.asReadonly();
  readonly exportComparison = this._exportComparison.asReadonly();
  readonly isExporting = this._isExporting.asReadonly();

  readonly reportScheduleMap = computed(() => {
    const map = new Map<string, ReportSchedule[]>();
    for (const s of this.schedules()) {
      const list = map.get(s.savedReportId) ?? [];
      list.push(s);
      map.set(s.savedReportId, list);
    }
    return map;
  });

  readonly activeScheduleCount = computed(() =>
    this.schedules().filter(s => s.isActive).length
  );

  ngOnInit(): void {
    this.reportService.loadSavedReports();
    this.reportService.loadSchedules();
  }

  // --- View navigation ---

  openBuilder(report?: SavedReport): void {
    this._editingReport.set(report ?? null);
    this._view.set('builder');
  }

  onBuilderSaved(report: SavedReport): void {
    this._view.set('list');
    this._editingReport.set(null);
  }

  onBuilderCancelled(): void {
    this._view.set('list');
    this._editingReport.set(null);
  }

  // --- Built-in reports ---

  goToCloseOfDay(): void {
    this.router.navigate(['/app/close-of-day']);
  }

  goToSalesDashboard(): void {
    this.router.navigate(['/app/sales']);
  }

  goToLaborReport(): void {
    this.router.navigate(['/app/scheduling']);
  }

  // --- Report actions ---

  async deleteReport(report: SavedReport): Promise<void> {
    await this.reportService.deleteSavedReport(report.id);
  }

  getReportBlockCount(report: SavedReport): number {
    return report.blocks.length;
  }

  getSchedulesForReport(reportId: string): ReportSchedule[] {
    return this.reportScheduleMap().get(reportId) ?? [];
  }

  // --- Schedule modal ---

  openScheduleModal(reportId: string): void {
    this._scheduleReportId.set(reportId);
    this._scheduleFrequency.set('daily');
    this._scheduleDayOfWeek.set(1);
    this._scheduleDayOfMonth.set(1);
    this._scheduleTime.set('08:00');
    this._scheduleEmails.set('');
    this._showScheduleModal.set(true);
  }

  closeScheduleModal(): void {
    this._showScheduleModal.set(false);
  }

  setScheduleFrequency(freq: string): void {
    this._scheduleFrequency.set(freq as ReportScheduleFrequency);
  }

  setScheduleDayOfWeek(day: number): void {
    this._scheduleDayOfWeek.set(day);
  }

  setScheduleDayOfMonth(day: number): void {
    this._scheduleDayOfMonth.set(day);
  }

  setScheduleTime(time: string): void {
    this._scheduleTime.set(time);
  }

  setScheduleEmails(emails: string): void {
    this._scheduleEmails.set(emails);
  }

  async saveSchedule(): Promise<void> {
    const emails = this._scheduleEmails()
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (emails.length === 0) return;

    this._isSavingSchedule.set(true);

    const freq = this._scheduleFrequency();
    const data: ReportScheduleFormData = {
      savedReportId: this._scheduleReportId(),
      frequency: freq,
      dayOfWeek: freq === 'weekly' ? this._scheduleDayOfWeek() : undefined,
      dayOfMonth: freq === 'monthly' ? this._scheduleDayOfMonth() : undefined,
      timeOfDay: this._scheduleTime(),
      recipientEmails: emails,
    };

    await this.reportService.createSchedule(data);
    this._isSavingSchedule.set(false);
    this._showScheduleModal.set(false);
  }

  async toggleScheduleActive(schedule: ReportSchedule): Promise<void> {
    await this.reportService.toggleSchedule(schedule.id, !schedule.isActive);
  }

  async deleteSchedule(schedule: ReportSchedule): Promise<void> {
    await this.reportService.deleteSchedule(schedule.id);
  }

  getFrequencyLabel(schedule: ReportSchedule): string {
    switch (schedule.frequency) {
      case 'daily': return `Daily at ${schedule.timeOfDay}`;
      case 'weekly': return `Weekly on ${this.getDayName(schedule.dayOfWeek ?? 1)} at ${schedule.timeOfDay}`;
      case 'monthly': return `Monthly on day ${schedule.dayOfMonth ?? 1} at ${schedule.timeOfDay}`;
    }
  }

  getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] ?? 'Monday';
  }

  // --- Export modal ---

  openExportModal(reportId: string): void {
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    this._exportReportId.set(reportId);
    this._exportFormat.set('pdf');
    this._exportStartDate.set(todayStr);
    this._exportEndDate.set(todayStr);
    this._exportComparison.set('');
    this._showExportModal.set(true);
  }

  closeExportModal(): void {
    this._showExportModal.set(false);
  }

  setExportFormat(format: string): void {
    this._exportFormat.set(format as ReportExportFormat);
  }

  setExportStartDate(date: string): void {
    this._exportStartDate.set(date);
  }

  setExportEndDate(date: string): void {
    this._exportEndDate.set(date);
  }

  setExportComparison(period: string): void {
    this._exportComparison.set(period as ComparisonPeriod | '');
  }

  async doExport(): Promise<void> {
    this._isExporting.set(true);

    const dateRange: ReportDateRange = {
      startDate: this._exportStartDate(),
      endDate: this._exportEndDate(),
      comparisonPeriod: this._exportComparison() || undefined,
    };

    const blob = await this.reportService.exportReport(
      this._exportReportId(),
      dateRange,
      this._exportFormat()
    );

    if (blob) {
      const ext = this._exportFormat();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${this._exportStartDate()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    }

    this._isExporting.set(false);
    this._showExportModal.set(false);
  }
}
