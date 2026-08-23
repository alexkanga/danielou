/**
 * Phase F — AssessmentType Domain Service
 *
 * Catalogue CRUD with audit entries (INV-M3-24).
 * AssessmentType has no FK from configuration tables, so no INV-M3-14 check needed.
 */

import { eq, like, asc, and, or as drizzleOr, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { assessmentType } from '@/lib/db/schema';
import type { AssessmentType as AssessmentTypeRow } from '@/lib/db/schema';
import type { CreateAssessmentTypeInput, UpdateAssessmentTypeInput } from '@/lib/validations/pedagogy';
import { NotFoundError, DuplicateError } from './errors';
import { logPedagogyAudit, sessionToAuditActor, buildChangeLog } from './audit';
import type { PaginatedResult } from '@/lib/data-access/pagination';

// ─────────────────────────────────────────────
// List
// ─────────────────────────────────────────────

export async function listAssessmentTypes(params: {
  schoolId: string;
  page: number;
  limit: number;
  search?: string;
}): Promise<PaginatedResult<AssessmentTypeRow>> {
  const { schoolId, page, limit, search } = params;

  const searchCondition = search
    ? drizzleOr(like(assessmentType.name, `%${search}%`))
    : undefined;

  const whereClause = and(eq(assessmentType.schoolId, schoolId), searchCondition);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assessmentType)
    .where(whereClause);

  const data = await db
    .select()
    .from(assessmentType)
    .where(whereClause)
    .orderBy(asc(assessmentType.name))
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    data,
    pagination: {
      page,
      limit,
      totalItems: count,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    },
  };
}

// ─────────────────────────────────────────────
// Get by ID
// ─────────────────────────────────────────────

export async function getAssessmentTypeById(id: string): Promise<AssessmentTypeRow> {
  const [row] = await db
    .select()
    .from(assessmentType)
    .where(eq(assessmentType.id, id))
    .limit(1);
  if (!row) throw new NotFoundError('assessment_type', id);
  return row;
}

// ─────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────

export async function createAssessmentType(
  schoolId: string,
  input: CreateAssessmentTypeInput,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<AssessmentTypeRow> {
  // Check duplicate name within school
  const [dup] = await db
    .select({ id: assessmentType.id })
    .from(assessmentType)
    .where(and(eq(assessmentType.schoolId, schoolId), eq(assessmentType.name, input.name)))
    .limit(1);
  if (dup) throw new DuplicateError('assessment_type', 'name (school)');

  const [created] = await db
    .insert(assessmentType)
    .values({
      schoolId,
      name: input.name,
      description: input.description ?? null,
      defaultCoefficient: input.defaultCoefficient !== null && input.defaultCoefficient !== undefined
        ? String(input.defaultCoefficient)
        : null,
      defaultScale: input.defaultScale ?? null,
      isActive: input.isActive,
    })
    .returning();

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'assessment_type_created',
    entity: 'assessment_type',
    entityId: created.id,
    schoolId,
    newValue: JSON.stringify(input),
    ...auditActor,
    ipAddress,
  });

  return created;
}

// ─────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────

export async function updateAssessmentType(
  id: string,
  schoolId: string,
  input: UpdateAssessmentTypeInput,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<AssessmentTypeRow> {
  const existing = await getAssessmentTypeById(id);
  if (existing.schoolId !== schoolId) {
    throw new NotFoundError('assessment_type', id);
  }

  const updateData: Record<string, unknown> = {};
  if (input.description !== undefined) updateData.description = input.description;
  if (input.defaultCoefficient !== undefined) {
    updateData.defaultCoefficient = input.defaultCoefficient !== null
      ? String(input.defaultCoefficient)
      : null;
  }
  if (input.defaultScale !== undefined) {
    updateData.defaultScale = input.defaultScale;
  }
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  const [updated] = await db
    .update(assessmentType)
    .set(updateData)
    .where(eq(assessmentType.id, id))
    .returning();

  const { oldValue, newValue } = buildChangeLog(
    existing as unknown as Record<string, unknown>,
    updateData,
  );

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'assessment_type_updated',
    entity: 'assessment_type',
    entityId: id,
    schoolId,
    oldValue,
    newValue,
    ...auditActor,
    ipAddress,
  });

  return updated;
}

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────

export async function deleteAssessmentType(
  id: string,
  schoolId: string,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<void> {
  const existing = await getAssessmentTypeById(id);
  if (existing.schoolId !== schoolId) {
    throw new NotFoundError('assessment_type', id);
  }

  await db.delete(assessmentType).where(eq(assessmentType.id, id));

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'assessment_type_deleted',
    entity: 'assessment_type',
    entityId: id,
    schoolId,
    oldValue: JSON.stringify(existing),
    ...auditActor,
    ipAddress,
  });
}

// ─────────────────────────────────────────────
// List all (for selects)
// ─────────────────────────────────────────────

export async function listAllAssessmentTypes(schoolId: string): Promise<AssessmentTypeRow[]> {
  return db
    .select()
    .from(assessmentType)
    .where(eq(assessmentType.schoolId, schoolId))
    .orderBy(asc(assessmentType.name));
}
