import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';

import { MenuService } from '../../../services/menu';
import {
  MenuSchedule,
  Daypart,
  ScheduleOverride,
  SchedulePreviewResult,
  getDaypartLabel,
  isDaypartActive,
} from '../../../models/index';

interface DaypartFormRow {
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  isActive: boolean;
  displayOrder: number;
}

type ScheduleView = 'list' | 'form' | 'preview' | 'overrides';

@Component({
  selector: 'os-schedule-management',
  imports: [],
  templateUrl: './schedule-management.html',
  styleUrl: './schedule-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleManagement implements OnInit {
  readonly menuService = inject(MenuService);
  private readonly destroyRef = inject(DestroyRef);

  // View state
  private readonly _view = signal<ScheduleView>('list');
  private readonly _editingScheduleId = signal<string | null>(null);
  private readonly _formName = signal('');
  private readonly _formIsDefault = signal(false);
  private readonly _formDayparts = signal<DaypartFormRow[]>([]);

  // Preview state
  private readonly _previewDate = signal('');
  private readonly _previewTime = signal('');
  private readonly _previewResults = signal<SchedulePreviewResult[]>([]);

  // Override form state
  private readonly _showOverrideForm = signal(false);
  private readonly _editingOverrideId = signal<string | null>(null);
  private readonly _overrideDate = signal('');
  private readonly _overrideLabel = signal('');
  private readonly _overrideMode = signal<'replace' | 'closed'>('closed');
  private readonly _overrideDayparts = signal<DaypartFormRow[]>([]);

  // Daypart change notification
  private readonly _upcomingChange = signal<{ nextDaypart: Daypart; minutesUntil: number } | null>(null);
  private _notificationInterval: ReturnType<typeof setInterval> | null = null;

  readonly view = this._view.asReadonly();
  readonly editingScheduleId = this._editingScheduleId.asReadonly();
  readonly formName = this._formName.asReadonly();
  readonly formIsDefault = this._formIsDefault.asReadonly();
  readonly formDayparts = this._formDayparts.asReadonly();
  readonly previewDate = this._previewDate.asReadonly();
  readonly previewTime = this._previewTime.asReadonly();
  readonly previewResults = this._previewResults.asReadonly();
  readonly showOverrideForm = this._showOverrideForm.asReadonly();
  readonly editingOverrideId = this._editingOverrideId.asReadonly();
  readonly overrideDate = this._overrideDate.asReadonly();
  readonly overrideLabel = this._overrideLabel.asReadonly();
  readonly overrideMode = this._overrideMode.asReadonly();
  readonly overrideDayparts = this._overrideDayparts.asReadonly();
  readonly upcomingChange = this._upcomingChange.asReadonly();

  readonly schedules = this.menuService.menuSchedules;
  readonly activeScheduleId = this.menuService.activeScheduleId;
  readonly overrides = this.menuService.scheduleOverrides;

  readonly allDays: number[] = [0, 1, 2, 3, 4, 5, 6];
  readonly timelineHours = Array.from({ length: 24 }, (_, i) => i);

  readonly canSave = computed(() => {
    const name = this._formName().trim();
    const dayparts = this._formDayparts();
    return name.length > 0 && dayparts.length > 0 && dayparts.every(dp => dp.name.trim().length > 0);
  });

  readonly canSaveOverride = computed(() => {
    return this._overrideDate().length > 0 && this._overrideLabel().trim().length > 0;
  });

  readonly upcomingOverrides = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.overrides().filter(o => o.date >= today).slice(0, 10);
  });

  readonly pastOverrides = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.overrides().filter(o => o.date < today);
  });

  ngOnInit(): void {
    this.menuService.loadMenuSchedules();
    this.checkUpcomingChange();
    this._notificationInterval = setInterval(() => this.checkUpcomingChange(), 60_000);
    this.destroyRef.onDestroy(() => {
      if (this._notificationInterval) clearInterval(this._notificationInterval);
    });
  }

  // --- Navigation ---

  showView(view: ScheduleView): void {
    this._view.set(view);
    if (view === 'preview') this.runPreview();
  }

  // --- Helpers ---

  getDayLabel(day: number): string {
    return getDaypartLabel(day);
  }

  isDaypartCurrentlyActive(daypart: Daypart): boolean {
    return isDaypartActive(daypart);
  }

  formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    let hour: number;
    if (h === 0) {
      hour = 12;
    } else if (h > 12) {
      hour = h - 12;
    } else {
      hour = h;
    }
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  }

  getTimelineWidth(dp: DaypartFormRow | Daypart): number {
    const [startH, startM] = dp.startTime.split(':').map(Number);
    const [endH, endM] = dp.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const duration = endMinutes > startMinutes ? endMinutes - startMinutes : 0;
    return (duration / 1440) * 100;
  }

  getTimelineLeft(dp: DaypartFormRow | Daypart): number {
    const [h, m] = dp.startTime.split(':').map(Number);
    return ((h * 60 + m) / 1440) * 100;
  }

  // --- Schedule Form ---

  openNewForm(): void {
    this._editingScheduleId.set(null);
    this._formName.set('');
    this._formIsDefault.set(this.schedules().length === 0);
    this._formDayparts.set([
      { name: 'Breakfast', startTime: '06:00', endTime: '11:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], isActive: true, displayOrder: 0 },
      { name: 'Lunch', startTime: '11:00', endTime: '16:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], isActive: true, displayOrder: 1 },
      { name: 'Dinner', startTime: '16:00', endTime: '23:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], isActive: true, displayOrder: 2 },
    ]);
    this._view.set('form');
  }

  openEditForm(schedule: MenuSchedule): void {
    this._editingScheduleId.set(schedule.id);
    this._formName.set(schedule.name);
    this._formIsDefault.set(schedule.isDefault);
    this._formDayparts.set(schedule.dayparts.map(dp => ({
      name: dp.name,
      startTime: dp.startTime,
      endTime: dp.endTime,
      daysOfWeek: [...dp.daysOfWeek],
      isActive: dp.isActive,
      displayOrder: dp.displayOrder,
    })));
    this._view.set('form');
  }

  closeForm(): void {
    this._view.set('list');
    this._editingScheduleId.set(null);
  }

  setFormName(val: string): void { this._formName.set(val); }
  setFormIsDefault(val: boolean): void { this._formIsDefault.set(val); }

  addDaypart(): void {
    const dayparts = this._formDayparts();
    this._formDayparts.set([...dayparts, {
      name: '',
      startTime: '00:00',
      endTime: '23:59',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      isActive: true,
      displayOrder: dayparts.length,
    }]);
  }

  removeDaypart(index: number): void {
    this._formDayparts.update(dps => dps.filter((_, i) => i !== index));
  }

  setDaypartName(index: number, val: string): void {
    this._formDayparts.update(dps => dps.map((dp, i) => i === index ? { ...dp, name: val } : dp));
  }

  setDaypartStartTime(index: number, val: string): void {
    this._formDayparts.update(dps => dps.map((dp, i) => i === index ? { ...dp, startTime: val } : dp));
  }

  setDaypartEndTime(index: number, val: string): void {
    this._formDayparts.update(dps => dps.map((dp, i) => i === index ? { ...dp, endTime: val } : dp));
  }

  toggleDaypartDay(index: number, day: number): void {
    this._formDayparts.update(dps => dps.map((dp, i) => {
      if (i !== index) return dp;
      const days = dp.daysOfWeek.includes(day)
        ? dp.daysOfWeek.filter(d => d !== day)
        : [...dp.daysOfWeek, day].sort((a, b) => a - b);
      return { ...dp, daysOfWeek: days };
    }));
  }

  toggleDaypartActive(index: number): void {
    this._formDayparts.update(dps => dps.map((dp, i) => i === index ? { ...dp, isActive: !dp.isActive } : dp));
  }

  async saveSchedule(): Promise<void> {
    const name = this._formName().trim();
    const dayparts = this._formDayparts();
    if (!name || dayparts.length === 0) return;

    const data = {
      name,
      isDefault: this._formIsDefault(),
      dayparts: dayparts.map((dp, i) => ({
        name: dp.name.trim(),
        startTime: dp.startTime,
        endTime: dp.endTime,
        daysOfWeek: dp.daysOfWeek,
        isActive: dp.isActive,
        displayOrder: i,
      })),
    };

    const editId = this._editingScheduleId();
    if (editId) {
      await this.menuService.updateMenuSchedule(editId, data);
    } else {
      await this.menuService.createMenuSchedule(data);
    }

    this.closeForm();
  }

  async deleteSchedule(schedule: MenuSchedule): Promise<void> {
    await this.menuService.deleteMenuSchedule(schedule.id);
  }

  setActiveSchedule(scheduleId: string | null): void {
    this.menuService.setActiveSchedule(scheduleId);
  }

  // --- Preview (Phase 2 Step 6) ---

  setPreviewDate(val: string): void {
    this._previewDate.set(val);
    this.runPreview();
  }

  setPreviewTime(val: string): void {
    this._previewTime.set(val);
    this.runPreview();
  }

  runPreview(): void {
    const dateStr = this._previewDate();
    const timeStr = this._previewTime();
    if (!dateStr) {
      this._previewResults.set([]);
      return;
    }

    const date = new Date(dateStr + 'T' + (timeStr || '12:00'));
    this._previewResults.set(this.menuService.previewMenuAt(date));
  }

  previewNow(): void {
    const now = new Date();
    this._previewDate.set(now.toISOString().split('T')[0]);
    this._previewTime.set(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    this.runPreview();
  }

  // --- Overrides (Phase 2 Step 7) ---

  openNewOverride(): void {
    this._editingOverrideId.set(null);
    this._overrideDate.set('');
    this._overrideLabel.set('');
    this._overrideMode.set('closed');
    this._overrideDayparts.set([]);
    this._showOverrideForm.set(true);
  }

  openEditOverride(override: ScheduleOverride): void {
    this._editingOverrideId.set(override.id);
    this._overrideDate.set(override.date);
    this._overrideLabel.set(override.label);
    this._overrideMode.set(override.mode);
    this._overrideDayparts.set(override.dayparts.map(dp => ({
      name: dp.name,
      startTime: dp.startTime,
      endTime: dp.endTime,
      daysOfWeek: dp.daysOfWeek,
      isActive: dp.isActive,
      displayOrder: dp.displayOrder,
    })));
    this._showOverrideForm.set(true);
  }

  closeOverrideForm(): void {
    this._showOverrideForm.set(false);
    this._editingOverrideId.set(null);
  }

  setOverrideDate(val: string): void { this._overrideDate.set(val); }
  setOverrideLabel(val: string): void { this._overrideLabel.set(val); }
  setOverrideMode(val: string): void { this._overrideMode.set(val as 'replace' | 'closed'); }

  addOverrideDaypart(): void {
    this._overrideDayparts.update(dps => [...dps, {
      name: '',
      startTime: '08:00',
      endTime: '22:00',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      isActive: true,
      displayOrder: dps.length,
    }]);
  }

  removeOverrideDaypart(index: number): void {
    this._overrideDayparts.update(dps => dps.filter((_, i) => i !== index));
  }

  setOverrideDpName(index: number, val: string): void {
    this._overrideDayparts.update(dps => dps.map((dp, i) => i === index ? { ...dp, name: val } : dp));
  }

  setOverrideDpStart(index: number, val: string): void {
    this._overrideDayparts.update(dps => dps.map((dp, i) => i === index ? { ...dp, startTime: val } : dp));
  }

  setOverrideDpEnd(index: number, val: string): void {
    this._overrideDayparts.update(dps => dps.map((dp, i) => i === index ? { ...dp, endTime: val } : dp));
  }

  saveOverride(): void {
    const date = this._overrideDate();
    const label = this._overrideLabel().trim();
    if (!date || !label) return;

    const data = {
      date,
      label,
      mode: this._overrideMode(),
      dayparts: this._overrideDayparts().map((dp, i) => ({
        id: crypto.randomUUID(),
        name: dp.name.trim(),
        startTime: dp.startTime,
        endTime: dp.endTime,
        daysOfWeek: dp.daysOfWeek,
        isActive: dp.isActive,
        displayOrder: i,
      })),
    };

    const editId = this._editingOverrideId();
    if (editId) {
      this.menuService.updateScheduleOverride(editId, data);
    } else {
      this.menuService.addScheduleOverride(data);
    }

    this.closeOverrideForm();
  }

  deleteOverride(id: string): void {
    this.menuService.deleteScheduleOverride(id);
  }

  // --- Notifications (Phase 2 Step 8) ---

  private checkUpcomingChange(): void {
    this._upcomingChange.set(this.menuService.getUpcomingDaypartChange());
  }

  dismissNotification(): void {
    this._upcomingChange.set(null);
  }
}
