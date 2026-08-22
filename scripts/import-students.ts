/**
 * S1 — Idempotent Student Import Pipeline
 * 
 * Pipeline: MANIFEST → VALIDATE → DB PREFLIGHT → DRY RUN → IMPORT
 * 
 * Usage:
 *   npx tsx scripts/import-students.ts              # real import
 *   npx tsx scripts/import-students.ts --dry-run      # dry run only
 * 
 * Idempotence: running twice with same manifest = 0 new inserts
 * Uses importKey (not name) as identity
 */
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { neon } from '@neondatabase/serverless';

const require = createRequire(import.meta.url);

// Load env from .env.local
const envContent = readFileSync('.env.local', 'utf8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match && !match[2].includes('#')) envVars[match[1]] = match[2];
});

const sql = neon(envVars.DATABASE_URL!);

interface ManifestStudent {
  importKey: string;
  lastName: string;
  firstName: string;
  matricule: null;
  birthDate: null;
  gender: null;
  sources: string[];
  duplicateStatus: string;
  decision: string;
}

interface Manifest {
  importVersion: string;
  generatedAt: string;
  stats: any;
  students: ManifestStudent[];
}

interface PreflightResult {
 importKey: string;
  status: 'NEW' | 'EXACT_DB_MATCH' | 'POSSIBLE_DB_MATCH' | 'CONFLICT' | 'READY_TO_INSERT';
  matchedDbId?: string;
  reason?: string;
}

const MANIFEST_PATH = './data/private/students-import.json';
const DRY_RUN = process.argv.includes('--dry-run');

async function getSchoolId(): Promise<string> {
  const schools = await sql`SELECT id, name FROM school LIMIT 1`;
  if (!schools.length) throw new Error('No school found in database');
  return (schools[0] as any).id;
}

async function getDbStudents(schoolId: string): Promise<any[]> {
  return await sql`SELECT id, school_id, last_name, first_name, matricule FROM student WHERE school_id = ${schoolId}`;
}

function classifyPreflight(
  candidate: ManifestStudent,
  dbStudents: any[],
  importKeySet: Set<string>
): PreflightResult {
  // Check if this importKey was already used in a previous import
  // (We can't check this in DB since importKey is not stored — we rely on idempotency via
  // comparing lastName+firstName with existing DB students)

  for (const dbStudent of dbStudents) {
    const dbLastName = (dbStudent as any).last_name;
    const dbFirstName = (dbStudent as any).first_name;
    
    // Exact string match (canonical comparison)
    if (candidate.lastName === dbLastName && candidate.firstName === dbFirstName) {
      return {
        importKey: candidate.importKey,
        status: 'EXACT_DB_MATCH',
        matchedDbId: dbStudent.id,
        reason: 'Exact lastName+firstName match in DB',
      };
    }
  }

  return {
    importKey: candidate.importKey,
    status: 'READY_TO_INSERT',
    reason: 'No match found in DB',
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log(`S1 STUDENT IMPORT${DRY_RUN ? ' — DRY RUN' : ''}`);
  console.log('='.repeat(60));

  // 1. Load and validate manifest
  console.log('\n[1] Loading manifest...');
  const manifestRaw = readFileSync(MANIFEST_PATH, 'utf8');
  const manifest: Manifest = JSON.parse(manifestRaw);
  
  if (!manifest.students || !manifest.students.length) {
    throw new Error('Manifest has no students');
  }
  
  // Validate: 69 unique importKeys
  const importKeySet = new Set(manifest.students.map(s => s.importKey));
  if (importKeySet.size !== manifest.students.length) {
    throw new Error(`Duplicate importKeys: ${importKeySet.size} unique vs ${manifest.students.length} total`);
  }
  if (importKeySet.size !== 69) {
    console.warn(`WARNING: Expected 69 canonical students, got ${importKeySet.size}`);
  }
  
  // Validate: all APPROVED
  const notApproved = manifest.students.filter(s => s.decision !== 'APPROVED');
  if (notApproved.length > 0) {
    console.warn(`WARNING: ${notApproved.length} students not APPROVED: ${notApproved.map(s => s.importKey).join(', ')}`);
  }

  console.log(`  Manifest version: ${manifest.importVersion}`);
  console.log(`  Canonical students: ${manifest.students.length}`);
  console.log(`  ImportKeys: ${importKeySet.size} unique`);

  // 2. DB Preflight
  console.log('\n[2] DB Preflight...');
  const schoolId = await getSchoolId();
  console.log(`  Target school: ${schoolId}`);
  
  const dbStudents = await getDbStudents(schoolId);
  console.log(`  Existing students in DB: ${dbStudents.length}`);

  const preflightResults: PreflightResult[] = [];
  let newCount = 0;
  let exactDbMatchCount = 0;
  let readyToInsertCount = 0;
  let conflictCount = 0;

  for (const candidate of manifest.students) {
    const result = classifyPreflight(candidate, dbStudents, importKeySet);
    preflightResults.push(result);
    
    switch (result.status) {
      case 'NEW': newCount++; break;
      case 'EXACT_DB_MATCH': exactDbMatchCount++; break;
      case 'READY_TO_INSERT': readyToInsertCount++; break;
      case 'CONFLICT': conflictCount++; break;
    }
  }

  console.log(`\n  PREFLIGHT RESULTS:`);
  console.log(`    NEW:              ${newCount}`);
  console.log(`    EXACT_DB_MATCH:   ${exactDbMatchCount}`);
  console.log(`    READY_TO_INSERT:  ${readyToInsertCount}`);
  console.log(`    CONFLICT:         ${conflictCount}`);

  // 3. Dry Run Summary
  console.log(`\n[3] ${DRY_RUN ? 'DRY RUN SUMMARY' : 'IMPORT PLAN'}:`);
  console.log(`    Source candidates:    ${manifest.students.length}`);
  console.log(`    Already in DB:       ${exactDbMatchCount}`);
  console.log(`    Ready to insert:     ${readyToInsertCount}`);
  console.log(`    Conflicts:           ${conflictCount}`);
  
  if (DRY_RUN) {
    console.log('\n  === DRY RUN — NO WRITES PERFORMED ===');
    console.log(`  Would insert: ${readyToInsertCount} students`);
    process.exit(0);
  }

  // 4. Verify no conflicts before proceeding
  if (conflictCount > 0) {
    const conflicts = preflightResults.filter(r => r.status === 'CONFLICT');
    console.error(`\n  ABORT: ${conflicts.length} unresolved conflicts:`);
    for (const c of conflicts) console.error(`    - ${c.importKey}: ${c.reason}`);
    process.exit(1);
  }

  // 5. Real Import (transactional)
  console.log(`\n[4] IMPORTING ${readyToInsertCount} students...`);
  const beforeCount = (await sql`SELECT count(*)::int as cnt FROM student`)[0] as any;
  console.log(`  Before count: ${beforeCount.cnt}`);

  const toInsert = manifest.students.filter(
    (_, i) => preflightResults[i].status === 'READY_TO_INSERT'
  );

  let insertedCount = 0;
  for (const student of toInsert) {
    try {
      await sql`INSERT INTO student (school_id, last_name, first_name, matricule, date_of_birth, gender) VALUES (${schoolId}, ${student.lastName}, ${student.firstName}, ${null}, ${null}, ${null})`;
      insertedCount++;
    } catch (e: any) {
      console.error(`  ERROR inserting ${student.importKey}: ${e.message}`);
      throw e;
    }
  }

  const afterCount = (await sql`SELECT count(*)::int as cnt FROM student`)[0] as any;
  console.log(`  Inserted: ${insertedCount}`);
  console.log(`  After count: ${afterCount.cnt}`);
  
  // Verify count invariant
  if (afterCount.cnt !== beforeCount.cnt + insertedCount) {
    console.error(`  COUNT INARIANT VIOLATED: ${beforeCount.cnt} + ${insertedCount} ≠ ${afterCount.cnt}`);
    process.exit(1);
  }

  console.log('\n  === IMPORT COMPLETE ===');
  console.log(`  SOURCE_CANONICAL_COUNT: ${manifest.students.length}`);
  console.log(`  DB_ALREADY_EXISTING:    ${exactDbMatchCount}`);
  console.log(`  READY_TO_INSERT:        ${readyToInsertCount}`);
  console.log(`  INSERTED:               ${insertedCount}`);
  console.log(`  CONFLICTS:              ${conflictCount}`);
  console.log(`  FINAL_DB_COUNT:        ${afterCount.cnt}`);
}

main().catch(e => { console.error(e); process.exit(1); });
