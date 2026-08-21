'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  PlatformRole,
  SchoolRole,
  Permission,
  SessionUserV2,
  SchoolMembership,
  NavSection,
} from '@/lib/types/rbac';
import { checkAnyPermission } from '@/lib/authorization';
import { NAV_SECTIONS, filterNavForRole, BREADCRUMB_MAP } from '@/lib/navigation';
import { SCHOOL_ROLE_LABELS, PLATFORM_ROLE_LABELS } from '@/lib/types/rbac';

// ─────────────────────────────────────────────
// Context type
// ─────────────────────────────────────────────

interface NavigationContextValue {
  /** Utilisateur courant */
  user: SessionUserV2;
  /** Rôle de plateforme */
  platformRole: PlatformRole;
  /** Rôle scolaire actif */
  schoolRole: SchoolRole | null;
  /** Memberships scolaires */
  schoolMemberships: SchoolMembership[];
  /** École active */
  activeSchoolId: string | null;
  /** Sections de navigation filtrées par rôle */
  navSections: NavSection[];
  /** Vérifie si l'utilisateur a au moins une des permissions */
  hasPermission: (permissions: Permission[]) => boolean;
  /** Vérifie une permission unique */
  hasSinglePermission: (permission: Permission) => boolean;
  /** Label du rôle scolaire actif */
  schoolRoleLabel: string | null;
  /** Label du rôle de plateforme */
  platformRoleLabel: string;
  /** Est-ce un Ghost ? */
  isGhost: boolean;
  /** Est-ce un Super Admin ? */
  isSuperAdmin: boolean;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

interface NavigationProviderProps {
  children: ReactNode;
  user: SessionUserV2;
  schoolMemberships?: SchoolMembership[];
  activeSchoolRole?: SchoolRole | null;
  activeSchoolId?: string | null;
}

export function NavigationProvider({
  children,
  user,
  schoolMemberships = [],
  activeSchoolRole = null,
  activeSchoolId = null,
}: NavigationProviderProps) {
  const platformRole = user.platformRole;
  const schoolRole = activeSchoolRole;

  // Fonction de vérification de permission utilisant le contexte
  const hasPermission = useMemo(
    () => (permissions: Permission[]) =>
      checkAnyPermission(platformRole, schoolRole, permissions),
    [platformRole, schoolRole],
  );

  const hasSinglePermission = useMemo(
    () => (permission: Permission) =>
      checkAnyPermission(platformRole, schoolRole, [permission]),
    [platformRole, schoolRole],
  );

  // Navigation filtrée par rôle
  const navSections = useMemo(
    () => filterNavForRole(NAV_SECTIONS, platformRole, schoolRole, hasPermission),
    [platformRole, schoolRole, hasPermission],
  );

  const value = useMemo<NavigationContextValue>(
    () => ({
      user,
      platformRole,
      schoolRole,
      schoolMemberships,
      activeSchoolId,
      navSections,
      hasPermission,
      hasSinglePermission,
      schoolRoleLabel: schoolRole ? SCHOOL_ROLE_LABELS[schoolRole] : null,
      platformRoleLabel: PLATFORM_ROLE_LABELS[platformRole],
      isGhost: user.isGhost,
      isSuperAdmin: platformRole === 'super_admin',
    }),
    [user, platformRole, schoolRole, schoolMemberships, activeSchoolId, navSections, hasPermission, hasSinglePermission],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation must be used within <NavigationProvider>');
  }
  return ctx;
}

/**
 * Hook utilitaire: retourne les breadcrumbs pour le pathname courant.
 */
export function useBreadcrumbs(pathname: string) {
  const { hasPermission } = useNavigation();

  return useMemo(() => {
    // Trouver la correspondance la plus spécifique
    let bestMatch: typeof BREADCRUMB_MAP[number] | null = null;
    for (const entry of BREADCRUMB_MAP) {
      if (pathname.startsWith(entry.prefix)) {
        if (!bestMatch || entry.prefix.length > bestMatch.prefix.length) {
          bestMatch = entry;
        }
      }
    }

    if (!bestMatch) {
      return [{ href: '/dashboard', label: 'Accueil' }];
    }

    // Filtrer les breadcrumbs selon les permissions
    return bestMatch.items.filter(
      (item) =>
        item.requiredPermissions.length === 0 ||
        hasPermission(item.requiredPermissions),
    );
  }, [pathname, hasPermission]);
}
