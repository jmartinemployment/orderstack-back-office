import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { GuestOrderStatus } from '@models/index';

@Component({
  selector: 'os-status-badge',
  imports: [],
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  status = input.required<GuestOrderStatus>();

  readonly badgeClass = computed(() => {
    switch (this.status()) {
      case 'RECEIVED': return 'bg-secondary';
      case 'IN_PREPARATION': return 'bg-warning text-dark';
      case 'READY_FOR_PICKUP': return 'bg-success';
      case 'CLOSED': return 'bg-primary';
      case 'VOIDED': return 'bg-danger';
      default: return 'bg-secondary';
    }
  });

  readonly statusLabel = computed(() => {
    switch (this.status()) {
      case 'RECEIVED': return 'Received';
      case 'IN_PREPARATION': return 'Preparing';
      case 'READY_FOR_PICKUP': return 'Ready';
      case 'CLOSED': return 'Completed';
      case 'VOIDED': return 'Cancelled';
      default: return this.status();
    }
  });
}
