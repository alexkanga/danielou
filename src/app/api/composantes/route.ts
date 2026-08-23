import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import {
  listComponentsBySubject,
  createComponent,
  pedagogyErrorToResponse,
} from '@/lib/services/pedagogy';
import { createSubjectComponentSchema } from '@/lib/validations/pedagogy';

/**
 * GET /api/composantes?subjectId=xxx — List components by subject
 * INV-M3-24: requires school:components:read
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:components:read');

    const subjectId = request.nextUrl.searchParams.get('subjectId');
    if (!subjectId) {
      return Response.json(
        { error: 'Le paramètre subjectId est requis.' },
        { status: 400 },
      );
    }

    const data = await listComponentsBySubject(subjectId);
    return Response.json({ data });
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

/**
 * POST /api/composantes — Create component
 * INV-M3-24: requires school:components:manage
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthorizedSession('school:components:manage');
    const schoolId = await getSchoolId();
    const body = await request.json();
    const parsed = createSubjectComponentSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const created = await createComponent(schoolId, parsed.data, session.user);
    return Response.json(created, { status: 201 });
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
