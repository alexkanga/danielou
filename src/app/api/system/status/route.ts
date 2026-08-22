/**
 * R-V2-M1-H2 — System Status Endpoint (§22, §23)
 * 
 * GET /api/system/status
 * Returns Ghost status and DB status separately.
 * Ghost is ALWAYS available (§22).
 * DB status is independent (§23).
 */

import { NextResponse } from 'next/server';
import { getGhostConfig } from '@/lib/ghost-config';
import { checkDatabaseHealth } from '@/lib/db-health';
import { resolveActor } from '@/lib/actor';

export async function GET() {
  const ghostConfig = getGhostConfig();
  
  let dbHealth;
  try {
    dbHealth = await checkDatabaseHealth();
  } catch {
    dbHealth = { state: 'UNAVAILABLE' as const, error: 'Health check failed' };
  }

  // Check if the caller is authenticated (optional — for enhanced display)
  let actor = null;
  try {
    actor = await resolveActor();
  } catch {
    // Not authenticated — return public status
  }

  return NextResponse.json({
    ghost: {
      account: 'AVAILABLE' as const,
      authentication: 'AVAILABLE' as const,
      authorization: 'GLOBAL SUPER_ADMIN' as const,
      sessionSecurity: ghostConfig.securityMode === 'external_secret'
        ? 'EXTERNAL SECRET' as const
        : 'BUILT-IN FALLBACK' as const,
    },
    database: {
      state: dbHealth.state,
      error: dbHealth.error ?? undefined,
    },
    authenticated: actor !== null,
    actorType: actor?.type ?? null,
  });
}
