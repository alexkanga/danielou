import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import { parsePagination } from '@/lib/data-access/pagination';
import { listAssessmentTypes, createAssessmentType, pedagogyErrorToResponse } from '@/lib/services/pedagogy';
import { createAssessmentTypeSchema } from '@/lib/validations/pedagogy';

/**
 * GET /api/types-evaluation — List assessment types
 * INV-M3-24: requires school:assessment_types:read
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:assessment_types:read');
    const schoolId = await getSchoolId();
    const { page, limit, search } = parsePagination(request.nextUrl.searchParams);

    const result = await listAssessmentTypes({ schoolId, page, limit, search });
    return Response.json(result);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

/**
 * POST /api/types-evaluation — Create assessment type
 * INV-M3-24: requires school:assessment_types:manage
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthorizedSession('school:assessment_types:manage');
    const schoolId = await getSchoolId();
    const body = await request.json();
    const parsed = createAssessmentTypeSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const created = await createAssessmentType(schoolId, parsed.data, session.user);
    return Response.json(created, { status: 201 });
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
