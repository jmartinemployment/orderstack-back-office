import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MenuService } from '../../../services/menu';
import { AuthService } from '../../../services/auth';
import {
  PricingRule,
  PricingRuleType,
  PricingRecommendation,
  ItemPricePreview,
  PricingTab,
  DayOfWeek,
} from '../../../models/pricing.model';

const ALL_DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

@Component({
  selector: 'os-dynamic-pricing',
  imports: [CurrencyPipe],
  templateUrl: './dynamic-pricing.html',
  styleUrl: './dynamic-pricing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicPricing {
  private readonly menuService = inject(MenuService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly categories = this.menuService.categories;

  private readonly _activeTab = signal<PricingTab>('rules');
  private readonly _rules = signal<PricingRule[]>([]);
  private readonly _showForm = signal(false);
  private readonly _editingRuleId = signal<string | null>(null);

  // Form signals
  private readonly _formName = signal('');
  private readonly _formType = signal<PricingRuleType>('happy_hour');
  private readonly _formMultiplier = signal(0.8);
  private readonly _formStartTime = signal('15:00');
  private readonly _formEndTime = signal('18:00');
  private readonly _formDays = signal<DayOfWeek[]>([...ALL_DAYS]);

  private readonly _recommendations = signal<PricingRecommendation[]>([]);

  readonly activeTab = this._activeTab.asReadonly();
  readonly rules = this._rules.asReadonly();
  readonly showForm = this._showForm.asReadonly();
  readonly editingRuleId = this._editingRuleId.asReadonly();
  readonly formName = this._formName.asReadonly();
  readonly formType = this._formType.asReadonly();
  readonly formMultiplier = this._formMultiplier.asReadonly();
  readonly formStartTime = this._formStartTime.asReadonly();
  readonly formEndTime = this._formEndTime.asReadonly();
  readonly formDays = this._formDays.asReadonly();
  readonly recommendations = this._recommendations.asReadonly();

  readonly activeRules = computed(() => this._rules().filter(r => r.active));

  readonly currentActiveRule = computed(() => {
    const now = new Date();
    const dayMap: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = dayMap[now.getDay()];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return this.activeRules().find(r =>
      r.daysOfWeek.includes(today) && timeStr >= r.startTime && timeStr <= r.endTime
    ) ?? null;
  });

  readonly pricePreview = computed<ItemPricePreview[]>(() => {
    const items = this.menuService.allItems().filter(i => i.isActive !== false);
    const now = new Date();
    const dayMap: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = dayMap[now.getDay()];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return items.map(item => {
      const applicable = this.activeRules().find(r =>
        r.daysOfWeek.includes(today) &&
        timeStr >= r.startTime &&
        timeStr <= r.endTime &&
        (r.itemIds.length === 0 || r.itemIds.includes(item.id)) &&
        (r.categoryIds.length === 0 || (item.categoryId != null && r.categoryIds.includes(item.categoryId)))
      );

      const basePrice = Number(item.price);
      return {
        menuItemId: item.id,
        name: item.name,
        basePrice,
        adjustedPrice: applicable ? Math.round(basePrice * applicable.multiplier * 100) / 100 : basePrice,
        activeRule: applicable?.name ?? null,
        multiplier: applicable?.multiplier ?? 1,
      };
    });
  });

  readonly adjustedItemCount = computed(() =>
    this.pricePreview().filter(p => p.multiplier !== 1).length
  );

  constructor() {
    // Load menu when authenticated
    effect(() => {
      if (this.isAuthenticated() && this.authService.selectedMerchantId()) {
        this.menuService.loadMenu();
        this.loadRulesFromStorage();
      }
    });

    // Persist rules to localStorage on change
    effect(() => {
      const rules = this._rules();
      const rid = this.authService.selectedMerchantId();
      if (rid) {
        localStorage.setItem(`pricing_rules_${rid}`, JSON.stringify(rules));
      }
    });
  }

  private loadRulesFromStorage(): void {
    const rid = this.authService.selectedMerchantId();
    if (!rid) return;
    const stored = localStorage.getItem(`pricing_rules_${rid}`);
    if (stored) {
      try {
        const rules = JSON.parse(stored) as PricingRule[];
        this._rules.set(rules);
      } catch {
        // Corrupted data — start fresh
      }
    }
  }

  setTab(tab: PricingTab): void {
    this._activeTab.set(tab);
  }

  toggleRuleActive(ruleId: string): void {
    this._rules.update(rules =>
      rules.map(r => r.id === ruleId ? { ...r, active: !r.active } : r)
    );
  }

  deleteRule(ruleId: string): void {
    this._rules.update(rules => rules.filter(r => r.id !== ruleId));
  }

  openNewForm(): void {
    this._editingRuleId.set(null);
    this._formName.set('');
    this._formType.set('happy_hour');
    this._formMultiplier.set(0.8);
    this._formStartTime.set('15:00');
    this._formEndTime.set('18:00');
    this._formDays.set([...ALL_DAYS]);
    this._showForm.set(true);
  }

  editRule(rule: PricingRule): void {
    this._editingRuleId.set(rule.id);
    this._formName.set(rule.name);
    this._formType.set(rule.type);
    this._formMultiplier.set(rule.multiplier);
    this._formStartTime.set(rule.startTime);
    this._formEndTime.set(rule.endTime);
    this._formDays.set([...rule.daysOfWeek]);
    this._showForm.set(true);
  }

  closeForm(): void {
    this._showForm.set(false);
    this._editingRuleId.set(null);
  }

  saveRule(): void {
    const name = this._formName().trim();
    if (!name) return;

    const ruleData: PricingRule = {
      id: this._editingRuleId() ?? crypto.randomUUID(),
      name,
      type: this._formType(),
      multiplier: this._formMultiplier(),
      startTime: this._formStartTime(),
      endTime: this._formEndTime(),
      daysOfWeek: this._formDays(),
      categoryIds: [],
      itemIds: [],
      active: true,
    };

    if (this._editingRuleId()) {
      this._rules.update(rules =>
        rules.map(r => r.id === ruleData.id ? ruleData : r)
      );
    } else {
      this._rules.update(rules => [...rules, ruleData]);
    }
    this.closeForm();
  }

  onFormField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    switch (field) {
      case 'name': this._formName.set(value); break;
      case 'type': this._formType.set(value as PricingRuleType); break;
      case 'multiplier': this._formMultiplier.set(Number.parseFloat(value)); break;
      case 'startTime': this._formStartTime.set(value); break;
      case 'endTime': this._formEndTime.set(value); break;
    }
  }

  toggleFormDay(day: DayOfWeek): void {
    this._formDays.update(days =>
      days.includes(day) ? days.filter(d => d !== day) : [...days, day]
    );
  }

  getRuleTypeLabel(type: PricingRuleType): string {
    switch (type) {
      case 'happy_hour': return 'Happy Hour';
      case 'surge': return 'Surge';
      case 'off_peak': return 'Off Peak';
      case 'seasonal': return 'Seasonal';
      case 'custom': return 'Custom';
    }
  }

  getRuleTypeClass(type: PricingRuleType): string {
    switch (type) {
      case 'happy_hour': return 'type-happy';
      case 'surge': return 'type-surge';
      case 'off_peak': return 'type-offpeak';
      case 'seasonal': return 'type-seasonal';
      case 'custom': return 'type-custom';
    }
  }

  getMultiplierLabel(multiplier: number): string {
    if (multiplier < 1) return `${Math.round((1 - multiplier) * 100)}% OFF`;
    if (multiplier > 1) return `${Math.round((multiplier - 1) * 100)}% UP`;
    return 'No change';
  }

  getDayLabel(day: DayOfWeek): string {
    return day.charAt(0).toUpperCase() + day.slice(1);
  }

  allDays(): DayOfWeek[] {
    return ALL_DAYS;
  }
}
