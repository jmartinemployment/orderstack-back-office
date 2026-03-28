import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { PaymentConnectService } from '../../../services/payment-connect';
import { PaymentProcessorType, PaymentSettings, ScanToPaySettings } from '../../../models/index';

@Component({
  selector: 'os-payment-settings',
  templateUrl: './payment-settings.html',
  styleUrl: './payment-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentSettingsComponent implements OnInit {
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly connectService = inject(PaymentConnectService);

  // --- Payment Processor ---
  private readonly _processor = signal<PaymentProcessorType>('none');
  private readonly _requirePayment = signal(false);
  private readonly _surchargeEnabled = signal(false);
  private readonly _surchargePercent = signal(3.5);
  private readonly _saved = signal(false);

  readonly processor = this._processor.asReadonly();
  readonly requirePayment = this._requirePayment.asReadonly();
  readonly surchargeEnabled = this._surchargeEnabled.asReadonly();
  readonly surchargePercent = this._surchargePercent.asReadonly();
  readonly isSaving = this.settingsService.isSaving;
  readonly saved = this._saved.asReadonly();

  // --- Connect Status ---
  readonly paypalStatus = this.connectService.paypalStatus;
  readonly isConnecting = this.connectService.isConnecting;
  readonly connectError = this.connectService.error;

  readonly isDirty = computed(() => {
    const current = this.settingsService.paymentSettings();
    return this._processor() !== current.processor
      || this._requirePayment() !== current.requirePaymentBeforeKitchen
      || this._surchargeEnabled() !== current.surchargeEnabled
      || this._surchargePercent() !== current.surchargePercent;
  });

  // --- Scan to Pay ---
  private readonly _stpEnabled = signal(true);
  private readonly _stpTipPercentages = signal<number[]>([15, 18, 20, 25]);
  private readonly _stpTokenExpiration = signal(120);
  private readonly _stpAutoClose = signal(true);
  private readonly _stpAllowSplit = signal(true);
  private readonly _stpQrOnReceipts = signal(true);
  private readonly _stpEmailReceipt = signal(true);
  private readonly _stpSaved = signal(false);
  private readonly _stpCustomTip = signal('');

  readonly stpEnabled = this._stpEnabled.asReadonly();
  readonly stpTipPercentages = this._stpTipPercentages.asReadonly();
  readonly stpTokenExpiration = this._stpTokenExpiration.asReadonly();
  readonly stpAutoClose = this._stpAutoClose.asReadonly();
  readonly stpAllowSplit = this._stpAllowSplit.asReadonly();
  readonly stpQrOnReceipts = this._stpQrOnReceipts.asReadonly();
  readonly stpEmailReceipt = this._stpEmailReceipt.asReadonly();
  readonly stpSaved = this._stpSaved.asReadonly();
  readonly stpCustomTip = this._stpCustomTip.asReadonly();

  readonly stpIsDirty = computed(() => {
    const current = this.settingsService.scanToPaySettings();
    return this._stpEnabled() !== current.enabled
      || JSON.stringify(this._stpTipPercentages()) !== JSON.stringify(current.defaultTipPercentages)
      || this._stpTokenExpiration() !== current.tokenExpirationMinutes
      || this._stpAutoClose() !== current.autoCloseOnFullPayment
      || this._stpAllowSplit() !== current.allowSplitPay
      || this._stpQrOnReceipts() !== current.includeQrOnPrintedReceipts
      || this._stpEmailReceipt() !== current.emailReceiptEnabled;
  });

  ngOnInit(): void {
    const s = this.settingsService.paymentSettings();
    this._processor.set(s.processor);
    this._requirePayment.set(s.requirePaymentBeforeKitchen);
    this._surchargeEnabled.set(s.surchargeEnabled);
    this._surchargePercent.set(s.surchargePercent);

    const stp = this.settingsService.scanToPaySettings();
    this._stpEnabled.set(stp.enabled);
    this._stpTipPercentages.set([...stp.defaultTipPercentages]);
    this._stpTokenExpiration.set(stp.tokenExpirationMinutes);
    this._stpAutoClose.set(stp.autoCloseOnFullPayment);
    this._stpAllowSplit.set(stp.allowSplitPay);
    this._stpQrOnReceipts.set(stp.includeQrOnPrintedReceipts);
    this._stpEmailReceipt.set(stp.emailReceiptEnabled);

    // Load connection status
    this.connectService.checkPayPalStatus();
  }

  // --- Payment Processor handlers ---

  onProcessorChange(event: Event): void {
    this._processor.set((event.target as HTMLInputElement).value as PaymentProcessorType);
    this._saved.set(false);
  }

  onRequirePaymentChange(event: Event): void {
    this._requirePayment.set((event.target as HTMLInputElement).checked);
    this._saved.set(false);
  }

  onSurchargeEnabledChange(event: Event): void {
    this._surchargeEnabled.set((event.target as HTMLInputElement).checked);
    this._saved.set(false);
  }

  onSurchargePercentChange(event: Event): void {
    const value = Number.parseFloat((event.target as HTMLInputElement).value) || 0;
    this._surchargePercent.set(Math.max(0, Math.min(10, value)));
    this._saved.set(false);
  }

  async save(): Promise<void> {
    const settings: PaymentSettings = {
      processor: this._processor(),
      requirePaymentBeforeKitchen: this._requirePayment(),
      surchargeEnabled: this._surchargeEnabled(),
      surchargePercent: this._surchargePercent(),
      taxRate: this.settingsService.paymentSettings().taxRate,
    };
    await this.settingsService.savePaymentSettings(settings);
    this._saved.set(true);
  }

  discard(): void {
    const s = this.settingsService.paymentSettings();
    this._processor.set(s.processor);
    this._requirePayment.set(s.requirePaymentBeforeKitchen);
    this._surchargeEnabled.set(s.surchargeEnabled);
    this._surchargePercent.set(s.surchargePercent);
    this._saved.set(false);
  }

  // --- Connect actions ---

  async connectPayPal(): Promise<void> {
    const url = await this.connectService.startPayPalConnect();
    if (url) {
      window.open(url, '_blank');
      await this.connectService.pollPayPalUntilConnected();
    }
  }

  // --- Scan to Pay handlers ---

  onStpEnabledChange(event: Event): void {
    this._stpEnabled.set((event.target as HTMLInputElement).checked);
    this._stpSaved.set(false);
  }

  onStpAutoCloseChange(event: Event): void {
    this._stpAutoClose.set((event.target as HTMLInputElement).checked);
    this._stpSaved.set(false);
  }

  onStpAllowSplitChange(event: Event): void {
    this._stpAllowSplit.set((event.target as HTMLInputElement).checked);
    this._stpSaved.set(false);
  }

  onStpQrOnReceiptsChange(event: Event): void {
    this._stpQrOnReceipts.set((event.target as HTMLInputElement).checked);
    this._stpSaved.set(false);
  }

  onStpEmailReceiptChange(event: Event): void {
    this._stpEmailReceipt.set((event.target as HTMLInputElement).checked);
    this._stpSaved.set(false);
  }

  onStpTokenExpirationChange(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10) || 120;
    this._stpTokenExpiration.set(Math.max(15, Math.min(1440, value)));
    this._stpSaved.set(false);
  }

  removeTipPercentage(index: number): void {
    this._stpTipPercentages.update(arr => arr.filter((_, i) => i !== index));
    this._stpSaved.set(false);
  }

  setStpCustomTip(value: string): void {
    this._stpCustomTip.set(value);
  }

  addTipPercentage(): void {
    const value = Number.parseInt(this._stpCustomTip(), 10);
    if (!Number.isNaN(value) && value > 0 && value <= 100) {
      const current = this._stpTipPercentages();
      if (!current.includes(value)) {
        this._stpTipPercentages.set([...current, value].sort((a, b) => a - b));
        this._stpCustomTip.set('');
        this._stpSaved.set(false);
      }
    }
  }

  async saveScanToPay(): Promise<void> {
    const settings: ScanToPaySettings = {
      enabled: this._stpEnabled(),
      defaultTipPercentages: this._stpTipPercentages(),
      tokenExpirationMinutes: this._stpTokenExpiration(),
      autoCloseOnFullPayment: this._stpAutoClose(),
      allowSplitPay: this._stpAllowSplit(),
      includeQrOnPrintedReceipts: this._stpQrOnReceipts(),
      emailReceiptEnabled: this._stpEmailReceipt(),
    };
    await this.settingsService.saveScanToPaySettings(settings);
    this._stpSaved.set(true);
  }

  discardScanToPay(): void {
    const stp = this.settingsService.scanToPaySettings();
    this._stpEnabled.set(stp.enabled);
    this._stpTipPercentages.set([...stp.defaultTipPercentages]);
    this._stpTokenExpiration.set(stp.tokenExpirationMinutes);
    this._stpAutoClose.set(stp.autoCloseOnFullPayment);
    this._stpAllowSplit.set(stp.allowSplitPay);
    this._stpQrOnReceipts.set(stp.includeQrOnPrintedReceipts);
    this._stpEmailReceipt.set(stp.emailReceiptEnabled);
    this._stpSaved.set(false);
  }
}
