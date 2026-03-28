import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { TipService } from '../../../services/tip';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { AuthService } from '../../../services/auth';
import { OrderService } from '../../../services/order';
import {
  TipPoolRule,
  TipOutRule,
  TipPoolMethod,
  TipOutMethod,
  TipManagementSettings,
  ComplianceCheck,
} from '../../../models/index';

type TipTab = 'reports' | 'pool-rules' | 'tipout-rules' | 'compliance';

@Component({
  selector: 'os-tip-management',
  imports: [],
  templateUrl: './tip-management.html',
  styleUrl: './tip-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TipManagement implements OnInit {
  private readonly tipService = inject(TipService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly authService = inject(AuthService);
  private readonly orderService = inject(OrderService);

  private readonly _activeTab = signal<TipTab>('reports');
  readonly activeTab = this._activeTab.asReadonly();

  readonly report = this.tipService.report;
  readonly complianceChecks = this.tipService.complianceChecks;
  readonly settings = this.tipService.settings;

  readonly isManagerOrAbove = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'owner' || role === 'manager' || role === 'super_admin';
  });

  readonly complianceMap = computed(() => {
    const map = new Map<string, ComplianceCheck>();
    for (const check of this.complianceChecks()) {
      map.set(check.serverGuid, check);
    }
    return map;
  });

  private readonly _startDateStr = signal(toDateInputValue(new Date()));
  private readonly _endDateStr = signal(toDateInputValue(new Date()));
  readonly startDateStr = this._startDateStr.asReadonly();
  readonly endDateStr = this._endDateStr.asReadonly();

  private readonly _poolRuleName = signal('');
  private readonly _poolRuleMethod = signal<TipPoolMethod>('even');
  readonly poolRuleName = this._poolRuleName.asReadonly();
  readonly poolRuleMethod = this._poolRuleMethod.asReadonly();

  private readonly _tipOutRuleName = signal('');
  private readonly _tipOutRuleMethod = signal<TipOutMethod>('percentage_of_tips');
  private readonly _tipOutRulePercentage = signal(10);
  private readonly _tipOutRuleSource = signal('server');
  private readonly _tipOutRuleTarget = signal('bartender');
  readonly tipOutRuleName = this._tipOutRuleName.asReadonly();
  readonly tipOutRuleMethod = this._tipOutRuleMethod.asReadonly();
  readonly tipOutRulePercentage = this._tipOutRulePercentage.asReadonly();
  readonly tipOutRuleSource = this._tipOutRuleSource.asReadonly();
  readonly tipOutRuleTarget = this._tipOutRuleTarget.asReadonly();

  private readonly _isSaving = signal(false);
  private readonly _showSaveSuccess = signal(false);
  readonly isSaving = this._isSaving.asReadonly();
  readonly showSaveSuccess = this._showSaveSuccess.asReadonly();

  private _initDone = false;

  readonly tabs: { key: TipTab; label: string }[] = [
    { key: 'reports', label: 'Reports' },
    { key: 'pool-rules', label: 'Pool Rules' },
    { key: 'tipout-rules', label: 'Tip-Out Rules' },
    { key: 'compliance', label: 'Compliance' },
  ];

  ngOnInit(): void {
    if (this._initDone) return;
    this._initDone = true;
    this.settingsService.loadSettings();
    this.orderService.loadOrders({ limit: 500 });
  }

  setTab(tab: TipTab): void {
    this._activeTab.set(tab);
  }

  onStartDateChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this._startDateStr.set(val);
    this.tipService.setDateRange(new Date(val + 'T00:00:00'), new Date(this._endDateStr() + 'T23:59:59'));
  }

  onEndDateChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this._endDateStr.set(val);
    this.tipService.setDateRange(new Date(this._startDateStr() + 'T00:00:00'), new Date(val + 'T23:59:59'));
  }

  setToday(): void {
    const today = toDateInputValue(new Date());
    this._startDateStr.set(today);
    this._endDateStr.set(today);
    this.tipService.setDateRange(new Date(today + 'T00:00:00'), new Date(today + 'T23:59:59'));
  }

  setThisWeek(): void {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const startStr = toDateInputValue(start);
    const endStr = toDateInputValue(now);
    this._startDateStr.set(startStr);
    this._endDateStr.set(endStr);
    this.tipService.setDateRange(new Date(startStr + 'T00:00:00'), new Date(endStr + 'T23:59:59'));
  }

  onHoursChange(serverGuid: string, event: Event): void {
    const val = Number.parseFloat((event.target as HTMLInputElement).value) || 0;
    this.tipService.setHoursWorked(serverGuid, val);
  }

  onPoolRuleNameChange(event: Event): void {
    this._poolRuleName.set((event.target as HTMLInputElement).value);
  }

  onPoolRuleMethodChange(event: Event): void {
    this._poolRuleMethod.set((event.target as HTMLSelectElement).value as TipPoolMethod);
  }

  addPoolRule(): void {
    const name = this._poolRuleName().trim();
    if (!name) return;

    const s = this.settings();
    const newRule: TipPoolRule = {
      id: crypto.randomUUID(),
      name,
      method: this._poolRuleMethod(),
      participantRoles: ['server'],
      isActive: true,
    };

    this.saveSettings({
      ...s,
      poolRules: [...s.poolRules, newRule],
    });

    this._poolRuleName.set('');
  }

  togglePoolRule(ruleId: string): void {
    const s = this.settings();
    this.saveSettings({
      ...s,
      poolRules: s.poolRules.map(r =>
        r.id === ruleId ? { ...r, isActive: !r.isActive } : r
      ),
    });
  }

  removePoolRule(ruleId: string): void {
    const s = this.settings();
    this.saveSettings({
      ...s,
      poolRules: s.poolRules.filter(r => r.id !== ruleId),
    });
  }

  onTipOutRuleNameChange(event: Event): void {
    this._tipOutRuleName.set((event.target as HTMLInputElement).value);
  }

  onTipOutRuleMethodChange(event: Event): void {
    this._tipOutRuleMethod.set((event.target as HTMLSelectElement).value as TipOutMethod);
  }

  onTipOutRulePercentageChange(event: Event): void {
    this._tipOutRulePercentage.set(Number.parseFloat((event.target as HTMLInputElement).value) || 10);
  }

  onTipOutRuleSourceChange(event: Event): void {
    this._tipOutRuleSource.set((event.target as HTMLInputElement).value);
  }

  onTipOutRuleTargetChange(event: Event): void {
    this._tipOutRuleTarget.set((event.target as HTMLInputElement).value);
  }

  addTipOutRule(): void {
    const name = this._tipOutRuleName().trim();
    if (!name) return;

    const s = this.settings();
    const newRule: TipOutRule = {
      id: crypto.randomUUID(),
      name,
      method: this._tipOutRuleMethod(),
      sourceRole: this._tipOutRuleSource(),
      targetRole: this._tipOutRuleTarget(),
      percentage: this._tipOutRulePercentage(),
      isActive: true,
    };

    this.saveSettings({
      ...s,
      tipOutRules: [...s.tipOutRules, newRule],
    });

    this._tipOutRuleName.set('');
  }

  toggleTipOutRule(ruleId: string): void {
    const s = this.settings();
    this.saveSettings({
      ...s,
      tipOutRules: s.tipOutRules.map(r =>
        r.id === ruleId ? { ...r, isActive: !r.isActive } : r
      ),
    });
  }

  removeTipOutRule(ruleId: string): void {
    const s = this.settings();
    this.saveSettings({
      ...s,
      tipOutRules: s.tipOutRules.filter(r => r.id !== ruleId),
    });
  }

  downloadCSV(): void {
    this.tipService.downloadCSV();
  }

  private async saveSettings(s: TipManagementSettings): Promise<void> {
    this._isSaving.set(true);
    await this.settingsService.saveTipManagementSettings(s);
    this._isSaving.set(false);
    this._showSaveSuccess.set(true);
    setTimeout(() => this._showSaveSuccess.set(false), 3000);
  }
}

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}
