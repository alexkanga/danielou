import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import { parsePagination } from '@/lib/data-access/pagination';
import { listConfigs, createConfig, pedagogyErrorToResponse } from '@/lib/services/pedagogy';
import { createPedagogicalConfigSchema } from '@/lib/validations/pedagogy';

/**
 * GET /api/regles-calcul — List pedagogical configs
 * INV-M3-24: requires school:pedagogical_config:read
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:pedagogical_config:read');
    const schoolId = await getSchoolId();
    const { page, limit } = parsePagination(request.nextUrl.searchParams);
    const levelId = request.nextUrl.searchParams.get('levelId') || undefined;
    const academicYearId = request.nextUrl.searchParams.get('academicYearId') || undefined;

    const result = await listConfigs({
      schoolId,
      page,
      limit,
      levelId,
      academicYearId,
    });
    return Response.json(result);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

/**
 * POST /api/regles-calcul — Create a new DRAFT config
 * INV-M3-24: requires school:pedagogical_config:manage
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthorizedSession('school:pedagogical_config:manage');
    const schoolId = await getSchoolId();
    const body = await request.json();
    const parsed = createPedagogicalConfigSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const created = await createConfig(schoolId, parsed.data, session.user);
    return Response.json(created, { status: 201 });
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
