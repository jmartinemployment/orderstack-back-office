import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { AuthService } from '../../../services/auth';
import { PriceAdjustmentType } from '../../../models/index';

@Component({
  selector: 'os-online-pricing',
  imports: [FormsModule],
  templateUrl: './online-pricing.html',
  styleUrl: './online-pricing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlinePricing implements OnInit {
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly authService = inject(AuthService);

  readonly isLoading = this.settingsService.isLoading;
  readonly isSaving = this.settingsService.isSaving;

  // Local form signals
  private readonly _enabled = signal(false);
  private readonly _adjustmentType = signal<PriceAdjustmentType>('percentage');
  private readonly _adjustmentAmount = signal(0);
  private readonly _deliveryFee = signal(0);
  private readonly _showAdjustmentToCustomer = signal(true);
  private readonly _hasUnsavedChanges = signal(false);
  private readonly _showSaveSuccess = signal(false);

  readonly enabled = this._enabled.asReadonly();
  readonly adjustmentType = this._adjustmentType.asReadonly();
  readonly adjustmentAmount = this._adjustmentAmount.asReadonly();
  readonly deliveryFee = this._deliveryFee.asReadonly();
  readonly showAdjustmentToCustomer = this._showAdjustmentToCustomer.asReadonly();
  readonly hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();
  readonly showSaveSuccess = this._showSaveSuccess.asReadonly();

  readonly isManagerOrAbove = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'owner' || role === 'manager' || role === 'super_admin';
  });

  readonly previewBasePrice = 10;

  readonly previewOnlinePrice = computed(() => {
    if (!this._enabled()) return this.previewBasePrice;
    if (this._adjustmentType() === 'percentage') {
      return this.previewBasePrice * (1 + this._adjustmentAmount() / 100);
    }
    return this.previewBasePrice + this._adjustmentAmount();
  });

  readonly previewTotal = computed(() => {
    return this.previewOnlinePrice() + this._deliveryFee();
  });

  readonly adjustmentLabel = computed(() => {
    if (this._adjustmentType() === 'percentage') {
      return `${this._adjustmentAmount()}%`;
    }
    return `$${this._adjustmentAmount().toFixed(2)}/item`;
  });

  ngOnInit(): void {
    this.loadFromService();
  }

  private loadFromService(): void {
    const s = this.settingsService.onlinePricingSettings();
    this._enabled.set(s.enabled);
    this._adjustmentType.set(s.adjustmentType);
    this._adjustmentAmount.set(s.adjustmentAmount);
    this._deliveryFee.set(s.deliveryFee);
    this._showAdjustmentToCustomer.set(s.showAdjustmentToCustomer);
    this._hasUnsavedChanges.set(false);
  }

  onEnabledToggle(event: Event): void {
    this._enabled.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  onAdjustmentType(event: Event): void {
    this._adjustmentType.set((event.target as HTMLSelectElement).value as PriceAdjustmentType);
    this._adjustmentAmount.set(0);
    this._hasUnsavedChanges.set(true);
  }

  onAdjustmentAmount(event: Event): void {
    this._adjustmentAmount.set(Number.parseFloat((event.target as HTMLInputElement).value) || 0);
    this._hasUnsavedChanges.set(true);
  }

  onDeliveryFee(event: Event): void {
    this._deliveryFee.set(Number.parseFloat((event.target as HTMLInputElement).value) || 0);
    this._hasUnsavedChanges.set(true);
  }

  onVisibilityToggle(event: Event): void {
    this._showAdjustmentToCustomer.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  async save(): Promise<void> {
    await this.settingsService.saveOnlinePricingSettings({
      enabled: this._enabled(),
      adjustmentType: this._adjustmentType(),
      adjustmentAmount: this._adjustmentAmount(),
      deliveryFee: this._deliveryFee(),
      showAdjustmentToCustomer: this._showAdjustmentToCustomer(),
    });
    this._hasUnsavedChanges.set(false);
    this._showSaveSuccess.set(true);
    setTimeout(() => this._showSaveSuccess.set(false), 3000);
  }

  discard(): void {
    this.loadFromService();
  }
}
