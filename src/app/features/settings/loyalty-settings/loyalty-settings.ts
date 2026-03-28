import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoyaltyService } from '../../../services/loyalty';
import { CustomerService } from '../../../services/customer';
import { LoyaltyConfig, ReferralConfig, ReferralReward } from '../../../models/index';
import { RewardsManagement } from '../rewards-management';

@Component({
  selector: 'os-loyalty-settings',
  imports: [FormsModule, RewardsManagement],
  templateUrl: './loyalty-settings.html',
  styleUrl: './loyalty-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoyaltySettings implements OnInit {
  private readonly loyaltyService = inject(LoyaltyService);
  private readonly customerService = inject(CustomerService);

  private readonly _enabled = signal(false);
  private readonly _pointsPerDollar = signal(1);
  private readonly _pointsRedemptionRate = signal(0.01);
  private readonly _tierSilverMin = signal(500);
  private readonly _tierGoldMin = signal(2000);
  private readonly _tierPlatinumMin = signal(5000);
  private readonly _silverMultiplier = signal(1.25);
  private readonly _goldMultiplier = signal(1.5);
  private readonly _platinumMultiplier = signal(2);
  private readonly _saved = signal(false);
  private readonly _isSaving = signal(false);

  // Referral program
  private readonly _referralEnabled = signal(false);
  private readonly _referrerRewardType = signal<ReferralReward['type']>('points');
  private readonly _referrerRewardValue = signal(100);
  private readonly _refereeRewardType = signal<ReferralReward['type']>('discount_percentage');
  private readonly _refereeRewardValue = signal(10);
  private readonly _maxReferrals = signal<number | null>(null);
  private readonly _referralSaved = signal(false);
  private readonly _isReferralSaving = signal(false);

  readonly enabled = this._enabled.asReadonly();
  readonly pointsPerDollar = this._pointsPerDollar.asReadonly();
  readonly pointsRedemptionRate = this._pointsRedemptionRate.asReadonly();
  readonly tierSilverMin = this._tierSilverMin.asReadonly();
  readonly tierGoldMin = this._tierGoldMin.asReadonly();
  readonly tierPlatinumMin = this._tierPlatinumMin.asReadonly();
  readonly silverMultiplier = this._silverMultiplier.asReadonly();
  readonly goldMultiplier = this._goldMultiplier.asReadonly();
  readonly platinumMultiplier = this._platinumMultiplier.asReadonly();
  readonly saved = this._saved.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly isLoading = this.loyaltyService.isLoading;

  readonly referralEnabled = this._referralEnabled.asReadonly();
  readonly referrerRewardType = this._referrerRewardType.asReadonly();
  readonly referrerRewardValue = this._referrerRewardValue.asReadonly();
  readonly refereeRewardType = this._refereeRewardType.asReadonly();
  readonly refereeRewardValue = this._refereeRewardValue.asReadonly();
  readonly maxReferrals = this._maxReferrals.asReadonly();
  readonly referralSaved = this._referralSaved.asReadonly();
  readonly isReferralSaving = this._isReferralSaving.asReadonly();

  readonly redemptionPreview = computed(() => {
    const rate = this._pointsRedemptionRate();
    return Math.round(100 * rate * 100) / 100;
  });

  readonly isDirty = computed(() => {
    const config = this.loyaltyService.config();
    return this._enabled() !== config.enabled
      || this._pointsPerDollar() !== config.pointsPerDollar
      || this._pointsRedemptionRate() !== Number(config.pointsRedemptionRate)
      || this._tierSilverMin() !== config.tierSilverMin
      || this._tierGoldMin() !== config.tierGoldMin
      || this._tierPlatinumMin() !== config.tierPlatinumMin
      || this._silverMultiplier() !== Number(config.silverMultiplier)
      || this._goldMultiplier() !== Number(config.goldMultiplier)
      || this._platinumMultiplier() !== Number(config.platinumMultiplier);
  });

  ngOnInit(): void {
    this.loyaltyService.loadConfig().then(() => this.syncFromConfig());
    this.customerService.loadReferralConfig().then(() => this.syncReferralConfig());
  }

  private syncFromConfig(): void {
    const c = this.loyaltyService.config();
    this._enabled.set(c.enabled);
    this._pointsPerDollar.set(c.pointsPerDollar);
    this._pointsRedemptionRate.set(Number(c.pointsRedemptionRate));
    this._tierSilverMin.set(c.tierSilverMin);
    this._tierGoldMin.set(c.tierGoldMin);
    this._tierPlatinumMin.set(c.tierPlatinumMin);
    this._silverMultiplier.set(Number(c.silverMultiplier));
    this._goldMultiplier.set(Number(c.goldMultiplier));
    this._platinumMultiplier.set(Number(c.platinumMultiplier));
  }

  onToggle(event: Event): void {
    this._enabled.set((event.target as HTMLInputElement).checked);
    this._saved.set(false);
  }

  onFieldChange(field: string, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    switch (field) {
      case 'pointsPerDollar': this._pointsPerDollar.set(value); break;
      case 'pointsRedemptionRate': this._pointsRedemptionRate.set(value); break;
      case 'tierSilverMin': this._tierSilverMin.set(value); break;
      case 'tierGoldMin': this._tierGoldMin.set(value); break;
      case 'tierPlatinumMin': this._tierPlatinumMin.set(value); break;
      case 'silverMultiplier': this._silverMultiplier.set(value); break;
      case 'goldMultiplier': this._goldMultiplier.set(value); break;
      case 'platinumMultiplier': this._platinumMultiplier.set(value); break;
    }
    this._saved.set(false);
  }

  async save(): Promise<void> {
    this._isSaving.set(true);
    const data: Partial<LoyaltyConfig> = {
      enabled: this._enabled(),
      pointsPerDollar: this._pointsPerDollar(),
      pointsRedemptionRate: this._pointsRedemptionRate(),
      tierSilverMin: this._tierSilverMin(),
      tierGoldMin: this._tierGoldMin(),
      tierPlatinumMin: this._tierPlatinumMin(),
      silverMultiplier: this._silverMultiplier(),
      goldMultiplier: this._goldMultiplier(),
      platinumMultiplier: this._platinumMultiplier(),
    };

    const success = await this.loyaltyService.saveConfig(data);
    this._isSaving.set(false);
    if (success) {
      this._saved.set(true);
    }
  }

  discard(): void {
    this.syncFromConfig();
    this._saved.set(false);
  }

  // --- Referral Program ---

  private syncReferralConfig(): void {
    const config = this.customerService.referralConfig();
    if (!config) return;
    this._referralEnabled.set(config.enabled);
    this._referrerRewardType.set(config.referrerReward.type);
    this._referrerRewardValue.set(config.referrerReward.value);
    this._refereeRewardType.set(config.refereeReward.type);
    this._refereeRewardValue.set(config.refereeReward.value);
    this._maxReferrals.set(config.maxReferrals);
  }

  onReferralToggle(event: Event): void {
    this._referralEnabled.set((event.target as HTMLInputElement).checked);
    this._referralSaved.set(false);
  }

  onReferralField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    switch (field) {
      case 'referrerRewardType': this._referrerRewardType.set(value as ReferralReward['type']); break;
      case 'referrerRewardValue': this._referrerRewardValue.set(Number(value) || 0); break;
      case 'refereeRewardType': this._refereeRewardType.set(value as ReferralReward['type']); break;
      case 'refereeRewardValue': this._refereeRewardValue.set(Number(value) || 0); break;
      case 'maxReferrals': this._maxReferrals.set(value ? Number.parseInt(value, 10) : null); break;
    }
    this._referralSaved.set(false);
  }

  async saveReferral(): Promise<void> {
    this._isReferralSaving.set(true);
    const config: ReferralConfig = {
      enabled: this._referralEnabled(),
      referrerReward: {
        type: this._referrerRewardType(),
        value: this._referrerRewardValue(),
        freeItemId: null,
      },
      refereeReward: {
        type: this._refereeRewardType(),
        value: this._refereeRewardValue(),
        freeItemId: null,
      },
      maxReferrals: this._maxReferrals(),
    };
    const success = await this.customerService.saveReferralConfig(config);
    this._isReferralSaving.set(false);
    if (success) {
      this._referralSaved.set(true);
    }
  }
}
