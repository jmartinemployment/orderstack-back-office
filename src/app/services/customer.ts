import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Customer, CustomerSegmentInfo, SavedAddress, SavedAddressFormData, FeedbackRequest, Referral, ReferralConfig, SmartGroup, SmartGroupFormData, MessageThread, CustomerMessage, MessageTemplate } from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _customers = signal<Customer[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _savedAddresses = signal<SavedAddress[]>([]);
  private readonly _feedback = signal<FeedbackRequest[]>([]);
  private readonly _referrals = signal<Referral[]>([]);
  private readonly _referralConfig = signal<ReferralConfig | null>(null);

  // --- Smart Groups (Phase 3) ---
  private readonly _smartGroups = signal<SmartGroup[]>([]);
  private readonly _isLoadingGroups = signal(false);

  // --- Messaging Inbox (Phase 3) ---
  private readonly _threads = signal<MessageThread[]>([]);
  private readonly _templates = signal<MessageTemplate[]>([]);
  private readonly _isLoadingThreads = signal(false);

  readonly customers = this._customers.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly savedAddresses = this._savedAddresses.asReadonly();
  readonly feedback = this._feedback.asReadonly();
  readonly referrals = this._referrals.asReadonly();
  readonly referralConfig = this._referralConfig.asReadonly();
  readonly smartGroups = this._smartGroups.asReadonly();
  readonly isLoadingGroups = this._isLoadingGroups.asReadonly();
  readonly threads = this._threads.asReadonly();
  readonly templates = this._templates.asReadonly();
  readonly isLoadingThreads = this._isLoadingThreads.asReadonly();

  readonly totalUnreadMessages = computed(() =>
    this._threads().reduce((sum, t) => sum + t.unreadCount, 0)
  );

  readonly customerCount = computed(() => this._customers().length);

  readonly defaultAddress = computed(() =>
    this._savedAddresses().find(a => a.isDefault) ?? null
  );

  readonly averageNps = computed(() => {
    const scored = this._feedback().filter(f => f.npsScore !== null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((sum, f) => sum + (f.npsScore ?? 0), 0) / scored.length * 10) / 10;
  });

  readonly averageRating = computed(() => {
    const rated = this._feedback().filter(f => f.rating !== null);
    if (rated.length === 0) return null;
    return Math.round(rated.reduce((sum, f) => sum + (f.rating ?? 0), 0) / rated.length * 10) / 10;
  });

  readonly negativeFeedback = computed(() =>
    this._feedback().filter(f => (f.npsScore !== null && f.npsScore <= 6) || (f.rating !== null && f.rating <= 2))
  );

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  private normalizeCustomer(c: Customer): Customer {
    return {
      ...c,
      totalOrders: Number(c.totalOrders) || 0,
      totalSpent: Number(c.totalSpent) || 0,
      avgOrderValue: c.avgOrderValue === null ? null : Number(c.avgOrderValue) || 0,
      loyaltyPoints: Number(c.loyaltyPoints) || 0,
      totalPointsEarned: Number(c.totalPointsEarned) || 0,
      totalPointsRedeemed: Number(c.totalPointsRedeemed) || 0,
    };
  }

  // --- Customers ---

  async loadCustomers(): Promise<void> {
    if (!this.merchantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<Customer[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers`
        )
      );
      this._customers.set((data ?? []).map(c => this.normalizeCustomer(c)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load customers';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async searchCustomers(query: string): Promise<void> {
    if (!this.merchantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<Customer[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers?search=${encodeURIComponent(query)}`
        )
      );
      this._customers.set((data ?? []).map(c => this.normalizeCustomer(c)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to search customers';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateTags(customerId: string, tags: string[]): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/${customerId}`,
          { tags }
        )
      );
      this._customers.update(customers =>
        customers.map(c => c.id === customerId ? { ...c, tags } : c)
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update tags';
      this._error.set(message);
      return false;
    }
  }

  // --- Saved Addresses ---

  async loadSavedAddresses(customerId: string): Promise<void> {
    if (!this.merchantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<SavedAddress[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/${customerId}/addresses`
        )
      );
      this._savedAddresses.set(data ?? []);
    } catch {
      this._savedAddresses.set([]);
    }
  }

  async saveAddress(customerId: string, data: SavedAddressFormData): Promise<SavedAddress | null> {
    if (!this.merchantId) return null;

    try {
      const address = await firstValueFrom(
        this.http.post<SavedAddress>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/${customerId}/addresses`,
          data
        )
      );
      this._savedAddresses.update(list => [...list, address]);
      return address;
    } catch {
      return null;
    }
  }

  async deleteAddress(customerId: string, addressId: string): Promise<void> {
    if (!this.merchantId) return;

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/${customerId}/addresses/${addressId}`
        )
      );
      this._savedAddresses.update(list => list.filter(a => a.id !== addressId));
    } catch {
      // Keep existing state
    }
  }

  clearSavedAddresses(): void {
    this._savedAddresses.set([]);
  }

  // --- Feedback ---

  async sendFeedbackRequest(orderId: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/feedback/request`,
          { orderId }
        )
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send feedback request';
      this._error.set(message);
      return false;
    }
  }

  async loadFeedback(dateFrom?: string, dateTo?: string): Promise<void> {
    if (!this.merchantId) return;

    try {
      let url = `${this.apiUrl}/merchant/${this.merchantId}/customers/feedback`;
      const params: string[] = [];
      if (dateFrom) params.push(`dateFrom=${encodeURIComponent(dateFrom)}`);
      if (dateTo) params.push(`dateTo=${encodeURIComponent(dateTo)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const data = await firstValueFrom(
        this.http.get<FeedbackRequest[]>(url)
      );
      this._feedback.set(data ?? []);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this._feedback.set([]);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to load feedback';
        this._error.set(message);
      }
    }
  }

  async respondToFeedback(feedbackId: string, response: string): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.post<FeedbackRequest>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/feedback/${feedbackId}/respond`,
          { response }
        )
      );
      this._feedback.update(list =>
        list.map(f => f.id === feedbackId ? updated : f)
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to respond to feedback';
      this._error.set(message);
      return false;
    }
  }

  // --- Referrals ---

  async loadReferralConfig(): Promise<void> {
    if (!this.merchantId) return;

    try {
      const config = await firstValueFrom(
        this.http.get<ReferralConfig>(
          `${this.apiUrl}/merchant/${this.merchantId}/referrals/config`
        )
      );
      this._referralConfig.set(config);
    } catch {
      this._referralConfig.set(null);
    }
  }

  async saveReferralConfig(config: ReferralConfig): Promise<boolean> {
    if (!this.merchantId) return false;

    try {
      const saved = await firstValueFrom(
        this.http.put<ReferralConfig>(
          `${this.apiUrl}/merchant/${this.merchantId}/referrals/config`,
          config
        )
      );
      this._referralConfig.set(saved);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save referral config';
      this._error.set(message);
      return false;
    }
  }

  async loadReferrals(customerId?: string): Promise<void> {
    if (!this.merchantId) return;

    try {
      let url = `${this.apiUrl}/merchant/${this.merchantId}/referrals`;
      if (customerId) url += `?customerId=${encodeURIComponent(customerId)}`;

      const data = await firstValueFrom(
        this.http.get<Referral[]>(url)
      );
      this._referrals.set(data ?? []);
    } catch {
      this._referrals.set([]);
    }
  }

  // --- Segments ---

  getSegment(customer: Customer): CustomerSegmentInfo {
    const daysSinceOrder = customer.lastOrderDate
      ? Math.floor((Date.now() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (customer.totalSpent >= 500 || customer.totalOrders >= 20) {
      return { segment: 'vip', label: 'VIP', cssClass: 'segment-vip', description: 'High-value customer' };
    }
    if (daysSinceOrder > 90) {
      return { segment: 'dormant', label: 'Dormant', cssClass: 'segment-dormant', description: 'No orders in 90+ days' };
    }
    if (daysSinceOrder > 30 && customer.totalOrders >= 3) {
      return { segment: 'at-risk', label: 'At Risk', cssClass: 'segment-at-risk', description: 'Previously active, fading' };
    }
    if (customer.totalOrders <= 2) {
      return { segment: 'new', label: 'New', cssClass: 'segment-new', description: 'Recent first-time customer' };
    }
    return { segment: 'regular', label: 'Regular', cssClass: 'segment-regular', description: 'Active customer' };
  }

  // --- Customer Portal (public, unauthenticated) ---

  async sendOtp(phone: string, restaurantSlug: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/public/merchant/${restaurantSlug}/customers/otp/send`, { phone })
      );
      return true;
    } catch {
      return false;
    }
  }

  async verifyOtp(phone: string, code: string, restaurantSlug: string): Promise<Customer | null> {
    try {
      return await firstValueFrom(
        this.http.post<Customer>(
          `${this.apiUrl}/public/merchant/${restaurantSlug}/customers/otp/verify`,
          { phone, code }
        )
      );
    } catch {
      return null;
    }
  }

  async getCustomerOrders(customerId: string): Promise<unknown[]> {
    if (!this.merchantId) return [];

    try {
      const data = await firstValueFrom(
        this.http.get<unknown[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/${customerId}/orders`
        )
      );
      return data ?? [];
    } catch {
      return [];
    }
  }

  async updateCustomerProfile(customerId: string, updates: { firstName?: string; lastName?: string; email?: string | null }): Promise<Customer | null> {
    if (!this.merchantId) return null;

    try {
      const updated = await firstValueFrom(
        this.http.patch<Customer>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/${customerId}`,
          updates
        )
      );
      this._customers.update(list =>
        list.map(c => c.id === customerId ? updated : c)
      );
      return updated;
    } catch {
      return null;
    }
  }

  // === Smart Customer Groups (Phase 3) ===

  async loadSmartGroups(): Promise<void> {
    if (!this.merchantId) return;
    this._isLoadingGroups.set(true);
    try {
      const groups = await firstValueFrom(
        this.http.get<SmartGroup[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/smart-groups`
        )
      );
      this._smartGroups.set(groups ?? []);
    } catch {
      this._smartGroups.set([]);
    } finally {
      this._isLoadingGroups.set(false);
    }
  }

  async createSmartGroup(data: SmartGroupFormData): Promise<SmartGroup | null> {
    if (!this.merchantId) return null;
    try {
      const group = await firstValueFrom(
        this.http.post<SmartGroup>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/smart-groups`,
          data
        )
      );
      this._smartGroups.update(list => [...list, group]);
      return group;
    } catch {
      return null;
    }
  }

  async updateSmartGroup(groupId: string, data: SmartGroupFormData): Promise<boolean> {
    if (!this.merchantId) return false;
    try {
      const updated = await firstValueFrom(
        this.http.patch<SmartGroup>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/smart-groups/${groupId}`,
          data
        )
      );
      this._smartGroups.update(list => list.map(g => g.id === groupId ? updated : g));
      return true;
    } catch {
      return false;
    }
  }

  async deleteSmartGroup(groupId: string): Promise<boolean> {
    if (!this.merchantId) return false;
    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/smart-groups/${groupId}`
        )
      );
      this._smartGroups.update(list => list.filter(g => g.id !== groupId));
      return true;
    } catch {
      return false;
    }
  }

  async refreshSmartGroupCounts(): Promise<void> {
    if (!this.merchantId) return;
    try {
      const groups = await firstValueFrom(
        this.http.post<SmartGroup[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/smart-groups/refresh`,
          {}
        )
      );
      if (groups) {
        this._smartGroups.set(groups);
      }
    } catch {
      // Silent — counts stay stale
    }
  }

  // === Unified Messaging Inbox (Phase 3) ===

  async loadMessageThreads(): Promise<void> {
    if (!this.merchantId) return;
    this._isLoadingThreads.set(true);
    try {
      const threads = await firstValueFrom(
        this.http.get<MessageThread[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/messages/threads`
        )
      );
      this._threads.set(threads ?? []);
    } catch {
      this._threads.set([]);
    } finally {
      this._isLoadingThreads.set(false);
    }
  }

  async sendMessage(customerId: string, body: string, channel: 'sms' | 'email'): Promise<CustomerMessage | null> {
    if (!this.merchantId) return null;
    try {
      const message = await firstValueFrom(
        this.http.post<CustomerMessage>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/${customerId}/messages`,
          { body, channel }
        )
      );
      this._threads.update(threads =>
        threads.map(t => t.customerId === customerId
          ? { ...t, messages: [...t.messages, message], lastMessageAt: message.createdAt }
          : t
        )
      );
      return message;
    } catch {
      return null;
    }
  }

  async markThreadRead(customerId: string): Promise<void> {
    if (!this.merchantId) return;
    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/${customerId}/messages/read`,
          {}
        )
      );
      this._threads.update(threads =>
        threads.map(t => t.customerId === customerId
          ? { ...t, unreadCount: 0, messages: t.messages.map(m => ({ ...m, isRead: true })) }
          : t
        )
      );
    } catch {
      // Silent
    }
  }

  async loadMessageTemplates(): Promise<void> {
    if (!this.merchantId) return;
    try {
      const templates = await firstValueFrom(
        this.http.get<MessageTemplate[]>(
          `${this.apiUrl}/merchant/${this.merchantId}/customers/messages/templates`
        )
      );
      this._templates.set(templates ?? []);
    } catch {
      this._templates.set([]);
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
