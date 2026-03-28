export type BookingStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no-show';

export interface Booking {
  id: string;
  merchantId: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  partySize: number;
  reservationTime: string;
  endTime: string | null;
  tableNumber: string | null;
  status: BookingStatus;
  specialRequests: string | null;
  confirmationSent: boolean;
  reminderSent: boolean;
  recurringReservationId: string | null;
  preferences: GuestPreferences | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingFormData {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  reservationTime: string;
  tableNumber?: string;
  specialRequests?: string;
  preferences?: GuestPreferences;
  recurringPattern?: RecurrencePattern;
  recurringEndDate?: string;
}

export type BookingTab = 'today' | 'upcoming' | 'past' | 'waitlist' | 'events' | 'timeline';
export type BookingViewMode = 'list' | 'timeline';

export type WaitlistStatus = 'waiting' | 'notified' | 'seated' | 'cancelled' | 'no-show';

export interface WaitlistEntry {
  id: string;
  merchantId: string;
  partyName: string;
  partySize: number;
  phone: string;
  notes: string | null;
  status: WaitlistStatus;
  position: number;
  estimatedWaitMinutes: number;
  quotedWaitMinutes: number;
  notifiedAt: string | null;
  onMyWayAt: string | null;
  seatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistFormData {
  partyName: string;
  partySize: number;
  phone: string;
  notes?: string;
}

// --- Booking Widget Types ---

export type BookingStep = 'date' | 'info' | 'confirm';

export type SeatingPreference = 'no_preference' | 'indoor' | 'outdoor' | 'bar' | 'private';

export interface TimeSlot {
  time: string;
  isAvailable: boolean;
  availableCovers: number;
}

export interface DayAvailability {
  date: string;
  slots: TimeSlot[];
}

export interface PublicBookingFormData {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  reservationTime: string;
  specialRequests?: string;
  dietaryRestrictions?: string[];
  seatingPreference?: SeatingPreference;
  occasion?: string;
}

export const DIETARY_OPTIONS: string[] = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
  'Nut-Free', 'Shellfish-Free', 'Halal', 'Kosher',
];

export const OCCASION_OPTIONS: string[] = [
  'Birthday', 'Anniversary', 'Date Night', 'Business Meal',
  'Celebration', 'Holiday', 'Other',
];

// --- Recurring Bookings (Phase 2) ---

export type RecurrencePattern = 'weekly' | 'biweekly' | 'monthly' | 'first_weekday' | 'last_weekday';

export interface RecurringBooking {
  id: string;
  merchantId: string;
  pattern: RecurrencePattern;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  startDate: string;
  endDate: string | null;
  baseBooking: Partial<Booking>;
  generatedReservationIds: string[];
  isActive: boolean;
  createdAt: string;
}

// --- Event & Class Booking (Phase 2) ---

export type BookingType = 'reservation' | 'event' | 'class';

export interface EventBooking {
  id: string;
  merchantId: string;
  bookingType: BookingType;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  maxAttendees: number;
  currentAttendees: number;
  pricePerPerson: number;
  requiresPrepayment: boolean;
  intakeFormId: string | null;
  isPublished: boolean;
  attendees: EventAttendee[];
  createdAt: string;
}

export interface EventAttendee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  ticketCount: number;
  paymentStatus: 'paid' | 'pending' | 'refunded';
  checkedIn: boolean;
  intakeFormData: Record<string, string> | null;
}

export interface EventFormData {
  bookingType: BookingType;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  maxAttendees: number;
  pricePerPerson: number;
  requiresPrepayment: boolean;
  isPublished: boolean;
}

export interface IntakeForm {
  id: string;
  merchantId: string;
  name: string;
  fields: IntakeFormField[];
}

export interface IntakeFormField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'checkbox' | 'textarea';
  options: string[] | null;
  isRequired: boolean;
}

// --- Dynamic Turn Times (Phase 2) ---

export interface TurnTimeStats {
  overall: number;
  byPartySize: { range: string; avgMinutes: number }[];
  byMealPeriod: { period: string; avgMinutes: number }[];
  byDayOfWeek: { day: string; avgMinutes: number }[];
  sampleSize: number;
}

// --- Guest Preferences (Phase 2) ---

export interface GuestPreferences {
  seatingPreference: SeatingPreference;
  highChairsNeeded: number;
  wheelchairAccessible: boolean;
  dietaryRestrictions: string[];
  celebration: string | null;
  notes: string | null;
}

// --- Timeline View (Phase 2) ---

export interface TimelineBlock {
  booking: Booking;
  startMinute: number;
  durationMinutes: number;
  tableId: string;
  tableName: string;
}

// --- Google Calendar Sync (Phase 3) ---

export type CalendarSyncStatus = 'disconnected' | 'connected' | 'syncing' | 'error';

export interface CalendarConnection {
  id: string;
  merchantId: string;
  provider: 'google';
  email: string;
  calendarId: string;
  calendarName: string;
  status: CalendarSyncStatus;
  pushReservations: boolean;
  pullBlocks: boolean;
  lastSyncAt: string | null;
  connectedAt: string;
}

export interface CalendarBlock {
  id: string;
  calendarEventId: string;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
}

// --- Waitlist Enhancements (Phase 3) ---

export interface WaitlistSmsConfig {
  enabled: boolean;
  notifyMessage: string;
  onMyWayEnabled: boolean;
  autoRemoveMinutes: number;
}

export interface WaitlistAnalytics {
  avgWaitMinutes: number;
  noShowRate: number;
  seatedRate: number;
  cancelledRate: number;
  byHour: { hour: number; avgWait: number; count: number }[];
  byDay: { day: string; avgWait: number; count: number }[];
}

export interface VirtualWaitlistConfig {
  enabled: boolean;
  qrCodeUrl: string | null;
  joinUrl: string | null;
  maxQueueSize: number;
}
