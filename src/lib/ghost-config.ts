/**
 * M1-29.1 — Runtime Ghost Configuration
 * 
 * Lit les variables d'environnement FANTOMAS_USERNAME, FANTOMAS_PASSWORD,
 * GHOST_SESSION_SECRET et les valide. Ne jamais exposer les valeurs secrètes.
 */

export interface GhostConfigAvailable {
  available: true;
  username: string;
  sessionSecret: Uint8Array;
}

export interface GhostConfigUnavailable {
  available: false;
  reason: string;
}

export type GhostConfig = GhostConfigAvailable | GhostConfigUnavailable;

let _cached: GhostConfig | null = null;

export function getGhostConfig(): GhostConfig {
  if (_cached) return _cached;

  const username = process.env.FANTOMAS_USERNAME;
  const password = process.env.FANTOMAS_PASSWORD;
  const secret = process.env.GHOST_SESSION_SECRET;

  if (!username) {
    _cached = { available: false, reason: 'FANTOMAS_USERNAME is not set' };
    return _cached;
  }
  if (!password) {
    _cached = { available: false, reason: 'FANTOMAS_PASSWORD is not set' };
    return _cached;
  }
  if (!secret) {
    _cached = { available: false, reason: 'GHOST_SESSION_SECRET is not set' };
    return _cached;
  }

  _cached = {
    available: true,
    username,
    sessionSecret: new TextEncoder().encode(secret),
  };

  return _cached;
}

/**
 * Reset the cached config (for testing only).
 */
export function _resetGhostConfigCache(): void {
  _cached = null;
}
