/**
 * Server-only authorization guards.
 * 
 * These helpers combine session + permission checks and MUST only
 * be imported from Server Components, Route Handlers, and Server Actions.
 * They are NOT safe for Client Components.
 */

import type { Permission, AppSessionV2 } from './types/rbac';
import { requirePermission, requireAnyPermission } from './authorization';
import { requireSession } from './session';

/**
 * Exige une session ET une permission.
 * Combine requireSession() + requirePermission() en un appel.
 */
export async function requireAuthorizedSession(
  permission: Permission,
): Promise<AppSessionV2> {
  const session = await requireSession();
  requirePermission(
    session.user.platformRole,
    session.activeSchoolRole,
    permission,
  );
  return session;
}

/**
 * Exige une session ET au moins une des permissions.
 */
export async function requireAnyAuthorizedSession(
  permissions: Permission[],
): Promise<AppSessionV2> {
  const session = await requireSession();
  requireAnyPermission(
    session.user.platformRole,
    session.activeSchoolRole,
    permissions,
  );
  return session;
}
