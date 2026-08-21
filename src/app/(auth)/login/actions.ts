'use server';

/**
 * M1-29.6 — Login Server Action
 * 
 * Flux :
 * 1. Si l'identifiant correspond à FANTOMAS_USERNAME → Ghost Auth (sans DB)
 * 2. Sinon → Better Auth (username/password puis email/password)
 * 
 * INTERDICTION : Better Auth failure → Ghost fallback.
 * Si l'identifiant n'est pas Fantomas, Ghost n'est JAMAIS essayé.
 */

import { cookies } from 'next/headers';
import { validateGhostCredentials, signGhostSession, getGhostCookieOptions } from '@/lib/ghost-auth';
import { getGhostConfig } from '@/lib/ghost-config';

export type LoginResult =
  | { success: true; user: { id: string; email: string; name: string; platformRole: string }; source: string }
  | { success: false; error: string };

export async function loginAction(
  _prevState: LoginResult | null,
  formData: FormData,
): Promise<LoginResult> {
  const login = String(formData.get('login') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!login || !password) {
    return { success: false, error: 'Veuillez remplir tous les champs.' };
  }

  // 1. Ghost Auth — uniquement si l'identifiant correspond exactement à FANTOMAS_USERNAME
  const ghostConfig = getGhostConfig();
  if (ghostConfig.available && login.toLowerCase() === ghostConfig.username.toLowerCase()) {
    if (validateGhostCredentials(login, password)) {
      try {
        const token = await signGhostSession();
        const cookieStore = await cookies();
        const opts = getGhostCookieOptions();
        cookieStore.set('danielou_ghost_session', token, {
          httpOnly: opts.httpOnly,
          secure: opts.secure,
          sameSite: opts.sameSite,
          path: opts.path,
          maxAge: opts.maxAge,
        });
        return {
          success: true,
          user: { id: 'fantomas-ghost', email: 'fantomas', name: 'Fantomas', platformRole: 'ghost' },
          source: 'ghost',
        };
      } catch {
        return { success: false, error: 'Service Ghost indisponible.' };
      }
    }
    // Mauvais mot de passe pour Fantomas → ne PAS essayer Better Auth
    return { success: false, error: 'Identifiants invalides.' };
  }

  // 2. Better Auth — essayer username d'abord, puis email
  // L'identifiant n'est PAS Fantomas, donc Ghost n'est jamais essayé
  try {
    const { getAuth } = await import('@/lib/auth');
    const auth = getAuth();

    // Try username sign-in first (requires username plugin)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await auth.api.signInUsername({
        body: { username: login, password },
      });
      if (result?.user) {
        const u = result.user as Record<string, unknown>;
        const isSuperAdmin = Boolean(u.isSuperAdmin || u.platformRole === 'super_admin');
        return {
          success: true,
          user: {
            id: String(u.id ?? ''),
            email: String(u.email ?? login),
            name: String(u.name ?? login),
            platformRole: isSuperAdmin ? 'super_admin' : 'none',
          },
          source: 'better-auth',
        };
      }
    } catch {
      // Username sign-in failed, try email
    }

    // Try email sign-in
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await auth.api.signInEmail({
        body: { email: login, password },
      });
      if (result?.user) {
        const u = result.user as Record<string, unknown>;
        const isSuperAdmin = Boolean(u.isSuperAdmin || u.platformRole === 'super_admin');
        return {
          success: true,
          user: {
            id: String(u.id ?? ''),
            email: String(u.email ?? login),
            name: String(u.name ?? login),
            platformRole: isSuperAdmin ? 'super_admin' : 'none',
          },
          source: 'better-auth',
        };
      }
    } catch {
      // Email sign-in also failed
    }

    return { success: false, error: 'Identifiants invalides.' };
  } catch {
    return { success: false, error: 'Service indisponible. Vérifiez la connexion.' };
  }
}
