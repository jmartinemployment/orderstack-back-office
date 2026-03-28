import { inject, Signal, computed, signal } from '@angular/core';
import { LaborService } from '../../services/labor';
import { PosSession } from '../../models/labor.model';

/**
 * Permission guard utility for checking POS session permissions.
 *
 * Usage in a component:
 *   private readonly permGuard = createPermissionGuard();
 *   readonly canVoid = this.permGuard.hasPermission('pos.void_items');
 *   readonly canDiscount = this.permGuard.hasPermission('pos.apply_discounts');
 *
 * For manager override flow:
 *   if (!this.permGuard.check('pos.void_items')) {
 *     // Show manager PIN prompt
 *   }
 */

export interface PermissionGuard {
  /** The current POS session (null if not logged in via POS) */
  readonly session: Signal<PosSession | null>;
  /** Whether a POS session is active */
  readonly isAuthenticated: Signal<boolean>;
  /** Returns a computed signal that is true when the permission is granted */
  hasPermission(key: string): Signal<boolean>;
  /** Synchronously checks a permission (returns false if no session) */
  check(key: string): boolean;
  /** Checks if any of the given permissions are granted */
  hasAnyPermission(keys: string[]): Signal<boolean>;
  /** Returns the current team member name */
  readonly currentName: Signal<string>;
  /** Returns the current role */
  readonly currentRole: Signal<string>;
}

export function createPermissionGuard(): PermissionGuard {
  const laborService = inject(LaborService);

  const session = laborService.posSession;

  const isAuthenticated = computed(() => session() !== null);

  const currentName = computed(() => session()?.teamMemberName ?? '');
  const currentRole = computed(() => session()?.role ?? '');

  function hasPermission(key: string): Signal<boolean> {
    return computed(() => {
      const s = session();
      if (!s) return false;
      return s.permissions[key] === true;
    });
  }

  function check(key: string): boolean {
    const s = session();
    if (!s) return false;
    return s.permissions[key] === true;
  }

  function hasAnyPermission(keys: string[]): Signal<boolean> {
    return computed(() => {
      const s = session();
      if (!s) return false;
      return keys.some(k => s.permissions[k] === true);
    });
  }

  return {
    session,
    isAuthenticated,
    hasPermission,
    check,
    hasAnyPermission,
    currentName,
    currentRole,
  };
}

/**
 * Manager override state for components that need PIN verification.
 * Use with ManagerPinPrompt component.
 */
export interface ManagerOverrideState {
  /** Whether the override prompt is visible */
  readonly showPrompt: Signal<boolean>;
  /** The permission key being overridden */
  readonly pendingPermission: Signal<string | null>;
  /** The callback to invoke on successful override */
  readonly onSuccess: Signal<(() => void) | null>;
  /** Request a manager override for the given permission */
  requestOverride(permissionKey: string, onSuccess: () => void): void;
  /** Cancel the override request */
  cancelOverride(): void;
  /** Complete the override (called after PIN verification) */
  completeOverride(): void;
}

export function createManagerOverride(): ManagerOverrideState {
  const _showPrompt = signal(false);
  const _pendingPermission = signal<string | null>(null);
  const _onSuccess = signal<(() => void) | null>(null);

  return {
    showPrompt: _showPrompt.asReadonly(),
    pendingPermission: _pendingPermission.asReadonly(),
    onSuccess: _onSuccess.asReadonly(),
    requestOverride(permissionKey: string, onSuccess: () => void): void {
      _pendingPermission.set(permissionKey);
      _onSuccess.set(onSuccess);
      _showPrompt.set(true);
    },
    cancelOverride(): void {
      _showPrompt.set(false);
      _pendingPermission.set(null);
      _onSuccess.set(null);
    },
    completeOverride(): void {
      const cb = _onSuccess();
      _showPrompt.set(false);
      _pendingPermission.set(null);
      _onSuccess.set(null);
      if (cb) cb();
    },
  };
}
