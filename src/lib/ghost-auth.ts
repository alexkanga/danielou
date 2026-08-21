/**
 * M1-29.2/29.3/29.4 — Ghost Authentication Module
 * 
 * Remplace fantomas.ts. Ce module :
 * - Valide les credentials via env vars + timingSafeEqual
 * - Signe et vérifie les JWT Ghost avec GHOST_SESSION_SECRET dédié
 * - Gère le cycle de vie du cookie Ghost
 * 
 * INVARIANT : ce module n'importe JAMAIS le driver DB Drizzle ou Neon,
 * ou quoi que ce soit du schéma DB. Fantomas est indépendant de PostgreSQL.
 */

import { SignJWT, jwtVerify } from 'jose';
import { timingSafeEqual } from 'crypto';
import { getGhostConfig } from './ghost-config';
import { AuthorizationError } from './authorization';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

export const GHOST_COOKIE_NAME = 'danielou_ghost_session';

const GHOST_TOKEN_EXPIRY = '7d'; // 7 jours
const GHOST_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 604800

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface GhostTokenPayload {
  sub: string;
  actorType: 'ghost';
  actorIdentifier: string;
  role: 'ghost';
  name: string;
  iat: number;
  exp: number;
}

export interface GhostCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict';
  path: string;
  maxAge: number;
}

// ─────────────────────────────────────────────
// Credential Validation (M1-29.2)
// ─────────────────────────────────────────────

function normalizeIdentifier(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Compare deux chaînes de manière constant-time.
 * Si les longueurs diffèrent, retourne false sans révéler la longueur attendue.
 */
function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Valide les credentials Ghost.
 * Ne jamais logger le password.
 * 
 * @param identifier - L'identifiant saisi par l'utilisateur
 * @param password - Le mot de passe saisi par l'utilisateur
 * @returns true si les credentials correspondent à Fantomas
 */
export function validateGhostCredentials(
  identifier: string,
  password: string,
): boolean {
  const config = getGhostConfig();
  if (!config.available) return false;

  const normalizedInput = normalizeIdentifier(identifier);
  const normalizedConfig = normalizeIdentifier(config.username);

  if (!safeEquals(normalizedInput, normalizedConfig)) return false;

  // FANTOMAS_PASSWORD is guaranteed present when config.available
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const expectedPassword = process.env.FANTOMAS_PASSWORD!;
  if (!safeEquals(password, expectedPassword)) return false;

  return true;
}

// ─────────────────────────────────────────────
// Ghost Session Signer (M1-29.3)
// ─────────────────────────────────────────────

/**
 * Signe un JWT Ghost avec GHOST_SESSION_SECRET.
 * Le payload est minimal : sub, actorType, actorIdentifier, role, name, iat, exp.
 */
export async function signGhostSession(): Promise<string> {
  const config = getGhostConfig();
  if (!config.available) {
    throw new AuthorizationError('GHOST_CONFIGURATION_ERROR');
  }

  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    sub: 'fantomas-ghost',
    actorType: 'ghost',
    actorIdentifier: config.username,
    role: 'ghost',
    name: 'Fantomas',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(GHOST_TOKEN_EXPIRY)
    .sign(config.sessionSecret);
}

// ─────────────────────────────────────────────
// Ghost Session Verifier (M1-29.3)
// ─────────────────────────────────────────────

/**
 * Vérifie un token Ghost JWT.
 * Vérifie la signature, l'expiration, sub, et actorType.
 * 
 * @returns Le payload si valide, null sinon.
 */
export async function verifyGhostSession(
  token: string,
): Promise<GhostTokenPayload | null> {
  const config = getGhostConfig();
  if (!config.available) return null;

  try {
    const { payload } = await jwtVerify(token, config.sessionSecret);

    // Validate payload structure
    if (payload.sub !== 'fantomas-ghost') return null;
    if (payload.actorType !== 'ghost') return null;
    if (payload.role !== 'ghost') return null;

    return payload as unknown as GhostTokenPayload;
  } catch {
    // Invalid signature, expired, malformed token
    return null;
  }
}

// ─────────────────────────────────────────────
// Cookie Lifecycle (M1-29.4)
// ─────────────────────────────────────────────

/**
 * Retourne les options du cookie Ghost.
 */
export function getGhostCookieOptions(): GhostCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: GHOST_MAX_AGE_SECONDS,
  };
}

/**
 * Retourne les options pour supprimer le cookie Ghost.
 */
export function getGhostCookieDeleteOptions(): { maxAge: 0; path: string } {
  return {
    maxAge: 0,
    path: '/',
  };
}
