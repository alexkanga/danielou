import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import {
  getSubjectById,
  updateSubject,
  deleteSubject,
  pedagogyErrorToResponse,
} from '@/lib/services/pedagogy';
import { updateSubjectSchema } from '@/lib/validations/pedagogy';

/**
 * GET /api/matieres/:id — Get subject by ID
 * INV-M3-24: requires school:subjects:read
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:subjects:read');
    const schoolId = await getSchoolId();
    const { id } = await params;

    const row = await getSubjectById(id);
    if (row.schoolId !== schoolId) {
      return Response.json({ error: 'Matière non trouvée.' }, { status: 404 });
    }
    return Response.json(row);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

/**
 * PATCH /api/matieres/:id — Update subject
 * INV-M3-24: requires school:subjects:manage
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuthorizedSession('school:subjects:manage');
    const schoolId = await getSchoolId();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSubjectSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updated = await updateSubject(id, schoolId, parsed.data, session.user);
    return Response.json(updated);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

/**
 * DELETE /api/matieres/:id — Delete subject
 * INV-M3-14: blocked if config_subject references exist
 * INV-M3-24: requires school:subjects:manage
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuthorizedSession('school:subjects:manage');
    const schoolId = await getSchoolId();
    const { id } = await params;

    await deleteSubject(id, schoolId, session.user);
    return Response.json({ success: true });
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
