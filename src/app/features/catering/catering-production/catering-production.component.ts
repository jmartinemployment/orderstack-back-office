import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CateringService } from '../../../services/catering.service';
import { RecipeCostingService } from '../../../services/recipe-costing';
import { AggregatedIngredient, CateringPackage, CateringPrepList } from '../../../models/catering.model';

@Component({
  selector: 'os-catering-production',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './catering-production.component.html',
  styleUrl: './catering-production.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringProductionComponent implements OnInit {
  private readonly cateringService = inject(CateringService);
  private readonly recipeCostingService = inject(RecipeCostingService);

  private readonly _isLoading = signal(false);
  private readonly _prepListData = signal<CateringPrepList | null>(null);

  private getTomorrow(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private readonly _selectedDate = signal(this.getTomorrow());
  readonly selectedDate = this._selectedDate.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly prepListData = this._prepListData.asReadonly();

  private aggregateJobIngredients(
    job: CateringPrepList['jobs'][number],
    map: Map<string, AggregatedIngredient>,
  ): void {
    const pkg = job.packages.find((p: CateringPackage) => p.id === job.selectedPackageId);
    if (!pkg) return;
    for (const itemId of pkg.menuItemIds) {
      const recipe = this.recipeCostingService.getRecipeForMenuItem(itemId);
      if (!recipe) continue;
      const scaleFactor = job.headcount / (recipe.yieldQty || 1);
      for (const ing of recipe.ingredients ?? []) {
        const key = `${ing.ingredientName}|${ing.unit}`;
        const existing = map.get(key);
        if (existing) {
          existing.totalQuantity += ing.quantity * scaleFactor;
          if (!existing.jobs.includes(job.id)) existing.jobs.push(job.id);
        } else {
          map.set(key, {
            name: ing.ingredientName,
            unit: ing.unit,
            totalQuantity: ing.quantity * scaleFactor,
            unitCost: ing.estimatedUnitCost,
            jobs: [job.id],
          });
        }
      }
    }
  }

  readonly aggregatedIngredients = computed((): AggregatedIngredient[] => {
    const prepList = this._prepListData();
    if (!prepList) return [];
    const map = new Map<string, AggregatedIngredient>();
    for (const job of prepList.jobs) {
      this.aggregateJobIngredients(job, map);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly totalGuests = computed(() =>
    this._prepListData()?.jobs.reduce((sum, j) => sum + (j.headcount ?? 0), 0) ?? 0
  );

  ngOnInit(): void {
    this.recipeCostingService.loadRecipes();
    this.loadForDate(this._selectedDate());
  }

  async loadForDate(date: string): Promise<void> {
    this._isLoading.set(true);
    this._selectedDate.set(date);
    try {
      const result = await this.cateringService.loadPrepList(date);
      this._prepListData.set(result);
    } finally {
      this._isLoading.set(false);
    }
  }

  exportCsv(): void {
    const rows = this.aggregatedIngredients();
    if (rows.length === 0) return;
    const header = 'Ingredient,Quantity,Unit,Est. Cost,Jobs\n';
    const body = rows.map(r => {
      const cost = r.unitCost == null ? 'N/A' : `$${r.unitCost.toFixed(2)}`;
      return `"${r.name}",${r.totalQuantity.toFixed(2)},${r.unit},${cost},"${r.jobs.join(', ')}"`;
    }).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-report-${this._selectedDate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  print(): void {
    globalThis.print();
  }

  getPackageForJob(job: CateringPrepList['jobs'][number]): CateringPackage | undefined {
    return job.packages.find((p: CateringPackage) => p.id === job.selectedPackageId);
  }
}
