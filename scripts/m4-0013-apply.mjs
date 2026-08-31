/**
 * M4 0013 — Migration journal reconciliation
 * 
 * Uses the project's real migration mechanism:
 *   - Raw SQL via `postgres` (DIRECT_URL pattern)
 *   - __drizzle_migrations journal (id, hash, created_at)
 *   - Hash: descriptive string matching repository convention
 *
 * This migration was applied to NEON PREVIEW via direct psql.
 * Physical schema is complete; this script records the journal entry only.
 *
 * SAFE NONPROD ONLY.
 */
import postgres from 'postgres';

const DIRECT_URL = process.argv[2];
if (!DIRECT_URL) { console.error('Usage: node scripts/m4-0013-apply.mjs <DIRECT_URL>'); process.exit(1); }

// ── Production guard ─────────────────────────────────────────
if (DIRECT_URL.includes('ep-quiet') || DIRECT_URL.includes('ep-tight')) {
  console.error('BLOCKED: refusing to run against production endpoint.');
  process.exit(1);
}

const sql = postgres(DIRECT_URL, { max: 1, idle_timeout: 10, connect_timeout: 15 });

const CANONICAL_HASH = '0013_m4_annual_results_decision_snapshot';

async function run() {
  console.log('=== M4 0013 MIGRATION JOURNAL RECONCILIATION ===\n');

  // ─────────────────────────────────────────────
  // PRE-FLIGHT: Check journal for 0013
  // ─────────────────────────────────────────────
  const [existing] = await sql`SELECT id, hash FROM __drizzle_migrations WHERE hash = ${CANONICAL_HASH}`;
  if (existing) {
    console.log('0013 ALREADY IN JOURNAL (id=' + existing.id + ', hash=' + existing.hash + '). No action.');
    console.log('0013 RECONCILIATION: SKIP (already tracked)');
    return 'SKIP';
  }

  // ─────────────────────────────────────────────
  // VERIFY: Physical schema exists
  // ─────────────────────────────────────────────
  console.log('0013 not in journal. Verifying physical schema...');

  const [ptCol] = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'pedagogical_config' AND column_name = 'promotion_threshold'
  `;
  if (!ptCol) {
    console.error('BLOCKED: promotion_threshold column not found. Physical schema incomplete.');
    process.exit(1);
  }
  console.log('  promotion_threshold column: PRESENT');

  const [arTable] = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_name = 'annual_result' AND table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  if (!arTable) {
    console.error('BLOCKED: annual_result table not found. Physical schema incomplete.');
    process.exit(1);
  }
  console.log('  annual_result table: PRESENT');

  const enumCheck = await sql`
    SELECT count(*)::int as cnt FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname IN ('annual_calculation_status', 'annual_recommendation', 'annual_final_decision')
  `;
  if (enumCheck[0].cnt < 10) {
    console.error('BLOCKED: M4 enum values incomplete (found ' + enumCheck[0].cnt + ', expected >= 10).');
    process.exit(1);
  }
  console.log('  M4 enum values: PRESENT (' + enumCheck[0].cnt + ')');

  console.log('  Physical schema: COMPLETE');

  // ─────────────────────────────────────────────
  // JOURNAL ENTRY ONLY (no DDL replay)
  // ─────────────────────────────────────────────
  console.log('\nRecording 0013 in journal...');
  await sql`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (${CANONICAL_HASH}, ${Date.now()})`;
  console.log('  ' + CANONICAL_HASH + ' recorded.');

  // ─────────────────────────────────────────────
  // VERIFY: Journal entry now present
  // ─────────────────────────────────────────────
  const [verify] = await sql`SELECT id, hash FROM __drizzle_migrations WHERE hash = ${CANONICAL_HASH}`;
  if (!verify) {
    console.error('VERIFICATION FAILED: 0013 not found in journal after insert.');
    process.exit(1);
  }
  console.log('  Verified: id=' + verify.id + ', hash=' + verify.hash);

  console.log('\n=== 0013 JOURNAL RECONCILIATION COMPLETE ===');
  return 'RECONCILED';
}

try {
  const result = await run();
  console.log('\nRESULT:', result);
  await sql.end();
} catch (e) {
  console.error('\nRECONCILIATION FAILED:', e.message);
  await sql.end();
  process.exit(1);
}
