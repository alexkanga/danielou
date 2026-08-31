/**
 * DB Integration Test Setup
 *
 * This setup file is used ONLY by the DB integration test suite.
 * It mocks @/lib/db to use drizzle-orm/postgres-js instead of
 * drizzle-orm/neon-http, enabling tests to run against a standard
 * PostgreSQL service container in GitHub Actions CI.
 *
 * The mock is transparent — services import @/lib/db as usual and get
 * a fully functional drizzle instance backed by postgres-js.
 */

import { vi, afterAll } from 'vitest';

vi.mock('@/lib/db', async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required for DB integration tests');
  }

  const { default: postgres } = await import('postgres');
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const schema = await import('@/lib/db/schema');

  const sql = postgres(url, { max: 5 });
  const db = drizzle(sql, { schema });

  afterAll(async () => {
    await sql.end();
  });

  return {
    db,
    getDb: () => db,
    __esModule: true,
  };
});
