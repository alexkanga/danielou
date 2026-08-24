/**
 * Phase F — M3 Pedagogy Audit Logger
 *
 * Unified audit logging for all 6 pedagogy tables.
 * Uses the existing audit_log table.
 * Follows the same pattern as classroom-assignment.ts logAudit,
 * but is shared across all pedagogy domain services.
 *
 * INV-M3-24: All M3 mutations produce audit entries.
 */

import { db } from '@/lib/db';
import { auditLog } from '@/lib/db/schema';
import { logger } from '@/lib/logger';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface PedagogyAuditParams {
  action: string;
  entity: string;
  entityId: string;
  schoolId: string | null;
  oldValue?: string;
  newValue?: string;
  /** Derived from session — actor info */
  actorId?: string;
  actorType?: string;
  actorIdentifier?: string;
  ipAddress?: string;
  /** Optional context JSON */
  context?: Record<string, unknown>;
}

/** Extract actor info from the authorized session */
export function sessionToAuditActor(session: {
  id: string;
  isGhost: boolean;
  platformRole: string;
}): Pick<PedagogyAuditParams, 'actorId' | 'actorType' | 'actorIdentifier'> {
  if (session.isGhost) {
    return {
      actorId: undefined,
      actorType: 'ghost',
      actorIdentifier: 'fantomas',
    };
  }
  return {
    actorId: session.id,
    actorType: 'user',
    actorIdentifier: session.id,
  };
}

// ─────────────────────────────────────────────
// Core audit writer
// ─────────────────────────────────────────────

/**
 * Write an audit entry for a pedagogy mutation.
 * Audit failure MUST NOT break the main operation.
 */
export async function logPedagogyAudit(params: PedagogyAuditParams): Promise<void> {
  try {
    await db.insert(auditLog).values({
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      schoolId: params.schoolId && params.schoolId !== '' ? params.schoolId : null,
      userId: params.actorId ?? null,
      actorType: params.actorType ?? null,
      actorIdentifier: params.actorIdentifier ?? null,
      ipAddress: params.ipAddress ?? null,
      context: params.context ? JSON.stringify(params.context) : null,
    });
  } catch (err) {
    // Audit failure must not break the main operation
    logger.warn('pedagogy_audit_failed', {
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      error: err instanceof Error ? err.message : 'unknown',
    });
  }
}

// ─────────────────────────────────────────────
// Convenience helpers
// ─────────────────────────────────────────────

export function buildChangeLog(
  oldRecord: Record<string, unknown> | null,
  newValues: Record<string, unknown>,
  sensitiveKeys: string[] = [],
): { oldValue: string; newValue: string } {
  const oldValue = oldRecord ? JSON.stringify(sanitize(oldRecord, sensitiveKeys)) : null;
  const newValue = JSON.stringify(sanitize(newValues, sensitiveKeys));
  return { oldValue: oldValue ?? '', newValue };
}

function sanitize(
  obj: Record<string, unknown>,
  forbiddenKeys: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!forbiddenKeys.includes(k)) {
      result[k] = v;
    }
  }
  return result;
}
