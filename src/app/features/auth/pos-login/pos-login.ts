import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  output,
  DestroyRef,
  afterNextRender,
} from '@angular/core';
import { Router } from '@angular/router';
import { LaborService } from '../../../services/labor';
import { StaffManagementService } from '../../../services/staff-management';
import { AuthService } from '../../../services/auth';
import { DeviceService } from '../../../services/device';
import { PlatformService } from '../../../services/platform';
import { RestaurantSettingsService } from '../../../services/restaurant-settings';
import { TeamMember, PosSession, Timecard, Shift } from '../../../models/index';

export interface PosLoginEvent {
  teamMember: TeamMember;
  session: PosSession;
}

type PosLoginState = 'idle' | 'entering-passcode' | 'clock-in-prompt';

@Component({
  selector: 'os-pos-login',
  standalone: true,
  imports: [],
  templateUrl: './pos-login.html',
  styleUrl: './pos-login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosLogin {
  private readonly router = inject(Router);
  private readonly laborService = inject(LaborService);
  private readonly staffService = inject(StaffManagementService);
  private readonly authService = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly platformService = inject(PlatformService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly teamMemberAuthenticated = output<PosLoginEvent>();

  // --- State ---
  private readonly _state = signal<PosLoginState>('idle');
  private readonly _teamMembers = signal<TeamMember[]>([]);
  private readonly _selectedMember = signal<TeamMember | null>(null);
  private readonly _passcodeDigits = signal('');
  private readonly _error = signal<string | null>(null);
  private readonly _isValidating = signal(false);
  private readonly _failedAttempts = signal(0);
  private readonly _lockoutUntil = signal<number | null>(null);
  private readonly _session = signal<PosSession | null>(null);
  private readonly _activeTimecard = signal<Timecard | null>(null);
  private readonly _selectedJobTitle = signal<string | null>(null);
  private readonly _isClockingIn = signal(false);

  // --- Schedule enforcement ---
  private readonly _scheduleWarning = signal<string | null>(null);
  private readonly _showManagerOverride = signal(false);
  private readonly _managerOverridePin = signal('');
  private readonly _todayShifts = signal<Shift[]>([]);

  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_MS = 30 * 1000;

  readonly state = this._state.asReadonly();
  readonly teamMembers = this._teamMembers.asReadonly();
  readonly selectedMember = this._selectedMember.asReadonly();
  readonly passcodeDigits = this._passcodeDigits.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isValidating = this._isValidating.asReadonly();
  readonly session = this._session.asReadonly();
  readonly activeTimecard = this._activeTimecard.asReadonly();
  readonly selectedJobTitle = this._selectedJobTitle.asReadonly();
  readonly isClockingIn = this._isClockingIn.asReadonly();
  readonly scheduleWarning = this._scheduleWarning.asReadonly();
  readonly showManagerOverride = this._showManagerOverride.asReadonly();
  readonly managerOverridePin = this._managerOverridePin.asReadonly();

  readonly isLocked = computed(() => {
    const until = this._lockoutUntil();
    return until !== null && Date.now() < until;
  });

  readonly lockoutSecondsRemaining = computed(() => {
    const until = this._lockoutUntil();
    if (until === null) return 0;
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  });

  readonly passcodeLength = computed(() => {
    const member = this._selectedMember();
    return member?.passcode?.length ?? 4;
  });

  readonly passcodeDots = computed(() => {
    const len = this._passcodeDigits().length;
    return Array.from({ length: this.passcodeLength() }, (_, i) => i < len);
  });

  readonly activeTeamMembers = computed(() =>
    this._teamMembers().filter(m => m.status === 'active' && m.role !== 'owner')
  );

  readonly memberJobs = computed(() => {
    const member = this._selectedMember();
    return member?.jobs ?? [];
  });

  readonly needsJobSelection = computed(() => this.memberJobs().length > 1);

  constructor() {
    afterNextRender(() => {
      this.loadTeamMembers();
    });
  }

  private async loadTeamMembers(): Promise<void> {
    await this.staffService.loadTeamMembers();
    const members = this.staffService.teamMembers();

    if (members.length > 0) {
      this._teamMembers.set(members);
      return;
    }

    // No team members from API — seed owner from onboarding data
    const raw = localStorage.getItem('onboarding-payload');
    if (raw) {
      try {
        const payload = JSON.parse(raw) as { ownerPin?: { displayName: string; pin: string; role: string }; ownerEmail?: string };
        if (payload.ownerPin) {
          const ownerMember: TeamMember = {
            id: 'owner-local',
            merchantId: this.authService.selectedMerchantId() ?? '',
            displayName: payload.ownerPin.displayName,
            email: payload.ownerEmail ?? null,
            phone: null,
            passcode: payload.ownerPin.pin,
            firstName: null,
            lastName: null,
            role: 'owner',
            isActive: true,
            lastLoginAt: null,
            jobs: [{
              id: 'owner-job',
              teamMemberId: 'owner-local',
              jobTitle: 'Owner',
              hourlyRate: 0,
              isTipEligible: false,
              isPrimary: true,
              overtimeEligible: false,
            }],
            permissionSetId: null,
            permissionSetName: null,
            assignedLocationIds: [],
            avatarUrl: null,
            hireDate: null,
            status: 'active',
            createdAt: new Date().toISOString(),
            staffPinId: null,
            taxInfo: null,
            workFromHome: false,
          };
          this._teamMembers.set([ownerMember]);
        }
      } catch {
        // Corrupt onboarding data
      }
    }
  }

  // === Team Member Selection ===

  selectMember(member: TeamMember): void {
    if (this.isLocked()) return;

    this._selectedMember.set(member);
    this._passcodeDigits.set('');
    this._error.set(null);
    this._state.set('entering-passcode');
  }

  backToGrid(): void {
    this._selectedMember.set(null);
    this._passcodeDigits.set('');
    this._error.set(null);
    this._state.set('idle');
  }

  // === Passcode Entry ===

  onDigit(digit: string): void {
    if (this.isLocked() || this._isValidating()) return;

    const maxLen = this.passcodeLength();
    const current = this._passcodeDigits();
    if (current.length >= maxLen) return;

    const updated = current + digit;
    this._passcodeDigits.set(updated);
    this._error.set(null);

    if (updated.length === maxLen) {
      this.attemptLogin(updated);
    }
  }

  onBackspace(): void {
    this._passcodeDigits.update(d => d.slice(0, -1));
    this._error.set(null);
  }

  onClear(): void {
    this._passcodeDigits.set('');
    this._error.set(null);
  }

  private async attemptLogin(passcode: string): Promise<void> {
    this._isValidating.set(true);
    this._error.set(null);

    const member = this._selectedMember();
    if (!member?.staffPinId) {
      this._error.set('No staff PIN configured for this member');
      this._isValidating.set(false);
      return;
    }

    const session = await this.laborService.posLogin(passcode, member.staffPinId);

    if (session) {
      this._session.set(session);
      this._failedAttempts.set(0);
      this._lockoutUntil.set(null);

      if (session.clockedIn && session.activeTimecardId) {
        const timecard = await this.laborService.getTimecard(session.activeTimecardId);
        this._activeTimecard.set(timecard);
        this.completeAuthentication();
      } else {
        this._state.set('clock-in-prompt');
      }
    } else {
      const attempts = this._failedAttempts() + 1;
      this._failedAttempts.set(attempts);

      if (attempts >= this.MAX_ATTEMPTS) {
        this._lockoutUntil.set(Date.now() + this.LOCKOUT_MS);
        this._error.set(`Too many attempts. Locked for ${this.LOCKOUT_MS / 1000}s.`);
        this._state.set('idle');
        this._selectedMember.set(null);

        setTimeout(() => {
          this._lockoutUntil.set(null);
          this._failedAttempts.set(0);
          this._error.set(null);
        }, this.LOCKOUT_MS);
      } else {
        this._error.set(`Invalid passcode (${this.MAX_ATTEMPTS - attempts} attempts remaining)`);
      }

      this._passcodeDigits.set('');
    }

    this._isValidating.set(false);
  }

  // === Clock-In Flow ===

  selectJob(jobTitle: string): void {
    this._selectedJobTitle.set(jobTitle);
  }

  async clockInAndProceed(): Promise<void> {
    const session = this._session();
    if (!session) return;

    // Schedule enforcement check
    const tcSettings = this.settingsService.timeclockSettings();
    if (tcSettings.scheduleEnforcementEnabled) {
      await this.loadTodayShifts();
      const blockReason = this.checkScheduleEnforcement(tcSettings.earlyClockInGraceMinutes);
      if (blockReason) {
        if (tcSettings.allowManagerOverride) {
          this._scheduleWarning.set(blockReason);
          this._showManagerOverride.set(true);
          return;
        }
        this._error.set(blockReason);
        return;
      }
    }

    await this.executeClockIn();
  }

  private async executeClockIn(): Promise<void> {
    const session = this._session();
    if (!session) return;

    this._isClockingIn.set(true);
    this._error.set(null);

    const jobTitle = this._selectedJobTitle() ?? this.memberJobs()[0]?.jobTitle;
    const timecard = await this.laborService.clockInWithJob(session.staffPinId, jobTitle);

    if (timecard) {
      this._activeTimecard.set(timecard);
      this.completeAuthentication();
    } else {
      this._error.set('Failed to clock in. Please try again.');
    }

    this._isClockingIn.set(false);
  }

  private completeAuthentication(): void {
    const member = this._selectedMember();
    const session = this._session();
    if (!member || !session) return;

    // Push state to LaborService so the shared ClockOut component can read it
    this.laborService.setActiveTeamMember(member);
    this.laborService.setActiveTimecard(this._activeTimecard());

    this.teamMemberAuthenticated.emit({ teamMember: member, session });
    this.navigateToLanding();
  }

  // === Schedule Enforcement ===

  private async loadTodayShifts(): Promise<void> {
    const member = this._selectedMember();
    if (!member) return;

    const today = this.formatDate(new Date());
    const shifts = await this.laborService.loadStaffShifts(member.id, today, today);
    this._todayShifts.set(shifts);
  }

  private checkScheduleEnforcement(graceMinutes: number): string | null {
    const todayShifts = this._todayShifts();

    if (todayShifts.length === 0) {
      return 'No scheduled shift found for today. Clock-in requires a scheduled shift.';
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const hasUpcoming = todayShifts.some(s => {
      const [h, m] = s.startTime.split(':').map(Number);
      const shiftStart = h * 60 + m;
      return nowMinutes >= (shiftStart - graceMinutes);
    });

    if (!hasUpcoming) {
      return `Too early to clock in. Your shift doesn't start for more than ${graceMinutes} minutes.`;
    }

    return null;
  }

  setManagerOverridePin(pin: string): void {
    this._managerOverridePin.set(pin);
  }

  async submitManagerOverride(): Promise<void> {
    const pin = this._managerOverridePin();
    if (pin.length < 4) return;

    this._isClockingIn.set(true);
    const staff = await this.laborService.validateStaffPin(pin);

    if (staff && staff.permissions?.['team.manage'] === true) {
      this._showManagerOverride.set(false);
      this._scheduleWarning.set(null);
      this._managerOverridePin.set('');
      await this.executeClockIn();
    } else {
      this._error.set('Invalid manager PIN');
      this._managerOverridePin.set('');
    }

    this._isClockingIn.set(false);
  }

  cancelManagerOverride(): void {
    this._showManagerOverride.set(false);
    this._scheduleWarning.set(null);
    this._managerOverridePin.set('');
  }

  private navigateToLanding(): void {
    // Device type takes priority — paired devices route to their dedicated screen
    const device = this.deviceService.currentDevice();
    if (device?.deviceType) {
      switch (device.deviceType) {
        case 'kds':
          this.router.navigate(['/kds']);
          return;
        case 'kiosk':
          this.router.navigate(['/kiosk']);
          return;
        case 'printer':
          this.router.navigate([this.authService.getPostAuthRoute()]);
          return;
        case 'register':
        case 'terminal':
          break; // Fall through to posMode logic
      }
    }

    // Job title overrides posMode when the role maps to a specific terminal
    const jobTitle = (this._selectedJobTitle() ?? this.memberJobs()[0]?.jobTitle ?? '').toLowerCase();
    const jobRoute = this.routeForJob(jobTitle);
    if (jobRoute) {
      this.router.navigate([jobRoute]);
      return;
    }

    // Fall back to posMode-based routing
    const posMode = this.platformService.currentDeviceMode();

    switch (posMode) {
      case 'full_service':
        this.router.navigate(['/floor-plan']);
        break;
      case 'quick_service':
        this.router.navigate(['/pos']);
        break;
      case 'bar':
        this.router.navigate(['/bar']);
        break;
      case 'bookings':
        this.router.navigate(['/bookings-terminal']);
        break;
      case 'services':
        this.router.navigate(['/app/invoicing']);
        break;
      default:
        this.router.navigate(['/app/orders']);
        break;
    }
  }

  private routeForJob(jobTitle: string): string | null {
    if (jobTitle.includes('bartender') || jobTitle.includes('barback')) return '/bar';
    if (jobTitle.includes('server') || jobTitle.includes('waiter') || jobTitle.includes('waitress')) return '/floor-plan';
    if (jobTitle.includes('cashier')) return '/pos';
    if (jobTitle.includes('host')) return '/floor-plan';
    return null;
  }

  // === Helpers ===

  dismissError(): void {
    this._error.set(null);
  }

  getInitials(name: string): string {
    const cleaned = name.replaceAll(/\s*\([^)]*\)/g, '').trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    return parts.map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getAvatarColor(name: string): string {
    const colors = ['#7c5cfc', '#e74c3c', '#2ecc71', '#f39c12', '#3498db', '#9b59b6', '#1abc9c', '#e67e22'];
    let hash = 0;
    for (const char of name) {
      hash = (char.codePointAt(0) ?? 0) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
