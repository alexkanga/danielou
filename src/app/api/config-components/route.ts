import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { listConfigComponents, createConfigComponent, pedagogyErrorToResponse } from '@/lib/services/pedagogy';
import { createConfigComponentSchema } from '@/lib/validations/pedagogy';

/**
 * GET /api/config-components?configSubjectId=xxx — List config components
 * INV-M3-24: requires school:pedagogical_config:read
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:pedagogical_config:read');

    const configSubjectId = request.nextUrl.searchParams.get('configSubjectId');
    if (!configSubjectId) {
      return Response.json(
        { error: 'Le paramètre configSubjectId est requis.' },
        { status: 400 },
      );
    }

    const data = await listConfigComponents(configSubjectId);
    return Response.json({ data });
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

/**
 * POST /api/config-components — Create config component
 * INV-M3-24: requires school:pedagogical_config:manage
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthorizedSession('school:pedagogical_config:manage');
    const { getSchoolId } = await import('@/lib/data-access/get-school');
    const schoolId = await getSchoolId();
    const body = await request.json();

    const { configSubjectId, ...componentInput } = body;
    if (!configSubjectId) {
      return Response.json(
        { error: 'Le champ configSubjectId est requis.' },
        { status: 400 },
      );
    }

    const parsed = createConfigComponentSchema.safeParse(componentInput);

    if (!parsed.success) {
      return Response.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const created = await createConfigComponent(configSubjectId, schoolId, parsed.data, session.user);
    return Response.json(created, { status: 201 });
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
