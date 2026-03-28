import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { CateringService } from '../../../services/catering.service';

@Component({
  selector: 'os-catering-proposals',
  standalone: true,
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './catering-proposals.component.html',
  styleUrl: './catering-proposals.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
})
export class CateringProposalsComponent {
  private readonly router = inject(Router);
  private readonly cateringService = inject(CateringService);

  readonly _resendingId = signal<string | null>(null);
  readonly _toastMessage = signal<string | null>(null);

  readonly proposals = computed(() =>
    this.cateringService.jobs()
      .filter(j => j.status === 'proposal_sent')
      .sort((a, b) => a.fulfillmentDate.localeCompare(b.fulfillmentDate))
  );

  // True if there are jobs at all (helps show a better empty state message)
  readonly hasAnyJobs = computed(() => this.cateringService.jobs().length > 0);

  daysSinceSent(proposalSentAt: string): number {
    const [year, month, day] = proposalSentAt.split('-').map(Number);
    const sent = new Date(year, month - 1, day); // local midnight — avoids UTC off-by-one
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    return Math.floor((todayMidnight.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24));
  }

  viewJob(jobId: string): void {
    this.router.navigate(['/app/catering/job', jobId]);
  }

  goToJobs(): void {
    this.router.navigate(['/app/catering']);
  }

  async resendProposal(jobId: string): Promise<void> {
    this._resendingId.set(jobId);
    try {
      const result = await this.cateringService.generateProposal(jobId);
      if (result?.url) {
        await navigator.clipboard.writeText(result.url);
        this._toastMessage.set('Proposal link copied to clipboard');
        setTimeout(() => this._toastMessage.set(null), 3000);
      }
    } finally {
      this._resendingId.set(null);
    }
  }
}
