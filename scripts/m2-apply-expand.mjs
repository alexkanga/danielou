/**
 * M2-02: Apply EXPAND migration (0001_noisy_sway.sql)
 * Uses DIRECT_URL (unpooled) for DDL operations.
 * NEVER prints credentials.
 */
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = postgres(process.env.DIRECT_URL, { max: 1, idle_timeout: 10, connect_timeout: 30 });

console.log('=== M2-02: APPLY EXPAND MIGRATION ===\n');

// Read the migration SQL
const migrationPath = join(__dirname, '..', 'drizzle', '0001_noisy_sway.sql');
const migrationSql = readFileSync(migrationPath, 'utf-8');
console.log(`Migration file: 0001_noisy_sway.sql (${migrationSql.length} bytes)`);
console.log('');

// Apply in a single transaction
try {
  console.log('Applying migration...');
  await sql.begin(async (tx) => {
    // Split by statement-breakpoint and execute each statement
    const statements = migrationSql
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      // Skip pure comments
      if (stmt.startsWith('--') && !stmt.includes('CREATE') && !stmt.includes('ALTER') && !stmt.includes('DROP') && !stmt.includes('INSERT')) {
        console.log(`  [${i + 1}/${statements.length}] SKIP (comment)`);
        continue;
      }
      try {
        await tx.unsafe(stmt);
        console.log(`  [${i + 1}/${statements.length}] OK`);
      } catch (e) {
        console.error(`  [${i + 1}/${statements.length}] ERROR: ${e.message?.substring(0, 120)}`);
        throw e;
      }
    }
  });
  console.log('\nEXPAND migration applied successfully.');
} catch (e) {
  console.error(`\nEXPAND migration FAILED: ${e.message}`);
  process.exit(1);
}

// Create drizzle journal table and mark both migrations as applied
console.log('\nSetting up __drizzle_migrations journal...');
try {
  await sql`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;
  console.log('  __drizzle_migrations table created/verified.');

  // Check if 0000 is already recorded
  const [existing] = await sql`SELECT id FROM __drizzle_migrations WHERE hash LIKE '%empty_blindfold%'`;
  if (!existing) {
    await sql`INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('0000_empty_blindfold_snapshot', ${Date.now()})`;
    console.log('  0000_empty_blindfold marked as applied.');
  } else {
    console.log('  0000_empty_blindfold already recorded.');
  }

  // Record 0001
  const [existing1] = await sql`SELECT id FROM __drizzle_migrations WHERE hash LIKE '%noisy_sway%'`;
  if (!existing1) {
    await sql`INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('0001_noisy_sway_snapshot', ${Date.now()})`;
    console.log('  0001_noisy_sway marked as applied.');
  } else {
    console.log('  0001_noisy_sway already recorded.');
  }
} catch (e) {
  console.error(`  Journal setup FAILED: ${e.message}`);
}

await sql.end();
console.log('\n=== EXPAND COMPLETE ===');
