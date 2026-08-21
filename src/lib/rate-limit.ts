/**
 * M1-29.22 — Rate Limiting (Ghost login)
 * 
 * Rate limiting par IP avec sliding window.
 * Pas de Redis, pas de store externe — Map en mémoire.
 * Compatible serverless (recréé à chaque cold start).
 */

const attempts = new Map<string, { count: number; resetAt: number }>();

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Vérifie le rate limit pour une IP.
 * @returns true si autorisé, false si rate limited.
 */
export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Enregistre une tentative échouée (pour les tests).
 */
export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
  }
}

/**
 * Reset le rate limiting (pour les tests).
 */
export function resetRateLimit(): void {
  attempts.clear();
}
