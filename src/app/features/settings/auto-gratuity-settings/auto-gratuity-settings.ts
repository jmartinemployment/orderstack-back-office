import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { AutoGratuitySettings } from '../../../models/index';

@Component({
  selector: 'os-auto-gratuity-settings',
  standalone: true,
  templateUrl: './auto-gratuity-settings.html',
  styleUrl: './auto-gratuity-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoGratuitySettingsComponent implements OnInit {
  private readonly settingsService = inject(RestaurantSettingsService);

  private readonly _enabled = signal(false);
  private readonly _minPartySize = signal(6);
  private readonly _gratuityPercent = signal(18);
  private readonly _applyToTakeout = signal(false);
  private readonly _applyToDelivery = signal(false);
  private readonly _isDirty = signal(false);
  private readonly _isSaving = signal(false);

  readonly enabled = this._enabled.asReadonly();
  readonly minPartySize = this._minPartySize.asReadonly();
  readonly gratuityPercent = this._gratuityPercent.asReadonly();
  readonly applyToTakeout = this._applyToTakeout.asReadonly();
  readonly applyToDelivery = this._applyToDelivery.asReadonly();
  readonly isDirty = this._isDirty.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();

  ngOnInit(): void {
    this.loadFromService();
  }

  private loadFromService(): void {
    const s = this.settingsService.autoGratuitySettings();
    this._enabled.set(s.enabled);
    this._minPartySize.set(s.minPartySize);
    this._gratuityPercent.set(s.gratuityPercent);
    this._applyToTakeout.set(s.applyToTakeout);
    this._applyToDelivery.set(s.applyToDelivery);
    this._isDirty.set(false);
  }

  onEnabledChange(event: Event): void {
    this._enabled.set((event.target as HTMLInputElement).checked);
    this._isDirty.set(true);
  }

  onMinPartySizeInput(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10) || 2;
    this._minPartySize.set(Math.max(2, Math.min(50, value)));
    this._isDirty.set(true);
  }

  onGratuityPercentInput(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10) || 15;
    this._gratuityPercent.set(Math.max(5, Math.min(30, value)));
    this._isDirty.set(true);
  }

  onApplyToTakeoutChange(event: Event): void {
    this._applyToTakeout.set((event.target as HTMLInputElement).checked);
    this._isDirty.set(true);
  }

  onApplyToDeliveryChange(event: Event): void {
    this._applyToDelivery.set((event.target as HTMLInputElement).checked);
    this._isDirty.set(true);
  }

  async save(): Promise<void> {
    this._isSaving.set(true);
    const settings: AutoGratuitySettings = {
      enabled: this._enabled(),
      minPartySize: this._minPartySize(),
      gratuityPercent: this._gratuityPercent(),
      applyToTakeout: this._applyToTakeout(),
      applyToDelivery: this._applyToDelivery(),
    };
    await this.settingsService.saveAutoGratuitySettings(settings);
    this._isSaving.set(false);
    this._isDirty.set(false);
  }

  discard(): void {
    this.loadFromService();
  }
}
