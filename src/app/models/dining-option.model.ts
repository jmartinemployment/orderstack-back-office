import { CustomerInfo } from './order.model';
import { DeliveryProviderType, DeliveryDispatchStatus } from './delivery.model';

/**
 * Dining Option Behaviors
 * Maps to how the order flows through the system
 */
export type DiningBehavior = 'DINE_IN' | 'TAKE_OUT' | 'DELIVERY' | 'CATERING';

/**
 * Dining Option Types (user-facing)
 */
export type DiningOptionType = 'dine-in' | 'takeout' | 'curbside' | 'delivery' | 'catering';

/**
 * Approval Status for scheduled/catering orders
 */
export type ApprovalStatus = 'NEEDS_APPROVAL' | 'APPROVED' | 'NOT_APPROVED';

/**
 * Dining Option Configuration
 */
export interface DiningOption {
  guid: string;
  name: string;                    // "Dine In", "Takeout", "Curbside", "Delivery", "Catering"
  type: DiningOptionType;
  behavior: DiningBehavior;
  requiresTable: boolean;          // true for dine-in only
  requiresCustomer: boolean;       // true for takeout, curbside, delivery, catering
  requiresAddress: boolean;        // true for delivery, catering
  requiresVehicle: boolean;        // true for curbside only
  requiresApproval: boolean;       // true for catering only
  autoApproval: boolean;           // false for catering (AI/Manual review)
}

/**
 * Delivery Info (required for delivery orders)
 */
export interface DeliveryInfo {
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  deliveryNotes?: string;
  deliveryState: 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  dispatchedDate?: Date;
  deliveredDate?: Date;
  // DaaS fields (all optional — absent for self-delivery)
  deliveryProvider?: DeliveryProviderType;
  deliveryExternalId?: string;
  deliveryTrackingUrl?: string;
  dispatchStatus?: DeliveryDispatchStatus;
  estimatedDeliveryAt?: string;
  deliveryFee?: number;
}

/**
 * Curbside Info (required for curbside orders)
 */
export interface CurbsideInfo {
  vehicleDescription: string;      // "Red Toyota Camry", "Blue Ford F-150"
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  arrivalNotified?: boolean;
  arrivedAt?: Date;
}

/**
 * Catering Info (required for catering orders)
 */
export interface CateringInfo {
  eventDate: Date;
  eventTime: string;
  headcount: number;
  eventType?: string;              // "Corporate", "Wedding", "Birthday", etc.
  setupRequired: boolean;
  depositAmount?: number;
  depositPaid: boolean;
  specialInstructions?: string;
}

/**
 * Predefined Dining Options
 */
export const DINING_OPTIONS: Record<DiningOptionType, DiningOption> = {
  'dine-in': {
    guid: 'dining-option-dine-in',
    name: 'Dine In',
    type: 'dine-in',
    behavior: 'DINE_IN',
    requiresTable: true,
    requiresCustomer: false,
    requiresAddress: false,
    requiresVehicle: false,
    requiresApproval: false,
    autoApproval: true
  },
  'takeout': {
    guid: 'dining-option-takeout',
    name: 'Takeout',
    type: 'takeout',
    behavior: 'TAKE_OUT',
    requiresTable: false,
    requiresCustomer: true,
    requiresAddress: false,
    requiresVehicle: false,
    requiresApproval: false,
    autoApproval: true
  },
  'curbside': {
    guid: 'dining-option-curbside',
    name: 'Curbside',
    type: 'curbside',
    behavior: 'TAKE_OUT',           // Same behavior as takeout
    requiresTable: false,
    requiresCustomer: true,
    requiresAddress: false,
    requiresVehicle: true,          // ADDITIONAL: vehicle description
    requiresApproval: false,
    autoApproval: true
  },
  'delivery': {
    guid: 'dining-option-delivery',
    name: 'Delivery',
    type: 'delivery',
    behavior: 'DELIVERY',
    requiresTable: false,
    requiresCustomer: true,
    requiresAddress: true,          // ADDITIONAL: full address
    requiresVehicle: false,
    requiresApproval: false,
    autoApproval: true
  },
  'catering': {
    guid: 'dining-option-catering',
    name: 'Catering',
    type: 'catering',
    behavior: 'CATERING',
    requiresTable: false,
    requiresCustomer: true,
    requiresAddress: true,
    requiresVehicle: false,
    requiresApproval: true,         // ALWAYS requires approval
    autoApproval: false             // AI/Manual review, never auto-approved
  }
};

/**
 * Helper: Get dining option by type
 */
export function getDiningOption(type: DiningOptionType): DiningOption {
  return DINING_OPTIONS[type];
}

/**
 * Helper: Validate order has required data for dining option
 */
export interface DiningValidationResult {
  valid: boolean;
  missingFields: string[];
}

function validateCustomerFields(customer: CustomerInfo | undefined): string[] {
  const missing: string[] = [];
  if (!customer?.firstName) missing.push('customer.firstName');
  if (!customer?.lastName) missing.push('customer.lastName');
  if (!customer?.phone) missing.push('customer.phone');
  if (!customer?.email) missing.push('customer.email');
  return missing;
}

function validateCateringFields(info: CateringInfo | undefined): string[] {
  const missing: string[] = [];
  if (!info?.eventDate) missing.push('cateringInfo.eventDate');
  if (!info?.headcount) missing.push('cateringInfo.headcount');
  return missing;
}

export function validateDiningRequirements(
  diningType: DiningOptionType,
  data: {
    tableGuid?: string;
    customer?: CustomerInfo;
    deliveryInfo?: DeliveryInfo;
    curbsideInfo?: CurbsideInfo;
    cateringInfo?: CateringInfo;
  }
): DiningValidationResult {
  const option = DINING_OPTIONS[diningType];
  const missing: string[] = [];

  if (option.requiresTable && !data.tableGuid) missing.push('table');
  if (option.requiresCustomer) missing.push(...validateCustomerFields(data.customer));
  if (option.requiresAddress && !data.deliveryInfo?.address) missing.push('deliveryInfo.address');
  if (option.requiresVehicle && !data.curbsideInfo?.vehicleDescription) missing.push('curbsideInfo.vehicleDescription');
  if (diningType === 'catering') missing.push(...validateCateringFields(data.cateringInfo));

  return { valid: missing.length === 0, missingFields: missing };
}
