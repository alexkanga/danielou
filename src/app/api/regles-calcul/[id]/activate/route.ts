import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import { activateConfig, pedagogyErrorToResponse } from '@/lib/services/pedagogy';

/**
 * POST /api/regles-calcul/:id/activate — Activate a draft config
 * INV-M3-15: atomic (archives current active, activates this one)
 * INV-M3-01/18: max 1 active per level+year
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

    const activated = await activateConfig(id, schoolId, session.user);
    return Response.json(activated);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
