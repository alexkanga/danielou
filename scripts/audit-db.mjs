import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }
const sql = neon(url);

async function audit() {
  console.log('=== TABLES & ROW COUNTS ===');
  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  for (const t of tables) {
    const [r] = await sql`SELECT count(*)::int as cnt FROM "${sql.unsafe(t.tablename)}"`;
    console.log(`  ${t.tablename}: ${r.cnt} rows`);
  }

  console.log('\n=== ENUMS ===');
  const enums = await sql`
    SELECT t.typname, e.enumlabel, e.enumsortorder 
    FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid 
    ORDER BY t.typname, e.enumsortorder
  `;
  let curEnum = '';
  for (const e of enums) {
    if (e.typname !== curEnum) { console.log(`  ${e.typname}:`); curEnum = e.typname; }
    console.log(`    ${e.enumlabel}`);
  }

  console.log('\n=== INDEXES (non-PK) ===');
  const indexes = await sql`
    SELECT indexname, tablename, indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey'
    ORDER BY tablename, indexname
  `;
  for (const i of indexes) console.log(`  ${i.tablename}.${i.indexname}`);

  console.log('\n=== FK CONSTRAINTS ===');
  const fks = await sql`
    SELECT tc.table_name, tc.constraint_name, kcu.column_name, 
           ccu.table_name AS foreign_table, ccu.column_name AS foreign_column,
           rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND ccu.table_schema = ccu.table_schema
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name
  `;
  for (const f of fks) console.log(`  ${f.table_name}.${f.constraint_name}: ${f.column_name} -> ${f.foreign_table}.${f.foreign_column} ON DELETE ${f.delete_rule}`);

  console.log('\n=== UNIQUE CONSTRAINTS ===');
  const ucs = await sql`
    SELECT tc.table_name, tc.constraint_name, 
           STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
    GROUP BY tc.table_name, tc.constraint_name
    ORDER BY tc.table_name
  `;
  for (const u of ucs) console.log(`  ${u.table_name}.${u.constraint_name}: (${u.columns})`);

  console.log('\n=== CHECK CONSTRAINTS ===');
  const ccs = await sql`
    SELECT tc.table_name, tc.constraint_name, cc.check_clause
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_schema = 'public'
    ORDER BY tc.table_name
  `;
  if (ccs.length === 0) console.log('  (none)');
  for (const c of ccs) console.log(`  ${c.table_name}.${c.constraint_name}: ${c.check_clause}`);

  console.log('\n=== COLUMNS ===');
  const cols = await sql`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;
  let curTbl = '';
  for (const c of cols) {
    if (c.table_name !== curTbl) { console.log(`\n  -- ${c.table_name} --`); curTbl = c.table_name; }
    let def = c.column_default ? ` DEFAULT ${c.column_default}` : '';
    let n = c.is_nullable === 'YES' ? ' NULL' : ' NOT NULL';
    console.log(`    ${c.column_name} ${c.data_type}${def}${n}`);
  }
}

audit().catch(e => console.error('DB ERROR:', e.message));
