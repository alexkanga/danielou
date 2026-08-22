/**
 * M2-00: Test both DB connections (pooled + direct) — READ ONLY
 * NEVER print connection strings.
 */
import postgres from 'postgres';

const POOL_URL = process.env.DATABASE_URL;
const DIRECT_URL = process.env.DIRECT_URL;

if (!POOL_URL || !DIRECT_URL) {
  console.error('FATAL: DATABASE_URL or DIRECT_URL not set');
  process.exit(1);
}

// Sanitize URL for logging — never show password
function sanitize(u) {
  try {
    const url = new URL(u);
    return `${url.protocol}//${url.username}:****@${url.host}${url.pathname}`;
  } catch {
    return '[REDACTED]';
  }
}

console.log('=== M2-00: DATABASE CONNECTION TEST (READ-ONLY) ===');
console.log(`POOLED:   ${sanitize(POOL_URL)}`);
console.log(`DIRECT:   ${sanitize(DIRECT_URL)}`);
console.log('');

const results = { pooled: 'FAIL', direct: 'FAIL' };

// Test POOLED connection
try {
  const sql = postgres(POOL_URL, { max: 1, idle_timeout: 10, connect_timeout: 15 });
  const [r1] = await sql`SELECT 1 as ok`;
  const [r2] = await sql`SELECT current_database() as db`;
  const [r3] = await sql`SELECT current_schema() as schema`;
  const [r4] = await sql`SELECT version() as ver`;
  console.log(`POOLED CONNECTION:`);
  console.log(`  SELECT 1 = ${r1.ok}`);
  console.log(`  database  = ${r2.db}`);
  console.log(`  schema    = ${r3.schema}`);
  console.log(`  version   = ${r4.ver?.substring(0, 60)}...`);
  results.pooled = 'PASS';
  await sql.end();
} catch (e) {
  console.error(`POOLED CONNECTION: FAIL — ${e.message?.substring(0, 100)}`);
}

console.log('');

// Test DIRECT connection
try {
  const sql = postgres(DIRECT_URL, { max: 1, idle_timeout: 10, connect_timeout: 15 });
  const [r1] = await sql`SELECT 1 as ok`;
  const [r2] = await sql`SELECT current_database() as db`;
  const [r3] = await sql`SELECT current_schema() as schema`;
  console.log(`DIRECT CONNECTION:`);
  console.log(`  SELECT 1 = ${r1.ok}`);
  console.log(`  database  = ${r2.db}`);
  console.log(`  schema    = ${r3.schema}`);
  results.direct = 'PASS';
  await sql.end();
} catch (e) {
  console.error(`DIRECT CONNECTION: FAIL — ${e.message?.substring(0, 100)}`);
}

console.log('');
console.log('=== RESULTS ===');
console.log(`POOLED:  ${results.pooled}`);
console.log(`DIRECT:  ${results.direct}`);

if (results.pooled === 'FAIL' || results.direct === 'FAIL') {
  console.error('\nDATABASE CONNECTIVITY: BLOCKED');
  process.exit(1);
}
console.log('\nDATABASE CONNECTIVITY: PASS');
process.exit(0);
