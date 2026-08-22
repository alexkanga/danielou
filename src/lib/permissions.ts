/**
 * R-V2-UI-02 — Matrice de permissions RBAC V2
 * Contrat figé basé sur R-V2-01 §2.3
 *
 * GHOST a TOUS les droits.
 * SUPER_ADMIN a les droits plateforme + tous les droits ADMIN.
 * ADMIN/DIRECTION/TEACHER/READER ont les droits scolaires selon la matrice.
 */

import type {
  PlatformRole,
  SchoolRole,
  Permission,
} from './types/rbac';

// ─────────────────────────────────────────────
// Matrice de permissions par rôle
// ─────────────────────────────────────────────

/**
 * Pour chaque permission, lister les rôles qui l'ont.
 * GHOST est traité à part (il a tout).
 */
const SCHOOL_ROLE_PERMISSIONS: Record<SchoolRole, ReadonlySet<Permission>> = {
  admin: new Set([
    // Organisation — full manage
    'school:academic_years:read',
    'school:academic_years:manage',
    'school:levels:read',
    'school:levels:manage',
    'school:classrooms:read',
    'school:classrooms:manage',
    'school:students:read',
    'school:students:manage',
    'school:enrollments:read',
    'school:enrollments:manage',
    // Pédagogie — full manage
    'school:subjects:read',
    'school:subjects:manage',
    'school:components:read',
    'school:components:manage',
    'school:assessment_types:read',
    'school:assessment_types:manage',
    'school:pedagogical_config:read',
    'school:pedagogical_config:manage',
    // Évaluations — full manage
    'school:assessments:read',
    'school:assessments:manage',
    'school:grades:read',
    'school:grades:manage',
    // Bulletins — full manage
    'school:report_cards:read',
    'school:report_cards:prepare',
    'school:report_cards:validate',
    'school:report_cards:publish',
    'school:annual_results:read',
    'school:annual_results:manage',
    // Analyse
    'school:statistics:read',
    // Audit
    'school:audit_log:read',
  ]),

  direction: new Set([
    // Organisation — read only
    'school:academic_years:read',
    'school:levels:read',
    'school:classrooms:read',
    'school:students:read',
    'school:enrollments:read',
    // Pédagogie — read
    'school:subjects:read',
    'school:components:read',
    'school:assessment_types:read',
    'school:pedagogical_config:read',
    // Évaluations — read
    'school:assessments:read',
    'school:grades:read',
    // Bulletins — validate + publish (pas préparer)
    'school:report_cards:read',
    'school:report_cards:validate',
    'school:report_cards:publish',
    'school:annual_results:read',
    'school:annual_results:manage',
    // Analyse
    'school:statistics:read',
    // Audit
    'school:audit_log:read',
  ]),

  teacher: new Set([
    // Organisation — limité
    'school:classrooms:read',
    'school:students:read',
    'school:enrollments:read',
    // Pédagogie — read
    'school:subjects:read',
    'school:components:read',
    'school:assessment_types:read',
    'school:pedagogical_config:read',
    // Évaluations — manage dans son périmètre
    'school:assessments:read',
    'school:assessments:manage',
    'school:grades:read',
    'school:grades:manage',
    // Bulletins — préparation seulement
    'school:report_cards:read',
    'school:report_cards:prepare',
  ]),

  reader: new Set([
    // Lecture seule
    'school:academic_years:read',
    'school:levels:read',
    'school:classrooms:read',
    'school:students:read',
    'school:enrollments:read',
    'school:subjects:read',
    'school:components:read',
    'school:assessment_types:read',
    'school:pedagogical_config:read',
    'school:assessments:read',
    'school:grades:read',
    'school:report_cards:read',
    'school:annual_results:read',
    'school:statistics:read',
  ]),
};

/** Permissions propres à la plateforme (super_admin) */
const PLATFORM_PERMISSIONS: ReadonlySet<Permission> = new Set([
  'platform:users:manage',
  'platform:users:create_super_admin',
  'platform:schools:create',
  'platform:recovery',
]);

// ─────────────────────────────────────────────
// Fonctions de vérification
// ─────────────────────────────────────────────

/**
 * Vérifie si un rôle de plateforme a une permission donnée.
 * GHOST a toutes les permissions.
 */
export function platformRoleHasPermission(
  platformRole: PlatformRole,
  permission: Permission,
): boolean {
  // Permission parameter is validated via checkPermission() for non-ghost/super_admin.
  // Here, ghost and super_admin bypass all checks, so we acknowledge but don't inspect it.
  void permission;
  if (platformRole === 'ghost') return true;
  if (platformRole === 'super_admin') {
    // SUPER_ADMIN a toutes les permissions plateforme + tous les droits admin
    return true;
  }
  // 'none' n'a aucune permission de plateforme
  return false;
}

/**
 * Vérifie si un rôle scolaire a une permission donnée.
 */
export function schoolRoleHasPermission(
  schoolRole: SchoolRole,
  permission: Permission,
): boolean {
  return SCHOOL_ROLE_PERMISSIONS[schoolRole]?.has(permission) ?? false;
}

/**
 * Vérifie si un rôle scolaire a l'une des permissions données (OU logique).
 */
export function schoolRoleHasAnyPermission(
  schoolRole: SchoolRole,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => schoolRoleHasPermission(schoolRole, p));
}

/**
 * Vérifie si un rôle scolaire a toutes les permissions données (ET logique).
 */
export function schoolRoleHasAllPermissions(
  schoolRole: SchoolRole,
  permissions: Permission[],
): boolean {
  return permissions.every((p) => schoolRoleHasPermission(schoolRole, p));
}

/**
 * Vérifie si une permission est de type « plateforme ».
 */
export function isPlatformPermission(permission: Permission): boolean {
  return PLATFORM_PERMISSIONS.has(permission);
}

/**
 * Retourne la hiérarchie des rôles scolaires (pour comparaisons).
 * admin > direction > teacher > reader
 */
const SCHOOL_ROLE_HIERARCHY: Record<SchoolRole, number> = {
  admin: 4,
  direction: 3,
  teacher: 2,
  reader: 1,
};

export function schoolRoleLevel(role: SchoolRole): number {
  return SCHOOL_ROLE_HIERARCHY[role] ?? 0;
}

/**
 * Map V1 role → V2 school role (pour compatibilité transition).
 * En V1, user.role était un rôle scolaire monolithique.
 * Pendant la transition, on dérive le school_role depuis user.role.
 */
export const V1_ROLE_TO_SCHOOL_ROLE: Record<string, SchoolRole> = {
  admin: 'admin',
  direction: 'direction',
  teacher: 'teacher',
  reader: 'reader',
};

/**
 * Map V1 role → V2 platform role (pour compatibilité transition).
 */
export const V1_ROLE_TO_PLATFORM_ROLE: Record<string, PlatformRole> = {
  // En V1, tous les utilisateurs ordinaires ont platform_role = 'none'
  admin: 'none',
  direction: 'none',
  teacher: 'none',
  reader: 'none',
};
