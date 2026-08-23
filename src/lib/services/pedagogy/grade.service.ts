/**
 * M4 — Grade Domain Service
 *
 * Grade CRUD + bulk operations with full status semantics.
 * INV-M4-01: One grade per assessment+enrollment
 * INV-M4-02: raw_value >= 0 (DB enforced)
 * INV-M4-03: graded requires non-null raw_value
 * INV-M4-04: raw_value <= assessment.scale
 * INV-M4-05: Non-grade statuses must NOT have numeric values (ABSENCE ≠ ZERO)
 * INV-M4-07: Cross-school grade creation impossible
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { grade, assessment, enrollment, classroom, level, student, classroomAssignment } from '@/lib/db/schema';
import type { Grade as GradeRow } from '@/lib/db/schema';
import type { SetGradeInput, BulkSetGradesInput } from '@/lib/validations/pedagogy';
import { NotFoundError } from './errors';
import { AssessmentLifecycleError, GradeEligibilityError } from './assessment.service';
import { logPedagogyAudit, sessionToAuditActor, buildChangeLog } from './audit';

// ─────────────────────────────────────────────
// Set / Upsert a single grade
// ─────────────────────────────────────────────

export async function setGrade(
  assessmentId: string,
  schoolId: string,
  input: SetGradeInput,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<GradeRow> {
  const [assess] = await db
    .select()
    .from(assessment)
    .where(eq(assessment.id, assessmentId))
    .limit(1);
  if (!assess) throw new NotFoundError('assessment', assessmentId);

  await verifyAssessmentSchool(assess.id, schoolId);

  if (assess.status !== 'open') {
    throw new AssessmentLifecycleError('Les notes ne peuvent être saisies que sur une évaluation ouverte');
  }

  await verifyGradeEligibility(input.enrollmentId, assess, schoolId);

  if (input.status === 'graded' && input.rawValue != null) {
    if (input.rawValue > assess.scale) {
      throw new GradeEligibilityError(`La note (${input.rawValue}) dépasse l'échelle de l'évaluation (${assess.scale})`);
    }
  }

  const gradeValues: Record<string, unknown> = {
    assessmentId,
    enrollmentId: input.enrollmentId,
    rawValue: (input.status === 'graded' && input.rawValue != null) ? String(input.rawValue) : null,
    status: input.status,
    comment: input.comment ?? null,
    updatedBy: actor.isGhost ? null : actor.id,
  };

  // Verify enrollment exists
  const [enr] = await db
    .select({ id: enrollment.id })
    .from(enrollment)
    .where(eq(enrollment.id, input.enrollmentId))
    .limit(1);
  if (!enr) throw new NotFoundError('enrollment', input.enrollmentId);

  const [existing] = await db
    .select()
    .from(grade)
    .where(and(eq(grade.assessmentId, assessmentId), eq(grade.enrollmentId, input.enrollmentId)))
    .limit(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any;
  if (existing) {
    [result] = await db.update(grade).set(gradeValues).where(eq(grade.id, existing.id)).returning();
  } else {
    gradeValues.createdBy = actor.isGhost ? null : actor.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [result] = await db.insert(grade).values(gradeValues as any).returning();
  }

  const auditActor = sessionToAuditActor(actor);
  const { oldValue, newValue } = buildChangeLog(
    existing ? { ...existing } as unknown as Record<string, unknown> : null,
    { enrollmentId: input.enrollmentId, rawValue: gradeValues.rawValue, status: input.status },
  );
  await logPedagogyAudit({
    action: existing ? 'grade_updated' : 'grade_created',
    entity: 'grade', entityId: result.id, schoolId, oldValue, newValue, ...auditActor, ipAddress,
  });

  return result;
}

// ─────────────────────────────────────────────
// Bulk set grades
// ─────────────────────────────────────────────

export async function bulkSetGrades(
  assessmentId: string,
  schoolId: string,
  input: BulkSetGradesInput,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<{ created: number; updated: number; errors: Array<{ enrollmentId: string; error: string }> }> {
  const [assess] = await db
    .select()
    .from(assessment)
    .where(eq(assessment.id, assessmentId))
    .limit(1);
  if (!assess) throw new NotFoundError('assessment', assessmentId);
  await verifyAssessmentSchool(assess.id, schoolId);
  if (assess.status !== 'open') {
    throw new AssessmentLifecycleError('Les notes ne peuvent être saisies que sur une évaluation ouverte');
  }

  let created = 0;
  let updated = 0;
  const errors: Array<{ enrollmentId: string; error: string }> = [];

  for (const g of input.grades) {
    try {
      const wasExisting = await db
        .select({ id: grade.id })
        .from(grade)
        .where(and(eq(grade.assessmentId, assessmentId), eq(grade.enrollmentId, g.enrollmentId)))
        .limit(1);
      await setGrade(assessmentId, schoolId, g, actor, ipAddress);
      if (wasExisting.length > 0) { updated++; } else { created++; }
    } catch (err) {
      errors.push({
        enrollmentId: g.enrollmentId,
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    }
  }

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'grades_bulk_set', entity: 'grade', entityId: assessmentId, schoolId,
    newValue: JSON.stringify({ total: input.grades.length, created, updated, errors: errors.length }),
    ...auditActor, ipAddress,
  });

  return { created, updated, errors };
}

// ─────────────────────────────────────────────
// List grades for an assessment
// ─────────────────────────────────────────────

export async function listGradesByAssessment(assessmentId: string) {
  const rows = await db
    .select({
      grade,
      studentFirstName: student.firstName,
      studentLastName: student.lastName,
      studentMatricule: student.matricule,
      enrollmentId: enrollment.id,
    })
    .from(grade)
    .innerJoin(enrollment, eq(grade.enrollmentId, enrollment.id))
    .innerJoin(student, eq(enrollment.studentId, student.id))
    .where(eq(grade.assessmentId, assessmentId))
    .orderBy(sql`${student.lastName} ASC, ${student.firstName} ASC`);

  return rows.map(r => ({
    ...r.grade,
    studentFirstName: r.studentFirstName,
    studentLastName: r.studentLastName,
    studentMatricule: r.studentMatricule,
    enrollmentId: r.enrollmentId,
  }));
}

// ─────────────────────────────────────────────
// Verify grade eligibility
// ─────────────────────────────────────────────

async function verifyGradeEligibility(
  enrollmentId: string,
  assess: { classroomId: string },
  schoolId: string,
): Promise<void> {
  const [enr] = await db
    .select({ id: enrollment.id, studentId: enrollment.studentId, academicYearId: enrollment.academicYearId, status: enrollment.status })
    .from(enrollment)
    .where(eq(enrollment.id, enrollmentId))
    .limit(1);
  if (!enr) throw new NotFoundError('enrollment', enrollmentId);
  if (enr.status !== 'active') throw new GradeEligibilityError('L\'inscription doit être active');

  const [cls] = await db
    .select({ id: classroom.id, levelId: classroom.levelId, academicYearId: classroom.academicYearId })
    .from(classroom)
    .where(eq(classroom.id, assess.classroomId))
    .limit(1);
  if (!cls) throw new NotFoundError('classroom', assess.classroomId);

  if (enr.academicYearId !== cls.academicYearId) {
    throw new GradeEligibilityError('L\'inscription n\'appartient pas à la même année scolaire que la classe');
  }

  const [assignment] = await db
    .select({ id: classroomAssignment.id })
    .from(classroomAssignment)
    .where(
      and(
        eq(classroomAssignment.enrollmentId, enrollmentId),
        eq(classroomAssignment.classroomId, assess.classroomId),
        eq(classroomAssignment.status, 'active'),
      ),
    )
    .limit(1);
  if (!assignment) {
    throw new GradeEligibilityError('L\'élève n\'est pas affecté à cette classe');
  }

  const [lvl] = await db
    .select({ schoolId: level.schoolId })
    .from(level)
    .where(eq(level.id, cls.levelId))
    .limit(1);
  if (!lvl || lvl.schoolId !== schoolId) {
    throw new GradeEligibilityError('Contrôle de périmètre école échoué');
  }
}

async function verifyAssessmentSchool(assessmentId: string, schoolId: string): Promise<void> {
  const [assess] = await db
    .select({ classroomId: assessment.classroomId })
    .from(assessment)
    .where(eq(assessment.id, assessmentId))
    .limit(1);
  if (!assess) throw new NotFoundError('assessment', assessmentId);

  const [cls] = await db
    .select({ id: classroom.id, levelId: classroom.levelId })
    .from(classroom)
    .where(eq(classroom.id, assess.classroomId))
    .limit(1);
  if (!cls) throw new NotFoundError('classroom', assess.classroomId);

  const [lvl] = await db
    .select({ schoolId: level.schoolId })
    .from(level)
    .where(eq(level.id, cls.levelId))
    .limit(1);
  if (!lvl || lvl.schoolId !== schoolId) {
    throw new NotFoundError('assessment', assessmentId);
  }
}
