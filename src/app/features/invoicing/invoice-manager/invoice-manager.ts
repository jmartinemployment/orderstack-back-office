import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { InvoiceService } from '../../../services/invoice';
import { AuthService } from '../../../services/auth';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import {
  Invoice,
  InvoiceFormData,
  InvoiceLineItem,
  InvoiceStatus,
  InvoiceTab,
  HouseAccount,
  HouseAccountFormData,
} from '../../../models/index';

@Component({
  selector: 'os-invoice-manager',
  imports: [CurrencyPipe, DatePipe, TitleCasePipe, LoadingSpinner],
  templateUrl: './invoice-manager.html',
  styleUrl: './invoice-manager.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceManager {
  private readonly invoiceService = inject(InvoiceService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly isLoading = this.invoiceService.isLoading;
  readonly error = this.invoiceService.error;
  readonly invoices = this.invoiceService.invoices;
  readonly houseAccounts = this.invoiceService.houseAccounts;
  readonly activeHouseAccounts = this.invoiceService.activeHouseAccounts;
  readonly overdueInvoices = this.invoiceService.overdueInvoices;
  readonly totalOutstanding = this.invoiceService.totalOutstanding;
  readonly totalCollected = this.invoiceService.totalCollected;

  private readonly _activeTab = signal<InvoiceTab>('invoices');
  private readonly _statusFilter = signal<InvoiceStatus | 'all'>('all');
  private readonly _showInvoiceForm = signal(false);
  private readonly _showAccountForm = signal(false);
  private readonly _selectedInvoice = signal<Invoice | null>(null);
  private readonly _isSaving = signal(false);
  private readonly _showPaymentForm = signal(false);
  private readonly _paymentAmount = signal(0);

  // Invoice form
  private readonly _formName = signal('');
  private readonly _formEmail = signal('');
  private readonly _formPhone = signal('');
  private readonly _formCompany = signal('');
  private readonly _formNotes = signal('');
  private readonly _formDueDate = signal('');
  private readonly _formTaxRate = signal(8.25);
  private readonly _formDeposit = signal(0);
  private readonly _formIsHouseAccount = signal(false);
  private readonly _formLineItems = signal<Omit<InvoiceLineItem, 'id'>[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 },
  ]);

  // House account form
  private readonly _haCompany = signal('');
  private readonly _haContact = signal('');
  private readonly _haEmail = signal('');
  private readonly _haPhone = signal('');
  private readonly _haCycle = signal<'weekly' | 'biweekly' | 'monthly'>('monthly');
  private readonly _haLimit = signal(5000);

  readonly activeTab = this._activeTab.asReadonly();
  readonly statusFilter = this._statusFilter.asReadonly();
  readonly showInvoiceForm = this._showInvoiceForm.asReadonly();
  readonly showAccountForm = this._showAccountForm.asReadonly();
  readonly selectedInvoice = this._selectedInvoice.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly showPaymentForm = this._showPaymentForm.asReadonly();
  readonly paymentAmount = this._paymentAmount.asReadonly();

  readonly formName = this._formName.asReadonly();
  readonly formEmail = this._formEmail.asReadonly();
  readonly formPhone = this._formPhone.asReadonly();
  readonly formCompany = this._formCompany.asReadonly();
  readonly formNotes = this._formNotes.asReadonly();
  readonly formDueDate = this._formDueDate.asReadonly();
  readonly formTaxRate = this._formTaxRate.asReadonly();
  readonly formDeposit = this._formDeposit.asReadonly();
  readonly formIsHouseAccount = this._formIsHouseAccount.asReadonly();
  readonly formLineItems = this._formLineItems.asReadonly();

  readonly haCompany = this._haCompany.asReadonly();
  readonly haContact = this._haContact.asReadonly();
  readonly haEmail = this._haEmail.asReadonly();
  readonly haPhone = this._haPhone.asReadonly();
  readonly haCycle = this._haCycle.asReadonly();
  readonly haLimit = this._haLimit.asReadonly();

  readonly formSubtotal = computed(() =>
    this._formLineItems().reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  );

  readonly formTaxAmount = computed(() =>
    Math.round(this.formSubtotal() * (this._formTaxRate() / 100) * 100) / 100
  );

  readonly formTotal = computed(() =>
    this.formSubtotal() + this.formTaxAmount()
  );

  readonly filteredInvoices = computed(() => {
    const filter = this._statusFilter();
    if (filter === 'all') return this.invoices();
    return this.invoices().filter(i => i.status === filter);
  });

  readonly canSaveInvoice = computed(() => {
    const name = this._formName().trim();
    const email = this._formEmail().trim();
    const dueDate = this._formDueDate();
    const items = this._formLineItems();
    const hasValidItems = items.some(i => i.description.trim() && i.unitPrice > 0);
    return !!name && !!email && !!dueDate && hasValidItems;
  });

  readonly canSaveAccount = computed(() =>
    !!this._haCompany().trim() && !!this._haContact().trim() && !!this._haEmail().trim()
  );

  constructor() {
    effect(() => {
      if (this.isAuthenticated()) {
        this.invoiceService.loadInvoices();
        this.invoiceService.loadHouseAccounts();
      }
    });
  }

  setTab(tab: InvoiceTab): void {
    this._activeTab.set(tab);
  }

  setStatusFilter(status: InvoiceStatus | 'all'): void {
    this._statusFilter.set(status);
  }

  // Invoice form
  openInvoiceForm(): void {
    this.resetInvoiceForm();
    this._showInvoiceForm.set(true);
  }

  closeInvoiceForm(): void {
    this._showInvoiceForm.set(false);
  }

  selectInvoice(invoice: Invoice): void {
    this._selectedInvoice.set(invoice);
  }

  closeDetail(): void {
    this._selectedInvoice.set(null);
    this._showPaymentForm.set(false);
  }

  onInvoiceField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    switch (field) {
      case 'name': this._formName.set(value); break;
      case 'email': this._formEmail.set(value); break;
      case 'phone': this._formPhone.set(value); break;
      case 'company': this._formCompany.set(value); break;
      case 'notes': this._formNotes.set(value); break;
      case 'dueDate': this._formDueDate.set(value); break;
      case 'taxRate': this._formTaxRate.set(Number.parseFloat(value) || 0); break;
      case 'deposit': this._formDeposit.set(Number.parseFloat(value) || 0); break;
    }
  }

  toggleHouseAccount(): void {
    this._formIsHouseAccount.update(v => !v);
  }

  addLineItem(): void {
    this._formLineItems.update(items => [
      ...items,
      { description: '', quantity: 1, unitPrice: 0, total: 0 },
    ]);
  }

  removeLineItem(index: number): void {
    this._formLineItems.update(items => items.filter((_, i) => i !== index));
  }

  onLineItemField(index: number, field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this._formLineItems.update(items => {
      const updated = [...items];
      const item = { ...updated[index] };
      if (field === 'description') item.description = value;
      if (field === 'quantity') item.quantity = Number.parseInt(value, 10) || 1;
      if (field === 'unitPrice') item.unitPrice = Number.parseFloat(value) || 0;
      item.total = item.quantity * item.unitPrice;
      updated[index] = item;
      return updated;
    });
  }

  async saveInvoice(): Promise<void> {
    if (!this.canSaveInvoice() || this._isSaving()) return;
    this._isSaving.set(true);
    try {
      const data: InvoiceFormData = {
        customerName: this._formName().trim(),
        customerEmail: this._formEmail().trim(),
        customerPhone: this._formPhone().trim() || undefined,
        companyName: this._formCompany().trim() || undefined,
        lineItems: this._formLineItems().filter(i => i.description.trim() && i.unitPrice > 0),
        taxRate: this._formTaxRate(),
        depositRequired: this._formDeposit() || undefined,
        notes: this._formNotes().trim() || undefined,
        dueDate: this._formDueDate(),
        isHouseAccount: this._formIsHouseAccount(),
      };
      await this.invoiceService.createInvoice(data);
      this.closeInvoiceForm();
    } finally {
      this._isSaving.set(false);
    }
  }

  async sendInvoice(invoice: Invoice): Promise<void> {
    await this.invoiceService.sendInvoice(invoice.id);
  }

  async cancelInvoice(invoice: Invoice): Promise<void> {
    await this.invoiceService.cancelInvoice(invoice.id);
    this._selectedInvoice.set(null);
  }

  openPaymentForm(): void {
    const invoice = this._selectedInvoice();
    if (invoice) {
      this._paymentAmount.set(invoice.amountDue);
      this._showPaymentForm.set(true);
    }
  }

  onPaymentAmountInput(event: Event): void {
    this._paymentAmount.set(Number.parseFloat((event.target as HTMLInputElement).value) || 0);
  }

  async recordPayment(): Promise<void> {
    const invoice = this._selectedInvoice();
    if (!invoice || this._paymentAmount() <= 0) return;
    await this.invoiceService.recordPayment(invoice.id, this._paymentAmount());
    this._showPaymentForm.set(false);
    // Refresh the selected invoice
    const updated = this.invoices().find(i => i.id === invoice.id);
    if (updated) this._selectedInvoice.set(updated);
  }

  // House account form
  openAccountForm(): void {
    this.resetAccountForm();
    this._showAccountForm.set(true);
  }

  closeAccountForm(): void {
    this._showAccountForm.set(false);
  }

  onAccountField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    switch (field) {
      case 'company': this._haCompany.set(value); break;
      case 'contact': this._haContact.set(value); break;
      case 'email': this._haEmail.set(value); break;
      case 'phone': this._haPhone.set(value); break;
      case 'cycle': this._haCycle.set(value as 'weekly' | 'biweekly' | 'monthly'); break;
      case 'limit': this._haLimit.set(Number.parseFloat(value) || 0); break;
    }
  }

  async saveHouseAccount(): Promise<void> {
    if (!this.canSaveAccount() || this._isSaving()) return;
    this._isSaving.set(true);
    try {
      const data: HouseAccountFormData = {
        companyName: this._haCompany().trim(),
        contactName: this._haContact().trim(),
        contactEmail: this._haEmail().trim(),
        contactPhone: this._haPhone().trim() || undefined,
        billingCycle: this._haCycle(),
        creditLimit: this._haLimit(),
      };
      await this.invoiceService.createHouseAccount(data);
      this.closeAccountForm();
    } finally {
      this._isSaving.set(false);
    }
  }

  getBalancePercent(account: HouseAccount): number {
    return Math.min(100, (account.currentBalance / account.creditLimit) * 100);
  }

  getStatusClass(status: InvoiceStatus): string {
    switch (status) {
      case 'draft': return 'bg-secondary';
      case 'sent': return 'bg-info';
      case 'viewed': return 'bg-primary';
      case 'paid': return 'bg-success';
      case 'overdue': return 'bg-danger';
      case 'cancelled': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  }

  private resetInvoiceForm(): void {
    this._formName.set('');
    this._formEmail.set('');
    this._formPhone.set('');
    this._formCompany.set('');
    this._formNotes.set('');
    this._formDueDate.set('');
    this._formTaxRate.set(8.25);
    this._formDeposit.set(0);
    this._formIsHouseAccount.set(false);
    this._formLineItems.set([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  }

  private resetAccountForm(): void {
    this._haCompany.set('');
    this._haContact.set('');
    this._haEmail.set('');
    this._haPhone.set('');
    this._haCycle.set('monthly');
    this._haLimit.set(5000);
  }
}
