import { Component, ChangeDetectionStrategy, inject, computed, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MenuService } from '../../../services/menu';
import { MenuItem } from '../../../models/menu.model';

@Component({
  selector: 'os-beverages',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './beverages.component.html',
  styleUrl: './beverages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeveragesComponent implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly router = inject(Router);

  readonly isLoading = this.menuService.isLoading;

  readonly beverageItems = computed(() =>
    this.menuService.allItems().filter(i => i.itemCategory === 'beverage')
  );

  readonly beverageGroupEntries = computed(() => {
    const groups = new Map<string, MenuItem[]>();
    for (const item of this.beverageItems()) {
      const type = item.beverageType ?? 'other';
      const list = groups.get(type) ?? [];
      list.push(item);
      groups.set(type, list);
    }
    return [...groups.entries()].map(([type, items]) => ({ type, items }));
  });

  readonly nonBeverageItems = computed(() =>
    this.menuService.allItems().filter(i => i.itemCategory !== 'beverage')
  );

  readonly avgPricePerHead = computed(() => {
    const items = this.beverageItems();
    if (items.length === 0) return 0;
    return items.reduce((sum, i) => sum + Number(i.price), 0) / items.length;
  });

  readonly beverageTypeCount = computed(() =>
    new Set(this.beverageItems().map(i => i.beverageType ?? 'other')).size
  );

  ngOnInit(): void {
    this.menuService.loadMenu();
  }

  goToNewItem(): void {
    this.router.navigate(['/app/menu']);
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      spirit: 'Spirits',
      wine: 'Wine',
      beer: 'Beer',
      'non-alcoholic': 'Non-Alcoholic',
      'coffee-tea': 'Coffee & Tea',
      other: 'Other',
    };
    return labels[type] ?? type;
  }

  async markAsBeverage(item: MenuItem): Promise<void> {
    await this.menuService.updateItem(item.id, { itemCategory: 'beverage' } as Partial<MenuItem>);
  }

  getCateringAllergens(item: MenuItem): string[] {
    return item.cateringAllergens ?? [];
  }
}
