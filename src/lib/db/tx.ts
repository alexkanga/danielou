/**
 * Transaction-capable Drizzle instance for operations requiring DB transactions.
 *
 * The default `db` (src/lib/db/index.ts) uses drizzle-orm/neon-http which
 * does NOT support transactions (throws on db.transaction()).
 *
 * This module provides a transaction-capable Drizzle instance using
 * @neondatabase/serverless Pool (WebSocket transport) which supports
 * BEGIN/COMMIT/ROLLBACK.
 *
 * USAGE: Only for write paths that require atomic multi-statement operations.
 * Read-only queries should continue using the default `db` from src/lib/db.
 */

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

let _txDb: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: Pool | null = null;

function getConnectionString(): string {
  // DIRECT_URL is preferred for transactions (direct Neon connection).
  // Fall back to DATABASE_URL (also works via WebSocket proxy).
  return process.env.DIRECT_URL || process.env.DATABASE_URL || '';
}

/**
 * Get a transaction-capable Drizzle instance.
 * Uses @neondatabase/serverless Pool (WebSocket) which supports transactions.
 */
export function getTxDb() {
  if (!_txDb) {
    const connectionString = getConnectionString();
    if (!connectionString) {
      throw new Error('Neither DIRECT_URL nor DATABASE_URL is set');
    }
    _pool = new Pool({ connectionString });
    _txDb = drizzle(_pool, { schema });
  }
  return _txDb;
}

export type TxDatabase = ReturnType<typeof getTxDb>;
