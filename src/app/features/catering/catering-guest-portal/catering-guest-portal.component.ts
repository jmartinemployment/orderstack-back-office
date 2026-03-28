import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CateringService } from '../../../services/catering.service';
import { CateringJob } from '../../../models/index';

@Component({
  selector: 'os-catering-guest-portal',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './catering-guest-portal.component.html',
  styleUrls: ['./catering-guest-portal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringGuestPortalComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cateringService = inject(CateringService);

  readonly job = signal<CateringJob | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!token) {
      this.error.set('Invalid or missing portal link.');
      return;
    }

    this.isLoading.set(true);
    try {
      const result = await this.cateringService.getPortal(token);
      if (result) {
        this.job.set(result);
      } else {
        this.error.set('This portal link is invalid or has expired.');
      }
    } catch {
      this.error.set('Something went wrong loading your event details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  formatCents(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  formatTime(time: string | undefined): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = Number.parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  }

  get selectedPackage() {
    const j = this.job();
    if (!j?.selectedPackageId) return null;
    return j.packages.find(p => p.id === j.selectedPackageId) ?? null;
  }

  get paymentPercent(): number {
    const j = this.job();
    if (!j || j.totalCents === 0) return 0;
    return Math.round((j.paidCents / j.totalCents) * 100);
  }

  get hasDietary(): boolean {
    const d = this.job()?.dietaryRequirements;
    if (!d) return false;
    return d.vegetarian > 0 || d.vegan > 0 || d.glutenFree > 0
      || d.nutAllergy > 0 || d.dairyFree > 0 || d.kosher > 0
      || d.halal > 0 || (d.other?.trim().length ?? 0) > 0;
  }
}
