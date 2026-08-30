import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import { recordFinalDecision } from '@/lib/services/results/annual-decision.service';
import { pedagogyErrorToResponse } from '@/lib/services/pedagogy';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthorizedSession('school:annual_results:manage');
    const schoolId = await getSchoolId();

    const body = await request.json();
    const { enrollmentId, finalDecision, justification } = body;

    if (!enrollmentId || !finalDecision) {
      return Response.json(
        { error: 'enrollmentId et finalDecision sont requis.' },
        { status: 400 },
      );
    }

    const validDecisions = ['ADMITTED', 'REPEAT', 'ADMITTED_BY_DEROGATION'];
    if (!validDecisions.includes(finalDecision)) {
      return Response.json(
        { error: `finalDecision doit être l\'un de: ${validDecisions.join(', ')}` },
        { status: 400 },
      );
    }

    const result = await recordFinalDecision({
      enrollmentId,
      finalDecision: finalDecision as 'ADMITTED' | 'REPEAT' | 'ADMITTED_BY_DEROGATION',
      justification: justification ?? null,
      actor: { id: session.user.id, isGhost: session.user.isGhost, platformRole: session.user.platformRole },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      schoolId,
    });

    return Response.json(result);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
