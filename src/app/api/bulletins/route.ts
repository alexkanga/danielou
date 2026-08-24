import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { generateReportCards } from '@/lib/services/results/report-card.service';
import { ReportCardError } from '@/lib/services/results/report-card.service';

type Permission = import('@/lib/types/rbac').Permission;

function reportCardErrorToResponse(error: unknown): Response {
  if (error instanceof ReportCardError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.httpStatus });
  }
  if (error instanceof Error) {
    if (error.message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Non autorisé.' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return Response.json({ error: 'Accès refusé.' }, { status: 403 });
    }
  }
  console.error('[bulletins]', error);
  return Response.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
}

/**
 * POST /api/bulletins
 * Generate report cards for a classroom + period.
 * Permission: school:report_cards:prepare
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthorizedSession('school:report_cards:prepare' as Permission);
    const body = await request.json();

    const { classroomId, academicPeriodId } = body;
    if (!classroomId || !academicPeriodId) {
      return Response.json(
        { error: 'classroomId et academicPeriodId sont requis.' },
        { status: 400 },
      );
    }

    const result = await generateReportCards({
      classroomId,
      academicPeriodId,
      actor: { id: session.user.id, isGhost: session.user.isGhost },
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    return reportCardErrorToResponse(error);
  }
}
