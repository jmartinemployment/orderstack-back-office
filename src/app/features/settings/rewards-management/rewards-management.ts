import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoyaltyService } from '../../../services/loyalty';
import { LoyaltyReward, LoyaltyTier, getTierLabel } from '../../../models/index';

@Component({
  selector: 'os-rewards-management',
  imports: [FormsModule],
  templateUrl: './rewards-management.html',
  styleUrl: './rewards-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RewardsManagement implements OnInit {
  private readonly loyaltyService = inject(LoyaltyService);

  readonly rewards = this.loyaltyService.rewards;
  readonly isLoading = this.loyaltyService.isLoading;

  private readonly _showModal = signal(false);
  private readonly _editingReward = signal<LoyaltyReward | null>(null);
  private readonly _deleteConfirmId = signal<string | null>(null);

  readonly showModal = this._showModal.asReadonly();
  readonly editingReward = this._editingReward.asReadonly();
  readonly deleteConfirmId = this._deleteConfirmId.asReadonly();

  readonly isEditing = computed(() => this._editingReward() !== null);

  // Form fields
  name = '';
  description = '';
  pointsCost = 100;
  discountType: 'fixed' | 'percentage' = 'fixed';
  discountValue = 5;
  minTier: LoyaltyTier = 'bronze';

  readonly tiers: LoyaltyTier[] = ['bronze', 'silver', 'gold', 'platinum'];

  ngOnInit(): void {
    this.loyaltyService.loadRewards();
  }

  getTierLabel(tier: LoyaltyTier): string {
    return getTierLabel(tier);
  }

  openAddModal(): void {
    this._editingReward.set(null);
    this.name = '';
    this.description = '';
    this.pointsCost = 100;
    this.discountType = 'fixed';
    this.discountValue = 5;
    this.minTier = 'bronze';
    this._showModal.set(true);
  }

  openEditModal(reward: LoyaltyReward): void {
    this._editingReward.set(reward);
    this.name = reward.name;
    this.description = reward.description ?? '';
    this.pointsCost = reward.pointsCost;
    this.discountType = reward.discountType;
    this.discountValue = Number(reward.discountValue);
    this.minTier = reward.minTier;
    this._showModal.set(true);
  }

  closeModal(): void {
    this._showModal.set(false);
    this._editingReward.set(null);
  }

  async saveReward(): Promise<void> {
    const data = {
      name: this.name,
      description: this.description || undefined,
      pointsCost: this.pointsCost,
      discountType: this.discountType,
      discountValue: this.discountValue,
      minTier: this.minTier,
    };

    const editing = this._editingReward();
    if (editing) {
      await this.loyaltyService.updateReward(editing.id, data);
    } else {
      await this.loyaltyService.createReward(data);
    }

    this.closeModal();
  }

  confirmDelete(id: string): void {
    this._deleteConfirmId.set(id);
  }

  cancelDelete(): void {
    this._deleteConfirmId.set(null);
  }

  async deleteReward(id: string): Promise<void> {
    await this.loyaltyService.deleteReward(id);
    this._deleteConfirmId.set(null);
  }
}
