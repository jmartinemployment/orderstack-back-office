import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { VendorService } from '../../../services/vendor';
import type { Vendor, VendorFormData } from '../../../models/vendor.model';

@Component({
  selector: 'os-retail-vendor-management',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vendor-management.html',
  styleUrl: './vendor-management.scss',
})
export class RetailVendorManagement implements OnInit {
  private readonly vendorService = inject(VendorService);

  readonly vendors = this.vendorService.vendors;
  readonly isLoading = this.vendorService.isLoading;
  readonly error = this.vendorService.error;

  readonly searchQuery = signal('');
  readonly showVendorModal = signal(false);
  readonly editingVendorId = signal<string | null>(null);
  readonly showDetailVendorId = signal<string | null>(null);

  // Form
  readonly formName = signal('');
  readonly formContactName = signal('');
  readonly formEmail = signal('');
  readonly formPhone = signal('');
  readonly formAddress = signal('');
  readonly formPaymentTerms = signal('');
  readonly formLeadTimeDays = signal(0);
  readonly formNotes = signal('');

  readonly filteredVendors = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const list = this.vendors();
    if (!query) return list;
    return list.filter(v =>
      v.name.toLowerCase().includes(query) ||
      (v.contactName?.toLowerCase().includes(query)) ||
      (v.email?.toLowerCase().includes(query))
    );
  });

  readonly activeVendorCount = computed(() =>
    this.vendors().filter(v => v.isActive).length
  );

  readonly detailVendor = computed(() => {
    const id = this.showDetailVendorId();
    if (!id) return null;
    return this.vendors().find(v => v.id === id) ?? null;
  });

  ngOnInit(): void {
    this.vendorService.loadVendors();
  }

  updateSearch(value: string): void {
    this.searchQuery.set(value);
  }

  openCreateVendor(): void {
    this.editingVendorId.set(null);
    this.resetForm();
    this.showVendorModal.set(true);
  }

  openEditVendor(vendor: Vendor): void {
    this.editingVendorId.set(vendor.id);
    this.formName.set(vendor.name);
    this.formContactName.set(vendor.contactName ?? '');
    this.formEmail.set(vendor.email ?? '');
    this.formPhone.set(vendor.phone ?? '');
    this.formAddress.set(vendor.address ?? '');
    this.formPaymentTerms.set(vendor.paymentTerms ?? '');
    this.formLeadTimeDays.set(vendor.leadTimeDays ?? 0);
    this.formNotes.set(vendor.notes ?? '');
    this.showVendorModal.set(true);
  }

  closeVendorModal(): void {
    this.showVendorModal.set(false);
  }

  private resetForm(): void {
    this.formName.set('');
    this.formContactName.set('');
    this.formEmail.set('');
    this.formPhone.set('');
    this.formAddress.set('');
    this.formPaymentTerms.set('');
    this.formLeadTimeDays.set(0);
    this.formNotes.set('');
  }

  updateFormName(value: string): void { this.formName.set(value); }
  updateFormContact(value: string): void { this.formContactName.set(value); }
  updateFormEmail(value: string): void { this.formEmail.set(value); }
  updateFormPhone(value: string): void { this.formPhone.set(value); }
  updateFormAddress(value: string): void { this.formAddress.set(value); }
  updateFormTerms(value: string): void { this.formPaymentTerms.set(value); }
  updateFormLeadTime(value: string): void { this.formLeadTimeDays.set(Number.parseInt(value, 10) || 0); }
  updateFormNotes(value: string): void { this.formNotes.set(value); }

  async saveVendor(): Promise<void> {
    const formData: VendorFormData = {
      name: this.formName(),
      contactName: this.formContactName() || null,
      email: this.formEmail() || null,
      phone: this.formPhone() || null,
      address: this.formAddress() || null,
      paymentTerms: this.formPaymentTerms() || null,
      leadTimeDays: this.formLeadTimeDays() || null,
      notes: this.formNotes() || null,
    };

    const editId = this.editingVendorId();
    if (editId) {
      await this.vendorService.updateVendor(editId, formData);
    } else {
      await this.vendorService.createVendor(formData);
    }
    this.showVendorModal.set(false);
  }

  async toggleVendorActive(vendor: Vendor): Promise<void> {
    await this.vendorService.updateVendor(vendor.id, { isActive: !vendor.isActive });
  }

  async deleteVendor(vendorId: string): Promise<void> {
    await this.vendorService.deleteVendor(vendorId);
    if (this.showDetailVendorId() === vendorId) {
      this.showDetailVendorId.set(null);
    }
  }

  openVendorDetail(vendorId: string): void {
    this.showDetailVendorId.set(vendorId);
  }

  closeVendorDetail(): void {
    this.showDetailVendorId.set(null);
  }
}
