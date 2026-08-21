/**
 * M1-29.16 — Database Health Model
 * 
 * Définit les états de santé de la DB et fournit un check léger.
 */

export type DatabaseHealthState = 'AVAILABLE' | 'UNAVAILABLE' | 'MIGRATION_REQUIRED' | 'MISCONFIGURED';

export interface DatabaseHealth {
  state: DatabaseHealthState;
  error?: string;
}

let _cached: { health: DatabaseHealth; ts: number } | null = null;
const CACHE_TTL_MS = 10_000; // 10 secondes

/**
 * Vérifie la santé de la DB.
 * Le résultat est mis en cache pour 10 secondes.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const now = Date.now();
  if (_cached && now - _cached.ts < CACHE_TTL_MS) {
    return _cached.health;
  }

  const health = await _doCheck();
  _cached = { health, ts: now };
  return health;
}

async function _doCheck(): Promise<DatabaseHealth> {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    return { state: 'MISCONFIGURED', error: 'DATABASE_URL is not set' };
  }

  try {
    // Import dynamique pour éviter de charger le module DB
    // quand la DB n'est pas configurée
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(dbUrl);
    await sql`SELECT 1 AS ok`;

    // Vérifier qu'au moins une table existe
    const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 1`;
    if (Array.isArray(tables) && tables.length === 0) {
      return { state: 'MIGRATION_REQUIRED' };
    }

    return { state: 'AVAILABLE' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('connection') ||
      msg.includes('ENOTFOUND') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('timeout') ||
      msg.includes('auth')
    ) {
      return { state: 'UNAVAILABLE' };
    }
    return { state: 'MISCONFIGURED' };
  }
}

/**
 * Invalide le cache de santé DB.
 */
export function invalidateDbHealthCache(): void {
  _cached = null;
}
