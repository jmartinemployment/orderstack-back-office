import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { CateringService } from '../../../services/catering.service';
import { CateringJob, CATERING_STATUS_CONFIG } from '../../../models/index';

interface CalendarDay {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CateringJob[];
}

@Component({
  selector: 'os-catering-calendar',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './catering-calendar.component.html',
  styleUrl: './catering-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringCalendarComponent {
  private readonly cateringService = inject(CateringService);
  private readonly router = inject(Router);

  readonly currentYear = signal(new Date().getFullYear());
  readonly currentMonth = signal(new Date().getMonth());
  readonly selectedDay = signal<string | null>(null);

  readonly statusConfig = CATERING_STATUS_CONFIG;

  readonly monthLabel = computed(() => {
    const date = new Date(this.currentYear(), this.currentMonth(), 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  readonly calendarDays = computed<CalendarDay[]>(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const events = this.cateringService.events();
    const today = new Date().toISOString().split('T')[0];

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const days: CalendarDay[] = [];

    // Previous month padding
    const prevLast = new Date(year, month, 0);
    for (let i = startPad - 1; i >= 0; i--) {
      const d = prevLast.getDate() - i;
      const date = this.formatDate(new Date(year, month - 1, d));
      days.push({
        date,
        dayOfMonth: d,
        isCurrentMonth: false,
        isToday: date === today,
        events: events.filter(e => e.fulfillmentDate.startsWith(date)),
      });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = this.formatDate(new Date(year, month, d));
      days.push({
        date,
        dayOfMonth: d,
        isCurrentMonth: true,
        isToday: date === today,
        events: events.filter(e => e.fulfillmentDate.startsWith(date)),
      });
    }

    // Next month padding (fill to 42 cells for 6 rows)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const date = this.formatDate(new Date(year, month + 1, d));
      days.push({
        date,
        dayOfMonth: d,
        isCurrentMonth: false,
        isToday: date === today,
        events: events.filter(e => e.fulfillmentDate.startsWith(date)),
      });
    }

    return days;
  });

  readonly selectedDayEvents = computed(() => {
    const day = this.selectedDay();
    if (!day) return [];
    return this.cateringService.events().filter(e => e.fulfillmentDate.startsWith(day));
  });

  prevMonth(): void {
    const m = this.currentMonth();
    if (m === 0) {
      this.currentYear.update(y => y - 1);
      this.currentMonth.set(11);
    } else {
      this.currentMonth.set(m - 1);
    }
    this.selectedDay.set(null);
  }

  nextMonth(): void {
    const m = this.currentMonth();
    if (m === 11) {
      this.currentYear.update(y => y + 1);
      this.currentMonth.set(0);
    } else {
      this.currentMonth.set(m + 1);
    }
    this.selectedDay.set(null);
  }

  selectDay(day: CalendarDay): void {
    this.selectedDay.set(this.selectedDay() === day.date ? null : day.date);
  }

  openJob(job: CateringJob): void {
    this.router.navigate(['/app/catering/job', job.id]);
  }

  getStatusColor(status: string): string {
    return CATERING_STATUS_CONFIG[status as keyof typeof CATERING_STATUS_CONFIG]?.color ?? '#6b7280';
  }

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      inquiry: 'bg-secondary',
      proposal_sent: 'bg-info text-dark',
      contract_signed: 'bg-purple',
      deposit_received: 'bg-warning text-dark',
      in_progress: 'bg-primary',
      final_payment: 'bg-danger',
      completed: 'bg-success',
      cancelled: 'bg-dark',
    };
    return map[status] ?? 'bg-secondary';
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
