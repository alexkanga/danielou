/**
 * M6.1 — Alerts API
 * Returns computed operational alerts.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { computeAlerts } from '@/lib/services/m6/alerts.service';
import { getSchoolId, handleApiError } from '@/lib/data-access/get-school';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    // Ghost/super_admin don't have school-scoped alerts
    if (session.user.platformRole === 'super_admin' || session.user.isGhost) {
      return NextResponse.json({ alerts: [] });
    }

    const schoolId = await getSchoolId();
    const alerts = await computeAlerts(schoolId, session.activeSchoolRole ?? 'reader');
    return NextResponse.json({ alerts });
  } catch (error) {
    return handleApiError(error, 'dashboard/alerts');
  }
}
