import {
  Component, inject, signal, computed, input, effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import { BookingService } from '../../../services/booking';
import {
  BookingStep, TimeSlot, DayAvailability,
  SeatingPreference, Booking,
  DIETARY_OPTIONS, OCCASION_OPTIONS,
} from '../../../models/index';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'os-booking-widget',
  standalone: true,
  imports: [DatePipe, LoadingSpinner],
  templateUrl: './booking-widget.html',
  styleUrl: './booking-widget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingWidget {
  private readonly bookingService = inject(BookingService);
  private readonly http = inject(HttpClient);

  readonly restaurantSlug = input<string>('');

  // State
  private readonly _step = signal<BookingStep>('date');
  private readonly _restaurantName = signal('');
  private readonly _selectedDate = signal('');
  private readonly _selectedTime = signal('');
  private readonly _partySize = signal(2);
  private readonly _availability = signal<DayAvailability | null>(null);
  private readonly _isLoadingSlots = signal(false);
  private readonly _isSubmitting = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _confirmedBooking = signal<Booking | null>(null);

  // Form fields
  private readonly _name = signal('');
  private readonly _phone = signal('');
  private readonly _email = signal('');
  private readonly _specialRequests = signal('');
  private readonly _dietaryRestrictions = signal<string[]>([]);
  private readonly _seatingPreference = signal<SeatingPreference>('no_preference');
  private readonly _occasion = signal('');

  // Readonly
  readonly step = this._step.asReadonly();
  readonly restaurantName = this._restaurantName.asReadonly();
  readonly selectedDate = this._selectedDate.asReadonly();
  readonly selectedTime = this._selectedTime.asReadonly();
  readonly partySize = this._partySize.asReadonly();
  readonly availability = this._availability.asReadonly();
  readonly isLoadingSlots = this._isLoadingSlots.asReadonly();
  readonly isSubmitting = this._isSubmitting.asReadonly();
  readonly error = this._error.asReadonly();
  readonly confirmedBooking = this._confirmedBooking.asReadonly();

  readonly name = this._name.asReadonly();
  readonly phone = this._phone.asReadonly();
  readonly email = this._email.asReadonly();
  readonly specialRequests = this._specialRequests.asReadonly();
  readonly dietaryRestrictions = this._dietaryRestrictions.asReadonly();
  readonly seatingPreference = this._seatingPreference.asReadonly();
  readonly occasion = this._occasion.asReadonly();

  readonly dietaryOptions = DIETARY_OPTIONS;
  readonly occasionOptions = OCCASION_OPTIONS;
  readonly seatingOptions: { value: SeatingPreference; label: string }[] = [
    { value: 'no_preference', label: 'No Preference' },
    { value: 'indoor', label: 'Indoor' },
    { value: 'outdoor', label: 'Outdoor' },
    { value: 'bar', label: 'Bar' },
    { value: 'private', label: 'Private' },
  ];

  readonly availableSlots = computed(() => {
    const avail = this._availability();
    if (!avail) return [] as TimeSlot[];
    return avail.slots.filter(s => s.isAvailable);
  });

  readonly dateOptions = computed(() => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  });

  readonly partySizeOptions = computed(() =>
    Array.from({ length: 20 }, (_, i) => i + 1)
  );

  readonly canProceedToInfo = computed(() =>
    this._selectedDate() !== '' && this._selectedTime() !== ''
  );

  readonly canSubmit = computed(() =>
    this._name().trim() !== '' && this._phone().trim().length >= 10
  );

  readonly formattedDateTime = computed(() => {
    const date = this._selectedDate();
    const time = this._selectedTime();
    if (!date || !time) return '';
    return `${date}T${time}:00`;
  });

  constructor() {
    effect(() => {
      const slug = this.restaurantSlug();
      if (slug) this.resolveRestaurant(slug);
    });
  }

  private async resolveRestaurant(slug: string): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ name: string }>(`${environment.apiUrl}/merchant/slug/${slug}`)
      );
      this._restaurantName.set(res?.name ?? slug);
    } catch {
      this._restaurantName.set(slug);
    }
  }

  // --- Date/Time Selection ---

  onDateChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this._selectedDate.set(value);
    this._selectedTime.set('');
    if (value) this.loadSlots();
  }

  onPartySizeChange(event: Event): void {
    this._partySize.set(Number.parseInt((event.target as HTMLSelectElement).value, 10));
    if (this._selectedDate()) this.loadSlots();
  }

  selectTimeSlot(slot: TimeSlot): void {
    if (!slot.isAvailable) return;
    this._selectedTime.set(slot.time);
  }

  private async loadSlots(): Promise<void> {
    const slug = this.restaurantSlug();
    const date = this._selectedDate();
    if (!slug || !date) return;

    this._isLoadingSlots.set(true);
    try {
      const avail = await this.bookingService.getPublicAvailability(slug, date, this._partySize());
      this._availability.set(avail);
    } finally {
      this._isLoadingSlots.set(false);
    }
  }

  // --- Navigation ---

  goToInfo(): void {
    if (this.canProceedToInfo()) {
      this._step.set('info');
    }
  }

  goBackToDate(): void {
    this._step.set('date');
  }

  // --- Form inputs ---

  onNameInput(event: Event): void {
    this._name.set((event.target as HTMLInputElement).value);
  }

  onPhoneInput(event: Event): void {
    this._phone.set((event.target as HTMLInputElement).value);
  }

  onEmailInput(event: Event): void {
    this._email.set((event.target as HTMLInputElement).value);
  }

  onSpecialRequestsInput(event: Event): void {
    this._specialRequests.set((event.target as HTMLTextAreaElement).value);
  }

  onSeatingChange(event: Event): void {
    this._seatingPreference.set((event.target as HTMLSelectElement).value as SeatingPreference);
  }

  onOccasionChange(event: Event): void {
    this._occasion.set((event.target as HTMLSelectElement).value);
  }

  toggleDietary(option: string): void {
    this._dietaryRestrictions.update(list =>
      list.includes(option) ? list.filter(d => d !== option) : [...list, option]
    );
  }

  isDietarySelected(option: string): boolean {
    return this._dietaryRestrictions().includes(option);
  }

  // --- Submit ---

  async submitBooking(): Promise<void> {
    if (!this.canSubmit()) return;

    this._isSubmitting.set(true);
    this._error.set(null);

    try {
      const booking = await this.bookingService.createPublicBooking(
        this.restaurantSlug(),
        {
          customerName: this._name().trim(),
          customerPhone: this._phone().trim(),
          customerEmail: this._email().trim() || undefined,
          partySize: this._partySize(),
          reservationTime: this.formattedDateTime(),
          specialRequests: this._specialRequests().trim() || undefined,
          dietaryRestrictions: this._dietaryRestrictions(),
          seatingPreference: this._seatingPreference(),
          occasion: this._occasion() || undefined,
        }
      );

      if (booking) {
        this._confirmedBooking.set(booking);
        this._step.set('confirm');
      } else {
        this._error.set('Failed to create reservation. Please try again.');
      }
    } catch {
      this._error.set('Something went wrong. Please try again.');
    } finally {
      this._isSubmitting.set(false);
    }
  }

  // --- Helpers ---

  formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  formatTimeLabel(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    let hour12: number;
    if (h > 12) {
      hour12 = h - 12;
    } else if (h === 0) {
      hour12 = 12;
    } else {
      hour12 = h;
    }
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  }

  startNewBooking(): void {
    this._step.set('date');
    this._selectedDate.set('');
    this._selectedTime.set('');
    this._name.set('');
    this._phone.set('');
    this._email.set('');
    this._specialRequests.set('');
    this._dietaryRestrictions.set([]);
    this._seatingPreference.set('no_preference');
    this._occasion.set('');
    this._confirmedBooking.set(null);
    this._error.set(null);
  }

  generateIcsUrl(): string {
    const confirmed = this._confirmedBooking();
    if (!confirmed) return '';
    const start = new Date(confirmed.reservationTime);
    const end = new Date(start.getTime() + 90 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replaceAll(/[-:]/g, '').split('.')[0] + 'Z';
    return `data:text/calendar;charset=utf-8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${fmt(start)}%0ADTEND:${fmt(end)}%0ASUMMARY:Dinner Booking - ${this._restaurantName()}%0ADESCRIPTION:Party of ${confirmed.partySize}%0AEND:VEVENT%0AEND:VCALENDAR`;
  }
}
