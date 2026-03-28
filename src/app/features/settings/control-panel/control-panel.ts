import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { PlatformService } from '../../../services/platform';
import { DeviceHub } from '../device-hub';
import { AiSettings } from '../ai-settings';
import { KitchenOrders } from '../kitchen-orders';
import { OnlinePricing } from '../online-pricing';
import { PaymentSettingsComponent } from '../payment-settings';
import { TipManagement } from '../../tip-mgmt/tip-management';
import { LoyaltySettings } from '../loyalty-settings';
import { DeliverySettingsComponent } from '../delivery-settings';
import { GiftCardManagement } from '../gift-card-management';
import { StaffManagement } from '../staff-management';
import { BreakConfig } from '../break-config';
import { AccountBilling } from '../account-billing';
import { SupplierSettings } from '../supplier-settings';
import { NotificationSettingsComponent } from '../notification-settings';
import { BarSettingsComponent } from '../bar-settings';
import { GeneralSettings } from '../general-settings/general-settings';
import { MfaSettings } from '../mfa-settings/mfa-settings';
import { ControlPanelTab, PlatformModule } from '../../../models/index';
import type { ModeFeatureFlags } from '../../../models/index';

interface TabConfig {
  key: ControlPanelTab;
  label: string;
  requiredModule?: PlatformModule;
  requiredFlag?: keyof ModeFeatureFlags;
}

@Component({
  selector: 'os-control-panel',
  imports: [GeneralSettings, DeviceHub, AiSettings, KitchenOrders, BarSettingsComponent, OnlinePricing, PaymentSettingsComponent, TipManagement, LoyaltySettings, DeliverySettingsComponent, GiftCardManagement, SupplierSettings, StaffManagement, BreakConfig, AccountBilling, NotificationSettingsComponent, MfaSettings],
  templateUrl: './control-panel.html',
  styleUrl: './control-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlPanel implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly platformService = inject(PlatformService);
  private readonly route = inject(ActivatedRoute);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _activeTab = signal<ControlPanelTab>('general');
  readonly activeTab = this._activeTab.asReadonly();

  private readonly allTabs: TabConfig[] = [
    { key: 'general', label: 'General' },
    { key: 'hardware', label: 'Hardware' },
    { key: 'ai-settings', label: 'AI Settings' },
    { key: 'kitchen-orders', label: 'Kitchen & Orders' },
    { key: 'bar', label: 'Bar' },
    { key: 'online-pricing', label: 'Online Pricing', requiredModule: 'online_ordering' },
    { key: 'payments', label: 'Payments' },
    { key: 'tip-management', label: 'Tip Management', requiredFlag: 'enableTipping' },
    { key: 'loyalty', label: 'Loyalty', requiredModule: 'loyalty' },
    { key: 'delivery', label: 'Delivery', requiredModule: 'delivery' },
    { key: 'gift-cards', label: 'Gift Cards', requiredModule: 'gift_cards' },
    { key: 'suppliers', label: 'Suppliers', requiredModule: 'inventory' },
    { key: 'staff', label: 'Staff', requiredModule: 'staff_scheduling' },
    { key: 'time-clock-config', label: 'Time Clock', requiredModule: 'staff_scheduling' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'account-billing', label: 'Account & Billing' },
    { key: 'security', label: 'Security (MFA)' },
  ];

  readonly visibleTabs = computed(() => {
    const flags = this.platformService.featureFlags();
    return this.allTabs.filter(tab => {
      if (tab.requiredModule && !this.platformService.isModuleEnabled(tab.requiredModule)) {
        return false;
      }
      if (tab.requiredFlag && !flags[tab.requiredFlag]) {
        return false;
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.settingsService.loadSettings();
    this.platformService.loadMerchantProfile();
    const tab = this.route.snapshot.queryParamMap.get('tab') as ControlPanelTab | null;
    if (tab && this.allTabs.some(t => t.key === tab)) {
      this._activeTab.set(tab);
    }
  }

  setTab(tab: ControlPanelTab): void {
    this._activeTab.set(tab);
  }
}
