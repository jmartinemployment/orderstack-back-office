// --- Status Lifecycle ---
// inquiry → proposal_sent → contract_signed → deposit_received → in_progress → final_payment → completed
//                                                                                               ↘ cancelled (from any state)

export type CateringJobStatus =
  | 'inquiry'
  | 'proposal_sent'
  | 'contract_signed'
  | 'deposit_received'
  | 'in_progress'
  | 'final_payment'
  | 'completed'
  | 'cancelled';

export type CateringEventType =
  | 'corporate'
  | 'wedding'
  | 'birthday'
  | 'social'
  | 'fundraiser'
  | 'holiday'
  | 'other';

export type CateringLocationType = 'on_site' | 'off_site';

export type CateringPricingModel = 'per_person' | 'per_tray' | 'flat';

export interface DietaryRequirements {
  vegetarian: number;
  vegan: number;
  glutenFree: number;
  nutAllergy: number;
  dairyFree: number;
  kosher: number;
  halal: number;
  other: string;
}

export interface CateringTasting {
  id: string;
  scheduledDate: string;
  completedAt?: string;
  attendees: string;
  notes?: string;
  menuChangesRequested?: string;
}

export interface DeliveryDetails {
  driverName?: string;
  driverPhone?: string;
  loadTime?: string;
  departureTime?: string;
  arrivalTime?: string;
  vehicleDescription?: string;
  equipmentChecklist?: string[];
  routeNotes?: string;
  setupTime?: string;
  breakdownTime?: string;
}

// --- AI Proposal Content ---

export type ProposalTone = 'professional' | 'warm' | 'casual';

export interface ProposalMenuItemDescription {
  itemId: string;
  itemName: string;
  description: string;
}

export interface ProposalAiContent {
  intro: string;
  menuDescriptions: ProposalMenuItemDescription[];
  serviceOverview: string;
  dietaryStatement: string;
  closing: string;
  generatedAt: string;
  tone: ProposalTone;
}

export interface CateringJob {
  id: string;
  restaurantId: string;
  title: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  companyName?: string;
  eventType: CateringEventType;
  status: CateringJobStatus;
  headcount: number;
  bookingDate: string;
  fulfillmentDate: string;
  startTime?: string;
  endTime?: string;
  locationType: CateringLocationType;
  locationAddress?: string;
  notes?: string;

  // Financial
  subtotalCents: number;
  serviceChargePercent?: number;
  serviceChargeCents: number;
  taxPercent?: number;
  taxCents: number;
  gratuityPercent?: number;
  gratuityCents: number;
  totalCents: number;
  paidCents: number;

  // Packages & pricing
  packages: CateringPackage[];
  selectedPackageId?: string;

  // Milestones
  milestones: CateringMilestonePayment[];

  // Documents
  estimateId?: string;
  invoiceId?: string;
  contractUrl?: string;
  contractSignedAt?: string;
  proposalSentAt?: string;
  signatureImageUrl?: string | null;
  signerIp?: string | null;
  signerConsentedAt?: string | null;

  // Invoice branding overrides (falls back to merchant-level if null)
  brandingLogoUrl?: string;
  brandingColor?: string;
  invoiceNotes?: string;

  // Dietary requirements
  dietaryRequirements?: DietaryRequirements;

  // Tastings
  tastings?: CateringTasting[];

  // Delivery logistics (off-site events)
  deliveryDetails?: DeliveryDetails;

  // AI-generated proposal content
  aiContent?: ProposalAiContent | null;

  createdAt: string;
  updatedAt: string;
}

export interface CateringPackage {
  id: string;
  name: string;
  tier: 'standard' | 'premium' | 'custom';
  pricingModel: CateringPricingModel;
  pricePerUnit: number;
  minimumHeadcount: number;
  description?: string;
  menuItemIds: string[];
  menuItems?: { id: string; name: string; pricingTier?: CateringPackageItemTier }[];
}

export interface CateringPackageItemTier {
  model: 'per_person' | 'per_tray' | 'flat';
  price: number;
  label?: string;
}

export interface CateringPackageTemplate {
  id: string;
  merchantId: string;
  name: string;
  tier: 'standard' | 'premium' | 'custom';
  pricingModel: 'per_person' | 'per_tray' | 'flat';
  pricePerUnitCents: number;
  minimumHeadcount: number;
  description?: string;
  menuItemIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CateringMilestonePayment {
  id: string;
  jobId: string;
  label: string;
  percent: number;
  amountCents: number;
  dueDate?: string;
  paidAt?: string;
  invoiceId?: string;
  reminderSentAt?: string;
}

export interface CateringActivity {
  id: string;
  jobId: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  actorType: 'operator' | 'client' | 'system';
  createdAt: string;
}

export interface CateringClientHistory {
  clientName: string;
  clientEmail: string | null;
  companyName: string | null;
  totalJobs: number;
  completedJobs: number;
  totalRevenueCents: number;
  lastEventDate: string;
}

export interface CateringDeferredRevenueEntry {
  jobId: string;
  title: string;
  fulfillmentDate: string;
  totalCents: number;
  paidCents: number;
  recognizedCents: number;
  deferredCents: number;
}

export interface CateringPerformanceReport {
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  totalRevenue: number;
  avgJobValue: number;
  closeRate: number;
  revenueByType: Record<string, number>;
  revenueByMonth: Record<string, number>;
}

export interface CateringPrepList {
  date: string;
  jobCount: number;
  totalGuests: number;
  jobs: {
    id: string;
    title: string;
    headcount: number;
    startTime: string;
    packages: CateringPackage[];
    selectedPackageId: string | null;
    dietaryRequirements: DietaryRequirements | null;
    deliveryDetails: DeliveryDetails | null;
  }[];
}

export interface CateringCapacitySettings {
  maxEventsPerDay: number;
  maxHeadcountPerDay: number;
  conflictAlertsEnabled: boolean;
}

export function defaultCateringMilestones(): CateringMilestonePayment[] {
  return [
    { id: crypto.randomUUID(), jobId: '', label: 'Deposit', percent: 50, amountCents: 0 },
    { id: crypto.randomUUID(), jobId: '', label: 'Final Payment', percent: 50, amountCents: 0 },
  ];
}

export function defaultDietaryRequirements(): DietaryRequirements {
  return {
    vegetarian: 0,
    vegan: 0,
    glutenFree: 0,
    nutAllergy: 0,
    dairyFree: 0,
    kosher: 0,
    halal: 0,
    other: '',
  };
}

// Status display metadata
export const CATERING_STATUS_CONFIG: Record<CateringJobStatus, { label: string; color: string; icon: string }> = {
  inquiry: { label: 'Inquiry', color: '#6b7280', icon: 'bi-question-circle' },
  proposal_sent: { label: 'Proposal Sent', color: '#3b82f6', icon: 'bi-send' },
  contract_signed: { label: 'Contract Signed', color: '#8b5cf6', icon: 'bi-pen' },
  deposit_received: { label: 'Deposit Received', color: '#f97316', icon: 'bi-cash-stack' },
  in_progress: { label: 'In Progress', color: '#eab308', icon: 'bi-gear' },
  final_payment: { label: 'Final Payment', color: '#ef4444', icon: 'bi-credit-card' },
  completed: { label: 'Completed', color: '#22c55e', icon: 'bi-check-circle' },
  cancelled: { label: 'Cancelled', color: '#374151', icon: 'bi-x-circle' },
};

// Valid next-status transitions
export const CATERING_STATUS_TRANSITIONS: Record<CateringJobStatus, CateringJobStatus[]> = {
  inquiry: ['proposal_sent', 'cancelled'],
  proposal_sent: ['contract_signed', 'cancelled'],
  contract_signed: ['deposit_received', 'cancelled'],
  deposit_received: ['in_progress', 'cancelled'],
  in_progress: ['final_payment', 'completed', 'cancelled'],
  final_payment: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

// Backward compat alias
export type CateringEvent = CateringJob;

// --- FEATURE-11: Production Report ---
export interface AggregatedIngredient {
  name: string;
  unit: string;
  totalQuantity: number;
  unitCost?: number;
  jobs: string[];
}
