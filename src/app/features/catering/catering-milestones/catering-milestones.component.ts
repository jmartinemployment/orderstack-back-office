import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { CateringService } from '../../../services/catering.service';
import { CateringMilestonePayment } from '../../../models/catering.model';

type MilestoneFilter = 'all' | 'due_soon' | 'overdue' | 'unpaid' | 'paid';

interface FlatMilestone extends CateringMilestonePayment {
  jobId: string;
  jobTitle: string;
  clientName: string;
}

@Component({
  selector: 'os-catering-milestones',
  standalone: true,
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './catering-milestones.component.html',
  styleUrl: './catering-milestones.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
})
export class CateringMilestonesComponent {
  private readonly router = inject(Router);
  private readonly cateringService = inject(CateringService);

  readonly _filter = signal<MilestoneFilter>('all');
  readonly _markingId = signal<string | null>(null);

  private readonly allFlatMilestones = computed<FlatMilestone[]>(() => {
    const jobs = this.cateringService.jobs().filter(j =>
      j.status !== 'cancelled' && j.status !== 'completed'
    );
    const flat: FlatMilestone[] = [];
    for (const j of jobs) {
      for (const m of j.milestones) {
        flat.push({ ...m, jobId: j.id, jobTitle: j.title, clientName: j.clientName });
      }
    }
    return flat;
  });

  readonly flatMilestones = computed<FlatMilestone[]>(() => {
    const filter = this._filter();
    const now = new Date().toISOString().split('T')[0];
    const weekOut = new Date();
    weekOut.setDate(weekOut.getDate() + 7);
    const weekStr = weekOut.toISOString().split('T')[0];

    let filtered = this.allFlatMilestones();

    if (filter === 'paid') {
      filtered = filtered.filter(m => m.paidAt);
    } else if (filter === 'unpaid') {
      filtered = filtered.filter(m => !m.paidAt);
    } else if (filter === 'overdue') {
      filtered = filtered.filter(m => !m.paidAt && m.dueDate && m.dueDate < now);
    } else if (filter === 'due_soon') {
      filtered = filtered.filter(m => !m.paidAt && m.dueDate && m.dueDate >= now && m.dueDate <= weekStr);
    }

    return filtered.sort((a, b) => {
      if (!a.paidAt && b.paidAt) return -1;
      if (a.paidAt && !b.paidAt) return 1;
      const aOverdue = !a.paidAt && a.dueDate && a.dueDate < now;
      const bOverdue = !b.paidAt && b.dueDate && b.dueDate < now;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
    });
  });

  readonly totalOutstanding = computed(() =>
    this.allFlatMilestones()
      .filter(m => !m.paidAt)
      .reduce((sum, m) => sum + m.amountCents, 0)
  );

  readonly dueThisWeek = computed(() => {
    const now = new Date().toISOString().split('T')[0];
    const weekOut = new Date();
    weekOut.setDate(weekOut.getDate() + 7);
    const weekStr = weekOut.toISOString().split('T')[0];
    return this.allFlatMilestones()
      .filter(m => !m.paidAt && m.dueDate && m.dueDate >= now && m.dueDate <= weekStr)
      .length;
  });

  readonly overdueCount = computed(() => {
    const now = new Date().toISOString().split('T')[0];
    return this.allFlatMilestones()
      .filter(m => !m.paidAt && m.dueDate && m.dueDate < now)
      .length;
  });

  readonly collectedThisMonth = computed(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.allFlatMilestones()
      .filter(m => m.paidAt?.startsWith(monthPrefix))
      .reduce((sum, m) => sum + m.amountCents, 0);
  });

  setFilter(f: MilestoneFilter): void {
    this._filter.set(f);
  }

  getStatusBadge(m: FlatMilestone): { label: string; cssClass: string } {
    const now = new Date().toISOString().split('T')[0];
    if (m.paidAt) return { label: 'Paid', cssClass: 'badge-paid' };
    if (m.dueDate && m.dueDate < now) return { label: 'Overdue', cssClass: 'badge-overdue' };
    const weekOut = new Date();
    weekOut.setDate(weekOut.getDate() + 7);
    if (m.dueDate && m.dueDate <= weekOut.toISOString().split('T')[0]) {
      return { label: 'Due Soon', cssClass: 'badge-due-soon' };
    }
    return { label: 'Pending', cssClass: 'badge-pending' };
  }

  viewJob(jobId: string): void {
    this.router.navigate(['/app/catering/job', jobId]);
  }

  async markPaid(jobId: string, milestoneId: string): Promise<void> {
    this._markingId.set(milestoneId);
    try {
      await this.cateringService.markMilestonePaid(jobId, milestoneId);
    } finally {
      this._markingId.set(null);
    }
  }
}
