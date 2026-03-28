import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CateringPrepList } from '../../../models/index';
import { CateringService } from '../../../services/catering.service';

@Component({
  selector: 'os-catering-prep-list',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './catering-prep-list.component.html',
  styleUrl: './catering-prep-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringPrepListComponent implements OnInit {
  private readonly cateringService = inject(CateringService);

  readonly prepList = signal<CateringPrepList | null>(null);
  readonly isLoading = signal(false);
  readonly selectedDate = signal(new Date().toISOString().split('T')[0]);

  async ngOnInit(): Promise<void> {
    await this.loadDate();
  }

  async loadDate(): Promise<void> {
    this.isLoading.set(true);
    try {
      const result = await this.cateringService.loadPrepList(this.selectedDate());
      this.prepList.set(result);
    } finally {
      this.isLoading.set(false);
    }
  }

  print(): void {
    globalThis.print();
  }

  onDateChange(value: string): void {
    this.selectedDate.set(value);
  }

  formatTime(time: string | undefined | null): string {
    if (!time) return '--';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }

  get selectedPackageForJob() {
    return (job: CateringPrepList['jobs'][number]) => {
      if (!job.selectedPackageId || !job.packages) return null;
      return job.packages.find(p => p.id === job.selectedPackageId) ?? null;
    };
  }

  dietaryEntriesForJob(job: CateringPrepList['jobs'][number]): { label: string; count: number }[] {
    const d = job.dietaryRequirements;
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
