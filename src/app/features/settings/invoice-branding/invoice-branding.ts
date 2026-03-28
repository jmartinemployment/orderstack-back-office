import { Component, ChangeDetectionStrategy, inject, signal, effect, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlatformService } from '../../../services/platform';

@Component({
  selector: 'os-invoice-branding',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './invoice-branding.html',
  styleUrl: './invoice-branding.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceBranding {
  private readonly platformService = inject(PlatformService);

  private readonly _logoUrl = signal('');
  private readonly _brandColor = signal('#1a56db');
  private readonly _invoiceNotes = signal('');
  private readonly _isSaving = signal(false);
  private readonly _hasUnsavedChanges = signal(false);
  private readonly _showSaveSuccess = signal(false);

  readonly logoUrl = this._logoUrl.asReadonly();
  readonly brandColor = this._brandColor.asReadonly();
  readonly invoiceNotes = this._invoiceNotes.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();
  readonly showSaveSuccess = this._showSaveSuccess.asReadonly();

  readonly logoPreviewValid = computed(() => {
    const url = this._logoUrl();
    return url.length > 0 && (url.startsWith('http://') || url.startsWith('https://'));
  });

  constructor() {
    effect(() => {
      const profile = this.platformService.merchantProfile();
      if (profile) {
        this._logoUrl.set(profile.defaultBrandingLogoUrl ?? '');
        this._brandColor.set(profile.defaultBrandingColor ?? '#1a56db');
        this._invoiceNotes.set(profile.defaultInvoiceNotes ?? '');
        this._hasUnsavedChanges.set(false);
      }
    });
  }

  updateLogoUrl(value: string): void {
    this._logoUrl.set(value);
    this._hasUnsavedChanges.set(true);
    this._showSaveSuccess.set(false);
  }

  updateBrandColor(value: string): void {
    this._brandColor.set(value);
    this._hasUnsavedChanges.set(true);
    this._showSaveSuccess.set(false);
  }

  updateInvoiceNotes(value: string): void {
    this._invoiceNotes.set(value);
    this._hasUnsavedChanges.set(true);
    this._showSaveSuccess.set(false);
  }

  async save(): Promise<void> {
    this._isSaving.set(true);
    await this.platformService.saveMerchantProfile({
      defaultBrandingLogoUrl: this._logoUrl() || null,
      defaultBrandingColor: this._brandColor() || null,
      defaultInvoiceNotes: this._invoiceNotes() || null,
    });
    this._isSaving.set(false);
    this._hasUnsavedChanges.set(false);
    this._showSaveSuccess.set(true);
  }
}
