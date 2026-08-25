/**
 * M6.1 — Dashboard API
 * Returns role-specific KPIs.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDashboardData, getSuperAdminDashboard } from '@/lib/services/m6/dashboard.service';
import { handleApiError } from '@/lib/data-access/get-school';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const { user, activeSchoolRole, activeSchoolId } = session;

    // Super admin / ghost get platform dashboard
    if (user.platformRole === 'super_admin' || user.isGhost) {
      const data = await getSuperAdminDashboard();
      return NextResponse.json(data);
    }

    const data = await getDashboardData(
      activeSchoolRole ?? 'reader',
      activeSchoolId,
      user.id,
    );
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, 'dashboard');
  }
}
