/**
 * WS-002-M4 — Annual Result Persistence & Final Decision Service
 *
 * Handles:
 * - Upserting annual result snapshots
 * - Recording final promotion decisions with full validation
 * - Audit trail for all decision mutations
 *
 * CRITICAL INVARIANTS:
 * - ALL validation occurs BEFORE any DB write.
 * - Decision persistence + audit are atomic (single transaction).
 * - Validation errors use PedagogyDomainError (422), never plain Error (500).
 * - annualOfficial and annualRank are NEVER modified by decision logic.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { getTxDb } from '@/lib/db/tx';
import { annualResult, pedagogicalConfig, classroom, enrollment, classroomAssignment, auditLog } from '@/lib/db/schema';
import { getAnnualClassResults } from './annual-data.service';
import { deriveRecommendation, validateDecision, type FinalDecisionValue } from './recommendation-engine';
import { sessionToAuditActor } from '@/lib/services/pedagogy/audit';
import { NotFoundError, PedagogyDomainError } from '@/lib/services/pedagogy/errors';

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
 * Execution order (validation-authoritative):
 * 1. Load enrollment + classroom (read-only)
 * 2. Load existing annual result or compute fresh values (read-only)
 * 3. VALIDATE: authorization, allowed decision, required justification
 * 4. TRANSACTION: snapshot creation + decision persist + audit
 * 5. Return typed result
 */
export async function recordFinalDecision(params: RecordDecisionParams): Promise<DecisionResult> {
  const { enrollmentId, finalDecision, justification, actor, ipAddress, schoolId } = params;

  // ─────────────────────────────────────────────
  // PHASE 1: READ-ONLY — Load all data needed
  // ─────────────────────────────────────────────

  // 1a. Load enrollment with classroom via classroomAssignment
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

  // 1b. Load existing annual result
  const existingResults = await db.select().from(annualResult)
    .where(eq(annualResult.enrollmentId, enrollmentId))
    .limit(1);

  // 1c. Prepare values for potential snapshot creation (no DB write)
  let snapshotData: {
    regularRaw: string | null;
    passageRaw: string | null;
    annualRaw: string | null;
    annualOfficial: string | null;
    calculationStatus: 'calculated' | 'incomplete' | 'decision_council';
    annualRank: number | null;
    promotionThresholdSnapshot: string | null;
    systemRecommendation: string | null;
    configVersionId: string | null;
  } | null = null;

  let engineRecommendation: string;
  let existingId: string | null = null;
  let previousDecision: string | null = null;

  if (existingResults.length > 0) {
    const existing = existingResults[0];
    existingId = existing.id;
    previousDecision = existing.finalDecision;
    engineRecommendation = (existing.systemRecommendation ?? 'THRESHOLD_NOT_CONFIGURED').toUpperCase().replace(/-/g, '_');
  } else {
    // Compute from scratch (read-only, no DB write yet)
    const classResults = await getAnnualClassResults({
      academicYearId: enr.academicYearId,
      classroomId: assignment.classroomId,
    });
    const studentRow = classResults.students.find(s => s.enrollmentId === enrollmentId);
    if (!studentRow) throw new NotFoundError('annual_result', enrollmentId);

    const { annual } = studentRow;
    const rank = studentRow.annualRank;

    // Derive recommendation
    const rec = deriveRecommendation(annual.status, annual.annualOfficial, classResults.promotionThreshold);
    engineRecommendation = rec;

    // Get config version ID
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

    // Store snapshot data for later transactional insert (no write yet)
    snapshotData = {
      regularRaw: annual.regularRaw,
      passageRaw: annual.passageRaw,
      annualRaw: annual.annualRaw,
      annualOfficial: annual.annualOfficial,
      calculationStatus: annual.status.toLowerCase() as 'calculated' | 'incomplete' | 'decision_council',
      annualRank: rank?.rank ?? null,
      promotionThresholdSnapshot: classResults.promotionThreshold,
      systemRecommendation: ENGINE_TO_DB_RECOMMENDATION[rec] ?? null,
      configVersionId: config?.id ?? null,
    };
  }

  // ─────────────────────────────────────────────
  // PHASE 2: VALIDATION — Before ANY write
  // ─────────────────────────────────────────────

  const validation = validateDecision(
    engineRecommendation as 'PROPOSED_ADMITTED' | 'PROPOSED_REPEAT' | 'DECISION_COUNCIL' | 'INCOMPLETE' | 'THRESHOLD_NOT_CONFIGURED',
    finalDecision,
    justification,
  );

  if (!validation.allowed) {
    throw new PedagogyDomainError(
      'DECISION_VALIDATION',
      validation.reason ?? 'Décision non autorisée.',
      422,
    );
  }

  // ─────────────────────────────────────────────
  // PHASE 3: TRANSACTIONAL WRITE — Atomic decision + audit
  // ─────────────────────────────────────────────

  const auditActor = sessionToAuditActor(actor);
  const dbDecision = REQUESTED_TO_DB_DECISION[finalDecision] as 'admitted' | 'repeat' | 'admitted_by_derogation';
  const decidedByValue = actor.isGhost ? null : actor.id;
  const decidedAtValue = new Date();

  // Use txDb (neon-serverless/Pool) for transactional writes.
  // The default db uses neon-http which does NOT support transactions.
  const txDb = getTxDb();

  const result = await txDb.transaction(async (tx) => {
    let resultId: string;

    if (existingId) {
      // UPDATE existing annual_result with decision fields only
      const [updated] = await tx.update(annualResult)
        .set({
          finalDecision: dbDecision,
          decisionJustification: justification ?? null,
          decidedBy: decidedByValue,
          decidedAt: decidedAtValue,
        })
        .where(eq(annualResult.id, existingId))
        .returning();
      resultId = updated.id;
    } else {
      // INSERT new annual_result with snapshot + decision in one operation
      const [inserted] = await tx.insert(annualResult).values({
        enrollmentId,
        regularRaw: snapshotData!.regularRaw,
        passageRaw: snapshotData!.passageRaw,
        annualRaw: snapshotData!.annualRaw,
        annualOfficial: snapshotData!.annualOfficial,
        calculationStatus: snapshotData!.calculationStatus,
        annualRank: snapshotData!.annualRank,
        promotionThresholdSnapshot: snapshotData!.promotionThresholdSnapshot,
        systemRecommendation: snapshotData!.systemRecommendation,
        configVersionId: snapshotData!.configVersionId,
        finalDecision: dbDecision,
        decisionJustification: justification ?? null,
        decidedBy: decidedByValue,
        decidedAt: decidedAtValue,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any).returning();
      resultId = inserted.id;
    }

    // Audit within same transaction — atomic with decision
    await tx.insert(auditLog).values({
      action: 'annual_final_decision_recorded',
      entity: 'annual_result',
      entityId: resultId,
      schoolId: schoolId && schoolId !== '' ? schoolId : null,
      oldValue: previousDecision ? JSON.stringify({ previousDecision }) : null,
      newValue: JSON.stringify({
        finalDecision: dbDecision,
        justification: justification ?? null,
      }),
      context: JSON.stringify({
        enrollmentId,
        studentId: enr.studentId,
        academicYearId: enr.academicYearId,
        recommendation: snapshotData?.systemRecommendation ?? existingResults[0]?.systemRecommendation,
      }),
      userId: auditActor.actorId ?? null,
      actorType: auditActor.actorType ?? null,
      actorIdentifier: auditActor.actorIdentifier ?? null,
      ipAddress: ipAddress ?? null,
    });

    // Read final state for return
    const [final] = await tx.select().from(annualResult).where(eq(annualResult.id, resultId));
    return final;
  });

  return {
    id: result.id,
    enrollmentId: result.enrollmentId,
    calculationStatus: result.calculationStatus,
    annualOfficial: result.annualOfficial,
    systemRecommendation: result.systemRecommendation,
    finalDecision: result.finalDecision ?? '',
    decisionJustification: result.decisionJustification,
    decidedBy: result.decidedBy,
    decidedAt: (result.decidedAt ?? null) as Date | null,
  };
}
