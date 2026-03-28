import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { CustomerService } from '../../../services/customer';
import { AuthService } from '../../../services/auth';
import { LoyaltyService } from '../../../services/loyalty';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../../shared/error-display/error-display';
import { Customer, CustomerSegment, CrmTab, CrmSortField, LoyaltyTransaction, FeedbackRequest, SmartGroup, SmartGroupFormData, GroupRule, GroupRuleField, GroupRuleOperator, PREBUILT_SMART_GROUPS, MessageThread, MessageChannel, getTierLabel, getTierColor } from '../../../models/index';

@Component({
  selector: 'os-crm',
  imports: [CurrencyPipe, DecimalPipe, DatePipe, LoadingSpinner, ErrorDisplay],
  templateUrl: './customer-dashboard.html',
  styleUrl: './customer-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDashboard {
  private readonly customerService = inject(CustomerService);
  private readonly authService = inject(AuthService);
  private readonly loyaltyService = inject(LoyaltyService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _activeTab = signal<CrmTab>('customers');
  private readonly _searchTerm = signal('');
  private readonly _segmentFilter = signal<CustomerSegment | null>(null);
  private readonly _sortField = signal<CrmSortField>('totalSpent');
  private readonly _sortAsc = signal(false);
  private readonly _selectedCustomer = signal<Customer | null>(null);

  // Loyalty detail
  private readonly _loyaltyHistory = signal<LoyaltyTransaction[]>([]);
  private readonly _isLoadingLoyalty = signal(false);
  private readonly _adjustPoints = signal(0);
  private readonly _adjustReason = signal('');
  private readonly _isAdjusting = signal(false);

  // Feedback
  private readonly _isLoadingFeedback = signal(false);
  private readonly _feedbackResponseId = signal<string | null>(null);
  private readonly _feedbackResponseText = signal('');
  private readonly _isRespondingFeedback = signal(false);

  // Smart Groups (Phase 3)
  private readonly _showGroupForm = signal(false);
  private readonly _editingGroupId = signal<string | null>(null);
  private readonly _groupFormName = signal('');
  private readonly _groupFormRules = signal<GroupRule[]>([{ field: 'total_orders', operator: 'gte', value: 1 }]);
  private readonly _groupFormLogic = signal<'and' | 'or'>('and');

  // Messaging Inbox (Phase 3)
  private readonly _selectedThread = signal<MessageThread | null>(null);
  private readonly _replyText = signal('');
  private readonly _replyChannel = signal<'sms' | 'email'>('sms');
  private readonly _isSendingReply = signal(false);
  private readonly _inboxFilter = signal<'all' | 'unread'>('all');

  readonly activeTab = this._activeTab.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly segmentFilter = this._segmentFilter.asReadonly();
  readonly sortField = this._sortField.asReadonly();
  readonly sortAsc = this._sortAsc.asReadonly();
  readonly selectedCustomer = this._selectedCustomer.asReadonly();
  readonly loyaltyHistory = this._loyaltyHistory.asReadonly();
  readonly isLoadingLoyalty = this._isLoadingLoyalty.asReadonly();
  readonly adjustPoints = this._adjustPoints.asReadonly();
  readonly adjustReason = this._adjustReason.asReadonly();
  readonly isAdjusting = this._isAdjusting.asReadonly();
  readonly loyaltyConfig = this.loyaltyService.config;

  readonly isLoadingFeedback = this._isLoadingFeedback.asReadonly();
  readonly feedback = this.customerService.feedback;
  readonly averageNps = this.customerService.averageNps;
  readonly averageRating = this.customerService.averageRating;
  readonly negativeFeedback = this.customerService.negativeFeedback;
  readonly feedbackResponseId = this._feedbackResponseId.asReadonly();
  readonly feedbackResponseText = this._feedbackResponseText.asReadonly();
  readonly isRespondingFeedback = this._isRespondingFeedback.asReadonly();

  // Smart Groups
  readonly smartGroups = this.customerService.smartGroups;
  readonly isLoadingGroups = this.customerService.isLoadingGroups;
  readonly showGroupForm = this._showGroupForm.asReadonly();
  readonly editingGroupId = this._editingGroupId.asReadonly();
  readonly groupFormName = this._groupFormName.asReadonly();
  readonly groupFormRules = this._groupFormRules.asReadonly();
  readonly groupFormLogic = this._groupFormLogic.asReadonly();

  // Messaging Inbox
  readonly threads = this.customerService.threads;
  readonly isLoadingThreads = this.customerService.isLoadingThreads;
  readonly totalUnreadMessages = this.customerService.totalUnreadMessages;
  readonly selectedThread = this._selectedThread.asReadonly();
  readonly replyText = this._replyText.asReadonly();
  readonly replyChannel = this._replyChannel.asReadonly();
  readonly isSendingReply = this._isSendingReply.asReadonly();
  readonly inboxFilter = this._inboxFilter.asReadonly();
  readonly templates = this.customerService.templates;

  readonly filteredThreads = computed(() => {
    const filter = this._inboxFilter();
    const list = this.threads();
    if (filter === 'unread') return list.filter(t => t.unreadCount > 0);
    return list;
  });

  readonly customers = this.customerService.customers;
  readonly isLoading = this.customerService.isLoading;
  readonly error = this.customerService.error;

  readonly filteredCustomers = computed(() => {
    let list = this.customers();
    const search = this._searchTerm().toLowerCase();
    const segment = this._segmentFilter();

    if (search) {
      list = list.filter(c =>
        (c.firstName ?? '').toLowerCase().includes(search) ||
        (c.lastName ?? '').toLowerCase().includes(search) ||
        (c.email ?? '').toLowerCase().includes(search) ||
        (c.phone ?? '').includes(search)
      );
    }

    if (segment) {
      list = list.filter(c => this.customerService.getSegment(c).segment === segment);
    }

    const field = this._sortField();
    const asc = this._sortAsc();
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'name':
          cmp = (a.firstName ?? '').localeCompare(b.firstName ?? '');
          break;
        case 'totalSpent':
          cmp = a.totalSpent - b.totalSpent;
          break;
        case 'totalOrders':
          cmp = a.totalOrders - b.totalOrders;
          break;
        case 'lastOrderDate':
          cmp = new Date(a.lastOrderDate ?? 0).getTime() - new Date(b.lastOrderDate ?? 0).getTime();
          break;
        case 'loyaltyPoints':
          cmp = a.loyaltyPoints - b.loyaltyPoints;
          break;
      }
      return asc ? cmp : -cmp;
    });

    return list;
  });

  readonly segmentCounts = computed(() => {
    const counts = { vip: 0, regular: 0, new: 0, 'at-risk': 0, dormant: 0 };
    for (const customer of this.customers()) {
      const seg = this.customerService.getSegment(customer).segment;
      counts[seg]++;
    }
    return counts;
  });

  readonly totalCustomers = computed(() => this.customers().length);
  readonly totalRevenue = computed(() =>
    this.customers().reduce((sum, c) => sum + c.totalSpent, 0)
  );
  readonly avgLifetimeValue = computed(() => {
    const count = this.totalCustomers();
    return count > 0 ? this.totalRevenue() / count : 0;
  });
  readonly totalLoyaltyPoints = computed(() =>
    this.customers().reduce((sum, c) => sum + c.loyaltyPoints, 0)
  );

  readonly ratingDistribution = computed(() => {
    const dist = [0, 0, 0, 0, 0];
    for (const f of this.feedback()) {
      if (f.rating !== null && f.rating >= 1 && f.rating <= 5) {
        dist[f.rating - 1]++;
      }
    }
    return dist;
  });

  readonly ratingDistributionMax = computed(() =>
    Math.max(1, ...this.ratingDistribution())
  );

  private readonly _dataLoaded = signal(false);

  constructor() {
    effect(() => {
      const id = this.authService.selectedMerchantId();
      if (id && !this._dataLoaded()) {
        this._dataLoaded.set(true);
        this.customerService.loadCustomers();
        this.loyaltyService.loadConfig();
      }
    });
  }

  setTab(tab: CrmTab): void {
    this._activeTab.set(tab);
    if (tab === 'insights' && this.feedback().length === 0) {
      this.loadFeedback();
    }
    if (tab === 'groups' && this.smartGroups().length === 0) {
      this.customerService.loadSmartGroups();
    }
    if (tab === 'inbox' && this.threads().length === 0) {
      this.customerService.loadMessageThreads();
      this.customerService.loadMessageTemplates();
    }
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this._searchTerm.set(value);
  }

  setSegmentFilter(segment: CustomerSegment | null): void {
    this._segmentFilter.set(segment);
  }

  toggleSort(field: CrmSortField): void {
    if (this._sortField() === field) {
      this._sortAsc.update(v => !v);
    } else {
      this._sortField.set(field);
      this._sortAsc.set(false);
    }
  }

  selectCustomer(customer: Customer): void {
    this._selectedCustomer.set(customer);
    this._loyaltyHistory.set([]);
    this._adjustPoints.set(0);
    this._adjustReason.set('');
    this.loadLoyaltyHistory(customer.id);
  }

  closeDetail(): void {
    this._selectedCustomer.set(null);
    this._loyaltyHistory.set([]);
  }

  // --- Loyalty ---

  getLoyaltyTierLabel(customer: Customer): string {
    return getTierLabel(customer.loyaltyTier);
  }

  getLoyaltyTierColor(customer: Customer): string {
    return getTierColor(customer.loyaltyTier);
  }

  getTierProgress(customer: Customer): number {
    const config = this.loyaltyConfig();
    const earned = customer.totalPointsEarned;
    const tier = customer.loyaltyTier;
    if (tier === 'platinum') return 100;
    const thresholds = { bronze: 0, silver: config.tierSilverMin, gold: config.tierGoldMin, platinum: config.tierPlatinumMin };
    let nextTier: 'silver' | 'gold' | 'platinum';
    if (tier === 'bronze') {
      nextTier = 'silver';
    } else if (tier === 'silver') {
      nextTier = 'gold';
    } else {
      nextTier = 'platinum';
    }
    const current = thresholds[tier];
    const next = thresholds[nextTier];
    if (next <= current) return 100;
    return Math.min(100, Math.round(((earned - current) / (next - current)) * 100));
  }

  getNextTierLabel(customer: Customer): string {
    const tier = customer.loyaltyTier;
    if (tier === 'platinum') return '';
    if (tier === 'bronze') return 'Silver';
    if (tier === 'silver') return 'Gold';
    return 'Platinum';
  }

  onAdjustPointsInput(event: Event): void {
    this._adjustPoints.set(Number.parseInt((event.target as HTMLInputElement).value, 10) || 0);
  }

  onAdjustReasonInput(event: Event): void {
    this._adjustReason.set((event.target as HTMLInputElement).value);
  }

  async submitAdjustment(): Promise<void> {
    const customer = this._selectedCustomer();
    const points = this._adjustPoints();
    const reason = this._adjustReason().trim();
    if (!customer || points === 0 || !reason) return;

    this._isAdjusting.set(true);
    try {
      const success = await this.loyaltyService.adjustPoints(customer.id, points, reason);
      if (success) {
        this._adjustPoints.set(0);
        this._adjustReason.set('');
        await this.loadLoyaltyHistory(customer.id);
        this.customerService.loadCustomers();
      }
    } finally {
      this._isAdjusting.set(false);
    }
  }

  private async loadLoyaltyHistory(customerId: string): Promise<void> {
    this._isLoadingLoyalty.set(true);
    try {
      const history = await this.loyaltyService.getPointsHistory(customerId);
      this._loyaltyHistory.set(history);
    } finally {
      this._isLoadingLoyalty.set(false);
    }
  }

  // --- Feedback ---

  async loadFeedback(): Promise<void> {
    this._isLoadingFeedback.set(true);
    try {
      await this.customerService.loadFeedback();
    } finally {
      this._isLoadingFeedback.set(false);
    }
  }

  getNpsLabel(score: number): string {
    if (score >= 9) return 'Promoter';
    if (score >= 7) return 'Passive';
    return 'Detractor';
  }

  getNpsClass(score: number): string {
    if (score >= 9) return 'text-success';
    if (score >= 7) return 'text-warning';
    return 'text-danger';
  }

  getStarArray(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < rating);
  }

  openFeedbackResponse(feedbackId: string): void {
    this._feedbackResponseId.set(feedbackId);
    this._feedbackResponseText.set('');
  }

  closeFeedbackResponse(): void {
    this._feedbackResponseId.set(null);
    this._feedbackResponseText.set('');
  }

  onFeedbackResponseInput(event: Event): void {
    this._feedbackResponseText.set((event.target as HTMLTextAreaElement).value);
  }

  async submitFeedbackResponse(): Promise<void> {
    const id = this._feedbackResponseId();
    const text = this._feedbackResponseText().trim();
    if (!id || !text) return;

    this._isRespondingFeedback.set(true);
    try {
      const success = await this.customerService.respondToFeedback(id, text);
      if (success) {
        this.closeFeedbackResponse();
      }
    } finally {
      this._isRespondingFeedback.set(false);
    }
  }

  isFeedbackNegative(f: FeedbackRequest): boolean {
    return (f.npsScore !== null && f.npsScore <= 6) || (f.rating !== null && f.rating <= 2);
  }

  // --- Utility ---

  getSegment(customer: Customer) {
    return this.customerService.getSegment(customer);
  }

  getCustomerName(customer: Customer): string {
    const parts = [customer.firstName, customer.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Unknown';
  }

  getDaysSinceOrder(customer: Customer): number | null {
    if (!customer.lastOrderDate) return null;
    return Math.floor((Date.now() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
  }

  getSortIcon(field: CrmSortField): string {
    if (this._sortField() !== field) return '';
    return this._sortAsc() ? 'asc' : 'desc';
  }

  // === Smart Groups (Phase 3) ===

  openGroupForm(): void {
    this._showGroupForm.set(true);
    this._editingGroupId.set(null);
    this._groupFormName.set('');
    this._groupFormRules.set([{ field: 'total_orders', operator: 'gte', value: 1 }]);
    this._groupFormLogic.set('and');
  }

  editGroup(group: SmartGroup): void {
    this._showGroupForm.set(true);
    this._editingGroupId.set(group.id);
    this._groupFormName.set(group.name);
    this._groupFormRules.set([...group.rules]);
    this._groupFormLogic.set(group.rulesLogic);
  }

  closeGroupForm(): void {
    this._showGroupForm.set(false);
    this._editingGroupId.set(null);
  }

  setGroupFormName(event: Event): void {
    this._groupFormName.set((event.target as HTMLInputElement).value);
  }

  setGroupFormLogic(logic: 'and' | 'or'): void {
    this._groupFormLogic.set(logic);
  }

  addGroupRule(): void {
    this._groupFormRules.update(rules => [...rules, { field: 'total_orders' as GroupRuleField, operator: 'gte' as GroupRuleOperator, value: 1 }]);
  }

  removeGroupRule(index: number): void {
    this._groupFormRules.update(rules => rules.filter((_, i) => i !== index));
  }

  updateRuleField(index: number, field: string): void {
    this._groupFormRules.update(rules => rules.map((r, i) => i === index ? { ...r, field: field as GroupRuleField } : r));
  }

  updateRuleOperator(index: number, operator: string): void {
    this._groupFormRules.update(rules => rules.map((r, i) => i === index ? { ...r, operator: operator as GroupRuleOperator } : r));
  }

  updateRuleValue(index: number, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = Number.isNaN(Number(raw)) ? raw : Number(raw);
    this._groupFormRules.update(rules => rules.map((r, i) => i === index ? { ...r, value } : r));
  }

  async saveGroup(): Promise<void> {
    const name = this._groupFormName().trim();
    const rules = this._groupFormRules();
    if (!name || rules.length === 0) return;

    const data: SmartGroupFormData = { name, rules, rulesLogic: this._groupFormLogic() };
    const editId = this._editingGroupId();

    if (editId) {
      await this.customerService.updateSmartGroup(editId, data);
    } else {
      await this.customerService.createSmartGroup(data);
    }
    this.closeGroupForm();
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.customerService.deleteSmartGroup(groupId);
  }

  async addPrebuiltGroup(index: number): Promise<void> {
    const prebuilt = PREBUILT_SMART_GROUPS[index];
    if (!prebuilt) return;
    await this.customerService.createSmartGroup(prebuilt);
  }

  async refreshGroupCounts(): Promise<void> {
    await this.customerService.refreshSmartGroupCounts();
  }

  getRuleFieldLabel(field: GroupRuleField): string {
    switch (field) {
      case 'total_orders': return 'Total Orders';
      case 'total_spent': return 'Total Spent';
      case 'avg_order_value': return 'Avg Order Value';
      case 'days_since_last_order': return 'Days Since Last Order';
      case 'loyalty_tier': return 'Loyalty Tier';
      case 'loyalty_points': return 'Loyalty Points';
      case 'tag': return 'Tag';
    }
  }

  getRuleOperatorLabel(operator: GroupRuleOperator): string {
    switch (operator) {
      case 'gte': return '>=';
      case 'lte': return '<=';
      case 'eq': return '=';
      case 'neq': return '!=';
      case 'contains': return 'contains';
    }
  }

  // === Unified Messaging Inbox (Phase 3) ===

  setInboxFilter(filter: 'all' | 'unread'): void {
    this._inboxFilter.set(filter);
  }

  selectThread(thread: MessageThread): void {
    this._selectedThread.set(thread);
    this._replyText.set('');
    if (thread.unreadCount > 0) {
      this.customerService.markThreadRead(thread.customerId);
    }
  }

  closeThread(): void {
    this._selectedThread.set(null);
  }

  setReplyText(event: Event): void {
    this._replyText.set((event.target as HTMLTextAreaElement).value);
  }

  setReplyChannel(channel: 'sms' | 'email'): void {
    this._replyChannel.set(channel);
  }

  useTemplate(templateBody: string): void {
    this._replyText.set(templateBody);
  }

  async sendReply(): Promise<void> {
    const thread = this._selectedThread();
    const body = this._replyText().trim();
    if (!thread || !body) return;

    this._isSendingReply.set(true);
    try {
      await this.customerService.sendMessage(thread.customerId, body, this._replyChannel());
      this._replyText.set('');
      // Reload threads to get updated messages
      await this.customerService.loadMessageThreads();
      const updated = this.threads().find(t => t.customerId === thread.customerId);
      if (updated) this._selectedThread.set(updated);
    } finally {
      this._isSendingReply.set(false);
    }
  }

  getChannelLabel(channel: MessageChannel): string {
    switch (channel) {
      case 'sms': return 'SMS';
      case 'email': return 'Email';
      case 'feedback_response': return 'Feedback';
      case 'system': return 'System';
    }
  }

  getChannelClass(channel: MessageChannel): string {
    switch (channel) {
      case 'sms': return 'channel-sms';
      case 'email': return 'channel-email';
      case 'feedback_response': return 'channel-feedback';
      case 'system': return 'channel-system';
    }
  }

  clearError(): void {
    this.customerService.clearError();
  }

  retry(): void {
    this.customerService.loadCustomers();
  }
}
