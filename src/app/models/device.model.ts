import { DevicePosMode } from './platform.model';

// ===================================================================
// GOS-SPEC-02: POS Device Setup & Hardware Management
// All types, interfaces, constants, and factory functions for the
// unified hardware management system — devices, modes, printer
// profiles, peripherals, and kiosk profiles.
// ===================================================================

// --- Device Types ---

export type DeviceType = 'terminal' | 'kds' | 'kiosk' | 'printer' | 'register' | 'bar';

// --- Device (replaces DeviceRegistration from staff-management.model.ts) ---

export interface Device {
  id: string;
  merchantId: string;
  locationId: string | null;
  deviceCode: string;
  deviceName: string;
  deviceType: DeviceType;
  posMode: DevicePosMode | null;
  modeId: string | null;
  status: 'pending' | 'active' | 'revoked';
  hardwareInfo: DeviceHardwareInfo | null;
  lastSeenAt: string | null;
  pairedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface DeviceHardwareInfo {
  platform: string;
  osVersion: string | null;
  appVersion: string | null;
  screenSize: string | null;
  serialNumber: string | null;
}

export interface DeviceFormData {
  deviceName: string;
  deviceType: DeviceType;
  locationId?: string;
  modeId?: string;
  posMode?: DevicePosMode;
  teamMemberId?: string;
}

// --- Device Modes (reusable hardware config profiles) ---

export interface DeviceMode {
  id: string;
  merchantId: string;
  name: string;
  deviceType: DeviceType;
  isDefault: boolean;
  settings: DeviceModeSettings;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceModeSettings {
  checkout: {
    defaultOrderType: 'dine-in' | 'takeout' | 'delivery';
    requireTableSelection: boolean;
    skipPaymentScreen: boolean;
    autoSendToKds: boolean;
    showTipPrompt: boolean;
    tipPresets: number[];
    autoProgressToPayment: boolean;
  };
  receipt: {
    autoPrintReceipt: boolean;
    autoPrintKitchenTicket: boolean;
    printerProfileId: string | null;
  };
  security: {
    requirePinPerTransaction: boolean;
    inactivityTimeoutMinutes: number;
    lockOnSleep: boolean;
  };
  display: {
    fontSize: 'small' | 'medium' | 'large';
    showImages: boolean;
    gridColumns: 2 | 3 | 4;
    categoryDisplayMode: 'tabs' | 'sidebar';
  };
}

export interface DeviceModeFormData {
  name: string;
  deviceType: DeviceType;
  isDefault?: boolean;
  settings: DeviceModeSettings;
}

// --- Printer Profiles (print job routing) ---

export type PrintJobType =
  | 'customer_receipt'
  | 'kitchen_ticket'
  | 'bar_ticket'
  | 'expo_ticket'
  | 'order_summary'
  | 'close_of_day';

export interface PrinterProfile {
  id: string;
  merchantId: string;
  name: string;
  isDefault: boolean;
  routingRules: PrintRoutingRule[];
  createdAt: string;
  updatedAt: string;
}

export interface PrintRoutingRule {
  jobType: PrintJobType;
  printerId: string;
  copies: number;
  enabled: boolean;
}

export interface PrinterProfileFormData {
  name: string;
  isDefault?: boolean;
  routingRules: PrintRoutingRule[];
}

// --- Peripheral Devices ---

export type PeripheralType = 'cash_drawer' | 'barcode_scanner' | 'card_reader' | 'customer_display' | 'scale';
export type PeripheralConnectionType = 'usb' | 'bluetooth' | 'network';

export interface PeripheralDevice {
  id: string;
  merchantId: string;
  parentDeviceId: string;
  type: PeripheralType;
  name: string;
  connectionType: PeripheralConnectionType;
  status: 'connected' | 'disconnected' | 'error';
  lastSeenAt: string | null;
}

// --- Kiosk Profiles ---

export interface KioskProfile {
  id: string;
  merchantId: string;
  name: string;
  posMode: DevicePosMode;
  welcomeMessage: string;
  showImages: boolean;
  enabledCategories: string[];
  categoryDisplayOrder: string[];
  requireNameForOrder: boolean;
  maxIdleSeconds: number;
  enableAccessibility: boolean;
  brandingLogoUrl: string | null;
  brandingPrimaryColor: string;
  brandingAccentColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface KioskProfileFormData {
  name: string;
  posMode?: DevicePosMode;
  welcomeMessage?: string;
  showImages?: boolean;
  enabledCategories?: string[];
  categoryDisplayOrder?: string[];
  requireNameForOrder?: boolean;
  maxIdleSeconds?: number;
  enableAccessibility?: boolean;
  brandingPrimaryColor?: string;
  brandingAccentColor?: string;
}

// --- Peripheral Configuration ---

export interface PeripheralConfig {
  cashDrawerAutoOpen: boolean;
  barcodeScannerPrefix: string;
  barcodeScannerSuffix: string;
  customerDisplayMode: 'mirror' | 'custom_message';
  customerDisplayMessage: string;
}

// --- Customer-Facing Display (GAP-R10) ---

export type CustomerDisplayIdleMode = 'slideshow' | 'logo' | 'off';

export interface CustomerDisplayConfig {
  enabled: boolean;
  idleMode: CustomerDisplayIdleMode;
  slideshowImages: string[];
  slideshowIntervalSeconds: number;
  showTipPrompt: boolean;
  tipPresets: number[];
  showLoyaltyEnrollment: boolean;
  brandingMessage: string;
}

export type CustomerDisplayMode = 'idle' | 'active' | 'tip' | 'complete';

export interface CustomerDisplayMessage {
  type: 'item-added' | 'item-removed' | 'totals-updated' | 'tip-prompt' | 'payment-complete' | 'reset';
  items?: { name: string; quantity: number; price: number }[];
  subtotal?: number;
  tax?: number;
  total?: number;
  tipPresets?: number[];
  brandingMessage?: string;
}

export function defaultCustomerDisplayConfig(): CustomerDisplayConfig {
  return {
    enabled: false,
    idleMode: 'logo',
    slideshowImages: [],
    slideshowIntervalSeconds: 8,
    showTipPrompt: true,
    tipPresets: [15, 18, 20, 25],
    showLoyaltyEnrollment: false,
    brandingMessage: 'Thank you for your visit!',
  };
}

// --- Device Health ---

export interface DeviceHealthSummary {
  total: number;
  online: number;
  offline: number;
  byType: { type: DeviceType; count: number }[];
  staleDevices: { id: string; name: string; lastSeenAt: string }[];
}

// --- DeviceHub Tab Navigation ---

export type DeviceHubTab = 'devices' | 'modes' | 'printer-profiles' | 'peripherals' | 'kiosk-profiles';

// --- Hardware Recommendations ---

export type HardwareTier = 'good' | 'better' | 'best';
export type HardwareCategory = 'tablet' | 'card_reader' | 'receipt_printer' | 'cash_drawer' | 'kitchen_display' | 'barcode_scanner' | 'label_printer' | 'customer_display';
export type ProcessorCompat = 'paypal' | 'both' | 'universal';

export interface HardwareProduct {
  id: string;
  name: string;
  category: HardwareCategory;
  tier: HardwareTier;
  price: number;
  description: string;
  whyRecommended: string;
  processorCompat: ProcessorCompat;
  buyUrl: string;
  icon: string;
}

export interface HardwareChecklist {
  category: HardwareCategory;
  label: string;
  icon: string;
  required: boolean;
}

// --- Factory Functions ---

export function defaultModeSettings(): DeviceModeSettings {
  return {
    checkout: {
      defaultOrderType: 'dine-in',
      requireTableSelection: true,
      skipPaymentScreen: false,
      autoSendToKds: true,
      showTipPrompt: true,
      tipPresets: [15, 18, 20, 25],
      autoProgressToPayment: false,
    },
    receipt: {
      autoPrintReceipt: true,
      autoPrintKitchenTicket: true,
      printerProfileId: null,
    },
    security: {
      requirePinPerTransaction: false,
      inactivityTimeoutMinutes: 5,
      lockOnSleep: true,
    },
    display: {
      fontSize: 'medium',
      showImages: true,
      gridColumns: 3,
      categoryDisplayMode: 'tabs',
    },
  };
}

export function defaultModeSettingsForPosMode(posMode: DevicePosMode): DeviceModeSettings {
  const base = defaultModeSettings();

  switch (posMode) {
    case 'quick_service':
      return {
        ...base,
        checkout: {
          ...base.checkout,
          defaultOrderType: 'takeout',
          requireTableSelection: false,
          skipPaymentScreen: false,
          showTipPrompt: true,
          autoProgressToPayment: true,
        },
        receipt: {
          ...base.receipt,
          autoPrintKitchenTicket: true,
        },
        display: {
          ...base.display,
          showImages: true,
          gridColumns: 3,
        },
      };

    case 'full_service':
      return {
        ...base,
        checkout: {
          ...base.checkout,
          defaultOrderType: 'dine-in',
          requireTableSelection: true,
          skipPaymentScreen: true,
          showTipPrompt: true,
        },
        receipt: {
          ...base.receipt,
          autoPrintKitchenTicket: true,
        },
        display: {
          ...base.display,
          showImages: true,
          gridColumns: 3,
        },
      };

    case 'bar':
      return {
        ...base,
        checkout: {
          ...base.checkout,
          defaultOrderType: 'dine-in',
          requireTableSelection: false,
          skipPaymentScreen: true,
          showTipPrompt: true,
        },
        receipt: {
          ...base.receipt,
          autoPrintKitchenTicket: true,
        },
        display: {
          ...base.display,
          showImages: false,
          gridColumns: 2,
        },
      };

    case 'retail':
      return {
        ...base,
        checkout: {
          ...base.checkout,
          defaultOrderType: 'takeout',
          requireTableSelection: false,
          skipPaymentScreen: false,
          showTipPrompt: false,
        },
        receipt: {
          ...base.receipt,
          autoPrintKitchenTicket: false,
        },
        display: {
          ...base.display,
          showImages: true,
          gridColumns: 4,
        },
      };

    default:
      return base;
  }
}
