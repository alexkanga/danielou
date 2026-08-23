import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import {
  getAssessmentTypeById,
  updateAssessmentType,
  deleteAssessmentType,
  pedagogyErrorToResponse,
} from '@/lib/services/pedagogy';
import { updateAssessmentTypeSchema } from '@/lib/validations/pedagogy';

/**
 * GET /api/types-evaluation/:id — Get by ID
 * INV-M3-24: requires school:assessment_types:read
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:assessment_types:read');
    const schoolId = await getSchoolId();
    const { id } = await params;

    const row = await getAssessmentTypeById(id);
    if (row.schoolId !== schoolId) {
      return Response.json({ error: "Type d'évaluation non trouvé." }, { status: 404 });
    }
    return Response.json(row);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

/**
 * PATCH /api/types-evaluation/:id — Update
 * INV-M3-24: requires school:assessment_types:manage
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuthorizedSession('school:assessment_types:manage');
    const schoolId = await getSchoolId();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateAssessmentTypeSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updated = await updateAssessmentType(id, schoolId, parsed.data, session.user);
    return Response.json(updated);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

/**
 * DELETE /api/types-evaluation/:id — Delete
 * INV-M3-24: requires school:assessment_types:manage
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuthorizedSession('school:assessment_types:manage');
    const schoolId = await getSchoolId();
    const { id } = await params;

    await deleteAssessmentType(id, schoolId, session.user);
    return Response.json({ success: true });
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
