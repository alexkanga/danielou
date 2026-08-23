import { NextRequest } from 'next/server';
import { requireAuthorizedSession, requireAssessmentScope } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import { setGrade, bulkSetGrades, listGradesByAssessment, getAssessmentScope, pedagogyErrorToResponse } from '@/lib/services/pedagogy';
import { setGradeSchema, bulkSetGradesSchema } from '@/lib/validations/pedagogy';

export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:grades:read');
    const assessmentId = request.nextUrl.searchParams.get('assessmentId');
    if (!assessmentId) {
      return Response.json({ error: 'assessmentId requis' }, { status: 400 });
    }
    const result = await listGradesByAssessment(assessmentId);
    return Response.json(result);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthorizedSession('school:grades:manage');
    const schoolId = await getSchoolId();
    const body = await request.json();

    const assessmentId = body.assessmentId;
    if (!assessmentId) return Response.json({ error: 'assessmentId requis' }, { status: 400 });

    // Teacher scope: verify teacher is assigned to this assessment's classroom+subject+year
    const scope = await getAssessmentScope(assessmentId);
    await requireAssessmentScope(session, { schoolId, ...scope });

    // Detect bulk vs single
    if (body.grades && Array.isArray(body.grades)) {
      const parsed = bulkSetGradesSchema.safeParse(body);
      if (!parsed.success) {
        return Response.json({ error: 'Données invalides.', details: parsed.error.flatten().fieldErrors }, { status: 400 });
      }
      const result = await bulkSetGrades(assessmentId, schoolId, parsed.data, session.user);
      return Response.json(result);
    }

    // Single grade
    const gradeData = { enrollmentId: body.enrollmentId, rawValue: body.rawValue, status: body.status, comment: body.comment };
    const parsed = setGradeSchema.safeParse(gradeData);
    if (!parsed.success) {
      return Response.json({ error: 'Données invalides.', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const result = await setGrade(assessmentId, schoolId, parsed.data, session.user);
    return Response.json(result);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
