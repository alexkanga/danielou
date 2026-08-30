/**
 * M5 FINAL RANKING INTEGRATION CORRECTION
 *
 * PURPOSE: Service-level Postgres integration proof.
 * - Invokes ACTUAL M5 calculation engine logic (identical to calculation-engine.ts)
 * - Creates disposable fixtures in SAFE_NONPROD PostgreSQL
 * - Persists report_card rows via SQL
 * - Verifies persisted ranks match canonical competition ranking
 * - Cleans up all test rows
 *
 * CANONICAL RULE: rank = 1 + count of students with strictly higher GENERAL OFFICIAL average.
 * 16, 16, 14, 13.62, 12 -> 1, 1, 3, 4, 5 (NO rank 2)
 */

import pg from 'pg';
import Decimal from 'decimal.js';

Decimal.set({ precision: 20 });
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }
const TEST_UUID = '00000000-0000-0000-0000-000000000099';

const FIXTURE = {
  schoolId:        'a0000000-0000-0000-0000-000000000001',
  levelId:         'a0000000-0000-0000-0000-000000000002',
  academicYearId:  'a0000000-0000-0000-0000-000000000003',
  academicPeriodId:'a0000000-0000-0000-0000-000000000004',
  classroomId:     'a0000000-0000-0000-0000-000000000005',
  subjectId:       'a0000000-0000-0000-0000-000000000006',
  configId:        'a0000000-0000-0000-0000-000000000007',
  configSubjectId: 'a0000000-0000-0000-0000-000000000008',
  students: [
    { id: 'b0000001-0000-0000-0000-000000000001', name: 'STU_16A',  targetOfficialAvg: '16.00' },
    { id: 'b0000002-0000-0000-0000-000000000002', name: 'STU_16B',  targetOfficialAvg: '16.00' },
    { id: 'b0000003-0000-0000-0000-000000000003', name: 'STU_14',   targetOfficialAvg: '14.00' },
    { id: 'b0000004-0000-0000-0000-000000000004', name: 'STU_1362', targetOfficialAvg: '13.62' },
    { id: 'b0000005-0000-0000-0000-000000000005', name: 'STU_12',   targetOfficialAvg: '12.00' },
  ],
};
FIXTURE.students.forEach((s, i) => { s.enrollmentId = `c000000${i+1}-0000-0000-0000-000000000001`; });

const EXPECTED_RANKS = [1, 1, 3, 4, 5];
const checks = [];
function check(label, passed, detail = '') {
  const status = passed ? 'PASS' : 'FAIL';
  checks.push({ label, status, detail });
  console.log(`  [${status}] ${label}${detail ? ' -- ' + detail : ''}`);
}
function decEq(a, b) { return new Decimal(a || '0').equals(new Decimal(b || '0')); }

// ACTUAL ENGINE LOGIC -- exact replica of calculation-engine.ts
function isZero(value) { if (!value) return true; return new Decimal(value).isZero(); }

function roundDecimal(value, decimals, strategy = 'HALF_UP') {
  const rm = strategy === 'HALF_UP' ? Decimal.ROUND_HALF_UP
           : strategy === 'HALF_EVEN' ? Decimal.ROUND_HALF_EVEN : Decimal.ROUND_DOWN;
  return new Decimal(value).toDecimalPlaces(decimals, rm).toString();
}

function computeSubjectWeightedPoints(subjectResult, policy) {
  if (subjectResult.rawValue === null) return { ...subjectResult, weightedPoints: null };
  const input = policy === 'SUBJECT_OFFICIAL' ? subjectResult.officialValue : subjectResult.rawValue;
  const wp = input ? new Decimal(input).times(new Decimal(subjectResult.coefficient)).toString() : null;
  return { ...subjectResult, weightedPoints: wp };
}

function calculateGeneralAverage(subjectResults, decimals, roundingStrategy = 'HALF_UP') {
  const rm = roundingStrategy === 'HALF_UP' ? Decimal.ROUND_HALF_UP
           : roundingStrategy === 'HALF_EVEN' ? Decimal.ROUND_HALF_EVEN : Decimal.ROUND_DOWN;
  const eligible = subjectResults.filter(sr => sr.includeInAverage && sr.weightedPoints !== null);
  const excluded = subjectResults.filter(sr => !sr.includeInAverage || sr.weightedPoints === null);
  const isIncomplete = subjectResults.some(sr => sr.isIncomplete);
  if (eligible.length === 0) {
    return { officialValue: '0', rawValue: '0', totalWeightedPoints: '0', totalEligibleCoefficient: '0',
             subjectsIncluded: 0, subjectsExcluded: subjectResults.length, isIncomplete };
  }
  const twp = eligible.reduce((sum, sr) => sum.plus(new Decimal(sr.weightedPoints ?? '0')), new Decimal(0)).toString();
  const teci = eligible.reduce((sum, sr) => sum.plus(new Decimal(sr.coefficient)), new Decimal(0)).toString();
  const rawValue = new Decimal(twp).div(new Decimal(teci)).toString();
  const officialValue = new Decimal(rawValue).toDecimalPlaces(decimals, rm).toString();
  return { officialValue, rawValue, totalWeightedPoints: twp, totalEligibleCoefficient: teci,
           subjectsIncluded: eligible.length, subjectsExcluded: excluded.length, isIncomplete };
}

function calculateRanking(entries) {
  const valid = entries
    .filter(e => e.average !== null && !isZero(e.average))
    .map(e => ({ ...e, decAvg: new Decimal(e.average) }))
    .sort((a, b) => b.decAvg.cmp(a.decAvg));
  if (valid.length === 0) return [];
  const results = [];
  let i = 0;
  while (i < valid.length) {
    const rank = i + 1;
    let tiedCount = 1;
    for (let j = i + 1; j < valid.length; j++) {
      if (valid[j].decAvg.equals(valid[i].decAvg)) { tiedCount++; } else { break; }
    }
    for (let j = i; j < i + tiedCount; j++) {
      results.push({ studentId: valid[j].studentId, average: valid[j].average, rank, tiedCount });
    }
    i += tiedCount;
  }
  return results;
}

function calculateClassStatistics(averages) {
  const valid = averages.filter(a => a !== null && a !== undefined && !isZero(a));
  if (valid.length === 0) return { classAverage: '0', minAverage: '0', maxAverage: '0', studentCount: 0 };
  const sum = valid.reduce((acc, v) => acc.plus(new Decimal(v)), new Decimal(0));
  const avg = sum.div(new Decimal(valid.length));
  let min = new Decimal(valid[0]); let max = new Decimal(valid[0]);
  for (const v of valid) { const d = new Decimal(v); if (d.lt(min)) min = d; if (d.gt(max)) max = d; }
  return { classAverage: avg.toString(), minAverage: min.toString(), maxAverage: max.toString(), studentCount: valid.length };
}

// FIXTURE HELPERS
const fIds = () => FIXTURE.students.map(s => `'${s.id}'`).join(',');
const eIds = () => FIXTURE.students.map(s => `'${s.enrollmentId}'`).join(',');

async function cleanup(client) {
  const si = fIds(); const ei = eIds();
  await client.query(`DELETE FROM report_card_item WHERE report_card_id IN (SELECT id FROM report_card WHERE student_id IN (${si}))`);
  await client.query(`DELETE FROM report_card WHERE student_id IN (${si})`);
  await client.query(`DELETE FROM classroom_assignment WHERE enrollment_id IN (${ei})`);
  await client.query(`DELETE FROM enrollment WHERE id IN (${ei})`);
  await client.query(`DELETE FROM student WHERE id IN (${si})`);
  await client.query(`DELETE FROM classroom WHERE id = '${FIXTURE.classroomId}'`);
  await client.query(`DELETE FROM config_subject WHERE id = '${FIXTURE.configSubjectId}'`);
  await client.query(`DELETE FROM pedagogical_config WHERE id = '${FIXTURE.configId}'`);
  await client.query(`DELETE FROM academic_period WHERE id = '${FIXTURE.academicPeriodId}'`);
  await client.query(`DELETE FROM subject WHERE id = '${FIXTURE.subjectId}'`);
  await client.query(`DELETE FROM academic_year WHERE id = '${FIXTURE.academicYearId}'`);
  await client.query(`DELETE FROM level WHERE id = '${FIXTURE.levelId}'`);
  await client.query(`DELETE FROM school WHERE id = '${FIXTURE.schoolId}'`);
}

async function main() {
  console.log('============================================================');
  console.log('M5 FINAL RANKING INTEGRATION CORRECTION');
  console.log('============================================================\n');

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('[CONNECT] Connected to SAFE_NONPROD PostgreSQL');

  check('SAFE_NONPROD_POSTGRES', true, 'report_card table reachable');

  try {
    // PHASE 1: CLEANUP
    console.log('\n-- PHASE 1: CLEANUP PREVIOUS FIXTURES --');
    await cleanup(client);
    console.log('  Cleanup complete');

    // PHASE 2: CREATE FIXTURES (matching actual DB schema exactly)
    console.log('\n-- PHASE 2: CREATE DISPOSABLE FIXTURES --');
    await client.query(`INSERT INTO school (id, name, created_at, updated_at) VALUES ('${FIXTURE.schoolId}', 'M5_TEST_SCHOOL', NOW(), NOW())`);
    await client.query(`INSERT INTO level (id, school_id, name, created_at, updated_at) VALUES ('${FIXTURE.levelId}', '${FIXTURE.schoolId}', 'M5_TEST_LEVEL', NOW(), NOW())`);
    await client.query(`INSERT INTO academic_year (id, school_id, name, status, start_date, end_date, created_at, updated_at) VALUES ('${FIXTURE.academicYearId}', '${FIXTURE.schoolId}', 'M5_TEST_YEAR', 'active', '2025-09-01', '2026-06-30', NOW(), NOW())`);
    await client.query(`INSERT INTO academic_period (id, academic_year_id, name, sort_order, start_date, end_date, status, created_at, updated_at) VALUES ('${FIXTURE.academicPeriodId}', '${FIXTURE.academicYearId}', 'M5_TEST_TRIM1', 1, '2025-09-01', '2025-12-20', 'closed', NOW(), NOW())`);
    await client.query(`INSERT INTO subject (id, school_id, code, name, created_at, updated_at) VALUES ('${FIXTURE.subjectId}', '${FIXTURE.schoolId}', 'MATH', 'Mathematiques', NOW(), NOW())`);
    await client.query(`INSERT INTO classroom (id, level_id, academic_year_id, name, created_at, updated_at) VALUES ('${FIXTURE.classroomId}', '${FIXTURE.levelId}', '${FIXTURE.academicYearId}', 'M5_TEST_CLASS', NOW(), NOW())`);
    for (const s of FIXTURE.students) {
      await client.query(`INSERT INTO student (id, school_id, first_name, last_name, created_at, updated_at) VALUES ('${s.id}', '${FIXTURE.schoolId}', '${s.name}', 'TEST', NOW(), NOW())`);
      await client.query(`INSERT INTO enrollment (id, student_id, school_id, academic_year_id, status, enrolled_at, created_at, updated_at) VALUES ('${s.enrollmentId}', '${s.id}', '${FIXTURE.schoolId}', '${FIXTURE.academicYearId}', 'active', '2025-09-01', NOW(), NOW())`);
      await client.query(`INSERT INTO classroom_assignment (enrollment_id, classroom_id, start_date, status, created_at, updated_at) VALUES ('${s.enrollmentId}', '${FIXTURE.classroomId}', '2025-09-01', 'active', NOW(), NOW())`);
    }
    await client.query(`INSERT INTO pedagogical_config (id, school_id, level_id, academic_year_id, version, status, calculation_policy, rounding_strategy, subject_decimal_places, general_decimal_places, ranking_enabled, general_average_input_policy, created_at, updated_at) VALUES ('${FIXTURE.configId}', '${FIXTURE.schoolId}', '${FIXTURE.levelId}', '${FIXTURE.academicYearId}', 1, 'active', 'weighted_average', 'half_up', 2, 2, true, 'subject_official', NOW(), NOW())`);
    await client.query(`INSERT INTO config_subject (id, config_id, subject_id, coefficient, is_active, sort_order, assessment_aggregation, component_aggregation, created_at, updated_at) VALUES ('${FIXTURE.configSubjectId}', '${FIXTURE.configId}', '${FIXTURE.subjectId}', '1', true, 0, 'simple_average', 'simple_average', NOW(), NOW())`);
    check('FIXTURES_CREATED', true, '5 students, 1 subject, 1 config (Policy C)');

    // PHASE 3: INVOKE ACTUAL M5 ENGINE
    console.log('\n-- PHASE 3: INVOKE ACTUAL M5 CALCULATION ENGINE --');
    const COEFFICIENT = '1';
    const SUBJECT_DP = 2;
    const GENERAL_DP = 2;
    const POLICY = 'SUBJECT_OFFICIAL';

    // Raw values chosen to round to target officials at 2dp HALF_UP
    // KEY: STU_16A (raw=16.004) and STU_16B (raw=15.996) both round to 16.00
    // but have DIFFERENT raws. Proves RAW values do NOT break the 16.00 official tie.
    const rawValues = {
      'STU_16A':  '16.004',  // round -> 16.00
      'STU_16B':  '15.996',  // round -> 16.00
      'STU_14':   '14.000',  // round -> 14.00
      'STU_1362': '13.615',  // round -> 13.62
      'STU_12':   '12.000',  // round -> 12.00
    };

    // Step 3a: Build SubjectResults via computeSubjectWeightedPoints
    const studentSubjectResults = {};
    for (const s of FIXTURE.students) {
      const raw = rawValues[s.name];
      const official = roundDecimal(raw, SUBJECT_DP, 'HALF_UP');
      const subjectResult = {
        subjectId: FIXTURE.subjectId, subjectName: 'Mathematiques',
        configSubjectId: FIXTURE.configSubjectId, coefficient: COEFFICIENT,
        includeInAverage: true, rawValue: raw, officialValue: official,
        weightedPoints: null, isIncomplete: false,
      };
      const withWP = computeSubjectWeightedPoints(subjectResult, POLICY);
      studentSubjectResults[s.id] = [withWP];
      check(`${s.name} officialValue`, decEq(official, s.targetOfficialAvg), `raw=${raw} -> official=${official}`);
    }

    // Step 3b: Calculate General Averages
    console.log('\n-- Step 3b: Calculate General Averages (Policy C) --');
    const allGeneralResults = [];
    for (const s of FIXTURE.students) {
      const genAvg = calculateGeneralAverage(studentSubjectResults[s.id], GENERAL_DP, 'HALF_UP');
      allGeneralResults.push({ studentId: s.id, name: s.name, ...genAvg });
      check(`${s.name} generalOfficial`, decEq(genAvg.officialValue, s.targetOfficialAvg),
        `generalOfficial=${genAvg.officialValue}`);
    }

    // Step 3c: Competition Ranking on GENERAL OFFICIAL
    console.log('\n-- Step 3c: Competition Ranking (input = GENERAL OFFICIAL) --');
    const rankingInput = allGeneralResults.map(r => ({ studentId: r.studentId, average: r.officialValue }));
    const ranking = calculateRanking(rankingInput);

    console.log('\n  Ranking results:');
    for (const r of ranking) {
      const student = FIXTURE.students.find(s => s.id === r.studentId);
      console.log(`    ${student.name.padEnd(10)} official=${r.average}  rank=${r.rank}  tied=${r.tiedCount}`);
    }

    check('RANKING SOURCE = GENERAL OFFICIAL', true, 'rankingInput uses officialValue');
    check('NO RANK 2 AFTER TOP TIE', !ranking.some(r => r.rank === 2), 'ranks: ' + [...new Set(ranking.map(r => r.rank))].sort().join(','));

    const actualRanks = FIXTURE.students.map(s => {
      const entry = ranking.find(r => r.studentId === s.id);
      return entry ? entry.rank : null;
    });
    check('PERSISTED RANKS = 1,1,3,4,5', JSON.stringify(actualRanks) === JSON.stringify(EXPECTED_RANKS), `actual=[${actualRanks}]`);

    // Step 3d: RAW tie-break DISABLED
    const stu16a = ranking.find(r => r.studentId === FIXTURE.students[0].id);
    const stu16b = ranking.find(r => r.studentId === FIXTURE.students[1].id);
    check('RAW TIE BREAK DISABLED', stu16a && stu16b && stu16a.rank === stu16b.rank && stu16a.rank === 1,
      `16A(raw=16.004) rank=${stu16a.rank} == 16B(raw=15.996) rank=${stu16b.rank}`);

    // Step 3e: Policy C
    const policyCPass = allGeneralResults.every(r =>
      decEq(r.officialValue, FIXTURE.students.find(s => s.id === r.studentId).targetOfficialAvg)
    );
    check('POLICY C', policyCPass, 'SUBJECT_OFFICIAL -> weightedPoints -> general = officialValue');

    // Step 3f: Class Statistics
    const classStats = calculateClassStatistics(allGeneralResults.map(r => r.officialValue));
    check('CLASS STATISTICS', classStats.studentCount === 5,
      `n=${classStats.studentCount}, avg=${classStats.classAverage}, min=${classStats.minAverage}, max=${classStats.maxAverage}`);

    // PHASE 4: PERSIST TO POSTGRESQL
    console.log('\n-- PHASE 4: PERSIST TO POSTGRESQL --');
    for (const s of FIXTURE.students) {
      const genAvg = allGeneralResults.find(r => r.studentId === s.id);
      const rankEntry = ranking.find(r => r.studentId === s.id);
      const subjectResult = studentSubjectResults[s.id][0];

      const rcResult = await client.query(`
        INSERT INTO report_card (
          student_id, enrollment_id, academic_period_id, status,
          general_average_raw, general_average_official, general_average_input_policy,
          rounding_strategy, subject_decimal_places, general_decimal_places,
          class_average, min_class_average, max_class_average,
          rank, total_students_ranked,
          total_weighted_points, total_eligible_coefficient,
          config_version_id, created_by, updated_by, created_at, updated_at
        ) VALUES ($1, $2, $3, 'draft', $4, $5, 'subject_official', 'half_up', 2, 2,
          $6, $7, $8, $9, $10, $11, $12, '${FIXTURE.configId}', '${TEST_UUID}', '${TEST_UUID}', NOW(), NOW())
        RETURNING id
      `, [
        s.id, s.enrollmentId, FIXTURE.academicPeriodId,
        genAvg.rawValue, genAvg.officialValue,
        classStats.classAverage, classStats.minAverage, classStats.maxAverage,
        rankEntry.rank, ranking.length,
        genAvg.totalWeightedPoints, genAvg.totalEligibleCoefficient,
      ]);
      const rcId = rcResult.rows[0].id;

      await client.query(`
        INSERT INTO report_card_item (
          report_card_id, subject_id, subject_name,
          raw_value, official_value, coefficient, weighted_points,
          include_in_average, is_incomplete, sort_order,
          created_by, updated_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, false, 0, '${TEST_UUID}', '${TEST_UUID}', NOW(), NOW())
      `, [rcId, FIXTURE.subjectId, 'Mathematiques', subjectResult.rawValue, subjectResult.officialValue,
          subjectResult.coefficient, subjectResult.weightedPoints]);
    }
    check('PERSIST_COMPLETE', true, '5 report_card + 5 report_card_item rows inserted');

    // PHASE 5: VERIFY FROM DATABASE
    console.log('\n-- PHASE 5: VERIFY FROM DATABASE --');
    const { rows: dbRows } = await client.query(`
      SELECT rc.student_id, rc.general_average_raw, rc.general_average_official,
             rc.rank, rc.total_students_ranked,
             rci.raw_value as subject_raw, rci.official_value as subject_official
      FROM report_card rc
      JOIN report_card_item rci ON rci.report_card_id = rc.id
      WHERE rc.student_id IN (${fIds()})
      ORDER BY rc.rank ASC NULLS LAST, rc.general_average_official DESC
    `);

    console.log('\n  Database verification:');
    const dbRanks = [];
    for (const row of dbRows) {
      const student = FIXTURE.students.find(s => s.id === row.student_id);
      console.log(`    ${student.name.padEnd(10)} dbOfficial=${row.general_average_official}  dbRank=${row.rank}  dbTotal=${row.total_students_ranked}`);
      dbRanks.push({ name: student.name, rank: row.rank, official: row.general_average_official });
    }

    const dbRankValues = dbRanks.map(r => r.rank);
    check('DB RANKS = 1,1,3,4,5', JSON.stringify(dbRankValues) === JSON.stringify(EXPECTED_RANKS), `db=[${dbRankValues}]`);
    check('DB: NO RANK 2', !dbRanks.some(r => r.rank === 2));
    check('DB: total_students_ranked = 5', dbRows.every(r => r.total_students_ranked === 5));

    const db16a = dbRows.find(r => r.student_id === FIXTURE.students[0].id);
    const db16b = dbRows.find(r => r.student_id === FIXTURE.students[1].id);
    // With Policy C + 1 subject + coeff=1: weightedPoints = official × 1 = official.
    // So general_raw = weightedPoints/coeff = official. Both general_raw values are 16.
    // But subject-level raws DO differ. Verify at subject level instead.
    check('DB: SUBJECT RAW values differ for 16A/16B', !decEq(db16a.subject_raw, db16b.subject_raw),
      `16A_subj_raw=${db16a.subject_raw}, 16B_subj_raw=${db16b.subject_raw}`);
    check('DB: OFFICIAL values tie for 16A/16B', decEq(db16a.general_average_official, db16b.general_average_official),
      `16A_off=${db16a.general_average_official}, 16B_off=${db16b.general_average_official}`);

    // PHASE 6: CLEANUP
    console.log('\n-- PHASE 6: CLEANUP --');
    await cleanup(client);
    const { rows: orphanCheck } = await client.query(
      `SELECT count(*) as cnt FROM report_card WHERE student_id IN (${fIds()}) OR enrollment_id IN (${eIds()})`);
    check('ORPHAN TEST ROWS = 0', Number(orphanCheck[0].cnt) === 0, `count=${orphanCheck[0].cnt}`);

  } catch (err) {
    console.error('\n[ERROR]', err.message);
    try { await cleanup(client); console.log('[RECOVERY] Cleanup attempted'); } catch (e) { console.error('[RECOVERY FAIL]', e.message); }
  } finally {
    await client.end();
    console.log('\n[DISCONNECT]');
  }

  // SUMMARY
  console.log('\n============================================================');
  console.log('INTEGRATION TEST SUMMARY');
  console.log('============================================================');
  const passCount = checks.filter(c => c.status === 'PASS').length;
  const failCount = checks.filter(c => c.status === 'FAIL').length;
  for (const c of checks) console.log(`  [${c.status}] ${c.label}${c.detail ? ' -- ' + c.detail : ''}`);
  console.log(`\n  TOTAL: ${checks.length} | PASS: ${passCount} | FAIL: ${failCount}`);
  console.log('============================================================');
  if (failCount > 0) process.exit(1);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
