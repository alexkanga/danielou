import { isFantomasLogin, type SessionUser } from '@/lib/fantomas';

export type LoginResult =
  | { success: true; user: SessionUser; source: string }
  | { success: false; error: string };

export async function loginAction(
  _prevState: LoginResult | null,
  formData: FormData
): Promise<LoginResult> {
  const login = String(formData.get('login') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!login || !password) {
    return { success: false, error: 'Veuillez remplir tous les champs.' };
  }

  // 1. Vérifier Fantomas (sans DB)
  if (isFantomasLogin(login, password)) {
    try {
      const baseUrl = process.env.BETTER_AUTH_URL ?? '';
      const res = await fetch(`${baseUrl}/api/auth/fantomas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, user: data.user, source: 'fantomas' };
      }
      return { success: false, error: 'Erreur lors de la connexion.' };
    } catch {
      return { success: false, error: 'Service indisponible. Réessayez.' };
    }
  }

  // 2. Better-Auth email/password
  try {
    const baseUrl = process.env.BETTER_AUTH_URL ?? '';
    const res = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: login, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: data.error ?? data.message ?? 'Identifiants invalides.',
      };
    }

    const sessionRes = await fetch(`${baseUrl}/api/auth/get-session`);
    if (sessionRes.ok) {
      const sessionData = await sessionRes.json();
      const u = sessionData.user;
      return {
        success: true,
        user: {
          id: String(u.id),
          email: String(u.email),
          name: String(u.name ?? u.email),
          role: String(u.role ?? 'reader'),
        },
        source: 'better-auth',
      };
    }

    return { success: false, error: 'Erreur lors de la récupération de la session.' };
  } catch {
    return { success: false, error: 'Service indisponible. Vérifiez la connexion.' };
  }
}
