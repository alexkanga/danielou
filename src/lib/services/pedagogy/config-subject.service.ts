/**
 * Phase F — ConfigSubject Domain Service
 *
 * CRUD for config_subject rows within a DRAFT pedagogical config.
 * - INV-M3-06: subject.school == config.school
 * - INV-M3-04: parent config must be draft
 * - INV-M3-24: all mutations audited
 */

import { eq, and, asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  configSubject,
  configComponent,
  pedagogicalConfig,
  subject,
} from '@/lib/db/schema';
import type { ConfigSubject } from '@/lib/db/schema';
import type { CreateConfigSubjectInput, UpdateConfigSubjectInput } from '@/lib/validations/pedagogy';
import {
  NotFoundError,
  DuplicateError,
  ConfigNotMutableError,
  ConfigSubjectSchoolMismatchError,
} from './errors';
import { logPedagogyAudit, sessionToAuditActor, buildChangeLog } from './audit';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ConfigSubjectWithDetails = ConfigSubject & {
  subjectName: string;
  subjectCode: string;
  componentCount: number;
};

// ─────────────────────────────────────────────
// List by config
// ─────────────────────────────────────────────

export async function listConfigSubjects(configId: string): Promise<ConfigSubjectWithDetails[]> {
  // Verify config exists
  const [cfg] = await db
    .select({ id: pedagogicalConfig.id, schoolId: pedagogicalConfig.schoolId })
    .from(pedagogicalConfig)
    .where(eq(pedagogicalConfig.id, configId))
    .limit(1);
  if (!cfg) throw new NotFoundError('pedagogical_config', configId);

  const rows = await db
    .select({
      id: configSubject.id,
      configId: configSubject.configId,
      subjectId: configSubject.subjectId,
      coefficient: configSubject.coefficient,
      componentScale: configSubject.componentScale,
      isOptional: configSubject.isOptional,
      isActive: configSubject.isActive,
      includeInAverage: configSubject.includeInAverage,
      includeInRanking: configSubject.includeInRanking,
      includeInDecision: configSubject.includeInDecision,
      assessmentAggregation: configSubject.assessmentAggregation,
      componentAggregation: configSubject.componentAggregation,
      sortOrder: configSubject.sortOrder,
      createdAt: configSubject.createdAt,
      updatedAt: configSubject.updatedAt,
      subjectName: subject.name,
      subjectCode: subject.code,
      componentCount: sql<number>`(
        SELECT count(*)::int FROM config_component cc
        WHERE cc.config_subject_id = config_subject.id
      )`,
    })
    .from(configSubject)
    .innerJoin(subject, eq(configSubject.subjectId, subject.id))
    .where(eq(configSubject.configId, configId))
    .orderBy(asc(configSubject.sortOrder), asc(subject.name));

  return rows as ConfigSubjectWithDetails[];
}

// ─────────────────────────────────────────────
// Get by ID
// ─────────────────────────────────────────────

export async function getConfigSubjectById(id: string): Promise<ConfigSubject> {
  const [row] = await db
    .select()
    .from(configSubject)
    .where(eq(configSubject.id, id))
    .limit(1);
  if (!row) throw new NotFoundError('config_subject', id);
  return row;
}

// ─────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────

export async function createConfigSubject(
  configId: string,
  schoolId: string,
  input: CreateConfigSubjectInput,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<ConfigSubject> {
  // Verify parent config
  const [cfg] = await db
    .select({ id: pedagogicalConfig.id, schoolId: pedagogicalConfig.schoolId, status: pedagogicalConfig.status })
    .from(pedagogicalConfig)
    .where(eq(pedagogicalConfig.id, configId))
    .limit(1);
  if (!cfg) throw new NotFoundError('pedagogical_config', configId);
  if (cfg.schoolId !== schoolId) throw new NotFoundError('pedagogical_config', configId);

  // INV-M3-04: Only draft config is mutable
  if (cfg.status !== 'draft') {
    throw new ConfigNotMutableError(cfg.status);
  }

  // Verify subject exists
  const [subj] = await db
    .select({ id: subject.id, schoolId: subject.schoolId, name: subject.name })
    .from(subject)
    .where(eq(subject.id, input.subjectId))
    .limit(1);
  if (!subj) throw new NotFoundError('subject', input.subjectId);

  // INV-M3-06: subject.school must equal config.school
  if (subj.schoolId !== cfg.schoolId) {
    throw new ConfigSubjectSchoolMismatchError();
  }

  // Check duplicate subject in this config
  const [dup] = await db
    .select({ id: configSubject.id })
    .from(configSubject)
    .where(and(eq(configSubject.configId, configId), eq(configSubject.subjectId, input.subjectId)))
    .limit(1);
  if (dup) throw new DuplicateError('config_subject', 'subject (config)');

  const [created] = await db
    .insert(configSubject)
    .values({
      configId,
      subjectId: input.subjectId,
      coefficient: String(input.coefficient),
      componentScale: input.scale,
      isOptional: input.isOptional,
      isActive: input.isActive,
      includeInAverage: input.includeInAverage,
      includeInRanking: input.includeInRanking,
      includeInDecision: input.includeInDecision,
      assessmentAggregation: input.assessmentAggregation,
      componentAggregation: input.componentAggregation,
      sortOrder: input.sortOrder,
    })
    .returning();

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'config_subject_created',
    entity: 'config_subject',
    entityId: created.id,
    schoolId,
    newValue: JSON.stringify({ configId, ...input }),
    ...auditActor,
    ipAddress,
  });

  return created;
}

// ─────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────

export async function updateConfigSubject(
  id: string,
  schoolId: string,
  input: UpdateConfigSubjectInput,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<ConfigSubject> {
  const existing = await getConfigSubjectById(id);

  // Verify parent config is draft and belongs to school
  const [cfg] = await db
    .select({ id: pedagogicalConfig.id, schoolId: pedagogicalConfig.schoolId, status: pedagogicalConfig.status })
    .from(pedagogicalConfig)
    .where(eq(pedagogicalConfig.id, existing.configId))
    .limit(1);
  if (!cfg || cfg.schoolId !== schoolId) throw new NotFoundError('config_subject', id);

  // INV-M3-04
  if (cfg.status !== 'draft') throw new ConfigNotMutableError(cfg.status);

  const updateData: Record<string, unknown> = {};
  if (input.coefficient !== undefined) updateData.coefficient = String(input.coefficient);
  if (input.scale !== undefined) updateData.componentScale = input.scale;
  if (input.isOptional !== undefined) updateData.isOptional = input.isOptional;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  if (input.includeInAverage !== undefined) updateData.includeInAverage = input.includeInAverage;
  if (input.includeInRanking !== undefined) updateData.includeInRanking = input.includeInRanking;
  if (input.includeInDecision !== undefined) updateData.includeInDecision = input.includeInDecision;
  if (input.assessmentAggregation !== undefined) updateData.assessmentAggregation = input.assessmentAggregation;
  if (input.componentAggregation !== undefined) updateData.componentAggregation = input.componentAggregation;
  if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

  const [updated] = await db
    .update(configSubject)
    .set(updateData)
    .where(eq(configSubject.id, id))
    .returning();

  const { oldValue, newValue } = buildChangeLog(
    existing as unknown as Record<string, unknown>,
    updateData,
  );

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'config_subject_updated',
    entity: 'config_subject',
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

export async function deleteConfigSubject(
  id: string,
  schoolId: string,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<void> {
  const existing = await getConfigSubjectById(id);

  // Verify parent config
  const [cfg] = await db
    .select({ id: pedagogicalConfig.id, schoolId: pedagogicalConfig.schoolId, status: pedagogicalConfig.status })
    .from(pedagogicalConfig)
    .where(eq(pedagogicalConfig.id, existing.configId))
    .limit(1);
  if (!cfg || cfg.schoolId !== schoolId) throw new NotFoundError('config_subject', id);

  // INV-M3-04
  if (cfg.status !== 'draft') throw new ConfigNotMutableError(cfg.status);

  // Delete config_components first
  await db.delete(configComponent).where(eq(configComponent.configSubjectId, id));
  await db.delete(configSubject).where(eq(configSubject.id, id));

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'config_subject_deleted',
    entity: 'config_subject',
    entityId: id,
    schoolId,
    oldValue: JSON.stringify(existing),
    ...auditActor,
    ipAddress,
  });
}
