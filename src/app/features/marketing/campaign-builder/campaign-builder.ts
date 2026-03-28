import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe, TitleCasePipe, SlicePipe, DecimalPipe } from '@angular/common';
import { MarketingService } from '../../../services/marketing';
import { CustomerService } from '../../../services/customer';
import { AuthService } from '../../../services/auth';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import {
  Campaign,
  CampaignFormData,
  CampaignTemplate,
  CampaignChannel,
  CampaignType,
  CampaignStatus,
  MarketingTab,
  MarketingAutomation,
  MarketingAutomationFormData,
  AutomationTrigger,
  CAMPAIGN_TEMPLATES,
  CustomerSegment,
} from '../../../models/index';

@Component({
  selector: 'os-campaign-builder',
  imports: [CurrencyPipe, DatePipe, TitleCasePipe, SlicePipe, DecimalPipe, LoadingSpinner],
  templateUrl: './campaign-builder.html',
  styleUrl: './campaign-builder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignBuilder {
  private readonly marketingService = inject(MarketingService);
  private readonly customerService = inject(CustomerService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly isLoading = this.marketingService.isLoading;
  readonly error = this.marketingService.error;
  readonly campaigns = this.marketingService.campaigns;
  readonly draftCampaigns = this.marketingService.draftCampaigns;
  readonly sentCampaigns = this.marketingService.sentCampaigns;
  readonly scheduledCampaigns = this.marketingService.scheduledCampaigns;
  readonly totalSent = this.marketingService.totalSent;
  readonly avgOpenRate = this.marketingService.avgOpenRate;
  readonly totalRevenue = this.marketingService.totalRevenue;
  readonly automations = this.marketingService.automations;
  readonly activeAutomations = this.marketingService.activeAutomations;
  readonly totalAutomationsSent = this.marketingService.totalAutomationsSent;
  readonly templates = CAMPAIGN_TEMPLATES;

  private readonly _activeTab = signal<MarketingTab>('campaigns');
  private readonly _statusFilter = signal<CampaignStatus | 'all'>('all');
  private readonly _showForm = signal(false);
  private readonly _editingCampaign = signal<Campaign | null>(null);
  private readonly _selectedCampaign = signal<Campaign | null>(null);
  private readonly _isSaving = signal(false);
  private readonly _isSending = signal(false);

  // Campaign form fields
  private readonly _formName = signal('');
  private readonly _formType = signal<CampaignType>('promotional');
  private readonly _formChannel = signal<CampaignChannel>('email');
  private readonly _formSubject = signal('');
  private readonly _formBody = signal('');
  private readonly _formSmsBody = signal('');
  private readonly _formSegments = signal<string[]>([]);
  private readonly _formTiers = signal<string[]>([]);
  private readonly _formScheduledAt = signal('');
  private readonly _estimatedRecipients = signal(0);

  // Automation state
  private readonly _showAutomationForm = signal(false);
  private readonly _editingAutomation = signal<MarketingAutomation | null>(null);
  private readonly _autoName = signal('');
  private readonly _autoTrigger = signal<AutomationTrigger>('welcome');
  private readonly _autoChannel = signal<CampaignChannel>('email');
  private readonly _autoTemplateId = signal<string | null>(null);
  private readonly _autoDelayMinutes = signal(60);
  private readonly _autoIsActive = signal(true);
  private readonly _autoTriggerConfig = signal<Record<string, number>>({});
  private readonly _isTogglingAutomation = signal(false);

  readonly activeTab = this._activeTab.asReadonly();
  readonly statusFilter = this._statusFilter.asReadonly();
  readonly showForm = this._showForm.asReadonly();
  readonly editingCampaign = this._editingCampaign.asReadonly();
  readonly selectedCampaign = this._selectedCampaign.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly isSending = this._isSending.asReadonly();
  readonly formName = this._formName.asReadonly();
  readonly formType = this._formType.asReadonly();
  readonly formChannel = this._formChannel.asReadonly();
  readonly formSubject = this._formSubject.asReadonly();
  readonly formBody = this._formBody.asReadonly();
  readonly formSmsBody = this._formSmsBody.asReadonly();
  readonly formSegments = this._formSegments.asReadonly();
  readonly formTiers = this._formTiers.asReadonly();
  readonly formScheduledAt = this._formScheduledAt.asReadonly();
  readonly estimatedRecipients = this._estimatedRecipients.asReadonly();

  readonly showAutomationForm = this._showAutomationForm.asReadonly();
  readonly editingAutomation = this._editingAutomation.asReadonly();
  readonly autoName = this._autoName.asReadonly();
  readonly autoTrigger = this._autoTrigger.asReadonly();
  readonly autoChannel = this._autoChannel.asReadonly();
  readonly autoTemplateId = this._autoTemplateId.asReadonly();
  readonly autoDelayMinutes = this._autoDelayMinutes.asReadonly();
  readonly autoIsActive = this._autoIsActive.asReadonly();
  readonly autoTriggerConfig = this._autoTriggerConfig.asReadonly();
  readonly isTogglingAutomation = this._isTogglingAutomation.asReadonly();

  readonly allSegments: { key: CustomerSegment; label: string }[] = [
    { key: 'vip', label: 'VIP' },
    { key: 'regular', label: 'Regular' },
    { key: 'new', label: 'New' },
    { key: 'at-risk', label: 'At-Risk' },
    { key: 'dormant', label: 'Dormant' },
  ];

  readonly allTiers: { key: string; label: string }[] = [
    { key: 'bronze', label: 'Bronze' },
    { key: 'silver', label: 'Silver' },
    { key: 'gold', label: 'Gold' },
    { key: 'platinum', label: 'Platinum' },
  ];

  readonly campaignTypes: { key: CampaignType; label: string }[] = [
    { key: 'promotional', label: 'Promotional' },
    { key: 'welcome', label: 'Welcome' },
    { key: 'win-back', label: 'Win-Back' },
    { key: 'birthday', label: 'Birthday' },
    { key: 'loyalty-tier', label: 'Loyalty Tier' },
    { key: 'announcement', label: 'Announcement' },
  ];

  readonly triggerTypes: { key: AutomationTrigger; label: string; icon: string; description: string }[] = [
    { key: 'welcome', label: 'Welcome', icon: 'bi-hand-thumbs-up', description: 'First order placed' },
    { key: 'win_back', label: 'Win-Back', icon: 'bi-arrow-repeat', description: 'No orders in X days' },
    { key: 'birthday', label: 'Birthday', icon: 'bi-gift', description: 'X days before birthday' },
    { key: 'anniversary', label: 'Anniversary', icon: 'bi-calendar-heart', description: 'X days before anniversary' },
    { key: 'loyalty_tier_up', label: 'Tier Upgrade', icon: 'bi-trophy', description: 'Customer reaches new tier' },
    { key: 'post_visit', label: 'Post Visit', icon: 'bi-chat-square-text', description: 'X hours after order' },
    { key: 'abandoned_cart', label: 'Abandoned Cart', icon: 'bi-cart-x', description: 'Cart with no order (online)' },
  ];

  readonly filteredCampaigns = computed(() => {
    const filter = this._statusFilter();
    if (filter === 'all') return this.campaigns();
    return this.campaigns().filter(c => c.status === filter);
  });

  readonly canSave = computed(() => {
    const name = this._formName().trim();
    const channel = this._formChannel();
    const hasEmail = channel === 'email' || channel === 'both';
    const hasSms = channel === 'sms' || channel === 'both';
    if (!name) return false;
    if (hasEmail && (!this._formSubject().trim() || !this._formBody().trim())) return false;
    if (hasSms && !this._formSmsBody().trim()) return false;
    return true;
  });

  readonly canSaveAutomation = computed(() => {
    return this._autoName().trim().length > 0;
  });

  readonly triggerConfigLabel = computed(() => {
    const trigger = this._autoTrigger();
    switch (trigger) {
      case 'win_back': return 'Days inactive before trigger';
      case 'birthday': return 'Days before birthday';
      case 'anniversary': return 'Days before anniversary';
      case 'post_visit': return 'Hours after order';
      case 'abandoned_cart': return 'Minutes after cart abandoned';
      default: return null;
    }
  });

  readonly triggerConfigKey = computed(() => {
    const trigger = this._autoTrigger();
    switch (trigger) {
      case 'win_back': return 'daysInactive';
      case 'birthday': return 'daysBefore';
      case 'anniversary': return 'daysBefore';
      case 'post_visit': return 'hoursAfter';
      case 'abandoned_cart': return 'minutesAfter';
      default: return null;
    }
  });

  readonly triggerConfigValue = computed(() => {
    const key = this.triggerConfigKey();
    if (!key) return 0;
    return this._autoTriggerConfig()[key] ?? 0;
  });

  constructor() {
    effect(() => {
      if (this.isAuthenticated()) {
        this.marketingService.loadCampaigns();
        this.marketingService.loadAutomations();
        this.customerService.loadCustomers();
      }
    });
  }

  setTab(tab: MarketingTab): void {
    this._activeTab.set(tab);
  }

  setStatusFilter(status: CampaignStatus | 'all'): void {
    this._statusFilter.set(status);
  }

  // --- Campaign CRUD ---

  openNewCampaign(): void {
    this._editingCampaign.set(null);
    this.resetForm();
    this._showForm.set(true);
  }

  openEditCampaign(campaign: Campaign): void {
    this._editingCampaign.set(campaign);
    this._formName.set(campaign.name);
    this._formType.set(campaign.type);
    this._formChannel.set(campaign.channel);
    this._formSubject.set(campaign.subject);
    this._formBody.set(campaign.body);
    this._formSmsBody.set(campaign.smsBody ?? '');
    this._formSegments.set([...campaign.audience.segments]);
    this._formTiers.set([...campaign.audience.loyaltyTiers]);
    this._formScheduledAt.set(campaign.scheduledAt ?? '');
    this._showForm.set(true);
  }

  closeForm(): void {
    this._showForm.set(false);
    this._editingCampaign.set(null);
  }

  selectCampaign(campaign: Campaign): void {
    this._selectedCampaign.set(campaign);
  }

  closeDetail(): void {
    this._selectedCampaign.set(null);
  }

  applyTemplate(template: CampaignTemplate): void {
    this._formName.set(template.name);
    this._formType.set(template.type);
    this._formSubject.set(template.subject);
    this._formBody.set(template.body);
    this._formSmsBody.set(template.smsBody ?? '');
  }

  onFormField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    switch (field) {
      case 'name': this._formName.set(value); break;
      case 'type': this._formType.set(value as CampaignType); break;
      case 'channel': this._formChannel.set(value as CampaignChannel); break;
      case 'subject': this._formSubject.set(value); break;
      case 'body': this._formBody.set(value); break;
      case 'smsBody': this._formSmsBody.set(value); break;
      case 'scheduledAt': this._formScheduledAt.set(value); break;
    }
  }

  toggleSegment(segment: string): void {
    this._formSegments.update(list =>
      list.includes(segment) ? list.filter(s => s !== segment) : [...list, segment]
    );
    void this.updateEstimate();
  }

  toggleTier(tier: string): void {
    this._formTiers.update(list =>
      list.includes(tier) ? list.filter(t => t !== tier) : [...list, tier]
    );
    void this.updateEstimate();
  }

  isSegmentSelected(segment: string): boolean {
    return this._formSegments().includes(segment);
  }

  isTierSelected(tier: string): boolean {
    return this._formTiers().includes(tier);
  }

  async saveCampaign(): Promise<void> {
    if (!this.canSave() || this._isSaving()) return;
    this._isSaving.set(true);
    try {
      const data: CampaignFormData = {
        name: this._formName().trim(),
        type: this._formType(),
        channel: this._formChannel(),
        subject: this._formSubject().trim(),
        body: this._formBody().trim(),
        smsBody: this._formSmsBody().trim() || undefined,
        segments: this._formSegments(),
        loyaltyTiers: this._formTiers(),
        scheduledAt: this._formScheduledAt() || undefined,
      };

      const editing = this._editingCampaign();
      if (editing) {
        await this.marketingService.updateCampaign(editing.id, data);
      } else {
        await this.marketingService.createCampaign(data);
      }
      this.closeForm();
    } finally {
      this._isSaving.set(false);
    }
  }

  async sendNow(campaign: Campaign): Promise<void> {
    this._isSending.set(true);
    try {
      await this.marketingService.sendCampaign(campaign.id);
    } finally {
      this._isSending.set(false);
    }
  }

  async deleteCampaign(campaign: Campaign): Promise<void> {
    await this.marketingService.deleteCampaign(campaign.id);
    if (this._selectedCampaign()?.id === campaign.id) {
      this._selectedCampaign.set(null);
    }
  }

  getStatusClass(status: CampaignStatus): string {
    switch (status) {
      case 'draft': return 'badge-secondary';
      case 'scheduled': return 'badge-info';
      case 'sending': return 'badge-warning';
      case 'sent': return 'badge-success';
      case 'failed': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  getTypeLabel(type: CampaignType): string {
    return this.campaignTypes.find(t => t.key === type)?.label ?? type;
  }

  getOpenRate(campaign: Campaign): number {
    const d = campaign.performance.delivered;
    return d > 0 ? Math.round((campaign.performance.opened / d) * 100) : 0;
  }

  getClickRate(campaign: Campaign): number {
    const d = campaign.performance.delivered;
    return d > 0 ? Math.round((campaign.performance.clicked / d) * 100) : 0;
  }

  // --- Automation CRUD ---

  getTriggerLabel(trigger: AutomationTrigger): string {
    return this.triggerTypes.find(t => t.key === trigger)?.label ?? trigger;
  }

  getTriggerIcon(trigger: AutomationTrigger): string {
    return this.triggerTypes.find(t => t.key === trigger)?.icon ?? 'bi-gear';
  }

  openNewAutomation(): void {
    this._editingAutomation.set(null);
    this.resetAutomationForm();
    this._showAutomationForm.set(true);
  }

  openEditAutomation(automation: MarketingAutomation): void {
    this._editingAutomation.set(automation);
    this._autoName.set(automation.name);
    this._autoTrigger.set(automation.trigger);
    this._autoChannel.set(automation.channel);
    this._autoTemplateId.set(automation.campaignTemplateId);
    this._autoDelayMinutes.set(automation.delayMinutes);
    this._autoIsActive.set(automation.isActive);
    this._autoTriggerConfig.set({ ...automation.triggerConfig });
    this._showAutomationForm.set(true);
  }

  closeAutomationForm(): void {
    this._showAutomationForm.set(false);
    this._editingAutomation.set(null);
  }

  selectTrigger(trigger: AutomationTrigger): void {
    this._autoTrigger.set(trigger);
  }

  onAutoField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    switch (field) {
      case 'name': this._autoName.set(value); break;
      case 'channel': this._autoChannel.set(value as CampaignChannel); break;
      case 'templateId': this._autoTemplateId.set(value || null); break;
      case 'delayMinutes': this._autoDelayMinutes.set(Number.parseInt(value, 10) || 0); break;
    }
  }

  onAutoActiveToggle(): void {
    this._autoIsActive.update(v => !v);
  }

  onTriggerConfigValue(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10) || 0;
    const key = this.triggerConfigKey();
    if (key) {
      this._autoTriggerConfig.update(cfg => ({ ...cfg, [key]: value }));
    }
  }

  async saveAutomation(): Promise<void> {
    if (!this.canSaveAutomation() || this._isSaving()) return;
    this._isSaving.set(true);
    try {
      const data: MarketingAutomationFormData = {
        trigger: this._autoTrigger(),
        name: this._autoName().trim(),
        campaignTemplateId: this._autoTemplateId(),
        channel: this._autoChannel(),
        delayMinutes: this._autoDelayMinutes(),
        isActive: this._autoIsActive(),
        triggerConfig: this._autoTriggerConfig(),
      };

      const editing = this._editingAutomation();
      if (editing) {
        await this.marketingService.updateAutomation(editing.id, data);
      } else {
        await this.marketingService.createAutomation(data);
      }
      this.closeAutomationForm();
    } finally {
      this._isSaving.set(false);
    }
  }

  async toggleAutomationActive(automation: MarketingAutomation): Promise<void> {
    this._isTogglingAutomation.set(true);
    try {
      await this.marketingService.toggleAutomation(automation.id, !automation.isActive);
    } finally {
      this._isTogglingAutomation.set(false);
    }
  }

  async deleteAutomation(automation: MarketingAutomation): Promise<void> {
    await this.marketingService.deleteAutomation(automation.id);
  }

  formatDelay(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  }

  private resetForm(): void {
    this._formName.set('');
    this._formType.set('promotional');
    this._formChannel.set('email');
    this._formSubject.set('');
    this._formBody.set('');
    this._formSmsBody.set('');
    this._formSegments.set([]);
    this._formTiers.set([]);
    this._formScheduledAt.set('');
    this._estimatedRecipients.set(0);
  }

  private resetAutomationForm(): void {
    this._autoName.set('');
    this._autoTrigger.set('welcome');
    this._autoChannel.set('email');
    this._autoTemplateId.set(null);
    this._autoDelayMinutes.set(60);
    this._autoIsActive.set(true);
    this._autoTriggerConfig.set({});
  }

  private async updateEstimate(): Promise<void> {
    const count = await this.marketingService.getAudienceEstimate(
      this._formSegments(),
      this._formTiers()
    );
    this._estimatedRecipients.set(count);
  }
}
