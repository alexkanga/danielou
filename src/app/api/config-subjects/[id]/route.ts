import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import {
  getConfigSubjectById,
  updateConfigSubject,
  deleteConfigSubject,
  pedagogyErrorToResponse,
} from '@/lib/services/pedagogy';
import { updateConfigSubjectSchema } from '@/lib/validations/pedagogy';

/**
 * GET /api/config-subjects/:id
 * INV-M3-24: requires school:pedagogical_config:read
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:pedagogical_config:read');
    const { id } = await params;

    const row = await getConfigSubjectById(id);
    return Response.json(row);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

/**
 * PATCH /api/config-subjects/:id
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
    const parsed = updateConfigSubjectSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updated = await updateConfigSubject(id, schoolId, parsed.data, session.user);
    return Response.json(updated);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

/**
 * DELETE /api/config-subjects/:id
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

    await deleteConfigSubject(id, schoolId, session.user);
    return Response.json({ success: true });
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
