/**
 * M5 Non-Prod DB Inspection — BEFORE state capture
 * SAFE NONPROD ONLY
 */
import postgres from 'postgres';

const DIRECT_URL = process.argv[2];
if (!DIRECT_URL) { console.error('Usage: node scripts/m5-inspect-db.mjs <DATABASE_URL>'); process.exit(1); }

const sql = postgres(DIRECT_URL, { max: 1, idle_timeout: 10, connect_timeout: 15 });

try {
  console.log('=== DATABASE INSPECTION ===\n');

  // 1. DB identity
  const [db] = await sql`SELECT current_database() as db, version() as ver`;
  console.log('DB:', db.db);
  console.log('VERSION:', db.ver?.substring(0, 80));

  // 2. All public tables
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
  console.log('\nTABLES:', tables.map(t => t.table_name).join(', '));

  // 3. Row counts for key tables (to assess if PROD)
  for (const tbl of ['"user"', 'student', 'enrollment', 'grade', 'school', 'assessment']) {
    try {
      const [r] = await sql`SELECT count(*)::int as n FROM ${sql.unsafe(tbl)}`;
      console.log(`  ${tbl} rows: ${r.n}`);
    } catch (e) {
      console.log(`  ${tbl}: NOT FOUND`);
    }
  }

  // 4. Check M5 target tables
  for (const tbl of ['report_card', 'report_card_item', 'report_card_component_item']) {
    const [r] = await sql`SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=${tbl}) as exists_`;
    console.log(`  ${tbl}: ${r.exists_ ? 'EXISTS' : 'MISSING'}`);
  }

  // 5. Check enums
  const enums = await sql`SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname='public' ORDER BY t.typname`;
  console.log('\nENUMS:', enums.map(e => e.typname).join(', '));

  // 6. Check general_average_input_policy
  const [gap] = await sql`SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname='general_average_input_policy') as exists_`;
  console.log('\ngeneral_average_input_policy enum:', gap.exists_ ? 'EXISTS' : 'MISSING');

  // 7. Check pedagogical_config columns
  const pcCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='pedagogical_config' ORDER BY ordinal_position`;
  console.log('pedagogical_config columns:', pcCols.map(c => c.column_name).join(', '));
  const hasGapCol = pcCols.some(c => c.column_name === 'general_average_input_policy');
  console.log('  general_average_input_policy column:', hasGapCol ? 'EXISTS' : 'MISSING');

  // 8. Migration journal
  const [jr] = await sql`SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='__drizzle_migrations') as exists_`;
  console.log('\n__drizzle_migrations table:', jr.exists_ ? 'EXISTS' : 'MISSING');
  if (jr.exists_) {
    const journal = await sql`SELECT * FROM __drizzle_migrations ORDER BY id`;
    console.log('Journal entries:', journal.length);
    journal.forEach(j => console.log('  id:', j.id, 'hash:', j.hash));
  }

  // 9. Classification
  const [userCount] = await sql`SELECT count(*)::int as n FROM "user"`;
  const isProd = userCount.n > 50;
  console.log('\n=== CLASSIFICATION ===');
  console.log('User count:', userCount.n);
  console.log('Classification:', isProd ? 'SUSPECTED_PRODUCTION' : 'SAFE_NONPROD_POSTGRES');

} catch (e) {
  console.error('INSPECTION ERROR:', e.message);
  process.exit(1);
} finally {
  await sql.end();
}
