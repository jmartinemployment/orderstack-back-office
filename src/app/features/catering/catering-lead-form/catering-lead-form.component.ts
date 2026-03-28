import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CateringService } from '../../../services/catering.service';

@Component({
  selector: 'os-catering-lead-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './catering-lead-form.component.html',
  styleUrls: ['./catering-lead-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringLeadFormComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly cateringService = inject(CateringService);

  readonly merchantSlug = this.route.snapshot.paramMap.get('slug') ?? '';

  clientName = '';
  clientEmail = '';
  clientPhone = '';
  companyName = '';
  eventType = '';
  estimatedDate = '';
  estimatedHeadcount: number | null = null;
  message = '';

  readonly isSubmitting = signal(false);
  readonly isSubmitted = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    if (!this.clientName.trim() || !this.clientEmail.trim()) return;

    this.isSubmitting.set(true);
    this.error.set(null);

    const success = await this.cateringService.submitLead(this.merchantSlug, {
      clientName: this.clientName.trim(),
      clientEmail: this.clientEmail.trim(),
      clientPhone: this.clientPhone.trim() || undefined,
      companyName: this.companyName.trim() || undefined,
      eventType: this.eventType || undefined,
      estimatedDate: this.estimatedDate || undefined,
      estimatedHeadcount: this.estimatedHeadcount ?? undefined,
      message: this.message.trim() || undefined,
    });

    this.isSubmitting.set(false);

    if (success) {
      this.isSubmitted.set(true);
    } else {
      this.error.set('Something went wrong. Please try again.');
    }
  }
}
