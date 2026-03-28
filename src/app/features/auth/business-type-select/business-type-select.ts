import { Component, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PlatformService } from '../../../services/platform';
import { AuthService } from '../../../services/auth';

type BusinessTypeOption = 'catering' | 'full_service';

@Component({
  selector: 'os-business-type-select',
  imports: [],
  templateUrl: './business-type-select.html',
  styleUrl: './business-type-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessTypeSelect {
  private readonly router = inject(Router);
  private readonly platformService = inject(PlatformService);
  private readonly authService = inject(AuthService);

  readonly selected = signal<BusinessTypeOption | null>(null);
  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly canProceed = computed(() => {
    if (this.isSubmitting()) return false;
    return !!this.selected();
  });

  select(type: BusinessTypeOption): void {
    this.selected.set(type);
  }

  async next(): Promise<void> {
    const type = this.selected();
    if (!type || !this.canProceed()) return;

    this.isSubmitting.set(true);
    this.error.set(null);

    const businessCategory = type === 'catering' ? 'Caterer' : 'Full Service Restaurant';
    const defaultDeviceMode = type === 'catering' ? 'catering' : 'full_service';

    const merchantId = this.authService.selectedMerchantId();
    if (!merchantId) {
      this.error.set('No restaurant selected. Please sign in again.');
      this.isSubmitting.set(false);
      return;
    }

    try {
      await this.platformService.saveWizardProgress({
        businessCategory,
        primaryVertical: 'food_and_drink',
        defaultDeviceMode,
      });
      this.router.navigate(['/setup']);
    } catch {
      this.error.set('Failed to save business type. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
