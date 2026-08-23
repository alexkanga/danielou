'use server';

/**
 * R-V2-M1-H2 — Login Server Action (Always-Available Fantomas)
 * 
 * Flux (§4):
 * 1. Si l'identifiant correspond à Fantomas → Ghost Auth (sans DB, sans Better Auth)
 * 2. Sinon → Better Auth (username/password puis email/password)
 * 
 * §4 CRITICAL: No database call is allowed before Fantomas authentication succeeds.
 * §25: Ordinary user failure → NEVER Ghost fallback.
 * §37: Cookie set directly from Server Action (no internal fetch).
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

  // ─────────────────────────────────────────────
  // 1. Ghost Auth — Fantomas is ALWAYS available (§4)
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // 2. Better Auth — ordinary users (§5, §25)
  // ─────────────────────────────────────────────
  try {
    const { getAuth } = await import('@/lib/auth');
    const auth = getAuth();

    // Try username sign-in first (requires username plugin)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await auth.api.signInUsername({
        body: { username: login, password },
      });
      if (result?.token) {
        // BA 1.7.1: server-side API doesn't automatically set cookies
        // in server action context. Set the session cookie manually.
        const cookieStore = await cookies();
        cookieStore.set('better-auth.session_token', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await auth.api.signInEmail({
        body: { email: login, password },
      });
      if (result?.token) {
        const cookieStore = await cookies();
        cookieStore.set('better-auth.session_token', result.token, {
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
    return { success: false, error: 'Service indisponible. Vérifiez la connexion.' };
  }
}
