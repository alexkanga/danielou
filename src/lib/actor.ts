/**
 * M1-29.5 — Actor Resolution
 * 
 * Modèle d'acteur unifié. Fantomas est un GhostActor (hors DB),
 * les autres sont des UserActor (via Better Auth + DB).
 */

import { cookies } from 'next/headers';
import { verifyGhostSession, GHOST_COOKIE_NAME, type GhostTokenPayload } from './ghost-auth';
import type { SchoolMembership } from './types/rbac';

// ─────────────────────────────────────────────
// Actor Types
// ─────────────────────────────────────────────

export interface GhostActor {
  type: 'ghost';
  identifier: string;
  payload: GhostTokenPayload;
}

export interface UserActor {
  type: 'user';
  userId: string;
  email: string;
  name: string;
  platformRole: 'super_admin' | 'none';
  isSuperAdmin: boolean;
  memberships: SchoolMembership[];
  v1Role?: string;
}

export type Actor = GhostActor | UserActor;

// ─────────────────────────────────────────────
// Resolution
// ─────────────────────────────────────────────

/**
 * Résout l'acteur actuel en vérifiant d'abord la session Ghost,
 * puis la session Better Auth.
 * 
 * Ne lance jamais d'erreur — retourne null si non authentifié.
 */
export async function resolveActor(): Promise<Actor | null> {
  // 1. Vérifier la session Ghost
  const cookieStore = await cookies();
  const ghostToken = cookieStore.get(GHOST_COOKIE_NAME)?.value;

  if (ghostToken) {
    const payload = await verifyGhostSession(ghostToken);
    if (payload) {
      return {
        type: 'ghost',
        identifier: payload.actorIdentifier,
        payload,
      };
    }
  }

  // 2. Vérifier la session Better Auth
  try {
    const { getAuth } = await import('./auth');
    const auth = getAuth();
    const { headers: nextHeaders } = await import('next/headers');
    const session = await auth.api.getSession({
      headers: await nextHeaders(),
    });

    if (session?.user) {
      const u = session.user as Record<string, unknown>;
      const isSuperAdmin = Boolean(u.isSuperAdmin || u.platform_role === 'super_admin');
      const platformRole: 'super_admin' | 'none' = isSuperAdmin ? 'super_admin' : 'none';

      return {
        type: 'user',
        userId: String(u.id ?? ''),
        email: String(u.email ?? ''),
        name: String(u.name ?? u.email ?? ''),
        platformRole,
        isSuperAdmin,
        memberships: [], // Chargé par getSession() dans le layout
        v1Role: String(u.role ?? 'reader'),
      };
    }
  } catch {
    // Better Auth peut échouer si DB indisponible
  }

  return null;
}

/**
 * Exige un acteur authentifié. Lance AuthorizationError si null.
 */
export async function requireActor(): Promise<Actor> {
  const actor = await resolveActor();
  if (!actor) {
    const { AuthorizationError } = await import('./authorization');
    throw new AuthorizationError('UNAUTHORIZED');
  }
  return actor;
}

/**
 * Exige un acteur Ghost. Lance AuthorizationError si l'acteur n'est pas Ghost.
 * SUPER_ADMIN ne satisfait PAS cette fonction.
 */
export async function requireGhost(): Promise<GhostActor> {
  const actor = await requireActor();
  if (actor.type !== 'ghost') {
    const { AuthorizationError } = await import('./authorization');
    throw new AuthorizationError('FORBIDDEN');
  }
  return actor;
}

/**
 * Vérifie si l'acteur est un Ghost.
 */
export function isGhostActor(actor: Actor): actor is GhostActor {
  return actor.type === 'ghost';
}
