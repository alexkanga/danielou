import { NextRequest, NextResponse } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { handleApiError } from '@/lib/data-access/get-school';
import { getPeriodResults, PeriodResultsError } from '@/lib/services/results/period-results.service';

/**
 * GET /api/period-results?academicYearId=...&classroomId=...&academicPeriodId=...
 *
 * WS-003 Period Results — Pure READ endpoint.
 * No bulletin generation, no DB mutation.
 *
 * All three context parameters are REQUIRED.
 * Server validates Year → Classroom → Period integrity.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:grades:read');

    const url = request.nextUrl.searchParams;
    const academicYearId = url.get('academicYearId');
    const classroomId = url.get('classroomId');
    const academicPeriodId = url.get('academicPeriodId');

    // All three context levels are REQUIRED (WS-003 §3)
    if (!academicYearId) {
      return NextResponse.json(
        { error: 'Le paramètre academicYearId est requis.', code: 'MISSING_YEAR' },
        { status: 400 },
      );
    }
    if (!classroomId) {
      return NextResponse.json(
        { error: 'Le paramètre classroomId est requis.', code: 'MISSING_CLASSROOM' },
        { status: 400 },
      );
    }
    if (!academicPeriodId) {
      return NextResponse.json(
        { error: 'Le paramètre academicPeriodId est requis.', code: 'MISSING_PERIOD' },
        { status: 400 },
      );
    }

    const results = await getPeriodResults(academicYearId, classroomId, academicPeriodId);

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof PeriodResultsError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.httpStatus },
      );
    }
    return handleApiError(error, 'GET /api/period-results') as NextResponse;
  }
}
