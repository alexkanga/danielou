/**
 * Session unifiée — vérifie Fantomas d'abord, puis Better-Auth.
 * Fonctionne côté serveur uniquement.
 */

import { cookies } from 'next/headers';
import { verifyFantomasToken, getFantomasCookieName, type SessionUser } from './fantomas';

export type AppSession =
  | { user: SessionUser; source: 'fantomas' }
  | { user: SessionUser; source: 'better-auth' }
  | null;

export async function getSession(): Promise<AppSession> {
  const cookieStore = await cookies();

  // 1. Vérifier le token Fantomas
  const fantomasToken = cookieStore.get(getFantomasCookieName())?.value;
  if (fantomasToken) {
    const fantomasUser = await verifyFantomasToken(fantomasToken);
    if (fantomasUser) {
      return {
        user: fantomasUser,
        source: 'fantomas',
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
      return {
        user: {
          id: String(u.id ?? ''),
          email: String(u.email ?? ''),
          name: String(u.name ?? u.email ?? ''),
          role: String(u.role ?? 'reader'),
        },
        source: 'better-auth',
      };
    }
  } catch {
    // Better-Auth peut échouer si la DB est indisponible
  }

  return null;
}

export async function requireSession(): Promise<NonNullable<AppSession>> {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}
