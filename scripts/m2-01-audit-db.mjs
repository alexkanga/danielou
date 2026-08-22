/**
 * M2-01: REAL DATABASE AUDIT — READ ONLY
 * Classifies environment, counts data, checks schema drift.
 * NEVER prints credentials.
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 10, connect_timeout: 15 });

console.log('=== M2-01: REAL DATABASE AUDIT ===\n');

// --- ENVIRONMENT CLASSIFICATION ---
console.log('--- ENVIRONMENT CLASSIFICATION ---');
const [dbInfo] = await sql`SELECT current_database() as db, current_user as usr, inet_server_addr() as addr`;
console.log(`database: ${dbInfo.db}`);
console.log(`user:     ${dbInfo.usr}`);
console.log(`addr:     ${dbInfo.addr}`);

// Classify
const [tableCount] = await sql`SELECT COUNT(*)::int as n FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
console.log(`\ntables in public schema: ${tableCount.n}`);

// Check for typical production signals
const [roleCount] = await sql`SELECT COUNT(DISTINCT rolname)::int as n FROM pg_roles WHERE rolname NOT LIKE 'pg_%'`;
console.log(`non-system roles: ${roleCount.n}`);

// Check drizzle migrations table
const drizzleExists = await sql`SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = '__drizzle_migrations'
)`;
console.log(`drizzle migrations table: ${drizzleExists[0].exists ? 'YES' : 'NO'}`);

if (drizzleExists[0].exists) {
  const migrations = await sql`SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at`;
  console.log(`  applied migrations: ${migrations.length}`);
  for (const m of migrations) {
    console.log(`    - ${m.id} (hash: ${m.hash?.substring(0,8)}...)`);
  }
}

// --- TABLE INVENTORY ---
console.log('\n--- TABLE INVENTORY ---');
const tables = await sql`
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
  ORDER BY table_name
`;
for (const t of tables) {
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM ${sql(t.table_name)}`;
  console.log(`  ${t.table_name}: ${n} rows`);
}

// --- BUSINESS DATA COUNTS ---
console.log('\n--- BUSINESS DATA COUNTS ---');
const [studentCount] = await sql`SELECT COUNT(*)::int as n FROM student`;
const [enrollmentCount] = await sql`SELECT COUNT(*)::int as n FROM enrollment`;
const [classroomCount] = await sql`SELECT COUNT(*)::int as n FROM classroom`;
const [schoolCount] = await sql`SELECT COUNT(*)::int as n FROM school`;
const [ayCount] = await sql`SELECT COUNT(*)::int as n FROM academic_year`;
const [userCount] = await sql`SELECT COUNT(*)::int as n FROM "user"`;
console.log(`school:               ${schoolCount.n}`);
console.log(`academic_year:        ${ayCount.n}`);
console.log(`student:              ${studentCount.n}`);
console.log(`enrollment:           ${enrollmentCount.n}`);
console.log(`classroom:            ${classroomCount.n}`);
console.log(`user:                 ${userCount.n}`);
try {
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM classroom_assignment`;
  console.log(`classroom_assignment: ${n}`);
} catch {
  console.log('classroom_assignment: TABLE DOES NOT EXIST (pre-EXPAND)');
}

// --- ENROLLMENT CLASSROOM_ID ANALYSIS ---
console.log('\n--- ENROLLMENT.CLASSROOM_ID ANALYSIS ---');
const [enNotNull] = await sql`SELECT COUNT(*)::int as n FROM enrollment WHERE classroom_id IS NOT NULL`;
const [enIsNull] = await sql`SELECT COUNT(*)::int as n FROM enrollment WHERE classroom_id IS NULL`;
console.log(`enrollment with classroom_id NOT NULL: ${enNotNull.n}`);
console.log(`enrollment with classroom_id IS NULL:    ${enIsNull.n}`);

// --- ENROLLMENT STATUS DISTRIBUTION ---
console.log('\n--- ENROLLMENT STATUS DISTRIBUTION ---');
const statuses = await sql`SELECT status, COUNT(*)::int as n FROM enrollment GROUP BY status ORDER BY n DESC`;
for (const s of statuses) {
  console.log(`  ${s.status}: ${s.n}`);
}

// --- SCHOOL_ID ANALYSIS ---
console.log('\n--- ENROLLMENT.SCHOOL_ID ANALYSIS ---');
try {
  const [enSchoolNotNull] = await sql`SELECT COUNT(*)::int as n FROM enrollment WHERE school_id IS NOT NULL`;
  const [enSchoolIsNull] = await sql`SELECT COUNT(*)::int as n FROM enrollment WHERE school_id IS NULL`;
  console.log(`enrollment.school_id NOT NULL: ${enSchoolNotNull.n}`);
  console.log(`enrollment.school_id IS NULL:    ${enSchoolIsNull.n}`);
} catch (e) {
  console.log(`  column school_id does not exist yet (pre-EXPAND state)`);
}

// --- ENUMS ---
console.log('\n--- ENUMS IN PUBLIC SCHEMA ---');
const enums = await sql`
  SELECT t.typname, e.enumlabel 
  FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid 
  ORDER BY t.typname, e.enumsortorder
`;
const enumMap = {};
for (const e of enums) {
  if (!enumMap[e.typname]) enumMap[e.typname] = [];
  enumMap[e.typname].push(e.enumlabel);
}
for (const [name, values] of Object.entries(enumMap)) {
  console.log(`  ${name}: [${values.join(', ')}]`);
}

// --- ENROLLMENT TABLE STRUCTURE ---
console.log('\n--- ENROLLMENT COLUMNS ---');
const enCols = await sql`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'enrollment'
  ORDER BY ordinal_position
`;
for (const c of enCols) {
  console.log(`  ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'} ${c.column_default ? `DEFAULT ${c.column_default}` : ''}`);
}

// --- CLASSROOM_ASSIGNMENT TABLE STRUCTURE ---
console.log('\n--- CLASSROOM_ASSIGNMENT COLUMNS ---');
try {
  const caCols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'classroom_assignment'
    ORDER BY ordinal_position
  `;
  for (const c of caCols) {
    console.log(`  ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'} ${c.column_default ? `DEFAULT ${c.column_default}` : ''}`);
  }
} catch (e) {
  console.log('  table does not exist yet (pre-EXPAND state)');
}

// --- FOREIGN KEYS ---
console.log('\n--- FOREIGN KEYS ---');
const fks = await sql`
  SELECT
    tc.table_name, kcu.column_name, 
    ccu.table_name AS foreign_table_name, 
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
  FROM information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND (tc.table_name = 'enrollment' OR tc.table_name = 'classroom_assignment')
  ORDER BY tc.table_name, kcu.column_name
`;
for (const f of fks) {
  console.log(`  ${f.table_name}.${f.column_name} -> ${f.foreign_table_name}.${f.foreign_column_name} (ON DELETE ${f.delete_rule})`);
}

// --- INDEXES ---
console.log('\n--- INDEXES (enrollment + classroom_assignment) ---');
const idxs = await sql`
  SELECT indexname, tablename, indexdef
  FROM pg_indexes 
  WHERE schemaname = 'public' 
    AND (tablename = 'enrollment' OR tablename = 'classroom_assignment')
  ORDER BY tablename, indexname
`;
for (const i of idxs) {
  console.log(`  ${i.tablename}.${i.indexname}: ${i.indexdef?.substring(0, 120)}`);
}

// --- CHECK CONSTRAINTS ---
console.log('\n--- CHECK CONSTRAINTS ---');
const checks = await sql`
  SELECT tc.table_name, tc.constraint_name, cc.check_clause
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
  WHERE tc.table_schema = 'public'
    AND (tc.table_name = 'enrollment' OR tc.table_name = 'classroom_assignment')
  ORDER BY tc.table_name
`;
for (const c of checks) {
  console.log(`  ${c.table_name}.${c.constraint_name}: ${c.check_clause}`);
}
if (checks.length === 0) console.log('  (none found)');

// --- TRIGGERS ---
console.log('\n--- TRIGGERS (enrollment + classroom_assignment) ---');
const triggers = await sql`
  SELECT trigger_name, event_manipulation, event_object_table, action_statement
  FROM information_schema.triggers
  WHERE event_object_schema = 'public'
    AND (event_object_table = 'enrollment' OR event_object_table = 'classroom_assignment')
  ORDER BY event_object_table, trigger_name
`;
for (const t of triggers) {
  console.log(`  ${t.event_object_table}.${t.trigger_name} (${t.event_manipulation}): ${t.action_statement?.substring(0, 80)}`);
}
if (triggers.length === 0) console.log('  (none found)');

// --- ENVIRONMENT VERDICT ---
console.log('\n=== ENVIRONMENT CLASSIFICATION ===');
const isDev = dbInfo.db === 'neondb' && studentCount.n <= 10 && userCount.n <= 10;
console.log(`VERDICT: ${isDev ? 'DEVELOPMENT' : 'PRODUCTION / UNKNOWN — MIGRATION RESTRICTED TO READ-ONLY'}`);
console.log(`BUSINESS DATA CONFIRMED FROM POSTGRESQL:`);
console.log(`  student=${studentCount.n}, enrollment=${enrollmentCount.n}, classroom=${classroomCount.n}`);

await sql.end();
