import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { classroomAssignment, enrollment, classroom, level, academicYear, student } from '@/lib/db/schema';
import { requireSession } from '@/lib/session';
import { getSchoolId, handleApiError } from '@/lib/data-access/get-school';
import { assignEnrollmentToClassroom } from '@/lib/services/classroom-assignment';
import { z } from 'zod';

// GET /api/affectations — List classroom assignments
export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const schoolId = await getSchoolId();

    const url = request.nextUrl.searchParams;
    const classroomId = url.get('classroomId');
    const academicYearId = url.get('academicYearId');
    const status = url.get('status') || 'active';
    const page = Math.max(1, parseInt(url.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.get('limit') || '25', 10)));

    const baseConditions = [
      eq(classroomAssignment.status, status as 'active'),
      eq(student.schoolId, schoolId),
    ];

    if (classroomId) {
      baseConditions.push(eq(classroomAssignment.classroomId, classroomId));
    }

    if (academicYearId) {
      baseConditions.push(eq(enrollment.academicYearId, academicYearId));
    }

    const whereClause = and(...baseConditions);

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(classroomAssignment)
      .innerJoin(enrollment, eq(enrollment.id, classroomAssignment.enrollmentId))
      .innerJoin(student, eq(student.id, enrollment.studentId))
      .where(whereClause);

    const rows = await db
      .select({
        id: classroomAssignment.id,
        enrollmentId: classroomAssignment.enrollmentId,
        classroomId: classroomAssignment.classroomId,
        classroomName: classroom.name,
        levelName: level.name,
        yearName: academicYear.name,
        studentFirstName: student.firstName,
        studentLastName: student.lastName,
        studentMatricule: student.matricule,
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
      .where(whereClause)
      .orderBy(desc(classroomAssignment.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/affectations') as NextResponse;
  }
}

// POST /api/affectations — Assign enrollment to classroom
const assignSchema = z.object({
  enrollmentId: z.string().uuid(),
  classroomId: z.string().uuid(),
  startDate: z.string().min(1, 'La date de début est requise'),
});

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const schoolId = await getSchoolId();

    const body = await request.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const created = await assignEnrollmentToClassroom({
      ...parsed.data,
      actorSchoolId: schoolId,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'AssignmentError') {
      const e = error as unknown as { message: string; code: string };
      const statusMap: Record<string, number> = {
        ENROLLMENT_NOT_FOUND: 404,
        CLASSROOM_NOT_FOUND: 404,
        CROSS_SCHOOL: 403,
        CROSS_YEAR: 403,
        ACTIVE_ASSIGNMENT_EXISTS: 409,
        DATE_OVERLAP: 409,
      };
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: statusMap[e.code] || 500 },
      );
    }
    return handleApiError(error, 'POST /api/affectations') as NextResponse;
  }
}
