import '../../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { signal, computed } from '@angular/core';
import { of } from 'rxjs';
import { ScheduleManagement } from './schedule-management';
import { MenuService } from '../../../services/menu';
import { AuthService } from '../../../services/auth';
import type { MenuSchedule, ScheduleOverride } from '../../../models/index';

function createMockAuthService() {
  return {
    isAuthenticated: computed(() => true),
    selectedMerchantId: signal<string | null>('r-1').asReadonly(),
  };
}

function createTestSchedule(): MenuSchedule {
  return {
    id: 'sched-1',
    merchantId: 'r-1',
    name: 'Regular Hours',
    isDefault: true,
    dayparts: [
      { id: 'dp-1', name: 'Breakfast', startTime: '06:00', endTime: '11:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], isActive: true, displayOrder: 0 },
      { id: 'dp-2', name: 'Lunch', startTime: '11:00', endTime: '16:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], isActive: true, displayOrder: 1 },
    ],
  };
}

function createMockMenuService() {
  return {
    menuSchedules: signal<MenuSchedule[]>([createTestSchedule()]).asReadonly(),
    activeScheduleId: signal<string | null>('sched-1').asReadonly(),
    scheduleOverrides: signal<ScheduleOverride[]>([]).asReadonly(),
    loadMenuSchedules: vi.fn(),
    createMenuSchedule: vi.fn().mockResolvedValue(undefined),
    updateMenuSchedule: vi.fn().mockResolvedValue(undefined),
    deleteMenuSchedule: vi.fn().mockResolvedValue(undefined),
    setActiveSchedule: vi.fn(),
    addScheduleOverride: vi.fn(),
    updateScheduleOverride: vi.fn(),
    deleteScheduleOverride: vi.fn(),
    previewMenuAt: vi.fn().mockReturnValue([]),
    getUpcomingDaypartChange: vi.fn().mockReturnValue(null),
    // Stubs for other menu service properties used by child components
    categories: signal([]).asReadonly(),
    allItems: signal([]).asReadonly(),
    isLoading: signal(false).asReadonly(),
    error: signal<string | null>(null).asReadonly(),
    crudSupported: signal(true).asReadonly(),
    reportingCategories: signal([]).asReadonly(),
    loadMenu: vi.fn(),
    loadReportingCategories: vi.fn(),
  };
}

describe('ScheduleManagement', () => {
  let fixture: ComponentFixture<ScheduleManagement>;
  let component: ScheduleManagement;
  let menuService: ReturnType<typeof createMockMenuService>;

  beforeEach(() => {
    vi.useFakeTimers();
    menuService = createMockMenuService();

    TestBed.configureTestingModule({
      imports: [ScheduleManagement],
      providers: [
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: MenuService, useValue: menuService },
        { provide: HttpClient, useValue: { get: vi.fn().mockReturnValue(of([])) } },
      ],
    });
    fixture = TestBed.createComponent(ScheduleManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads schedules on init', () => {
    expect(menuService.loadMenuSchedules).toHaveBeenCalled();
  });

  it('defaults to list view', () => {
    expect(component.view()).toBe('list');
  });

  // --- Navigation ---

  it('showView changes the current view', () => {
    component.showView('form');
    expect(component.view()).toBe('form');
  });

  it('showView preview runs preview', () => {
    component.showView('preview');
    expect(component.view()).toBe('preview');
  });

  // --- Schedule form ---

  it('openNewForm sets up form view with default dayparts', () => {
    component.openNewForm();
    expect(component.view()).toBe('form');
    expect(component.editingScheduleId()).toBeNull();
    expect(component.formDayparts().length).toBe(3); // Breakfast, Lunch, Dinner
    expect(component.formDayparts()[0].name).toBe('Breakfast');
  });

  it('openEditForm populates from existing schedule', () => {
    component.openEditForm(createTestSchedule());
    expect(component.view()).toBe('form');
    expect(component.editingScheduleId()).toBe('sched-1');
    expect(component.formName()).toBe('Regular Hours');
    expect(component.formIsDefault()).toBe(true);
    expect(component.formDayparts().length).toBe(2);
  });

  it('closeForm returns to list view', () => {
    component.openNewForm();
    component.closeForm();
    expect(component.view()).toBe('list');
    expect(component.editingScheduleId()).toBeNull();
  });

  it('setFormName updates name', () => {
    component.setFormName('Weekend Hours');
    expect(component.formName()).toBe('Weekend Hours');
  });

  it('setFormIsDefault updates default flag', () => {
    component.setFormIsDefault(true);
    expect(component.formIsDefault()).toBe(true);
  });

  // --- Daypart CRUD ---

  it('addDaypart adds a new daypart row', () => {
    component.openNewForm();
    const initial = component.formDayparts().length;
    component.addDaypart();
    expect(component.formDayparts().length).toBe(initial + 1);
  });

  it('removeDaypart removes by index', () => {
    component.openNewForm();
    const initial = component.formDayparts().length;
    component.removeDaypart(0);
    expect(component.formDayparts().length).toBe(initial - 1);
  });

  it('setDaypartName updates name', () => {
    component.openNewForm();
    component.setDaypartName(0, 'Brunch');
    expect(component.formDayparts()[0].name).toBe('Brunch');
  });

  it('setDaypartStartTime updates start', () => {
    component.openNewForm();
    component.setDaypartStartTime(0, '07:00');
    expect(component.formDayparts()[0].startTime).toBe('07:00');
  });

  it('setDaypartEndTime updates end', () => {
    component.openNewForm();
    component.setDaypartEndTime(0, '12:00');
    expect(component.formDayparts()[0].endTime).toBe('12:00');
  });

  it('toggleDaypartDay adds and removes days', () => {
    component.openNewForm();
    // Default has all 7 days
    component.toggleDaypartDay(0, 0); // remove Sunday
    expect(component.formDayparts()[0].daysOfWeek).not.toContain(0);
    component.toggleDaypartDay(0, 0); // add Sunday back
    expect(component.formDayparts()[0].daysOfWeek).toContain(0);
  });

  it('toggleDaypartActive flips active state', () => {
    component.openNewForm();
    expect(component.formDayparts()[0].isActive).toBe(true);
    component.toggleDaypartActive(0);
    expect(component.formDayparts()[0].isActive).toBe(false);
  });

  // --- canSave ---

  it('canSave is true with name and dayparts', () => {
    component.openNewForm();
    component.setFormName('Test');
    expect(component.canSave()).toBe(true);
  });

  it('canSave is false with empty name', () => {
    component.openNewForm();
    component.setFormName('');
    expect(component.canSave()).toBe(false);
  });

  it('canSave is false with no dayparts', () => {
    component.openNewForm();
    component.setFormName('Test');
    // Remove all dayparts
    while (component.formDayparts().length > 0) {
      component.removeDaypart(0);
    }
    expect(component.canSave()).toBe(false);
  });

  it('canSave is false when daypart name is empty', () => {
    component.openNewForm();
    component.setFormName('Test');
    component.setDaypartName(0, '');
    expect(component.canSave()).toBe(false);
  });

  // --- Save schedule ---

  it('saveSchedule creates new schedule', async () => {
    component.openNewForm();
    component.setFormName('Brunch Schedule');
    await component.saveSchedule();
    expect(menuService.createMenuSchedule).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Brunch Schedule',
    }));
    expect(component.view()).toBe('list');
  });

  it('saveSchedule updates existing schedule', async () => {
    component.openEditForm(createTestSchedule());
    component.setFormName('Updated Hours');
    await component.saveSchedule();
    expect(menuService.updateMenuSchedule).toHaveBeenCalledWith('sched-1', expect.objectContaining({
      name: 'Updated Hours',
    }));
  });

  it('saveSchedule does nothing with empty name', async () => {
    component.openNewForm();
    component.setFormName('');
    await component.saveSchedule();
    expect(menuService.createMenuSchedule).not.toHaveBeenCalled();
  });

  // --- Delete / Active ---

  it('deleteSchedule calls service', async () => {
    await component.deleteSchedule(createTestSchedule());
    expect(menuService.deleteMenuSchedule).toHaveBeenCalledWith('sched-1');
  });

  it('setActiveSchedule delegates to service', () => {
    component.setActiveSchedule('sched-1');
    expect(menuService.setActiveSchedule).toHaveBeenCalledWith('sched-1');
  });

  // --- Helpers ---

  it('formatTime formats correctly', () => {
    expect(component.formatTime('06:00')).toBe('6:00 AM');
    expect(component.formatTime('13:30')).toBe('1:30 PM');
    expect(component.formatTime('00:00')).toBe('12:00 AM');
  });

  it('getTimelineWidth calculates percentage', () => {
    const dp = { name: 'Test', startTime: '06:00', endTime: '12:00', daysOfWeek: [], isActive: true, displayOrder: 0 };
    const width = component.getTimelineWidth(dp);
    // 6 hours = 360 minutes / 1440 * 100 = 25%
    expect(width).toBeCloseTo(25);
  });

  it('getTimelineLeft calculates percentage', () => {
    const dp = { name: 'Test', startTime: '06:00', endTime: '12:00', daysOfWeek: [], isActive: true, displayOrder: 0 };
    const left = component.getTimelineLeft(dp);
    // 6 * 60 / 1440 * 100 = 25%
    expect(left).toBeCloseTo(25);
  });

  // --- Override form ---

  it('openNewOverride shows override form', () => {
    component.openNewOverride();
    expect(component.showOverrideForm()).toBe(true);
    expect(component.editingOverrideId()).toBeNull();
    expect(component.overrideMode()).toBe('closed');
  });

  it('closeOverrideForm hides form', () => {
    component.openNewOverride();
    component.closeOverrideForm();
    expect(component.showOverrideForm()).toBe(false);
  });

  it('canSaveOverride requires date and label', () => {
    component.openNewOverride();
    expect(component.canSaveOverride()).toBe(false);
    component.setOverrideDate('2025-12-25');
    expect(component.canSaveOverride()).toBe(false);
    component.setOverrideLabel('Christmas');
    expect(component.canSaveOverride()).toBe(true);
  });

  it('saveOverride creates new override', () => {
    component.openNewOverride();
    component.setOverrideDate('2025-12-25');
    component.setOverrideLabel('Christmas');
    component.setOverrideMode('closed');
    component.saveOverride();
    expect(menuService.addScheduleOverride).toHaveBeenCalledWith(expect.objectContaining({
      date: '2025-12-25',
      label: 'Christmas',
      mode: 'closed',
    }));
    expect(component.showOverrideForm()).toBe(false);
  });

  it('addOverrideDaypart adds daypart', () => {
    component.openNewOverride();
    component.addOverrideDaypart();
    expect(component.overrideDayparts().length).toBe(1);
  });

  it('removeOverrideDaypart removes by index', () => {
    component.openNewOverride();
    component.addOverrideDaypart();
    component.addOverrideDaypart();
    component.removeOverrideDaypart(0);
    expect(component.overrideDayparts().length).toBe(1);
  });

  it('deleteOverride delegates to service', () => {
    component.deleteOverride('ovr-1');
    expect(menuService.deleteScheduleOverride).toHaveBeenCalledWith('ovr-1');
  });

  // --- Notifications ---

  it('dismissNotification clears upcoming change', () => {
    component.dismissNotification();
    expect(component.upcomingChange()).toBeNull();
  });

  it('checks for upcoming changes periodically', () => {
    expect(menuService.getUpcomingDaypartChange).toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(menuService.getUpcomingDaypartChange).toHaveBeenCalledTimes(2);
  });
});
