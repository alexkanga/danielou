import { NextRequest, NextResponse } from 'next/server';
import { transferEnrollmentToClassroom } from '@/lib/services/classroom-assignment';
import { requireSession } from '@/lib/session';
import { getSchoolId, handleApiError } from '@/lib/data-access/get-school';
import { z } from 'zod';

// POST /api/affectations/transfer — Transfer a student between classrooms
const transferSchema = z.object({
  enrollmentId: z.string().uuid(),
  newClassroomId: z.string().uuid(),
  effectiveDate: z.string().min(1, 'La date d\'effet est requise'),
});

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const schoolId = await getSchoolId();

    const body = await request.json();
    const parsed = transferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const result = await transferEnrollmentToClassroom({
      ...parsed.data,
      actorSchoolId: schoolId,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'AssignmentError') {
      const e = error as unknown as { message: string; code: string };
      const statusMap: Record<string, number> = {
        NO_ACTIVE_ASSIGNMENT: 409,
        CLASSROOM_NOT_FOUND: 404,
        CROSS_SCHOOL: 403,
        CROSS_YEAR: 403,
        SAME_CLASSROOM: 409,
        DATE_OVERLAP: 409,
      };
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: statusMap[e.code] || 500 },
      );
    }
    return handleApiError(error, 'POST /api/affectations/transfer') as NextResponse;
  }
}
