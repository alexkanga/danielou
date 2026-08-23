'use server';

import { cookies, headers } from 'next/headers';
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

  try {
    const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for') || '';
    const userAgent = headersList.get('user-agent') || '';

    // Try username sign-in via BA HTTP endpoint
    try {
      const resp = await fetch(`${baseUrl}/api/auth/sign-in/username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(userAgent ? { 'user-agent': userAgent } : {}), ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}) },
        body: JSON.stringify({ username: login, password }),
        redirect: 'manual',
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.token && data?.user) {
          // Forward all Set-Cookie headers from BA to the client
          const respHeaders = resp.headers;
          const cookieStore = await cookies();
          respHeaders.forEach((value, key) => {
            if (key === 'set-cookie') {
              const match = value.match(/^([^=]+)=([^;]*)/);
              if (match) {
                const [, name, val] = match;
                cookieStore.set(name, val, {
                  httpOnly: true,
                  secure: true,
                  sameSite: 'lax',
                  path: '/',
                });
              }
            }
          });
          const u = data.user as Record<string, unknown>;
          const isSuperAdmin = Boolean(u.isSuperAdmin || u.platformRole === 'super_admin');
          return {
            success: true,
            user: { id: String(u.id ?? ''), email: String(u.email ?? login), name: String(u.name ?? login), platformRole: isSuperAdmin ? 'super_admin' : 'none' },
            source: 'better-auth',
          };
        }
      }
    } catch { /* username failed */ }

    // Try email sign-in
    try {
      const resp = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(userAgent ? { 'user-agent': userAgent } : {}), ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}) },
        body: JSON.stringify({ email: login, password }),
        redirect: 'manual',
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.token && data?.user) {
          const respHeaders = resp.headers;
          const cookieStore = await cookies();
          respHeaders.forEach((value, key) => {
            if (key === 'set-cookie') {
              const match = value.match(/^([^=]+)=([^;]*)/);
              if (match) {
                const [, name, val] = match;
                cookieStore.set(name, val, {
                  httpOnly: true,
                  secure: true,
                  sameSite: 'lax',
                  path: '/',
                });
              }
            }
          });
          const u = data.user as Record<string, unknown>;
          const isSuperAdmin = Boolean(u.isSuperAdmin || u.platformRole === 'super_admin');
          return {
            success: true,
            user: { id: String(u.id ?? ''), email: String(u.email ?? login), name: String(u.name ?? login), platformRole: isSuperAdmin ? 'super_admin' : 'none' },
            source: 'better-auth',
          };
        }
      }
    } catch { /* email failed */ }

    return { success: false, error: 'Identifiants invalides.' };
  } catch {
    return { success: false, error: 'Service indisponible.' };
  }
}
