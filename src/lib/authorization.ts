/**
 * M1-29.10 — Server Guards (étendu)
 * 
 * Toute opération sensible doit vérifier côté serveur:
 *   session → actor → platform role / school membership → permission → resource scope
 *
 * Ne JAMAIS considérer le masquage d'un bouton comme une autorisation.
 */

import type {
  PlatformRole,
  SchoolRole,
  Permission,
  AuthorizationResult,
  SchoolMembership,
} from './types/rbac';
import { platformRoleHasPermission, schoolRoleHasPermission } from './permissions';

// ─────────────────────────────────────────────
// Erreurs d'autorisation (M1-29.10 — 7 codes)
// ─────────────────────────────────────────────

export type AuthorizationErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'DATABASE_UNAVAILABLE'
  | 'MIGRATION_REQUIRED'
  | 'GHOST_SESSION_EXPIRED'
  | 'GHOST_CONFIGURATION_ERROR';

export class AuthorizationError extends Error {
  constructor(
    public readonly code: AuthorizationErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AuthorizationError';
  }
}

// ─────────────────────────────────────────────
// Permission checks (R-V2-UI-02 — conservés)
// ─────────────────────────────────────────────

/**
 * Vérifie qu'un acteur a une permission donnée.
 * GHOST a toutes les permissions.
 * SUPER_ADMIN a toutes les permissions.
 */
export function checkPermission(
  platformRole: PlatformRole,
  schoolRole: SchoolRole | null,
  permission: Permission,
): boolean {
  if (platformRole === 'ghost') return true;
  if (platformRole === 'super_admin') return true;

  if (permission.startsWith('platform:')) {
    return platformRoleHasPermission(platformRole, permission);
  }

  if (schoolRole) {
    return schoolRoleHasPermission(schoolRole, permission);
  }

  return false;
}

export function checkAnyPermission(
  platformRole: PlatformRole,
  schoolRole: SchoolRole | null,
  permissions: Permission[],
): boolean {
  if (permissions.length === 0) return true;
  return permissions.some((p) => checkPermission(platformRole, schoolRole, p));
}

export function checkAllPermissions(
  platformRole: PlatformRole,
  schoolRole: SchoolRole | null,
  permissions: Permission[],
): boolean {
  if (permissions.length === 0) return true;
  return permissions.every((p) => checkPermission(platformRole, schoolRole, p));
}

/**
 * Exige une permission ou lance AuthorizationError.
 */
export function requirePermission(
  platformRole: PlatformRole,
  schoolRole: SchoolRole | null,
  permission: Permission,
): void {
  if (!checkPermission(platformRole, schoolRole, permission)) {
    if (platformRole === 'none' && schoolRole === null) {
      throw new AuthorizationError('UNAUTHORIZED');
    }
    throw new AuthorizationError('FORBIDDEN');
  }
}

/**
 * Exige au moins une permission ou lance AuthorizationError.
 */
export function requireAnyPermission(
  platformRole: PlatformRole,
  schoolRole: SchoolRole | null,
  permissions: Permission[],
): void {
  if (!checkAnyPermission(platformRole, schoolRole, permissions)) {
    if (platformRole === 'none' && schoolRole === null) {
      throw new AuthorizationError('UNAUTHORIZED');
    }
    throw new AuthorizationError('FORBIDDEN');
  }
}

// ─────────────────────────────────────────────
// Guards R-V2-03 (M1-29.10)
// ─────────────────────────────────────────────

/**
 * Exige que l'acteur soit Ghost.
 * SUPER_ADMIN ne satisfait PAS ce guard.
 * ADMIN, DIRECTION, TEACHER, READER non plus.
 */
export function requireGhostGuard(platformRole: PlatformRole, isGhost: boolean): void {
  if (!isGhost || platformRole !== 'ghost') {
    throw new AuthorizationError('FORBIDDEN');
  }
}

/**
 * Exige que l'acteur soit SUPER_ADMIN (pas Ghost).
 * NOTE: For operations where Fantomas should ALSO be allowed,
 * use requireSuperAdminCapability() instead.
 */
export function requireSuperAdminGuard(platformRole: PlatformRole): void {
  if (platformRole !== 'super_admin') {
    throw new AuthorizationError('FORBIDDEN');
  }
}

/**
 * Effective SUPER_ADMIN capability check.
 * Returns TRUE for both SUPER_ADMIN and Fantomas/Ghost.
 * This is the canonical AISE invariant: Fantomas inherits all
 * SUPER_ADMIN capabilities.
 *
 * Semantics:
 *   "Principal may perform every operation assigned to SUPER_ADMIN."
 *
 * It does NOT mean "is literally a normal SUPER_ADMIN account."
 */
export function hasSuperAdminCapabilities(platformRole: PlatformRole): boolean {
  return platformRole === 'super_admin' || platformRole === 'ghost';
}

/**
 * Requires effective SUPER_ADMIN capability.
 * Allows both SUPER_ADMIN and Fantomas/Ghost.
 * Rejects ADMIN, DIRECTION, TEACHER, and all other ordinary roles.
 */
export function requireSuperAdminCapability(platformRole: PlatformRole): void {
  if (!hasSuperAdminCapabilities(platformRole)) {
    throw new AuthorizationError('FORBIDDEN');
  }
}

/**
 * Narrow Fantomas identity check.
 * TRUE only for Ghost/Fantomas.
 * Normal SUPER_ADMIN returns FALSE.
 */
export function isFantomas(platformRole: PlatformRole): boolean {
  return platformRole === 'ghost';
}

/**
 * Vérifie qu'un utilisateur a accès à une école.
 */
export function requireSchoolAccess(
  memberships: SchoolMembership[],
  schoolId: string,
): void {
  const hasAccess = memberships.some(
    (m) => m.schoolId === schoolId && m.isActive,
  );
  if (!hasAccess) {
    throw new AuthorizationError('FORBIDDEN');
  }
}

// ─────────────────────────────────────────────
// Helpers de dérivation de rôle (transition V1→V2)
// ─────────────────────────────────────────────

export function derivePlatformRole(opts: {
  isGhost: boolean;
  isSuperAdmin?: boolean;
  v1Role?: string;
}): PlatformRole {
  if (opts.isGhost) return 'ghost';
  if (opts.isSuperAdmin) return 'super_admin';
  return 'none';
}

export function deriveSchoolRole(opts: {
  isGhost: boolean;
  isSuperAdmin?: boolean;
  v1Role?: string;
}): SchoolRole {
  if (opts.isGhost || opts.isSuperAdmin) return 'admin';

  switch (opts.v1Role) {
    case 'admin':
      return 'admin';
    case 'direction':
      return 'direction';
    case 'teacher':
      return 'teacher';
    case 'reader':
    default:
      return 'reader';
  }
}

export function resolveSchoolRole(opts: {
  isGhost: boolean;
  isSuperAdmin?: boolean;
  v1Role?: string;
  schoolMemberships?: SchoolMembership[];
}): SchoolRole | null {
  if (opts.isGhost || opts.isSuperAdmin) return 'admin';

  if (opts.schoolMemberships && opts.schoolMemberships.length > 0) {
    const active = opts.schoolMemberships.find((m) => m.isActive);
    return active?.role ?? null;
  }

  if (opts.v1Role) {
    return deriveSchoolRole({
      isGhost: false,
      v1Role: opts.v1Role,
    });
  }

  return null;
}

// ─────────────────────────────────────────────
// Authorization result helper
// ─────────────────────────────────────────────

export function authorize(
  platformRole: PlatformRole,
  schoolRole: SchoolRole | null,
  permission: Permission,
): AuthorizationResult {
  if (checkPermission(platformRole, schoolRole, permission)) {
    return { allowed: true };
  }
  if (platformRole === 'none' && schoolRole === null) {
    return { allowed: false, reason: 'UNAUTHORIZED' };
  }
  return { allowed: false, reason: 'FORBIDDEN' };
}


