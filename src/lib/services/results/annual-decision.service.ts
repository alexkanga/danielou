/**
 * WS-002-M4 — Annual Result Persistence & Final Decision Service
 *
 * Handles:
 * - Upserting annual result snapshots
 * - Recording final promotion decisions with full validation
 * - Audit trail for all decision mutations
 */

import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { annualResult, pedagogicalConfig, classroom, enrollment, classroomAssignment } from '@/lib/db/schema';
import { getAnnualClassResults } from './annual-data.service';
import { deriveRecommendation, validateDecision, type FinalDecisionValue } from './recommendation-engine';
import { logPedagogyAudit, sessionToAuditActor } from '@/lib/services/pedagogy/audit';
import { NotFoundError } from '@/lib/services/pedagogy/errors';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface RecordDecisionParams {
  enrollmentId: string;
  finalDecision: FinalDecisionValue;
  justification?: string | null;
  actor: { id: string; isGhost: boolean; platformRole: string };
  ipAddress?: string;
  schoolId: string;
}

export interface DecisionResult {
 id: string;
  enrollmentId: string;
  calculationStatus: string;
  annualOfficial: string | null;
  systemRecommendation: string | null;
  finalDecision: string;
  decisionJustification: string | null;
  decidedBy: string | null;
  decidedAt: Date | null;
}

// ─────────────────────────────────────────────
// Map DB enum values to engine values
// ─────────────────────────────────────────────

const CALC_STATUS_TO_ENGINE: Record<string, string> = {
  calculated: 'CALCULATED',
  incomplete: 'INCOMPLETE',
  decision_council: 'DECISION_COUNCIL',
};

const ENGINE_TO_DB_RECOMMENDATION: Record<string, string> = {
  PROPOSED_ADMITTED: 'proposed_admitted',
  PROPOSED_REPEAT: 'proposed_repeat',
  DECISION_COUNCIL: 'decision_council',
  INCOMPLETE: 'incomplete',
  THRESHOLD_NOT_CONFIGURED: 'threshold_not_configured',
};

const REQUESTED_TO_DB_DECISION: Record<string, string> = {
  ADMITTED: 'admitted',
  REPEAT: 'repeat',
  ADMITTED_BY_DEROGATION: 'admitted_by_derogation',
};

// ─────────────────────────────────────────────
// Record Final Decision
// ─────────────────────────────────────────────

/**
 * Record a final promotion decision for a student's annual enrollment.
 *
 * 1. Load/recompute authoritative annual result
 * 2. Resolve threshold/config
 * 3. Validate calculation status
 * 4. Validate recommendation
 * 5. Validate requested final decision
 * 6. Require justification when contract requires it
 * 7. Snapshot annual values
 * 8. Persist final decision
 * 9. Record actor + timestamp
 * 10. Write audit event
 * 11. Return typed result
 */
export async function recordFinalDecision(params: RecordDecisionParams): Promise<DecisionResult> {
  const { enrollmentId, finalDecision, justification, actor, ipAddress, schoolId } = params;

  // 1. Load enrollment with classroom via classroomAssignment
  const [assignment] = await db.select({
    enrollmentId: classroomAssignment.enrollmentId,
    classroomId: classroomAssignment.classroomId,
  }).from(classroomAssignment)
    .where(eq(classroomAssignment.enrollmentId, enrollmentId))
    .limit(1);

  if (!assignment) throw new NotFoundError('classroom_assignment', enrollmentId);

  const [enr] = await db.select({
    id: enrollment.id,
    studentId: enrollment.studentId,
    academicYearId: enrollment.academicYearId,
  }).from(enrollment)
    .where(eq(enrollment.id, enrollmentId))
    .limit(1);

  if (!enr) throw new NotFoundError('enrollment', enrollmentId);

  // 2. Load existing annual result or compute fresh
  let existingResult = await db.select().from(annualResult)
    .where(eq(annualResult.enrollmentId, enrollmentId))
    .limit(1);

  // If no persisted result, compute from scratch and snapshot
  if (existingResult.length === 0) {
    const classResults = await getAnnualClassResults({
      academicYearId: enr.academicYearId,
      classroomId: assignment.classroomId,
    });
    const studentRow = classResults.students.find(s => s.enrollmentId === enrollmentId);
    if (!studentRow) throw new NotFoundError('annual_result', enrollmentId);

    const { annual } = studentRow;
    const rank = studentRow.annualRank;

    // Derive recommendation
    const rec = deriveRecommendation(
      annual.status,
      annual.annualOfficial,
      classResults.promotionThreshold,
    );

    // Get config version
    // Get classroom levelId for config lookup
    const [cls] = await db.select({ levelId: classroom.levelId })
      .from(classroom)
      .where(eq(classroom.id, assignment.classroomId))
      .limit(1);

    const [config] = await db.select({ id: pedagogicalConfig.id })
      .from(pedagogicalConfig)
      .where(and(
        eq(pedagogicalConfig.levelId, cls.levelId),
        eq(pedagogicalConfig.academicYearId, enr.academicYearId),
        eq(pedagogicalConfig.status, 'active'),
      )).limit(1);

    const inserted = await db.insert(annualResult).values({
      enrollmentId,
      regularRaw: annual.regularRaw,
      passageRaw: annual.passageRaw,
      annualRaw: annual.annualRaw,
      annualOfficial: annual.annualOfficial,
      calculationStatus: annual.status.toLowerCase() as 'calculated' | 'incomplete' | 'decision_council',
      annualRank: rank?.rank ?? null,
      promotionThresholdSnapshot: classResults.promotionThreshold,
      systemRecommendation: ENGINE_TO_DB_RECOMMENDATION[rec] as 'proposed_admitted' | 'proposed_repeat' | 'decision_council' | 'incomplete' | 'threshold_not_configured' | null,
      configVersionId: config?.id ?? null,
    }).returning();

    existingResult = inserted;
  }

  const existing = existingResult[0];

  // 3. Validate recommendation state
  const engineRecommendation = (existing.systemRecommendation ?? 'THRESHOLD_NOT_CONFIGURED').toUpperCase().replace(/-/g, '_');

  const validation = validateDecision(
    engineRecommendation as 'PROPOSED_ADMITTED' | 'PROPOSED_REPEAT' | 'DECISION_COUNCIL' | 'INCOMPLETE' | 'THRESHOLD_NOT_CONFIGURED',
    finalDecision,
    justification,
  );

  if (!validation.allowed) {
    throw new Error(validation.reason ?? 'Décision non autorisée.');
  }

  // 4. Record previous decision for audit
  const previousDecision = existing.finalDecision;

  // 5. Persist final decision (snapshot — do NOT rewrite annualOfficial)
  const [updated] = await db.update(annualResult)
    .set({
      finalDecision: REQUESTED_TO_DB_DECISION[finalDecision] as 'admitted' | 'repeat' | 'admitted_by_derogation',
      decisionJustification: justification ?? null,
      decidedBy: actor.isGhost ? null : actor.id,
      decidedAt: new Date(),
    })
    .where(eq(annualResult.id, existing.id))
    .returning();

  // 6. Audit
  const auditActor = sessionToAuditActor(actor);
  void logPedagogyAudit({
    action: 'annual_final_decision_recorded',
    entity: 'annual_result',
    entityId: updated.id,
    schoolId,
    oldValue: previousDecision ? JSON.stringify({ previousDecision }) : undefined,
    newValue: JSON.stringify({
      finalDecision: updated.finalDecision,
      justification: updated.decisionJustification,
      annualOfficial: updated.annualOfficial,
    }),
    context: {
      enrollmentId,
      studentId: enr.studentId,
      academicYearId: enr.academicYearId,
      recommendation: existing.systemRecommendation,
    },
    ...auditActor,
    ipAddress,
  });

  return {
    id: updated.id,
    enrollmentId: updated.enrollmentId,
    calculationStatus: updated.calculationStatus,
    annualOfficial: updated.annualOfficial,
    systemRecommendation: updated.systemRecommendation,
    finalDecision: updated.finalDecision ?? '',
    decisionJustification: updated.decisionJustification,
    decidedBy: updated.decidedBy,
    decidedAt: (updated.decidedAt ?? null) as Date | null,
  };
}
