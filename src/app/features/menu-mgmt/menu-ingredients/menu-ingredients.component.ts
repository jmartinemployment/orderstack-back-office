import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MenuService } from '../../../services/menu';
import { RecipeCostingService } from '../../../services/recipe-costing';
import { MenuItem } from '../../../models/menu.model';
import { Recipe } from '../../../models/index';

@Component({
  selector: 'os-menu-ingredients',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './menu-ingredients.component.html',
  styleUrl: './menu-ingredients.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuIngredientsComponent implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly recipeCostingService = inject(RecipeCostingService);

  private readonly _searchQuery = signal('');
  readonly searchQuery = this._searchQuery.asReadonly();

  readonly isLoading = computed(() =>
    this.menuService.isLoading() || this.recipeCostingService.isLoading()
  );

  readonly cateringItems = computed(() => this.menuService.cateringItems());

  readonly itemsWithRecipes = computed(() =>
    this.cateringItems().filter(i => this.recipeCostingService.getRecipeForMenuItem(i.id) !== undefined)
  );

  readonly itemsWithoutRecipes = computed(() =>
    this.cateringItems().filter(i => this.recipeCostingService.getRecipeForMenuItem(i.id) === undefined)
  );

  readonly recipeCoveragePercent = computed(() => {
    const total = this.cateringItems().length;
    return total === 0 ? 0 : Math.round((this.itemsWithRecipes().length / total) * 100);
  });

  readonly costAlerts = computed(() => {
    const FOOD_COST_THRESHOLD = 0.35;
    return this.cateringItems()
      .map(item => {
        const recipe = this.recipeCostingService.getRecipeForMenuItem(item.id);
        const price = Number(item.price);
        const costPerServing = recipe?.costPerServing ?? null;
        const foodCostPct = costPerServing !== null && price > 0 ? costPerServing / price : null;
        let alertType: 'high-cost' | 'no-cost-data' | 'no-recipe' | null;
        if (recipe === undefined) {
          alertType = 'no-recipe';
        } else if (costPerServing === null) {
          alertType = 'no-cost-data';
        } else if (foodCostPct !== null && foodCostPct > FOOD_COST_THRESHOLD) {
          alertType = 'high-cost';
        } else {
          alertType = null;
        }
        return { item, recipe, costPerServing, foodCostPct, alertType };
      })
      .filter((r): r is typeof r & { alertType: NonNullable<typeof r.alertType> } => r.alertType !== null);
  });

  readonly filteredItems = computed(() => {
    const q = this._searchQuery().toLowerCase().trim();
    if (!q) return this.cateringItems();
    return this.cateringItems().filter(item => {
      if (item.name.toLowerCase().includes(q)) return true;
      const recipe = this.recipeCostingService.getRecipeForMenuItem(item.id);
      return recipe?.ingredients?.some(ing => ing.ingredientName.toLowerCase().includes(q)) ?? false;
    });
  });

  ngOnInit(): void {
    this.recipeCostingService.loadRecipes();
    this.menuService.loadMenu();
  }

  onSearch(value: string): void {
    this._searchQuery.set(value);
  }

  getRecipe(itemId: string): Recipe | undefined {
    return this.recipeCostingService.getRecipeForMenuItem(itemId);
  }

  getFoodCostPct(item: MenuItem): number | null {
    const recipe = this.getRecipe(item.id);
    const price = Number(item.price);
    const cost = recipe?.costPerServing ?? null;
    return cost !== null && price > 0 ? (cost / price) * 100 : null;
  }

  getCateringAllergens(item: MenuItem): string[] {
    return item.cateringAllergens ?? [];
  }
}
