import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import {
  transitionReportCard,
  bulkTransitionReportCards,
  ReportCardError,
} from '@/lib/services/results/report-card.service';

type Permission = import('@/lib/types/rbac').Permission;

function reportCardErrorToResponse(error: unknown): Response {
  if (error instanceof ReportCardError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.httpStatus });
  }
  if (error instanceof Error) {
    if (error.message === 'UNAUTHORIZED') return Response.json({ error: 'Non autorisé.' }, { status: 401 });
    if (error.message === 'FORBIDDEN') return Response.json({ error: 'Accès refusé.' }, { status: 403 });
  }
  console.error('[bulletins/transition]', error);
  return Response.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
}

/**
 * POST /api/bulletins/[id]/transition
 * Transition a single report card to a new status.
 *
 * Permission mapping:
 *   draft → ready:       school:report_cards:prepare (teacher)
 *   ready → validated:   school:report_cards:validate (direction)
 *   ready → draft:       school:report_cards:prepare (teacher)
 *   validated → published: school:report_cards:publish (direction/admin)
 *   validated → ready:    school:report_cards:validate (direction)
 */
const STATUS_PERMISSION: Record<string, Permission> = {
  ready: 'school:report_cards:prepare' as Permission,
  validated: 'school:report_cards:validate' as Permission,
  published: 'school:report_cards:publish' as Permission,
  draft: 'school:report_cards:prepare' as Permission,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus || !STATUS_PERMISSION[newStatus]) {
      return Response.json(
        { error: `Statut invalide. Valeurs attendues: ${Object.keys(STATUS_PERMISSION).join(', ')}` },
        { status: 400 },
      );
    }

    // Use the HIGHEST required permission for this transition
    const session = await requireAuthorizedSession(STATUS_PERMISSION[newStatus]);

    // If body has classroomId + academicPeriodId, do bulk
    if (body.classroomId && body.academicPeriodId) {
      const result = await bulkTransitionReportCards(
        body.academicPeriodId,
        body.classroomId,
        newStatus,
        { id: session.user.id, isGhost: session.user.isGhost },
      );
      return Response.json(result);
    }

    // Single card transition
    const updated = await transitionReportCard(
      id,
      newStatus,
      { id: session.user.id, isGhost: session.user.isGhost },
    );
    return Response.json(updated);
  } catch (error) {
    return reportCardErrorToResponse(error);
  }
}
