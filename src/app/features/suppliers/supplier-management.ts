import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { VendorService } from '../../services/vendor';
import { ChatService } from '../../services/chat';
import { PlatformService } from '../../services/platform';
import { SupplierOrderingService } from '../../services/supplier-ordering';
import type { Vendor, VendorFormData, SupplierProviderType } from '../../models/vendor.model';
import type { BusinessVertical } from '../../models/index';

interface KnownSupplier {
  name: string;
  category: string;
  description: string;
  website: string;
  apiPortal: string | null;
  apiProvider: SupplierProviderType | null;
  icon: string;
  verticals: BusinessVertical[];
}

interface ApiDiscoveryResult {
  supplierName: string;
  hasApi: boolean;
  provider: SupplierProviderType | null;
  apiPortalUrl: string | null;
  summary: string;
}

const KNOWN_SUPPLIERS: KnownSupplier[] = [
  {
    name: 'Sysco',
    category: 'Broadline Distributor',
    description: 'Full-service restaurant supply — produce, protein, dry goods, equipment',
    website: 'https://www.sysco.com/products/products/product-categories',
    apiPortal: 'https://apic-devportal.sysco.com',
    apiProvider: 'sysco',
    icon: 'bi-box-seam',
    verticals: ['food_and_drink'],
  },
  {
    name: 'US Foods',
    category: 'Broadline Distributor',
    description: 'National food distribution — fresh, frozen, dry goods, smallwares',
    website: 'https://www.usfoods.com',
    apiPortal: null,
    apiProvider: null,
    icon: 'bi-box-seam',
    verticals: ['food_and_drink'],
  },
  {
    name: 'Performance Food Group',
    category: 'Broadline Distributor',
    description: 'Foodservice distribution covering all categories',
    website: 'https://www.pfgc.com',
    apiPortal: null,
    apiProvider: null,
    icon: 'bi-box-seam',
    verticals: ['food_and_drink'],
  },
  {
    name: 'Restaurant Depot',
    category: 'Cash & Carry',
    description: 'Wholesale cash-and-carry for restaurant supplies',
    website: 'https://www.restaurantdepot.com',
    apiPortal: null,
    apiProvider: null,
    icon: 'bi-shop',
    verticals: ['food_and_drink'],
  },
  {
    name: 'Gordon Food Service',
    category: 'Broadline Distributor',
    description: 'North American foodservice distribution for independent restaurants',
    website: 'https://www.gfs.com',
    apiPortal: 'https://developer.gfs.com',
    apiProvider: 'gfs',
    icon: 'bi-box-seam',
    verticals: ['food_and_drink'],
  },
  {
    name: 'Ben E. Keith',
    category: 'Regional Distributor',
    description: 'Southwest regional food and beverage distribution',
    website: 'https://www.benekeith.com',
    apiPortal: null,
    apiProvider: null,
    icon: 'bi-box-seam',
    verticals: ['food_and_drink'],
  },
  {
    name: 'Dot Foods',
    category: 'Redistribution',
    description: 'Largest food industry redistributor — connects manufacturers to distributors',
    website: 'https://www.dotfoods.com',
    apiPortal: null,
    apiProvider: null,
    icon: 'bi-diagram-3',
    verticals: ['food_and_drink'],
  },
  {
    name: 'WebstaurantStore',
    category: 'Equipment & Supplies',
    description: 'Online restaurant equipment, supplies, and smallwares',
    website: 'https://www.webstaurantstore.com',
    apiPortal: null,
    apiProvider: null,
    icon: 'bi-cart3',
    verticals: ['food_and_drink'],
  },
  {
    name: 'Costco Business Center',
    category: 'Cash & Carry',
    description: 'Bulk purchasing for food, beverages, and business supplies',
    website: 'https://www.costcobusinessdelivery.com',
    apiPortal: null,
    apiProvider: null,
    icon: 'bi-shop',
    verticals: ['food_and_drink', 'retail'],
  },
  {
    name: "Sam's Club",
    category: 'Cash & Carry',
    description: 'Wholesale club for bulk food, beverages, and business supplies',
    website: 'https://www.samsclub.com',
    apiPortal: null,
    apiProvider: null,
    icon: 'bi-shop',
    verticals: ['food_and_drink', 'retail'],
  },
];

@Component({
  selector: 'os-supplier-management',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './supplier-management.html',
  styleUrl: './supplier-management.scss',
})
export class SupplierManagement implements OnInit {
  private readonly vendorService = inject(VendorService);
  private readonly chatService = inject(ChatService);
  private readonly platform = inject(PlatformService);
  private readonly supplierOrdering = inject(SupplierOrderingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly vendors = this.vendorService.vendors;
  readonly isLoading = this.vendorService.isLoading;
  readonly error = this.vendorService.error;
  readonly credentialSummary = this.supplierOrdering.credentialSummary;

  readonly searchQuery = signal('');
  readonly showVendorModal = signal(false);
  readonly editingVendorId = signal<string | null>(null);
  readonly restockItemName = signal<string | null>(null);

  // AI Assistant
  readonly aiResponse = signal<string | null>(null);
  readonly aiLoading = signal(false);
  readonly showAiPanel = signal(false);

  // AI API Discovery
  readonly apiDiscoveryResult = signal<ApiDiscoveryResult | null>(null);
  readonly apiDiscoveryLoading = signal(false);
  readonly showApiDiscovery = signal(false);

  // Form
  readonly formName = signal('');
  readonly formContactName = signal('');
  readonly formEmail = signal('');
  readonly formPhone = signal('');
  readonly formAddress = signal('');
  readonly formPaymentTerms = signal('');
  readonly formLeadTimeDays = signal(0);
  readonly formNotes = signal('');
  readonly formWebsite = signal('');

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

  readonly connectedSupplierCount = computed(() => {
    const summary = this.credentialSummary();
    if (!summary) return 0;
    let count = 0;
    if (summary.sysco.configured) count++;
    if (summary.gfs.configured) count++;
    return count;
  });

  readonly suggestedSuppliers = computed<KnownSupplier[]>(() => {
    const profile = this.platform.merchantProfile();
    const vertical: BusinessVertical = profile?.primaryVertical ?? 'food_and_drink';
    const existingNames = new Set(this.vendors().map(v => v.name.toLowerCase()));
    return KNOWN_SUPPLIERS
      .filter(s => s.verticals.includes(vertical))
      .filter(s => !existingNames.has(s.name.toLowerCase()));
  });

  ngOnInit(): void {
    this.vendorService.loadVendors();
    this.supplierOrdering.loadCredentialSummary();

    const itemParam = this.route.snapshot.queryParamMap.get('item');
    if (itemParam) {
      this.restockItemName.set(itemParam);
    }
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
    this.formEmail.set(vendor.contactEmail ?? vendor.email ?? '');
    this.formPhone.set(vendor.phone ?? '');
    this.formAddress.set(vendor.address ?? '');
    this.formPaymentTerms.set(vendor.paymentTerms ?? '');
    this.formLeadTimeDays.set(vendor.leadTimeDays ?? 0);
    this.formNotes.set(vendor.notes ?? '');
    this.formWebsite.set(vendor.website ?? '');
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
    this.formWebsite.set('');
  }

  updateFormName(value: string): void { this.formName.set(value); }
  updateFormContact(value: string): void { this.formContactName.set(value); }
  updateFormEmail(value: string): void { this.formEmail.set(value); }
  updateFormPhone(value: string): void { this.formPhone.set(value); }
  updateFormAddress(value: string): void { this.formAddress.set(value); }
  updateFormTerms(value: string): void { this.formPaymentTerms.set(value); }
  updateFormLeadTime(value: string): void { this.formLeadTimeDays.set(Number.parseInt(value, 10) || 0); }
  updateFormNotes(value: string): void { this.formNotes.set(value); }
  updateFormWebsite(value: string): void { this.formWebsite.set(value); }

  async saveVendor(): Promise<void> {
    const formData: VendorFormData = {
      name: this.formName(),
      contactName: this.formContactName() || null,
      contactEmail: this.formEmail() || null,
      phone: this.formPhone() || null,
      address: this.formAddress() || null,
      paymentTerms: this.formPaymentTerms() || null,
      leadTimeDays: this.formLeadTimeDays() || null,
      notes: this.formNotes() || null,
      website: this.formWebsite() || null,
    };

    const isNew = !this.editingVendorId();
    const supplierName = this.formName();

    const editId = this.editingVendorId();
    if (editId) {
      await this.vendorService.updateVendor(editId, formData);
    } else {
      await this.vendorService.createVendor(formData);
    }
    this.showVendorModal.set(false);

    // After creating a new vendor, run AI API discovery
    if (isNew && supplierName) {
      this.discoverSupplierApi(supplierName);
    }
  }

  async toggleVendorActive(vendor: Vendor): Promise<void> {
    await this.vendorService.updateVendor(vendor.id, { isActive: !vendor.isActive });
  }

  async deleteVendor(vendorId: string): Promise<void> {
    await this.vendorService.deleteVendor(vendorId);
  }

  async addKnownSupplier(supplier: KnownSupplier): Promise<void> {
    await this.vendorService.createVendor({
      name: supplier.name,
      notes: supplier.description,
      website: supplier.website,
      apiPortalUrl: supplier.apiPortal,
    });

    // If this known supplier has a supported API, show discovery immediately
    if (supplier.apiProvider) {
      this.apiDiscoveryResult.set({
        supplierName: supplier.name,
        hasApi: true,
        provider: supplier.apiProvider,
        apiPortalUrl: supplier.apiPortal,
        summary: `${supplier.name} offers an ordering API that OrderStack can connect to. Enter your API credentials in Settings to enable automated ordering.`,
      });
      this.showApiDiscovery.set(true);
    }
  }

  isSupplierConnected(supplier: KnownSupplier): boolean {
    if (!supplier.apiProvider) return false;
    return this.supplierOrdering.isProviderConfigured(supplier.apiProvider);
  }

  goToSupplierSettings(): void {
    this.router.navigate(['/app/settings'], { queryParams: { tab: 'suppliers' } });
  }

  dismissRestockBanner(): void {
    this.restockItemName.set(null);
  }

  dismissApiDiscovery(): void {
    this.showApiDiscovery.set(false);
    this.apiDiscoveryResult.set(null);
  }

  // AI API Discovery — checks if a newly added supplier offers an ordering API

  private async discoverSupplierApi(supplierName: string): Promise<void> {
    // Step 1: Check the local known suppliers catalog for an instant match
    const knownMatch = KNOWN_SUPPLIERS.find(
      s => s.name.toLowerCase() === supplierName.toLowerCase()
    );

    if (knownMatch) {
      if (knownMatch.apiProvider) {
        this.apiDiscoveryResult.set({
          supplierName: knownMatch.name,
          hasApi: true,
          provider: knownMatch.apiProvider,
          apiPortalUrl: knownMatch.apiPortal,
          summary: `${knownMatch.name} offers an ordering API that OrderStack supports. Go to Settings > Suppliers to enter your API credentials and enable automated ordering.`,
        });
        this.showApiDiscovery.set(true);
      }
      // Known supplier without API — no notification needed
      return;
    }

    // Step 2: Unknown supplier — ask AI to check if they offer an ordering API
    this.apiDiscoveryLoading.set(true);
    this.showApiDiscovery.set(true);
    this.apiDiscoveryResult.set(null);

    const prompt = `I just added "${supplierName}" as a supplier to my restaurant. Does this company offer a public ordering API or developer portal that could be used for automated inventory ordering? Please respond with:
1. Whether they have a public API (yes/no)
2. If yes, their developer portal URL
3. A one-sentence summary of their API capabilities for restaurant ordering
Keep the response concise — 2-3 sentences maximum.`;

    await this.chatService.sendMessage(prompt);

    const messages = this.chatService.messages();
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    const response = lastAssistant?.content ?? '';

    // Parse the AI response to determine if an API was found
    const hasApiKeywords = /\b(yes|api|developer portal|public api|rest api|ordering api)\b/i;
    const noApiKeywords = /\b(no public api|does not offer|doesn't offer|no known api|no api)\b/i;
    const hasApi = hasApiKeywords.exec(response) !== null && noApiKeywords.exec(response) === null;

    this.apiDiscoveryResult.set({
      supplierName,
      hasApi,
      provider: null, // AI-discovered APIs aren't auto-supported yet
      apiPortalUrl: null,
      summary: response,
    });
    this.apiDiscoveryLoading.set(false);
  }

  // AI Inventory Assistant

  async askAi(prompt: string): Promise<void> {
    this.aiLoading.set(true);
    this.aiResponse.set(null);
    this.showAiPanel.set(true);

    await this.chatService.sendMessage(prompt);

    const messages = this.chatService.messages();
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    this.aiResponse.set(lastAssistant?.content ?? 'No response received.');
    this.aiLoading.set(false);
  }

  generateOrder(): void {
    this.askAi(
      'Based on my current inventory levels and recent usage, generate a recommended purchase order for items that are low or out of stock. Format as a table with item name, current stock, suggested order quantity, and estimated cost.'
    );
  }

  findCheaperSources(): void {
    this.askAi(
      'Analyze my purchase history and suggest alternative suppliers or items where I could reduce costs. Include specific savings estimates where possible.'
    );
  }

  predictWeeklyNeeds(): void {
    this.askAi(
      'Based on my sales data and current stock levels, predict what inventory I\'ll need to order for this week. Include quantities and priority level for each item.'
    );
  }

  closeAiPanel(): void {
    this.showAiPanel.set(false);
    this.aiResponse.set(null);
  }
}
