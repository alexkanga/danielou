/**
 * WS-002-M2 — Composition Data Service
 *
 * Maps canonical PostgreSQL assessment/grade/status records into
 * M1 pure domain calculation contract (CompositionAssessmentInput).
 *
 * Responsibility: LOAD → CLASSIFY → MAP → CALL M1 → RETURN RESULT
 * Does NOT duplicate M1 formulas.
 * No API routes, no UI, no annual calculation, no schema changes.
 */

import { eq, and, inArray, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  academicPeriod,
  assessment,
  grade,
  enrollment,
  classroomAssignment,
  student,
  classroom,
} from '@/lib/db/schema';
import type { GradeStatus } from './types';
import type {
  CompositionAssessmentInput,
  CompositionStudentResult,
  CompositionClassResult,
  CompositionRankingEntry,
} from './composition.types';
import {
  calculateCompositionStudent,
  calculateCompositionClassAverage,
  calculateCompositionRanking,
} from './composition-engine';
import { NotFoundError } from '@/lib/services/pedagogy/errors';

// ─────────────────────────────────────────────
// Domain Errors
// ─────────────────────────────────────────────

export class InvalidPeriodTypeError extends Error {
  constructor(periodType: string) {
    super(
      `Ce service ne supporte que les périodes de type composition ou passage. Type reçu : ${periodType}`,
    );
    this.name = 'InvalidPeriodTypeError';
  }
}

// ─────────────────────────────────────────────
// Input / Output Types
// ─────────────────────────────────────────────

export interface CompositionClassParams {
  academicPeriodId: string;
  classroomId: string;
}

export interface CompositionStudentResultWithMeta {
  enrollmentId: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  result: CompositionStudentResult;
}

export interface CompositionClassResultWithDetails {
  periodId: string;
  classroomId: string;
  periodType: 'composition' | 'passage';
  periodName: string;
  students: CompositionStudentResultWithMeta[];
  classAverage: CompositionClassResult;
  ranking: CompositionRankingEntry[];
}

// ─────────────────────────────────────────────
// Internal DB Row Types
// ─────────────────────────────────────────────

interface PeriodRow {
  id: string;
  academicYearId: string;
  name: string;
  periodType: string;
  status: string;
}

interface ClassroomRow {
  id: string;
  academicYearId: string;
  name: string;
}

interface EligibleStudentRow {
  enrollmentId: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
}

interface AssessmentRow {
  id: string;
  scale: number;
}

interface GradeRow {
  assessmentId: string;
  enrollmentId: string;
  rawValue: string | null;
  status: string;
}

// ─────────────────────────────────────────────
// Period Validation
// ─────────────────────────────────────────────

async function loadAndValidatePeriod(
  periodId: string,
): Promise<{ period: PeriodRow; compositionType: 'composition' | 'passage' }> {
  const [period] = await db
    .select({
      id: academicPeriod.id,
      academicYearId: academicPeriod.academicYearId,
      name: academicPeriod.name,
      periodType: academicPeriod.periodType,
      status: academicPeriod.status,
    })
    .from(academicPeriod)
    .where(eq(academicPeriod.id, periodId))
    .limit(1);

  if (!period) {
    throw new NotFoundError('academic_period', periodId);
  }

  if (period.periodType !== 'composition' && period.periodType !== 'passage') {
    throw new InvalidPeriodTypeError(period.periodType);
  }

  return {
    period,
    compositionType: period.periodType as 'composition' | 'passage',
  };
}

// ─────────────────────────────────────────────
// Classroom Validation
// ─────────────────────────────────────────────

async function loadAndValidateClassroom(
  classroomId: string,
  academicYearId: string,
): Promise<ClassroomRow> {
  const [cls] = await db
    .select({
      id: classroom.id,
      academicYearId: classroom.academicYearId,
      name: classroom.name,
    })
    .from(classroom)
    .where(eq(classroom.id, classroomId))
    .limit(1);

  if (!cls) {
    throw new NotFoundError('classroom', classroomId);
  }

  if (cls.academicYearId !== academicYearId) {
    throw new Error(
      'La classe et la période doivent appartenir à la même année scolaire.',
    );
  }

  return cls;
}

// ─────────────────────────────────────────────
// Eligible Students
// ─────────────────────────────────────────────

async function loadEligibleStudents(
  classroomId: string,
  academicYearId: string,
): Promise<EligibleStudentRow[]> {
  const rows = await db
    .select({
      enrollmentId: enrollment.id,
      studentId: student.id,
      studentFirstName: student.firstName,
      studentLastName: student.lastName,
    })
    .from(classroomAssignment)
    .innerJoin(
      enrollment,
      eq(classroomAssignment.enrollmentId, enrollment.id),
    )
    .innerJoin(student, eq(enrollment.studentId, student.id))
    .where(
      and(
        eq(classroomAssignment.classroomId, classroomId),
        eq(classroomAssignment.status, 'active'),
        eq(enrollment.status, 'active'),
        eq(enrollment.academicYearId, academicYearId),
      ),
    )
    .orderBy(asc(student.lastName), asc(student.firstName));

  return rows;
}

// ─────────────────────────────────────────────
// Applicable Assessments
// ─────────────────────────────────────────────

async function loadApplicableAssessments(
  classroomId: string,
  periodId: string,
): Promise<AssessmentRow[]> {
  const rows = await db
    .select({
      id: assessment.id,
      scale: assessment.scale,
    })
    .from(assessment)
    .where(
      and(
        eq(assessment.classroomId, classroomId),
        eq(assessment.academicPeriodId, periodId),
      ),
    )
    .orderBy(assessment.createdAt);

  return rows;
}

// ─────────────────────────────────────────────
// Grades for Students × Assessments
// ─────────────────────────────────────────────

async function loadGrades(
  enrollmentIds: string[],
  assessmentIds: string[],
): Promise<GradeRow[]> {
  if (enrollmentIds.length === 0 || assessmentIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      assessmentId: grade.assessmentId,
      enrollmentId: grade.enrollmentId,
      rawValue: grade.rawValue,
      status: grade.status,
    })
    .from(grade)
    .where(
      and(
        inArray(grade.enrollmentId, enrollmentIds),
        inArray(grade.assessmentId, assessmentIds),
      ),
    );

  return rows;
}

// ─────────────────────────────────────────────
// Status Mapping (DB → M1)
// ─────────────────────────────────────────────

/**
 * Maps canonical DB gradeStatus to M1 CompositionAssessmentInput status.
 * The DB enum and M1 status union share the same string values;
 * this function provides an explicit, typed bridge.
 */
function mapGradeStatusToM1(
  dbStatus: string,
): CompositionAssessmentInput['status'] {
  const valid: CompositionAssessmentInput['status'][] = [
    'graded',
    'absent_unexcused',
    'absent_excused',
    'exempt',
    'not_evaluated',
    'pending',
  ];
  if (valid.includes(dbStatus as CompositionAssessmentInput['status'])) {
    return dbStatus as CompositionAssessmentInput['status'];
  }
  // Defensive fallback — treat unknown as pending (INCOMPLETE)
  return 'pending';
}

// ─────────────────────────────────────────────
// Build M1 Input for One Student
// ─────────────────────────────────────────────

/**
 * For one student, builds the M1 CompositionAssessmentInput array
 * and the missingRequiredCount from DB records.
 */
function buildStudentM1Input(
  enrollmentId: string,
  studentId: string,
  assessmentRows: AssessmentRow[],
  gradeMap: Map<string, GradeRow>, // key = "enrollmentId::assessmentId"
): { assessments: CompositionAssessmentInput[]; missingRequiredCount: number } {
  const assessments: CompositionAssessmentInput[] = [];
  let missingRequiredCount = 0;

  for (const a of assessmentRows) {
    const key = `${enrollmentId}::${a.id}`;
    const g = gradeMap.get(key);

    if (!g) {
      // No grade record for an applicable assessment → MISSING REQUIRED
      missingRequiredCount++;
      continue;
    }

    const status = mapGradeStatusToM1(g.status);
    const rawValue = status === 'graded' ? g.rawValue : null;

    assessments.push({
      assessmentId: a.id,
      maxPoints: a.scale,
      status,
      rawValue,
    });
  }

  return { assessments, missingRequiredCount };
}

// ─────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────

/**
 * Get a single student's Composition/Passage result from stored data.
 */
export async function getCompositionStudentResult(
  academicPeriodId: string,
  classroomId: string,
  enrollmentId: string,
): Promise<CompositionStudentResult> {
  // Validate period type
  const { period, compositionType } =
    await loadAndValidatePeriod(academicPeriodId);

  // Validate classroom year consistency
  await loadAndValidateClassroom(classroomId, period.academicYearId);

  // Load assessments for this classroom/period
  const assessmentRows = await loadApplicableAssessments(
    classroomId,
    academicPeriodId,
  );

  // Load grades for this specific student
  const gradeRows = await loadGrades([enrollmentId], assessmentRows.map((a) => a.id));
  const gradeMap = new Map<string, GradeRow>();
  for (const g of gradeRows) {
    gradeMap.set(`${g.enrollmentId}::${g.assessmentId}`, g);
  }

  // Build M1 input — need studentId from enrollment
  const [enr] = await db
    .select({ studentId: enrollment.studentId })
    .from(enrollment)
    .where(eq(enrollment.id, enrollmentId))
    .limit(1);

  if (!enr) {
    throw new NotFoundError('enrollment', enrollmentId);
  }

  const { assessments, missingRequiredCount } = buildStudentM1Input(
    enrollmentId,
    enr.studentId,
    assessmentRows,
    gradeMap,
  );

  return calculateCompositionStudent(
    enr.studentId,
    assessments,
    missingRequiredCount,
  );
}

/**
 * Get full Composition/Passage class results for a classroom and period.
 *
 * Orchestrates: load DB → map to M1 → call M1 engine → return structured results.
 */
export async function getCompositionClassResults(
  params: CompositionClassParams,
): Promise<CompositionClassResultWithDetails> {
  const { academicPeriodId, classroomId } = params;

  // 1. Validate period
  const { period, compositionType } =
    await loadAndValidatePeriod(academicPeriodId);

  // 2. Validate classroom
  const cls = await loadAndValidateClassroom(
    classroomId,
    period.academicYearId,
  );

  // 3. Load eligible students
  const students = await loadEligibleStudents(
    classroomId,
    period.academicYearId,
  );

  // 4. Load applicable assessments
  const assessmentRows = await loadApplicableAssessments(
    classroomId,
    academicPeriodId,
  );

  // 5. Load all grades for these students × assessments
  const enrollmentIds = students.map((s) => s.enrollmentId);
  const assessmentIds = assessmentRows.map((a) => a.id);
  const gradeRows = await loadGrades(enrollmentIds, assessmentIds);

  // Build grade lookup: "enrollmentId::assessmentId" → grade
  const gradeMap = new Map<string, GradeRow>();
  for (const g of gradeRows) {
    gradeMap.set(`${g.enrollmentId}::${g.assessmentId}`, g);
  }

  // 6. For each student: build M1 input and calculate
  const studentResults: CompositionStudentResultWithMeta[] = [];
  const allM1Results: CompositionStudentResult[] = [];

  for (const s of students) {
    const { assessments, missingRequiredCount } = buildStudentM1Input(
      s.enrollmentId,
      s.studentId,
      assessmentRows,
      gradeMap,
    );

    const result = calculateCompositionStudent(
      s.studentId,
      assessments,
      missingRequiredCount,
    );

    studentResults.push({
      enrollmentId: s.enrollmentId,
      studentId: s.studentId,
      studentFirstName: s.studentFirstName,
      studentLastName: s.studentLastName,
      result,
    });

    allM1Results.push(result);
  }

  // 7. Class average via M1
  const classAverage = calculateCompositionClassAverage(allM1Results);

  // 8. Ranking via M1
  const ranking = calculateCompositionRanking(allM1Results);

  return {
    periodId: academicPeriodId,
    classroomId,
    periodType: compositionType,
    periodName: period.name,
    students: studentResults,
    classAverage,
    ranking,
  };
}
