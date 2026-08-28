import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import { pedagogyErrorToResponse } from '@/lib/services/pedagogy';
import { getCompositionClassResults } from '@/lib/services/results/composition-data.service';
import { z } from 'zod';

const compositionQuerySchema = z.object({
  academicPeriodId: z.string().min(1, 'academicPeriodId requis'),
  classroomId: z.string().min(1, 'classroomId requis'),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:grades:read');
    await getSchoolId();

    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = compositionQuerySchema.safeParse(params);
    if (!parsed.success) {
      return Response.json(
        { error: 'Paramètres invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { academicPeriodId, classroomId } = parsed.data;
    const result = await getCompositionClassResults({ academicPeriodId, classroomId });
    return Response.json(result);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
