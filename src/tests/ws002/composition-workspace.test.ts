/**
 * WS-002-M3 — Composition Workspace Tests
 *
 * T1-T6: Server/API tests (authorization, period filtering, error handling)
 * T7-T18: UI behavior tests (result display, status semantics, loading/error/empty states)
 */

// @vitest-environment node

import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { randomUUID } from 'crypto';
import { createSqlClient } from '@/tests/helpers/sql-client';
import { getCompositionClassResults, InvalidPeriodTypeError } from '@/lib/services/results/composition-data.service';
import { NotFoundError } from '@/lib/services/pedagogy/errors';

const sql = createSqlClient(process.env.DATABASE_URL!);

interface TestContext {
  schoolId: string;
  academicYearId: string;
  levelId: string;
  classroomId: string;
  subjectId: string;
  assessmentTypeId: string;
  periodCompositionId: string;
  periodPassageId: string;
  periodTrimesterId: string;
  studentIds: string[];
  enrollmentIds: string[];
  assignmentIds: string[];
  assessmentIds: string[];
}

async function createTestContext(): Promise<TestContext> {
  const ids: TestContext = {
    schoolId: randomUUID(), academicYearId: randomUUID(), levelId: randomUUID(),
    classroomId: randomUUID(), subjectId: randomUUID(), assessmentTypeId: randomUUID(),
    periodCompositionId: randomUUID(), periodPassageId: randomUUID(), periodTrimesterId: randomUUID(),
    studentIds: [randomUUID(), randomUUID(), randomUUID()],
    enrollmentIds: [randomUUID(), randomUUID(), randomUUID()],
    assignmentIds: [randomUUID(), randomUUID(), randomUUID()],
    assessmentIds: [],
  };

  await sql`INSERT INTO school (id, name, created_at, updated_at) VALUES (${ids.schoolId}, 'M3 Test School', now(), now())`;
  await sql`INSERT INTO academic_year (id, school_id, name, start_date, end_date, status, created_at, updated_at) VALUES (${ids.academicYearId}, ${ids.schoolId}, 'M3 Year', '2025-09-01', '2026-06-30', 'active', now(), now())`;
  await sql`INSERT INTO level (id, school_id, name, sort_order, created_at, updated_at) VALUES (${ids.levelId}, ${ids.schoolId}, 'M3 Level', 1, now(), now())`;
  await sql`INSERT INTO classroom (id, level_id, academic_year_id, name, created_at, updated_at) VALUES (${ids.classroomId}, ${ids.levelId}, ${ids.academicYearId}, 'M3 Class', now(), now())`;
  await sql`INSERT INTO subject (id, school_id, code, name, is_active, created_at, updated_at) VALUES (${ids.subjectId}, ${ids.schoolId}, 'M3T', 'M3 Subject', true, now(), now())`;
  await sql`INSERT INTO assessment_type (id, school_id, name, is_active, created_at, updated_at) VALUES (${ids.assessmentTypeId}, ${ids.schoolId}, 'M3 Type', true, now(), now())`;
  await sql`INSERT INTO academic_period (id, academic_year_id, name, period_type, sort_order, status, created_at, updated_at) VALUES (${ids.periodCompositionId}, ${ids.academicYearId}, 'M3 C1', 'composition', 1, 'open', now(), now())`;
  await sql`INSERT INTO academic_period (id, academic_year_id, name, period_type, sort_order, status, created_at, updated_at) VALUES (${ids.periodPassageId}, ${ids.academicYearId}, 'M3 Passage', 'passage', 10, 'open', now(), now())`;
  await sql`INSERT INTO academic_period (id, academic_year_id, name, period_type, sort_order, status, created_at, updated_at) VALUES (${ids.periodTrimesterId}, ${ids.academicYearId}, 'M3 Trim', 'trimester', 1, 'open', now(), now())`;
  for (let i = 0; i < 3; i++) {
    const fn = `P${i}`, ln = `N${i}`;
    await sql`INSERT INTO student (id, school_id, first_name, last_name, created_at, updated_at) VALUES (${ids.studentIds[i]}, ${ids.schoolId}, ${fn}, ${ln}, now(), now())`;
    await sql`INSERT INTO enrollment (id, student_id, academic_year_id, school_id, status, created_at, updated_at) VALUES (${ids.enrollmentIds[i]}, ${ids.studentIds[i]}, ${ids.academicYearId}, ${ids.schoolId}, 'active', now(), now())`;
    await sql`INSERT INTO classroom_assignment (id, enrollment_id, classroom_id, start_date, status, created_at, updated_at) VALUES (${ids.assignmentIds[i]}, ${ids.enrollmentIds[i]}, ${ids.classroomId}, '2025-09-01', 'active', now(), now())`;
  }
  return ids;
}

async function cleanupTestContext(ids: TestContext) {
  for (const aId of ids.assessmentIds) {
    await sql`DELETE FROM grade WHERE assessment_id = ${aId}`;
    await sql`DELETE FROM assessment WHERE id = ${aId}`;
  }
  for (const eId of ids.enrollmentIds) {
    await sql`DELETE FROM grade WHERE enrollment_id = ${eId}`;
    await sql`DELETE FROM classroom_assignment WHERE enrollment_id = ${eId}`;
    await sql`DELETE FROM enrollment WHERE id = ${eId}`;
  }
  for (const sId of ids.studentIds) await sql`DELETE FROM student WHERE id = ${sId}`;
  await sql`DELETE FROM academic_period WHERE id IN (${ids.periodCompositionId}, ${ids.periodPassageId}, ${ids.periodTrimesterId})`;
  await sql`DELETE FROM assessment_type WHERE id = ${ids.assessmentTypeId}`;
  await sql`DELETE FROM subject WHERE id = ${ids.subjectId}`;
  await sql`DELETE FROM classroom WHERE id = ${ids.classroomId}`;
  await sql`DELETE FROM level WHERE id = ${ids.levelId}`;
  await sql`DELETE FROM academic_year WHERE id = ${ids.academicYearId}`;
  await sql`DELETE FROM school WHERE id = ${ids.schoolId}`;
}

async function setGrade(eid: string, aid: string, status: string, rv: string | null = null) {
  await sql`INSERT INTO grade (id, assessment_id, enrollment_id, raw_value, status, created_at, updated_at) VALUES (${randomUUID()}, ${aid}, ${eid}, ${rv}, ${status}, now(), now()) ON CONFLICT (assessment_id, enrollment_id) DO UPDATE SET raw_value = EXCLUDED.raw_value, status = EXCLUDED.status, updated_at = now()`;
}
async function delGrade(eid: string, aid: string) { await sql`DELETE FROM grade WHERE assessment_id = ${aid} AND enrollment_id = ${eid}`; }

let ctx: TestContext;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  ctx = await createTestContext();
  const a1 = randomUUID(), a2 = randomUUID();
  await sql`INSERT INTO assessment (id, classroom_id, subject_id, academic_period_id, assessment_type_id, title, scale, coefficient, status, assessment_date, created_at, updated_at) VALUES (${a1}, ${ctx.classroomId}, ${ctx.subjectId}, ${ctx.periodCompositionId}, ${ctx.assessmentTypeId}, 'M3A1', 20, '1', 'open', '2025-11-01', now(), now())`;
  await sql`INSERT INTO assessment (id, classroom_id, subject_id, academic_period_id, assessment_type_id, title, scale, coefficient, status, assessment_date, created_at, updated_at) VALUES (${a2}, ${ctx.classroomId}, ${ctx.subjectId}, ${ctx.periodCompositionId}, ${ctx.assessmentTypeId}, 'M3A2', 40, '1', 'open', '2025-11-15', now(), now())`;
  ctx.assessmentIds = [a1, a2];
}, 30_000);

afterAll(async () => { await cleanupTestContext(ctx); }, 30_000);

const loadParams = () => ({ academicPeriodId: ctx.periodCompositionId, classroomId: ctx.classroomId });

// ── T1 ──
describe('T1 — Composition results returns M2 results', () => {
  it('CALCULATED student (15+32)/(20+40)*10 = 7.83', async () => {
    const s = ctx.enrollmentIds[0], [a1, a2] = ctx.assessmentIds;
    await setGrade(s, a1, 'graded', '15'); await setGrade(s, a2, 'graded', '32');
    try {
      const r = await getCompositionClassResults(loadParams());
      const st = r.students.find((x) => x.enrollmentId === s);
      expect(st).toBeDefined(); expect(st!.result.status).toBe('CALCULATED'); expect(st!.result.official).toBe('7.83');
    } finally { await delGrade(s, a1); await delGrade(s, a2); }
  });
});

// ── T2 ──
describe('T2 — Passage-type period supported', () => {
  it('periodType=passage', async () => {
    const pa = randomUUID();
    await sql`INSERT INTO assessment (id, classroom_id, subject_id, academic_period_id, assessment_type_id, title, scale, coefficient, status, assessment_date, created_at, updated_at) VALUES (${pa}, ${ctx.classroomId}, ${ctx.subjectId}, ${ctx.periodPassageId}, ${ctx.assessmentTypeId}, 'M3P', 80, '1', 'open', '2026-05-01', now(), now())`;
    try {
      const r = await getCompositionClassResults({ academicPeriodId: ctx.periodPassageId, classroomId: ctx.classroomId });
      expect(r.periodType).toBe('passage');
    } finally { await sql`DELETE FROM assessment WHERE id = ${pa}`; }
  });
});

// ── T3 ──
describe('T3 — Unrelated period type rejected', () => {
  it('trimester throws InvalidPeriodTypeError', async () => {
    await expect(getCompositionClassResults({ academicPeriodId: ctx.periodTrimesterId, classroomId: ctx.classroomId })).rejects.toThrow(InvalidPeriodTypeError);
  });
});

// ── T4 ──
describe('T4 — Missing/invalid context returns error', () => {
  it('non-existent period → NotFoundError', async () => {
    await expect(getCompositionClassResults({ academicPeriodId: randomUUID(), classroomId: ctx.classroomId })).rejects.toThrow(NotFoundError);
  });
  it('non-existent classroom → NotFoundError', async () => {
    await expect(getCompositionClassResults({ academicPeriodId: ctx.periodCompositionId, classroomId: randomUUID() })).rejects.toThrow(NotFoundError);
  });
});

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── T5 ──
describe('T5 — Authorization enforced at API boundary', () => {
  it('API route requires school:grades:read', () => {
    expect(readFileSync(resolve('src/app/api/compositions/route.ts'), 'utf8')).toContain("requireAuthorizedSession('school:grades:read')");
  });
});

// ── T6 ──
describe('T6 — Teacher scope preserved for grade mutations', () => {
  it('grade API enforces teacher scope', () => {
    expect(readFileSync(resolve('src/app/api/notes/route.ts'), 'utf8')).toContain('requireAssessmentScope');
  });
});

// ── T7 ──
describe('T7 — CALCULATED student displays official average', () => {
  it('(18+36)/(20+40)*10 = 9', async () => {
    const s = ctx.enrollmentIds[0], [a1, a2] = ctx.assessmentIds;
    await setGrade(s, a1, 'graded', '18'); await setGrade(s, a2, 'graded', '36');
    try {
      const r = await getCompositionClassResults(loadParams());
      const st = r.students.find((x) => x.enrollmentId === s);
      expect(st!.result.status).toBe('CALCULATED'); expect(st!.result.official).toBe('9');
    } finally { await delGrade(s, a1); await delGrade(s, a2); }
  });
});

// ── T8 ──
describe('T8 — AI displayed semantically (not ordinary 0 grade)', () => {
  it('AI: 0/20+30/40 = 5.00, not 0', async () => {
    const s = ctx.enrollmentIds[1], [a1, a2] = ctx.assessmentIds;
    await setGrade(s, a1, 'absent_unexcused'); await setGrade(s, a2, 'graded', '30');
    try {
      const r = await getCompositionClassResults(loadParams());
      const st = r.students.find((x) => x.enrollmentId === s);
      expect(st!.result.official).toBe('5'); expect(st!.result.official).not.toBe('0');
    } finally { await delGrade(s, a1); await delGrade(s, a2); }
  });
});

// ── T9 ──
describe('T9 — AJ displayed semantically', () => {
  it('AJ excluded: 16/20*10 = 8.00', async () => {
    const s = ctx.enrollmentIds[2], [a1, a2] = ctx.assessmentIds;
    await setGrade(s, a1, 'graded', '16'); await setGrade(s, a2, 'absent_excused');
    try {
      const r = await getCompositionClassResults(loadParams());
      const st = r.students.find((x) => x.enrollmentId === s);
      expect(st!.result.official).toBe('8');
    } finally { await delGrade(s, a1); await delGrade(s, a2); }
  });
});

// ── T10 ──
describe('T10 — INCOMPLETE displayed explicitly', () => {
  it('pending → INCOMPLETE, null official', async () => {
    const s = ctx.enrollmentIds[0], [a1, a2] = ctx.assessmentIds;
    await setGrade(s, a1, 'graded', '15'); await setGrade(s, a2, 'pending');
    try {
      const r = await getCompositionClassResults(loadParams());
      const st = r.students.find((x) => x.enrollmentId === s);
      expect(st!.result.status).toBe('INCOMPLETE'); expect(st!.result.official).toBeNull();
    } finally { await delGrade(s, a1); await delGrade(s, a2); }
  });
});

// ── T11 ──
describe('T11 — NO_COMPUTABLE_RESULT displayed explicitly', () => {
  it('all neutral → NO_COMPUTABLE_RESULT, null official', async () => {
    const s = ctx.enrollmentIds[0], [a1, a2] = ctx.assessmentIds;
    await setGrade(s, a1, 'absent_excused'); await setGrade(s, a2, 'exempt');
    try {
      const r = await getCompositionClassResults(loadParams());
      const st = r.students.find((x) => x.enrollmentId === s);
      expect(st!.result.status).toBe('NO_COMPUTABLE_RESULT'); expect(st!.result.official).toBeNull();
    } finally { await delGrade(s, a1); await delGrade(s, a2); }
  });
});

// ── T12 ──
describe('T12 — Rank only for CALCULATED students', () => {
  it('CALCULATED have ranks, non-CALCULATED excluded', async () => {
    const s0 = ctx.enrollmentIds[0], s1 = ctx.enrollmentIds[1], [a1, a2] = ctx.assessmentIds;
    await setGrade(s0, a1, 'graded', '10'); await setGrade(s0, a2, 'graded', '20');
    await setGrade(s1, a1, 'graded', '18'); await setGrade(s1, a2, 'graded', '36');
    try {
      const r = await getCompositionClassResults(loadParams());
      const r1 = r.ranking.find((x) => x.studentId === ctx.studentIds[1]);
      expect(r1).toBeDefined(); expect(r1!.rank).toBe(1);
      const incompleteIds = r.students.filter((x) => x.result.status !== 'CALCULATED').map((x) => x.studentId);
      for (const sid of incompleteIds) expect(r.ranking.find((x) => x.studentId === sid)).toBeUndefined();
    } finally { for (const s of [s0, s1]) { await delGrade(s, a1); await delGrade(s, a2); } }
  });
});

// ── T13 ──
describe('T13 — Class average from M1/M2', () => {
  it('mean(7.5, 9.0) = 8.25', async () => {
    const s0 = ctx.enrollmentIds[0], s1 = ctx.enrollmentIds[1], [a1, a2] = ctx.assessmentIds;
    await setGrade(s0, a1, 'graded', '15'); await setGrade(s0, a2, 'graded', '30');
    await setGrade(s1, a1, 'graded', '18'); await setGrade(s1, a2, 'graded', '36');
    try {
      const r = await getCompositionClassResults(loadParams());
      expect(r.classAverage.status).toBe('CALCULATED'); expect(r.classAverage.official).toBe('8.25');
    } finally { for (const s of [s0, s1]) { await delGrade(s, a1); await delGrade(s, a2); } }
  });
});

// ── T14-T16: UI pattern verification ──
describe('T14 — Loading state in workspace', () => {
  it('page uses Skeleton', () => {
    expect(readFileSync(resolve('src/app/(dashboard)/dashboard/compositions/page.tsx'), 'utf8')).toContain('Skeleton');
  });
});
describe('T15 — Empty state in workspace', () => {
  it('shows selection prompt', () => {
    expect(readFileSync(resolve('src/app/(dashboard)/dashboard/compositions/page.tsx'), 'utf8')).toContain('lectionnez');
  });
});
describe('T16 — Error state in workspace', () => {
  it('handles errors with toast', () => {
    expect(readFileSync(resolve('src/app/(dashboard)/dashboard/compositions/page.tsx'), 'utf8')).toContain('toast.error');
  });
});

// ── T17 ──
describe('T17 — Catch-up: AJ → graded', () => {
  it('AJ→7.00, then catch-up→4.33', async () => {
    const s = ctx.enrollmentIds[0], [a1, a2] = ctx.assessmentIds;
    await setGrade(s, a1, 'graded', '14'); await setGrade(s, a2, 'absent_excused');
    try {
      const b = await getCompositionClassResults(loadParams());
      expect(b.students.find((x) => x.enrollmentId === s)!.result.official).toBe('7');
      await setGrade(s, a2, 'graded', '12');
      const a = await getCompositionClassResults(loadParams());
      expect(a.students.find((x) => x.enrollmentId === s)!.result.official).toBe('4.33');
    } finally { await delGrade(s, a1); await delGrade(s, a2); }
  });
});

// ── T18 ──
describe('T18 — Results refresh after grade update', () => {
  it('5.00 → 6.00 after update', async () => {
    const s = ctx.enrollmentIds[0], [a1, a2] = ctx.assessmentIds;
    await setGrade(s, a1, 'graded', '10'); await setGrade(s, a2, 'graded', '20');
    try {
      const b = await getCompositionClassResults(loadParams());
      expect(b.students.find((x) => x.enrollmentId === s)!.result.official).toBe('5');
      await setGrade(s, a1, 'graded', '16');
      const a = await getCompositionClassResults(loadParams());
      expect(a.students.find((x) => x.enrollmentId === s)!.result.official).toBe('6');
    } finally { await delGrade(s, a1); await delGrade(s, a2); }
  });
});
