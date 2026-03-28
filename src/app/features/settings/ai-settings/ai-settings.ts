import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DecimalPipe, UpperCasePipe } from '@angular/common';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { AuthService } from '../../../services/auth';
import { AIFeatureKey, AIUsageSummary, AI_FEATURE_CATALOG, defaultAiFeatures } from '../../../models/index';

@Component({
  selector: 'os-ai-settings',
  imports: [FormsModule, CurrencyPipe, DecimalPipe, UpperCasePipe],
  templateUrl: './ai-settings.html',
  styleUrl: './ai-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiSettings implements OnInit {
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly authService = inject(AuthService);

  readonly isLoading = this.settingsService.isLoading;
  readonly isSaving = this.settingsService.isSaving;

  // AI Order Approval signals
  private readonly _approvalEnabled = signal(false);
  private readonly _timeThresholdHours = signal(12);
  private readonly _valueThresholdDollars = signal(200);
  private readonly _quantityThreshold = signal(20);
  private readonly _hasUnsavedChanges = signal(false);
  private readonly _showSaveSuccess = signal(false);

  readonly approvalEnabled = this._approvalEnabled.asReadonly();
  readonly timeThresholdHours = this._timeThresholdHours.asReadonly();
  readonly valueThresholdDollars = this._valueThresholdDollars.asReadonly();
  readonly quantityThreshold = this._quantityThreshold.asReadonly();
  readonly hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();
  readonly showSaveSuccess = this._showSaveSuccess.asReadonly();

  readonly isManagerOrAbove = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'owner' || role === 'manager' || role === 'super_admin';
  });

  readonly thresholdDescription = computed(() => {
    const hours = this._timeThresholdHours();
    const dollars = this._valueThresholdDollars();
    const qty = this._quantityThreshold();
    return `Orders scheduled more than ${hours} hours out, over $${dollars}, or with more than ${qty} items will require AI review.`;
  });

  // --- AI Admin (API Key, Feature Toggles, Usage) ---
  readonly featureCatalog = AI_FEATURE_CATALOG;
  readonly aiAdminConfig = this.settingsService.aiAdminConfig;

  private readonly _apiKeyInput = signal('');
  private readonly _showApiKeyModal = signal(false);
  private readonly _showDeleteConfirm = signal(false);
  private readonly _aiAdminLoading = signal(false);
  private readonly _aiAdminSaveSuccess = signal(false);
  private readonly _usageSummary = signal<AIUsageSummary | null>(null);

  readonly apiKeyInput = this._apiKeyInput.asReadonly();
  readonly showApiKeyModal = this._showApiKeyModal.asReadonly();
  readonly showDeleteConfirm = this._showDeleteConfirm.asReadonly();
  readonly aiAdminLoading = this._aiAdminLoading.asReadonly();
  readonly aiAdminSaveSuccess = this._aiAdminSaveSuccess.asReadonly();
  readonly usageSummary = this._usageSummary.asReadonly();

  readonly isOwnerOrAdmin = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'owner' || role === 'super_admin';
  });

  readonly keyStatusClass = computed(() => {
    const config = this.aiAdminConfig();
    if (!config?.apiKeyConfigured) return 'status-red';
    return config.apiKeyValid ? 'status-green' : 'status-yellow';
  });

  readonly keyStatusLabel = computed(() => {
    const config = this.aiAdminConfig();
    if (!config?.apiKeyConfigured) return 'Not configured';
    return config.apiKeyValid ? 'Valid' : 'Unvalidated';
  });

  readonly maskedKey = computed(() => {
    const config = this.aiAdminConfig();
    if (!config?.apiKeyConfigured || !config.apiKeyLastFour) return '';
    return `sk-ant-...${config.apiKeyLastFour}`;
  });

  readonly enabledFeatureCount = computed(() => {
    const config = this.aiAdminConfig();
    if (!config) return 0;
    return Object.values(config.features).filter(Boolean).length;
  });

  readonly totalUsageDollars = computed(() => {
    const usage = this._usageSummary();
    if (!usage) return 0;
    return usage.totalCostCents / 100;
  });

  readonly totalUsageCalls = computed(() => {
    const usage = this._usageSummary();
    if (!usage) return 0;
    return Object.values(usage.byFeature).reduce((sum, f) => sum + (f?.calls ?? 0), 0);
  });

  ngOnInit(): void {
    this.loadFromService();
    this.loadAiAdmin();
  }

  private async loadAiAdmin(): Promise<void> {
    this._aiAdminLoading.set(true);
    await this.settingsService.loadAiAdminConfig();
    const usage = await this.settingsService.loadAiUsage();
    this._usageSummary.set(usage);
    this._aiAdminLoading.set(false);
  }

  private loadFromService(): void {
    const s = this.settingsService.aiSettings();
    this._approvalEnabled.set(s.aiOrderApprovalEnabled);
    this._timeThresholdHours.set(s.timeThresholdHours);
    this._valueThresholdDollars.set(s.valueThresholdDollars);
    this._quantityThreshold.set(s.quantityThreshold);
    this._hasUnsavedChanges.set(false);
  }

  onApprovalToggle(event: Event): void {
    this._approvalEnabled.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  onTimeThreshold(event: Event): void {
    this._timeThresholdHours.set(Number.parseInt((event.target as HTMLInputElement).value, 10) || 12);
    this._hasUnsavedChanges.set(true);
  }

  onValueThreshold(event: Event): void {
    this._valueThresholdDollars.set(Number.parseInt((event.target as HTMLInputElement).value, 10) || 200);
    this._hasUnsavedChanges.set(true);
  }

  onQuantityThreshold(event: Event): void {
    this._quantityThreshold.set(Number.parseInt((event.target as HTMLInputElement).value, 10) || 20);
    this._hasUnsavedChanges.set(true);
  }

  async save(): Promise<void> {
    const current = this.settingsService.aiSettings();
    await this.settingsService.saveAISettings({
      ...current,
      aiOrderApprovalEnabled: this._approvalEnabled(),
      timeThresholdHours: this._timeThresholdHours(),
      valueThresholdDollars: this._valueThresholdDollars(),
      quantityThreshold: this._quantityThreshold(),
    });
    this._hasUnsavedChanges.set(false);
    this._showSaveSuccess.set(true);
    setTimeout(() => this._showSaveSuccess.set(false), 3000);
  }

  discard(): void {
    this.loadFromService();
  }

  // --- AI Admin actions ---

  openApiKeyModal(): void {
    this._apiKeyInput.set('');
    this._showApiKeyModal.set(true);
  }

  closeApiKeyModal(): void {
    this._showApiKeyModal.set(false);
    this._apiKeyInput.set('');
  }

  onApiKeyInput(event: Event): void {
    this._apiKeyInput.set((event.target as HTMLInputElement).value);
  }

  async submitApiKey(): Promise<void> {
    const key = this._apiKeyInput();
    if (key.length < 10) return;
    await this.settingsService.saveApiKey(key);
    this._showApiKeyModal.set(false);
    this._apiKeyInput.set('');
    this.flashAdminSuccess();
  }

  openDeleteConfirm(): void {
    this._showDeleteConfirm.set(true);
  }

  closeDeleteConfirm(): void {
    this._showDeleteConfirm.set(false);
  }

  async confirmDeleteApiKey(): Promise<void> {
    await this.settingsService.deleteApiKey();
    this._showDeleteConfirm.set(false);
    this.flashAdminSuccess();
  }

  async onFeatureToggle(featureKey: AIFeatureKey, event: Event): Promise<void> {
    const enabled = (event.target as HTMLInputElement).checked;
    await this.settingsService.saveAiFeatures({ [featureKey]: enabled });
    this.flashAdminSuccess();
  }

  async enableAllFeatures(): Promise<void> {
    await this.settingsService.saveAiFeatures(defaultAiFeatures());
    this.flashAdminSuccess();
  }

  async disableAllFeatures(): Promise<void> {
    const allOff: Record<AIFeatureKey, boolean> = {
      aiCostEstimation: false,
      menuEngineering: false,
      salesInsights: false,
      laborOptimization: false,
      inventoryPredictions: false,
      taxEstimation: false,
      aiCateringProposals: false,
      sentimentAnalysis: false,
    };
    await this.settingsService.saveAiFeatures(allOff);
    this.flashAdminSuccess();
  }

  isFeatureEnabled(key: AIFeatureKey): boolean {
    return this.aiAdminConfig()?.features[key] ?? false;
  }

  getCostTierClass(tier: 'high' | 'medium' | 'low'): string {
    switch (tier) {
      case 'high': return 'badge-cost-high';
      case 'medium': return 'badge-cost-medium';
      case 'low': return 'badge-cost-low';
    }
  }

  getFeatureUsage(key: AIFeatureKey): { calls: number; inputTokens: number; outputTokens: number; estimatedCostCents: number } | null {
    const usage = this._usageSummary();
    if (!usage) return null;
    return usage.byFeature[key] ?? null;
  }

  private flashAdminSuccess(): void {
    this._aiAdminSaveSuccess.set(true);
    setTimeout(() => this._aiAdminSaveSuccess.set(false), 3000);
  }
}
