import { Component, ChangeDetectionStrategy, inject, signal, computed, linkedSignal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { CateringService } from '../../../services/catering.service';
import { MenuService } from '../../../services/menu';
import {
  CateringJob,
  CateringJobStatus,
  CateringPackage,
  CateringMilestonePayment,
  CateringActivity,
  CateringTasting,
  DeliveryDetails,
  DietaryRequirements,
  CATERING_STATUS_CONFIG,
  CATERING_STATUS_TRANSITIONS,
  defaultDietaryRequirements,
  CateringPricingTier,
  ProposalAiContent,
  ProposalTone,
} from '../../../models/index';
import { NotificationService } from '../../../services/notification';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'os-catering-job-detail',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './catering-job-detail.component.html',
  styleUrl: './catering-job-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringJobDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cateringService = inject(CateringService);
  private readonly menuService = inject(MenuService);
  private readonly notificationService = inject(NotificationService);

  readonly job = signal<CateringJob | null>(null);
  readonly activities = signal<CateringActivity[]>([]);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly activeSection = signal<string>('overview');
  readonly proposalUrl = signal<string | null>(null);

  // AI Proposal signals
  private readonly _generating = signal(false);
  private readonly _savingContent = signal(false);
  private readonly _selectedTone = signal<ProposalTone>('professional');
  private readonly _aiContent = signal<ProposalAiContent | null>(null);
  readonly generating = this._generating.asReadonly();
  readonly savingContent = this._savingContent.asReadonly();
  readonly selectedTone = this._selectedTone.asReadonly();
  readonly aiContent = this._aiContent.asReadonly();

  readonly editedIntro = linkedSignal(() => this._aiContent()?.intro ?? '');
  readonly editedServiceOverview = linkedSignal(() => this._aiContent()?.serviceOverview ?? '');
  readonly editedDietaryStatement = linkedSignal(() => this._aiContent()?.dietaryStatement ?? '');
  readonly editedClosing = linkedSignal(() => this._aiContent()?.closing ?? '');
  readonly editedMenuDescriptions = linkedSignal<Record<string, string>>(() => {
    const content = this._aiContent();
    if (!content) return {};
    return Object.fromEntries(content.menuDescriptions.map(d => [d.itemId, d.description]));
  });

  // Package editor
  readonly editingPackage = signal<CateringPackage | null>(null);
  readonly showPackageForm = signal(false);
  pkgName = '';
  pkgTier: 'standard' | 'premium' | 'custom' = 'standard';
  pkgPricingModel: 'per_person' | 'per_tray' | 'flat' = 'per_person';
  pkgPricePerUnit = 0;
  pkgMinHeadcount = 0;
  pkgDescription = '';

  // Catering menu item picker
  readonly cateringItems = computed(() => this.menuService.cateringItems());
  private readonly _selectedMenuItemIds = signal<string[]>([]);
  private readonly _selectedTiers = signal<Record<string, CateringPricingTier>>({});
  readonly selectedMenuItemIds = this._selectedMenuItemIds.asReadonly();
  readonly selectedTiers = this._selectedTiers.asReadonly();

  // Milestone editor
  readonly showMilestoneForm = signal(false);
  msLabel = '';
  msPercent = 0;
  msDueDate = '';

  // Contract editor
  readonly showContractForm = signal(false);
  contractUrlInput = '';

  // Tasting editor
  readonly showTastingForm = signal(false);
  tastingDate = '';
  tastingAttendees = '';
  tastingNotes = '';

  // Delivery editor
  deliveryDriverName = '';
  deliveryDriverPhone = '';
  deliveryLoadTime = '';
  deliveryDepartureTime = '';
  deliveryArrivalTime = '';
  deliveryVehicle = '';
  deliveryRouteNotes = '';
  deliverySetupTime = '';
  deliveryBreakdownTime = '';
  deliveryEquipment = '';

  // Dietary editor
  dietary: DietaryRequirements = defaultDietaryRequirements();

  // Fee editor
  serviceChargePercent = 0;
  taxPercent = 0;
  gratuityPercent = 0;

  readonly statusConfig = CATERING_STATUS_CONFIG;

  /** Action-oriented labels for status advancement buttons (BUG-21) */
  readonly statusActionLabels: Record<CateringJobStatus, string> = {
    inquiry: 'Inquiry',
    proposal_sent: 'Mark Proposal Sent',
    contract_signed: 'Mark Contract Signed',
    deposit_received: 'Record Deposit',
    in_progress: 'Start Event',
    final_payment: 'Record Final Payment',
    completed: 'Mark Completed',
    cancelled: 'Cancel',
  };

  readonly balanceCents = computed(() => {
    const j = this.job();
    if (!j) return 0;
    return j.totalCents - j.paidCents;
  });

  readonly paymentProgress = computed(() => {
    const j = this.job();
    if (!j || j.totalCents === 0) return 0;
    return Math.round((j.paidCents / j.totalCents) * 100);
  });

  readonly selectedPackage = computed(() => {
    const j = this.job();
    if (!j?.selectedPackageId) return null;
    return j.packages.find(p => p.id === j.selectedPackageId) ?? null;
  });

  readonly nextStatuses = computed(() => {
    const j = this.job();
    if (!j) return [];
    return CATERING_STATUS_TRANSITIONS[j.status].filter(s => s !== 'cancelled');
  });

  readonly canCancel = computed(() => {
    const j = this.job();
    return j !== null && j.status !== 'completed' && j.status !== 'cancelled';
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/app/catering']);
      return;
    }
    this.menuService.loadMenu();
    await this.loadJob(id);
  }

  private async loadJob(id: string): Promise<void> {
    this.isLoading.set(true);
    const job = await this.cateringService.getJob(id);
    if (!job) {
      this.router.navigate(['/app/catering']);
      return;
    }
    this.job.set(job);
    this._aiContent.set(job.aiContent ?? null);
    this.loadFormDefaults(job);
    this.isLoading.set(false);

    const acts = await this.cateringService.loadActivity(id);
    this.activities.set(acts);
  }

  private loadFormDefaults(j: CateringJob): void {
    this.serviceChargePercent = j.serviceChargePercent ?? 0;
    this.taxPercent = j.taxPercent ?? 0;
    this.gratuityPercent = j.gratuityPercent ?? 0;
    this.dietary = j.dietaryRequirements ? { ...j.dietaryRequirements } : defaultDietaryRequirements();

    const d = j.deliveryDetails;
    if (d) {
      this.deliveryDriverName = d.driverName ?? '';
      this.deliveryDriverPhone = d.driverPhone ?? '';
      this.deliveryLoadTime = d.loadTime ?? '';
      this.deliveryDepartureTime = d.departureTime ?? '';
      this.deliveryArrivalTime = d.arrivalTime ?? '';
      this.deliveryVehicle = d.vehicleDescription ?? '';
      this.deliveryRouteNotes = d.routeNotes ?? '';
      this.deliverySetupTime = d.setupTime ?? '';
      this.deliveryBreakdownTime = d.breakdownTime ?? '';
      this.deliveryEquipment = (d.equipmentChecklist ?? []).join('\n');
    }
  }

  goBack(): void {
    this.router.navigate(['/app/catering']);
  }

  setSection(section: string): void {
    this.activeSection.set(section);
  }

  formatCents(cents: number): string {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatTime(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }

  // --- Status ---

  async advanceStatus(status: CateringJobStatus): Promise<void> {
    const j = this.job();
    if (!j) return;
    this.isSaving.set(true);
    const updated = await this.cateringService.updateJob(j.id, { status });
    if (updated) this.job.set(updated);
    this.isSaving.set(false);
    const acts = await this.cateringService.loadActivity(j.id);
    this.activities.set(acts);
  }

  async cancelJob(): Promise<void> {
    const j = this.job();
    if (!j) return;
    this.isSaving.set(true);
    const updated = await this.cateringService.updateJob(j.id, { status: 'cancelled' });
    if (updated) this.job.set(updated);
    this.isSaving.set(false);
  }

  // --- Packages ---

  openNewPackage(): void {
    this.editingPackage.set(null);
    this.pkgName = '';
    this.pkgTier = 'standard';
    this.pkgPricingModel = 'per_person';
    this.pkgPricePerUnit = 0;
    this.pkgMinHeadcount = 0;
    this.pkgDescription = '';
    this._selectedMenuItemIds.set([]);
    this._selectedTiers.set({});
    this.showPackageForm.set(true);
  }

  openEditPackage(pkg: CateringPackage): void {
    this.editingPackage.set(pkg);
    this.pkgName = pkg.name;
    this.pkgTier = pkg.tier;
    this.pkgPricingModel = pkg.pricingModel;
    this.pkgPricePerUnit = pkg.pricePerUnit;
    this.pkgMinHeadcount = pkg.minimumHeadcount;
    this.pkgDescription = pkg.description ?? '';
    this._selectedMenuItemIds.set([...pkg.menuItemIds]);
    const tiers: Record<string, CateringPricingTier> = {};
    for (const mi of pkg.menuItems ?? []) {
      if (mi.pricingTier) {
        tiers[mi.id] = { model: mi.pricingTier.model, price: mi.pricingTier.price, label: mi.pricingTier.label };
      }
    }
    this._selectedTiers.set(tiers);
    this.showPackageForm.set(true);
  }

  toggleMenuItem(itemId: string): void {
    const ids = this._selectedMenuItemIds();
    if (ids.includes(itemId)) {
      this._selectedMenuItemIds.set(ids.filter(id => id !== itemId));
      this._selectedTiers.update(t => {
        const copy = { ...t };
        delete copy[itemId];
        return copy;
      });
    } else {
      this._selectedMenuItemIds.set([...ids, itemId]);
      const item = this.cateringItems().find(i => i.id === itemId);
      if (item?.cateringPricing?.[0]) {
        this._selectedTiers.update(t => ({ ...t, [itemId]: item.cateringPricing![0] }));
      }
    }
  }

  isMenuItemSelected(itemId: string): boolean {
    return this._selectedMenuItemIds().includes(itemId);
  }

  selectItemTier(itemId: string, tier: CateringPricingTier): void {
    this._selectedTiers.update(t => ({ ...t, [itemId]: tier }));
  }

  getSelectedTier(itemId: string): CateringPricingTier | undefined {
    return this._selectedTiers()[itemId];
  }

  private buildMenuItemsSnapshot(): CateringPackage['menuItems'] {
    const selectedIds = this._selectedMenuItemIds();
    const tiers = this._selectedTiers();
    return selectedIds.map(id => {
      const item = this.cateringItems().find(i => i.id === id);
      const tier = tiers[id];
      return {
        id,
        name: item?.name ?? 'Unknown',
        pricingTier: tier ? { model: tier.model, price: tier.price, label: tier.label } : undefined,
      };
    });
  }

  async savePackage(): Promise<void> {
    const j = this.job();
    if (!j || !this.pkgName.trim()) return;

    this.isSaving.set(true);
    const existing = this.editingPackage();
    const menuItemIds = this._selectedMenuItemIds();
    const menuItems = this.buildMenuItemsSnapshot();
    let packages: CateringPackage[];

    if (existing) {
      packages = j.packages.map(p =>
        p.id === existing.id
          ? { ...p, name: this.pkgName, tier: this.pkgTier, pricingModel: this.pkgPricingModel, pricePerUnit: this.pkgPricePerUnit, minimumHeadcount: this.pkgMinHeadcount, description: this.pkgDescription, menuItemIds, menuItems }
          : p
      );
    } else {
      const newPkg: CateringPackage = {
        id: crypto.randomUUID(),
        name: this.pkgName,
        tier: this.pkgTier,
        pricingModel: this.pkgPricingModel,
        pricePerUnit: this.pkgPricePerUnit,
        minimumHeadcount: this.pkgMinHeadcount,
        description: this.pkgDescription,
        menuItemIds,
        menuItems,
      };
      packages = [...j.packages, newPkg];
    }

    const updated = await this.cateringService.updateJob(j.id, { packages });
    if (updated) this.job.set(updated);
    this.showPackageForm.set(false);
    this.isSaving.set(false);
  }

  async removePackage(pkgId: string): Promise<void> {
    const j = this.job();
    if (!j) return;
    this.isSaving.set(true);
    const packages = j.packages.filter(p => p.id !== pkgId);
    const data: Partial<CateringJob> = { packages };
    if (j.selectedPackageId === pkgId) {
      data.selectedPackageId = undefined;
    }
    const updated = await this.cateringService.updateJob(j.id, data);
    if (updated) this.job.set(updated);
    this.isSaving.set(false);
  }

  async selectPackage(pkgId: string): Promise<void> {
    const j = this.job();
    if (!j) return;

    const pkg = j.packages.find(p => p.id === pkgId);
    if (!pkg) return;

    this.isSaving.set(true);
    let subtotalCents = 0;
    if (pkg.pricingModel === 'per_person') {
      subtotalCents = Math.round(pkg.pricePerUnit * j.headcount * 100);
    } else {
      subtotalCents = Math.round(pkg.pricePerUnit * 100);
    }

    const updated = await this.cateringService.updateJob(j.id, {
      selectedPackageId: pkgId,
      subtotalCents,
    });
    if (updated) this.job.set(updated);
    this.isSaving.set(false);
  }

  getPackageTotal(pkg: CateringPackage): number {
    const j = this.job();
    if (!j) return 0;
    if (pkg.pricingModel === 'per_person') {
      return Math.round(pkg.pricePerUnit * j.headcount * 100);
    }
    return Math.round(pkg.pricePerUnit * 100);
  }

  // --- Milestones ---

  openNewMilestone(): void {
    this.msLabel = '';
    this.msPercent = 0;
    this.msDueDate = '';
    this.showMilestoneForm.set(true);
  }

  async saveMilestone(): Promise<void> {
    const j = this.job();
    if (!j || !this.msLabel.trim()) return;

    this.isSaving.set(true);
    const newMs: CateringMilestonePayment = {
      id: crypto.randomUUID(),
      jobId: j.id,
      label: this.msLabel,
      percent: this.msPercent,
      amountCents: Math.round(j.totalCents * this.msPercent / 100),
      dueDate: this.msDueDate || undefined,
    };
    const milestones = [...j.milestones, newMs];
    const updated = await this.cateringService.updateJob(j.id, { milestones });
    if (updated) this.job.set(updated);
    this.showMilestoneForm.set(false);
    this.isSaving.set(false);
  }

  async removeMilestone(msId: string): Promise<void> {
    const j = this.job();
    if (!j) return;
    this.isSaving.set(true);
    const milestones = j.milestones.filter(m => m.id !== msId);
    const updated = await this.cateringService.updateJob(j.id, { milestones });
    if (updated) this.job.set(updated);
    this.isSaving.set(false);
  }

  async markPaid(msId: string): Promise<void> {
    const j = this.job();
    if (!j) return;
    this.isSaving.set(true);
    const updated = await this.cateringService.markMilestonePaid(j.id, msId);
    if (updated) this.job.set(updated);
    this.isSaving.set(false);
    const acts = await this.cateringService.loadActivity(j.id);
    this.activities.set(acts);
  }

  // --- Fees ---

  async saveFees(): Promise<void> {
    const j = this.job();
    if (!j) return;
    this.isSaving.set(true);
    const updated = await this.cateringService.updateJob(j.id, {
      serviceChargePercent: this.serviceChargePercent || undefined,
      taxPercent: this.taxPercent || undefined,
      gratuityPercent: this.gratuityPercent || undefined,
    });
    if (updated) {
      this.job.set(updated);
      this.serviceChargePercent = updated.serviceChargePercent ?? 0;
      this.taxPercent = updated.taxPercent ?? 0;
      this.gratuityPercent = updated.gratuityPercent ?? 0;
    }
    this.isSaving.set(false);
  }

  // --- Dietary ---

  async saveDietary(): Promise<void> {
    const j = this.job();
    if (!j) return;
    this.isSaving.set(true);
    const updated = await this.cateringService.updateJob(j.id, {
      dietaryRequirements: { ...this.dietary },
    });
    if (updated) this.job.set(updated);
    this.isSaving.set(false);
  }

  get dietaryTotal(): number {
    return this.dietary.vegetarian + this.dietary.vegan + this.dietary.glutenFree
      + this.dietary.nutAllergy + this.dietary.dairyFree + this.dietary.kosher + this.dietary.halal;
  }

  // --- Tastings ---

  openNewTasting(): void {
    this.tastingDate = '';
    this.tastingAttendees = '';
    this.tastingNotes = '';
    this.showTastingForm.set(true);
  }

  async saveTasting(): Promise<void> {
    const j = this.job();
    if (!j || !this.tastingDate) return;
    this.isSaving.set(true);
    const newTasting: CateringTasting = {
      id: crypto.randomUUID(),
      scheduledDate: this.tastingDate,
      attendees: this.tastingAttendees,
      notes: this.tastingNotes || undefined,
    };
    const tastings = [...(j.tastings ?? []), newTasting];
    const updated = await this.cateringService.updateJob(j.id, { tastings });
    if (updated) this.job.set(updated);
    this.showTastingForm.set(false);
    this.isSaving.set(false);
  }

  async completeTasting(tastingId: string): Promise<void> {
    const j = this.job();
    if (!j) return;
    this.isSaving.set(true);
    const tastings = (j.tastings ?? []).map(t =>
      t.id === tastingId ? { ...t, completedAt: new Date().toISOString() } : t
    );
    const updated = await this.cateringService.updateJob(j.id, { tastings });
    if (updated) this.job.set(updated);
    this.isSaving.set(false);
  }

  // --- Delivery ---

  async saveDelivery(): Promise<void> {
    const j = this.job();
    if (!j) return;
    this.isSaving.set(true);
    const deliveryDetails: DeliveryDetails = {
      driverName: this.deliveryDriverName || undefined,
      driverPhone: this.deliveryDriverPhone || undefined,
      loadTime: this.deliveryLoadTime || undefined,
      departureTime: this.deliveryDepartureTime || undefined,
      arrivalTime: this.deliveryArrivalTime || undefined,
      vehicleDescription: this.deliveryVehicle || undefined,
      routeNotes: this.deliveryRouteNotes || undefined,
      setupTime: this.deliverySetupTime || undefined,
      breakdownTime: this.deliveryBreakdownTime || undefined,
      equipmentChecklist: this.deliveryEquipment.split('\n').map(s => s.trim()).filter(Boolean),
    };
    const updated = await this.cateringService.updateJob(j.id, { deliveryDetails });
    if (updated) this.job.set(updated);
    this.isSaving.set(false);
  }

  // --- Proposal ---

  async sendProposal(): Promise<void> {
    const j = this.job();
    if (!j) return;
    this.isSaving.set(true);
    const result = await this.cateringService.generateProposal(j.id);
    if (result) {
      this.proposalUrl.set(`${environment.appBaseUrl}/catering/proposal/${result.token}`);
      const updated = await this.cateringService.getJob(j.id);
      if (updated) this.job.set(updated);
    }
    this.isSaving.set(false);
    const acts = await this.cateringService.loadActivity(j.id);
    this.activities.set(acts);
  }

  copyProposalUrl(): void {
    const url = this.proposalUrl();
    if (url) {
      navigator.clipboard.writeText(url);
    }
  }

  // --- Contract ---

  openContractForm(): void {
    this.contractUrlInput = this.job()?.contractUrl ?? '';
    this.showContractForm.set(true);
  }

  async saveContractUrl(): Promise<void> {
    const j = this.job();
    const url = this.contractUrlInput.trim();
    if (!j || !url) return;
    this.isSaving.set(true);
    const updated = await this.cateringService.uploadContract(j.id, url);
    if (updated) this.job.set(updated);
    this.showContractForm.set(false);
    this.contractUrlInput = '';
    this.isSaving.set(false);
  }

  // --- AI Proposal ---

  setSelectedTone(tone: ProposalTone): void {
    this._selectedTone.set(tone);
  }

  updateMenuDescription(itemId: string, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.editedMenuDescriptions.update(descs => ({ ...descs, [itemId]: value }));
  }

  async generateAiContent(): Promise<void> {
    const j = this.job();
    if (!j) return;
    this._generating.set(true);
    const result = await this.cateringService.generateProposalAiContent(j.id, this._selectedTone());
    this._generating.set(false);

    if (result === null) {
      this.notificationService.show('Failed to generate AI proposal. Please try again.');
      return;
    }
    if ('error' in result) {
      if (result.error === 'not-enabled') {
        this.notificationService.show('AI Catering Proposals is not enabled. Go to Settings > AI to enable it.');
      } else {
        this.notificationService.show(`Please wait ${result.retryAfter} seconds before regenerating.`);
      }
      return;
    }
    this._aiContent.set(result.content);
    if (result.truncated) {
      this.notificationService.show('Note: More than 50 menu items — proposal was generated with the first 50.');
    }
  }

  async saveEditedContent(): Promise<void> {
    const j = this.job();
    const content = this._aiContent();
    if (!j || !content) return;

    const patched: ProposalAiContent = {
      ...content,
      intro: this.editedIntro(),
      serviceOverview: this.editedServiceOverview(),
      dietaryStatement: this.editedDietaryStatement(),
      closing: this.editedClosing(),
      menuDescriptions: content.menuDescriptions.map(d => ({
        ...d,
        description: this.editedMenuDescriptions()[d.itemId] ?? d.description,
      })),
    };

    this._savingContent.set(true);
    const saved = await this.cateringService.saveProposalContent(j.id, patched);
    this._savingContent.set(false);

    if (saved) {
      this._aiContent.set(saved);
      this.notificationService.show('Proposal content saved.');
    } else {
      this.notificationService.show('Failed to save proposal content. Please try again.');
    }
  }

  // --- Clone ---

  async cloneJob(): Promise<void> {
    const j = this.job();
    if (!j) return;
    this.isSaving.set(true);
    const clone = await this.cateringService.cloneJob(j.id);
    this.isSaving.set(false);
    if (clone) {
      this.router.navigate(['/app/catering/job', clone.id]);
    }
  }

  // --- BEO ---

  openBeo(): void {
    const j = this.job();
    if (!j) return;
    this.router.navigate(['/app/catering/job', j.id, 'beo']);
  }

  // --- .ics Export ---

  downloadIcs(): void {
    const j = this.job();
    if (!j) return;
    const start = j.fulfillmentDate.replaceAll('-', '') + 'T' + (j.startTime ?? '00:00').replaceAll(':', '') + '00';
    const end = j.fulfillmentDate.replaceAll('-', '') + 'T' + (j.endTime ?? '23:59').replaceAll(':', '') + '00';
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${j.title}`,
      `DESCRIPTION:${j.headcount} guests - ${j.clientName}`,
      `LOCATION:${j.locationAddress ?? 'On-site'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${j.title.replaceAll(' ', '-')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Activity helpers ---

  getActivityIcon(action: string): string {
    const map: Record<string, string> = {
      created: 'bi-plus-circle',
      status_changed: 'bi-arrow-right-circle',
      proposal_sent: 'bi-send',
      proposal_viewed: 'bi-eye',
      proposal_approved: 'bi-check2-circle',
      milestone_paid: 'bi-cash-stack',
      contract_uploaded: 'bi-file-earmark-pdf',
      lead_submitted: 'bi-envelope-open',
    };
    return map[action] ?? 'bi-circle';
  }

  getActivityColor(actorType: string): string {
    const map: Record<string, string> = {
      operator: 'text-primary',
      client: 'text-success',
      system: 'text-secondary',
    };
    return map[actorType] ?? 'text-secondary';
  }
}
