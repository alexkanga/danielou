/**
 * CI Migration Script
 *
 * Applies drizzle SQL migration files against a PostgreSQL database.
 * Used by the db-integration GitHub Actions job.
 * Reads DATABASE_URL from environment.
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  const dir = path.join(process.cwd(), 'drizzle');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    await client.query(sql);
    console.log(`Applied: ${f}`);
  }

  await client.end();
  console.log(`All migrations applied (${files.length} files)`);
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
