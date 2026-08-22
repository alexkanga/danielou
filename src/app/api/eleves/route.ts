import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, or, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { student, enrollment, classroom, level, classroomAssignment } from '@/lib/db/schema';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { createStudentSchema } from '@/lib/validations/scolarite';
import { computePagination } from '@/lib/data-access/pagination';
import { getSchoolId, handleApiError } from '@/lib/data-access/get-school';
import type { PaginatedResult } from '@/lib/data-access/pagination';
import type { Student } from '@/lib/db/schema';

// V2 type — classroom info comes from classroom_assignment, not enrollment.classroom_id
type StudentWithEnrollment = Student & {
  enrollment: { classroomId: string; classroomName: string; levelName: string; academicYearId: string } | null;
};

type StudentResult = PaginatedResult<StudentWithEnrollment>;

// GET /api/eleves
export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:students:read');
    const schoolId = await getSchoolId();

    const { page, limit, search, academicYearId } = parsePaginationWithYear(request.nextUrl.searchParams);

    const conditions = [
      eq(student.schoolId, schoolId),
      search
        ? or(
            sql`student.first_name ILIKE ${`%${search}%`}`,
            sql`student.last_name ILIKE ${`%${search}%`}`,
            sql`student.matricule ILIKE ${`%${search}%`}`,
          )
        : undefined,
    ];
    const whereClause = and(...conditions);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(student)
      .where(whereClause);

    // V2: JOIN through classroom_assignment instead of enrollment.classroom_id
    const rows = await db
      .select({
        id: student.id,
        schoolId: student.schoolId,
        matricule: student.matricule,
        firstName: student.firstName,
        lastName: student.lastName,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
        classroomId: classroom.id,
        classroomName: classroom.name,
        levelName: level.name,
        enrollmentYearId: enrollment.academicYearId,
      })
      .from(student)
      .leftJoin(
        enrollment,
        and(
          eq(enrollment.studentId, student.id),
          eq(enrollment.status, 'active'),
          academicYearId ? eq(enrollment.academicYearId, academicYearId) : undefined,
        ),
      )
      .leftJoin(
        classroomAssignment,
        and(
          eq(classroomAssignment.enrollmentId, enrollment.id),
          eq(classroomAssignment.status, 'active'),
        ),
      )
      .leftJoin(classroom, eq(classroomAssignment.classroomId, classroom.id))
      .leftJoin(level, eq(classroom.levelId, level.id))
      .where(whereClause)
      .orderBy(asc(student.lastName), asc(student.firstName))
      .limit(limit)
      .offset((page - 1) * limit);

    const data: StudentWithEnrollment[] = rows.map((r) => ({
      id: r.id,
      schoolId: r.schoolId,
      matricule: r.matricule,
      firstName: r.firstName,
      lastName: r.lastName,
      dateOfBirth: r.dateOfBirth,
      gender: r.gender,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      enrollment: r.classroomId
        ? {
            classroomId: r.classroomId,
            classroomName: r.classroomName ?? '',
            levelName: r.levelName ?? '',
            academicYearId: r.enrollmentYearId ?? '',
          }
        : null,
    }));

    const result: StudentResult = { data, pagination: computePagination(count, page, limit) };
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /api/eleves') as NextResponse;
  }
}

// POST /api/eleves
export async function POST(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:students:manage');
    const schoolId = await getSchoolId();

    const body = await request.json();
    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { firstName, lastName, dateOfBirth, gender, classroomId, academicYearId } = parsed.data;

    // Auto-generate matricule: DAN-YYYY-NNNN
    const year = new Date().getFullYear();
    const prefix = 'DAN-' + year + '-';
    const [maxRow] = await db
      .select({ max: sql<string>`MAX(matricule)` })
      .from(student)
      .where(sql`student.matricule LIKE ${prefix + '%'}`);

    let seq = 1;
    if (maxRow?.max) {
      const numStr = maxRow.max.replace(prefix, '');
      const num = parseInt(numStr, 10);
      if (!isNaN(num)) seq = num + 1;
    }
    const matricule = prefix + String(seq).padStart(4, '0');

    const today = new Date().toISOString().split('T')[0];

    const [created] = await db.transaction(async (tx) => {
      // 1. Create student
      const [s] = await tx
        .insert(student)
        .values({
          schoolId,
          matricule,
          firstName,
          lastName,
          dateOfBirth: dateOfBirth || null,
          gender: gender || null,
        })
        .returning();

      // 2. Create enrollment (V2: no classroom_id on enrollment)
      const [e] = await tx
        .insert(enrollment)
        .values({
          schoolId,
          studentId: s.id,
          academicYearId,
          status: 'active',
          enrolledAt: today,
        })
        .returning();

      // 3. Create classroom assignment (V2: classroom is here now)
      if (classroomId) {
        await tx
          .insert(classroomAssignment)
          .values({
            enrollmentId: e.id,
            classroomId,
            startDate: today,
            status: 'active',
          });
      }

      return [s];
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/eleves') as NextResponse;
  }
}

// Helper
function parsePaginationWithYear(params: URLSearchParams) {
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '25', 10) || 25));
  const search = params.get('search') || undefined;
  const academicYearId = params.get('academicYearId') || undefined;
  return { page, limit, search, academicYearId };
}
