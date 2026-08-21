/**
 * R-V2-UI-02 — Types RBAC V2
 * Contrat figé basé sur R-V2-01_TARGET_DATA_MODEL
 *
 * Dual Role System:
 *   - Platform Role: ghost | super_admin | none  (sur user.platform_role)
 *   - School Role:   admin | direction | teacher | reader  (sur school_membership.role)
 */

// ─────────────────────────────────────────────
// Platform Role
// ─────────────────────────────────────────────

export type PlatformRole = 'ghost' | 'super_admin' | 'none';

export const PLATFORM_ROLES: readonly PlatformRole[] = [
  'ghost',
  'super_admin',
  'none',
] as const;

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  ghost: 'Ghost',
  super_admin: 'Super Administrateur',
  none: 'Aucun rôle plateforme',
};

// ─────────────────────────────────────────────
// School Role
// ─────────────────────────────────────────────

export type SchoolRole = 'admin' | 'direction' | 'teacher' | 'reader';

export const SCHOOL_ROLES: readonly SchoolRole[] = [
  'admin',
  'direction',
  'teacher',
  'reader',
] as const;

export const SCHOOL_ROLE_LABELS: Record<SchoolRole, string> = {
  admin: 'Administrateur',
  direction: 'Direction',
  teacher: 'Enseignant',
  reader: 'Lecteur',
};

// ─────────────────────────────────────────────
// School Membership (contexte scolaire actif)
// ─────────────────────────────────────────────

export interface SchoolMembership {
  id: string;
  schoolId: string;
  schoolName?: string;
  role: SchoolRole;
  isActive: boolean;
}

// ─────────────────────────────────────────────
// Permissions
// ─────────────────────────────────────────────

/**
 * Toutes les permissions définies dans le système.
 * Chaque permission est un identifiant stable utilisé
 * côté serveur et côté client.
 */
export type Permission =
  // Platform
  | 'platform:users:manage'
  | 'platform:users:create_super_admin'
  | 'platform:schools:create'
  | 'platform:recovery'
  // Scolaire — Organisation
  | 'school:academic_years:read'
  | 'school:academic_years:manage'
  | 'school:levels:read'
  | 'school:levels:manage'
  | 'school:classrooms:read'
  | 'school:classrooms:manage'
  | 'school:students:read'
  | 'school:students:manage'
  | 'school:enrollments:read'
  | 'school:enrollments:manage'
  // Scolaire — Pédagogie
  | 'school:subjects:read'
  | 'school:subjects:manage'
  | 'school:components:read'
  | 'school:components:manage'
  | 'school:assessment_types:read'
  | 'school:assessment_types:manage'
  | 'school:pedagogical_config:read'
  | 'school:pedagogical_config:manage'
  // Scolaire — Évaluations
  | 'school:assessments:read'
  | 'school:assessments:manage'
  | 'school:grades:read'
  | 'school:grades:manage'
  // Scolaire — Bulletins
  | 'school:report_cards:read'
  | 'school:report_cards:prepare'
  | 'school:report_cards:validate'
  | 'school:report_cards:publish'
  | 'school:annual_results:read'
  | 'school:annual_results:manage'
  // Scolaire — Analyse
  | 'school:statistics:read'
  // Scolaire — Administration locale
  | 'school:audit_log:read';

// ─────────────────────────────────────────────
// Session V2
// ─────────────────────────────────────────────

export interface SessionUserV2 {
  id: string;
  email: string;
  name: string;
  /** Rôle de plateforme (V2) */
  platformRole: PlatformRole;
  /** Vrai si c'est le compte Ghost Fantomas */
  isGhost: boolean;
  /** Source d'authentification */
  source: 'ghost' | 'better-auth';
}

export interface AppSessionV2 {
  user: SessionUserV2;
  /**
   * Memberships scolaires de l'utilisateur.
   * En V1 (pre-migration), le rôle est dérivé de user.role.
   * En V2, provient de school_membership.
   */
  schoolMemberships: SchoolMembership[];
  /** Rôle scolaire actif (premier membership actif, ou dérivé V1) */
  activeSchoolRole: SchoolRole | null;
  /** École active actuelle */
  activeSchoolId: string | null;
}

// ─────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: string; // Lucide icon name
  /** Permissions requises (OU logique — au moins une nécessaire) */
  requiredPermissions: Permission[];
  /** Rôles de plateforme autorisés (OU logique). Vide = tous les rôles */
  platformRoles?: PlatformRole[];
  /** Rôles scolaires autorisés (OU logique). Vide = tous les rôles scolaires */
  schoolRoles?: SchoolRole[];
}

export interface NavSection {
  title: string | null;
  items: NavItem[];
}

// ─────────────────────────────────────────────
// Authorization Result
// ─────────────────────────────────────────────

export type AuthorizationResult =
  | { allowed: true }
  | { allowed: false; reason: 'UNAUTHORIZED' | 'FORBIDDEN' | 'DB_UNAVAILABLE' };
