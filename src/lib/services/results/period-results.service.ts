/**
 * WS-003 Period Results — Read-Only Service
 *
 * PURE READ FLOW. No bulletin generation, no DB mutation.
 * Authoritative server-side calculation using the canonical calculation engine.
 *
 * Context hierarchy: Academic Year → Classroom → Period (all required).
 * Server validates cross-year integrity.
 *
 * WS-003 Contract §4: Viewing must NOT POST /api/bulletins, generate report_card,
 * or mutate any academic data.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  classroom,
  classroomAssignment,
  academicPeriod,
  academicYear,
  pedagogicalConfig,
  configSubject,
  configComponent,
  assessment,
  grade,
  subject,
  subjectComponent,
  enrollment,
  student,
} from '@/lib/db/schema';
import {
  calculateAssessmentResult,
  calculateComponentResult,
  calculateSubjectResultWithCoeffs,
  computeSubjectWeightedPoints,
  calculateGeneralAverage,
  calculateClassStatistics,
  calculateRanking,
} from './calculation-engine';
import type {
  GradeInput,
  AssessmentResult,
  ComponentResult,
  SubjectResult,
  GeneralAverageOutput,
  RankingEntry,
  RoundingStrategyDB,
  GeneralAverageInputPolicy,
} from './types';

// ─────────────────────────────────────────────
// Error types
// ─────────────────────────────────────────────

export class PeriodResultsError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = 'PeriodResultsError';
  }
}

// ─────────────────────────────────────────────
// Response types
// ─────────────────────────────────────────────

export type StudentResultStatus = 'CALCULATED' | 'INCOMPLETE' | 'NON_COMPUTABLE';

export interface PeriodStudentResult {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  generalAverageOfficial: string | null;
  generalAverageRaw: string | null;
  status: StudentResultStatus;
  rank: number | null;
  totalStudentsRanked: number | null;
  classAverage: string | null;
  subjectResults: SubjectResult[];
}

export interface PeriodClassResult {
  classAverage: string | null;
  minAverage: string | null;
  maxAverage: string | null;
  studentCount: number;
}

export interface PeriodResultsResponse {
  students: PeriodStudentResult[];
  classResult: PeriodClassResult;
  configVersionId: string | null;
  generalAverageInputPolicy: string | null;
  roundingStrategy: string | null;
  subjectDecimalPlaces: number | null;
  generalDecimalPlaces: number | null;
}

// ─────────────────────────────────────────────
// Context validation
// ─────────────────────────────────────────────

async function validateContext(
  academicYearId: string,
  classroomId: string,
  academicPeriodId: string,
): Promise<{ levelId: string; schoolId: string }> {
  // 1. Verify academic year exists
  const [year] = await db
    .select({ id: academicYear.id, schoolId: academicYear.schoolId })
    .from(academicYear)
    .where(eq(academicYear.id, academicYearId))
    .limit(1);
  if (!year) throw new PeriodResultsError('YEAR_NOT_FOUND', 'Année scolaire introuvable.', 404);

  // 2. Verify classroom belongs to the selected academic year
  const [cls] = await db
    .select({ id: classroom.id, levelId: classroom.levelId, academicYearId: classroom.academicYearId })
    .from(classroom)
    .where(eq(classroom.id, classroomId))
    .limit(1);
  if (!cls) throw new PeriodResultsError('CLASSROOM_NOT_FOUND', 'Classe introuvable.', 404);
  if (cls.academicYearId !== academicYearId) {
    throw new PeriodResultsError(
      'CROSS_YEAR_CLASSROOM',
      'Cette classe n\'appartient pas à l\'année scolaire sélectionnée.',
      400,
    );
  }

  // 3. Verify period belongs to the selected academic year
  const [period] = await db
    .select({ id: academicPeriod.id, academicYearId: academicPeriod.academicYearId })
    .from(academicPeriod)
    .where(eq(academicPeriod.id, academicPeriodId))
    .limit(1);
  if (!period) throw new PeriodResultsError('PERIOD_NOT_FOUND', 'Période introuvable.', 404);
  if (period.academicYearId !== academicYearId) {
    throw new PeriodResultsError(
      'CROSS_YEAR_PERIOD',
      'Cette période n\'appartient pas à l\'année scolaire sélectionnée.',
      400,
    );
  }

  return { levelId: cls.levelId, schoolId: year.schoolId };
}

// ─────────────────────────────────────────────
// Student resolution
// ─────────────────────────────────────────────

interface StudentSlot {
  enrollmentId: string;
  studentId: string;
  levelId: string;
  academicYearId: string;
}

async function getStudentSlots(
  classroomId: string,
  academicYearId: string,
): Promise<StudentSlot[]> {
  // Active classroom assignments for this classroom
  const assignments = await db
    .select({ enrollmentId: classroomAssignment.enrollmentId })
    .from(classroomAssignment)
    .where(
      and(
        eq(classroomAssignment.classroomId, classroomId),
        eq(classroomAssignment.status, 'active'),
      ),
    );

  if (assignments.length === 0) return [];

  const enrIds = assignments.map(a => a.enrollmentId);

  // Active enrollments for the academic year
  const enrollments = await db
    .select({
      id: enrollment.id,
      studentId: enrollment.studentId,
      academicYearId: enrollment.academicYearId,
    })
    .from(enrollment)
    .where(eq(enrollment.status, 'active'));

  // Build enrollment map for O(1) lookup
  const enrMap = new Map(enrollments.map(e => [e.id, e]));

  const slots: StudentSlot[] = [];
  for (const a of assignments) {
    const enr = enrMap.get(a.enrollmentId);
    if (enr && enr.academicYearId === academicYearId) {
      slots.push({
        enrollmentId: enr.id,
        studentId: enr.studentId,
        levelId: '', // filled by caller
        academicYearId: enr.academicYearId,
      });
    }
  }
  return slots;
}

// ─────────────────────────────────────────────
// Config resolution (same pattern as report-card.service)
// ─────────────────────────────────────────────

async function getActiveConfig(levelId: string, academicYearId: string) {
  const [config] = await db
    .select()
    .from(pedagogicalConfig)
    .where(
      and(
        eq(pedagogicalConfig.levelId, levelId),
        eq(pedagogicalConfig.academicYearId, academicYearId),
        eq(pedagogicalConfig.status, 'active'),
      ),
    )
    .limit(1);
  return config ?? null;
}

async function getConfigSubjectsWithComponents(configId: string) {
  const subjects = await db
    .select()
    .from(configSubject)
    .where(and(eq(configSubject.configId, configId), eq(configSubject.isActive, true)))
    .orderBy(configSubject.sortOrder);

  const result = [];
  for (const cs of subjects) {
    const components = await db
      .select()
      .from(configComponent)
      .where(and(eq(configComponent.configSubjectId, cs.id), eq(configComponent.isActive, true)))
      .orderBy(configComponent.sortOrder);
    result.push({ ...cs, components });
  }
  return result;
}

type AggPolicy = 'simple_average' | 'weighted_average' | 'single_grade';
function asAgg(raw: string): AggPolicy { return raw as AggPolicy; }

// ─────────────────────────────────────────────
// Per-student computation (read-only, no persistence)
// ─────────────────────────────────────────────

async function computeStudentPeriodResults(
  enrollmentId: string,
  configSubjects: (typeof configSubject.$inferSelect & {
    components: (typeof configComponent.$inferSelect)[];
  })[],
  calculationPolicy: AggPolicy,
  subjectDp: number,
  generalDp: number,
  roundingStrategy: RoundingStrategyDB,
  inputPolicy: GeneralAverageInputPolicy,
): Promise<{ subjectResults: SubjectResult[]; generalAverage: GeneralAverageOutput }> {
  const subjectResults: SubjectResult[] = [];

  for (const cs of configSubjects) {
    const { subjectId, coefficient, componentAggregation: subjectCompAgg, assessmentAggregation: subjectAssessAgg, componentScale: subjectScale } = cs;

    const [subj] = await db
      .select({ name: subject.name })
      .from(subject)
      .where(eq(subject.id, subjectId))
      .limit(1);
    const subjectName = subj?.name ?? 'Inconnu';

    if (cs.components.length > 0) {
      // Component-based subject
      const componentResults: ComponentResult[] = [];
      const componentCoefficients = new Map<string, string>();

      for (const cc of cs.components) {
        const [compInfo] = await db
          .select({ name: subjectComponent.name })
          .from(subjectComponent)
          .where(eq(subjectComponent.id, cc.subjectComponentId))
          .limit(1);

        const assessments = await db
          .select({ id: assessment.id, coefficient: assessment.coefficient, scale: assessment.scale })
          .from(assessment)
          .where(eq(assessment.configComponentId, cc.id));

        const assessmentResults: AssessmentResult[] = [];
        for (const a of assessments) {
          const grades = await db
            .select({ rawValue: grade.rawValue, status: grade.status })
            .from(grade)
            .where(and(eq(grade.assessmentId, a.id), eq(grade.enrollmentId, enrollmentId)));

          const gradeInputs: GradeInput[] = grades.map(g => ({
            id: '',
            rawValue: g.rawValue,
            status: g.status as GradeInput['status'],
            scale: a.scale,
            coefficient: String(a.coefficient),
          }));

          const aResult = calculateAssessmentResult(gradeInputs, asAgg(cc.assessmentAggregation), cc.componentScale);
          aResult.assessmentId = a.id;
          aResult.configComponentId = cc.id;
          // WS-003 §7: required assessment with NO grade row → INCOMPLETE
          if (gradeInputs.length === 0) aResult.isIncomplete = true;
          assessmentResults.push(aResult);
        }

        const compResult = calculateComponentResult({
          componentId: cc.id,
          componentName: compInfo?.name ?? cc.name,
          coefficient: cc.coefficient,
          scale: cc.componentScale,
          aggregation: asAgg(cc.assessmentAggregation),
          assessmentResults,
        });
        componentResults.push(compResult);
        componentCoefficients.set(cc.id, cc.coefficient);
      }

      let sr = calculateSubjectResultWithCoeffs(
        { subjectId, configSubjectId: cs.id, subjectName, coefficient, includeInAverage: cs.includeInAverage, aggregation: asAgg(subjectCompAgg), scale: subjectScale, componentResults, assessmentResults: [] },
        componentCoefficients, subjectDp, roundingStrategy,
      );
      sr = computeSubjectWeightedPoints(sr, inputPolicy);
      subjectResults.push(sr);
    } else {
      // Direct assessment subject (no components)
      const assessments = await db
        .select({ id: assessment.id, coefficient: assessment.coefficient, scale: assessment.scale })
        .from(assessment)
        .where(eq(assessment.configSubjectId, cs.id));

      const assessmentResults: AssessmentResult[] = [];
      for (const a of assessments) {
        const grades = await db
          .select({ rawValue: grade.rawValue, status: grade.status })
          .from(grade)
          .where(and(eq(grade.assessmentId, a.id), eq(grade.enrollmentId, enrollmentId)));

        const gradeInputs: GradeInput[] = grades.map(g => ({
          id: '',
          rawValue: g.rawValue,
          status: g.status as GradeInput['status'],
          scale: a.scale,
          coefficient: String(a.coefficient),
        }));

        const aResult = calculateAssessmentResult(gradeInputs, asAgg(subjectAssessAgg), subjectScale);
        aResult.assessmentId = a.id;
        // WS-003 §7: required assessment with NO grade row → INCOMPLETE
        if (gradeInputs.length === 0) aResult.isIncomplete = true;
        assessmentResults.push(aResult);
      }

      let sr = calculateSubjectResultWithCoeffs(
        { subjectId, configSubjectId: cs.id, subjectName, coefficient, includeInAverage: cs.includeInAverage, aggregation: asAgg(subjectAssessAgg), scale: subjectScale, componentResults: [], assessmentResults },
        new Map(), subjectDp, roundingStrategy,
      );
      sr = computeSubjectWeightedPoints(sr, inputPolicy);
      subjectResults.push(sr);
    }
  }

  const generalAverage = calculateGeneralAverage(
    { subjectResults, calculationPolicy, inputPolicy },
    generalDp,
    roundingStrategy,
  );

  return { subjectResults, generalAverage };
}

// ─────────────────────────────────────────────
// PUBLIC API: Get period results (READ-ONLY)
// ─────────────────────────────────────────────

/**
 * Get period results for a classroom + period.
 *
 * PURE READ: no bulletin generation, no DB writes.
 * Uses authoritative server-side calculation engine.
 *
 * WS-003 Contract invariants:
 * - READ-ONLY (no mutation)
 * - NO BULLETIN SIDE EFFECT
 * - SERVER-SIDE CALCULATION
 * - YEAR → CLASS → PERIOD integrity
 * - AI = PENALIZING_ZERO (contract §7)
 * - COMPETITION RANKING (contract §9)
 * - NON_COMPUTABLE when zero effective denominator (contract §7/§9)
 */
export async function getPeriodResults(
  academicYearId: string,
  classroomId: string,
  academicPeriodId: string,
): Promise<PeriodResultsResponse> {
  // 1. Validate context integrity
  const { levelId } = await validateContext(academicYearId, classroomId, academicPeriodId);

  // 2. Resolve students via Enrollment + ClassroomAssignment
  const slots = await getStudentSlots(classroomId, academicYearId);

  // 3. Get active pedagogical config
  const config = await getActiveConfig(levelId, academicYearId);
  if (!config) {
    // No config — return empty results (no computation possible)
    return {
      students: [],
      classResult: { classAverage: null, minAverage: null, maxAverage: null, studentCount: 0 },
      configVersionId: null,
      generalAverageInputPolicy: null,
      roundingStrategy: null,
      subjectDecimalPlaces: null,
      generalDecimalPlaces: null,
    };
  }

  // 4. Extract config values
  const roundingStrategy = config.roundingStrategy as RoundingStrategyDB;
  const subjectDp = config.subjectDecimalPlaces;
  const generalDp = config.generalDecimalPlaces;
  const inputPolicy: GeneralAverageInputPolicy =
    config.generalAverageInputPolicy === 'subject_raw' ? 'SUBJECT_RAW' : 'SUBJECT_OFFICIAL';
  const calculationPolicy = config.calculationPolicy as AggPolicy;
  const rankingEnabled = config.rankingEnabled;

  // 5. Config subjects + components
  const configSubjects = await getConfigSubjectsWithComponents(config.id);
  if (configSubjects.length === 0) {
    return {
      students: slots.map(s => ({
        enrollmentId: s.enrollmentId,
        studentId: s.studentId,
        studentName: 'Inconnu',
        generalAverageOfficial: null,
        generalAverageRaw: null,
        status: 'NON_COMPUTABLE' as const,
        rank: null,
        totalStudentsRanked: null,
        classAverage: null,
        subjectResults: [],
      })),
      classResult: { classAverage: null, minAverage: null, maxAverage: null, studentCount: 0 },
      configVersionId: config.id,
      generalAverageInputPolicy: config.generalAverageInputPolicy,
      roundingStrategy: config.roundingStrategy,
      subjectDecimalPlaces: subjectDp,
      generalDecimalPlaces: generalDp,
    };
  }

  // 6. Per-student computation (READ-ONLY, no persistence)
  const studentComputations: Array<{
    enrollmentId: string;
    studentId: string;
    subjectResults: SubjectResult[];
    generalAverage: GeneralAverageOutput;
  }> = [];

  for (const slot of slots) {
    const result = await computeStudentPeriodResults(
      slot.enrollmentId,
      configSubjects,
      calculationPolicy,
      subjectDp,
      generalDp,
      roundingStrategy,
      inputPolicy,
    );
    studentComputations.push({
      enrollmentId: slot.enrollmentId,
      studentId: slot.studentId,
      ...result,
    });
  }

  // 7. Resolve student names (loop for Neon compatibility)
  const studentIds = studentComputations.map(sc => sc.studentId);
  const studentNameMap = new Map<string, string>();
  for (const sid of studentIds) {
    const [s] = await db
      .select({ firstName: student.firstName, lastName: student.lastName })
      .from(student)
      .where(eq(student.id, sid))
      .limit(1);
    if (s) studentNameMap.set(sid, `${s.lastName} ${s.firstName}`);
  }

  // 8. Determine student statuses
  // WS-003 Contract §7/§9:
 //   - pending or missing required grade → INCOMPLETE
  //   - all subjects neutral (zero effective denominator) → NON_COMPUTABLE
  //   - has contributing grades → CALCULATED
  const studentStatuses: Map<string, StudentResultStatus> = new Map();

  for (const sc of studentComputations) {
    const { generalAverage, subjectResults } = sc;

    // Check for INCOMPLETE (pending grades or missing required grades)
    const hasIncomplete = generalAverage.isIncomplete ||
      subjectResults.some(sr => sr.isIncomplete);

    // Check for NON_COMPUTABLE (zero effective denominator)
    const hasNoEligible = generalAverage.subjectsIncluded === 0;

    if (hasIncomplete) {
      studentStatuses.set(sc.studentId, 'INCOMPLETE');
    } else if (hasNoEligible) {
      studentStatuses.set(sc.studentId, 'NON_COMPUTABLE');
    } else {
      studentStatuses.set(sc.studentId, 'CALCULATED');
    }
  }

  // 9. Competition ranking (only CALCULATED students)
  let ranking: RankingEntry[] = [];
  if (rankingEnabled) {
    const eligibleForRanking = studentComputations
      .filter(sc => studentStatuses.get(sc.studentId) === 'CALCULATED')
      .map(sc => ({ studentId: sc.studentId, average: sc.generalAverage.officialValue }));

    ranking = calculateRanking(eligibleForRanking);
  }

  // 10. Class statistics (only CALCULATED students)
  const calculableAverages = studentComputations
    .filter(sc => studentStatuses.get(sc.studentId) === 'CALCULATED')
    .map(sc => sc.generalAverage.officialValue);

  const classStats = calculateClassStatistics(calculableAverages);

  // 11. Build response
  const students: PeriodStudentResult[] = studentComputations.map(sc => {
    const status = studentStatuses.get(sc.studentId)!;
    const studentRank = ranking.find(r => r.studentId === sc.studentId);

    return {
      enrollmentId: sc.enrollmentId,
      studentId: sc.studentId,
      studentName: studentNameMap.get(sc.studentId) ?? 'Inconnu',
      generalAverageOfficial: status === 'CALCULATED' ? sc.generalAverage.officialValue : null,
      generalAverageRaw: status === 'CALCULATED' ? sc.generalAverage.rawValue : null,
      status,
      rank: studentRank?.rank ?? null,
      totalStudentsRanked: ranking.length > 0 ? ranking.length : null,
      classAverage: classStats.studentCount > 0 ? classStats.classAverage : null,
      subjectResults: sc.subjectResults,
    };
  });

  return {
    students,
    classResult: {
      classAverage: classStats.studentCount > 0 ? classStats.classAverage : null,
      minAverage: classStats.studentCount > 0 ? classStats.minAverage : null,
      maxAverage: classStats.studentCount > 0 ? classStats.maxAverage : null,
      studentCount: classStats.studentCount,
    },
    configVersionId: config.id,
    generalAverageInputPolicy: config.generalAverageInputPolicy,
    roundingStrategy: config.roundingStrategy,
    subjectDecimalPlaces: subjectDp,
    generalDecimalPlaces: generalDp,
  };
}
