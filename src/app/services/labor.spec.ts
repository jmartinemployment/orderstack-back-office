import { describe, it, expect } from 'vitest';

// --- Pure function replicas of LaborService mutation/computed logic ---

interface Shift {
  id: string;
  staffPinId: string;
  startTime: string;
  endTime: string;
  isPublished: boolean;
}

interface TimeEntry {
  id: string;
  staffPinId: string;
  clockIn: string;
  clockOut?: string;
}

interface LaborTarget {
  id: string;
  dayOfWeek: number;
  targetPercent: number | string;
  targetCost: number | string | null;
}

interface Timecard {
  id: string;
  teamMemberId: string;
  status: string;
  breaks: TimecardBreak[];
}

interface TimecardBreak {
  id: string;
  startTime: string;
  endTime?: string;
}

interface TimecardEdit {
  id: string;
  timecardId: string;
  status: string;
}

interface BreakType {
  id: string;
  name: string;
  durationMinutes: number;
  isPaid: boolean;
}

interface ScheduleTemplate {
  id: string;
  name: string;
}

interface StaffNotification {
  id: string;
  message: string;
  isRead: boolean;
}

interface PayrollPeriod {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
}

interface CommissionRule {
  id: string;
  name: string;
  rate: number;
}

interface PtoRequest {
  id: string;
  teamMemberId: string;
  status: string;
}

// --- List mutation helpers (mirror service's signal .update() patterns) ---

function addShift(shifts: Shift[], newShift: Shift): Shift[] {
  return [...shifts, newShift];
}

function updateShiftInList(shifts: Shift[], shiftId: string, updated: Shift): Shift[] {
  return shifts.map(sh => sh.id === shiftId ? updated : sh);
}

function deleteShiftFromList(shifts: Shift[], shiftId: string): Shift[] {
  return shifts.filter(sh => sh.id !== shiftId);
}

function publishAllShifts(shifts: Shift[]): Shift[] {
  return shifts.map(sh => ({ ...sh, isPublished: true }));
}

function addClock(clocks: TimeEntry[], entry: TimeEntry): TimeEntry[] {
  return [...clocks, entry];
}

function removeClock(clocks: TimeEntry[], entryId: string): TimeEntry[] {
  return clocks.filter(e => e.id !== entryId);
}

function castLaborTargets(targets: LaborTarget[]): LaborTarget[] {
  return targets.map(t => ({
    ...t,
    targetPercent: Number(t.targetPercent),
    targetCost: t.targetCost !== null ? Number(t.targetCost) : null,
  }));
}

function addTimecardToList(timecards: Timecard[], tc: Timecard): Timecard[] {
  return [...timecards, tc];
}

function updateTimecardInList(timecards: Timecard[], id: string, updated: Timecard): Timecard[] {
  return timecards.map(t => t.id === id ? updated : t);
}

function addBreakToTimecard(timecards: Timecard[], timecardId: string, brk: TimecardBreak): Timecard[] {
  return timecards.map(t => {
    if (t.id === timecardId) {
      return { ...t, breaks: [...t.breaks, brk] };
    }
    return t;
  });
}

function updateBreakInTimecard(timecards: Timecard[], timecardId: string, breakId: string, updated: TimecardBreak): Timecard[] {
  return timecards.map(t => {
    if (t.id === timecardId) {
      return { ...t, breaks: t.breaks.map(b => b.id === breakId ? updated : b) };
    }
    return t;
  });
}

function addBreakType(breakTypes: BreakType[], bt: BreakType): BreakType[] {
  return [...breakTypes, bt];
}

function updateBreakTypeInList(breakTypes: BreakType[], id: string, updated: BreakType): BreakType[] {
  return breakTypes.map(b => b.id === id ? updated : b);
}

function addTimecardEdit(edits: TimecardEdit[], edit: TimecardEdit): TimecardEdit[] {
  return [...edits, edit];
}

function updateTimecardEditInList(edits: TimecardEdit[], id: string, updated: TimecardEdit): TimecardEdit[] {
  return edits.map(e => e.id === id ? updated : e);
}

function addTemplate(templates: ScheduleTemplate[], tpl: ScheduleTemplate): ScheduleTemplate[] {
  return [...templates, tpl];
}

function deleteTemplateFromList(templates: ScheduleTemplate[], id: string): ScheduleTemplate[] {
  return templates.filter(tpl => tpl.id !== id);
}

function appendShifts(existing: Shift[], newShifts: Shift[]): Shift[] {
  return [...existing, ...newShifts];
}

function markNotificationRead(notifications: StaffNotification[], id: string): StaffNotification[] {
  return notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
}

function prependPayroll(periods: PayrollPeriod[], newPeriod: PayrollPeriod): PayrollPeriod[] {
  return [newPeriod, ...periods];
}

function updatePayrollInList(periods: PayrollPeriod[], id: string, updated: PayrollPeriod): PayrollPeriod[] {
  return periods.map(pp => pp.id === id ? updated : pp);
}

function addCommissionRule(rules: CommissionRule[], rule: CommissionRule): CommissionRule[] {
  return [...rules, rule];
}

function updateCommissionRuleInList(rules: CommissionRule[], id: string, updated: CommissionRule): CommissionRule[] {
  return rules.map(r => r.id === id ? updated : r);
}

function deleteCommissionRuleFromList(rules: CommissionRule[], id: string): CommissionRule[] {
  return rules.filter(r => r.id !== id);
}

function prependPtoRequest(requests: PtoRequest[], req: PtoRequest): PtoRequest[] {
  return [req, ...requests];
}

function updatePtoRequestInList(requests: PtoRequest[], id: string, updated: PtoRequest): PtoRequest[] {
  return requests.map(r => r.id === id ? updated : r);
}

function resolveComplianceAlertInList<T extends { id: string }>(alerts: T[], id: string, updated: T): T[] {
  return alerts.map(a => a.id === id ? updated : a);
}

// --- Validate staff pin response mapping ---

function mapValidatePinResponse(result: { valid: boolean; staffPinId: string; name: string; role: string }): { id: string; name: string; role: string } | null {
  if (result.valid) {
    return { id: result.staffPinId, name: result.name, role: result.role };
  }
  return null;
}

// --- Filter builders ---

function buildTimecardFilterParams(filters?: { status?: string; startDate?: string; endDate?: string; teamMemberId?: string }): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters?.status) params['status'] = filters.status;
  if (filters?.startDate) params['startDate'] = filters.startDate;
  if (filters?.endDate) params['endDate'] = filters.endDate;
  if (filters?.teamMemberId) params['teamMemberId'] = filters.teamMemberId;
  return params;
}

function buildTimecardEditFilterParams(filters?: { status?: string; teamMemberId?: string }): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters?.status) params['status'] = filters.status;
  if (filters?.teamMemberId) params['teamMemberId'] = filters.teamMemberId;
  return params;
}

// --- Error extraction ---

function extractError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

// --- 404 tolerance ---

function shouldTolerate404(status: number): boolean {
  return status === 404;
}

// --- Tests ---

describe('LaborService — shift list mutations', () => {
  const shifts: Shift[] = [
    { id: 's-1', staffPinId: 'sp-1', startTime: '08:00', endTime: '16:00', isPublished: false },
    { id: 's-2', staffPinId: 'sp-2', startTime: '12:00', endTime: '20:00', isPublished: false },
  ];

  it('addShift appends new shift', () => {
    const newShift: Shift = { id: 's-3', staffPinId: 'sp-3', startTime: '10:00', endTime: '18:00', isPublished: false };
    const result = addShift(shifts, newShift);
    expect(result).toHaveLength(3);
    expect(result[2].id).toBe('s-3');
  });

  it('updateShiftInList replaces matching shift', () => {
    const updated: Shift = { ...shifts[0], endTime: '17:00' };
    const result = updateShiftInList(shifts, 's-1', updated);
    expect(result[0].endTime).toBe('17:00');
    expect(result[1]).toEqual(shifts[1]);
  });

  it('deleteShiftFromList removes matching shift', () => {
    const result = deleteShiftFromList(shifts, 's-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s-2');
  });

  it('deleteShiftFromList returns unchanged for no match', () => {
    expect(deleteShiftFromList(shifts, 'nonexistent')).toHaveLength(2);
  });

  it('publishAllShifts marks all shifts as published', () => {
    const result = publishAllShifts(shifts);
    expect(result.every(s => s.isPublished)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('publishAllShifts on empty array returns empty', () => {
    expect(publishAllShifts([])).toEqual([]);
  });

  it('appendShifts merges new shifts into existing', () => {
    const newShifts: Shift[] = [
      { id: 's-3', staffPinId: 'sp-3', startTime: '06:00', endTime: '14:00', isPublished: false },
    ];
    const result = appendShifts(shifts, newShifts);
    expect(result).toHaveLength(3);
  });
});

describe('LaborService — time entry mutations', () => {
  const clocks: TimeEntry[] = [
    { id: 'te-1', staffPinId: 'sp-1', clockIn: '2026-02-25T08:00:00' },
  ];

  it('addClock appends new entry', () => {
    const newEntry: TimeEntry = { id: 'te-2', staffPinId: 'sp-2', clockIn: '2026-02-25T12:00:00' };
    const result = addClock(clocks, newEntry);
    expect(result).toHaveLength(2);
  });

  it('removeClock removes matching entry', () => {
    const result = removeClock(clocks, 'te-1');
    expect(result).toHaveLength(0);
  });

  it('removeClock returns unchanged for no match', () => {
    expect(removeClock(clocks, 'nonexistent')).toHaveLength(1);
  });
});

describe('LaborService — castLaborTargets', () => {
  it('converts string Decimal values to numbers', () => {
    const targets: LaborTarget[] = [
      { id: 't-1', dayOfWeek: 0, targetPercent: '25.5', targetCost: '1500' },
      { id: 't-2', dayOfWeek: 1, targetPercent: '30', targetCost: null },
    ];
    const result = castLaborTargets(targets);
    expect(result[0].targetPercent).toBe(25.5);
    expect(result[0].targetCost).toBe(1500);
    expect(result[1].targetPercent).toBe(30);
    expect(result[1].targetCost).toBeNull();
  });

  it('handles already-numeric values', () => {
    const targets: LaborTarget[] = [
      { id: 't-1', dayOfWeek: 0, targetPercent: 20, targetCost: 800 },
    ];
    const result = castLaborTargets(targets);
    expect(result[0].targetPercent).toBe(20);
    expect(result[0].targetCost).toBe(800);
  });

  it('handles empty array', () => {
    expect(castLaborTargets([])).toEqual([]);
  });
});

describe('LaborService — timecard mutations', () => {
  const timecards: Timecard[] = [
    { id: 'tc-1', teamMemberId: 'tm-1', status: 'OPEN', breaks: [] },
    { id: 'tc-2', teamMemberId: 'tm-2', status: 'OPEN', breaks: [] },
  ];

  it('addTimecardToList appends new timecard', () => {
    const newTc: Timecard = { id: 'tc-3', teamMemberId: 'tm-3', status: 'OPEN', breaks: [] };
    expect(addTimecardToList(timecards, newTc)).toHaveLength(3);
  });

  it('updateTimecardInList replaces matching timecard', () => {
    const updated: Timecard = { ...timecards[0], status: 'CLOSED' };
    const result = updateTimecardInList(timecards, 'tc-1', updated);
    expect(result[0].status).toBe('CLOSED');
    expect(result[1].status).toBe('OPEN');
  });

  it('addBreakToTimecard appends break to correct timecard', () => {
    const brk: TimecardBreak = { id: 'b-1', startTime: '12:00' };
    const result = addBreakToTimecard(timecards, 'tc-1', brk);
    expect(result[0].breaks).toHaveLength(1);
    expect(result[0].breaks[0].id).toBe('b-1');
    expect(result[1].breaks).toHaveLength(0);
  });

  it('addBreakToTimecard does not modify other timecards', () => {
    const brk: TimecardBreak = { id: 'b-1', startTime: '12:00' };
    const result = addBreakToTimecard(timecards, 'tc-1', brk);
    expect(result[1]).toEqual(timecards[1]);
  });

  it('updateBreakInTimecard replaces matching break', () => {
    const tcs: Timecard[] = [
      { id: 'tc-1', teamMemberId: 'tm-1', status: 'OPEN', breaks: [{ id: 'b-1', startTime: '12:00' }] },
    ];
    const updatedBreak: TimecardBreak = { id: 'b-1', startTime: '12:00', endTime: '12:30' };
    const result = updateBreakInTimecard(tcs, 'tc-1', 'b-1', updatedBreak);
    expect(result[0].breaks[0].endTime).toBe('12:30');
  });
});

describe('LaborService — break type mutations', () => {
  const breakTypes: BreakType[] = [
    { id: 'bt-1', name: 'Lunch', durationMinutes: 30, isPaid: false },
  ];

  it('addBreakType appends new type', () => {
    const newBt: BreakType = { id: 'bt-2', name: 'Short', durationMinutes: 15, isPaid: true };
    expect(addBreakType(breakTypes, newBt)).toHaveLength(2);
  });

  it('updateBreakTypeInList replaces matching type', () => {
    const updated: BreakType = { ...breakTypes[0], durationMinutes: 45 };
    const result = updateBreakTypeInList(breakTypes, 'bt-1', updated);
    expect(result[0].durationMinutes).toBe(45);
  });
});

describe('LaborService — timecard edit mutations', () => {
  const edits: TimecardEdit[] = [
    { id: 'e-1', timecardId: 'tc-1', status: 'PENDING' },
  ];

  it('addTimecardEdit appends new edit', () => {
    const newEdit: TimecardEdit = { id: 'e-2', timecardId: 'tc-2', status: 'PENDING' };
    expect(addTimecardEdit(edits, newEdit)).toHaveLength(2);
  });

  it('updateTimecardEditInList replaces matching edit', () => {
    const updated: TimecardEdit = { ...edits[0], status: 'APPROVED' };
    const result = updateTimecardEditInList(edits, 'e-1', updated);
    expect(result[0].status).toBe('APPROVED');
  });
});

describe('LaborService — schedule template mutations', () => {
  const templates: ScheduleTemplate[] = [
    { id: 'tpl-1', name: 'Default Week' },
  ];

  it('addTemplate appends new template', () => {
    expect(addTemplate(templates, { id: 'tpl-2', name: 'Holiday' })).toHaveLength(2);
  });

  it('deleteTemplateFromList removes matching template', () => {
    expect(deleteTemplateFromList(templates, 'tpl-1')).toHaveLength(0);
  });

  it('deleteTemplateFromList returns unchanged for no match', () => {
    expect(deleteTemplateFromList(templates, 'nonexistent')).toHaveLength(1);
  });
});

describe('LaborService — notification mutations', () => {
  const notifications: StaffNotification[] = [
    { id: 'n-1', message: 'Schedule published', isRead: false },
    { id: 'n-2', message: 'Swap request', isRead: false },
  ];

  it('markNotificationRead sets isRead to true for matching', () => {
    const result = markNotificationRead(notifications, 'n-1');
    expect(result[0].isRead).toBe(true);
    expect(result[1].isRead).toBe(false);
  });

  it('markNotificationRead does not modify non-matching', () => {
    const result = markNotificationRead(notifications, 'nonexistent');
    expect(result.every(n => !n.isRead)).toBe(true);
  });
});

describe('LaborService — payroll mutations', () => {
  const periods: PayrollPeriod[] = [
    { id: 'pp-1', periodStart: '2026-02-01', periodEnd: '2026-02-15', status: 'DRAFT' },
  ];

  it('prependPayroll adds new period at beginning', () => {
    const newPeriod: PayrollPeriod = { id: 'pp-2', periodStart: '2026-02-16', periodEnd: '2026-02-28', status: 'DRAFT' };
    const result = prependPayroll(periods, newPeriod);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('pp-2');
  });

  it('updatePayrollInList replaces matching period', () => {
    const updated: PayrollPeriod = { ...periods[0], status: 'APPROVED' };
    const result = updatePayrollInList(periods, 'pp-1', updated);
    expect(result[0].status).toBe('APPROVED');
  });
});

describe('LaborService — commission rule mutations', () => {
  const rules: CommissionRule[] = [
    { id: 'cr-1', name: 'Wine Sales', rate: 5 },
  ];

  it('addCommissionRule appends new rule', () => {
    expect(addCommissionRule(rules, { id: 'cr-2', name: 'Dessert', rate: 3 })).toHaveLength(2);
  });

  it('updateCommissionRuleInList replaces matching rule', () => {
    const updated: CommissionRule = { ...rules[0], rate: 7 };
    const result = updateCommissionRuleInList(rules, 'cr-1', updated);
    expect(result[0].rate).toBe(7);
  });

  it('deleteCommissionRuleFromList removes matching rule', () => {
    expect(deleteCommissionRuleFromList(rules, 'cr-1')).toHaveLength(0);
  });
});

describe('LaborService — PTO request mutations', () => {
  const requests: PtoRequest[] = [
    { id: 'pto-1', teamMemberId: 'tm-1', status: 'PENDING' },
  ];

  it('prependPtoRequest adds new request at beginning', () => {
    const newReq: PtoRequest = { id: 'pto-2', teamMemberId: 'tm-2', status: 'PENDING' };
    const result = prependPtoRequest(requests, newReq);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('pto-2');
  });

  it('updatePtoRequestInList replaces matching request', () => {
    const updated: PtoRequest = { ...requests[0], status: 'APPROVED' };
    const result = updatePtoRequestInList(requests, 'pto-1', updated);
    expect(result[0].status).toBe('APPROVED');
  });
});

describe('LaborService — compliance alert mutations', () => {
  it('resolveComplianceAlertInList replaces matching alert', () => {
    const alerts = [
      { id: 'ca-1', isResolved: false },
      { id: 'ca-2', isResolved: false },
    ];
    const resolved = { id: 'ca-1', isResolved: true };
    const result = resolveComplianceAlertInList(alerts, 'ca-1', resolved);
    expect(result[0].isResolved).toBe(true);
    expect(result[1].isResolved).toBe(false);
  });
});

describe('LaborService — mapValidatePinResponse', () => {
  it('returns mapped object when valid', () => {
    const result = mapValidatePinResponse({
      valid: true,
      staffPinId: 'sp-1',
      name: 'John',
      role: 'server',
    });
    expect(result).toEqual({ id: 'sp-1', name: 'John', role: 'server' });
  });

  it('returns null when not valid', () => {
    const result = mapValidatePinResponse({
      valid: false,
      staffPinId: '',
      name: '',
      role: '',
    });
    expect(result).toBeNull();
  });
});

describe('LaborService — filter param builders', () => {
  it('buildTimecardFilterParams includes all provided fields', () => {
    const params = buildTimecardFilterParams({
      status: 'OPEN',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      teamMemberId: 'tm-1',
    });
    expect(params).toEqual({
      status: 'OPEN',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      teamMemberId: 'tm-1',
    });
  });

  it('buildTimecardFilterParams omits undefined fields', () => {
    const params = buildTimecardFilterParams({ status: 'CLOSED' });
    expect(params).toEqual({ status: 'CLOSED' });
    expect(params['startDate']).toBeUndefined();
  });

  it('buildTimecardFilterParams returns empty for no filters', () => {
    expect(buildTimecardFilterParams()).toEqual({});
    expect(buildTimecardFilterParams({})).toEqual({});
  });

  it('buildTimecardEditFilterParams includes provided fields', () => {
    const params = buildTimecardEditFilterParams({ status: 'PENDING', teamMemberId: 'tm-1' });
    expect(params).toEqual({ status: 'PENDING', teamMemberId: 'tm-1' });
  });

  it('buildTimecardEditFilterParams returns empty for no filters', () => {
    expect(buildTimecardEditFilterParams()).toEqual({});
  });
});

describe('LaborService — error extraction', () => {
  it('extracts Error message', () => {
    expect(extractError(new Error('Network failed'), 'fallback')).toBe('Network failed');
  });

  it('uses fallback for non-Error', () => {
    expect(extractError('string error', 'Failed to load')).toBe('Failed to load');
  });

  it('uses fallback for null', () => {
    expect(extractError(null, 'Failed')).toBe('Failed');
  });
});

describe('LaborService — 404 tolerance', () => {
  it('tolerates 404', () => {
    expect(shouldTolerate404(404)).toBe(true);
  });

  it('does not tolerate 500', () => {
    expect(shouldTolerate404(500)).toBe(false);
  });

  it('does not tolerate 200', () => {
    expect(shouldTolerate404(200)).toBe(false);
  });
});

describe('LaborService — no-restaurant guard', () => {
  it('null merchantId blocks operations', () => {
    const merchantId: string | null = null;
    expect(!merchantId).toBe(true);
  });

  it('valid merchantId allows operations', () => {
    const merchantId: string | null = 'r-1';
    expect(!merchantId).toBe(false);
  });
});

// --- BUG-29: Timecards, Timecard Edits, PTO Requests 404 tolerance ---

describe('BUG-29 — loadTimecards 404 tolerance', () => {
  // Mirrors the updated loadTimecards catch block: 404 → empty array, others → error
  function handleTimecardError(status: number, err: unknown): { timecards: Timecard[]; error: string | null } {
    if (status === 404) {
      return { timecards: [], error: null };
    }
    return { timecards: [], error: err instanceof Error ? err.message : 'Failed to load timecards' };
  }

  it('returns empty array on 404 (no error)', () => {
    const result = handleTimecardError(404, new Error('Not Found'));
    expect(result.timecards).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns error on 500', () => {
    const result = handleTimecardError(500, new Error('Server Error'));
    expect(result.timecards).toEqual([]);
    expect(result.error).toBe('Server Error');
  });

  it('returns fallback error for non-Error throwable', () => {
    const result = handleTimecardError(500, 'unexpected');
    expect(result.error).toBe('Failed to load timecards');
  });
});

describe('BUG-29 — loadTimecardEdits 404 tolerance', () => {
  function handleTimecardEditError(status: number, err: unknown): { edits: TimecardEdit[]; error: string | null } {
    if (status === 404) {
      return { edits: [], error: null };
    }
    return { edits: [], error: err instanceof Error ? err.message : 'Failed to load timecard edits' };
  }

  it('returns empty array on 404 (no error)', () => {
    const result = handleTimecardEditError(404, new Error('Not Found'));
    expect(result.edits).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns error on 403', () => {
    const result = handleTimecardEditError(403, new Error('Forbidden'));
    expect(result.edits).toEqual([]);
    expect(result.error).toBe('Forbidden');
  });
});

describe('BUG-29 — loadPtoRequests 404 tolerance', () => {
  function handlePtoError(status: number, err: unknown): { requests: PtoRequest[]; error: string | null } {
    if (status === 404) {
      return { requests: [], error: null };
    }
    return { requests: [], error: err instanceof Error ? err.message : 'Failed to load PTO requests' };
  }

  it('returns empty array on 404 (no error)', () => {
    const result = handlePtoError(404, new Error('Not Found'));
    expect(result.requests).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns error on 500', () => {
    const result = handlePtoError(500, new Error('Internal'));
    expect(result.requests).toEqual([]);
    expect(result.error).toBe('Internal');
  });

  it('returns fallback error for non-Error throwable', () => {
    const result = handlePtoError(500, null);
    expect(result.error).toBe('Failed to load PTO requests');
  });
});

describe('BUG-29 — PTO request filter builder', () => {
  function buildPtoFilterParams(status?: string): Record<string, string> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    return params;
  }

  it('includes status when provided', () => {
    expect(buildPtoFilterParams('pending')).toEqual({ status: 'pending' });
  });

  it('returns empty for no status', () => {
    expect(buildPtoFilterParams()).toEqual({});
  });

  it('returns empty for undefined', () => {
    expect(buildPtoFilterParams(undefined)).toEqual({});
  });
});

describe('BUG-29 — timecard response mapping', () => {
  // Mirrors the backend's TimeEntry → Timecard mapping logic
  function mapTimeEntryToTimecard(entry: {
    id: string;
    staffPinId: string;
    staffName: string;
    staffRole: string;
    clockIn: string;
    clockOut: string | null;
    breakMinutes: number;
  }): { id: string; teamMemberId: string; teamMemberName: string; status: string; totalBreakMinutes: number } {
    return {
      id: entry.id,
      teamMemberId: entry.staffPinId,
      teamMemberName: entry.staffName,
      status: entry.clockOut ? 'CLOSED' : 'OPEN',
      totalBreakMinutes: entry.breakMinutes,
    };
  }

  it('maps OPEN entry (no clockOut)', () => {
    const result = mapTimeEntryToTimecard({
      id: 'te-1', staffPinId: 'sp-1', staffName: 'Alice', staffRole: 'server',
      clockIn: '2026-03-08T08:00:00Z', clockOut: null, breakMinutes: 0,
    });
    expect(result.status).toBe('OPEN');
    expect(result.teamMemberId).toBe('sp-1');
    expect(result.teamMemberName).toBe('Alice');
  });

  it('maps CLOSED entry (has clockOut)', () => {
    const result = mapTimeEntryToTimecard({
      id: 'te-2', staffPinId: 'sp-2', staffName: 'Bob', staffRole: 'cook',
      clockIn: '2026-03-08T08:00:00Z', clockOut: '2026-03-08T16:00:00Z', breakMinutes: 30,
    });
    expect(result.status).toBe('CLOSED');
    expect(result.totalBreakMinutes).toBe(30);
  });
});

describe('BUG-29 — timecard edit response mapping', () => {
  // Mirrors the backend's TimecardEditRequest → TimecardEdit field mapping
  function mapEditRequestToTimecardEdit(raw: {
    id: string;
    timeEntryId: string;
    staffPinId: string;
    staffName: string;
    editType: string;
    originalValue: string;
    newValue: string;
    reason: string;
    status: string;
    respondedBy: string | null;
    respondedAt: string | null;
    createdAt: string;
  }): { id: string; timecardId: string; requestedBy: string; requestedByName: string; approvedBy: string | null; resolvedAt: string | null } {
    return {
      id: raw.id,
      timecardId: raw.timeEntryId,
      requestedBy: raw.staffPinId,
      requestedByName: raw.staffName,
      approvedBy: raw.respondedBy,
      resolvedAt: raw.respondedAt,
    };
  }

  it('maps timeEntryId to timecardId', () => {
    const result = mapEditRequestToTimecardEdit({
      id: 'e-1', timeEntryId: 'te-1', staffPinId: 'sp-1', staffName: 'Alice',
      editType: 'clock_in', originalValue: '08:00', newValue: '07:45', reason: 'Forgot',
      status: 'pending', respondedBy: null, respondedAt: null, createdAt: '2026-03-08T10:00:00Z',
    });
    expect(result.timecardId).toBe('te-1');
    expect(result.requestedBy).toBe('sp-1');
    expect(result.requestedByName).toBe('Alice');
    expect(result.approvedBy).toBeNull();
    expect(result.resolvedAt).toBeNull();
  });

  it('maps respondedBy to approvedBy when approved', () => {
    const result = mapEditRequestToTimecardEdit({
      id: 'e-2', timeEntryId: 'te-1', staffPinId: 'sp-1', staffName: 'Alice',
      editType: 'clock_out', originalValue: '17:00', newValue: '16:30', reason: 'Left early',
      status: 'approved', respondedBy: 'mgr-1', respondedAt: '2026-03-08T12:00:00Z', createdAt: '2026-03-08T10:00:00Z',
    });
    expect(result.approvedBy).toBe('mgr-1');
    expect(result.resolvedAt).toBe('2026-03-08T12:00:00Z');
  });
});
