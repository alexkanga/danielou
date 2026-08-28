/**
 * R-V2-UI-02 — Configuration de navigation avec visibilité par rôle
 * Contrat figé basé sur R-V2-01 §2.3 matrice de permissions
 *
 * Chaque item a des permissions requises. Un item est visible si
 * l'utilisateur a au moins une des permissions listées (OU logique).
 */

import type { NavSection, Permission, PlatformRole, SchoolRole } from './types/rbac';

// ─────────────────────────────────────────────
// Navigation complète (tous les items)
// ─────────────────────────────────────────────

export const NAV_SECTIONS: NavSection[] = [
  {
    title: null,
    items: [
      {
        label: 'Tableau de bord',
        href: '/dashboard',
        icon: 'LayoutDashboard',
        requiredPermissions: [], // Visible par tous les authentifiés
      },
    ],
  },
  {
    title: 'Organisation',
    items: [
      {
        label: 'Années scolaires',
        href: '/dashboard/annees-scolaires',
        icon: 'CalendarDays',
        requiredPermissions: ['school:academic_years:read'],
      },
      {
        label: 'Périodes',
        href: '/dashboard/periodes',
        icon: 'Clock',
        requiredPermissions: ['school:academic_years:read'],
      },
      {
        label: 'Niveaux',
        href: '/dashboard/niveaux',
        icon: 'GraduationCap',
        requiredPermissions: ['school:levels:read'],
      },
      {
        label: 'Classes',
        href: '/dashboard/classes',
        icon: 'School',
        requiredPermissions: ['school:classrooms:read'],
      },
      {
        label: 'Élèves',
        href: '/dashboard/eleves',
        icon: 'Users',
        requiredPermissions: ['school:students:read'],
      },
      {
        label: 'Inscriptions',
        href: '/dashboard/inscriptions',
        icon: 'FilePlus2',
        requiredPermissions: ['school:enrollments:read'],
      },
      {
        label: 'Affectations de classe',
        href: '/dashboard/affectations',
        icon: 'ArrowRightLeft',
        requiredPermissions: ['school:classrooms:read'],
      },
    ],
  },
  {
    title: 'Pédagogie',
    items: [
      {
        label: 'Matières',
        href: '/dashboard/matieres',
        icon: 'BookOpen',
        requiredPermissions: ['school:subjects:read'],
      },
      {
        label: 'Composantes',
        href: '/dashboard/composantes',
        icon: 'Puzzle',
        requiredPermissions: ['school:components:read'],
      },
      {
        label: "Types d'évaluation",
        href: '/dashboard/types-evaluation',
        icon: 'ClipboardList',
        requiredPermissions: ['school:assessment_types:read'],
      },
      {
        label: 'Règles de calcul',
        href: '/dashboard/regles-calcul',
        icon: 'Calculator',
        requiredPermissions: ['school:pedagogical_config:read'],
      },
    ],
  },
  {
    title: 'Évaluations',
    items: [
      {
        label: 'Évaluations',
        href: '/dashboard/evaluations',
        icon: 'FileText',
        requiredPermissions: ['school:assessments:read'],
      },
      {
        label: 'Saisie des notes',
        href: '/dashboard/saisie-notes',
        icon: 'PenTool',
        requiredPermissions: ['school:grades:manage'],
      },
      {
        label: 'Résultats',
        href: '/dashboard/resultats',
        icon: 'BarChart3',
        requiredPermissions: ['school:grades:read'],
      },
      {
        label: 'Compositions',
        href: '/dashboard/compositions',
        icon: 'Award',
        requiredPermissions: ['school:grades:read'],
      },
    ],
  },
  {
    title: 'Bulletins',
    items: [
      { label: 'Préparation', href: '/dashboard/bulletins/preparation', icon: 'ScrollText', requiredPermissions: ['school:report_cards:prepare'] },
      { label: 'Validation', href: '/dashboard/bulletins/validation', icon: 'CheckCircle', requiredPermissions: ['school:report_cards:validate'] },
      { label: 'Publication', href: '/dashboard/bulletins/publication', icon: 'Send', requiredPermissions: ['school:report_cards:publish'] },
      { label: 'Historique', href: '/dashboard/bulletins/historique', icon: 'History', requiredPermissions: ['school:report_cards:read'] },
      { label: 'Impression / Exports', href: '/dashboard/bulletins/impression', icon: 'Printer', requiredPermissions: ['school:report_cards:read'] },
    ],
  },
  {
    title: 'Analyse',
    items: [
      { label: 'Statistiques', href: '/dashboard/statistiques', icon: 'TrendingUp', requiredPermissions: ['school:statistics:read'] },
    ],
  },
  {
    title: 'Système',
    items: [
      {
        label: 'Récupération',
        href: '/dashboard/system/recovery',
        icon: 'ShieldAlert',
        requiredPermissions: ['platform:recovery'],
        platformRoles: ['ghost'],
      },
      {
        label: 'Santé de la base',
        href: '/dashboard/system/db-health',
        icon: 'Activity',
        requiredPermissions: [],
        platformRoles: ['ghost', 'super_admin'],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Utilisateurs',
        href: '/dashboard/admin/utilisateurs',
        icon: 'UserCog',
        requiredPermissions: ['platform:users:manage'],
        platformRoles: ['ghost', 'super_admin'],
      },
      // Roles are fixed by design (admin/direction/teacher/reader) — no editable UI needed
      // {
      //   label: 'Rôles',
      //   href: '/dashboard/admin/roles',
      //   icon: 'Shield',
      //   requiredPermissions: ['platform:users:manage'],
      //   platformRoles: ['ghost', 'super_admin'],
      // },
      // Configuration is a future placeholder — not yet implemented
      // {
      //   label: 'Configuration',
      //   href: '/dashboard/admin/configuration',
      //   icon: 'Settings',
      //   requiredPermissions: ['school:pedagogical_config:manage'],
      // },
      {
        label: "Journal d'audit",
        href: '/dashboard/admin/journal-audit',
        icon: 'FileSearch',
        requiredPermissions: ['school:audit_log:read'],
      },
    ],
  },
];

// ─────────────────────────────────────────────
// Breadcrumbs config
// ─────────────────────────────────────────────

export interface BreadcrumbConfig {
  href: string;
  label: string;
  /** Permissions requises pour que le breadcrumb soit visible */
  requiredPermissions: Permission[];
}

/**
 * Map pathname → breadcrumb items.
 * Les clés sont des préfixes (le pathname.startsWith est utilisé).
 */
export const BREADCRUMB_MAP: Array<{
  prefix: string;
  items: BreadcrumbConfig[];
}> = [
  {
    prefix: '/dashboard/annees-scolaires',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/annees-scolaires', label: 'Années scolaires', requiredPermissions: ['school:academic_years:read'] },
    ],
  },
  {
    prefix: '/dashboard/periodes',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/periodes', label: 'Périodes d\'évaluation', requiredPermissions: ['school:academic_years:read'] },
    ],
  },
  {
    prefix: '/dashboard/niveaux',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/niveaux', label: 'Niveaux', requiredPermissions: ['school:levels:read'] },
    ],
  },
  {
    prefix: '/dashboard/classes',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/classes', label: 'Classes', requiredPermissions: ['school:classrooms:read'] },
    ],
  },
  {
    prefix: '/dashboard/eleves',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/eleves', label: 'Élèves', requiredPermissions: ['school:students:read'] },
    ],
  },
  {
    prefix: '/dashboard/inscriptions',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/inscriptions', label: 'Inscriptions', requiredPermissions: ['school:enrollments:read'] },
    ],
  },
  {
    prefix: '/dashboard/affectations',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/affectations', label: 'Affectations de classe', requiredPermissions: ['school:classrooms:read'] },
    ],
  },
  {
    prefix: '/dashboard/matieres',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/matieres', label: 'Matières', requiredPermissions: ['school:subjects:read'] },
    ],
  },
  {
    prefix: '/dashboard/composantes',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/composantes', label: 'Composantes', requiredPermissions: ['school:components:read'] },
    ],
  },
  {
    prefix: '/dashboard/types-evaluation',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/types-evaluation', label: "Types d'évaluation", requiredPermissions: ['school:assessment_types:read'] },
    ],
  },
  {
    prefix: '/dashboard/regles-calcul',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/regles-calcul', label: 'Règles de calcul', requiredPermissions: ['school:pedagogical_config:read'] },
    ],
  },
  {
    prefix: '/dashboard/evaluations',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/evaluations', label: 'Évaluations', requiredPermissions: ['school:assessments:read'] },
    ],
  },
  {
    prefix: '/dashboard/saisie-notes',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/saisie-notes', label: 'Saisie des notes', requiredPermissions: ['school:grades:manage'] },
    ],
  },
  {
    prefix: '/dashboard/resultats',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/resultats', label: 'Résultats', requiredPermissions: ['school:grades:read'] },
    ],
  },
  {
    prefix: '/dashboard/compositions',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/compositions', label: 'Compositions', requiredPermissions: ['school:grades:read'] },
    ],
  },
  {
    prefix: '/dashboard/bulletins',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/bulletins/preparation', label: 'Bulletins', requiredPermissions: ['school:report_cards:read'] },
    ],
  },
  {
    prefix: '/dashboard/statistiques',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/statistiques', label: 'Statistiques', requiredPermissions: ['school:statistics:read'] },
    ],
  },
  {
    prefix: '/dashboard/admin',
    items: [
      { href: '/dashboard', label: 'Accueil', requiredPermissions: [] },
      { href: '/dashboard/admin/utilisateurs', label: 'Administration', requiredPermissions: ['platform:users:manage'] },
    ],
  },
];

// ─────────────────────────────────────────────
// Helpers de filtrage
// ─────────────────────────────────────────────

export function filterNavForRole(
  sections: NavSection[],
  platformRole: PlatformRole,
  schoolRole: SchoolRole | null,
  hasAnyPermission: (permissions: Permission[]) => boolean,
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // Vérifier les permissions
        if (item.requiredPermissions.length > 0 && !hasAnyPermission(item.requiredPermissions)) {
          return false;
        }
        // Vérifier les rôles de plateforme si spécifiés
        if (item.platformRoles && item.platformRoles.length > 0) {
          if (!item.platformRoles.includes(platformRole)) {
            return false;
          }
        }
        // Vérifier les rôles scolaires si spécifiés
        if (item.schoolRoles && item.schoolRoles.length > 0) {
          if (!schoolRole || !item.schoolRoles.includes(schoolRole)) {
            return false;
          }
        }
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);
}
