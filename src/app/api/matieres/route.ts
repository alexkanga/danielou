import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import { parsePagination } from '@/lib/data-access/pagination';
import { listSubjects, createSubject, pedagogyErrorToResponse } from '@/lib/services/pedagogy';
import { createSubjectSchema } from '@/lib/validations/pedagogy';

/**
 * GET /api/matieres — List subjects
 * INV-M3-24: requires school:subjects:read
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:subjects:read');
    const schoolId = await getSchoolId();
    const { page, limit, search } = parsePagination(request.nextUrl.searchParams);

    const result = await listSubjects({ schoolId, page, limit, search });
    return Response.json(result);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

/**
 * POST /api/matieres — Create subject
 * INV-M3-24: requires school:subjects:manage
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthorizedSession('school:subjects:manage');
    const schoolId = await getSchoolId();
    const body = await request.json();
    const parsed = createSubjectSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const created = await createSubject(schoolId, parsed.data, session.user);
    return Response.json(created, { status: 201 });
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
