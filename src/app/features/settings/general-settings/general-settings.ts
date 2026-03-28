import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlatformService } from '../../../services/platform';
import type { BusinessHoursDay, BusinessAddress, MerchantProfile } from '../../../models/index';

const DAYS: BusinessHoursDay['day'][] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

const DAY_LABELS: Record<BusinessHoursDay['day'], string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const US_TIMEZONES: { value: string; label: string }[] = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
];

@Component({
  selector: 'os-general-settings',
  imports: [FormsModule],
  templateUrl: './general-settings.html',
  styleUrl: './general-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralSettings {
  private readonly platformService = inject(PlatformService);

  readonly isLoading = this.platformService.isLoading;
  readonly days = DAYS;
  readonly dayLabels = DAY_LABELS;
  readonly timezones = US_TIMEZONES;

  private readonly _businessName = signal('');
  private readonly _street = signal('');
  private readonly _street2 = signal('');
  private readonly _city = signal('');
  private readonly _state = signal('');
  private readonly _zip = signal('');
  private readonly _phone = signal('');
  private readonly _timezone = signal('America/New_York');
  private readonly _businessHours = signal<BusinessHoursDay[]>([]);
  private readonly _isSaving = signal(false);
  private readonly _hasUnsavedChanges = signal(false);
  private readonly _showSaveSuccess = signal(false);
  private readonly _networkIpUpdating = signal(false);
  private readonly _networkIpSuccess = signal<string | null>(null);

  readonly businessName = this._businessName.asReadonly();
  readonly street = this._street.asReadonly();
  readonly street2 = this._street2.asReadonly();
  readonly city = this._city.asReadonly();
  readonly state = this._state.asReadonly();
  readonly zip = this._zip.asReadonly();
  readonly phone = this._phone.asReadonly();
  readonly timezone = this._timezone.asReadonly();
  readonly businessHours = this._businessHours.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();
  readonly showSaveSuccess = this._showSaveSuccess.asReadonly();
  readonly networkIpUpdating = this._networkIpUpdating.asReadonly();
  readonly networkIpSuccess = this._networkIpSuccess.asReadonly();

  readonly formattedAddress = computed(() => {
    const parts = [this._street(), this._city(), this._state(), this._zip()].filter(Boolean);
    return parts.join(', ');
  });

  constructor() {
    effect(() => {
      const profile = this.platformService.merchantProfile();
      if (profile) {
        this.loadFromProfile(profile);
      }
    });
  }

  updateBusinessName(value: string): void {
    this._businessName.set(value);
    this._hasUnsavedChanges.set(true);
  }

  updateStreet(value: string): void {
    this._street.set(value);
    this._hasUnsavedChanges.set(true);
  }

  updateStreet2(value: string): void {
    this._street2.set(value);
    this._hasUnsavedChanges.set(true);
  }

  updateCity(value: string): void {
    this._city.set(value);
    this._hasUnsavedChanges.set(true);
  }

  updateState(value: string): void {
    this._state.set(value);
    this._hasUnsavedChanges.set(true);
  }

  updateZip(value: string): void {
    this._zip.set(value);
    this._hasUnsavedChanges.set(true);
  }

  updatePhone(value: string): void {
    this._phone.set(value);
    this._hasUnsavedChanges.set(true);
  }

  updateTimezone(value: string): void {
    this._timezone.set(value);
    this._hasUnsavedChanges.set(true);
  }

  updateDayOpen(day: BusinessHoursDay['day'], value: string): void {
    this._businessHours.update(hours =>
      hours.map(h => h.day === day ? { ...h, open: value } : h)
    );
    this._hasUnsavedChanges.set(true);
  }

  updateDayClose(day: BusinessHoursDay['day'], value: string): void {
    this._businessHours.update(hours =>
      hours.map(h => h.day === day ? { ...h, close: value } : h)
    );
    this._hasUnsavedChanges.set(true);
  }

  toggleDayClosed(day: BusinessHoursDay['day']): void {
    this._businessHours.update(hours =>
      hours.map(h => h.day === day ? { ...h, closed: !h.closed } : h)
    );
    this._hasUnsavedChanges.set(true);
  }

  getHoursForDay(day: BusinessHoursDay['day']): BusinessHoursDay | undefined {
    return this._businessHours().find(h => h.day === day);
  }

  async save(): Promise<void> {
    this._isSaving.set(true);

    const address: BusinessAddress = {
      street: this._street(),
      street2: this._street2() || null,
      city: this._city(),
      state: this._state(),
      zip: this._zip(),
      country: 'US',
      timezone: this._timezone(),
      phone: this._phone() || null,
      lat: this.platformService.merchantProfile()?.address?.lat ?? null,
      lng: this.platformService.merchantProfile()?.address?.lng ?? null,
    };

    await this.platformService.saveMerchantProfile({
      businessName: this._businessName(),
      address,
      businessHours: this._businessHours(),
    });

    this._isSaving.set(false);
    this._hasUnsavedChanges.set(false);
    this._showSaveSuccess.set(true);
    setTimeout(() => this._showSaveSuccess.set(false), 3000);
  }

  async updateNetworkIp(): Promise<void> {
    this._networkIpUpdating.set(true);
    this._networkIpSuccess.set(null);
    const result = await this.platformService.updateNetworkIp();
    this._networkIpUpdating.set(false);
    if (result.success) {
      this._networkIpSuccess.set(result.networkIp ?? 'Updated');
      setTimeout(() => this._networkIpSuccess.set(null), 4000);
    }
  }

  private loadFromProfile(profile: MerchantProfile): void {
    this._businessName.set(profile.businessName);
    this._street.set(profile.address?.street ?? '');
    this._street2.set(profile.address?.street2 ?? '');
    this._city.set(profile.address?.city ?? '');
    this._state.set(profile.address?.state ?? '');
    this._zip.set(profile.address?.zip ?? '');
    this._phone.set(profile.address?.phone ?? '');
    this._timezone.set(profile.address?.timezone ?? 'America/New_York');
    this._businessHours.set(
      (profile.businessHours ?? []).length > 0
        ? structuredClone(profile.businessHours)
        : DAYS.map(day => ({ day, open: '09:00', close: '22:00', closed: false }))
    );
  }
}
