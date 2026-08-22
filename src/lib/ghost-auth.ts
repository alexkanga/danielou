/**
 * R-V2-M1-H2 — Always-Available Ghost Authentication Module
 * 
 * Fantomas authentication is completely independent of:
 * - PostgreSQL / Neon / any database
 * - Better Auth
 * - Vercel / any hosting provider
 * - GHOST_SESSION_SECRET (optional — affects security mode only)
 * - FANTOMAS_USERNAME / FANTOMAS_PASSWORD (optional — built-in defaults)
 * 
 * INVARIANT: this module NEVER imports DB driver, Better Auth, or any
 * hosting-provider identity mechanism.
 * 
 * Security modes (§9/§17/§18):
 * - external_secret: GHOST_SESSION_SECRET present → preferred cryptographic signing
 * - built_in_fallback: GHOST_SESSION_SECRET absent → deterministic built-in key
 *   (integrity protection, not deployment-specific confidentiality — see §20)
 * 
 * Both modes produce identical GhostActor with identical permissions.
 * NO permission degradation in either mode (§10).
 */

import { SignJWT, jwtVerify } from 'jose';
import { timingSafeEqual } from 'crypto';
import { getGhostConfig } from './ghost-config';

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
  securityMode: 'external_secret' | 'built_in_fallback';
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
// Credential Validation (§2, §4, §40)
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
 * Works with built-in credentials or env overrides.
 * No database call. No external dependency.
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
  // config.available is ALWAYS true — no guard needed

  const normalizedInput = normalizeIdentifier(identifier);
  const normalizedConfig = normalizeIdentifier(config.username);

  if (!safeEquals(normalizedInput, normalizedConfig)) return false;

  // Use resolved password (env override or built-in)
  if (!safeEquals(password, config.password)) return false;

  return true;
}

// ─────────────────────────────────────────────
// Ghost Session Signer (§17, §18)
// ─────────────────────────────────────────────

/**
 * Signe un JWT Ghost.
 * 
 * In external_secret mode: uses GHOST_SESSION_SECRET.
 * In built_in_fallback mode: uses deterministic built-in key.
 * 
 * The payload includes securityMode for audit/debugging.
 * Permissions are IDENTICAL in both modes (§10).
 */
export async function signGhostSession(): Promise<string> {
  const config = getGhostConfig();

  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    sub: 'fantomas-ghost',
    actorType: 'ghost',
    actorIdentifier: config.username,
    role: 'ghost',
    name: 'Fantomas',
    securityMode: config.securityMode,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(GHOST_TOKEN_EXPIRY)
    .sign(config.sessionSecret);
}

// ─────────────────────────────────────────────
// Ghost Session Verifier (§17, §18, §41)
// ─────────────────────────────────────────────

/**
 * Vérifie un token Ghost JWT.
 * 
 * Works in both security modes:
 * - Tries the current active secret (external or fallback).
 * - Validates signature, expiration, sub, and actorType.
 * 
 * §41: Modified/forged tokens → null (integrity protected in both modes).
 * 
 * @returns Le payload si valide, null sinon.
 */
export async function verifyGhostSession(
  token: string,
): Promise<GhostTokenPayload | null> {
  const config = getGhostConfig();

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
// Cookie Lifecycle
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
