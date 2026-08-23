import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import { parsePagination } from '@/lib/data-access/pagination';
import { listAssessments, createAssessment, pedagogyErrorToResponse } from '@/lib/services/pedagogy';
import { createAssessmentSchema } from '@/lib/validations/pedagogy';

export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:assessments:read');
    const schoolId = await getSchoolId();
    const { page, limit, search } = parsePagination(request.nextUrl.searchParams);
    const classroomId = request.nextUrl.searchParams.get('classroomId') || undefined;
    const subjectId = request.nextUrl.searchParams.get('subjectId') || undefined;
    const academicPeriodId = request.nextUrl.searchParams.get('academicPeriodId') || undefined;
    const status = request.nextUrl.searchParams.get('status') || undefined;

    const result = await listAssessments({ schoolId, page, limit, search, classroomId, subjectId, academicPeriodId, status });
    return Response.json(result);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthorizedSession('school:assessments:manage');
    const schoolId = await getSchoolId();
    const body = await request.json();
    const parsed = createAssessmentSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const created = await createAssessment(schoolId, parsed.data, session.user);
    return Response.json(created, { status: 201 });
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
