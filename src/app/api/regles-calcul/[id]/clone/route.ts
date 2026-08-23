import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import { cloneConfig, pedagogyErrorToResponse } from '@/lib/services/pedagogy';

/**
 * POST /api/regles-calcul/:id/clone — Clone config into new draft
 * INV-M3-05/16: new revision uses clone → draft
 * INV-M3-24: requires school:pedagogical_config:manage
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuthorizedSession('school:pedagogical_config:manage');
    const schoolId = await getSchoolId();
    const { id } = await params;

    const cloned = await cloneConfig(id, schoolId, session.user);
    return Response.json(cloned, { status: 201 });
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
