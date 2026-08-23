/**
 * Phase F — Subject Domain Service
 *
 * Catalogue CRUD with INV-M3-14 protection (cannot delete if config_subject refs exist).
 * All mutations produce audit entries (INV-M3-24).
 */

import { eq, like, sql, asc, and, or as drizzleOr } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  subject,
  configSubject,
  subjectComponent,
} from '@/lib/db/schema';
import type { Subject } from '@/lib/db/schema';
import type { CreateSubjectInput, UpdateSubjectInput } from '@/lib/validations/pedagogy';
import { NotFoundError, DuplicateError, CatalogReferencedError } from './errors';
import { logPedagogyAudit, sessionToAuditActor, buildChangeLog } from './audit';
import type { PaginatedResult } from '@/lib/data-access/pagination';

// ─────────────────────────────────────────────
// List
// ─────────────────────────────────────────────

export type SubjectListItem = Subject & {
  componentCount: number;
};

type SubjectListResult = PaginatedResult<SubjectListItem>;

export async function listSubjects(params: {
  schoolId: string;
  page: number;
  limit: number;
  search?: string;
}): Promise<SubjectListResult> {
  const { schoolId, page, limit, search } = params;

  const searchCondition = search
    ? drizzleOr(
        like(subject.name, `%${search}%`),
        like(subject.code, `%${search}%`),
      )
    : undefined;

  const whereClause = and(eq(subject.schoolId, schoolId), searchCondition);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subject)
    .where(whereClause);

  const data = await db
    .select({
      id: subject.id,
      schoolId: subject.schoolId,
      code: subject.code,
      name: subject.name,
      sortOrder: subject.sortOrder,
      coefficient: subject.coefficient,
      defaultScale: subject.defaultScale,
      isActive: subject.isActive,
      isOptional: subject.isOptional,
      includeInAverage: subject.includeInAverage,
      includeInRanking: subject.includeInRanking,
      includeInDecision: subject.includeInDecision,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
      componentCount: sql<number>`(
        SELECT count(*)::int FROM subject_component sc
        WHERE sc.subject_id = subject.id
      )`,
    })
    .from(subject)
    .where(whereClause)
    .orderBy(asc(subject.sortOrder), asc(subject.name))
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    data: data as SubjectListItem[],
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

export async function getSubjectById(id: string): Promise<Subject> {
  const [row] = await db.select().from(subject).where(eq(subject.id, id)).limit(1);
  if (!row) throw new NotFoundError('subject', id);
  return row;
}

// ─────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────

export async function createSubject(
  schoolId: string,
  input: CreateSubjectInput,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<Subject> {
  // Check duplicate code within school
  const [dup] = await db
    .select({ id: subject.id })
    .from(subject)
    .where(and(eq(subject.schoolId, schoolId), eq(subject.code, input.code)))
    .limit(1);

  if (dup) throw new DuplicateError('subject', 'code');

  const [created] = await db
    .insert(subject)
    .values({
      schoolId,
      code: input.code,
      name: input.name,
      sortOrder: input.sortOrder,
      coefficient: String(input.coefficient),
      defaultScale: input.defaultScale,
      isOptional: input.isOptional,
      includeInAverage: input.includeInAverage,
      includeInRanking: input.includeInRanking,
      includeInDecision: input.includeInDecision,
    })
    .returning();

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'subject_created',
    entity: 'subject',
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

export async function updateSubject(
  id: string,
  schoolId: string,
  input: UpdateSubjectInput,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<Subject> {
  const existing = await getSubjectById(id);

  // Verify tenant ownership
  if (existing.schoolId !== schoolId) {
    throw new NotFoundError('subject', id);
  }

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
  if (input.coefficient !== undefined) updateData.coefficient = String(input.coefficient);
  if (input.defaultScale !== undefined) updateData.defaultScale = input.defaultScale;
  if (input.isOptional !== undefined) updateData.isOptional = input.isOptional;
  if (input.includeInAverage !== undefined) updateData.includeInAverage = input.includeInAverage;
  if (input.includeInRanking !== undefined) updateData.includeInRanking = input.includeInRanking;
  if (input.includeInDecision !== undefined) updateData.includeInDecision = input.includeInDecision;

  const [updated] = await db
    .update(subject)
    .set(updateData)
    .where(eq(subject.id, id))
    .returning();

  const { oldValue, newValue } = buildChangeLog(
    existing as unknown as Record<string, unknown>,
    updateData,
  );

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'subject_updated',
    entity: 'subject',
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
// Delete (with INV-M3-14 protection)
// ─────────────────────────────────────────────

/**
 * INV-M3-14: Cannot delete a subject if any config_subject references it.
 * This preserves historical config interpretability.
 */
export async function deleteSubject(
  id: string,
  schoolId: string,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<void> {
  const existing = await getSubjectById(id);
  if (existing.schoolId !== schoolId) {
    throw new NotFoundError('subject', id);
  }

  // INV-M3-14: Check config_subject references
  const [{ refCount }] = await db
    .select({ refCount: sql<number>`count(*)::int` })
    .from(configSubject)
    .where(eq(configSubject.subjectId, id));

  if (refCount > 0) {
    throw new CatalogReferencedError('subject', 'config_subject', refCount);
  }

  // Delete subject_components first (CASCADE is set on FK)
  await db.delete(subjectComponent).where(eq(subjectComponent.subjectId, id));
  await db.delete(subject).where(eq(subject.id, id));

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'subject_deleted',
    entity: 'subject',
    entityId: id,
    schoolId,
    oldValue: JSON.stringify(existing),
    ...auditActor,
    ipAddress,
  });
}

// ─────────────────────────────────────────────
// List all subjects (no pagination — for selects)
// ─────────────────────────────────────────────

export async function listAllSubjects(schoolId: string): Promise<Subject[]> {
  return db
    .select()
    .from(subject)
    .where(eq(subject.schoolId, schoolId))
    .orderBy(asc(subject.sortOrder), asc(subject.name));
}
