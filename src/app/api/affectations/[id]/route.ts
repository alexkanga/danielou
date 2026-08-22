import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { classroomAssignment, enrollment, classroom, level, academicYear, student } from '@/lib/db/schema';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { handleApiError } from '@/lib/data-access/get-school';

// GET /api/affectations/[id] — Get assignment history for an enrollment
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:enrollments:read');
    const { id } = await params;

    const rows = await db
      .select({
        id: classroomAssignment.id,
        enrollmentId: classroomAssignment.enrollmentId,
        classroomId: classroomAssignment.classroomId,
        classroomName: classroom.name,
        levelName: level.name,
        studentFirstName: student.firstName,
        studentLastName: student.lastName,
        startDate: classroomAssignment.startDate,
        endDate: classroomAssignment.endDate,
        status: classroomAssignment.status,
        createdAt: classroomAssignment.createdAt,
        updatedAt: classroomAssignment.updatedAt,
      })
      .from(classroomAssignment)
      .innerJoin(enrollment, eq(enrollment.id, classroomAssignment.enrollmentId))
      .innerJoin(student, eq(student.id, enrollment.studentId))
      .innerJoin(classroom, eq(classroomAssignment.classroomId, classroom.id))
      .innerJoin(level, eq(classroom.levelId, level.id))
      .innerJoin(academicYear, eq(classroom.academicYearId, academicYear.id))
      .where(eq(classroomAssignment.enrollmentId, id))
      .orderBy(desc(classroomAssignment.startDate));

    return NextResponse.json({ data: rows });
  } catch (error) {
    return handleApiError(error, 'GET /api/affectations/[id]') as NextResponse;
  }
}
