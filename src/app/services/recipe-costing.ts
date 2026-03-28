import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Recipe,
  RecipeFormData,
  FoodCostSummary,
} from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RecipeCostingService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _recipes = signal<Recipe[]>([]);
  private readonly _foodCostSummary = signal<FoodCostSummary | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly recipes = this._recipes.asReadonly();
  readonly foodCostSummary = this._foodCostSummary.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly recipesWithCost = computed(() =>
    this._recipes().filter(r => r.totalCost !== undefined && r.totalCost > 0)
  );

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  async loadRecipes(): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const recipes = await firstValueFrom(
        this.http.get<Recipe[]>(`${this.apiUrl}/merchant/${this.merchantId}/recipes`)
      );
      this._recipes.set(recipes);
    } catch {
      this._error.set('Failed to load recipes');
    } finally {
      this._isLoading.set(false);
    }
  }

  async createRecipe(data: RecipeFormData): Promise<Recipe | null> {
    if (!this.merchantId) return null;
    this._error.set(null);
    try {
      const recipe = await firstValueFrom(
        this.http.post<Recipe>(`${this.apiUrl}/merchant/${this.merchantId}/recipes`, data)
      );
      this._recipes.update(list => [...list, recipe]);
      return recipe;
    } catch {
      this._error.set('Failed to create recipe');
      return null;
    }
  }

  async updateRecipe(id: string, data: Partial<RecipeFormData>): Promise<void> {
    if (!this.merchantId) return;
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<Recipe>(`${this.apiUrl}/merchant/${this.merchantId}/recipes/${id}`, data)
      );
      this._recipes.update(list => list.map(r => r.id === id ? updated : r));
    } catch {
      this._error.set('Failed to update recipe');
    }
  }

  async deleteRecipe(id: string): Promise<void> {
    if (!this.merchantId) return;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/merchant/${this.merchantId}/recipes/${id}`)
      );
      this._recipes.update(list => list.filter(r => r.id !== id));
    } catch {
      this._error.set('Failed to delete recipe');
    }
  }

  async loadFoodCostReport(days: number = 30): Promise<void> {
    if (!this.merchantId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const summary = await firstValueFrom(
        this.http.get<FoodCostSummary>(
          `${this.apiUrl}/merchant/${this.merchantId}/food-cost-report`,
          { params: { days: days.toString() } }
        )
      );
      this._foodCostSummary.set(summary);
    } catch {
      this._error.set('Failed to load food cost report');
    } finally {
      this._isLoading.set(false);
    }
  }

  getRecipeForMenuItem(menuItemId: string): Recipe | undefined {
    return this._recipes().find(r => r.menuItemId === menuItemId);
  }

  clearError(): void {
    this._error.set(null);
  }
}
