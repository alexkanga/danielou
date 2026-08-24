/**
 * M5 Report Card Domain Service
 *
 * Lifecycle: DRAFT → READY → VALIDATED → PUBLISHED
 * - DRAFT:     Calculated results stored, mutable
 * - READY:     Teacher has reviewed, awaiting direction validation
 * - VALIDATED: Direction validated, awaiting publication
 * - PUBLISHED: Immutable snapshot (publishedAt + publishedBy set)
 *
 * Snapshot traceability: preserves subject raw/official, coefficient,
 * policy, general raw/official, rounding strategy, decimal places,
 * component-level details.
 *
 * Competition ranking: rank = 1 + count of strictly higher averages.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { logPedagogyAudit } from '@/lib/services/pedagogy/audit';
import {
  reportCard,
  reportCardItem,
  reportCardComponentItem,
  enrollment,
  academicPeriod,
  pedagogicalConfig,
  configSubject,
  configComponent,
  assessment,
  grade,
  subject,
  subjectComponent,
  classroomAssignment,
  classroom,
  student,
} from '@/lib/db/schema';
import type {
  ReportCard,
  ReportCardItem,
  ReportCardComponentItem,
} from '@/lib/db/schema';
import type { RoundingStrategyDB, GeneralAverageInputPolicy } from './types';
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
} from './types';

// ─────────────────────────────────────────────
// Error types
// ─────────────────────────────────────────────

export class ReportCardError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = 'ReportCardError';
  }
}

export class ReportCardNotFoundError extends ReportCardError {
  constructor(id: string) {
    super('REPORT_CARD_NOT_FOUND', `Bulletin non trouvé (id: ${id}).`, 404);
  }
}

export class ReportCardImmutableError extends ReportCardError {
  constructor(status: string) {
    super(
      'REPORT_CARD_IMMUTABLE',
      `Ce bulletin est ${status} et ne peut plus être modifié.`,
      409,
    );
  }
}

export class ReportCardTransitionError extends ReportCardError {
  constructor(from: string, to: string) {
    super('INVALID_TRANSITION', `Transition invalide : ${from} → ${to}.`, 409);
  }
}

// ─────────────────────────────────────────────
// Valid lifecycle transitions
// ─────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['ready'],
  ready: ['validated', 'draft'],
  validated: ['published', 'ready'],
  published: [], // Immutable — no exits
};

function validateTransition(from: string, to: string): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new ReportCardTransitionError(from, to);
  }
}

// ─────────────────────────────────────────────
// Data model helpers
// ─────────────────────────────────────────────

interface StudentSlot {
  enrollmentId: string;
  studentId: string;
  schoolId: string;
  levelId: string;
  academicYearId: string;
}

/**
 * Get active student slots for a classroom + academic period.
 *
 * Join path: classroom → classroom_assignment → enrollment → student
 *            classroom carries levelId + academicYearId
 *            enrollment carries schoolId
 *            academicPeriod filters by period's academicYearId
 */
async function getStudentSlots(
  classroomId: string,
  academicPeriodId: string,
): Promise<StudentSlot[]> {
  // 1. Get classroom → levelId, academicYearId
  const [cls] = await db
    .select({ levelId: classroom.levelId, academicYearId: classroom.academicYearId })
    .from(classroom)
    .where(eq(classroom.id, classroomId))
    .limit(1);
  if (!cls) return [];

  // 2. Get academicPeriod → verify it belongs to the same year
  const [period] = await db
    .select({ academicYearId: academicPeriod.academicYearId })
    .from(academicPeriod)
    .where(eq(academicPeriod.id, academicPeriodId))
    .limit(1);
  if (!period || period.academicYearId !== cls.academicYearId) return [];

  // 3. Get active classroom_assignments for this classroom
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

  // 4. Get active enrollments with studentId + schoolId
  const enrollmentRows = await db
    .select({ id: enrollment.id, studentId: enrollment.studentId, schoolId: enrollment.schoolId })
    .from(enrollment)
    .where(eq(enrollment.status, 'active'));

  const enrollmentMap = new Map(enrollmentRows.map(e => [e.id, e]));

  const slots: StudentSlot[] = [];
  for (const a of assignments) {
    const enr = enrollmentMap.get(a.enrollmentId);
    if (enr) {
      slots.push({
        enrollmentId: enr.id,
        studentId: enr.studentId,
        schoolId: enr.schoolId,
        levelId: cls.levelId,
        academicYearId: cls.academicYearId,
      });
    }
  }
  return slots;
}

/** Get the active pedagogical config for a level + year */
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

/** Fetch all active config subjects with their active components */
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

function asAgg(raw: string): AggPolicy {
  return raw as AggPolicy;
}

// ─────────────────────────────────────────────
// 1. GENERATE REPORT CARDS (classroom × period)
// ─────────────────────────────────────────────

export interface GenerateReportCardsInput {
  classroomId: string;
  academicPeriodId: string;
  actor: { id: string; isGhost: boolean };
  ipAddress?: string;
}

export interface GenerateReportCardsResult {
  created: number;
  updated: number;
  errors: string[];
}

/**
 * Generate or regenerate all report cards for a classroom + period.
 * Full pipeline: grades → assessments → components → subjects → general → ranking.
 * Persists snapshot to DB.
 */
export async function generateReportCards(
  input: GenerateReportCardsInput,
): Promise<GenerateReportCardsResult> {
  const { classroomId, academicPeriodId, actor } = input;

  // 1. Resolve student slots
  const slots = await getStudentSlots(classroomId, academicPeriodId);
  if (slots.length === 0) return { created: 0, updated: 0, errors: [] };

  // 2. Get active config
  const { levelId, academicYearId } = slots[0];
  const config = await getActiveConfig(levelId, academicYearId);
  if (!config) {
    throw new ReportCardError(
      'NO_ACTIVE_CONFIG',
      'Aucune configuration pédagogique active pour ce niveau et cette année scolaire.',
      422,
    );
  }

  // 3. Config subjects + components
  const configSubjects = await getConfigSubjectsWithComponents(config.id);
  if (configSubjects.length === 0) return { created: 0, updated: 0, errors: [] };

  // 4. Extract config values
  const roundingStrategy = config.roundingStrategy as RoundingStrategyDB;
  const subjectDp = config.subjectDecimalPlaces;
  const generalDp = config.generalDecimalPlaces;
  const inputPolicy: GeneralAverageInputPolicy =
    config.generalAverageInputPolicy === 'subject_raw' ? 'SUBJECT_RAW' : 'SUBJECT_OFFICIAL';
  const calculationPolicy = config.calculationPolicy as AggPolicy;
  const rankingEnabled = config.rankingEnabled;

  // 5. Per-student computation
  const allResults: { enrollmentId: string; studentId: string; subjectResults: SubjectResult[]; generalAverage: GeneralAverageOutput }[] = [];
  const errors: string[] = [];

  for (const slot of slots) {
    try {
      const result = await computeStudentResults(
        slot.enrollmentId,
        configSubjects,
        calculationPolicy,
        subjectDp,
        generalDp,
        roundingStrategy,
        inputPolicy,
      );
      allResults.push({ enrollmentId: slot.enrollmentId, studentId: slot.studentId, ...result });
    } catch (e) {
      errors.push(`Élève ${slot.studentId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 6. Class statistics & ranking
  const validAverages = allResults
    .filter(r => r.generalAverage.officialValue !== '0')
    .map(r => r.generalAverage.officialValue);
  const classStats = calculateClassStatistics(validAverages);

  let ranking: RankingEntry[] = [];
  if (rankingEnabled) {
    ranking = calculateRanking(
      allResults.map(r => ({ studentId: r.studentId, average: r.generalAverage.officialValue })),
    );
  }

  // 7. Persist
  let created = 0;
  let updated = 0;

  for (const sr of allResults) {
    const { enrollmentId, studentId, subjectResults, generalAverage } = sr;
    const studentRank = ranking.find(r => r.studentId === studentId);

    // Check existing
    const [existing] = await db
      .select({ id: reportCard.id, status: reportCard.status })
      .from(reportCard)
      .where(and(eq(reportCard.studentId, studentId), eq(reportCard.academicPeriodId, academicPeriodId)))
      .limit(1);

    if (existing?.status === 'published') {
      errors.push(`Élève ${studentId}: bulletin déjà publié, ignoré.`);
      continue;
    }

    const data = {
      studentId,
      enrollmentId,
      academicPeriodId,
      status: 'draft' as const,
      generalAverageRaw: generalAverage.rawValue,
      generalAverageOfficial: generalAverage.officialValue,
      generalAverageInputPolicy: config.generalAverageInputPolicy,
      roundingStrategy: config.roundingStrategy,
      subjectDecimalPlaces: subjectDp,
      generalDecimalPlaces: generalDp,
      classAverage: classStats.studentCount > 0 ? classStats.classAverage : null,
      minClassAverage: classStats.studentCount > 0 ? classStats.minAverage : null,
      maxClassAverage: classStats.studentCount > 0 ? classStats.maxAverage : null,
      rank: studentRank?.rank ?? null,
      totalStudentsRanked: ranking.length > 0 ? ranking.length : null,
      totalWeightedPoints: generalAverage.totalWeightedPoints,
      totalEligibleCoefficient: generalAverage.totalEligibleCoefficient,
      configVersionId: config.id,
      createdBy: actor.id,
      updatedBy: actor.id,
    };

    if (existing) {
      await db.update(reportCard).set({ ...data, status: 'draft' }).where(eq(reportCard.id, existing.id));
      await db.delete(reportCardItem).where(eq(reportCardItem.reportCardId, existing.id));
      await persistItems(existing.id, subjectResults, actor.id);
      updated++;
    } else {
      const [inserted] = await db.insert(reportCard).values(data).returning();
      await persistItems(inserted.id, subjectResults, actor.id);
      created++;
    }
  }

  // Audit: report card generation
  if (created > 0 || updated > 0) {
    const schoolId = slots[0]?.schoolId ?? null;
    await logPedagogyAudit({
      action: 'report_card_generated',
      entity: 'report_card',
      entityId: allResults[0]?.studentId ?? '',
      schoolId,
      newValue: JSON.stringify({ created, updated, classroomId, academicPeriodId, errors }),
      actorId: actor.isGhost ? undefined : actor.id,
      actorType: actor.isGhost ? 'ghost' : 'user',
      actorIdentifier: actor.isGhost ? 'fantomas' : actor.id,
      context: { classroomId, academicPeriodId, created, updated, errors },
    });
  }

  return { created, updated, errors };
}

/** Persist report_card_item + report_card_component_item rows */
async function persistItems(
  reportCardId: string,
  subjectResults: SubjectResult[],
  actorId: string,
): Promise<void> {
  for (let i = 0; i < subjectResults.length; i++) {
    const sr = subjectResults[i];
    const [item] = await db
      .insert(reportCardItem)
      .values({
        reportCardId,
        subjectId: sr.subjectId,
        subjectName: sr.subjectName,
        rawValue: sr.rawValue,
        officialValue: sr.officialValue,
        coefficient: sr.coefficient,
        weightedPoints: sr.weightedPoints,
        includeInAverage: sr.includeInAverage,
        isIncomplete: sr.isIncomplete,
        sortOrder: i,
      })
      .returning();

    if (sr.componentDetails && sr.componentDetails.length > 0) {
      for (let j = 0; j < sr.componentDetails.length; j++) {
        const comp = sr.componentDetails[j];
        await db.insert(reportCardComponentItem).values({
          reportCardItemId: item.id,
          componentName: comp.componentName,
          rawValue: comp.result,
          coefficient: null,
          sortOrder: j,
        });
      }
    }
  }
}

// ─────────────────────────────────────────────
// 2. COMPUTE STUDENT RESULTS (full pipeline)
// ─────────────────────────────────────────────

async function computeStudentResults(
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
      // ── Component-based subject ──
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
      // ── Direct assessment subject (no components) ──
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
// 3. GET REPORT CARD
// ─────────────────────────────────────────────

export type ReportCardWithItems = ReportCard & {
  items: (ReportCardItem & { components?: ReportCardComponentItem[] })[];
};

export async function getReportCard(id: string): Promise<ReportCardWithItems> {
  const [card] = await db.select().from(reportCard).where(eq(reportCard.id, id)).limit(1);
  if (!card) throw new ReportCardNotFoundError(id);

  const items = await db
    .select().from(reportCardItem)
    .where(eq(reportCardItem.reportCardId, id))
    .orderBy(reportCardItem.sortOrder);

  const itemsWithComponents = await Promise.all(
    items.map(async (item) => {
      const components = await db
        .select().from(reportCardComponentItem)
        .where(eq(reportCardComponentItem.reportCardItemId, item.id))
        .orderBy(reportCardComponentItem.sortOrder);
      return { ...item, components: components.length > 0 ? components : undefined };
    }),
  );

  return { ...card, items: itemsWithComponents };
}

export async function getReportCardByStudentPeriod(
  studentId: string,
  academicPeriodId: string,
): Promise<ReportCardWithItems | null> {
  const [card] = await db
    .select().from(reportCard)
    .where(and(eq(reportCard.studentId, studentId), eq(reportCard.academicPeriodId, academicPeriodId)))
    .limit(1);
  if (!card) return null;
  return getReportCard(card.id);
}

/**
 * List report cards for a classroom + academic period.
 * Joins student for name resolution.
 */
export async function listReportCards(
  classroomId: string,
  academicPeriodId: string,
): Promise<Array<ReportCard & { studentName: string }>> {
  // Resolve enrollment IDs for this classroom
  const assignments = await db
    .select({ enrollmentId: classroomAssignment.enrollmentId })
    .from(classroomAssignment)
    .where(and(eq(classroomAssignment.classroomId, classroomId), eq(classroomAssignment.status, 'active')));

  const enrIds = assignments.map(a => a.enrollmentId);
  if (enrIds.length === 0) return [];

  // Get all report cards for these enrollments + period
  const allCards: Array<ReportCard & { studentName: string }> = [];
  for (const enrId of enrIds) {
    const batch = await db
      .select()
      .from(reportCard)
      .where(and(eq(reportCard.academicPeriodId, academicPeriodId), eq(reportCard.enrollmentId, enrId)));

    for (const card of batch) {
      const [stu] = await db
        .select({ firstName: student.firstName, lastName: student.lastName })
        .from(student)
        .where(eq(student.id, card.studentId))
        .limit(1);
      const studentName = stu ? `${stu.lastName} ${stu.firstName}` : 'Inconnu';
      allCards.push({ ...card, studentName });
    }
  }

  return allCards;
}

// ─────────────────────────────────────────────
// 4. LIFECYCLE TRANSITIONS
// ─────────────────────────────────────────────

export async function transitionReportCard(
  id: string,
  newStatus: 'ready' | 'validated' | 'published' | 'draft',
  actor: { id: string; isGhost: boolean },
): Promise<ReportCard> {
  const [existing] = await db.select().from(reportCard).where(eq(reportCard.id, id)).limit(1);
  if (!existing) throw new ReportCardNotFoundError(id);
  validateTransition(existing.status, newStatus);

  const updateData: Record<string, unknown> = { status: newStatus, updatedBy: actor.id };
  if (newStatus === 'published') {
    updateData.publishedAt = new Date();
    updateData.publishedBy = actor.id;
  }

  const [updated] = await db.update(reportCard).set(updateData).where(eq(reportCard.id, id)).returning();

  // Audit
  await logPedagogyAudit({
    action: `report_card_transition_${existing.status}_to_${newStatus}`,
    entity: 'report_card',
    entityId: id,
    schoolId: null,
    oldValue: JSON.stringify({ status: existing.status }),
    newValue: JSON.stringify({ status: newStatus }),
    actorId: actor.isGhost ? undefined : actor.id,
    actorType: actor.isGhost ? 'ghost' : 'user',
    actorIdentifier: actor.isGhost ? 'fantomas' : actor.id,
    context: { transition: `${existing.status}→${newStatus}`, publishedAt: updateData.publishedAt ?? null },
  });

  return updated;
}

/**
 * Bulk transition all eligible report cards for a classroom + period.
 */
export async function bulkTransitionReportCards(
  academicPeriodId: string,
  classroomId: string,
  newStatus: 'ready' | 'validated' | 'published',
  actor: { id: string; isGhost: boolean },
): Promise<{ transitioned: number; skipped: number }> {
  // Resolve enrollment IDs for this classroom
  const assignments = await db
    .select({ enrollmentId: classroomAssignment.enrollmentId })
    .from(classroomAssignment)
    .where(and(eq(classroomAssignment.classroomId, classroomId), eq(classroomAssignment.status, 'active')));

  const enrIds = assignments.map(a => a.enrollmentId);
  if (enrIds.length === 0) return { transitioned: 0, skipped: 0 };

  // Get report cards for these enrollments + period
  // Query all cards where enrollmentId IN (...) — use loop for neon compatibility
  const allCards = [];
  for (const enrId of enrIds) {
    const batch = await db
      .select({ id: reportCard.id, status: reportCard.status })
      .from(reportCard)
      .where(and(eq(reportCard.academicPeriodId, academicPeriodId), eq(reportCard.enrollmentId, enrId)));
    allCards.push(...batch);
  }

  let transitioned = 0;
  let skipped = 0;

  for (const card of allCards) {
    try {
      validateTransition(card.status, newStatus);
      const updateData: Record<string, unknown> = { status: newStatus, updatedBy: actor.id };
      if (newStatus === 'published') {
        updateData.publishedAt = new Date();
        updateData.publishedBy = actor.id;
      }
      await db.update(reportCard).set(updateData).where(eq(reportCard.id, card.id));

      // Audit (best-effort)
      await logPedagogyAudit({
        action: `report_card_bulk_transition_${card.status}_to_${newStatus}`,
        entity: 'report_card',
        entityId: card.id,
        schoolId: null,
        oldValue: JSON.stringify({ status: card.status }),
        newValue: JSON.stringify({ status: newStatus }),
        actorId: actor.isGhost ? undefined : actor.id,
        actorType: actor.isGhost ? 'ghost' : 'user',
        actorIdentifier: actor.isGhost ? 'fantomas' : actor.id,
        context: { bulk: true, classroomId, academicPeriodId },
      });

      transitioned++;
    } catch {
      skipped++;
    }
  }

  return { transitioned, skipped };
}

// ─────────────────────────────────────────────
// 5. UPDATE COMMENTS (non-published only)
// ─────────────────────────────────────────────

export async function updateReportCardComments(
  id: string,
  comments: { teacherComment?: string | null; directorComment?: string | null; conductComment?: string | null },
  actor: { id: string; isGhost: boolean },
): Promise<ReportCard> {
  const [existing] = await db
    .select({ id: reportCard.id, status: reportCard.status })
    .from(reportCard)
    .where(eq(reportCard.id, id))
    .limit(1);

  if (!existing) throw new ReportCardNotFoundError(id);
  if (existing.status === 'published') throw new ReportCardImmutableError(existing.status);

  const [updated] = await db
    .update(reportCard)
    .set(comments)
    .where(eq(reportCard.id, id))
    .returning();

  // Audit
  await logPedagogyAudit({
    action: 'report_card_update_comments',
    entity: 'report_card',
    entityId: id,
    schoolId: null,
    newValue: JSON.stringify(comments),
    actorId: actor.isGhost ? undefined : actor.id,
    actorType: actor.isGhost ? 'ghost' : 'user',
    actorIdentifier: actor.isGhost ? 'fantomas' : actor.id,
  });

  return updated;
}
