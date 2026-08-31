import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import { getAnnualClassResults } from '@/lib/services/results/annual-data.service';
import { pedagogyErrorToResponse } from '@/lib/services/pedagogy';

export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:annual_results:read');
    await getSchoolId();
    const academicYearId = request.nextUrl.searchParams.get('academicYearId');
    const classroomId = request.nextUrl.searchParams.get('classroomId');
    if (!academicYearId || !classroomId) {
      return Response.json({ error: 'academicYearId et classroomId sont requis.' }, { status: 400 });
    }
    const result = await getAnnualClassResults({ academicYearId, classroomId });
    return Response.json(result);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
