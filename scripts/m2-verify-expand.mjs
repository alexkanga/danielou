/**
 * M2-02 VERIFY: Post-EXPAND schema verification against real PostgreSQL
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 10, connect_timeout: 15 });

console.log('=== M2-02: VERIFY EXPAND ===\n');
let pass = 0;
let fail = 0;

function check(name, ok, detail) {
  if (ok) { console.log(`  PASS  ${name}`); pass++; }
  else { console.log(`  FAIL  ${name} — ${detail}`); fail++; }
}

// 1. classroom_assignment table exists
const [t] = await sql`SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'classroom_assignment'
) as exists`;
check('classroom_assignment table exists', t.exists, 'table not found');

// 2. Columns
const cols = await sql`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'classroom_assignment'
  ORDER BY ordinal_position
`;
const colMap = Object.fromEntries(cols.map(c => [c.column_name, c]));
check('classroom_assignment.id (uuid NOT NULL)', colMap.id?.data_type === 'uuid' && colMap.id?.is_nullable === 'NO', `got ${colMap.id?.data_type} ${colMap.id?.is_nullable}`);
check('classroom_assignment.enrollment_id (uuid NOT NULL)', colMap.enrollment_id?.data_type === 'uuid' && colMap.enrollment_id?.is_nullable === 'NO', `got ${colMap.enrollment_id?.data_type} ${colMap.enrollment_id?.is_nullable}`);
check('classroom_assignment.classroom_id (uuid NOT NULL)', colMap.classroom_id?.data_type === 'uuid' && colMap.classroom_id?.is_nullable === 'NO', `got ${colMap.classroom_id?.data_type} ${colMap.classroom_id?.is_nullable}`);
check('classroom_assignment.start_date (date NOT NULL)', colMap.start_date?.data_type === 'date' && colMap.start_date?.is_nullable === 'NO', `got ${colMap.start_date?.data_type} ${colMap.start_date?.is_nullable}`);
check('classroom_assignment.end_date (date NULLABLE)', colMap.end_date?.data_type === 'date' && colMap.end_date?.is_nullable === 'YES', `got ${colMap.end_date?.data_type} ${colMap.end_date?.is_nullable}`);
check('classroom_assignment.status (enum NOT NULL)', colMap.status?.is_nullable === 'NO', `got ${colMap.status?.is_nullable}`);

// 3. Enum
const enumVals = await sql`SELECT enumlabel FROM pg_enum
  JOIN pg_type t ON pg_enum.enumtypid = t.oid
  WHERE t.typname = 'classroom_assignment_status' ORDER BY enumsortorder`;
const enumList = enumVals.map(e => e.enumlabel);
check('classroom_assignment_status enum',
  JSON.stringify(enumList) === JSON.stringify(['active','transferred','completed','withdrawn','cancelled']),
  `got ${JSON.stringify(enumList)}`);

// 4. FKs on classroom_assignment
const caFks = await sql`
  SELECT kcu.column_name, ccu.table_name AS foreign_table
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'classroom_assignment'
`;
const fkMap = Object.fromEntries(caFks.map(f => [f.column_name, f.foreign_table]));
check('FK enrollment_id -> enrollment', fkMap.enrollment_id === 'enrollment', `got ${fkMap.enrollment_id}`);
check('FK classroom_id -> classroom', fkMap.classroom_id === 'classroom', `got ${fkMap.classroom_id}`);

// 5. FK delete rules
const fkRules = await sql`
  SELECT kcu.column_name, rc.delete_rule
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'classroom_assignment'
`;
const ruleMap = Object.fromEntries(fkRules.map(f => [f.column_name, f.delete_rule]));
check('FK enrollment ON DELETE RESTRICT', ruleMap.enrollment_id === 'RESTRICT' || ruleMap.enrollment_id === 'NO ACTION', `got ${ruleMap.enrollment_id}`);
check('FK classroom ON DELETE RESTRICT', ruleMap.classroom_id === 'RESTRICT' || ruleMap.classroom_id === 'NO ACTION', `got ${ruleMap.classroom_id}`);

// 6. Indexes
const caIdxs = await sql`
  SELECT indexname FROM pg_indexes 
  WHERE schemaname = 'public' AND tablename = 'classroom_assignment'
  ORDER BY indexname
`;
const idxNames = caIdxs.map(i => i.indexname);
check('INDEX ca_enrollment_idx', idxNames.includes('ca_enrollment_idx'), `indexes: ${idxNames.join(', ')}`);
check('INDEX ca_classroom_idx', idxNames.includes('ca_classroom_idx'), `indexes: ${idxNames.join(', ')}`);
check('INDEX ca_status_idx', idxNames.includes('ca_status_idx'), `indexes: ${idxNames.join(', ')}`);

// 7. Partial unique index
const [pui] = await sql`
  SELECT indexname, indexdef FROM pg_indexes 
  WHERE schemaname = 'public' AND indexname = 'uca_enrollment_active'
`;
check('PARTIAL UNIQUE INDEX uca_enrollment_active (WHERE status = active)',
  !!pui && pui.indexdef?.includes('WHERE') && pui.indexdef?.includes("status = 'active'"),
  pui ? pui.indexdef : 'not found');

// 8. CHECK constraints
const caChecks = await sql`
  SELECT cc.check_clause FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
  WHERE tc.table_name = 'classroom_assignment'
`;
const hasDateCheck = caChecks.some(c => c.check_clause?.includes('start_date') && c.check_clause?.includes('end_date'));
check('CHECK start_date <= end_date', hasDateCheck, `checks: ${JSON.stringify(caChecks)}`);

// 9. Enrollment columns post-EXPAND
const enCols = await sql`
  SELECT column_name, is_nullable, column_default FROM information_schema.columns
  WHERE table_name = 'enrollment' ORDER BY ordinal_position
`;
const enColMap = Object.fromEntries(enCols.map(c => [c.column_name, c]));
check('enrollment.school_id exists', 'school_id' in enColMap, `cols: ${Object.keys(enColMap).join(', ')}`);
check('enrollment.school_id NOT NULL', enColMap.school_id?.is_nullable === 'NO', `got ${enColMap.school_id?.is_nullable}`);
check('enrollment.enrolled_at exists', 'enrolled_at' in enColMap, 'not found');
check('enrollment.enrolled_at NULLABLE', enColMap.enrolled_at?.is_nullable === 'YES', `got ${enColMap.enrolled_at?.is_nullable}`);
check('enrollment.exited_at exists', 'exited_at' in enColMap, 'not found');
check('enrollment.exited_at NULLABLE', enColMap.exited_at?.is_nullable === 'YES', `got ${enColMap.exited_at?.is_nullable}`);

// 10. enrollment.school_id FK
const enSchoolFk = await sql`
  SELECT rc.delete_rule FROM information_schema.table_constraints tc
  JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
  WHERE tc.table_name = 'enrollment' AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name LIKE '%school%'
`;
check('enrollment.school_id FK to school (RESTRICT)',
  enSchoolFk.length > 0 && (enSchoolFk[0].delete_rule === 'RESTRICT' || enSchoolFk[0].delete_rule === 'NO ACTION'),
  enSchoolFk.length ? `delete_rule=${enSchoolFk[0].delete_rule}` : 'FK not found');

// 11. enrollment.student_id FK now RESTRICT
const enStudentFk = await sql`
  SELECT rc.delete_rule FROM information_schema.table_constraints tc
  JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
  WHERE tc.table_name = 'enrollment' AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name LIKE '%student%'
`;
check('enrollment.student_id FK RESTRICT (was CASCADE)',
  enStudentFk.length > 0 && (enStudentFk[0].delete_rule === 'RESTRICT' || enStudentFk[0].delete_rule === 'NO ACTION'),
  enStudentFk.length ? `delete_rule=${enStudentFk[0].delete_rule}` : 'FK not found');

// 12. enrollment.classroom_id still present (nullable, no FK)
check('enrollment.classroom_id still present (pre-CONTRACT)', 'classroom_id' in enColMap, 'column was dropped!');
check('enrollment.classroom_id now NULLABLE', enColMap.classroom_id?.is_nullable === 'YES', `got ${enColMap.classroom_id?.is_nullable}`);

// 13. enrollment_status enum updated
const enEnumVals = await sql`SELECT enumlabel FROM pg_enum
  JOIN pg_type t ON pg_enum.enumtypid = t.oid
  WHERE t.typname = 'enrollment_status' ORDER BY enumsortorder`;
const enEnumList = enEnumVals.map(e => e.enumlabel);
check('enrollment_status enum = [active, completed, transferred_out, withdrawn, cancelled]',
  JSON.stringify(enEnumList) === JSON.stringify(['active','completed','transferred_out','withdrawn','cancelled']),
  `got ${JSON.stringify(enEnumList)}`);

// 14. Enrollment CHECK
const enChecks = await sql`
  SELECT cc.check_clause FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
  WHERE tc.table_name = 'enrollment'
`;
const hasDateEnCheck = enChecks.some(c => c.check_clause?.includes('enrolled_at') && c.check_clause?.includes('exited_at'));
check('CHECK enrolled_at <= exited_at', hasDateEnCheck, `checks: ${JSON.stringify(enChecks)}`);

// 15. Drizzle journal
const [journal] = await sql`SELECT COUNT(*)::int as n FROM __drizzle_migrations`;
check('__drizzle_migrations has entries', journal.n >= 2, `count: ${journal.n}`);

// 16. Business data still 0
const [enCount] = await sql`SELECT COUNT(*)::int as n FROM enrollment`;
const [caCount] = await sql`SELECT COUNT(*)::int as n FROM classroom_assignment`;
check('enrollment still 0 rows', enCount.n === 0, `got ${enCount.n}`);
check('classroom_assignment still 0 rows', caCount.n === 0, `got ${caCount.n}`);

// 17. Indexes on enrollment
const enIdxs = await sql`
  SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'enrollment' ORDER BY indexname
`;
const enIdxNames = enIdxs.map(i => i.indexname);
check('INDEX en_school_idx', enIdxNames.includes('en_school_idx'), `got ${enIdxNames.join(', ')}`);
check('INDEX en_status_idx', enIdxNames.includes('en_status_idx'), `got ${enIdxNames.join(', ')}`);

console.log(`\n=== VERIFY EXPAND RESULT: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
await sql.end();
