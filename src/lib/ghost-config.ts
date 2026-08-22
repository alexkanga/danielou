/**
 * R-V2-M1-H2 — Always-Available Ghost Configuration
 * 
 * Fantomas is a built-in application-level system principal.
 * It NEVER requires database, Better Auth, hosting provider, or any
 * external session secret to be available.
 * 
 * Built-in credentials (current contract):
 *   username: fantomas
 *   password: fantomas
 * 
 * Environment variables MAY optionally override credentials and secret,
 * but their absence MUST NEVER disable Fantomas.
 * 
 * Security modes:
 *   - external_secret: GHOST_SESSION_SECRET present → preferred
 *   - built_in_fallback: GHOST_SESSION_SECRET absent → deterministic
 *     built-in integrity mechanism (continuity across restarts/instances).
 * 
 * SECURITY DISCLOSURE (§20):
 *   The built-in fallback signing mechanism provides continuity and token
 *   integrity but is NOT equivalent to a private deployment-specific
 *   GHOST_SESSION_SECRET. The fallback key is deterministic and present in
 *   application code. Permissions and availability remain unchanged.
 */

// ─────────────────────────────────────────────
// Built-in Credentials (§2)
// ─────────────────────────────────────────────

/** Built-in Fantomas username — always available, never requires env var. */
const BUILT_IN_USERNAME = 'fantomas';

/** Built-in Fantomas password — always available, never requires env var. */
const BUILT_IN_PASSWORD = 'fantomas';

/**
 * Built-in fallback signing key for when GHOST_SESSION_SECRET is absent.
 * 
 * This provides deterministic token integrity across restarts and instances.
 * It is NOT a secret — it is present in source code and provides integrity,
 * not confidentiality. See §20 security disclosure above.
 */
const BUILT_IN_FALLBACK_SECRET = 
  'danielou-ghost-fallback-v1-builtin-integrity-key-32chars';

// ─────────────────────────────────────────────
// Types (§9, §21)
// ─────────────────────────────────────────────

export type GhostSessionSecurityMode = 'external_secret' | 'built_in_fallback';

export interface GhostConfig {
  /** ALWAYS true — Fantomas is never unavailable. */
  readonly available: true;
  /** Resolved username (env override or built-in default). */
  readonly username: string;
  /** Resolved password (env override or built-in default). SERVER-ONLY — never expose. */
  readonly password: string;
  /** Cryptographic key for JWT signing/verification. */
  readonly sessionSecret: Uint8Array;
  /** Which security mode is active. */
  readonly securityMode: GhostSessionSecurityMode;
}

// ─────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────

let _cached: GhostConfig | null = null;

// ─────────────────────────────────────────────
// Config Resolution (§3, §8, §21)
// ─────────────────────────────────────────────

/**
 * Returns the Ghost configuration. ALWAYS available.
 * 
 * - FANTOMAS_USERNAME / FANTOMAS_PASSWORD: optional overrides for built-in credentials.
 * - GHOST_SESSION_SECRET: optional. When absent, uses built-in fallback key.
 * 
 * `available` is ALWAYS `true`. There is no `available: false` state.
 */
export function getGhostConfig(): GhostConfig {
  if (_cached) return _cached;

  // §3: Optional env overrides. Missing vars MUST NEVER disable Fantomas.
  const username = process.env.FANTOMAS_USERNAME || BUILT_IN_USERNAME;
  const password = process.env.FANTOMAS_PASSWORD || BUILT_IN_PASSWORD;
  const externalSecret = process.env.GHOST_SESSION_SECRET;

  // §8/§9: GHOST_SESSION_SECRET is OPTIONAL for availability.
  let sessionSecret: Uint8Array;
  let securityMode: GhostSessionSecurityMode;

  if (externalSecret) {
    sessionSecret = new TextEncoder().encode(externalSecret);
    securityMode = 'external_secret';
  } else {
    // §18/§19: Built-in fallback — deterministic, server-only, integrity-checked.
    sessionSecret = new TextEncoder().encode(BUILT_IN_FALLBACK_SECRET);
    securityMode = 'built_in_fallback';
  }

  _cached = {
    available: true,
    username,
    password,
    sessionSecret,
    securityMode,
  };

  return _cached;
}

/**
 * Reset the cached config (for testing only).
 */
export function _resetGhostConfigCache(): void {
  _cached = null;
}

/**
 * Returns the built-in username constant.
 * Useful for tests that need to verify Fantomas detection.
 */
export function getBuiltinUsername(): string {
  return BUILT_IN_USERNAME;
}

/**
 * Returns the built-in password constant.
 * Useful for tests only — NEVER log or expose.
 */
export function _getBuiltinPassword(): string {
  return BUILT_IN_PASSWORD;
}
