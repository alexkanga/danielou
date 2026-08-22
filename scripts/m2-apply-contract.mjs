/**
 * M2-07: Apply CONTRACT migration (0002_curious_mindworm.sql)
 * Drops enrollment.classroom_id and its index.
 */
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = postgres(process.env.DIRECT_URL, { max: 1, idle_timeout: 10, connect_timeout: 30 });

console.log('=== M2-07: APPLY CONTRACT MIGRATION ===\n');

const migrationPath = join(__dirname, '..', 'drizzle', '0002_curious_mindworm.sql');
const migrationSql = readFileSync(migrationPath, 'utf-8');
console.log(`Migration file: 0002_curious_mindworm.sql (${migrationSql.length} bytes)`);

try {
  await sql.begin(async (tx) => {
    const statements = migrationSql
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      try {
        await tx.unsafe(statements[i]);
        console.log(`  [${i + 1}/${statements.length}] OK`);
      } catch (e) {
        console.error(`  [${i + 1}/${statements.length}] ERROR: ${e.message?.substring(0, 120)}`);
        throw e;
      }
    }
  });
  console.log('\nCONTRACT migration applied successfully.');
} catch (e) {
  console.error(`\nCONTRACT FAILED: ${e.message}`);
  process.exit(1);
}

// Record in journal
await sql`INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('0002_curious_mindworm_snapshot', ${Date.now()})`;
console.log('Contract recorded in journal.');

// Verify
const [enCols] = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'enrollment' AND column_name = 'classroom_id'
`;
console.log(`\nPOST-CONTRACT: enrollment.classroom_id exists = ${!!enCols}`);

if (enCols) {
  console.error('CONTRACT FAILED — classroom_id still exists!');
  process.exit(1);
}
console.log('CONTRACT VERIFIED: classroom_id removed from enrollment.');

await sql.end();
