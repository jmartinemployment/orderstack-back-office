import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { VendorService } from '../../../services/vendor';
import { RecipeCostingService } from '../../../services/recipe-costing';
import { MenuService } from '../../../services/menu';
import {
  FoodCostTab,
  Vendor,
  VendorFormData,
  PurchaseInvoice,
  PurchaseLineItem,
  Recipe,
  RecipeFormData,
  RecipeIngredient,
  PurchaseOrder,
} from '../../../models/index';

@Component({
  selector: 'os-food-cost',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, DatePipe, TitleCasePipe],
  templateUrl: './food-cost-dashboard.html',
  styleUrl: './food-cost-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodCostDashboard implements OnInit {
  private readonly vendorService = inject(VendorService);
  private readonly recipeService = inject(RecipeCostingService);
  private readonly menuService = inject(MenuService);

  readonly activeTab = signal<FoodCostTab>('invoices');
  readonly vendors = this.vendorService.vendors;
  readonly activeVendors = this.vendorService.activeVendors;
  readonly purchaseOrders = this.vendorService.purchaseOrders;
  readonly draftPOCount = this.vendorService.draftPOCount;
  readonly openPOCount = this.vendorService.openPOCount;
  readonly invoices = this.vendorService.invoices;
  readonly pendingInvoiceCount = this.vendorService.pendingInvoiceCount;
  readonly priceHistory = this.vendorService.priceHistory;
  readonly recipes = this.recipeService.recipes;
  readonly foodCostSummary = this.recipeService.foodCostSummary;
  readonly isLoading = computed(() =>
    this.vendorService.isLoading() || this.recipeService.isLoading()
  );
  readonly isUploading = this.vendorService.isUploading;
  readonly error = computed(() =>
    this.vendorService.error() ?? this.recipeService.error()
  );

  // Vendor form
  readonly showVendorForm = signal(false);
  readonly editingVendor = signal<Vendor | null>(null);
  readonly vendorName = signal('');
  readonly vendorContactName = signal('');
  readonly vendorContactEmail = signal('');
  readonly vendorPhone = signal('');
  readonly vendorAddress = signal('');
  readonly vendorNotes = signal('');
  readonly isSavingVendor = signal(false);

  // Invoice form
  readonly showInvoiceForm = signal(false);
  readonly invoiceVendorId = signal('');
  readonly invoiceNumber = signal('');
  readonly invoiceDate = signal('');
  readonly invoiceLineItems = signal<Omit<PurchaseLineItem, 'id' | 'invoiceId'>[]>([]);
  readonly isSavingInvoice = signal(false);

  // Invoice filter
  readonly invoiceStatusFilter = signal<string>('all');
  readonly filteredInvoices = computed(() => {
    const filter = this.invoiceStatusFilter();
    if (filter === 'all') return this.invoices();
    return this.invoices().filter(i => i.status === filter);
  });

  // Invoice detail
  readonly selectedInvoice = signal<PurchaseInvoice | null>(null);

  // Recipe form
  readonly showRecipeForm = signal(false);
  readonly editingRecipe = signal<Recipe | null>(null);
  readonly recipeMenuItemId = signal('');
  readonly recipeName = signal('');
  readonly recipeYieldQty = signal(1);
  readonly recipeYieldUnit = signal('serving');
  readonly recipeIngredients = signal<Omit<RecipeIngredient, 'id' | 'recipeId'>[]>([]);
  readonly isSavingRecipe = signal(false);

  // Recipe detail
  readonly selectedRecipe = signal<Recipe | null>(null);

  // Menu items for recipe linking
  readonly menuItems = computed(() => this.menuService.allItems());

  // Recipe search
  readonly recipeSearch = signal('');
  readonly filteredRecipes = computed(() => {
    const q = this.recipeSearch().toLowerCase();
    if (!q) return this.recipes();
    return this.recipes().filter(r =>
      r.name.toLowerCase().includes(q)
    );
  });

  // PO state
  readonly poStatusFilter = signal<string>('all');
  readonly selectedPo = signal<PurchaseOrder | null>(null);
  readonly showPoForm = signal(false);
  readonly poVendorId = signal('');
  readonly poNotes = signal('');
  readonly isSavingPo = signal(false);

  readonly filteredPurchaseOrders = computed(() => {
    const filter = this.poStatusFilter();
    if (filter === 'all') return this.purchaseOrders();
    return this.purchaseOrders().filter(po => po.status === filter);
  });

  // Food cost report period
  readonly reportDays = signal(30);

  // Vendor detail
  readonly selectedVendor = signal<Vendor | null>(null);

  // KPI computeds
  readonly totalInvoiceValue = computed(() =>
    this.invoices().reduce((sum, i) => sum + i.totalAmount, 0)
  );

  readonly unpaidInvoiceValue = computed(() =>
    this.invoices()
      .filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + i.totalAmount, 0)
  );

  readonly recipeCount = computed(() => this.recipes().length);

  // Menu items without recipes
  readonly uncostedMenuItems = computed(() => {
    const recipedIds = new Set(this.recipes().map(r => r.menuItemId));
    return this.menuItems().filter(m => !recipedIds.has(m.id));
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.vendorService.loadVendors(),
      this.vendorService.loadInvoices(),
      this.vendorService.loadPurchaseOrders(),
      this.recipeService.loadRecipes(),
      this.recipeService.loadFoodCostReport(this.reportDays()),
      this.menuService.loadMenu(),
    ]);
  }

  setTab(tab: FoodCostTab): void {
    this.activeTab.set(tab);
  }

  dismissError(): void {
    this.vendorService.clearError();
    this.recipeService.clearError();
  }

  // ── Vendor Methods ──

  openVendorForm(vendor?: Vendor): void {
    if (vendor) {
      this.editingVendor.set(vendor);
      this.vendorName.set(vendor.name);
      this.vendorContactName.set(vendor.contactName ?? '');
      this.vendorContactEmail.set(vendor.contactEmail ?? '');
      this.vendorPhone.set(vendor.phone ?? '');
      this.vendorAddress.set(vendor.address ?? '');
      this.vendorNotes.set(vendor.notes ?? '');
    } else {
      this.editingVendor.set(null);
      this.vendorName.set('');
      this.vendorContactName.set('');
      this.vendorContactEmail.set('');
      this.vendorPhone.set('');
      this.vendorAddress.set('');
      this.vendorNotes.set('');
    }
    this.showVendorForm.set(true);
  }

  closeVendorForm(): void {
    this.showVendorForm.set(false);
    this.editingVendor.set(null);
  }

  async saveVendor(): Promise<void> {
    if (!this.vendorName()) return;
    this.isSavingVendor.set(true);
    const data: VendorFormData = {
      name: this.vendorName(),
      contactName: this.vendorContactName() || undefined,
      contactEmail: this.vendorContactEmail() || undefined,
      phone: this.vendorPhone() || undefined,
      address: this.vendorAddress() || undefined,
      notes: this.vendorNotes() || undefined,
    };

    const editing = this.editingVendor();
    if (editing) {
      await this.vendorService.updateVendor(editing.id, data);
    } else {
      await this.vendorService.createVendor(data);
    }
    this.isSavingVendor.set(false);
    this.closeVendorForm();
  }

  async toggleVendorActive(vendor: Vendor): Promise<void> {
    await this.vendorService.updateVendor(vendor.id, { isActive: !vendor.isActive });
  }

  async deleteVendor(vendor: Vendor): Promise<void> {
    await this.vendorService.deleteVendor(vendor.id);
    if (this.selectedVendor()?.id === vendor.id) {
      this.selectedVendor.set(null);
    }
  }

  selectVendor(vendor: Vendor): void {
    this.selectedVendor.set(
      this.selectedVendor()?.id === vendor.id ? null : vendor
    );
    if (this.selectedVendor()) {
      this.vendorService.loadPriceHistory();
    }
  }

  getVendorInvoices(vendorId: string): PurchaseInvoice[] {
    return this.invoices().filter(i => i.vendorId === vendorId);
  }

  getVendorPriceHistory(vendorId: string): typeof this.priceHistory extends () => infer R ? R : never {
    return this.priceHistory().filter(p => p.vendorId === vendorId);
  }

  // ── Invoice Methods ──

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await this.vendorService.uploadInvoice(file);
    input.value = '';
  }

  openInvoiceForm(): void {
    this.invoiceVendorId.set('');
    this.invoiceNumber.set('');
    this.invoiceDate.set(new Date().toISOString().split('T')[0]);
    this.invoiceLineItems.set([{
      ingredientName: '',
      quantity: 1,
      unit: 'lb',
      unitCost: 0,
      totalCost: 0,
      normalizedIngredient: null,
    }]);
    this.showInvoiceForm.set(true);
  }

  closeInvoiceForm(): void {
    this.showInvoiceForm.set(false);
  }

  addInvoiceLineItem(): void {
    this.invoiceLineItems.update(items => [...items, {
      ingredientName: '',
      quantity: 1,
      unit: 'lb',
      unitCost: 0,
      totalCost: 0,
      normalizedIngredient: null,
    }]);
  }

  removeInvoiceLineItem(index: number): void {
    this.invoiceLineItems.update(items => items.filter((_, i) => i !== index));
  }

  updateLineItem(index: number, field: string, value: string | number): void {
    this.invoiceLineItems.update(items => {
      const updated = [...items];
      const item = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'unitCost') {
        item.totalCost = Number(item.quantity) * Number(item.unitCost);
      }
      updated[index] = item;
      return updated;
    });
  }

  getInvoiceTotal(): number {
    return this.invoiceLineItems().reduce((sum, item) => sum + item.totalCost, 0);
  }

  async saveInvoice(): Promise<void> {
    if (!this.invoiceVendorId() || !this.invoiceNumber()) return;
    this.isSavingInvoice.set(true);
    await this.vendorService.createInvoice({
      vendorId: this.invoiceVendorId(),
      invoiceNumber: this.invoiceNumber(),
      invoiceDate: this.invoiceDate(),
      lineItems: this.invoiceLineItems(),
    });
    this.isSavingInvoice.set(false);
    this.closeInvoiceForm();
  }

  async approveInvoice(id: string): Promise<void> {
    await this.vendorService.approveInvoice(id);
  }

  async markPaid(id: string): Promise<void> {
    await this.vendorService.markInvoicePaid(id);
  }

  async deleteInvoice(id: string): Promise<void> {
    await this.vendorService.deleteInvoice(id);
    if (this.selectedInvoice()?.id === id) {
      this.selectedInvoice.set(null);
    }
  }

  selectInvoice(invoice: PurchaseInvoice): void {
    this.selectedInvoice.set(
      this.selectedInvoice()?.id === invoice.id ? null : invoice
    );
  }

  setInvoiceFilter(filter: string): void {
    this.invoiceStatusFilter.set(filter);
  }

  getVendorName(vendorId: string): string {
    return this.vendors().find(v => v.id === vendorId)?.name ?? 'Unknown';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending_review': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'paid': return 'status-paid';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending_review': return 'Pending Review';
      case 'approved': return 'Approved';
      case 'paid': return 'Paid';
      default: return status;
    }
  }

  // ── Recipe Methods ──

  openRecipeForm(recipe?: Recipe): void {
    if (recipe) {
      this.editingRecipe.set(recipe);
      this.recipeMenuItemId.set(recipe.menuItemId);
      this.recipeName.set(recipe.name);
      this.recipeYieldQty.set(recipe.yieldQty);
      this.recipeYieldUnit.set(recipe.yieldUnit);
      this.recipeIngredients.set(recipe.ingredients.map(i => ({
        ingredientName: i.ingredientName,
        quantity: i.quantity,
        unit: i.unit,
        estimatedUnitCost: i.estimatedUnitCost,
        actualUnitCost: i.actualUnitCost,
      })));
    } else {
      this.editingRecipe.set(null);
      this.recipeMenuItemId.set('');
      this.recipeName.set('');
      this.recipeYieldQty.set(1);
      this.recipeYieldUnit.set('serving');
      this.recipeIngredients.set([{
        ingredientName: '',
        quantity: 0,
        unit: 'oz',
        estimatedUnitCost: 0,
      }]);
    }
    this.showRecipeForm.set(true);
  }

  closeRecipeForm(): void {
    this.showRecipeForm.set(false);
    this.editingRecipe.set(null);
  }

  addRecipeIngredient(): void {
    this.recipeIngredients.update(items => [...items, {
      ingredientName: '',
      quantity: 0,
      unit: 'oz',
      estimatedUnitCost: 0,
    }]);
  }

  removeRecipeIngredient(index: number): void {
    this.recipeIngredients.update(items => items.filter((_, i) => i !== index));
  }

  updateIngredient(index: number, field: string, value: string | number): void {
    this.recipeIngredients.update(items => {
      const updated = [...items];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  getRecipeTotalCost(): number {
    return this.recipeIngredients().reduce(
      (sum, i) => sum + (i.quantity * i.estimatedUnitCost), 0
    );
  }

  getRecipeCostPerServing(): number {
    const qty = this.recipeYieldQty();
    if (qty <= 0) return 0;
    return this.getRecipeTotalCost() / qty;
  }

  getMenuItemPrice(menuItemId: string): number {
    const item = this.menuItems().find(m => m.id === menuItemId);
    return item ? Number(item.price) : 0;
  }

  getMenuItemName(menuItemId: string): string {
    return this.menuItems().find(m => m.id === menuItemId)?.name ?? 'Unknown';
  }

  getRecipeMargin(recipe: Recipe): number {
    const price = this.getMenuItemPrice(recipe.menuItemId);
    const cost = recipe.costPerServing ?? 0;
    if (price <= 0) return 0;
    return ((price - cost) / price) * 100;
  }

  getRecipeFoodCostPercent(recipe: Recipe): number {
    const price = this.getMenuItemPrice(recipe.menuItemId);
    const cost = recipe.costPerServing ?? 0;
    if (price <= 0) return 0;
    return (cost / price) * 100;
  }

  async saveRecipe(): Promise<void> {
    if (!this.recipeMenuItemId() || !this.recipeName()) return;
    this.isSavingRecipe.set(true);
    const data: RecipeFormData = {
      menuItemId: this.recipeMenuItemId(),
      name: this.recipeName(),
      yieldQty: this.recipeYieldQty(),
      yieldUnit: this.recipeYieldUnit(),
      ingredients: this.recipeIngredients(),
    };

    const editing = this.editingRecipe();
    if (editing) {
      await this.recipeService.updateRecipe(editing.id, data);
    } else {
      await this.recipeService.createRecipe(data);
    }
    this.isSavingRecipe.set(false);
    this.closeRecipeForm();
  }

  async deleteRecipe(recipe: Recipe): Promise<void> {
    await this.recipeService.deleteRecipe(recipe.id);
    if (this.selectedRecipe()?.id === recipe.id) {
      this.selectedRecipe.set(null);
    }
  }

  selectRecipe(recipe: Recipe): void {
    this.selectedRecipe.set(
      this.selectedRecipe()?.id === recipe.id ? null : recipe
    );
  }

  async changeReportDays(days: number): Promise<void> {
    this.reportDays.set(days);
    await this.recipeService.loadFoodCostReport(days);
  }

  getFoodCostClass(percent: number): string {
    if (percent <= 28) return 'cost-good';
    if (percent <= 35) return 'cost-warning';
    return 'cost-danger';
  }

  getVarianceClass(variance: number): string {
    if (Math.abs(variance) <= 2) return 'variance-ok';
    if (variance > 0) return 'variance-over';
    return 'variance-under';
  }

  getPriceChangeClass(changePercent: number): string {
    if (changePercent > 10) return 'price-spike';
    if (changePercent > 5) return 'price-up';
    if (changePercent < -5) return 'price-down';
    return 'price-stable';
  }

  // ── Purchase Order Methods ──

  setPoStatusFilter(filter: string): void {
    this.poStatusFilter.set(filter);
  }

  selectPo(po: PurchaseOrder): void {
    this.selectedPo.set(
      this.selectedPo()?.id === po.id ? null : po
    );
  }

  openPoForm(): void {
    this.poVendorId.set('');
    this.poNotes.set('');
    this.showPoForm.set(true);
  }

  closePoForm(): void {
    this.showPoForm.set(false);
  }

  async submitPo(poId: string): Promise<void> {
    await this.vendorService.submitPurchaseOrder(poId);
  }

  async cancelPo(poId: string): Promise<void> {
    await this.vendorService.cancelPurchaseOrder(poId);
  }

  openReceiveModal(po: PurchaseOrder): void {
    // For now, auto-receive all items at ordered quantity
    const received = po.lineItems.map(li => ({
      inventoryItemId: li.inventoryItemId,
      receivedQuantity: li.quantity,
    }));
    this.vendorService.receivePurchaseOrder(po.id, received);
  }

  getPoStatusClass(status: string): string {
    switch (status) {
      case 'draft': return 'status-draft';
      case 'submitted': return 'status-submitted';
      case 'partially_received': return 'status-partial';
      case 'received': return 'status-received';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getPoStatusLabel(status: string): string {
    switch (status) {
      case 'draft': return 'Draft';
      case 'submitted': return 'Submitted';
      case 'partially_received': return 'Partial';
      case 'received': return 'Received';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }
}
