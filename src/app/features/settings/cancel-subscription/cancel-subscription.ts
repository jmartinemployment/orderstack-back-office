import { Component, inject, signal, computed, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SubscriptionService } from '../../../services/subscription';
import {
  CancellationReason,
  CancellationFeedback,
  CANCELLATION_REASONS,
  MISSING_FEATURE_OPTIONS,
  COMPETITOR_OPTIONS,
  REASONS_WITHOUT_FOLLOWUP,
} from '../../../models/index';

type Phase = 'reason' | 'followup' | 'confirm';

@Component({
  selector: 'os-cancel-subscription',
  imports: [FormsModule, DatePipe],
  templateUrl: './cancel-subscription.html',
  styleUrl: './cancel-subscription.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancelSubscription {
  private readonly subscriptionService = inject(SubscriptionService);

  readonly closed = output<void>();

  readonly reasons = CANCELLATION_REASONS;
  readonly missingFeatureOptions = MISSING_FEATURE_OPTIONS;
  readonly competitorOptions = COMPETITOR_OPTIONS;

  readonly subscription = this.subscriptionService.subscription;
  readonly isLoading = this.subscriptionService.isLoading;

  readonly phase = signal<Phase>('reason');
  readonly selectedReason = signal<CancellationReason | null>(null);
  readonly followUpText = signal('');
  readonly selectedCompetitor = signal('');
  readonly competitorOther = signal('');
  readonly selectedFeatures = signal<string[]>([]);
  readonly featuresOther = signal('');
  readonly priceExpectation = signal('');
  readonly confirmText = signal('');
  readonly additionalFeedback = signal('');
  readonly successMessage = signal('');

  readonly hasFollowUp = computed(() => {
    const reason = this.selectedReason();
    if (!reason) return false;
    return !REASONS_WITHOUT_FOLLOWUP.includes(reason);
  });

  readonly canContinuePhase1 = computed(() => this.selectedReason() !== null);

  readonly canContinuePhase2 = computed(() => {
    const reason = this.selectedReason();
    if (!reason) return false;
    switch (reason) {
      case 'too_expensive':
        return this.priceExpectation().trim().length > 0;
      case 'missing_features':
        return this.selectedFeatures().length > 0;
      case 'too_complicated':
      case 'technical_issues':
        return this.followUpText().trim().length > 0;
      case 'switching_competitor':
        return this.selectedCompetitor() !== '' &&
          (this.selectedCompetitor() !== 'Other' || this.competitorOther().trim().length > 0);
      case 'other':
        return this.followUpText().trim().length > 0;
      default:
        return true;
    }
  });

  readonly canConfirm = computed(() => this.confirmText().toUpperCase() === 'CANCEL');

  selectReason(reason: CancellationReason): void {
    this.selectedReason.set(reason);
  }

  toggleFeature(feature: string): void {
    const current = this.selectedFeatures();
    if (current.includes(feature)) {
      this.selectedFeatures.set(current.filter(f => f !== feature));
    } else {
      this.selectedFeatures.set([...current, feature]);
    }
  }

  continueFromReason(): void {
    if (!this.canContinuePhase1()) return;
    if (this.hasFollowUp()) {
      this.phase.set('followup');
    } else {
      this.phase.set('confirm');
    }
  }

  continueFromFollowUp(): void {
    if (!this.canContinuePhase2()) return;
    this.phase.set('confirm');
  }

  goBack(): void {
    const current = this.phase();
    if (current === 'confirm') {
      this.phase.set(this.hasFollowUp() ? 'followup' : 'reason');
    } else if (current === 'followup') {
      this.phase.set('reason');
    } else {
      this.closed.emit();
    }
  }

  async confirmCancel(): Promise<void> {
    if (!this.canConfirm()) return;

    const reason = this.selectedReason()!;
    const feedback: CancellationFeedback = {
      reason,
      winBackOffered: false,
      winBackAccepted: false,
    };

    if (this.additionalFeedback().trim()) {
      feedback.additionalFeedback = this.additionalFeedback().trim();
    }

    switch (reason) {
      case 'too_expensive':
        feedback.priceExpectation = this.priceExpectation().trim();
        break;
      case 'missing_features': {
        const features = [...this.selectedFeatures()];
        if (this.featuresOther().trim()) {
          features.push(this.featuresOther().trim());
        }
        feedback.missingFeatures = features;
        feedback.followUp = features.join(', ');
        break;
      }
      case 'switching_competitor':
        feedback.competitorName = this.selectedCompetitor() === 'Other'
          ? this.competitorOther().trim()
          : this.selectedCompetitor();
        feedback.followUp = feedback.competitorName;
        break;
      case 'too_complicated':
      case 'technical_issues':
      case 'other':
        feedback.followUp = this.followUpText().trim();
        break;
    }

    const success = await this.subscriptionService.cancelSubscription(feedback);
    if (success) {
      this.successMessage.set('Your subscription has been canceled.');
      setTimeout(() => this.closed.emit(), 2000);
    }
  }

  closeModal(): void {
    this.closed.emit();
  }
}
