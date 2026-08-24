/**
 * M5 PRODUCTION PRE-FLIGHT — READ ONLY STATE CAPTURE
 * Captures full production state before any mutation.
 */
import pg from 'pg';
const { Client } = pg;

const DIRECT_URL = process.argv[2];
if (!DIRECT_URL) { console.error('Usage: node scripts/prod-preflight.mjs <DIRECT_URL>'); process.exit(1); }

const client = new Client({ connectionString: DIRECT_URL });
await client.connect();
const q = (sql) => client.query(sql).then(r => r.rows);

async function run() {
  console.log('============================================================');
  console.log('PRODUCTION PRE-FLIGHT — READ ONLY STATE CAPTURE');
  console.log('============================================================\n');

  // DB identity (safe metadata only)
  const [dbInfo] = await q(`
    SELECT current_database() as db, inet_server_addr() as addr, version() as ver
  `);
  console.log('--- DB IDENTITY ---');
  console.log('  database:', dbInfo.db);
  console.log('  version:', dbInfo.ver.split(',')[0]);

  // Migration state
  console.log('\n--- MIGRATION STATE ---');
  const migrations = await q(`SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id`);
  console.log('  __drizzle_migrations entries:', migrations.length);
  for (const m of migrations) {
    console.log('    id=' + m.id + ' hash=' + m.hash + ' created_at=' + m.created_at);
  }

  // Table list
  console.log('\n--- TABLES ---');
  const tables = await q(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `);
  console.log('  tables (' + tables.length + '):', tables.map(t => t.tablename).join(', '));

  // Enum types
  console.log('\n--- ENUM TYPES ---');
  const enums = await q(`
    SELECT t.typname, e.enumlabel
    FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
    ORDER BY t.typname, e.enumsortorder
  `);
  const enumMap = {};
  for (const e of enums) {
    if (!enumMap[e.typname]) enumMap[e.typname] = [];
    enumMap[e.typname].push(e.enumlabel);
  }
  for (const [name, vals] of Object.entries(enumMap)) {
    console.log('  ' + name + ': [' + vals.join(', ') + ']');
  }

  // Business data counts
  console.log('\n--- BUSINESS DATA COUNTS ---');
  const countTables = [
    'user', 'account', 'session', 'school_membership',
    'school', 'student', 'enrollment', 'classroom_assignment',
    'academic_year', 'academic_period', 'level', 'classroom',
    'subject', 'subject_component', 'assessment_type',
    'pedagogical_config', 'config_subject', 'config_component',
    'assessment', 'grade',
    'report_card', 'report_card_item', 'report_card_component_item',
    'audit_log'
  ];
  for (const t of countTables) {
    try {
      const [r] = await q(`SELECT count(*) as cnt FROM "${t}"`);
      console.log('  ' + t.padEnd(30) + r.cnt);
    } catch (e) {
      console.log('  ' + t.padEnd(30) + 'TABLE NOT FOUND');
    }
  }

  // Report card schema (if exists)
  console.log('\n--- REPORT CARD SCHEMA (if exists) ---');
  const rcCols = await q(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns WHERE table_name = 'report_card'
    ORDER BY ordinal_position
  `);
  if (rcCols.length > 0) {
    for (const c of rcCols) {
      console.log('  rc.' + c.column_name.padEnd(30) + c.data_type.padEnd(20) + 'nullable=' + c.is_nullable + ' default=' + c.column_default);
    }
  } else {
    console.log('  (report_card table not found)');
  }

  // report_card_item schema
  const rciCols = await q(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns WHERE table_name = 'report_card_item'
    ORDER BY ordinal_position
  `);
  if (rciCols.length > 0) {
    console.log('\n--- REPORT CARD ITEM SCHEMA ---');
    for (const c of rciCols) {
      console.log('  rci.' + c.column_name.padEnd(30) + c.data_type.padEnd(20) + 'nullable=' + c.is_nullable);
    }
  }

  // report_card_component_item
  const rcciCols = await q(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'report_card_component_item' ORDER BY ordinal_position
  `);
  if (rcciCols.length > 0) {
    console.log('\n--- REPORT CARD COMPONENT ITEM SCHEMA ---');
    for (const c of rcciCols) {
      console.log('  rcci.' + c.column_name.padEnd(30) + c.data_type);
    }
  } else {
    console.log('\n--- REPORT CARD COMPONENT ITEM --- (not found)');
  }

  // Indexes on report_card tables
  console.log('\n--- REPORT CARD INDEXES ---');
  const rcIdx = await q(`
    SELECT indexname, tablename FROM pg_indexes
    WHERE tablename IN ('report_card', 'report_card_item', 'report_card_component_item')
    ORDER BY tablename, indexname
  `);
  for (const i of rcIdx) {
    console.log('  ' + i.tablename + '.' + i.indexname);
  }

  // pedagogical_config general_average_input_policy
  console.log('\n--- PEDAGOGICAL CONFIG COLUMNS ---');
  const pcCols = await q(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns WHERE table_name = 'pedagogical_config'
    ORDER BY ordinal_position
  `);
  for (const c of pcCols) {
    console.log('  pc.' + c.column_name.padEnd(35) + c.data_type + ' default=' + c.column_default);
  }

  // Orphan checks (M1-M4 integrity baseline)
  console.log('\n--- ORPHAN CHECKS (BASELINE) ---');
  const orphanChecks = [
    ['orphan grades (no assessment)', 'SELECT count(*) as cnt FROM grade g WHERE NOT EXISTS (SELECT 1 FROM assessment a WHERE a.id = g.assessment_id)'],
    ['orphan enrollments (no student)', 'SELECT count(*) as cnt FROM enrollment e WHERE NOT EXISTS (SELECT 1 FROM student s WHERE s.id = e.student_id)'],
    ['orphan classroom_assignments', 'SELECT count(*) as cnt FROM classroom_assignment ca WHERE NOT EXISTS (SELECT 1 FROM enrollment e WHERE e.id = ca.enrollment_id)'],
    ['orphan assessments (no subject)', 'SELECT count(*) as cnt FROM assessment a WHERE NOT EXISTS (SELECT 1 FROM subject s WHERE s.id = a.subject_id)'],
  ];
  for (const [label, sql] of orphanChecks) {
    try {
      const [r] = await q(sql);
      console.log('  ' + label.padEnd(40) + r.cnt);
    } catch (e) {
      console.log('  ' + label.padEnd(40) + 'QUERY ERROR');
    }
  }

  console.log('\n============================================================');
  console.log('PRE-FLIGHT COMPLETE — READ ONLY, NO MUTATIONS');
  console.log('============================================================');
}

try {
  await run();
} catch (e) {
  console.error('PREFLIGHT ERROR:', e.message);
  process.exit(1);
} finally {
  await client.end();
}
