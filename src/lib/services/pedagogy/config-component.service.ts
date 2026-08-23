/**
 * Phase F — ConfigComponent Domain Service
 *
 * CRUD for config_component rows within a DRAFT config_subject.
 * - INV-M3-08: component's subject must match configSubject's subject
 * - INV-M3-04: parent config must be draft
 * - INV-M3-24: all mutations audited
 */

import { eq, and, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  configComponent,
  configSubject,
  pedagogicalConfig,
  subjectComponent,
} from '@/lib/db/schema';
import type { ConfigComponent } from '@/lib/db/schema';
import type { CreateConfigComponentInput, UpdateConfigComponentInput } from '@/lib/validations/pedagogy';
import {
  NotFoundError,
  DuplicateError,
  ConfigNotMutableError,
  ComponentSubjectMismatchError,
} from './errors';
import { logPedagogyAudit, sessionToAuditActor, buildChangeLog } from './audit';

// ─────────────────────────────────────────────
// List by config_subject
// ─────────────────────────────────────────────

export async function listConfigComponents(configSubjectId: string): Promise<ConfigComponent[]> {
  // Verify config_subject exists
  const [cs] = await db
    .select({ id: configSubject.id })
    .from(configSubject)
    .where(eq(configSubject.id, configSubjectId))
    .limit(1);
  if (!cs) throw new NotFoundError('config_subject', configSubjectId);

  return db
    .select()
    .from(configComponent)
    .where(eq(configComponent.configSubjectId, configSubjectId))
    .orderBy(asc(configComponent.sortOrder), asc(configComponent.name));
}

// ─────────────────────────────────────────────
// Get by ID
// ─────────────────────────────────────────────

export async function getConfigComponentById(id: string): Promise<ConfigComponent> {
  const [row] = await db
    .select()
    .from(configComponent)
    .where(eq(configComponent.id, id))
    .limit(1);
  if (!row) throw new NotFoundError('config_component', id);
  return row;
}

// ─────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────

export async function createConfigComponent(
  configSubjectId: string,
  schoolId: string,
  input: CreateConfigComponentInput,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<ConfigComponent> {
  // Verify parent config_subject + parent config
  const [cs] = await db
    .select({
      id: configSubject.id,
      configId: configSubject.configId,
      subjectId: configSubject.subjectId,
    })
    .from(configSubject)
    .where(eq(configSubject.id, configSubjectId))
    .limit(1);
  if (!cs) throw new NotFoundError('config_subject', configSubjectId);

  const [cfg] = await db
    .select({ id: pedagogicalConfig.id, schoolId: pedagogicalConfig.schoolId, status: pedagogicalConfig.status })
    .from(pedagogicalConfig)
    .where(eq(pedagogicalConfig.id, cs.configId))
    .limit(1);
  if (!cfg || cfg.schoolId !== schoolId) throw new NotFoundError('config_subject', configSubjectId);

  // INV-M3-04
  if (cfg.status !== 'draft') throw new ConfigNotMutableError(cfg.status);

  // Verify subject_component exists
  const [comp] = await db
    .select({ id: subjectComponent.id, subjectId: subjectComponent.subjectId })
    .from(subjectComponent)
    .where(eq(subjectComponent.id, input.subjectComponentId))
    .limit(1);
  if (!comp) throw new NotFoundError('subject_component', input.subjectComponentId);

  // INV-M3-08: component's subject must match configSubject's subject
  if (comp.subjectId !== cs.subjectId) {
    throw new ComponentSubjectMismatchError();
  }

  // Check duplicate name within config_subject
  const [dup] = await db
    .select({ id: configComponent.id })
    .from(configComponent)
    .where(
      and(
        eq(configComponent.configSubjectId, configSubjectId),
        eq(configComponent.name, input.name),
      ),
    )
    .limit(1);
  if (dup) throw new DuplicateError('config_component', 'name (config_subject)');

  const [created] = await db
    .insert(configComponent)
    .values({
      configSubjectId,
      subjectComponentId: input.subjectComponentId,
      name: input.name,
      sortOrder: input.sortOrder,
      coefficient: String(input.coefficient),
      componentScale: input.scale,
      isRequired: input.isRequired,
      isActive: input.isActive,
      assessmentAggregation: input.assessmentAggregation,
    })
    .returning();

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'config_component_created',
    entity: 'config_component',
    entityId: created.id,
    schoolId,
    newValue: JSON.stringify({ configSubjectId, ...input }),
    ...auditActor,
    ipAddress,
  });

  return created;
}

// ─────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────

export async function updateConfigComponent(
  id: string,
  schoolId: string,
  input: UpdateConfigComponentInput,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<ConfigComponent> {
  const existing = await getConfigComponentById(id);

  // Verify parent chain
  const [cs] = await db
    .select({ id: configSubject.id, configId: configSubject.configId })
    .from(configSubject)
    .where(eq(configSubject.id, existing.configSubjectId))
    .limit(1);
  if (!cs) throw new NotFoundError('config_component', id);

  const [cfg] = await db
    .select({ id: pedagogicalConfig.id, schoolId: pedagogicalConfig.schoolId, status: pedagogicalConfig.status })
    .from(pedagogicalConfig)
    .where(eq(pedagogicalConfig.id, cs.configId))
    .limit(1);
  if (!cfg || cfg.schoolId !== schoolId) throw new NotFoundError('config_component', id);

  // INV-M3-04
  if (cfg.status !== 'draft') throw new ConfigNotMutableError(cfg.status);

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
  if (input.coefficient !== undefined) updateData.coefficient = String(input.coefficient);
  if (input.scale !== undefined) updateData.scale = input.scale;
  if (input.isRequired !== undefined) updateData.isRequired = input.isRequired;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  if (input.assessmentAggregation !== undefined) updateData.assessmentAggregation = input.assessmentAggregation;

  const [updated] = await db
    .update(configComponent)
    .set(updateData)
    .where(eq(configComponent.id, id))
    .returning();

  const { oldValue, newValue } = buildChangeLog(
    existing as unknown as Record<string, unknown>,
    updateData,
  );

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'config_component_updated',
    entity: 'config_component',
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

export async function deleteConfigComponent(
  id: string,
  schoolId: string,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<void> {
  const existing = await getConfigComponentById(id);

  // Verify parent chain
  const [cs] = await db
    .select({ id: configSubject.id, configId: configSubject.configId })
    .from(configSubject)
    .where(eq(configSubject.id, existing.configSubjectId))
    .limit(1);
  if (!cs) throw new NotFoundError('config_component', id);

  const [cfg] = await db
    .select({ id: pedagogicalConfig.id, schoolId: pedagogicalConfig.schoolId, status: pedagogicalConfig.status })
    .from(pedagogicalConfig)
    .where(eq(pedagogicalConfig.id, cs.configId))
    .limit(1);
  if (!cfg || cfg.schoolId !== schoolId) throw new NotFoundError('config_component', id);

  // INV-M3-04
  if (cfg.status !== 'draft') throw new ConfigNotMutableError(cfg.status);

  await db.delete(configComponent).where(eq(configComponent.id, id));

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'config_component_deleted',
    entity: 'config_component',
    entityId: id,
    schoolId,
    oldValue: JSON.stringify(existing),
    ...auditActor,
    ipAddress,
  });
}