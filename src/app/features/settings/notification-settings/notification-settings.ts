import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { AuthService } from '../../../services/auth';
import {
  NotificationSettings,
  NotificationChannel,
  SmsProvider,
  EmailProvider,
} from '../../../models/index';

@Component({
  selector: 'os-notification-settings',
  imports: [FormsModule],
  templateUrl: './notification-settings.html',
  styleUrl: './notification-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationSettingsComponent implements OnInit {
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly authService = inject(AuthService);

  readonly isLoading = this.settingsService.isLoading;
  readonly isSaving = this.settingsService.isSaving;

  // Local form signals
  private readonly _smsEnabled = signal(false);
  private readonly _smsProvider = signal<SmsProvider>('none');
  private readonly _smsAccountSid = signal('');
  private readonly _smsAuthToken = signal('');
  private readonly _smsFromNumber = signal('');
  private readonly _emailEnabled = signal(false);
  private readonly _emailProvider = signal<EmailProvider>('none');
  private readonly _emailApiKey = signal('');
  private readonly _emailFromAddress = signal('');
  private readonly _orderReadyNotifyCustomer = signal(true);
  private readonly _orderReadyNotifyServer = signal(false);
  private readonly _orderReadyChannels = signal<NotificationChannel[]>(['sms']);
  private readonly _orderReadyTemplate = signal('Hi {name}, your order #{number} is ready for pickup!');
  private readonly _hasUnsavedChanges = signal(false);
  private readonly _showSaveSuccess = signal(false);

  readonly smsEnabled = this._smsEnabled.asReadonly();
  readonly smsProvider = this._smsProvider.asReadonly();
  readonly smsAccountSid = this._smsAccountSid.asReadonly();
  readonly smsAuthToken = this._smsAuthToken.asReadonly();
  readonly smsFromNumber = this._smsFromNumber.asReadonly();
  readonly emailEnabled = this._emailEnabled.asReadonly();
  readonly emailProvider = this._emailProvider.asReadonly();
  readonly emailApiKey = this._emailApiKey.asReadonly();
  readonly emailFromAddress = this._emailFromAddress.asReadonly();
  readonly orderReadyNotifyCustomer = this._orderReadyNotifyCustomer.asReadonly();
  readonly orderReadyNotifyServer = this._orderReadyNotifyServer.asReadonly();
  readonly orderReadyChannels = this._orderReadyChannels.asReadonly();
  readonly orderReadyTemplate = this._orderReadyTemplate.asReadonly();
  readonly hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();
  readonly showSaveSuccess = this._showSaveSuccess.asReadonly();

  readonly smsConfigured = computed(() =>
    this._smsEnabled() && this._smsProvider() !== 'none' && this._smsAccountSid().length > 0
  );

  readonly emailConfigured = computed(() =>
    this._emailEnabled() && this._emailProvider() !== 'none' && this._emailApiKey().length > 0
  );

  readonly isManagerOrAbove = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'owner' || role === 'manager' || role === 'super_admin';
  });

  readonly templatePreview = computed(() => {
    const template = this._orderReadyTemplate();
    return template
      .replaceAll('{name}', 'John')
      .replaceAll('{number}', '1042');
  });

  ngOnInit(): void {
    this.loadFromService();
  }

  private loadFromService(): void {
    const s = this.settingsService.notificationSettings();
    this._smsEnabled.set(s.smsEnabled);
    this._smsProvider.set(s.smsProvider);
    this._smsAccountSid.set(s.smsAccountSid);
    this._smsAuthToken.set(s.smsAuthToken);
    this._smsFromNumber.set(s.smsFromNumber);
    this._emailEnabled.set(s.emailEnabled);
    this._emailProvider.set(s.emailProvider);
    this._emailApiKey.set(s.emailApiKey);
    this._emailFromAddress.set(s.emailFromAddress);
    this._orderReadyNotifyCustomer.set(s.orderReadyNotifyCustomer);
    this._orderReadyNotifyServer.set(s.orderReadyNotifyServer);
    this._orderReadyChannels.set([...s.orderReadyChannels]);
    this._orderReadyTemplate.set(s.orderReadyTemplate);
    this._hasUnsavedChanges.set(false);
  }

  // --- SMS ---

  onSmsEnabledToggle(event: Event): void {
    this._smsEnabled.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  onSmsProviderChange(value: string): void {
    this._smsProvider.set(value as SmsProvider);
    this._hasUnsavedChanges.set(true);
  }

  onSmsAccountSidChange(event: Event): void {
    this._smsAccountSid.set((event.target as HTMLInputElement).value);
    this._hasUnsavedChanges.set(true);
  }

  onSmsAuthTokenChange(event: Event): void {
    this._smsAuthToken.set((event.target as HTMLInputElement).value);
    this._hasUnsavedChanges.set(true);
  }

  onSmsFromNumberChange(event: Event): void {
    this._smsFromNumber.set((event.target as HTMLInputElement).value);
    this._hasUnsavedChanges.set(true);
  }

  // --- Email ---

  onEmailEnabledToggle(event: Event): void {
    this._emailEnabled.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  onEmailProviderChange(value: string): void {
    this._emailProvider.set(value as EmailProvider);
    this._hasUnsavedChanges.set(true);
  }

  onEmailApiKeyChange(event: Event): void {
    this._emailApiKey.set((event.target as HTMLInputElement).value);
    this._hasUnsavedChanges.set(true);
  }

  onEmailFromAddressChange(event: Event): void {
    this._emailFromAddress.set((event.target as HTMLInputElement).value);
    this._hasUnsavedChanges.set(true);
  }

  // --- Order Ready ---

  onOrderReadyNotifyCustomerToggle(event: Event): void {
    this._orderReadyNotifyCustomer.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  onOrderReadyNotifyServerToggle(event: Event): void {
    this._orderReadyNotifyServer.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  onChannelToggle(channel: NotificationChannel, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this._orderReadyChannels.update(channels => {
      if (checked && !channels.includes(channel)) {
        return [...channels, channel];
      }
      if (!checked) {
        return channels.filter(c => c !== channel);
      }
      return channels;
    });
    this._hasUnsavedChanges.set(true);
  }

  isChannelEnabled(channel: NotificationChannel): boolean {
    return this._orderReadyChannels().includes(channel);
  }

  onTemplateChange(event: Event): void {
    this._orderReadyTemplate.set((event.target as HTMLTextAreaElement).value);
    this._hasUnsavedChanges.set(true);
  }

  async save(): Promise<void> {
    const settings: NotificationSettings = {
      smsEnabled: this._smsEnabled(),
      smsProvider: this._smsProvider(),
      smsAccountSid: this._smsAccountSid(),
      smsAuthToken: this._smsAuthToken(),
      smsFromNumber: this._smsFromNumber(),
      emailEnabled: this._emailEnabled(),
      emailProvider: this._emailProvider(),
      emailApiKey: this._emailApiKey(),
      emailFromAddress: this._emailFromAddress(),
      orderReadyNotifyCustomer: this._orderReadyNotifyCustomer(),
      orderReadyNotifyServer: this._orderReadyNotifyServer(),
      orderReadyChannels: this._orderReadyChannels(),
      orderReadyTemplate: this._orderReadyTemplate(),
    };

    await this.settingsService.saveNotificationSettings(settings);
    this._hasUnsavedChanges.set(false);
    this._showSaveSuccess.set(true);
    setTimeout(() => this._showSaveSuccess.set(false), 3000);
  }

  discard(): void {
    this.loadFromService();
  }
}
