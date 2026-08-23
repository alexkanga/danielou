import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import {
  getConfigById,
  updateConfig,
  deleteConfig,
  pedagogyErrorToResponse,
} from '@/lib/services/pedagogy';
import { updatePedagogicalConfigSchema } from '@/lib/validations/pedagogy';

/**
 * GET /api/regles-calcul/:id — Get config by ID
 * INV-M3-24: requires school:pedagogical_config:read
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:pedagogical_config:read');
    const schoolId = await getSchoolId();
    const { id } = await params;

    const row = await getConfigById(id);
    if (row.schoolId !== schoolId) {
      return Response.json({ error: 'Configuration non trouvée.' }, { status: 404 });
    }
    return Response.json(row);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

/**
 * PATCH /api/regles-calcul/:id — Update config (draft only)
 * INV-M3-04: only draft mutable
 * INV-M3-24: requires school:pedagogical_config:manage
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuthorizedSession('school:pedagogical_config:manage');
    const schoolId = await getSchoolId();
    const { id } = await params;
    const body = await request.json();
    const parsed = updatePedagogicalConfigSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updated = await updateConfig(id, schoolId, parsed.data, session.user);
    return Response.json(updated);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

/**
 * DELETE /api/regles-calcul/:id — Delete config (draft only)
 * INV-M3-04: only draft mutable
 * INV-M3-24: requires school:pedagogical_config:manage
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuthorizedSession('school:pedagogical_config:manage');
    const schoolId = await getSchoolId();
    const { id } = await params;

    await deleteConfig(id, schoolId, session.user);
    return Response.json({ success: true });
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
