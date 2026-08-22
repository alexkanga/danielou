import { NextRequest, NextResponse } from 'next/server';
import { closeClassroomAssignment } from '@/lib/services/classroom-assignment';
import { requireSession } from '@/lib/session';
import { getSchoolId, handleApiError } from '@/lib/data-access/get-school';
import { z } from 'zod';

// POST /api/affectations/[id]/close — Close an assignment
const closeSchema = z.object({
  endDate: z.string().min(1, 'La date de fin est requise'),
  newStatus: z.enum(['completed', 'withdrawn', 'cancelled']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const schoolId = await getSchoolId();
    const { id } = await params;

    const body = await request.json();
    const parsed = closeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updated = await closeClassroomAssignment({
      assignmentId: id,
      endDate: parsed.data.endDate,
      newStatus: parsed.data.newStatus,
      actorSchoolId: schoolId,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'AssignmentError') {
      const e = error as unknown as { message: string; code: string };
      const statusMap: Record<string, number> = {
        ASSIGNMENT_NOT_FOUND: 404,
        NOT_ACTIVE: 409,
      };
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: statusMap[e.code] || 500 },
      );
    }
    return handleApiError(error, 'POST /api/affectations/[id]/close') as NextResponse;
  }
}
