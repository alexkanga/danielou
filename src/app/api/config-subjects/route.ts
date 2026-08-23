import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { listConfigSubjects, createConfigSubject, pedagogyErrorToResponse } from '@/lib/services/pedagogy';
import { createConfigSubjectSchema } from '@/lib/validations/pedagogy';

/**
 * GET /api/config-subjects?configId=xxx — List config subjects
 * INV-M3-24: requires school:pedagogical_config:read
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:pedagogical_config:read');

    const configId = request.nextUrl.searchParams.get('configId');
    if (!configId) {
      return Response.json(
        { error: 'Le paramètre configId est requis.' },
        { status: 400 },
      );
    }

    const data = await listConfigSubjects(configId);
    return Response.json({ data });
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

/**
 * POST /api/config-subjects — Create config subject
 * INV-M3-24: requires school:pedagogical_config:manage
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthorizedSession('school:pedagogical_config:manage');
    const { getSchoolId } = await import('@/lib/data-access/get-school');
    const schoolId = await getSchoolId();
    const body = await request.json();

    const { configId, ...subjectInput } = body;
    if (!configId) {
      return Response.json(
        { error: 'Le champ configId est requis.' },
        { status: 400 },
      );
    }

    const parsed = createConfigSubjectSchema.safeParse(subjectInput);

    if (!parsed.success) {
      return Response.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const created = await createConfigSubject(configId, schoolId, parsed.data, session.user);
    return Response.json(created, { status: 201 });
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
