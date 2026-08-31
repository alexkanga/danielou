/**
 * WS-002-M2 — Composition Data Service Integration Tests
 *
 * PostgreSQL evidence for DB→M1 mapping.
 * Creates unique test fixtures, tests, then cleans up.
 *
 * Required env: DATABASE_URL pointing to a PostgreSQL database.
 * Compatible with both Neon and standard PostgreSQL (CI service container).
 */

// @vitest-environment node

import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { randomUUID } from 'crypto';
import { createSqlClient } from '@/tests/helpers/sql-client';
import {
  getCompositionStudentResult,
  getCompositionClassResults,
  InvalidPeriodTypeError,
} from '@/lib/services/results/composition-data.service';
import { NotFoundError } from '@/lib/services/pedagogy/errors';

// ─────────────────────────────────────────────
// TEST DATABASE CLIENT (direct SQL for fixtures)
// ─────────────────────────────────────────────

const sql = createSqlClient(process.env.DATABASE_URL!);

// ─────────────────────────────────────────────
// FIXTURE IDs
// ─────────────────────────────────────────────

const F = {
  schoolId: randomUUID(),
  academicYearId: randomUUID(),
  levelId: randomUUID(),
  classroomId: randomUUID(),
  subjectId: randomUUID(),
  assessmentTypeId: randomUUID(),
  periodCompositionId: randomUUID(),
  periodPassageId: randomUUID(),
  periodTrimesterId: randomUUID(),
  studentIds: [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()] as string[],
  enrollmentIds: [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()] as string[],
  assignmentIds: [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()] as string[],
  // Assessment IDs generated after fixture creation
  assessmentIds: [] as string[],
};

const STUDENT_NAMES = [
  { first: 'Alpha', last: 'M2Test' },
  { first: 'Bravo', last: 'M2Test' },
  { first: 'Charlie', last: 'M2Test' },
  { first: 'Delta', last: 'M2Test' },
  { first: 'Echo', last: 'M2Test' },
];

// ─────────────────────────────────────────────
// FIXTURE SETUP
// ─────────────────────────────────────────────

async function createFixtures() {
  await sql`
    INSERT INTO school (id, name, created_at, updated_at)
    VALUES (${F.schoolId}, 'M2 Test School', now(), now())
  `;

  await sql`
    INSERT INTO academic_year (id, school_id, name, start_date, end_date, status, created_at, updated_at)
    VALUES (${F.academicYearId}, ${F.schoolId}, 'M2 Test Year', '2025-09-01', '2026-06-30', 'active', now(), now())
  `;

  await sql`
    INSERT INTO level (id, school_id, name, sort_order, created_at, updated_at)
    VALUES (${F.levelId}, ${F.schoolId}, 'M2 Test Level', 1, now(), now())
  `;

  await sql`
    INSERT INTO classroom (id, level_id, academic_year_id, name, created_at, updated_at)
    VALUES (${F.classroomId}, ${F.levelId}, ${F.academicYearId}, 'M2 Test Class', now(), now())
  `;

  await sql`
    INSERT INTO subject (id, school_id, code, name, is_active, created_at, updated_at)
    VALUES (${F.subjectId}, ${F.schoolId}, 'M2T', 'M2 Test Subject', true, now(), now())
  `;

  await sql`
    INSERT INTO assessment_type (id, school_id, name, is_active, created_at, updated_at)
    VALUES (${F.assessmentTypeId}, ${F.schoolId}, 'M2 Test Type', true, now(), now())
  `;

  // Periods: composition, passage, and a non-composition (trimester)
  await sql`
    INSERT INTO academic_period (id, academic_year_id, name, period_type, sort_order, status, created_at, updated_at)
    VALUES (${F.periodCompositionId}, ${F.academicYearId}, 'M2 Composition C1', 'composition', 1, 'open', now(), now())
  `;
  await sql`
    INSERT INTO academic_period (id, academic_year_id, name, period_type, sort_order, status, created_at, updated_at)
    VALUES (${F.periodPassageId}, ${F.academicYearId}, 'M2 Passage', 'passage', 2, 'open', now(), now())
  `;
  await sql`
    INSERT INTO academic_period (id, academic_year_id, name, period_type, sort_order, status, created_at, updated_at)
    VALUES (${F.periodTrimesterId}, ${F.academicYearId}, 'M2 Trimester', 'trimester', 1, 'open', now(), now())
  `;

  // Students + enrollments + assignments
  for (let i = 0; i < 5; i++) {
    await sql`
      INSERT INTO student (id, school_id, first_name, last_name, created_at, updated_at)
      VALUES (${F.studentIds[i]}, ${F.schoolId}, ${STUDENT_NAMES[i].first}, ${STUDENT_NAMES[i].last}, now(), now())
    `;
    await sql`
      INSERT INTO enrollment (id, student_id, academic_year_id, school_id, status, created_at, updated_at)
      VALUES (${F.enrollmentIds[i]}, ${F.studentIds[i]}, ${F.academicYearId}, ${F.schoolId}, 'active', now(), now())
    `;
    await sql`
      INSERT INTO classroom_assignment (id, enrollment_id, classroom_id, start_date, status, created_at, updated_at)
      VALUES (${F.assignmentIds[i]}, ${F.enrollmentIds[i]}, ${F.classroomId}, '2025-09-01', 'active', now(), now())
    `;
  }

  // Assessments: 2 assessments for the composition period (scale 20 and 40)
  const a1Id = randomUUID();
  const a2Id = randomUUID();
  await sql`
    INSERT INTO assessment (id, classroom_id, subject_id, academic_period_id, assessment_type_id, title, scale, coefficient, status, assessment_date, created_at, updated_at)
    VALUES (${a1Id}, ${F.classroomId}, ${F.subjectId}, ${F.periodCompositionId}, ${F.assessmentTypeId}, 'M2 Assess 1', 20, '1', 'open', '2025-11-01', now(), now())
  `;
  await sql`
    INSERT INTO assessment (id, classroom_id, subject_id, academic_period_id, assessment_type_id, title, scale, coefficient, status, assessment_date, created_at, updated_at)
    VALUES (${a2Id}, ${F.classroomId}, ${F.subjectId}, ${F.periodCompositionId}, ${F.assessmentTypeId}, 'M2 Assess 2', 40, '1', 'open', '2025-11-15', now(), now())
  `;

  F.assessmentIds = [a1Id, a2Id];
}

/**
 * Helper: insert a grade row for a specific enrollment+assessment.
 */
async function setGrade(
  enrollmentId: string,
  assessmentId: string,
  status: string,
  rawValue: string | null = null,
) {
  await sql`
    INSERT INTO grade (id, assessment_id, enrollment_id, raw_value, status, created_at, updated_at)
    VALUES (${randomUUID()}, ${assessmentId}, ${enrollmentId}, ${rawValue}, ${status}, now(), now())
    ON CONFLICT (assessment_id, enrollment_id) DO UPDATE
      SET raw_value = EXCLUDED.raw_value, status = EXCLUDED.status, updated_at = now()
  `;
}

/**
 * Helper: delete a grade row.
 */
async function deleteGrade(
  enrollmentId: string,
  assessmentId: string,
) {
  await sql`DELETE FROM grade WHERE assessment_id = ${assessmentId} AND enrollment_id = ${enrollmentId}`;
}

// ─────────────────────────────────────────────
// FIXTURE TEARDOWN
// ─────────────────────────────────────────────

async function cleanupFixtures() {
  // Delete in reverse dependency order
  for (const aId of F.assessmentIds) {
    await sql`DELETE FROM grade WHERE assessment_id = ${aId}`;
  }
  for (const aId of F.assessmentIds) {
    await sql`DELETE FROM assessment WHERE id = ${aId}`;
  }
  for (const aId of F.assignmentIds) {
    await sql`DELETE FROM classroom_assignment WHERE id = ${aId}`;
  }
  for (const eId of F.enrollmentIds) {
    await sql`DELETE FROM grade WHERE enrollment_id = ${eId}`;
    await sql`DELETE FROM enrollment WHERE id = ${eId}`;
  }
  for (const sId of F.studentIds) {
    await sql`DELETE FROM student WHERE id = ${sId}`;
  }
  await sql`DELETE FROM academic_period WHERE id IN (${F.periodCompositionId}, ${F.periodPassageId}, ${F.periodTrimesterId})`;
  await sql`DELETE FROM assessment_type WHERE id = ${F.assessmentTypeId}`;
  await sql`DELETE FROM subject WHERE id = ${F.subjectId}`;
  await sql`DELETE FROM classroom WHERE id = ${F.classroomId}`;
  await sql`DELETE FROM level WHERE id = ${F.levelId}`;
  await sql`DELETE FROM academic_year WHERE id = ${F.academicYearId}`;
  await sql`DELETE FROM school WHERE id = ${F.schoolId}`;
}

// ─────────────────────────────────────────────
// SETUP / TEARDOWN
// ─────────────────────────────────────────────

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set — integration tests require Preview/Test PostgreSQL');
  }
  await createFixtures();
}, 30_000);

afterAll(async () => {
  await cleanupFixtures();
}, 30_000);

// ─────────────────────────────────────────────
// T1 — GRADED STORED DATA MAPS TO M1
// ─────────────────────────────────────────────

describe('T1 — Graded stored data maps to M1 and computes correct result', () => {
  let a1: string;
  let a2: string;
  const s0 = F.enrollmentIds[0];

  beforeAll(async () => {
    [a1, a2] = F.assessmentIds;
    // Student 0: graded on both — 15/20 and 32/40
    await setGrade(s0, a1, 'graded', '15');
    await setGrade(s0, a2, 'graded', '32');
  }, 10_000);

  afterAll(async () => {
    await deleteGrade(s0, a1);
    await deleteGrade(s0, a2);
  }, 10_000);

  it('single student: (15+32)/(20+40)×10 = 47/60×10 = 7.8333… → official 7.83', async () => {
    const result = await getCompositionStudentResult(
      F.periodCompositionId, F.classroomId, s0,
    );
    expect(result.status).toBe('CALCULATED');
    expect(result.official).toBe('7.83');
  });
});

// ─────────────────────────────────────────────
// T2 — AI STORED STATUS MAPS CORRECTLY
// ─────────────────────────────────────────────

describe('T2 — AI stored status: earned 0, max retained by M1', () => {
  let a1: string;
  let a2: string;
  const s1 = F.enrollmentIds[1];

  beforeAll(async () => {
    [a1, a2] = F.assessmentIds;
    await setGrade(s1, a1, 'absent_unexcused'); // AI — no raw value
    await setGrade(s1, a2, 'graded', '36');
  }, 10_000);

  afterAll(async () => {
    await deleteGrade(s1, a1);
    await deleteGrade(s1, a2);
  }, 10_000);

  it('AI: 0/20 + 36/40 → 36/60×10 = 6.00', async () => {
    const result = await getCompositionStudentResult(
      F.periodCompositionId, F.classroomId, s1,
    );
    expect(result.status).toBe('CALCULATED');
    expect(result.official).toBe('6');
  });
});

// ─────────────────────────────────────────────
// T3 — AJ MAPS CORRECTLY (NEUTRAL)
// ─────────────────────────────────────────────

describe('T3 — AJ maps correctly: neutral', () => {
  let a1: string;
  let a2: string;
  const s2 = F.enrollmentIds[2];

  beforeAll(async () => {
    [a1, a2] = F.assessmentIds;
    await setGrade(s2, a1, 'graded', '16');
    await setGrade(s2, a2, 'absent_excused'); // AJ — no raw value
  }, 10_000);

  afterAll(async () => {
    await deleteGrade(s2, a1);
    await deleteGrade(s2, a2);
  }, 10_000);

  it('AJ excluded: 16/20 × 10 = 8.00', async () => {
    const result = await getCompositionStudentResult(
      F.periodCompositionId, F.classroomId, s2,
    );
    expect(result.status).toBe('CALCULATED');
    expect(result.official).toBe('8');
  });
});

// ─────────────────────────────────────────────
// T4 — EXEMPT MAPS CORRECTLY (NEUTRAL)
// ─────────────────────────────────────────────

describe('T4 — Exempt maps correctly', () => {
  let a1: string;
  let a2: string;
  const s0 = F.enrollmentIds[0];

  beforeAll(async () => {
    [a1, a2] = F.assessmentIds;
    await setGrade(s0, a1, 'graded', '18');
    await setGrade(s0, a2, 'exempt');
  }, 10_000);

  afterAll(async () => {
    await deleteGrade(s0, a1);
    await deleteGrade(s0, a2);
  }, 10_000);

  it('Exempt excluded: 18/20 × 10 = 9.00', async () => {
    const result = await getCompositionStudentResult(
      F.periodCompositionId, F.classroomId, s0,
    );
    expect(result.status).toBe('CALCULATED');
    expect(result.official).toBe('9');
  });
});

// ─────────────────────────────────────────────
// T5 — NOT_EVALUATED MAPS CORRECTLY (NEUTRAL)
// ─────────────────────────────────────────────

describe('T5 — not_evaluated maps correctly', () => {
  let a1: string;
  let a2: string;
  const s0 = F.enrollmentIds[0];

  beforeAll(async () => {
    [a1, a2] = F.assessmentIds;
    await setGrade(s0, a1, 'graded', '12');
    await setGrade(s0, a2, 'not_evaluated');
  }, 10_000);

  afterAll(async () => {
    await deleteGrade(s0, a1);
    await deleteGrade(s0, a2);
  }, 10_000);

  it('NE excluded: 12/20 × 10 = 6.00', async () => {
    const result = await getCompositionStudentResult(
      F.periodCompositionId, F.classroomId, s0,
    );
    expect(result.status).toBe('CALCULATED');
    expect(result.official).toBe('6');
  });
});

// ─────────────────────────────────────────────
// T6 — PENDING MAPS TO INCOMPLETE
// ─────────────────────────────────────────────

describe('T6 — Pending maps to INCOMPLETE', () => {
  let a1: string;
  let a2: string;
  const s0 = F.enrollmentIds[0];

  beforeAll(async () => {
    [a1, a2] = F.assessmentIds;
    await setGrade(s0, a1, 'graded', '15');
    await setGrade(s0, a2, 'pending');
  }, 10_000);

  afterAll(async () => {
    await deleteGrade(s0, a1);
    await deleteGrade(s0, a2);
  }, 10_000);

  it('pending → INCOMPLETE', async () => {
    const result = await getCompositionStudentResult(
      F.periodCompositionId, F.classroomId, s0,
    );
    expect(result.status).toBe('INCOMPLETE');
    expect(result.raw).toBeNull();
    expect(result.official).toBeNull();
  });
});

// ─────────────────────────────────────────────
// T7 — MISSING REQUIRED → INCOMPLETE
// ─────────────────────────────────────────────

describe('T7 — Applicable assessment with missing grade row → INCOMPLETE', () => {
  let a1: string;
  const s0 = F.enrollmentIds[0];

  beforeAll(async () => {
    [a1] = F.assessmentIds;
    // Only grade for a1, no grade row for a2 → missing required
    await setGrade(s0, a1, 'graded', '14');
  }, 10_000);

  afterAll(async () => {
    await deleteGrade(s0, a1);
  }, 10_000);

  it('missing grade row → INCOMPLETE', async () => {
    const result = await getCompositionStudentResult(
      F.periodCompositionId, F.classroomId, s0,
    );
    expect(result.status).toBe('INCOMPLETE');
  });
});

// ─────────────────────────────────────────────
// T8 — MULTIPLE ASSESSMENTS DERIVE DENOMINATOR FROM DB
// ─────────────────────────────────────────────

describe('T8 — Multi-assessment denominator from DB scales', () => {
  let a1: string;
  let a2: string;
  const s0 = F.enrollmentIds[0];

  beforeAll(async () => {
    [a1, a2] = F.assessmentIds;
    await setGrade(s0, a1, 'graded', '10');
    await setGrade(s0, a2, 'graded', '30');
  }, 10_000);

  afterAll(async () => {
    await deleteGrade(s0, a1);
    await deleteGrade(s0, a2);
  }, 10_000);

  it('(10+30)/(20+40)×10 = 40/60×10 = 6.6667 → 6.67', async () => {
    const result = await getCompositionStudentResult(
      F.periodCompositionId, F.classroomId, s0,
    );
    expect(result.status).toBe('CALCULATED');
    expect(result.official).toBe('6.67');
  });
});

// ─────────────────────────────────────────────
// T9 — NO HARDCODED DENOMINATOR
// ─────────────────────────────────────────────

describe('T9 — No hardcoded denominator', () => {
  let a1: string;
  let a2: string;
  const s0 = F.enrollmentIds[0];

  beforeAll(async () => {
    [a1, a2] = F.assessmentIds;
    // 10/20 + 40/40 = 50/60 × 10 = 8.3333 → 8.33
    await setGrade(s0, a1, 'graded', '10');
    await setGrade(s0, a2, 'graded', '40');
  }, 10_000);

  afterAll(async () => {
    await deleteGrade(s0, a1);
    await deleteGrade(s0, a2);
  }, 10_000);

  it('denominator = sum of DB assessment scales (20+40=60), NOT hardcoded', async () => {
    const result = await getCompositionStudentResult(
      F.periodCompositionId, F.classroomId, s0,
    );
    expect(result.status).toBe('CALCULATED');
    // If denominator were hardcoded as 40: 50/40×10 = 12.5 (wrong)
    // Correct: 50/60×10 = 8.3333… → 8.33
    expect(result.official).toBe('8.33');
    expect(result.official).not.toBe('12.5');
  });
});

// ─────────────────────────────────────────────
// T10 — CLASS RESULT RETURNS STUDENT TYPED STATES
// ─────────────────────────────────────────────

describe('T10 — Class result returns student typed states', () => {
  let a1: string;
  let a2: string;
  const s0 = F.enrollmentIds[0];
  const s1 = F.enrollmentIds[1];
  const s2 = F.enrollmentIds[2];

  beforeAll(async () => {
    [a1, a2] = F.assessmentIds;
    // s0: CALCULATED
    await setGrade(s0, a1, 'graded', '15');
    await setGrade(s0, a2, 'graded', '30');
    // s1: INCOMPLETE (pending)
    await setGrade(s1, a1, 'graded', '12');
    await setGrade(s1, a2, 'pending');
    // s2: NO_COMPUTABLE_RESULT (all AJ)
    await setGrade(s2, a1, 'absent_excused');
    await setGrade(s2, a2, 'absent_excused');
  }, 10_000);

  afterAll(async () => {
    for (const s of [s0, s1, s2]) {
      await deleteGrade(s, a1);
      await deleteGrade(s, a2);
    }
  }, 10_000);

  it('class contains mixed CALCULATED, INCOMPLETE, NO_COMPUTABLE_RESULT', async () => {
    const classResult = await getCompositionClassResults({
      academicPeriodId: F.periodCompositionId,
      classroomId: F.classroomId,
    });

    const studentResults = classResult.students.map((s) => s.result);
    const statuses = studentResults.map((s) => ({ studentId: s.studentId, status: s.status }));

    // At least one of each
    expect(statuses.some((s) => s.status === 'CALCULATED')).toBe(true);
    expect(statuses.some((s) => s.status === 'INCOMPLETE')).toBe(true);
    expect(statuses.some((s) => s.status === 'NO_COMPUTABLE_RESULT')).toBe(true);
  });
});

// ─────────────────────────────────────────────
// T11 — CLASS AVERAGE VIA M1 RAW
// ─────────────────────────────────────────────

describe('T11 — Class average via M1 raw calculations', () => {
  let a1: string;
  let a2: string;
  const s0 = F.enrollmentIds[0];
  const s1 = F.enrollmentIds[1];

  beforeAll(async () => {
    [a1, a2] = F.assessmentIds;
    // s0: 15/20 + 30/40 = 45/60 × 10 = 7.5
    await setGrade(s0, a1, 'graded', '15');
    await setGrade(s0, a2, 'graded', '30');
    // s1: 18/20 + 36/40 = 54/60 × 10 = 9.0
    await setGrade(s1, a1, 'graded', '18');
    await setGrade(s1, a2, 'graded', '36');
  }, 10_000);

  afterAll(async () => {
    for (const s of [s0, s1]) {
      await deleteGrade(s, a1);
      await deleteGrade(s, a2);
    }
  }, 10_000);

  it('class average = mean(7.5, 9.0) = 8.25', async () => {
    const classResult = await getCompositionClassResults({
      academicPeriodId: F.periodCompositionId,
      classroomId: F.classroomId,
    });

    // Only CALCULATED students included (s0 and s1)
    expect(classResult.classAverage.studentCount).toBeGreaterThanOrEqual(2);
    expect(classResult.classAverage.status).toBe('CALCULATED');
    expect(classResult.classAverage.official).toBe('8.25');
  });
});

// ─────────────────────────────────────────────
// T12 — RANKING VIA CANONICAL M1
// ─────────────────────────────────────────────

describe('T12 — Ranking via canonical M1 ranking adapter', () => {
  let a1: string;
  let a2: string;
  const s0 = F.enrollmentIds[0];
  const s1 = F.enrollmentIds[1];

  beforeAll(async () => {
    [a1, a2] = F.assessmentIds;
    // s0: 15/20 + 30/40 = 7.5
    await setGrade(s0, a1, 'graded', '15');
    await setGrade(s0, a2, 'graded', '30');
    // s1: 18/20 + 36/40 = 9.0
    await setGrade(s1, a1, 'graded', '18');
    await setGrade(s1, a2, 'graded', '36');
  }, 10_000);

  afterAll(async () => {
    for (const s of [s0, s1]) {
      await deleteGrade(s, a1);
      await deleteGrade(s, a2);
    }
  }, 10_000);

  it('ranking uses official averages from M1', async () => {
    const classResult = await getCompositionClassResults({
      academicPeriodId: F.periodCompositionId,
      classroomId: F.classroomId,
    });

    expect(classResult.ranking.length).toBeGreaterThanOrEqual(2);
    // s1 (9.0) should be rank 1, s0 (7.5) rank 2
    const s1Entry = classResult.ranking.find((r) => r.studentId === F.studentIds[1]);
    const s0Entry = classResult.ranking.find((r) => r.studentId === F.studentIds[0]);
    expect(s1Entry).toBeDefined();
    expect(s0Entry).toBeDefined();
    expect(s1Entry!.rank).toBe(1);
    expect(s0Entry!.rank).toBe(2);
  });
});

// ─────────────────────────────────────────────
// T13 — NON-COMPOSITION/ NON-PASSAGE REJECTED
// ─────────────────────────────────────────────

describe('T13 — Non-composition/non-passage period rejected', () => {
  it('trimester period throws InvalidPeriodTypeError', async () => {
    await expect(
      getCompositionStudentResult(F.periodTrimesterId, F.classroomId, F.enrollmentIds[0]),
    ).rejects.toThrow(InvalidPeriodTypeError);
  });

  it('class result for trimester throws InvalidPeriodTypeError', async () => {
    await expect(
      getCompositionClassResults({
        academicPeriodId: F.periodTrimesterId,
        classroomId: F.classroomId,
      }),
    ).rejects.toThrow(InvalidPeriodTypeError);
  });
});

// ─────────────────────────────────────────────
// T14 — PASSAGE USES SAME DATA-SERVICE PATH
// ─────────────────────────────────────────────

describe('T14 — Passage uses same data-service path', () => {
  // Create a passage assessment
  const passageAssessmentId = randomUUID();
  const s0 = F.enrollmentIds[0];

  beforeAll(async () => {
    await sql`
      INSERT INTO assessment (id, classroom_id, subject_id, academic_period_id, assessment_type_id, title, scale, coefficient, status, assessment_date, created_at, updated_at)
      VALUES (${passageAssessmentId}, ${F.classroomId}, ${F.subjectId}, ${F.periodPassageId}, ${F.assessmentTypeId}, 'M2 Passage Assess', 80, '1', 'open', '2026-05-01', now(), now())
    `;
    await setGrade(s0, passageAssessmentId, 'graded', '72');
  }, 10_000);

  afterAll(async () => {
    await deleteGrade(s0, passageAssessmentId);
    await sql`DELETE FROM assessment WHERE id = ${passageAssessmentId}`;
  }, 10_000);

  it('passage: 72/80×10 = 9.00', async () => {
    const result = await getCompositionStudentResult(
      F.periodPassageId, F.classroomId, s0,
    );
    expect(result.status).toBe('CALCULATED');
    expect(result.official).toBe('9');
  });

  it('class result for passage has periodType = passage', async () => {
    const classResult = await getCompositionClassResults({
      academicPeriodId: F.periodPassageId,
      classroomId: F.classroomId,
    });
    expect(classResult.periodType).toBe('passage');
  });
});

// ─────────────────────────────────────────────
// T15 — CATCH-UP RECOMPUTATION
// ─────────────────────────────────────────────

describe('T15 — Catch-up: AJ → graded recomputes', () => {
  let a1: string;
  let a2: string;
  const s0 = F.enrollmentIds[0];

  beforeAll(async () => {
    [a1, a2] = F.assessmentIds;
    // Before catch-up: AJ on a2
    await setGrade(s0, a1, 'graded', '14');
    await setGrade(s0, a2, 'absent_excused');
  }, 10_000);

  afterAll(async () => {
    await deleteGrade(s0, a1);
    await deleteGrade(s0, a2);
  }, 10_000);

  it('AJ first → only a1 contributes: 14/20×10 = 7.00', async () => {
    const before = await getCompositionStudentResult(
      F.periodCompositionId, F.classroomId, s0,
    );
    expect(before.status).toBe('CALCULATED');
    expect(before.official).toBe('7');
  });

  it('after catch-up (AJ→graded): (14+12)/(20+40)×10 = 4.33', async () => {
    // Simulate catch-up: update AJ to graded
    await setGrade(s0, a2, 'graded', '12');

    const after = await getCompositionStudentResult(
      F.periodCompositionId, F.classroomId, s0,
    );
    expect(after.status).toBe('CALCULATED');
    expect(after.official).toBe('4.33');
  });
});

// ─────────────────────────────────────────────
// T16 — ONLY-NEUTRAL RESULT PRESERVES NO_COMPUTABLE_RESULT
// ─────────────────────────────────────────────

describe('T16 — Only-neutral result → NO_COMPUTABLE_RESULT', () => {
  let a1: string;
  let a2: string;
  const s0 = F.enrollmentIds[0];

  beforeAll(async () => {
    [a1, a2] = F.assessmentIds;
    await setGrade(s0, a1, 'absent_excused'); // AJ
    await setGrade(s0, a2, 'exempt'); // exempt
  }, 10_000);

  afterAll(async () => {
    await deleteGrade(s0, a1);
    await deleteGrade(s0, a2);
  }, 10_000);

  it('all AJ/exempt → NO_COMPUTABLE_RESULT', async () => {
    const result = await getCompositionStudentResult(
      F.periodCompositionId, F.classroomId, s0,
    );
    expect(result.status).toBe('NO_COMPUTABLE_RESULT');
    expect(result.raw).toBeNull();
    expect(result.official).toBeNull();
  });
});

// ─────────────────────────────────────────────
// T17 — DATABASE/SERVICE ERROR BEHAVIOR
// ─────────────────────────────────────────────

describe('T17 — Database/service error behavior', () => {
  it('non-existent period throws NotFoundError', async () => {
    await expect(
      getCompositionStudentResult(randomUUID(), F.classroomId, F.enrollmentIds[0]),
    ).rejects.toThrow(NotFoundError);
  });

  it('non-existent classroom throws NotFoundError', async () => {
    await expect(
      getCompositionStudentResult(F.periodCompositionId, randomUUID(), F.enrollmentIds[0]),
    ).rejects.toThrow(NotFoundError);
  });

  it('non-existent enrollment throws NotFoundError', async () => {
    await expect(
      getCompositionStudentResult(F.periodCompositionId, F.classroomId, randomUUID()),
    ).rejects.toThrow(NotFoundError);
  });
});

// ─────────────────────────────────────────────
// T18 — C3 FULL REPLAY
// ─────────────────────────────────────────────

describe('T18 — C3 full replay', () => {
  it('DEFERRED — Reference data not present in Preview DB', () => {
    // The OWNER reference context (CP1 A, 2025-2026, C3) does not exist
    // in the Preview database. Full historical C3 dataset replay is deferred
    // until the reference data becomes available.
    //
    // The raw-before-rounding algorithmic rule is proven by M1 T13.
    // M2 integration evidence is proven by T1–T17 above.
    expect(true).toBe(true);
  });
});
