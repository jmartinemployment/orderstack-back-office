import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CateringJob, CateringJobStatus, CATERING_STATUS_CONFIG, CATERING_STATUS_TRANSITIONS } from '@models/index';

@Component({
  selector: 'os-catering-event-card',
  standalone: true,
  imports: [],
  templateUrl: './catering-event-card.component.html',
  styleUrl: './catering-event-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringEventCardComponent {
  @Input({ required: true }) event!: CateringJob;

  @Output() statusAdvanced = new EventEmitter<{ id: string; status: CateringJobStatus }>();
  @Output() editRequested = new EventEmitter<CateringJob>();
  @Output() cancelRequested = new EventEmitter<string>();

  get statusBadgeClass(): string {
    const map: Record<CateringJobStatus, string> = {
      inquiry: 'bg-secondary',
      proposal_sent: 'bg-info text-dark',
      contract_signed: 'bg-purple',
      deposit_received: 'bg-warning text-dark',
      in_progress: 'bg-primary',
      final_payment: 'bg-danger',
      completed: 'bg-success',
      cancelled: 'bg-dark',
    };
    return map[this.event.status] ?? 'bg-secondary';
  }

  get statusLabel(): string {
    return CATERING_STATUS_CONFIG[this.event.status]?.label ?? this.event.status;
  }

  get eventTypeLabel(): string {
    return this.event.eventType.charAt(0).toUpperCase() + this.event.eventType.slice(1);
  }

  get formattedDate(): string {
    const value = this.event.fulfillmentDate;
    if (!value) return 'Date TBD';
    const dateStr = value.includes('T') ? value.split('T')[0] : value;
    const d = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return 'Date TBD';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  get formattedTimeRange(): string {
    if (!this.event.startTime || !this.event.endTime) return '';
    return `${this.formatTime(this.event.startTime)} – ${this.formatTime(this.event.endTime)}`;
  }

  get locationLabel(): string {
    return this.event.locationType === 'on_site' ? 'On-Site' : 'Off-Site';
  }

  get canAdvance(): boolean {
    const transitions = CATERING_STATUS_TRANSITIONS[this.event.status];
    return transitions.some(s => s !== 'cancelled');
  }

  get advanceLabel(): string {
    const map: Record<string, string> = {
      inquiry: 'Mark Proposal Sent',
      proposal_sent: 'Mark Contract Signed',
      contract_signed: 'Record Deposit',
      deposit_received: 'Start Job',
      in_progress: 'Record Final Payment',
      final_payment: 'Mark Complete',
    };
    return map[this.event.status] ?? '';
  }

  get nextStatus(): CateringJobStatus {
    const transitions = CATERING_STATUS_TRANSITIONS[this.event.status];
    return transitions.find(s => s !== 'cancelled') ?? this.event.status;
  }

  get canCancel(): boolean {
    return this.event.status !== 'completed' && this.event.status !== 'cancelled';
  }

  get paymentPercent(): number {
    if (this.event.totalCents === 0) return 0;
    return Math.round((this.event.paidCents / this.event.totalCents) * 100);
  }

  formatCents(cents: number): string {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  advanceStatus(): void {
    this.statusAdvanced.emit({ id: this.event.id, status: this.nextStatus });
  }

  edit(): void {
    this.editRequested.emit(this.event);
  }

  cancel(): void {
    this.cancelRequested.emit(this.event.id);
  }

  private formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }
}
