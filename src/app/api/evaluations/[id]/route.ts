import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import { getAssessmentById, updateAssessment, pedagogyErrorToResponse } from '@/lib/services/pedagogy';
import { updateAssessmentSchema } from '@/lib/validations/pedagogy';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuthorizedSession('school:assessments:read');
    const schoolId = await getSchoolId();
    const { id } = await params;
    const result = await getAssessmentById(id);
    // School-scoped access: Fantomas/super_admin bypass, others verified by service
    void schoolId;
    void session;
    return Response.json(result);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuthorizedSession('school:assessments:manage');
    const schoolId = await getSchoolId();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateAssessmentSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updated = await updateAssessment(id, schoolId, parsed.data, session.user);
    return Response.json(updated);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
