/**
 * Test SQL Client
 *
 * Provides a database SQL client for test fixture creation and cleanup.
 * Automatically selects the appropriate driver:
 *   - Neon URLs (*.neon.tech) → @neondatabase/serverless neon() HTTP client
 *   - Standard PostgreSQL → postgres library (TCP)
 *
 * Both return tagged-template-literal SQL functions compatible at runtime.
 */

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import postgres from 'postgres';

/** Tagged template SQL function — both neon() and postgres() satisfy this */
export type SqlClient = NeonQueryFunction<false, false>;

/**
 * Creates a SQL client for test fixture management.
 * In CI with standard PostgreSQL service containers, uses the `postgres` library.
 * Locally / against Neon, uses the `neon()` HTTP client.
 */
export function createSqlClient(url: string): SqlClient {
  if (url.includes('.neon.tech')) {
    return neon(url);
  }
  // Standard PostgreSQL (CI service container)
  // Runtime-compatible: both support tagged template literals
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return postgres(url, { max: 5 }) as any;
}

/**
 * Closes a SQL client. No-op for neon() (stateless HTTP).
 * Required for postgres() to release connections.
 */
export async function closeSqlClient(client: SqlClient): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = client as any;
  if (typeof c.end === 'function') {
    await c.end();
  }
}
