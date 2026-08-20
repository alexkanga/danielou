/**
 * Fantomas — Super-administrateur fantôme.
 * Ce compte existe EN DEHORS de la base de données.
 * Il fonctionne même si la DB est supprimée ou inaccessible.
 *
 * Login  : fantomas
 * Mot de passe : fantomas
 * Nom    : Fantomas
 * Rôle   : admin (tous les privilèges)
 */

import { SignJWT, jwtVerify } from 'jose';

const FANTOMAS_CREDENTIALS = {
  login: 'fantomas',
  password: 'fantomas',
} as const;

export const FANTOMAS_USER = {
  id: 'fantomas-00000000-0000-0000-0000-000000000000',
  email: 'fantomas',
  name: 'Fantomas',
  role: 'admin' as const,
  isSuperAdmin: true,
} as const;

const COOKIE_NAME = 'danielou-fantomas-token';

function getSecret(): Uint8Array {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export function isFantomasLogin(login: string, password: string): boolean {
  return login === FANTOMAS_CREDENTIALS.login && password === FANTOMAS_CREDENTIALS.password;
}

export async function createFantomasToken(): Promise<string> {
  return new SignJWT({ ...FANTOMAS_USER })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyFantomasToken(token: string): Promise<typeof FANTOMAS_USER | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.id !== FANTOMAS_USER.id) return null;
    return FANTOMAS_USER;
  } catch {
    return null;
  }
}

export function getFantomasCookieName(): string {
  return COOKIE_NAME;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isSuperAdmin?: boolean;
}
