import { readFileSync } from 'fs';
import { neon } from '@neondatabase/serverless';

const envContent = readFileSync('.env.local', 'utf8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match) envVars[match[1]] = match[2];
});

const sql = neon(envVars.DATABASE_URL!);

async function audit() {
  // Individual counts with tagged templates
  console.log('=== TABLE COUNTS ===');
  const counts = await sql`
    SELECT 
      (SELECT count(*)::int FROM student) as student_cnt,
      (SELECT count(*)::int FROM enrollment) as enrollment_cnt,
      (SELECT count(*)::int FROM classroom) as classroom_cnt,
      (SELECT count(*)::int FROM classroom_assignment) as ca_cnt,
      (SELECT count(*)::int FROM school) as school_cnt,
      (SELECT count(*)::int FROM academic_year) as ay_cnt,
      (SELECT count(*)::int FROM account) as account_cnt,
      (SELECT count(*)::int FROM \"user\") as user_cnt,
      (SELECT count(*)::int FROM session) as session_cnt,
      (SELECT count(*)::int FROM audit_log) as audit_cnt,
      (SELECT count(*)::int FROM level) as level_cnt,
      (SELECT count(*)::int FROM assessment) as assessment_cnt,
      (SELECT count(*)::int FROM grade) as grade_cnt,
      (SELECT count(*)::int FROM subject) as subject_cnt,
      (SELECT count(*)::int FROM teacher_assignment) as ta_cnt,
      (SELECT count(*)::int FROM academic_period) as ap_cnt
  `;
  for (const [k, v] of Object.entries(counts[0])) {
    console.log(`  ${k.replace('_cnt', '')}: ${v}`);
  }

  // Check if enrollment has classroom_id column still
  console.log('\n=== ENROLLMENT classroom_id check ===');
  const enrollCols = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'enrollment' AND column_name = 'classroom_id'
  `;
  console.log(`  enrollment.classroom_id exists: ${enrollCols.length > 0}`);

  // Check classroom_assignment active unique constraint
  console.log('\n=== Classroom Assignment INDEXES ===');
  const indexes = await sql`
    SELECT indexname, indexdef FROM pg_indexes 
    WHERE tablename = 'classroom_assignment'
  `;
  for (const i of indexes as any[]) console.log(`  ${i.indexname}: ${i.indexdef}`);

  // Check enrollment indexes
  console.log('\n=== Enrollment INDEXES ===');
  const enrollIdx = await sql`
    SELECT indexname, indexdef FROM pg_indexes 
    WHERE tablename = 'enrollment'
  `;
  for (const i of enrollIdx as any[]) console.log(`  ${i.indexname}: ${i.indexdef}`);
}

audit().catch(console.error);
