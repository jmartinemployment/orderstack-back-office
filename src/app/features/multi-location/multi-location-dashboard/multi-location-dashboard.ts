import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { MultiLocationService } from '../../../services/multi-location';
import { AuthService } from '../../../services/auth';
import {
  MultiLocationTab,
  LocationGroup,
  LocationGroupFormData,
  LocationGroupMember,
  PropagationSettingType,
  CrossLocationStaffMember,
  LocationCompliance,
  ComplianceCheckItem,
  UserRestaurant,
} from '../../../models/index';

@Component({
  selector: 'os-multi-location',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, DatePipe],
  templateUrl: './multi-location-dashboard.html',
  styleUrl: './multi-location-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiLocationDashboard implements OnInit {
  private readonly mlService = inject(MultiLocationService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private healthInterval: ReturnType<typeof setInterval> | null = null;

  readonly activeTab = signal<MultiLocationTab>('overview');
  readonly groups = this.mlService.groups;
  readonly groupMembers = this.mlService.groupMembers;
  readonly crossLocationReport = this.mlService.crossLocationReport;
  readonly syncPreview = this.mlService.syncPreview;
  readonly syncHistory = this.mlService.syncHistory;
  readonly isLoading = this.mlService.isLoading;
  readonly isSyncing = this.mlService.isSyncing;
  readonly isPropagating = this.mlService.isPropagating;
  readonly error = this.mlService.error;

  readonly restaurants = this.authService.merchants;
  readonly currentRestaurantId = this.authService.selectedMerchantId;
  readonly currentRestaurantName = this.authService.selectedMerchantName;

  // Phase 2 signals from service
  readonly crossLocationStaff = this.mlService.crossLocationStaff;
  readonly staffTransfers = this.mlService.staffTransfers;
  readonly crossLocationInventory = this.mlService.crossLocationInventory;
  readonly inventoryTransfers = this.mlService.inventoryTransfers;
  readonly locationHealth = this.mlService.locationHealth;
  readonly groupCampaigns = this.mlService.groupCampaigns;
  readonly isLoadingStaff = this.mlService.isLoadingStaff;
  readonly isLoadingInventory = this.mlService.isLoadingInventory;
  readonly isLoadingHealth = this.mlService.isLoadingHealth;
  readonly lowStockItems = this.mlService.lowStockItems;
  readonly offlineLocations = this.mlService.offlineLocations;

  // Phase 3 signals from service
  readonly benchmarks = this.mlService.benchmarks;
  readonly compliance = this.mlService.compliance;
  readonly isLoadingBenchmarks = this.mlService.isLoadingBenchmarks;
  readonly isLoadingCompliance = this.mlService.isLoadingCompliance;
  readonly attentionLocations = this.mlService.attentionLocations;
  readonly avgComplianceScore = this.mlService.avgComplianceScore;
  readonly nonCompliantLocations = this.mlService.nonCompliantLocations;

  // Report period
  readonly reportDays = signal(30);

  // Group form
  readonly showGroupForm = signal(false);
  readonly editingGroup = signal<LocationGroup | null>(null);
  readonly groupName = signal('');
  readonly groupDescription = signal('');
  readonly selectedMemberIds = signal<Set<string>>(new Set());
  readonly isSavingGroup = signal(false);

  // Group detail
  readonly expandedGroupId = signal<string | null>(null);

  // Menu sync
  readonly syncSourceId = signal('');
  readonly syncTargetIds = signal<Set<string>>(new Set());
  readonly showSyncConfirm = signal(false);

  // Settings propagation
  readonly propagateType = signal<string>('');
  readonly propagateSourceId = signal('');
  readonly propagateTargetIds = signal<Set<string>>(new Set());
  readonly propagateOverride = signal(false);

  // Staff tab
  readonly staffLocationFilter = signal('');
  readonly staffSearch = signal('');
  readonly showTransferModal = signal(false);
  readonly transferMemberId = signal('');
  readonly transferTargetId = signal('');

  readonly filteredStaff = computed(() => {
    let staff = this.crossLocationStaff();
    const locFilter = this.staffLocationFilter();
    const search = this.staffSearch().toLowerCase();
    if (locFilter) {
      staff = staff.filter(s => s.primaryLocationId === locFilter || s.assignedLocationIds.includes(locFilter));
    }
    if (search) {
      staff = staff.filter(s =>
        s.name.toLowerCase().includes(search) ||
        s.email.toLowerCase().includes(search) ||
        s.jobTitle.toLowerCase().includes(search)
      );
    }
    return staff;
  });

  readonly transferMember = computed(() =>
    this.crossLocationStaff().find(s => s.teamMemberId === this.transferMemberId()) ?? null
  );

  // Inventory tab
  readonly inventorySearch = signal('');
  readonly inventoryLowStockOnly = signal(false);
  readonly showInventoryTransferForm = signal(false);
  readonly invTransferFromId = signal('');
  readonly invTransferToId = signal('');
  readonly invTransferItems = signal<{ itemId: string; quantity: number }[]>([]);

  readonly filteredInventory = computed(() => {
    let items = this.crossLocationInventory();
    if (this.inventoryLowStockOnly()) {
      items = items.filter(i => i.isLowStockAnywhere);
    }
    const search = this.inventorySearch().toLowerCase();
    if (search) {
      items = items.filter(i => i.itemName.toLowerCase().includes(search));
    }
    return items;
  });

  // Sorted location KPIs
  readonly sortField = signal<string>('revenue');
  readonly sortAsc = signal(false);

  readonly sortedLocations = computed(() => {
    const report = this.crossLocationReport();
    if (!report) return [];
    const field = this.sortField();
    const asc = this.sortAsc();
    return [...report.locations].sort((a, b) => {
      const av = (a as unknown as Record<string, number>)[field];
      const bv = (b as unknown as Record<string, number>)[field];
      return asc ? av - bv : bv - av;
    });
  });

  // Best/worst performers
  readonly topPerformer = computed(() => {
    const locs = this.sortedLocations();
    return locs.length > 0 ? locs[0] : null;
  });

  readonly bottomPerformer = computed(() => {
    const locs = this.sortedLocations();
    return locs.length > 1 ? locs.at(-1) ?? null : null;
  });

  // Benchmark computeds
  readonly sortedBenchmarks = computed(() =>
    [...this.benchmarks()].sort((a, b) => b.performanceScore - a.performanceScore)
  );

  // Compliance tab
  readonly expandedComplianceId = signal<string | null>(null);
  readonly complianceCategoryFilter = signal<string>('');
  readonly showResolvedCompliance = signal(false);

  readonly filteredCompliance = computed(() => {
    const items = this.compliance();
    const catFilter = this.complianceCategoryFilter();
    if (!catFilter) return items;
    return items.map(loc => ({
      ...loc,
      items: loc.items.filter(i => i.category === catFilter),
    }));
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.mlService.loadGroups(),
      this.mlService.loadCrossLocationReport(this.reportDays()),
      this.mlService.loadSyncHistory(),
    ]);

    // Load health + benchmarks for overview and start auto-refresh
    const firstGroup = this.groups().at(0);
    if (firstGroup) {
      await Promise.all([
        this.mlService.loadLocationHealth(firstGroup.id),
        this.mlService.loadBenchmarks(firstGroup.id),
      ]);
      this.startHealthRefresh(firstGroup.id);
    }

    this.destroyRef.onDestroy(() => {
      this.clearHealthRefresh();
    });
  }

  private startHealthRefresh(lgId: string): void {
    this.clearHealthRefresh();
    this.healthInterval = setInterval(() => {
      this.mlService.loadLocationHealth(lgId);
    }, 30_000);
  }

  private clearHealthRefresh(): void {
    if (this.healthInterval !== null) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
  }

  private complianceLoaded = false;

  async setTab(tab: MultiLocationTab): Promise<void> {
    this.activeTab.set(tab);
    const firstGroup = this.groups().at(0);
    if (!firstGroup) return;

    if (tab === 'staff' && this.crossLocationStaff().length === 0) {
      await this.mlService.loadCrossLocationStaff(firstGroup.id);
    } else if (tab === 'inventory' && this.crossLocationInventory().length === 0) {
      await Promise.all([
        this.mlService.loadCrossLocationInventory(firstGroup.id),
        this.mlService.loadInventoryTransfers(firstGroup.id),
      ]);
    } else if (tab === 'franchise' && !this.complianceLoaded) {
      this.complianceLoaded = true;
      await this.mlService.loadCompliance(firstGroup.id);
    }
  }

  dismissError(): void {
    this.mlService.clearError();
  }

  // ── Report ──

  async changeReportDays(days: number): Promise<void> {
    this.reportDays.set(days);
    await this.mlService.loadCrossLocationReport(days);
  }

  toggleSort(field: string): void {
    if (this.sortField() === field) {
      this.sortAsc.update(v => !v);
    } else {
      this.sortField.set(field);
      this.sortAsc.set(false);
    }
  }

  getSortIcon(field: string): string {
    if (this.sortField() !== field) return 'bi-arrow-down-up';
    return this.sortAsc() ? 'bi-sort-up' : 'bi-sort-down';
  }

  getKpiClass(value: number, type: 'revenue' | 'cost'): string {
    if (type === 'revenue') return value > 0 ? 'kpi-positive' : 'kpi-neutral';
    if (value <= 28) return 'kpi-good';
    if (value <= 35) return 'kpi-warning';
    return 'kpi-danger';
  }

  getHealthDotClass(status: string): string {
    if (status === 'online') return 'health-dot online';
    if (status === 'degraded') return 'health-dot degraded';
    return 'health-dot offline';
  }

  getHealthStatusLabel(status: string): string {
    if (status === 'online') return 'Online';
    if (status === 'degraded') return 'Degraded';
    return 'Offline';
  }

  // ── Benchmarking ──

  getTrendIcon(trend: string): string {
    if (trend === 'improving') return 'bi-arrow-up-right';
    if (trend === 'declining') return 'bi-arrow-down-right';
    return 'bi-dash';
  }

  getTrendClass(trend: string): string {
    if (trend === 'improving') return 'trend-up';
    if (trend === 'declining') return 'trend-down';
    return 'trend-stable';
  }

  getScoreClass(score: number): string {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-fair';
    return 'score-poor';
  }

  getPercentileBarWidth(percentile: number): string {
    return `${percentile}%`;
  }

  getPercentileClass(percentile: number): string {
    if (percentile >= 75) return 'pctl-high';
    if (percentile >= 50) return 'pctl-mid';
    if (percentile >= 25) return 'pctl-low';
    return 'pctl-bottom';
  }

  getRankBadge(index: number): string {
    if (index === 0) return '1st';
    if (index === 1) return '2nd';
    if (index === 2) return '3rd';
    return `${index + 1}th`;
  }

  // ── Compliance ──

  toggleComplianceExpand(merchantId: string): void {
    if (this.expandedComplianceId() === merchantId) {
      this.expandedComplianceId.set(null);
    } else {
      this.expandedComplianceId.set(merchantId);
    }
  }

  getComplianceScoreClass(score: number): string {
    if (score >= 90) return 'compliance-excellent';
    if (score >= 70) return 'compliance-good';
    if (score >= 50) return 'compliance-fair';
    return 'compliance-poor';
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'menu': return 'bi-journal-text';
      case 'pricing': return 'bi-tag';
      case 'settings': return 'bi-gear';
      case 'hours': return 'bi-clock';
      case 'branding': return 'bi-palette';
      default: return 'bi-check-circle';
    }
  }

  getCategoryLabel(category: string): string {
    switch (category) {
      case 'menu': return 'Menu Compliance';
      case 'pricing': return 'Pricing Compliance';
      case 'settings': return 'Settings Compliance';
      case 'hours': return 'Hours Compliance';
      case 'branding': return 'Brand Compliance';
      default: return category;
    }
  }

  getFailingItems(loc: LocationCompliance): ComplianceCheckItem[] {
    const showResolved = this.showResolvedCompliance();
    if (showResolved) return loc.items;
    return loc.items.filter(i => !i.isPassing);
  }

  async resolveComplianceItem(merchantId: string, checkId: string): Promise<void> {
    const firstGroup = this.groups().at(0);
    if (!firstGroup) return;
    await this.mlService.resolveComplianceItem(firstGroup.id, merchantId, checkId);
  }

  // ── Groups ──

  openGroupForm(group?: LocationGroup): void {
    if (group) {
      this.editingGroup.set(group);
      this.groupName.set(group.name);
      this.groupDescription.set(group.description ?? '');
      const members = this.groupMembers().get(group.id) ?? [];
      this.selectedMemberIds.set(new Set(members.map(m => m.merchantId)));
    } else {
      this.editingGroup.set(null);
      this.groupName.set('');
      this.groupDescription.set('');
      this.selectedMemberIds.set(new Set());
    }
    this.showGroupForm.set(true);
  }

  closeGroupForm(): void {
    this.showGroupForm.set(false);
    this.editingGroup.set(null);
  }

  toggleMemberId(id: string): void {
    this.selectedMemberIds.update(set => {
      const updated = new Set(set);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  }

  isMemberSelected(id: string): boolean {
    return this.selectedMemberIds().has(id);
  }

  async saveGroup(): Promise<void> {
    if (!this.groupName()) return;
    this.isSavingGroup.set(true);
    const data: LocationGroupFormData = {
      name: this.groupName(),
      description: this.groupDescription() || undefined,
      merchantIds: [...this.selectedMemberIds()],
    };

    const editing = this.editingGroup();
    if (editing) {
      await this.mlService.updateGroup(editing.id, data);
    } else {
      await this.mlService.createGroup(data);
    }
    this.isSavingGroup.set(false);
    this.closeGroupForm();
  }

  async deleteGroup(group: LocationGroup): Promise<void> {
    await this.mlService.deleteGroup(group.id);
  }

  toggleGroupExpand(groupId: string): void {
    if (this.expandedGroupId() === groupId) {
      this.expandedGroupId.set(null);
    } else {
      this.expandedGroupId.set(groupId);
      this.mlService.loadGroupMembers(groupId);
    }
  }

  getGroupMembers(groupId: string): LocationGroupMember[] {
    return this.groupMembers().get(groupId) ?? [];
  }

  async removeGroupMember(groupId: string, memberId: string): Promise<void> {
    await this.mlService.removeMember(groupId, memberId);
  }

  // ── Menu Sync ──

  toggleSyncTarget(id: string): void {
    this.syncTargetIds.update(set => {
      const updated = new Set(set);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  }

  isSyncTarget(id: string): boolean {
    return this.syncTargetIds().has(id);
  }

  get canPreviewSync(): boolean {
    return !!this.syncSourceId() && this.syncTargetIds().size > 0;
  }

  async previewSync(): Promise<void> {
    if (!this.canPreviewSync) return;
    await this.mlService.previewMenuSync(
      this.syncSourceId(),
      [...this.syncTargetIds()]
    );
  }

  cancelSync(): void {
    this.mlService.clearSyncPreview();
    this.showSyncConfirm.set(false);
  }

  async executeSync(): Promise<void> {
    const result = await this.mlService.executeMenuSync(
      this.syncSourceId(),
      [...this.syncTargetIds()]
    );
    if (result) {
      this.syncSourceId.set('');
      this.syncTargetIds.set(new Set());
      this.showSyncConfirm.set(false);
    }
  }

  getRestaurantName(id: string): string {
    return this.restaurants().find(r => r.id === id)?.name ?? 'Unknown';
  }

  getSyncTargetRestaurants(): UserRestaurant[] {
    const sourceId = this.syncSourceId();
    return this.restaurants().filter(r => r.id !== sourceId);
  }

  // ── Settings Propagation ──

  togglePropagateTarget(id: string): void {
    this.propagateTargetIds.update(set => {
      const updated = new Set(set);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  }

  isPropagateTarget(id: string): boolean {
    return this.propagateTargetIds().has(id);
  }

  getPropagateTargetRestaurants(): UserRestaurant[] {
    const sourceId = this.propagateSourceId();
    return this.restaurants().filter(r => r.id !== sourceId);
  }

  get canPropagate(): boolean {
    return !!this.propagateType() && !!this.propagateSourceId() && this.propagateTargetIds().size > 0;
  }

  async propagateSettings(): Promise<void> {
    if (!this.canPropagate) return;
    await this.mlService.propagateSettings({
      settingType: this.propagateType() as PropagationSettingType,
      sourceRestaurantId: this.propagateSourceId(),
      targetRestaurantIds: [...this.propagateTargetIds()],
      overrideExisting: this.propagateOverride(),
    });
    this.propagateType.set('');
    this.propagateSourceId.set('');
    this.propagateTargetIds.set(new Set());
    this.propagateOverride.set(false);
  }

  getSettingTypeLabel(type: string): string {
    switch (type) {
      case 'ai': return 'AI Settings';
      case 'pricing': return 'Pricing Rules';
      case 'loyalty': return 'Loyalty Config';
      case 'delivery': return 'Delivery Settings';
      case 'payment': return 'Payment Settings';
      case 'tip_management': return 'Tip Management';
      case 'stations': return 'Stations';
      case 'break_types': return 'Break Types';
      case 'workweek': return 'Workweek';
      case 'timeclock': return 'Time Clock';
      case 'auto_gratuity': return 'Auto Gratuity';
      case 'business_hours': return 'Business Hours';
      default: return type;
    }
  }

  // ── Staff Tab ──

  openTransferModal(member: CrossLocationStaffMember): void {
    this.transferMemberId.set(member.teamMemberId);
    this.transferTargetId.set('');
    this.showTransferModal.set(true);
  }

  closeTransferModal(): void {
    this.showTransferModal.set(false);
    this.transferMemberId.set('');
    this.transferTargetId.set('');
  }

  getTransferTargetRestaurants(): UserRestaurant[] {
    const member = this.transferMember();
    if (!member) return this.restaurants();
    return this.restaurants().filter(r => r.id !== member.primaryLocationId);
  }

  async confirmTransfer(): Promise<void> {
    const member = this.transferMember();
    const targetId = this.transferTargetId();
    if (!member || !targetId) return;
    const firstGroup = this.groups().at(0);
    if (!firstGroup) return;
    await this.mlService.transferStaff(firstGroup.id, member.teamMemberId, member.primaryLocationId, targetId);
    this.closeTransferModal();
  }

  // ── Inventory Tab ──

  openInventoryTransferForm(): void {
    this.invTransferFromId.set('');
    this.invTransferToId.set('');
    this.invTransferItems.set([]);
    this.showInventoryTransferForm.set(true);
  }

  closeInventoryTransferForm(): void {
    this.showInventoryTransferForm.set(false);
  }

  addTransferItem(): void {
    this.invTransferItems.update(list => [...list, { itemId: '', quantity: 1 }]);
  }

  removeTransferItem(index: number): void {
    this.invTransferItems.update(list => list.filter((_, i) => i !== index));
  }

  updateTransferItemId(index: number, value: string): void {
    this.invTransferItems.update(list =>
      list.map((item, i) => i === index ? { ...item, itemId: value } : item)
    );
  }

  updateTransferItemQty(index: number, value: number): void {
    this.invTransferItems.update(list =>
      list.map((item, i) => i === index ? { ...item, quantity: value } : item)
    );
  }

  getInvTransferTargetRestaurants(): UserRestaurant[] {
    const fromId = this.invTransferFromId();
    return this.restaurants().filter(r => r.id !== fromId);
  }

  get canSubmitInventoryTransfer(): boolean {
    return !!this.invTransferFromId() &&
      !!this.invTransferToId() &&
      this.invTransferItems().length > 0 &&
      this.invTransferItems().every(i => !!i.itemId && i.quantity > 0);
  }

  async submitInventoryTransfer(): Promise<void> {
    if (!this.canSubmitInventoryTransfer) return;
    const firstGroup = this.groups().at(0);
    if (!firstGroup) return;
    await this.mlService.createInventoryTransfer(firstGroup.id, {
      fromRestaurantId: this.invTransferFromId(),
      toRestaurantId: this.invTransferToId(),
      items: this.invTransferItems(),
    });
    this.closeInventoryTransferForm();
  }

  getTransferStatusClass(status: string): string {
    switch (status) {
      case 'received': return 'badge-success';
      case 'in_transit': return 'badge-info';
      case 'pending': return 'badge-warning';
      case 'cancelled': return 'badge-danger';
      default: return '';
    }
  }
}
