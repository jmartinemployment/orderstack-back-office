import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { StaffManagementService } from '../../../services/staff-management';
import { AuthService } from '../../../services/auth';
import {
  StaffManagementTab,
  StaffPinRecord,
  TeamMember,
  TeamMemberFormData,
  TeamMemberJobFormData,
  PermissionSet,
  PermissionSetFormData,
  PermissionCategory,
  PERMISSION_DEFINITIONS,
} from '../../../models/staff-management.model';

@Component({
  selector: 'os-staff-management',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './staff-management.html',
  styleUrl: './staff-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffManagement {
  private readonly fb = inject(FormBuilder);
  private readonly staffService = inject(StaffManagementService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly canManagePins = this.staffService.canManagePins;
  readonly pins = this.staffService.pins;
  readonly isLoading = this.staffService.isLoading;
  readonly error = this.staffService.error;
  readonly currentUser = this.authService.user;

  private readonly _activeTab = signal<StaffManagementTab>('team-members');
  readonly activeTab = this._activeTab.asReadonly();

  private readonly _showPinForm = signal(false);
  private readonly _editingPin = signal<StaffPinRecord | null>(null);
  private readonly _showPasswordForm = signal(false);
  private readonly _showConfirmDeactivate = signal<string | null>(null);
  private readonly _isSaving = signal(false);
  private readonly _successMessage = signal<string | null>(null);
  private readonly _togglingWfh = signal<string | null>(null);

  readonly showPinForm = this._showPinForm.asReadonly();
  readonly editingPin = this._editingPin.asReadonly();
  readonly showPasswordForm = this._showPasswordForm.asReadonly();
  readonly showConfirmDeactivate = this._showConfirmDeactivate.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly successMessage = this._successMessage.asReadonly();
  readonly togglingWfh = this._togglingWfh.asReadonly();

  readonly activePins = computed(() => this.pins().filter(p => p.isActive));

  // --- Team Members ---
  readonly teamMembers = this.staffService.teamMembers;
  readonly permissionSets = this.staffService.permissionSets;

  readonly activeTeamMembers = computed(() => this.teamMembers().filter(m => m.status === 'active'));
  readonly inactiveTeamMembers = computed(() => this.teamMembers().filter(m => m.status !== 'active'));

  private readonly _showTeamMemberForm = signal(false);
  private readonly _editingTeamMember = signal<TeamMember | null>(null);
  private readonly _tmFormName = signal('');
  private readonly _tmFormEmail = signal('');
  private readonly _tmFormPhone = signal('');
  private readonly _tmFormPasscode = signal('');
  private readonly _tmFormPassword = signal('');
  private readonly _tmFormTempPasswordHours = signal(4);
  private readonly _tmFormPermissionSetId = signal<string | null>(null);
  private readonly _tmFormHireDate = signal('');
  private readonly _tmFormJobs = signal<TeamMemberJobFormData[]>([{ jobTitle: '', hourlyRate: 0, isTipEligible: false, isPrimary: true, overtimeEligible: true }]);

  readonly showTeamMemberForm = this._showTeamMemberForm.asReadonly();
  readonly editingTeamMember = this._editingTeamMember.asReadonly();
  readonly tmFormName = this._tmFormName.asReadonly();
  readonly tmFormEmail = this._tmFormEmail.asReadonly();
  readonly tmFormPhone = this._tmFormPhone.asReadonly();
  readonly tmFormPasscode = this._tmFormPasscode.asReadonly();
  readonly tmFormPassword = this._tmFormPassword.asReadonly();
  readonly tmFormTempPasswordHours = this._tmFormTempPasswordHours.asReadonly();
  readonly tmFormPermissionSetId = this._tmFormPermissionSetId.asReadonly();
  readonly tmFormHireDate = this._tmFormHireDate.asReadonly();
  readonly tmFormJobs = this._tmFormJobs.asReadonly();

  // --- Permission Sets ---
  private readonly _showPermissionForm = signal(false);
  private readonly _editingPermissionSet = signal<PermissionSet | null>(null);
  private readonly _psFormName = signal('');
  private readonly _psFormPermissions = signal<Record<string, boolean>>({});

  readonly showPermissionForm = this._showPermissionForm.asReadonly();
  readonly editingPermissionSet = this._editingPermissionSet.asReadonly();
  readonly psFormName = this._psFormName.asReadonly();
  readonly psFormPermissions = this._psFormPermissions.asReadonly();

  readonly permissionCategories: PermissionCategory[] = ['administration', 'pos', 'menu', 'timeclock', 'team', 'reporting', 'settings'];
  readonly permissionDefinitions = PERMISSION_DEFINITIONS;

  readonly pinForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    pin: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
    role: ['staff', Validators.required],
  });

  readonly editPinForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    role: ['staff', Validators.required],
    newPin: [''],
  });

  readonly passwordForm = this.fb.group({
    oldPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  private readonly _menuLoaded = signal(false);

  constructor() {
    effect(() => {
      const merchantId = this.authService.selectedMerchantId();
      if (this.isAuthenticated() && merchantId && !this._menuLoaded()) {
        this._menuLoaded.set(true);
        if (this.canManagePins()) {
          this.staffService.loadPins();
        }
        this.staffService.loadTeamMembers();
        this.loadPermissionSetsWithAutoSeed();
      }
    });
  }

  private async loadPermissionSetsWithAutoSeed(): Promise<void> {
    await this.staffService.loadPermissionSets();
    if (this.staffService.permissionSets().length === 0) {
      await this.staffService.seedDefaultPermissionSets();
    }
  }

  setTab(tab: StaffManagementTab): void {
    this._activeTab.set(tab);
  }

  // ============ PIN CRUD ============

  openCreatePin(): void {
    this._editingPin.set(null);
    this.pinForm.reset({ role: 'staff' });
    this._showPinForm.set(true);
  }

  openEditPin(pin: StaffPinRecord): void {
    this._editingPin.set(pin);
    this.editPinForm.patchValue({
      name: pin.name,
      role: pin.role,
      newPin: '',
    });
    this._showPinForm.set(true);
  }

  closePinForm(): void {
    this._showPinForm.set(false);
    this._editingPin.set(null);
  }

  async savePin(): Promise<void> {
    if (this._editingPin()) {
      await this.updatePin();
    } else {
      await this.createPin();
    }
  }

  private async createPin(): Promise<void> {
    if (this.pinForm.invalid || this._isSaving()) return;
    this._isSaving.set(true);
    const v = this.pinForm.value;
    const success = await this.staffService.createPin({
      name: v.name!,
      pin: v.pin!,
      role: v.role!,
    });
    this._isSaving.set(false);
    if (success) {
      this.closePinForm();
      this.showSuccess('PIN created successfully');
    }
  }

  private async updatePin(): Promise<void> {
    if (this.editPinForm.invalid || this._isSaving() || !this._editingPin()) return;
    this._isSaving.set(true);
    const v = this.editPinForm.value;
    const data: any = { name: v.name, role: v.role };
    if (v.newPin && v.newPin.length >= 4) {
      data.newPin = v.newPin;
    }
    const editingPin = this._editingPin();
    if (!editingPin) return;
    const success = await this.staffService.updatePin(editingPin.id, data);
    this._isSaving.set(false);
    if (success) {
      this.closePinForm();
      this.showSuccess('PIN updated successfully');
    }
  }

  confirmDeactivatePin(pinId: string): void {
    this._showConfirmDeactivate.set(pinId);
  }

  async deactivatePin(pinId: string): Promise<void> {
    this._isSaving.set(true);
    const success = await this.staffService.deactivatePin(pinId);
    this._isSaving.set(false);
    this._showConfirmDeactivate.set(null);
    if (success) this.showSuccess('PIN deactivated');
  }

  // ============ Password Change ============

  openPasswordForm(): void {
    this.passwordForm.reset();
    this._showPasswordForm.set(true);
  }

  closePasswordForm(): void {
    this._showPasswordForm.set(false);
  }

  async changePassword(): Promise<void> {
    if (this.passwordForm.invalid || this._isSaving()) return;
    const v = this.passwordForm.value;
    if (v.newPassword !== v.confirmPassword) {
      this.staffService.clearError();
      return;
    }
    this._isSaving.set(true);
    const success = await this.staffService.changePassword({
      oldPassword: v.oldPassword!,
      newPassword: v.newPassword!,
    });
    this._isSaving.set(false);
    if (success) {
      this.closePasswordForm();
      this.showSuccess('Password changed successfully');
    }
  }

  passwordsMatch(): boolean {
    const v = this.passwordForm.value;
    return v.newPassword === v.confirmPassword;
  }

  // ============ Helpers ============

  private showSuccess(message: string): void {
    this._successMessage.set(message);
    setTimeout(() => this._successMessage.set(null), 3000);
  }

  clearError(): void {
    this.staffService.clearError();
  }

  getPositionColor(name: string): string {
    const colors = ['#7E5EF2', '#3632A6', '#1D3273', '#0d6efd', '#198754', '#dc3545', '#ffc107', '#6f42c1', '#20c997', '#fd7e14'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (name.codePointAt(i) ?? 0) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getEnabledPermissionCount(ps: PermissionSet): number {
    return Object.values(ps.permissions).filter(Boolean).length;
  }

  // ============ Team Member CRUD ============

  openCreateTeamMember(): void {
    this._editingTeamMember.set(null);
    this._tmFormName.set('');
    this._tmFormEmail.set('');
    this._tmFormPhone.set('');
    this._tmFormPasscode.set('');
    this._tmFormPassword.set('');
    this._tmFormTempPasswordHours.set(4);
    this._tmFormPermissionSetId.set(null);
    this._tmFormHireDate.set('');
    this._tmFormJobs.set([{ jobTitle: '', hourlyRate: 0, isTipEligible: false, isPrimary: true, overtimeEligible: true }]);
    this._showTeamMemberForm.set(true);
  }

  openEditTeamMember(member: TeamMember): void {
    this._editingTeamMember.set(member);
    this._tmFormName.set(member.displayName);
    this._tmFormEmail.set(member.email ?? '');
    this._tmFormPhone.set(member.phone ?? '');
    this._tmFormPasscode.set('');
    this._tmFormPassword.set('');
    this._tmFormTempPasswordHours.set(4);
    this._tmFormPermissionSetId.set(member.permissionSetId);
    this._tmFormHireDate.set(member.hireDate ?? '');
    this._tmFormJobs.set(member.jobs.map(j => ({
      jobTitle: j.jobTitle,
      hourlyRate: j.hourlyRate,
      isTipEligible: j.isTipEligible,
      isPrimary: j.isPrimary,
      overtimeEligible: j.overtimeEligible,
    })));
    this._showTeamMemberForm.set(true);
  }

  closeTeamMemberForm(): void {
    this._showTeamMemberForm.set(false);
    this._editingTeamMember.set(null);
  }

  setTmField(field: 'name' | 'email' | 'phone' | 'passcode' | 'password' | 'hireDate', value: string): void {
    switch (field) {
      case 'name': this._tmFormName.set(value); break;
      case 'email': this._tmFormEmail.set(value); break;
      case 'phone': this._tmFormPhone.set(value); break;
      case 'passcode': this._tmFormPasscode.set(value); break;
      case 'password': this._tmFormPassword.set(value); break;
      case 'hireDate': this._tmFormHireDate.set(value); break;
    }
  }

  setTmTempPasswordHours(value: number): void {
    this._tmFormTempPasswordHours.set(value);
  }

  setTmPermissionSet(id: string): void {
    this._tmFormPermissionSetId.set(id);
  }

  addJobRow(): void {
    this._tmFormJobs.update(jobs => [...jobs, { jobTitle: '', hourlyRate: 0, isTipEligible: false, isPrimary: false, overtimeEligible: true }]);
  }

  removeJobRow(index: number): void {
    this._tmFormJobs.update(jobs => jobs.filter((_, i) => i !== index));
  }

  updateJobField(index: number, field: keyof TeamMemberJobFormData, value: string | number | boolean): void {
    this._tmFormJobs.update(jobs => jobs.map((j, i) => i === index ? { ...j, [field]: value } : j));
  }

  async saveTeamMember(): Promise<void> {
    const name = this._tmFormName().trim();
    if (!name || this._isSaving()) return;

    const password = this._tmFormPassword().trim();

    const data: TeamMemberFormData = {
      displayName: name,
      email: this._tmFormEmail().trim() || undefined,
      phone: this._tmFormPhone().trim() || undefined,
      passcode: this._tmFormPasscode().trim() || undefined,
      password: password || undefined,
      tempPasswordExpiresInHours: password ? this._tmFormTempPasswordHours() : undefined,
      permissionSetId: this._tmFormPermissionSetId() ?? undefined,
      hireDate: this._tmFormHireDate() || undefined,
      jobs: this._tmFormJobs().filter(j => j.jobTitle.trim()),
    };

    this._isSaving.set(true);

    const editing = this._editingTeamMember();
    let success: boolean;
    if (editing) {
      success = await this.staffService.updateTeamMember(editing.id, data);
    } else {
      success = await this.staffService.createTeamMember(data);
    }

    this._isSaving.set(false);

    if (success) {
      this.closeTeamMemberForm();
      this.showSuccess(editing ? 'Team member updated' : 'Team member created');
    }
  }

  async toggleWorkFromHome(member: TeamMember): Promise<void> {
    const currentUser = this.currentUser();
    // Owner's own workFromHome cannot be set to false (would lock them out)
    if (member.role === 'owner' && currentUser?.id === member.id && member.workFromHome) {
      return;
    }
    this._togglingWfh.set(member.id);
    await this.staffService.updateWorkFromHome(member.id, !member.workFromHome);
    this._togglingWfh.set(null);
  }

  async deactivateTeamMember(id: string): Promise<void> {
    this._isSaving.set(true);
    const success = await this.staffService.deactivateTeamMember(id);
    this._isSaving.set(false);
    this._showConfirmDeactivate.set(null);
    if (success) this.showSuccess('Team member deactivated');
  }

  confirmDeactivateTeamMember(id: string): void {
    this._showConfirmDeactivate.set(id);
  }

  getPermissionSetName(id: string | null): string {
    if (!id) return 'None';
    return this.permissionSets().find(ps => ps.id === id)?.name ?? 'Unknown';
  }

  getJobsSummary(member: TeamMember): string {
    return member.jobs.map(j => j.jobTitle).join(', ') || 'No jobs';
  }

  // ============ Permission Set CRUD ============

  openCreatePermissionSet(): void {
    this._editingPermissionSet.set(null);
    this._psFormName.set('');
    const defaults: Record<string, boolean> = {};
    for (const perm of PERMISSION_DEFINITIONS) {
      defaults[perm.key] = false;
    }
    this._psFormPermissions.set(defaults);
    this._showPermissionForm.set(true);
  }

  openEditPermissionSet(ps: PermissionSet): void {
    this._editingPermissionSet.set(ps);
    this._psFormName.set(ps.name);
    const perms: Record<string, boolean> = {};
    for (const perm of PERMISSION_DEFINITIONS) {
      perms[perm.key] = ps.permissions[perm.key] ?? false;
    }
    this._psFormPermissions.set(perms);
    this._showPermissionForm.set(true);
  }

  closePermissionForm(): void {
    this._showPermissionForm.set(false);
    this._editingPermissionSet.set(null);
  }

  setPsName(name: string): void {
    this._psFormName.set(name);
  }

  togglePermission(key: string): void {
    this._psFormPermissions.update(p => ({ ...p, [key]: !p[key] }));
  }

  getPermissionsByCategory(category: PermissionCategory): typeof PERMISSION_DEFINITIONS {
    return PERMISSION_DEFINITIONS.filter(p => p.category === category);
  }

  getCategoryLabel(category: PermissionCategory): string {
    const labels: Record<PermissionCategory, string> = {
      administration: 'Administration',
      pos: 'POS',
      menu: 'Menu',
      timeclock: 'Time Clock',
      team: 'Team',
      reporting: 'Reporting',
      settings: 'Settings',
    };
    return labels[category];
  }

  async savePermissionSet(): Promise<void> {
    const name = this._psFormName().trim();
    if (!name || this._isSaving()) return;

    const data: PermissionSetFormData = {
      name,
      permissions: this._psFormPermissions(),
    };

    this._isSaving.set(true);

    const editing = this._editingPermissionSet();
    let success: boolean;
    if (editing) {
      success = await this.staffService.updatePermissionSet(editing.id, data);
    } else {
      success = await this.staffService.createPermissionSet(data);
    }

    this._isSaving.set(false);

    if (success) {
      this.closePermissionForm();
      this.showSuccess(editing ? 'Permission set updated' : 'Permission set created');
    }
  }

  async deletePermissionSet(id: string): Promise<void> {
    this._isSaving.set(true);
    const success = await this.staffService.deletePermissionSet(id);
    this._isSaving.set(false);
    this._showConfirmDeactivate.set(null);
    if (success) this.showSuccess('Permission set deleted');
  }

  confirmDeletePermissionSet(id: string): void {
    this._showConfirmDeactivate.set(id);
  }

  cancelDeactivate(): void {
    this._showConfirmDeactivate.set(null);
  }
}
