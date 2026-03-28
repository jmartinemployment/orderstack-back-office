import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { CustomerService } from '../../../services/customer';
import { LoyaltyService } from '../../../services/loyalty';
import { GiftCardService } from '../../../services/gift-card';
import { BookingService } from '../../../services/booking';
import {
  Customer, SavedAddress, FeedbackRequest, Order, LoyaltyProfile,
  LoyaltyTransaction, LoyaltyReward, Booking, getTierLabel, getTierColor,
} from '../../../models/index';

type PortalTab = 'orders' | 'loyalty' | 'profile' | 'gift-cards' | 'reservations' | 'feedback';
type AuthState = 'phone' | 'otp' | 'authenticated';

@Component({
  selector: 'os-customer-portal',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './customer-portal.html',
  styleUrl: './customer-portal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerPortal {
  private readonly route = inject(ActivatedRoute);
  private readonly customerService = inject(CustomerService);
  private readonly loyaltyService = inject(LoyaltyService);
  private readonly giftCardService = inject(GiftCardService);
  private readonly bookingService = inject(BookingService);

  // Auth state
  private readonly _authState = signal<AuthState>('phone');
  private readonly _phone = signal('');
  private readonly _otpCode = signal('');
  private readonly _otpError = signal<string | null>(null);
  private readonly _isSendingOtp = signal(false);
  private readonly _isVerifyingOtp = signal(false);

  // Customer data
  private readonly _customer = signal<Customer | null>(null);
  private readonly _orders = signal<Order[]>([]);
  private readonly _loyaltyProfile = signal<LoyaltyProfile | null>(null);
  private readonly _loyaltyTransactions = signal<LoyaltyTransaction[]>([]);
  private readonly _availableRewards = signal<LoyaltyReward[]>([]);
  private readonly _feedback = signal<FeedbackRequest[]>([]);
  private readonly _reservations = signal<Booking[]>([]);
  private readonly _activeTab = signal<PortalTab>('orders');
  private readonly _isLoading = signal(false);

  // Gift card balance check
  private readonly _gcCode = signal('');
  private readonly _gcBalance = signal<{ balance: number; status: string } | null>(null);
  private readonly _isCheckingGc = signal(false);

  // Profile edit
  private readonly _isEditingProfile = signal(false);
  private readonly _editFirstName = signal('');
  private readonly _editLastName = signal('');
  private readonly _editEmail = signal('');
  private readonly _editBirthday = signal('');
  private readonly _isSavingProfile = signal(false);

  // Public readonly
  readonly authState = this._authState.asReadonly();
  readonly phone = this._phone.asReadonly();
  readonly otpCode = this._otpCode.asReadonly();
  readonly otpError = this._otpError.asReadonly();
  readonly isSendingOtp = this._isSendingOtp.asReadonly();
  readonly isVerifyingOtp = this._isVerifyingOtp.asReadonly();
  readonly customer = this._customer.asReadonly();
  readonly orders = this._orders.asReadonly();
  readonly loyaltyProfile = this._loyaltyProfile.asReadonly();
  readonly loyaltyTransactions = this._loyaltyTransactions.asReadonly();
  readonly availableRewards = this._availableRewards.asReadonly();
  readonly feedback = this._feedback.asReadonly();
  readonly reservations = this._reservations.asReadonly();
  readonly activeTab = this._activeTab.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly gcCode = this._gcCode.asReadonly();
  readonly gcBalance = this._gcBalance.asReadonly();
  readonly isCheckingGc = this._isCheckingGc.asReadonly();
  readonly isEditingProfile = this._isEditingProfile.asReadonly();
  readonly editFirstName = this._editFirstName.asReadonly();
  readonly editLastName = this._editLastName.asReadonly();
  readonly editEmail = this._editEmail.asReadonly();
  readonly editBirthday = this._editBirthday.asReadonly();
  readonly isSavingProfile = this._isSavingProfile.asReadonly();

  readonly restaurantSlug = this.route.snapshot.paramMap.get('restaurantSlug') ?? '';

  readonly customerName = computed(() => {
    const c = this._customer();
    if (!c) return '';
    return [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Guest';
  });

  readonly tierLabel = computed(() => {
    const profile = this._loyaltyProfile();
    return profile ? getTierLabel(profile.tier) : '';
  });

  readonly tierColor = computed(() => {
    const profile = this._loyaltyProfile();
    return profile ? getTierColor(profile.tier) : '#6c757d';
  });

  readonly upcomingReservations = computed(() =>
    this._reservations().filter(r => r.status === 'confirmed' || r.status === 'pending')
  );

  readonly recentOrders = computed(() =>
    this._orders().slice(0, 20)
  );

  // --- Auth ---

  onPhoneInput(event: Event): void {
    this._phone.set((event.target as HTMLInputElement).value);
    this._otpError.set(null);
  }

  onOtpInput(event: Event): void {
    this._otpCode.set((event.target as HTMLInputElement).value);
    this._otpError.set(null);
  }

  async sendOtp(): Promise<void> {
    const phone = this._phone().trim();
    if (!phone || this._isSendingOtp()) return;

    this._isSendingOtp.set(true);
    this._otpError.set(null);

    const success = await this.customerService.sendOtp(phone, this.restaurantSlug);
    this._isSendingOtp.set(false);

    if (success) {
      this._authState.set('otp');
    } else {
      this._otpError.set('Could not send verification code. Please check your phone number.');
    }
  }

  async verifyOtp(): Promise<void> {
    const code = this._otpCode().trim();
    if (!code || this._isVerifyingOtp()) return;

    this._isVerifyingOtp.set(true);
    this._otpError.set(null);

    const customer = await this.customerService.verifyOtp(this._phone().trim(), code, this.restaurantSlug);
    this._isVerifyingOtp.set(false);

    if (customer) {
      this._customer.set(customer);
      this._authState.set('authenticated');
      this.loadAllData();
    } else {
      this._otpError.set('Invalid code. Please try again.');
    }
  }

  backToPhone(): void {
    this._authState.set('phone');
    this._otpCode.set('');
    this._otpError.set(null);
  }

  logout(): void {
    this._authState.set('phone');
    this._phone.set('');
    this._otpCode.set('');
    this._customer.set(null);
    this._orders.set([]);
    this._loyaltyProfile.set(null);
    this._loyaltyTransactions.set([]);
    this._availableRewards.set([]);
    this._feedback.set([]);
    this._reservations.set([]);
    this._activeTab.set('orders');
  }

  // --- Data Loading ---

  private async loadAllData(): Promise<void> {
    const customerId = this._customer()?.id;
    if (!customerId) return;

    this._isLoading.set(true);

    await Promise.all([
      this.loadLoyalty(customerId),
      this.loadFeedback(customerId),
      this.loadBookings(customerId),
      this.loadAddresses(customerId),
    ]);

    this._isLoading.set(false);
  }

  private async loadLoyalty(customerId: string): Promise<void> {
    const profile = await this.loyaltyService.getCustomerLoyalty(customerId);
    if (profile) this._loyaltyProfile.set(profile);

    const transactions = await this.loyaltyService.getPointsHistory(customerId);
    this._loyaltyTransactions.set(transactions);

    const rewards = await this.loyaltyService.getAvailableRewards(customerId);
    this._availableRewards.set(rewards);
  }

  private async loadFeedback(customerId: string): Promise<void> {
    await this.customerService.loadFeedback();
    const allFeedback = this.customerService.feedback();
    this._feedback.set(allFeedback.filter(f => f.customerId === customerId));
  }

  private async loadBookings(customerId: string): Promise<void> {
    const reservations = await this.bookingService.getCustomerBookings(customerId);
    this._reservations.set(reservations);
  }

  private async loadAddresses(customerId: string): Promise<void> {
    await this.customerService.loadSavedAddresses(customerId);
  }

  // --- Tabs ---

  setTab(tab: PortalTab): void {
    this._activeTab.set(tab);
  }

  // --- Orders ---

  getOrderTotal(order: Order): number {
    return order.totalAmount ?? 0;
  }

  getOrderItemCount(order: Order): number {
    return order.checks?.reduce((sum, c) => sum + (c.selections?.length ?? 0), 0) ?? 0;
  }

  // --- Gift Card ---

  onGcCodeInput(event: Event): void {
    this._gcCode.set((event.target as HTMLInputElement).value);
    this._gcBalance.set(null);
  }

  async checkGcBalance(): Promise<void> {
    const code = this._gcCode().trim();
    if (!code || this._isCheckingGc()) return;

    this._isCheckingGc.set(true);
    const result = await this.giftCardService.checkBalance(code);
    this._isCheckingGc.set(false);

    if (result) {
      this._gcBalance.set({ balance: result.currentBalance, status: result.status });
    }
  }

  // --- Profile ---

  startEditProfile(): void {
    const c = this._customer();
    if (!c) return;
    this._editFirstName.set(c.firstName ?? '');
    this._editLastName.set(c.lastName ?? '');
    this._editEmail.set(c.email ?? '');
    this._editBirthday.set('');
    this._isEditingProfile.set(true);
  }

  cancelEditProfile(): void {
    this._isEditingProfile.set(false);
  }

  onProfileField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    switch (field) {
      case 'firstName': this._editFirstName.set(value); break;
      case 'lastName': this._editLastName.set(value); break;
      case 'email': this._editEmail.set(value); break;
      case 'birthday': this._editBirthday.set(value); break;
    }
  }

  async saveProfile(): Promise<void> {
    const c = this._customer();
    if (!c || this._isSavingProfile()) return;

    this._isSavingProfile.set(true);

    const updated = await this.customerService.updateCustomerProfile(c.id, {
      firstName: this._editFirstName().trim(),
      lastName: this._editLastName().trim(),
      email: this._editEmail().trim() || null,
    });

    this._isSavingProfile.set(false);

    if (updated) {
      this._customer.set(updated);
      this._isEditingProfile.set(false);
    }
  }

  // --- Helpers ---

  savedAddresses(): readonly SavedAddress[] {
    return this.customerService.savedAddresses();
  }

  getStarArray(rating: number | null = 0): boolean[] {
    const r = rating ?? 0;
    return Array.from({ length: 5 }, (_, i) => i < r);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed': case 'active': return 'bg-success';
      case 'pending': return 'bg-warning text-dark';
      case 'cancelled': case 'no_show': return 'bg-danger';
      case 'completed': case 'seated': return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  formatTransactionType(type: string): string {
    switch (type) {
      case 'earn': return 'Earned';
      case 'redeem': return 'Redeemed';
      case 'adjust': return 'Adjusted';
      case 'expire': return 'Expired';
      default: return type;
    }
  }

  getTransactionSign(type: string): string {
    return type === 'earn' || type === 'adjust' ? '+' : '-';
  }

  getTransactionClass(type: string): string {
    return type === 'earn' || type === 'adjust' ? 'text-success' : 'text-danger';
  }
}
