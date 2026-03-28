import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CateringService } from '../../../services/catering.service';
import { DeliveryDetails } from '../../../models/catering.model';

type DateFilter = 'today' | 'week' | 'month';

@Component({
  selector: 'os-catering-delivery',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './catering-delivery.component.html',
  styleUrl: './catering-delivery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
})
export class CateringDeliveryComponent {
  private readonly router = inject(Router);
  private readonly cateringService = inject(CateringService);

  readonly _dateFilter = signal<DateFilter>('week');
  readonly _editingJobId = signal<string | null>(null);
  readonly _savingId = signal<string | null>(null);

  // Inline edit form state
  readonly _editForm = signal<DeliveryDetails>({});

  readonly deliveryJobs = computed(() => {
    const filter = this._dateFilter();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let endStr: string;
    if (filter === 'today') {
      endStr = todayStr;
    } else if (filter === 'week') {
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      endStr = end.toISOString().split('T')[0];
    } else {
      const end = new Date(now);
      end.setDate(end.getDate() + 30);
      endStr = end.toISOString().split('T')[0];
    }

    return this.cateringService.jobs()
      .filter(j =>
        j.locationType === 'off_site'
        && j.status !== 'cancelled'
        && j.fulfillmentDate >= todayStr
        && j.fulfillmentDate <= endStr
      )
      .sort((a, b) => a.fulfillmentDate.localeCompare(b.fulfillmentDate));
  });

  setDateFilter(filter: DateFilter): void {
    this._dateFilter.set(filter);
  }

  viewJob(jobId: string): void {
    this.router.navigate(['/app/catering/job', jobId]);
  }

  startEdit(jobId: string, existing?: DeliveryDetails): void {
    this._editingJobId.set(jobId);
    this._editForm.set(existing ? { ...existing } : {});
  }

  cancelEdit(): void {
    this._editingJobId.set(null);
    this._editForm.set({});
  }

  updateFormField(field: keyof DeliveryDetails, value: string): void {
    this._editForm.update(f => ({ ...f, [field]: value }));
  }

  formatTime(time: string | undefined | null): string {
    if (!time) return '--';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }

  updateEquipment(value: string): void {
    const items = value.split(',').map(s => s.trim()).filter(Boolean);
    this._editForm.update(f => ({ ...f, equipmentChecklist: items }));
  }

  async saveDeliveryDetails(jobId: string): Promise<void> {
    this._savingId.set(jobId);
    try {
      await this.cateringService.updateJob(jobId, {
        deliveryDetails: this._editForm(),
      });
      this._editingJobId.set(null);
      this._editForm.set({});
    } finally {
      this._savingId.set(null);
    }
  }
}
