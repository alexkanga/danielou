'use server';

/**
 * R-V2-M1-H2 — Login Server Action (Always-Available Fantomas)
 * 
 * Flux:
 * 1. Si l'identifiant correspond a Fantomas -> Ghost Auth (sans DB, sans Better Auth)
 * 2. Sinon -> Better Auth (username/password puis email/password)
 * 
 * BA 1.7.1 in production uses __Secure- prefix on session cookie.
 */

import { cookies } from 'next/headers';
import { validateGhostCredentials, signGhostSession, getGhostCookieOptions } from '@/lib/ghost-auth';
import { getGhostConfig } from '@/lib/ghost-config';

export type LoginResult =
  | { success: true; user: { id: string; email: string; name: string; platformRole: string }; source: string }
  | { success: false; error: string };

const BA_SESSION_TOKEN_NAME = process.env.NODE_ENV === 'production'
  ? '__Secure-better-auth.session_token'
  : 'better-auth.session_token';

export async function loginAction(
  _prevState: LoginResult | null,
  formData: FormData,
): Promise<LoginResult> {
  const login = String(formData.get('login') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!login || !password) {
    return { success: false, error: 'Veuillez remplir tous les champs.' };
  }

  // Ghost Auth
  const ghostConfig = getGhostConfig();
  if (login.toLowerCase() === ghostConfig.username.toLowerCase()) {
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
    return { success: false, error: 'Identifiants invalides.' };
  }

  // Better Auth — ordinary users
  try {
    const { getAuth } = await import('@/lib/auth');
    const auth = getAuth();

    // Try username sign-in first
    try {
      const result: any = await auth.api.signInUsername({
        body: { username: login, password },
      });
      if (result?.token) {
        const cookieStore = await cookies();
        cookieStore.set(BA_SESSION_TOKEN_NAME, result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        });
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
      const result: any = await auth.api.signInEmail({
        body: { email: login, password },
      });
      if (result?.token) {
        const cookieStore = await cookies();
        cookieStore.set(BA_SESSION_TOKEN_NAME, result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        });
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
    return { success: false, error: 'Service indisponible.' };
  }
}
