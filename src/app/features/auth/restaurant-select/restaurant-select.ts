import { Component, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../services/auth';
import { Restaurant } from '../../../models/index';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../../shared/error-display/error-display';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'os-restaurant-select',
  imports: [LoadingSpinner, ErrorDisplay, RouterLink],
  templateUrl: './restaurant-select.html',
  styleUrl: './restaurant-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantSelect {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly selectedMerchantId = this.authService.selectedMerchantId;

  private readonly _restaurants = signal<Restaurant[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _restaurantsLoaded = signal(false);
  private readonly _isSelecting = signal(false);

  readonly restaurants = this._restaurants.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly userName = this.authService.user;
  readonly isSelecting = this._isSelecting.asReadonly();

  constructor() {
    effect(() => {
      if (this.isAuthenticated() && !this._restaurantsLoaded()) {
        this._restaurantsLoaded.set(true);
        this.loadRestaurants();
      }
    });
  }

  private async loadRestaurants(): Promise<void> {
    let merchantIds = this.authService.userMerchants();

    // If the cached merchant list is empty, attempt a server refresh before giving up.
    // This handles the case where signup returned restaurants:[] but the merchant was
    // created during onboarding (BUG-39).
    if (merchantIds.length === 0) {
      const refreshed = await this.authService.refreshMerchantsFromServer();
      if (refreshed) {
        merchantIds = this.authService.userMerchants();
      }
    }

    if (merchantIds.length === 0) {
      this._error.set('No restaurants found for your account. Please contact support or start a new restaurant setup.');
      return;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const restaurants: Restaurant[] = [];
      for (const id of merchantIds) {
        const restaurant = await firstValueFrom(
          this.http.get<Restaurant>(`${this.apiUrl}/merchant/${id}`)
        );
        restaurants.push(restaurant);
      }
      this._restaurants.set(restaurants);
    } catch (err: any) {
      const message = err?.error?.message ?? 'Failed to load restaurants';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async selectMerchant(restaurant: Restaurant): Promise<void> {
    if (this._isSelecting()) return; // prevent double-click
    this._isSelecting.set(true);
    this._error.set(null);
    try {
      this.authService.selectMerchant(
        restaurant.id,
        restaurant.name,
        restaurant.logo,
        restaurant.address
      );
      await this.authService.navigatePostAuth();
    } catch {
      this._error.set('Navigation failed — please try again');
    } finally {
      this._isSelecting.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }

  clearError(): void {
    this._error.set(null);
  }

  retry(): void {
    this.loadRestaurants();
  }
}
