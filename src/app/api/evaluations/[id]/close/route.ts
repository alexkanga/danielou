import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import { closeAssessment, pedagogyErrorToResponse } from '@/lib/services/pedagogy';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuthorizedSession('school:assessments:manage');
    const schoolId = await getSchoolId();
    const { id } = await params;
    const result = await closeAssessment(id, schoolId, session.user);
    return Response.json(result);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
