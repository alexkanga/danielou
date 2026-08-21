/**
 * M1-29.4 — Ghost Logout Endpoint
 * POST /api/auth/ghost/logout
 * Supprime le cookie Ghost. Ne dépend pas de PostgreSQL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GHOST_COOKIE_NAME, getGhostCookieDeleteOptions, verifyGhostSession } from '@/lib/ghost-auth';
import { auditGhostAction } from '@/lib/audit';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  // Vérifier la session Ghost avant d'auditer
  const cookieStore = await cookies();
  const ghostToken = cookieStore.get(GHOST_COOKIE_NAME)?.value;

  if (ghostToken) {
    const payload = await verifyGhostSession(ghostToken);
    if (payload) {
      // Audit uniquement si c'était une vraie session Ghost
      await auditGhostAction('ghost_logout', { ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() }).catch(() => {});
    }
  }

  const response = NextResponse.json({ success: true });

  // Supprimer le cookie Ghost
  const opts = getGhostCookieDeleteOptions();
  response.cookies.set(GHOST_COOKIE_NAME, '', opts);

  return response;
}
