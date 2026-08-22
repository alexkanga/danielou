/**
 * M1-29.12 — Ghost Audit
 * 
 * Enregistre les actions Ghost dans audit_log (quand DB disponible).
 * Si DB indisponible, utilise le logger runtime minimal.
 */

import { getDb } from './db';
import { sql } from 'drizzle-orm';

/**
 * Audit une action Ghost.
 * - Si DB disponible : écrit dans audit_log.
 * - Si DB indisponible : console.info (sans secrets).
 */
export async function auditGhostAction(
  action: string,
  context?: Record<string, unknown>,): Promise<void> {
  const auditEntry = {
    actor_type: 'ghost',
    actor_identifier: 'fantomas',
    action,
    entity: context?.entity ?? 'system',
    entity_id: context?.entityId ?? '00000000-0000-0000-0000-000000000000',
    context: context ? JSON.stringify(safeContext(context)) : null,
  };

  try {
    const db = getDb();
    await db.execute(
      sql`INSERT INTO audit_log (
        actor_type, actor_identifier, action, entity, entity_id, context
      ) VALUES (
        ${auditEntry.actor_type},
        ${auditEntry.actor_identifier},
        ${auditEntry.action},
        ${auditEntry.entity},
        ${auditEntry.entity_id}::uuid,
        ${auditEntry.context}
      )`,
    );
  } catch {
    // DB indisponible — logger runtime minimal (sans secrets)
    console.info(`[ghost] ${action}`, {
      actor_type: 'ghost',
      ...safeContext(context),
    });
  }
}

/**
 * Retourne un contexte safe pour le logging (sans secrets).
 */
function safeContext(
  ctx?: Record<string, unknown>,
): Record<string, unknown> {
  if (!ctx) return {};
  const FORBIDDEN = new Set([
    'password', 'secret', 'token', 'credential',
    'GHOST_SESSION_SECRET', 'BETTER_AUTH_SECRET',
    'FANTOMAS_PASSWORD', 'DATABASE_URL',
  ]);
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (!FORBIDDEN.has(k.toLowerCase())) {
      safe[k] = v;
    }
  }
  return safe;
}
