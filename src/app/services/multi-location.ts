import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  LocationGroup,
  LocationGroupFormData,
  LocationGroupMember,
  CrossLocationReport,
  MenuSyncPreview,
  MenuSyncResult,
  MenuSyncHistory,
  SettingsPropagation,
  OnlineLocation,
  CrossLocationStaffMember,
  StaffTransfer,
  CrossLocationInventoryItem,
  InventoryTransfer,
  InventoryTransferFormData,
  LocationHealth,
  GroupCampaign,
  LocationBenchmark,
  LocationCompliance,
} from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MultiLocationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _groups = signal<LocationGroup[]>([]);
  private readonly _groupMembers = signal<Map<string, LocationGroupMember[]>>(new Map());
  private readonly _crossLocationReport = signal<CrossLocationReport | null>(null);
  private readonly _syncPreview = signal<MenuSyncPreview | null>(null);
  private readonly _syncHistory = signal<MenuSyncResult[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _isSyncing = signal(false);
  private readonly _isPropagating = signal(false);
  private readonly _error = signal<string | null>(null);

  // Phase 2 signals
  private readonly _crossLocationStaff = signal<CrossLocationStaffMember[]>([]);
  private readonly _staffTransfers = signal<StaffTransfer[]>([]);
  private readonly _crossLocationInventory = signal<CrossLocationInventoryItem[]>([]);
  private readonly _inventoryTransfers = signal<InventoryTransfer[]>([]);
  private readonly _locationHealth = signal<LocationHealth[]>([]);
  private readonly _groupCampaigns = signal<GroupCampaign[]>([]);
  private readonly _isLoadingStaff = signal(false);
  private readonly _isLoadingInventory = signal(false);
  private readonly _isLoadingHealth = signal(false);

  readonly groups = this._groups.asReadonly();
  readonly groupMembers = this._groupMembers.asReadonly();
  readonly crossLocationReport = this._crossLocationReport.asReadonly();
  readonly syncPreview = this._syncPreview.asReadonly();
  readonly syncHistory = this._syncHistory.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isSyncing = this._isSyncing.asReadonly();
  readonly isPropagating = this._isPropagating.asReadonly();
  readonly error = this._error.asReadonly();

  readonly crossLocationStaff = this._crossLocationStaff.asReadonly();
  readonly staffTransfers = this._staffTransfers.asReadonly();
  readonly crossLocationInventory = this._crossLocationInventory.asReadonly();
  readonly inventoryTransfers = this._inventoryTransfers.asReadonly();
  readonly locationHealth = this._locationHealth.asReadonly();
  readonly groupCampaigns = this._groupCampaigns.asReadonly();
  readonly isLoadingStaff = this._isLoadingStaff.asReadonly();
  readonly isLoadingInventory = this._isLoadingInventory.asReadonly();
  readonly isLoadingHealth = this._isLoadingHealth.asReadonly();

  readonly groupCount = computed(() => this._groups().length);

  readonly lowStockItems = computed(() =>
    this._crossLocationInventory().filter(item => item.isLowStockAnywhere)
  );

  readonly offlineLocations = computed(() =>
    this._locationHealth().filter(loc => loc.status !== 'online')
  );

  private get groupId(): string | null {
    return this.authService.user()?.restaurantGroupId ?? null;
  }

  // ── Location Groups ──

  async loadGroups(): Promise<void> {
    if (!this.groupId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const groups = await firstValueFrom(
        this.http.get<LocationGroup[]>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups`
        )
      );
      this._groups.set(groups);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._groups.set([]);
      } else {
        this._error.set('Failed to load location groups');
      }
    } finally {
      this._isLoading.set(false);
    }
  }

  async createGroup(data: LocationGroupFormData): Promise<LocationGroup | null> {
    if (!this.groupId) return null;
    this._error.set(null);
    try {
      const group = await firstValueFrom(
        this.http.post<LocationGroup>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups`,
          data
        )
      );
      this._groups.update(list => [...list, group]);
      return group;
    } catch {
      this._error.set('Failed to create group');
      return null;
    }
  }

  async updateGroup(id: string, data: Partial<LocationGroupFormData>): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<LocationGroup>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups/${id}`,
          data
        )
      );
      this._groups.update(list => list.map(g => g.id === id ? updated : g));
    } catch {
      this._error.set('Failed to update group');
    }
  }

  async deleteGroup(id: string): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups/${id}`
        )
      );
      this._groups.update(list => list.filter(g => g.id !== id));
    } catch {
      this._error.set('Failed to delete group');
    }
  }

  async loadGroupMembers(groupId: string): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      const members = await firstValueFrom(
        this.http.get<LocationGroupMember[]>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups/${groupId}/members`
        )
      );
      this._groupMembers.update(map => {
        const updated = new Map(map);
        updated.set(groupId, members);
        return updated;
      });
    } catch {
      this._error.set('Failed to load group members');
    }
  }

  async addMember(groupId: string, merchantId: string): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      const member = await firstValueFrom(
        this.http.post<LocationGroupMember>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups/${groupId}/members`,
          { merchantId }
        )
      );
      this._groupMembers.update(map => {
        const updated = new Map(map);
        const existing = updated.get(groupId) ?? [];
        updated.set(groupId, [...existing, member]);
        return updated;
      });
    } catch {
      this._error.set('Failed to add member');
    }
  }

  async removeMember(groupId: string, memberId: string): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups/${groupId}/members/${memberId}`
        )
      );
      this._groupMembers.update(map => {
        const updated = new Map(map);
        const existing = updated.get(groupId) ?? [];
        updated.set(groupId, existing.filter(m => m.id !== memberId));
        return updated;
      });
    } catch {
      this._error.set('Failed to remove member');
    }
  }

  // ── Cross-Location Analytics ──

  async loadCrossLocationReport(days: number = 30): Promise<void> {
    if (!this.groupId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const report = await firstValueFrom(
        this.http.get<CrossLocationReport>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/cross-location-report`,
          { params: { days: days.toString() } }
        )
      );
      this._crossLocationReport.set({
        ...report,
        locations: report.locations ?? [],
        totals: report.totals ?? {
          totalRevenue: 0,
          totalOrders: 0,
          avgOrderValue: 0,
          avgLaborCostPercent: 0,
          avgFoodCostPercent: 0,
        },
      });
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._crossLocationReport.set(null);
      } else {
        this._error.set('Failed to load cross-location report');
      }
    } finally {
      this._isLoading.set(false);
    }
  }

  // ── Menu Sync ──

  async previewMenuSync(sourceRestaurantId: string, targetRestaurantIds: string[]): Promise<void> {
    if (!this.groupId) return;
    this._isSyncing.set(true);
    this._error.set(null);
    try {
      const preview = await firstValueFrom(
        this.http.post<MenuSyncPreview>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/sync-menu/preview`,
          { sourceRestaurantId, targetRestaurantIds }
        )
      );
      this._syncPreview.set(preview);
    } catch {
      this._error.set('Failed to generate sync preview');
    } finally {
      this._isSyncing.set(false);
    }
  }

  async executeMenuSync(sourceRestaurantId: string, targetRestaurantIds: string[]): Promise<MenuSyncResult | null> {
    if (!this.groupId) return null;
    this._isSyncing.set(true);
    this._error.set(null);
    try {
      const result = await firstValueFrom(
        this.http.post<MenuSyncResult>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/sync-menu`,
          { sourceRestaurantId, targetRestaurantIds }
        )
      );
      this._syncHistory.update(list => [result, ...list]);
      this._syncPreview.set(null);
      return result;
    } catch {
      this._error.set('Failed to sync menu');
      return null;
    } finally {
      this._isSyncing.set(false);
    }
  }

  async loadSyncHistory(): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      const history = await firstValueFrom(
        this.http.get<MenuSyncHistory>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/sync-menu/history`
        )
      );
      this._syncHistory.set(history.syncs);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._syncHistory.set([]);
      } else {
        this._error.set('Failed to load sync history');
      }
    }
  }

  clearSyncPreview(): void {
    this._syncPreview.set(null);
  }

  // ── Settings Propagation ──

  async propagateSettings(data: SettingsPropagation): Promise<void> {
    if (!this.groupId) return;
    this._isPropagating.set(true);
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant-groups/${this.groupId}/propagate-settings`,
          data
        )
      );
    } catch {
      this._error.set('Failed to propagate settings');
    } finally {
      this._isPropagating.set(false);
    }
  }

  clearError(): void {
    this._error.set(null);
  }

  // ── Cross-Location Staff (Phase 2) ──

  async loadCrossLocationStaff(lgId: string): Promise<void> {
    if (!this.groupId) return;
    this._isLoadingStaff.set(true);
    this._error.set(null);
    try {
      const staff = await firstValueFrom(
        this.http.get<CrossLocationStaffMember[]>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups/${lgId}/staff`
        )
      );
      this._crossLocationStaff.set(staff);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._crossLocationStaff.set([]);
      } else {
        this._error.set('Failed to load cross-location staff');
      }
    } finally {
      this._isLoadingStaff.set(false);
    }
  }

  async transferStaff(lgId: string, teamMemberId: string, fromId: string, toId: string): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      const transfer = await firstValueFrom(
        this.http.post<StaffTransfer>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups/${lgId}/staff/transfer`,
          { teamMemberId, fromRestaurantId: fromId, toRestaurantId: toId }
        )
      );
      this._staffTransfers.update(list => [transfer, ...list]);
      this._crossLocationStaff.update(list =>
        list.map(s => s.teamMemberId === teamMemberId
          ? { ...s, primaryLocationId: toId, primaryLocationName: transfer.toRestaurantName }
          : s
        )
      );
    } catch {
      this._error.set('Failed to transfer staff member');
    }
  }

  // ── Cross-Location Inventory (Phase 2) ──

  async loadCrossLocationInventory(lgId: string): Promise<void> {
    if (!this.groupId) return;
    this._isLoadingInventory.set(true);
    this._error.set(null);
    try {
      const inventory = await firstValueFrom(
        this.http.get<CrossLocationInventoryItem[]>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups/${lgId}/inventory`
        )
      );
      this._crossLocationInventory.set(inventory);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._crossLocationInventory.set([]);
      } else {
        this._error.set('Failed to load cross-location inventory');
      }
    } finally {
      this._isLoadingInventory.set(false);
    }
  }

  async createInventoryTransfer(lgId: string, data: InventoryTransferFormData): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      const transfer = await firstValueFrom(
        this.http.post<InventoryTransfer>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups/${lgId}/inventory/transfer`,
          data
        )
      );
      this._inventoryTransfers.update(list => [transfer, ...list]);
    } catch {
      this._error.set('Failed to create inventory transfer');
    }
  }

  async loadInventoryTransfers(lgId: string): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      const transfers = await firstValueFrom(
        this.http.get<InventoryTransfer[]>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups/${lgId}/inventory/transfers`
        )
      );
      this._inventoryTransfers.set(transfers);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._inventoryTransfers.set([]);
      } else {
        this._error.set('Failed to load inventory transfers');
      }
    }
  }

  // ── Location Health (Phase 2) ──

  async loadLocationHealth(lgId: string): Promise<void> {
    if (!this.groupId) return;
    this._isLoadingHealth.set(true);
    this._error.set(null);
    try {
      const health = await firstValueFrom(
        this.http.get<LocationHealth[]>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups/${lgId}/health`
        )
      );
      this._locationHealth.set(health);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._locationHealth.set([]);
      } else {
        this._error.set('Failed to load location health');
      }
    } finally {
      this._isLoadingHealth.set(false);
    }
  }

  // ── Group Campaigns (Phase 2) ──

  async loadGroupCampaigns(lgId: string): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      const campaigns = await firstValueFrom(
        this.http.get<GroupCampaign[]>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups/${lgId}/campaigns`
        )
      );
      this._groupCampaigns.set(campaigns);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._groupCampaigns.set([]);
      } else {
        this._error.set('Failed to load group campaigns');
      }
    }
  }

  async createGroupCampaign(lgId: string, data: { name: string; targetLocationIds: string[] }): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      const campaign = await firstValueFrom(
        this.http.post<GroupCampaign>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups/${lgId}/campaigns`,
          data
        )
      );
      this._groupCampaigns.update(list => [campaign, ...list]);
    } catch {
      this._error.set('Failed to create group campaign');
    }
  }

  // ── Benchmarking & Compliance (Phase 3) ──

  private readonly _benchmarks = signal<LocationBenchmark[]>([]);
  private readonly _compliance = signal<LocationCompliance[]>([]);
  private readonly _isLoadingBenchmarks = signal(false);
  private readonly _isLoadingCompliance = signal(false);

  readonly benchmarks = this._benchmarks.asReadonly();
  readonly compliance = this._compliance.asReadonly();
  readonly isLoadingBenchmarks = this._isLoadingBenchmarks.asReadonly();
  readonly isLoadingCompliance = this._isLoadingCompliance.asReadonly();

  readonly attentionLocations = computed(() =>
    this._benchmarks().filter(b => b.needsAttention)
  );

  readonly avgComplianceScore = computed(() => {
    const items = this._compliance();
    if (items.length === 0) return 0;
    return items.reduce((sum, c) => sum + c.score, 0) / items.length;
  });

  readonly nonCompliantLocations = computed(() =>
    this._compliance().filter(c => c.failingChecks > 0)
  );

  async loadBenchmarks(lgId: string): Promise<void> {
    if (!this.groupId) return;
    this._isLoadingBenchmarks.set(true);
    this._error.set(null);
    try {
      const data = await firstValueFrom(
        this.http.get<LocationBenchmark[]>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups/${lgId}/benchmarks`
        )
      );
      this._benchmarks.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._benchmarks.set([]);
      } else {
        this._error.set('Failed to load benchmarks');
      }
    } finally {
      this._isLoadingBenchmarks.set(false);
    }
  }

  async loadCompliance(lgId: string): Promise<void> {
    if (!this.groupId) return;
    this._isLoadingCompliance.set(true);
    this._error.set(null);
    try {
      const data = await firstValueFrom(
        this.http.get<LocationCompliance[]>(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups/${lgId}/compliance`
        )
      );
      this._compliance.set(data);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._compliance.set([]);
      } else {
        this._error.set('Failed to load compliance data');
      }
    } finally {
      this._isLoadingCompliance.set(false);
    }
  }

  async resolveComplianceItem(lgId: string, merchantId: string, checkId: string): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/merchant-groups/${this.groupId}/location-groups/${lgId}/compliance/${merchantId}/resolve`,
          { checkId }
        )
      );
      this._compliance.update(list =>
        list.map(loc => {
          if (loc.merchantId !== merchantId) return loc;
          const updatedItems = loc.items.map(item =>
            item.id === checkId ? { ...item, isPassing: true, resolvedAt: new Date().toISOString() } : item
          );
          const passingChecks = updatedItems.filter(i => i.isPassing).length;
          return {
            ...loc,
            items: updatedItems,
            passingChecks,
            failingChecks: loc.totalChecks - passingChecks,
            score: Math.round((passingChecks / loc.totalChecks) * 100),
          };
        })
      );
    } catch {
      this._error.set('Failed to resolve compliance item');
    }
  }

  // ── Online Ordering Multi-Location (GOS-SPEC-07 Phase 2.5) ──

  private readonly _onlineLocations = signal<OnlineLocation[]>([]);
  private readonly _isLoadingLocations = signal(false);

  readonly onlineLocations = this._onlineLocations.asReadonly();
  readonly isLoadingLocations = this._isLoadingLocations.asReadonly();

  async loadOnlineLocations(groupSlug: string, lat?: number, lng?: number): Promise<OnlineLocation[]> {
    this._isLoadingLocations.set(true);
    try {
      const params: Record<string, string> = {};
      if (lat !== undefined && lng !== undefined) {
        params['lat'] = lat.toString();
        params['lng'] = lng.toString();
      }
      const result = await firstValueFrom(
        this.http.get<OnlineLocation[]>(`${this.apiUrl}/online/locations/${groupSlug}`, { params })
      );
      this._onlineLocations.set(result);
      return result;
    } catch {
      this._onlineLocations.set([]);
      return [];
    } finally {
      this._isLoadingLocations.set(false);
    }
  }
}
