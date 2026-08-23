import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import { getEligibleStudents, pedagogyErrorToResponse } from '@/lib/services/pedagogy';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthorizedSession('school:assessments:read');
    const schoolId = await getSchoolId();
    const { id } = await params;
    const result = await getEligibleStudents(id, schoolId);
    return Response.json(result);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
