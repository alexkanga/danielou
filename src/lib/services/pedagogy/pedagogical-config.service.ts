/**
 * Phase F — PedagogicalConfig Domain Service
 *
 * Versioned configuration CRUD with:
 * - INV-M3-07: school/level/year compatibility
 * - INV-M3-04: only draft mutable
 * - INV-M3-01/15/18: activation (atomic, max 1 active)
 * - INV-M3-05/16: clone (creates new draft)
 * - INV-M3-24: all mutations audited
 */

import { eq, and, asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  pedagogicalConfig,
  configSubject,
  configComponent,
  level,
  academicYear,
} from '@/lib/db/schema';
import type { PedagogicalConfig } from '@/lib/db/schema';
import type { CreatePedagogicalConfigInput, UpdatePedagogicalConfigInput } from '@/lib/validations/pedagogy';
import {
  NotFoundError,
  ConfigSchoolMismatchError,
  ConfigNotMutableError,
  ActivationError,
} from './errors';
import { logPedagogyAudit, sessionToAuditActor, buildChangeLog } from './audit';
import type { PaginatedResult } from '@/lib/data-access/pagination';

// ─────────────────────────────────────────────
// Extended types
// ─────────────────────────────────────────────

export type ConfigListItem = PedagogicalConfig & {
  levelName: string;
  yearName: string;
  subjectCount: number;
};

type ConfigListResult = PaginatedResult<ConfigListItem>;

// ─────────────────────────────────────────────
// List
// ─────────────────────────────────────────────

export async function listConfigs(params: {
  schoolId: string;
  page: number;
  limit: number;
  levelId?: string;
  academicYearId?: string;
}): Promise<ConfigListResult> {
  const { schoolId, page, limit, levelId, academicYearId } = params;

  const conditions = [eq(pedagogicalConfig.schoolId, schoolId)];
  if (levelId) conditions.push(eq(pedagogicalConfig.levelId, levelId));
  if (academicYearId) conditions.push(eq(pedagogicalConfig.academicYearId, academicYearId));

  const whereClause = and(...conditions);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pedagogicalConfig)
    .where(whereClause);

  const data = await db
    .select({
      id: pedagogicalConfig.id,
      schoolId: pedagogicalConfig.schoolId,
      levelId: pedagogicalConfig.levelId,
      academicYearId: pedagogicalConfig.academicYearId,
      version: pedagogicalConfig.version,
      status: pedagogicalConfig.status,
      calculationPolicy: pedagogicalConfig.calculationPolicy,
      roundingStrategy: pedagogicalConfig.roundingStrategy,
      subjectDecimalPlaces: pedagogicalConfig.subjectDecimalPlaces,
      generalDecimalPlaces: pedagogicalConfig.generalDecimalPlaces,
      rankingEnabled: pedagogicalConfig.rankingEnabled,
      conductEnabled: pedagogicalConfig.conductEnabled,
      conductIncludedInAverage: pedagogicalConfig.conductIncludedInAverage,
      conductCoefficient: pedagogicalConfig.conductCoefficient,
      conductScale: pedagogicalConfig.conductScale,
      promotionThreshold: pedagogicalConfig.promotionThreshold,
      description: pedagogicalConfig.description,
      createdAt: pedagogicalConfig.createdAt,
      updatedAt: pedagogicalConfig.updatedAt,
      levelName: level.name,
      yearName: academicYear.name,
      subjectCount: sql<number>`(
        SELECT count(*)::int FROM config_subject cs
        WHERE cs.config_id = pedagogical_config.id
      )`,
    })
    .from(pedagogicalConfig)
    .innerJoin(level, eq(pedagogicalConfig.levelId, level.id))
    .innerJoin(academicYear, eq(pedagogicalConfig.academicYearId, academicYear.id))
    .where(whereClause)
    .orderBy(asc(level.name), asc(academicYear.name), asc(pedagogicalConfig.version))
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    data: data as ConfigListItem[],
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

export async function getConfigById(id: string): Promise<PedagogicalConfig> {
  const [row] = await db
    .select()
    .from(pedagogicalConfig)
    .where(eq(pedagogicalConfig.id, id))
    .limit(1);
  if (!row) throw new NotFoundError('pedagogical_config', id);
  return row;
}

// ─────────────────────────────────────────────
// Create (always draft)
// ─────────────────────────────────────────────

export async function createConfig(
  schoolId: string,
  input: CreatePedagogicalConfigInput,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<PedagogicalConfig> {
  // INV-M3-07: Verify level belongs to school
  const [lvl] = await db
    .select({ id: level.id, schoolId: level.schoolId })
    .from(level)
    .where(eq(level.id, input.levelId))
    .limit(1);
  if (!lvl) throw new NotFoundError('level', input.levelId);
  if (lvl.schoolId !== schoolId) {
    throw new ConfigSchoolMismatchError('Le niveau n\'appartient pas à l\'école.');
  }

  // INV-M3-07: Verify academic year belongs to school
  const [year] = await db
    .select({ id: academicYear.id, schoolId: academicYear.schoolId })
    .from(academicYear)
    .where(eq(academicYear.id, input.academicYearId))
    .limit(1);
  if (!year) throw new NotFoundError('academic_year', input.academicYearId);
  if (year.schoolId !== schoolId) {
    throw new ConfigSchoolMismatchError("L'année scolaire n'appartient pas à l'école.");
  }

  // Compute next version
  const [maxVer] = await db
    .select({ version: sql<number>`COALESCE(max(version), 0)::int` })
    .from(pedagogicalConfig)
    .where(
      and(
        eq(pedagogicalConfig.levelId, input.levelId),
        eq(pedagogicalConfig.academicYearId, input.academicYearId),
      ),
    );
  const nextVersion = (maxVer?.version ?? 0) + 1;

  const [created] = await db
    .insert(pedagogicalConfig)
    .values({
      schoolId,
      levelId: input.levelId,
      academicYearId: input.academicYearId,
      version: nextVersion,
      status: 'draft',
      calculationPolicy: input.calculationPolicy,
      roundingStrategy: input.roundingStrategy,
      subjectDecimalPlaces: input.subjectDecimalPlaces,
      generalDecimalPlaces: input.generalDecimalPlaces,
      rankingEnabled: input.rankingEnabled,
      conductEnabled: input.conductEnabled,
      conductIncludedInAverage: input.conductIncludedInAverage,
      conductCoefficient: input.conductCoefficient !== null && input.conductCoefficient !== undefined
        ? String(input.conductCoefficient)
        : null,
      conductScale: input.conductScale ?? null,
      promotionThreshold: input.promotionThreshold !== null && input.promotionThreshold !== undefined
        ? String(input.promotionThreshold)
        : null,
      description: input.description ?? null,
    })
    .returning();

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'pedagogical_config_created',
    entity: 'pedagogical_config',
    entityId: created.id,
    schoolId,
    newValue: JSON.stringify({ ...input, version: nextVersion, status: 'draft' }),
    ...auditActor,
    ipAddress,
  });

  return created;
}

// ─────────────────────────────────────────────
// Update (only draft — INV-M3-04)
// ─────────────────────────────────────────────

export async function updateConfig(
  id: string,
  schoolId: string,
  input: UpdatePedagogicalConfigInput,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<PedagogicalConfig> {
  const existing = await getConfigById(id);
  if (existing.schoolId !== schoolId) throw new NotFoundError('pedagogical_config', id);

  // INV-M3-04: Only draft is mutable
  if (existing.status !== 'draft') {
    throw new ConfigNotMutableError(existing.status);
  }

  const updateData: Record<string, unknown> = {};
  if (input.calculationPolicy !== undefined) updateData.calculationPolicy = input.calculationPolicy;
  if (input.roundingStrategy !== undefined) updateData.roundingStrategy = input.roundingStrategy;
  if (input.subjectDecimalPlaces !== undefined) updateData.subjectDecimalPlaces = input.subjectDecimalPlaces;
  if (input.generalDecimalPlaces !== undefined) updateData.generalDecimalPlaces = input.generalDecimalPlaces;
  if (input.rankingEnabled !== undefined) updateData.rankingEnabled = input.rankingEnabled;
  if (input.conductEnabled !== undefined) updateData.conductEnabled = input.conductEnabled;
  if (input.conductIncludedInAverage !== undefined) updateData.conductIncludedInAverage = input.conductIncludedInAverage;
  if (input.conductCoefficient !== undefined) {
    updateData.conductCoefficient = input.conductCoefficient !== null
      ? String(input.conductCoefficient)
      : null;
  }
  if (input.conductScale !== undefined) {
    updateData.conductScale = input.conductScale;
  }
  if (input.promotionThreshold !== undefined) {
    updateData.promotionThreshold = input.promotionThreshold !== null
      ? String(input.promotionThreshold)
      : null;
  }
  if (input.description !== undefined) updateData.description = input.description;

  const [updated] = await db
    .update(pedagogicalConfig)
    .set(updateData)
    .where(eq(pedagogicalConfig.id, id))
    .returning();

  const { oldValue, newValue } = buildChangeLog(
    existing as unknown as Record<string, unknown>,
    updateData,
  );

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'pedagogical_config_updated',
    entity: 'pedagogical_config',
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
// Activate (INV-M3-15, INV-M3-01, INV-M3-18)
// ─────────────────────────────────────────────

/**
 * Activates a draft config.
 * INV-M3-15: Atomic — archives any currently active config, then activates this one.
 * INV-M3-01: Max 1 active per level+year (DB partial unique + service guard).
 * INV-M3-18: Concurrent activation guard via transaction.
 */
export async function activateConfig(
  id: string,
  schoolId: string,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<PedagogicalConfig> {
  const existing = await getConfigById(id);
  if (existing.schoolId !== schoolId) throw new NotFoundError('pedagogical_config', id);

  // INV-M3-04: Only draft can be activated
  if (existing.status !== 'draft') {
    throw new ActivationError('Seule une configuration en brouillon (draft) peut être activée.');
  }

  // INV-M3-15: Atomic activation transaction
  const result = await db.transaction(async (tx) => {
    // 1. Archive any currently active config for this level+year
    const [currentActive] = await tx
      .select({ id: pedagogicalConfig.id })
      .from(pedagogicalConfig)
      .where(
        and(
          eq(pedagogicalConfig.levelId, existing.levelId),
          eq(pedagogicalConfig.academicYearId, existing.academicYearId),
          eq(pedagogicalConfig.status, 'active'),
        ),
      )
      .limit(1);

    if (currentActive) {
      await tx
        .update(pedagogicalConfig)
        .set({ status: 'archived' })
        .where(eq(pedagogicalConfig.id, currentActive.id));
    }

    // 2. Activate the target
    const [activated] = await tx
      .update(pedagogicalConfig)
      .set({ status: 'active' })
      .where(eq(pedagogicalConfig.id, id))
      .returning();

    return activated;
  });

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'pedagogical_config_activated',
    entity: 'pedagogical_config',
    entityId: id,
    schoolId,
    oldValue: JSON.stringify({ status: 'draft' }),
    newValue: JSON.stringify({ status: 'active' }),
    ...auditActor,
    ipAddress,
  });

  return result;
}

// ─────────────────────────────────────────────
// Clone (INV-M3-05, INV-M3-16)
// ─────────────────────────────────────────────

/**
 * Clones a config (any status) into a new DRAFT version.
 * INV-M3-05: New revision uses clone → draft.
 * INV-M3-16: Clone atomic — copies config_subject + config_component.
 */
export async function cloneConfig(
  id: string,
  schoolId: string,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<PedagogicalConfig> {
  const source = await getConfigById(id);
  if (source.schoolId !== schoolId) throw new NotFoundError('pedagogical_config', id);

  // INV-M3-17: Compute next version (concurrency-safe via DB unique)
  const [maxVer] = await db
    .select({ version: sql<number>`COALESCE(max(version), 0)::int` })
    .from(pedagogicalConfig)
    .where(
      and(
        eq(pedagogicalConfig.levelId, source.levelId),
        eq(pedagogicalConfig.academicYearId, source.academicYearId),
      ),
    );
  const nextVersion = (maxVer?.version ?? 0) + 1;

  // INV-M3-16: Atomic clone transaction
  const cloned = await db.transaction(async (tx) => {
    // 1. Insert new config as DRAFT
    const [newConfig] = await tx
      .insert(pedagogicalConfig)
      .values({
        schoolId: source.schoolId,
        levelId: source.levelId,
        academicYearId: source.academicYearId,
        version: nextVersion,
        status: 'draft',
        calculationPolicy: source.calculationPolicy,
        roundingStrategy: source.roundingStrategy,
        subjectDecimalPlaces: source.subjectDecimalPlaces,
        generalDecimalPlaces: source.generalDecimalPlaces,
        rankingEnabled: source.rankingEnabled,
        conductEnabled: source.conductEnabled,
        conductIncludedInAverage: source.conductIncludedInAverage,
        conductCoefficient: source.conductCoefficient,
        conductScale: source.conductScale,
        promotionThreshold: source.promotionThreshold,
        description: source.description,
      })
      .returning();

    // 2. Copy all config_subject rows
    const sourceSubjects = await tx
      .select()
      .from(configSubject)
      .where(eq(configSubject.configId, source.id));

    for (const cs of sourceSubjects) {
 const [newCS] = await tx
        .insert(configSubject)
        .values({
          configId: newConfig.id,
          subjectId: cs.subjectId,
          coefficient: cs.coefficient,
          componentScale: cs.componentScale,
          isOptional: cs.isOptional,
          isActive: cs.isActive,
          includeInAverage: cs.includeInAverage,
          includeInRanking: cs.includeInRanking,
          includeInDecision: cs.includeInDecision,
          assessmentAggregation: cs.assessmentAggregation,
          componentAggregation: cs.componentAggregation,
          sortOrder: cs.sortOrder,
        })
        .returning();

      // 3. Copy all config_component rows for this config_subject
      const sourceComponents = await tx
        .select()
        .from(configComponent)
        .where(eq(configComponent.configSubjectId, cs.id));

      if (sourceComponents.length > 0) {
        await tx.insert(configComponent).values(
          sourceComponents.map((cc) => ({
            configSubjectId: newCS.id,
            subjectComponentId: cc.subjectComponentId,
            name: cc.name,
            sortOrder: cc.sortOrder,
            coefficient: cc.coefficient,
            componentScale: cc.componentScale,
            isRequired: cc.isRequired,
            isActive: cc.isActive,
            assessmentAggregation: cc.assessmentAggregation,
          })),
        );
      }
    }

    return newConfig;
  });

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'pedagogical_config_cloned',
    entity: 'pedagogical_config',
    entityId: cloned.id,
    schoolId,
    oldValue: JSON.stringify({ sourceId: id, sourceVersion: source.version }),
    newValue: JSON.stringify({ version: nextVersion, status: 'draft' }),
    ...auditActor,
    ipAddress,
  });

  return cloned;
}

// ─────────────────────────────────────────────
// Delete (only draft)
// ─────────────────────────────────────────────

export async function deleteConfig(
  id: string,
  schoolId: string,
  actor: { id: string; isGhost: boolean; platformRole: string },
  ipAddress?: string,
): Promise<void> {
  const existing = await getConfigById(id);
  if (existing.schoolId !== schoolId) throw new NotFoundError('pedagogical_config', id);

  // INV-M3-04: Only draft can be deleted
  if (existing.status !== 'draft') {
    throw new ConfigNotMutableError(existing.status);
  }

  // Delete config_component → config_subject → pedagogical_config (cascade order)
  await db.transaction(async (tx) => {
    const csRows = await tx
      .select({ id: configSubject.id })
      .from(configSubject)
      .where(eq(configSubject.configId, id));

    for (const cs of csRows) {
      await tx.delete(configComponent).where(eq(configComponent.configSubjectId, cs.id));
    }

    await tx.delete(configSubject).where(eq(configSubject.configId, id));
    await tx.delete(pedagogicalConfig).where(eq(pedagogicalConfig.id, id));
  });

  const auditActor = sessionToAuditActor(actor);
  await logPedagogyAudit({
    action: 'pedagogical_config_deleted',
    entity: 'pedagogical_config',
    entityId: id,
    schoolId,
    oldValue: JSON.stringify(existing),
    ...auditActor,
    ipAddress,
  });
}
