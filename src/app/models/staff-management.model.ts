import { UserRole } from './auth.model';

export type StaffManagementTab = 'team-members' | 'permissions' | 'pins';

export interface StaffPinRecord {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface StaffPinFormData {
  name: string;
  pin: string;
  role: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

// --- Team Member types ---

export type TeamMemberStatus = 'active' | 'inactive' | 'terminated';

export interface TeamMemberJob {
  id: string;
  teamMemberId: string;
  jobTitle: string;
  hourlyRate: number;
  isTipEligible: boolean;
  isPrimary: boolean;
  overtimeEligible: boolean;
}

export interface TeamMemberJobFormData {
  jobTitle: string;
  hourlyRate: number;
  isTipEligible: boolean;
  isPrimary: boolean;
  overtimeEligible: boolean;
}

export interface TeamMember {
  id: string;
  merchantId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  passcode: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  jobs: TeamMemberJob[];
  permissionSetId: string | null;
  permissionSetName: string | null;
  assignedLocationIds: string[];
  avatarUrl: string | null;
  hireDate: string | null;
  status: TeamMemberStatus;
  createdAt: string;
  staffPinId: string | null;
  workFromHome: boolean;
  taxInfo: StaffTaxInfo | null;
}

export type TaxFilingStatus = 'single' | 'married_jointly' | 'married_separately' | 'head_of_household' | 'qualifying_widow';

export interface StaffTaxInfo {
  filingStatus: TaxFilingStatus;
  multipleJobs: boolean;
  qualifyingChildrenAmount: number;
  otherDependentsAmount: number;
  otherIncome: number;
  deductions: number;
  extraWithholding: number;
  state: string;
}

export interface TeamMemberFormData {
  displayName: string;
  email?: string;
  phone?: string;
  passcode?: string;
  password?: string;
  tempPasswordExpiresInHours?: number;
  permissionSetId?: string;
  assignedLocationIds?: string[];
  hireDate?: string;
  jobs: TeamMemberJobFormData[];
  taxInfo?: StaffTaxInfo;
}

// --- Permission Sets ---

export type PermissionCategory =
  | 'administration'
  | 'pos'
  | 'menu'
  | 'timeclock'
  | 'team'
  | 'reporting'
  | 'settings';

export interface PermissionDefinition {
  key: string;
  label: string;
  category: PermissionCategory;
  description: string;
}

export interface PermissionSet {
  id: string;
  merchantId: string;
  name: string;
  permissions: Record<string, boolean>;
  isDefault: boolean;
  createdAt: string;
}

export interface PermissionSetFormData {
  name: string;
  permissions: Record<string, boolean>;
  isDefault?: boolean;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Administration
  { key: 'administration.access', label: 'Administration Access', category: 'administration', description: 'Access the administration dashboard' },
  // POS
  { key: 'pos.take_orders', label: 'Take Orders', category: 'pos', description: 'Create and modify orders' },
  { key: 'pos.apply_discounts', label: 'Apply Discounts', category: 'pos', description: 'Apply discounts to orders' },
  { key: 'pos.void_items', label: 'Void Items', category: 'pos', description: 'Void items from orders' },
  { key: 'pos.process_refunds', label: 'Process Refunds', category: 'pos', description: 'Issue refunds on payments' },
  { key: 'pos.open_cash_drawer', label: 'Open Cash Drawer', category: 'pos', description: 'Open the cash drawer' },
  { key: 'pos.manage_tabs', label: 'Manage Tabs', category: 'pos', description: 'Open and close tabs' },
  // Menu
  { key: 'menu.view', label: 'View Menu', category: 'menu', description: 'View menu items and categories' },
  { key: 'menu.edit_items', label: 'Edit Items', category: 'menu', description: 'Create and edit menu items' },
  { key: 'menu.edit_prices', label: 'Edit Prices', category: 'menu', description: 'Change menu item prices' },
  { key: 'menu.eighty_six', label: '86 Items', category: 'menu', description: 'Mark items as sold out' },
  // Time Clock
  { key: 'timeclock.clock_in_out', label: 'Clock In/Out', category: 'timeclock', description: 'Clock in and out' },
  { key: 'timeclock.manage_breaks', label: 'Manage Breaks', category: 'timeclock', description: 'Start and end breaks' },
  { key: 'timeclock.edit_timecards', label: 'Edit Timecards', category: 'timeclock', description: 'Edit own timecards' },
  { key: 'timeclock.approve_edits', label: 'Approve Edits', category: 'timeclock', description: 'Approve timecard edit requests' },
  // Team
  { key: 'team.view', label: 'View Team', category: 'team', description: 'View team members' },
  { key: 'team.manage', label: 'Manage Team', category: 'team', description: 'Add and edit team members' },
  { key: 'team.manage_permissions', label: 'Manage Permissions', category: 'team', description: 'Edit permission sets' },
  // Reporting
  { key: 'reporting.view_sales', label: 'View Sales', category: 'reporting', description: 'Access sales reports' },
  { key: 'reporting.view_labor', label: 'View Labor', category: 'reporting', description: 'Access labor reports' },
  { key: 'reporting.view_inventory', label: 'View Inventory', category: 'reporting', description: 'Access inventory reports' },
  { key: 'reporting.close_of_day', label: 'Close of Day', category: 'reporting', description: 'Run close-of-day reports' },
  // Settings
  { key: 'settings.view', label: 'View Settings', category: 'settings', description: 'View restaurant settings' },
  { key: 'settings.edit', label: 'Edit Settings', category: 'settings', description: 'Modify restaurant settings' },
  { key: 'settings.manage_devices', label: 'Manage Devices', category: 'settings', description: 'Register and manage devices' },
];

// --- Device Registration ---

export type DeviceStatus = 'pending' | 'active' | 'revoked';

export interface DeviceRegistration {
  id: string;
  deviceCode: string;
  deviceName: string;
  locationId: string | null;
  locationName: string | null;
  teamMemberId: string | null;
  status: DeviceStatus;
  pairedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface DeviceRegistrationFormData {
  deviceName: string;
  locationId?: string;
}
