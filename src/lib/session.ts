/**
 * Session unifiée V2 — M1 mise à jour
 * Vérifie Ghost d'abord (via ghost-auth), puis Better-Auth.
 * Retourne un objet AppSessionV2 compatible avec le dual role system.
 */

import { cookies } from 'next/headers';
import { verifyGhostSession, GHOST_COOKIE_NAME } from './ghost-auth';
import type { PlatformRole, SchoolRole, SessionUserV2, SchoolMembership, AppSessionV2 } from './types/rbac';
import { derivePlatformRole, deriveSchoolRole } from './authorization';

export type AppSession = AppSessionV2;

function toV2User(opts: {
  id: string;
  email: string;
  name: string;
  isGhost: boolean;
  isSuperAdmin: boolean;
  v1Role: string;
  source: 'ghost' | 'better-auth';
}): SessionUserV2 {
  const platformRole: PlatformRole = derivePlatformRole({
    isGhost: opts.isGhost,
    isSuperAdmin: opts.isSuperAdmin,
    v1Role: opts.v1Role,
  });

  return {
    id: opts.id,
    email: opts.email,
    name: opts.name,
    platformRole,
    isGhost: opts.isGhost,
    source: opts.source,
  };
}

export async function getSession(): Promise<AppSessionV2 | null> {
  const cookieStore = await cookies();

  // 1. Vérifier le token Ghost
  const ghostToken = cookieStore.get(GHOST_COOKIE_NAME)?.value;
  if (ghostToken) {
    const ghostPayload = await verifyGhostSession(ghostToken);
    if (ghostPayload) {
      const user = toV2User({
        id: 'fantomas-ghost',
        email: 'fantomas',
        name: 'Fantomas',
        isGhost: true,
        isSuperAdmin: true,
        v1Role: 'admin',
        source: 'ghost',
      });
      return {
        user,
        schoolMemberships: [],
        activeSchoolRole: 'admin',
        activeSchoolId: null,
      };
    }
  }

  // 2. Vérifier la session Better-Auth
  try {
    const { getAuth } = await import('./auth');
    const auth = getAuth();
    const { headers: nextHeaders } = await import('next/headers');
    const session = await auth.api.getSession({
      headers: await nextHeaders(),
    });
    if (session?.user) {
      const u = session.user as Record<string, unknown>;
      const v1Role = String(u.role ?? 'reader');
      const isSuperAdmin = Boolean(u.isSuperAdmin);

      const user = toV2User({
        id: String(u.id ?? ''),
        email: String(u.email ?? ''),
        name: String(u.name ?? u.email ?? ''),
        isGhost: false,
        isSuperAdmin,
        v1Role,
        source: 'better-auth',
      });

      const schoolRole = deriveSchoolRole({
        isGhost: false,
        isSuperAdmin,
        v1Role,
      });

      // TODO(M1): Charger les memberships depuis school_membership table
      const schoolMemberships: SchoolMembership[] = [];
      const activeSchoolId = schoolMemberships.length > 0
        ? schoolMemberships[0].schoolId
        : null;

      return {
        user,
        schoolMemberships,
        activeSchoolRole: schoolRole,
        activeSchoolId,
      };
    }
  } catch {
    // Better-Auth peut échouer si la DB est indisponible
  }

  return null;
}

export async function requireSession(): Promise<NonNullable<AppSessionV2>> {
  const session = await getSession();
  if (!session) {
    const { AuthorizationError } = await import('./authorization');
    throw new AuthorizationError('UNAUTHORIZED');
  }
  return session;
}
