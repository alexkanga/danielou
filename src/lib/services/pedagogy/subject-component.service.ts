/**
 * Phase F — SubjectComponent Domain Service
 *
 * Catalogue CRUD with INV-M3-14 protection (cannot delete if config_component refs exist).
 * All mutations produce audit entries (INV-M3-24).
 */

import { eq, asc, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  subjectComponent,
  subject,
  configComponent,
} from '@/lib/db/schema';
import type { SubjectComponent } from '@/lib/db/schema';
import type { CreateSubjectComponentInput, UpdateSubjectComponentInput } from '@/lib/validations/pedagogy';
import { NotFoundError, DuplicateError, CatalogReferencedError } from './errors';
import { logPedagogyAudit, sessionToAuditActor, buildChangeLog } from './audit';

// ─────────────────────────────────────────────
// List by subject
// ─────────────────────────────────────────────

export async function listComponentsBySubject(subjectId: string): Promise<SubjectComponent[]> {
  // Verify subject exists
  const [subj] = await db.select({ id: subject.id }).from(subject).where(eq(subject.id, subjectId)).limit(1);
  if (!subj) throw new NotFoundError('subject', subjectId);

  return db
    .select()
    .from(subjectComponent)
    .where(eq(subjectComponent.subjectId, subjectId))
    .orderBy(asc(subjectComponent.sortOrder), asc(subjectComponent.name));
}

// ─────────────────────────────────────────────
// Get by ID
// ─────────────────────────────────────────────

export async function getComponentById(id: string): Promise<SubjectComponent & { subjectId: string }> {
  const [row] = await db
    .select()
    .from(subjectComponent)
    .where(eq(subjectComponent.id, id))
    .limit(1);
  if (!row) throw new NotFoundError('subject_component', id);
  return row;
}

// ─────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────

export async function createComponent(
  schoolId: string,
  input: CreateSubjectComponentInput,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<SubjectComponent> {
  // Verify subject exists and belongs to school
  const [subj] = await db
    .select({ id: subject.id, schoolId: subject.schoolId })
    .from(subject)
    .where(eq(subject.id, input.subjectId))
    .limit(1);
  if (!subj) throw new NotFoundError('subject', input.subjectId);
  if (subj.schoolId !== schoolId) throw new NotFoundError('subject', input.subjectId);

  // Check duplicate name within subject
  const [dup] = await db
    .select({ id: subjectComponent.id })
    .from(subjectComponent)
    .where(and(eq(subjectComponent.subjectId, input.subjectId), eq(subjectComponent.name, input.name)))
    .limit(1);
  if (dup) throw new DuplicateError('subject_component', 'name (subject)');

  // Check duplicate code within subject (only if code is provided)
  if (input.code) {
    const [codeDup] = await db
      .select({ id: subjectComponent.id })
      .from(subjectComponent)
      .where(and(eq(subjectComponent.subjectId, input.subjectId), eq(subjectComponent.code, input.code)))
      .limit(1);
    if (codeDup) throw new DuplicateError('subject_component', 'code (subject)');
  }

  const [created] = await db
    .insert(subjectComponent)
    .values({
      subjectId: input.subjectId,
      code: input.code ?? null,
      name: input.name,
      sortOrder: input.sortOrder,
    })
    .returning();

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'subject_component_created',
    entity: 'subject_component',
    entityId: created.id,
    schoolId,
    newValue: JSON.stringify({ ...input, subjectId: input.subjectId }),
    ...auditActor,
    ipAddress,
  });

  return created;
}

// ─────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────

export async function updateComponent(
  id: string,
  schoolId: string,
  input: UpdateSubjectComponentInput,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<SubjectComponent> {
  const existing = await getComponentById(id);

  // Verify tenant: subject must belong to school
  const [subj] = await db
    .select({ schoolId: subject.schoolId })
    .from(subject)
    .where(eq(subject.id, existing.subjectId))
    .limit(1);
  if (!subj || subj.schoolId !== schoolId) {
    throw new NotFoundError('subject_component', id);
  }

  // If name is being changed, check uniqueness
  if (input.name && input.name !== existing.name) {
    const [dup] = await db
      .select({ id: subjectComponent.id })
      .from(subjectComponent)
      .where(
        and(
          eq(subjectComponent.subjectId, existing.subjectId),
          eq(subjectComponent.name, input.name),
          sql`subject_component.id != ${id}`,
        ),
      )
      .limit(1);
    if (dup) throw new DuplicateError('subject_component', 'name (subject)');
  }

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.code !== undefined) updateData.code = input.code;
  if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  const [updated] = await db
    .update(subjectComponent)
    .set(updateData)
    .where(eq(subjectComponent.id, id))
    .returning();

  const { oldValue, newValue } = buildChangeLog(
    existing as unknown as Record<string, unknown>,
    updateData,
  );

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'subject_component_updated',
    entity: 'subject_component',
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
 * INV-M3-14: Cannot delete a subject_component if any config_component references it.
 */
export async function deleteComponent(
  id: string,
  schoolId: string,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<void> {
  const existing = await getComponentById(id);

  // Verify tenant
  const [subj] = await db
    .select({ schoolId: subject.schoolId })
    .from(subject)
    .where(eq(subject.id, existing.subjectId))
    .limit(1);
  if (!subj || subj.schoolId !== schoolId) {
    throw new NotFoundError('subject_component', id);
  }

  // INV-M3-14: Check config_component references
  const [{ refCount }] = await db
    .select({ refCount: sql<number>`count(*)::int` })
    .from(configComponent)
    .where(eq(configComponent.subjectComponentId, id));

  if (refCount > 0) {
    throw new CatalogReferencedError('subject_component', 'config_component', refCount);
  }

  await db.delete(subjectComponent).where(eq(subjectComponent.id, id));

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'subject_component_deleted',
    entity: 'subject_component',
    entityId: id,
    schoolId,
    oldValue: JSON.stringify(existing),
    ...auditActor,
    ipAddress,
  });
}
