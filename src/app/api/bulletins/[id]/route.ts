import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import {
  getReportCard,
  updateReportCardComments,
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
  console.error('[bulletins]', error);
  return Response.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
}

/**
 * GET /api/bulletins/[id]
 * Get a single report card with items and components.
 * Permission: school:report_cards:read
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:report_cards:read' as Permission);
    const { id } = await params;
    const card = await getReportCard(id);
    return Response.json(card);
  } catch (error) {
    return reportCardErrorToResponse(error);
  }
}

/**
 * PATCH /api/bulletins/[id]
 * Update comments on a report card (DRAFT/READY only).
 * Permission: school:report_cards:prepare
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuthorizedSession('school:report_cards:prepare' as Permission);
    const { id } = await params;
    const body = await request.json();

    const { teacherComment, directorComment, conductComment } = body;
    if (teacherComment === undefined && directorComment === undefined && conductComment === undefined) {
      return Response.json({ error: 'Aucun champ à mettre à jour.' }, { status: 400 });
    }

    const updated = await updateReportCardComments(id, { teacherComment, directorComment, conductComment }, {
      id: session.user.id,
      isGhost: session.user.isGhost,
    });
    return Response.json(updated);
  } catch (error) {
    return reportCardErrorToResponse(error);
  }
}
