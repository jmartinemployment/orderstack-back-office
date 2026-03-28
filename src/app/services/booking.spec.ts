import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface Reservation {
  id: string;
  reservationTime: string;
  status: string;
  guestName: string;
}

interface WaitlistEntry {
  id: string;
  status: 'waiting' | 'notified' | 'seated' | 'cancelled';
  position: number;
  onMyWayAt: string | null;
}

interface EventBooking {
  id: string;
  date: string;
  name: string;
}

interface RecurringReservation {
  id: string;
  isActive: boolean;
}

interface TurnTimeStats {
  overall: number;
}

interface CalendarConnection {
  status: 'connected' | 'disconnected';
}

// --- Pure function replicas of BookingService computed logic ---

function activeWaitlist(entries: WaitlistEntry[]): WaitlistEntry[] {
  return entries
    .filter(e => e.status === 'waiting' || e.status === 'notified')
    .sort((a, b) => a.position - b.position);
}

function onMyWayEntries(entries: WaitlistEntry[]): WaitlistEntry[] {
  return entries.filter(e => e.onMyWayAt !== null && e.status === 'waiting');
}

function waitlistCount(entries: WaitlistEntry[]): number {
  return activeWaitlist(entries).length;
}

function todayReservations(reservations: Reservation[], today: string): Reservation[] {
  return reservations.filter(r => r.reservationTime.startsWith(today));
}

function upcomingReservations(reservations: Reservation[], now: string): Reservation[] {
  return reservations
    .filter(r => r.reservationTime > now && r.status !== 'cancelled' && r.status !== 'no-show')
    .sort((a, b) => a.reservationTime.localeCompare(b.reservationTime));
}

function pastReservations(reservations: Reservation[], now: string): Reservation[] {
  return reservations
    .filter(r => r.reservationTime < now || r.status === 'completed' || r.status === 'cancelled' || r.status === 'no-show')
    .sort((a, b) => b.reservationTime.localeCompare(a.reservationTime));
}

function upcomingEvents(events: EventBooking[], today: string): EventBooking[] {
  return events
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function pastEvents(events: EventBooking[], today: string): EventBooking[] {
  return events
    .filter(e => e.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function activeRecurring(reservations: RecurringReservation[]): RecurringReservation[] {
  return reservations.filter(r => r.isActive);
}

function dynamicTurnTime(stats: TurnTimeStats | null): number {
  return stats?.overall ?? 45;
}

function isCalendarConnected(connection: CalendarConnection | null): boolean {
  return connection?.status === 'connected';
}

// --- List mutations ---

function addReservation(list: Reservation[], reservation: Reservation): Reservation[] {
  return [reservation, ...list];
}

function updateReservationInList(list: Reservation[], id: string, updated: Reservation): Reservation[] {
  return list.map(r => r.id === id ? updated : r);
}

function addWaitlistEntry(list: WaitlistEntry[], entry: WaitlistEntry): WaitlistEntry[] {
  return [...list, entry];
}

function removeWaitlistEntry(list: WaitlistEntry[], id: string): WaitlistEntry[] {
  return list.filter(e => e.id !== id);
}

// --- Tests ---

describe('BookingService — activeWaitlist', () => {
  const entries: WaitlistEntry[] = [
    { id: 'w-1', status: 'waiting', position: 3, onMyWayAt: null },
    { id: 'w-2', status: 'seated', position: 1, onMyWayAt: null },
    { id: 'w-3', status: 'notified', position: 2, onMyWayAt: null },
    { id: 'w-4', status: 'cancelled', position: 4, onMyWayAt: null },
  ];

  it('includes only waiting and notified', () => {
    expect(activeWaitlist(entries)).toHaveLength(2);
  });

  it('sorts by position ascending', () => {
    const result = activeWaitlist(entries);
    expect(result[0].id).toBe('w-3'); // position 2
    expect(result[1].id).toBe('w-1'); // position 3
  });

  it('returns empty for all seated/cancelled', () => {
    const entries: WaitlistEntry[] = [
      { id: 'w-1', status: 'seated', position: 1, onMyWayAt: null },
    ];
    expect(activeWaitlist(entries)).toHaveLength(0);
  });
});

describe('BookingService — onMyWayEntries', () => {
  it('includes waiting entries with onMyWayAt set', () => {
    const entries: WaitlistEntry[] = [
      { id: 'w-1', status: 'waiting', position: 1, onMyWayAt: '2026-02-25T12:00:00' },
      { id: 'w-2', status: 'waiting', position: 2, onMyWayAt: null },
      { id: 'w-3', status: 'seated', position: 3, onMyWayAt: '2026-02-25T12:00:00' },
    ];
    const result = onMyWayEntries(entries);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('w-1');
  });
});

describe('BookingService — waitlistCount', () => {
  it('counts active entries', () => {
    const entries: WaitlistEntry[] = [
      { id: 'w-1', status: 'waiting', position: 1, onMyWayAt: null },
      { id: 'w-2', status: 'seated', position: 2, onMyWayAt: null },
    ];
    expect(waitlistCount(entries)).toBe(1);
  });
});

describe('BookingService — todayReservations', () => {
  it('filters by today date prefix', () => {
    const reservations: Reservation[] = [
      { id: 'r-1', reservationTime: '2026-02-25T18:00:00', status: 'confirmed', guestName: 'A' },
      { id: 'r-2', reservationTime: '2026-02-26T18:00:00', status: 'confirmed', guestName: 'B' },
    ];
    expect(todayReservations(reservations, '2026-02-25')).toHaveLength(1);
  });
});

describe('BookingService — upcomingReservations', () => {
  it('excludes cancelled and no-show, sorts ascending', () => {
    const now = '2026-02-25T12:00:00';
    const reservations: Reservation[] = [
      { id: 'r-1', reservationTime: '2026-02-25T19:00:00', status: 'confirmed', guestName: 'A' },
      { id: 'r-2', reservationTime: '2026-02-25T18:00:00', status: 'cancelled', guestName: 'B' },
      { id: 'r-3', reservationTime: '2026-02-26T20:00:00', status: 'confirmed', guestName: 'C' },
      { id: 'r-4', reservationTime: '2026-02-24T10:00:00', status: 'confirmed', guestName: 'D' },
    ];
    const result = upcomingReservations(reservations, now);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('r-1');
    expect(result[1].id).toBe('r-3');
  });
});

describe('BookingService — pastReservations', () => {
  it('includes past times, completed, cancelled, no-show', () => {
    const now = '2026-02-25T12:00:00';
    const reservations: Reservation[] = [
      { id: 'r-1', reservationTime: '2026-02-24T18:00:00', status: 'completed', guestName: 'A' },
      { id: 'r-2', reservationTime: '2026-02-26T18:00:00', status: 'cancelled', guestName: 'B' },
      { id: 'r-3', reservationTime: '2026-02-25T20:00:00', status: 'confirmed', guestName: 'C' },
    ];
    const result = pastReservations(reservations, now);
    expect(result).toHaveLength(2); // r-1 (past time), r-2 (cancelled)
  });

  it('sorts by reservationTime descending', () => {
    const now = '2026-02-25T12:00:00';
    const reservations: Reservation[] = [
      { id: 'r-1', reservationTime: '2026-02-23T18:00:00', status: 'completed', guestName: 'A' },
      { id: 'r-2', reservationTime: '2026-02-24T18:00:00', status: 'completed', guestName: 'B' },
    ];
    const result = pastReservations(reservations, now);
    expect(result[0].id).toBe('r-2');
  });
});

describe('BookingService — upcomingEvents and pastEvents', () => {
  const events: EventBooking[] = [
    { id: 'e-1', date: '2026-02-20', name: 'Past' },
    { id: 'e-2', date: '2026-02-25', name: 'Today' },
    { id: 'e-3', date: '2026-03-01', name: 'Future' },
  ];

  it('upcomingEvents includes today and future, sorted ascending', () => {
    const result = upcomingEvents(events, '2026-02-25');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('e-2');
    expect(result[1].id).toBe('e-3');
  });

  it('pastEvents includes only past, sorted descending', () => {
    const result = pastEvents(events, '2026-02-25');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e-1');
  });
});

describe('BookingService — activeRecurring', () => {
  it('filters active reservations', () => {
    const recurring: RecurringReservation[] = [
      { id: 'rr-1', isActive: true },
      { id: 'rr-2', isActive: false },
      { id: 'rr-3', isActive: true },
    ];
    expect(activeRecurring(recurring)).toHaveLength(2);
  });
});

describe('BookingService — dynamicTurnTime', () => {
  it('returns overall from stats', () => {
    expect(dynamicTurnTime({ overall: 60 })).toBe(60);
  });

  it('defaults to 45 when null', () => {
    expect(dynamicTurnTime(null)).toBe(45);
  });
});

describe('BookingService — isCalendarConnected', () => {
  it('true when connected', () => {
    expect(isCalendarConnected({ status: 'connected' })).toBe(true);
  });

  it('false when disconnected', () => {
    expect(isCalendarConnected({ status: 'disconnected' })).toBe(false);
  });

  it('false when null', () => {
    expect(isCalendarConnected(null)).toBe(false);
  });
});

describe('BookingService — list mutations', () => {
  it('addReservation prepends', () => {
    const list: Reservation[] = [{ id: 'r-1', reservationTime: '', status: 'confirmed', guestName: 'A' }];
    const result = addReservation(list, { id: 'r-2', reservationTime: '', status: 'confirmed', guestName: 'B' });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('r-2');
  });

  it('updateReservationInList replaces matching', () => {
    const list: Reservation[] = [{ id: 'r-1', reservationTime: '', status: 'confirmed', guestName: 'A' }];
    const updated: Reservation = { id: 'r-1', reservationTime: '', status: 'seated', guestName: 'A' };
    expect(updateReservationInList(list, 'r-1', updated)[0].status).toBe('seated');
  });

  it('addWaitlistEntry appends', () => {
    const list: WaitlistEntry[] = [];
    const entry: WaitlistEntry = { id: 'w-1', status: 'waiting', position: 1, onMyWayAt: null };
    expect(addWaitlistEntry(list, entry)).toHaveLength(1);
  });

  it('removeWaitlistEntry filters', () => {
    const list: WaitlistEntry[] = [
      { id: 'w-1', status: 'waiting', position: 1, onMyWayAt: null },
    ];
    expect(removeWaitlistEntry(list, 'w-1')).toHaveLength(0);
  });
});
