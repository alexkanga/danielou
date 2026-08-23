/**
 * M4 — Assessment Domain Service
 *
 * CRUD + lifecycle (draft → open → closed/cancelled) for assessments.
 */

import { eq, and, sql, desc, asc, like } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  assessment, grade, classroom, academicPeriod,
  enrollment, classroomAssignment, student, level, subject, assessmentType,
} from '@/lib/db/schema';
import type { Assessment as AssessmentRow } from '@/lib/db/schema';
import type { CreateAssessmentInput, UpdateAssessmentInput } from '@/lib/validations/pedagogy';
import { NotFoundError } from './errors';
import { logPedagogyAudit, sessionToAuditActor, buildChangeLog } from './audit';
import type { PaginatedResult } from '@/lib/data-access/pagination';

// ─────────────────────────────────────
// Error classes
// ─────────────────────────────────────

export class AssessmentLifecycleError extends Error {
  constructor(message: string) { super(message); this.name = 'AssessmentLifecycleError'; }
}
export class AssessmentImmutabilityError extends Error {
  constructor(message: string) { super(message); this.name = 'AssessmentImmutabilityError'; }
}
export class GradeEligibilityError extends Error {
  constructor(message: string) { super(message); this.name = 'GradeEligibilityError'; }
}
// ─────────────────────────────────────
// Types
// ─────────────────────────────────────

export interface AssessmentListParams {
  schoolId: string; page: number; limit: number; search?: string;
  classroomId?: string; subjectId?: string; academicPeriodId?: string; status?: string;
}

export interface AssessmentWithDetails extends AssessmentRow {
  classroomName?: string | null;
  subjectName?: string | null;
  periodName?: string | null;
  typeName?: string | null; gradeCount: number;
}
// ─────────────────────────────────────
// List
// ─────────────────────────────────────

export async function listAssessments(params: AssessmentListParams): Promise<PaginatedResult<AssessmentWithDetails>> {
  const { schoolId, page, limit, search, classroomId, subjectId, academicPeriodId, status } = params;
  const conditions = [];
  if (search) conditions.push(like(assessment.title, `%${search}%`));
  if (classroomId) conditions.push(eq(assessment.classroomId, classroomId));
  if (subjectId) conditions.push(eq(assessment.subjectId, subjectId));
  if (academicPeriodId) conditions.push(eq(assessment.academicPeriodId, academicPeriodId));
  if (status) conditions.push(eq(assessment.status, status as AssessmentRow['status']));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const schoolClassrooms = await db.select({ id: classroom.id }).from(classroom)
    .innerJoin(level, eq(classroom.levelId, level.id)).where(eq(level.schoolId, schoolId));
  const classroomIds = schoolClassrooms.map(c => c.id);
  if (classroomIds.length === 0) return { data: [], pagination: { page, limit, totalItems: 0, totalPages: 0 } };

  const schoolClause = sql`${assessment.classroomId} = ANY(${classroomIds})`;
  const finalWhere = whereClause ? and(whereClause, schoolClause) : schoolClause;

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(assessment).where(finalWhere);

  const data = await db.select({
    assessment, classroomName: classroom.name, subjectName: subject.name,
    periodName: academicPeriod.name, typeName: assessmentType.name,
    gradeCount: sql<number>`(SELECT count(*) FROM grade WHERE grade.assessment_id = assessment.id)::int`,
  }).from(assessment)
    .leftJoin(classroom, eq(assessment.classroomId, classroom.id))
    .leftJoin(subject, eq(assessment.subjectId, subject.id))
    .leftJoin(academicPeriod, eq(assessment.academicPeriodId, academicPeriod.id))
    .leftJoin(assessmentType, eq(assessment.assessmentTypeId, assessmentType.id))
    .where(finalWhere).orderBy(desc(assessment.createdAt)).limit(limit).offset((page - 1) * limit);

  return {
    data: data.map(r => ({ ...r.assessment, classroomName: r.classroomName, subjectName: r.subjectName, periodName: r.periodName, typeName: r.typeName, gradeCount: r.gradeCount })),
    pagination: { page, limit, totalItems: count, totalPages: Math.max(1, Math.ceil(count / limit)) },
  };
}

// ─────────────────────────────────────
// Get with details
// ─────────────────────────────────────

export async function getAssessmentById(id: string): Promise<AssessmentWithDetails> {
  const [row] = await db.select({
    assessment, classroomName: classroom.name, subjectName: subject.name,
    periodName: academicPeriod.name, typeName: assessmentType.name,
    gradeCount: sql<number>`(SELECT count(*) FROM grade WHERE grade.assessment_id = assessment.id)::int`,
  }).from(assessment)
    .leftJoin(classroom, eq(assessment.classroomId, classroom.id))
    .leftJoin(subject, eq(assessment.subjectId, subject.id))
    .leftJoin(academicPeriod, eq(assessment.academicPeriodId, academicPeriod.id))
    .leftJoin(assessmentType, eq(assessment.assessmentTypeId, assessmentType.id))
    .where(eq(assessment.id, id)).limit(1);
  if (!row) throw new NotFoundError('assessment', id);
  return { ...row.assessment, classroomName: row.classroomName, subjectName: row.subjectName, periodName: row.periodName, typeName: row.typeName, gradeCount: row.gradeCount };
}
// ─────────────────────────────────────
// Create
// ─────────────────────────────────────

export async function createAssessment(
  schoolId: string, input: CreateAssessmentInput, actor: { id: string; isGhost: boolean; platformRole: string }, ipAddress?: string,
): Promise<AssessmentRow> {
  await verifyClassroomSchool(input.classroomId, schoolId);
  await verifyPeriodClassroomConsistency(input.classroomId, input.academicPeriodId);

  const [created] = await db.insert(assessment).values({
    classroomId: input.classroomId, subjectId: input.subjectId,
    academicPeriodId: input.academicPeriodId,
    assessmentTypeId: input.assessmentTypeId ?? null,
    configSubjectId: input.configSubjectId ?? null, configComponentId: input.configComponentId ?? null,
    title: input.title, scale: input.scale,
    coefficient: String(input.coefficient), date: input.date,
    description: input.description ?? null, status: 'draft',
    createdBy: actor.isGhost ? null : actor.id, updatedBy: actor.isGhost ? null : actor.id,
  }).returning();

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'assessment_created', entity: 'assessment', entityId: created.id, schoolId,
    newValue: JSON.stringify({ title: input.title, scale: input.scale, classroomId: input.classroomId }),
    ...auditActor, ipAddress,
  });
  return created;
}
// ─────────────────────────────────────
// Update (draft/open only)
// ─────────────────────────────────────

export async function updateAssessment(
  id: string, schoolId: string, input: UpdateAssessmentInput, actor: { id: string; isGhost: boolean; platformRole: string }, ipAddress?: string,
): Promise<AssessmentRow> {
  const existing = await getAssessmentById(id);
  await verifyAssessmentSchool(existing, schoolId);
  if (existing.status === 'closed' || existing.status === 'cancelled') {
    throw new AssessmentImmutabilityError(`Impossible de modifier une évaluation ${existing.status}`);
  }

  const updateData: Record<string, unknown> = { updatedBy: actor.isGhost ? null : actor.id };
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.date !== undefined) updateData.date = input.date;
  if (input.assessmentTypeId !== undefined) updateData.assessmentTypeId = input.assessmentTypeId;

  const [updated] = await db.update(assessment).set(updateData).where(eq(assessment.id, id)).returning();
  const { oldValue, newValue } = buildChangeLog(existing as unknown as Record<string, unknown>, updateData);
  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'assessment_updated', entity: 'assessment', entityId: id, schoolId, oldValue, newValue, ...auditActor, ipAddress,
  });
  return updated;
}
// ─────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────

async function lifecycleTransition(id: string, schoolId: string, newStatus: string, actor: { id: string; isGhost: boolean; platformRole: string }, ipAddress?: string): Promise<AssessmentRow> {
  const existing = await getAssessmentById(id);
  await verifyAssessmentSchool(existing, schoolId);
  const [updated] = await db.update(assessment).set({ status: newStatus as "draft" | "open" | "closed" | "cancelled", updatedBy: actor.isGhost ? null : actor.id }).where(eq(assessment.id, id)).returning();
  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({ action: `assessment_${newStatus}ed`, entity: 'assessment', entityId: id, schoolId, newValue: JSON.stringify({ status: newStatus }), ...auditActor, ipAddress });
  return updated;
}

export async function openAssessment(id: string, schoolId: string, actor: { id: string; isGhost: boolean; platformRole: string }, ipAddress?: string): Promise<AssessmentRow> {
  return lifecycleTransition(id, schoolId, 'open', actor, ipAddress);
}
export async function closeAssessment(id: string, schoolId: string, actor: { id: string; isGhost: boolean; platformRole: string }, ipAddress?: string): Promise<AssessmentRow> {
  return lifecycleTransition(id, schoolId, 'closed', actor, ipAddress);
}
export async function cancelAssessment(id: string, schoolId: string, actor: { id: string; isGhost: boolean; platformRole: string }, ipAddress?: string): Promise<AssessmentRow> {
  if ((await getAssessmentById(id)).status === 'closed' || ((await getAssessmentById(id)).status === 'cancelled')) {
    throw new AssessmentLifecycleError("Impossible d'annuler une évaluation fermée ou déjà annulée");
  }
  return lifecycleTransition(id, schoolId, 'cancelled', actor, ipAddress);
}
// ─────────────────────────────────────
// Eligible students
// ─────────────────────────────────────

export async function getEligibleStudents(assessmentId: string, schoolId: string) {
  const assess = await getAssessmentById(assessmentId);
  await verifyAssessmentSchool(assess, schoolId);

  const [cls] = await db.select({ id: classroom.id, levelId: classroom.levelId, academicYearId: classroom.academicYearId }).from(classroom)
    .where(eq(classroom.id, assess.classroomId)).limit(1);
  if (!cls) throw new NotFoundError('classroom', assess.classroomId);

  const students = await db.select({
    enrollmentId: enrollment.id, studentId: student.id, firstName: student.firstName,
    lastName: student.lastName, matricule: student.matricule,
    gradeId: grade.id, gradeRawValue: grade.rawValue, gradeStatus: grade.status, gradeComment: grade.comment,
  }).from(enrollment)
    .innerJoin(student, eq(enrollment.studentId, student.id))
    .innerJoin(classroomAssignment, eq(enrollment.id, classroomAssignment.enrollmentId))
    .leftJoin(grade, and(eq(grade.assessmentId, assessmentId), eq(grade.enrollmentId, enrollment.id)))
    .where(and(
      eq(classroomAssignment.classroomId, assess.classroomId),
      eq(enrollment.academicYearId, cls.academicYearId),
      eq(enrollment.status, 'active'), eq(classroomAssignment.status, 'active'),
    )).orderBy(asc(student.lastName), asc(student.firstName));

  return { assessment: assess, students };
}
// ─────────────────────────────────────
// Helpers
// ─────────────────────────────────────

/**
 * Returns the classroomId, subjectId, academicYearId for teacher scope checks.
 * Used by route handlers before delegating to service mutations.
 */
export async function getAssessmentScope(assessmentId: string): Promise<{ classroomId: string; subjectId: string; academicYearId: string }> {
  const [row] = await db.select({
    classroomId: assessment.classroomId,
    subjectId: assessment.subjectId,
    academicYearId: classroom.academicYearId,
  }).from(assessment)
    .innerJoin(classroom, eq(assessment.classroomId, classroom.id))
    .where(eq(assessment.id, assessmentId)).limit(1);
  if (!row) throw new NotFoundError('assessment', assessmentId);
  return row;
}

/**
 * Returns academicYearId for a classroom (for CREATE assessment teacher scope).
 */
export async function getClassroomYear(classroomId: string): Promise<string> {
  const [cls] = await db.select({ academicYearId: classroom.academicYearId }).from(classroom)
    .where(eq(classroom.id, classroomId)).limit(1);
  if (!cls) throw new NotFoundError('classroom', classroomId);
  return cls.academicYearId;
}

async function verifyClassroomSchool(classroomId: string, schoolId: string): Promise<void> {
  const [cls] = await db.select({ id: classroom.id }).from(classroom)
    .innerJoin(level, eq(classroom.levelId, level.id)).where(and(eq(classroom.id, classroomId), eq(level.schoolId, schoolId))).limit(1);
  if (!cls) throw new NotFoundError('classroom', classroomId);
}

async function verifyAssessmentSchool(assess: AssessmentWithDetails, schoolId: string): Promise<void> {
  await verifyClassroomSchool(assess.classroomId, schoolId);
}

async function verifyPeriodClassroomConsistency(classroomId: string, periodId: string): Promise<void> {
  const [cls] = await db.select({ academicYearId: classroom.academicYearId }).from(classroom)
    .where(eq(classroom.id, classroomId)).limit(1);
  if (!cls) throw new NotFoundError('classroom', classroomId);
  const [period] = await db.select({ academicYearId: academicPeriod.academicYearId }).from(academicPeriod)
    .where(eq(academicPeriod.id, periodId)).limit(1);
  if (!period) throw new NotFoundError('academic_period', periodId);
  if (cls.academicYearId !== period.academicYearId) {
    throw new AssessmentLifecycleError('La période et la classe doivent appartenir à la même année scolaire');
  }
}
