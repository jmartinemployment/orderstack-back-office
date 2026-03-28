import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CateringJob, CateringJobStatus, CateringEventType, CateringLocationType, CATERING_STATUS_CONFIG, defaultCateringMilestones } from '../../../models/index';
import { CateringService } from '../../../services/catering.service';

@Component({
  selector: 'os-catering-event-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './catering-event-form.component.html',
  styleUrl: './catering-event-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringEventFormComponent implements OnChanges {
  @Input() event: CateringJob | null = null;
  @Input() visible = false;

  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly cateringService = inject(CateringService);

  readonly isSaving = signal(false);
  readonly validationErrors = signal<string[]>([]);

  title = '';
  eventType: CateringEventType = 'corporate';
  status: CateringJobStatus = 'inquiry';
  fulfillmentDate = '';
  startTime = '';
  endTime = '';
  headcount = 1;
  locationType: CateringLocationType = 'on_site';
  locationAddress = '';
  clientName = '';
  clientPhone = '';
  clientEmail = '';
  companyName = '';
  notes = '';

  readonly eventTypes: { value: CateringEventType; label: string }[] = [
    { value: 'corporate', label: 'Corporate' },
    { value: 'wedding', label: 'Wedding' },
    { value: 'birthday', label: 'Birthday' },
    { value: 'social', label: 'Social' },
    { value: 'fundraiser', label: 'Fundraiser' },
    { value: 'holiday', label: 'Holiday' },
    { value: 'other', label: 'Other' },
  ];

  readonly statuses: { value: CateringJobStatus; label: string }[] = Object.entries(CATERING_STATUS_CONFIG).map(
    ([value, config]) => ({ value: value as CateringJobStatus, label: config.label })
  );

  get isEditMode(): boolean {
    return this.event !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.validationErrors.set([]);
    if (this.event) {
      this.title = this.event.title;
      this.eventType = this.event.eventType;
      this.status = this.event.status;
      this.fulfillmentDate = this.event.fulfillmentDate.split('T')[0];
      this.startTime = this.event.startTime ?? '';
      this.endTime = this.event.endTime ?? '';
      this.headcount = this.event.headcount;
      this.locationType = this.event.locationType;
      this.locationAddress = this.event.locationAddress ?? '';
      this.clientName = this.event.clientName;
      this.clientPhone = this.event.clientPhone ?? '';
      this.clientEmail = this.event.clientEmail ?? '';
      this.companyName = this.event.companyName ?? '';
      this.notes = this.event.notes ?? '';
    } else {
      this.title = '';
      this.eventType = 'corporate';
      this.status = 'inquiry';
      this.fulfillmentDate = '';
      this.startTime = '';
      this.endTime = '';
      this.headcount = 1;
      this.locationType = 'on_site';
      this.locationAddress = '';
      this.clientName = '';
      this.clientPhone = '';
      this.clientEmail = '';
      this.companyName = '';
      this.notes = '';
    }
  }

  private validate(): string[] {
    const errors: string[] = [];
    if (!this.title.trim()) errors.push('Event title is required.');
    if (!this.fulfillmentDate) errors.push('Fulfillment date is required.');
    if (!this.startTime) errors.push('Start time is required.');
    if (!this.endTime) errors.push('End time is required.');
    if (this.headcount < 1) errors.push('Headcount must be at least 1.');
    if (this.locationType === 'off_site' && !this.locationAddress.trim()) {
      errors.push('Location address is required for off-site events.');
    }
    if (!this.clientName.trim()) errors.push('Client name is required.');
    return errors;
  }

  async save(): Promise<void> {
    const errors = this.validate();
    if (errors.length > 0) {
      this.validationErrors.set(errors);
      return;
    }

    this.validationErrors.set([]);
    this.isSaving.set(true);

    const data: Record<string, unknown> = {
      title: this.title.trim(),
      eventType: this.eventType,
      status: this.status,
      fulfillmentDate: this.fulfillmentDate,
      startTime: this.startTime || undefined,
      endTime: this.endTime || undefined,
      headcount: this.headcount,
      locationType: this.locationType,
      locationAddress: this.locationType === 'off_site' ? this.locationAddress.trim() : undefined,
      clientName: this.clientName.trim(),
      clientPhone: this.clientPhone.trim() || undefined,
      clientEmail: this.clientEmail.trim() || undefined,
      companyName: this.companyName.trim() || undefined,
      notes: this.notes.trim() || undefined,
    };

    if (!this.event) {
      data['bookingDate'] = new Date().toISOString().split('T')[0];
      data['packages'] = [];
      data['milestones'] = defaultCateringMilestones();
      data['totalCents'] = 0;
      data['paidCents'] = 0;
      data['subtotalCents'] = 0;
      data['serviceChargeCents'] = 0;
      data['taxCents'] = 0;
      data['gratuityCents'] = 0;
      data['restaurantId'] = '';
    }

    if (this.event) {
      await this.cateringService.updateEvent(this.event.id, data as Partial<CateringJob>);
    } else {
      await this.cateringService.createEvent(data as Omit<CateringJob, 'id' | 'createdAt' | 'updatedAt'>);
    }

    this.isSaving.set(false);
    this.saved.emit();
  }

  close(): void {
    this.cancelled.emit();
  }
}
