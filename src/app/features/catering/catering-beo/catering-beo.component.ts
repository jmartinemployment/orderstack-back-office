import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CateringJob } from '../../../models/index';
import { CateringService } from '../../../services/catering.service';

@Component({
  selector: 'os-catering-beo',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './catering-beo.component.html',
  styleUrls: ['./catering-beo.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringBeoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cateringService = inject(CateringService);

  readonly job = signal<CateringJob | null>(null);
  readonly isLoading = signal(false);
  readonly today = new Date();

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.goBack();
      return;
    }

    this.isLoading.set(true);
    try {
      const result = await this.cateringService.getJob(id);
      this.job.set(result);
    } finally {
      this.isLoading.set(false);
    }
  }

  print(): void {
    globalThis.print();
  }

  goBack(): void {
    const j = this.job();
    if (j) {
      this.router.navigate(['/app/catering/job', j.id]);
    } else {
      this.router.navigate(['/app/catering']);
    }
  }

  formatCents(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  formatTime(time: string | undefined): string {
    if (!time) return '--';
    const [hourStr, minuteStr] = time.split(':');
    const hour = Number.parseInt(hourStr, 10);
    if (Number.isNaN(hour)) return time;
    const minute = minuteStr ?? '00';
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute} ${period}`;
  }

  get selectedPackage() {
    const j = this.job();
    if (!j?.selectedPackageId || !j.packages) return null;
    return j.packages.find(p => p.id === j.selectedPackageId) ?? null;
  }

  get dietaryEntries(): { label: string; count: number }[] {
    const d = this.job()?.dietaryRequirements;
    if (!d) return [];
    const entries: { label: string; count: number }[] = [];
    if (d.vegetarian) entries.push({ label: 'Vegetarian', count: d.vegetarian });
    if (d.vegan) entries.push({ label: 'Vegan', count: d.vegan });
    if (d.glutenFree) entries.push({ label: 'Gluten-Free', count: d.glutenFree });
    if (d.nutAllergy) entries.push({ label: 'Nut Allergy', count: d.nutAllergy });
    if (d.dairyFree) entries.push({ label: 'Dairy-Free', count: d.dairyFree });
    if (d.kosher) entries.push({ label: 'Kosher', count: d.kosher });
    if (d.halal) entries.push({ label: 'Halal', count: d.halal });
    if (d.other) entries.push({ label: d.other, count: 0 });
    return entries;
  }
}
