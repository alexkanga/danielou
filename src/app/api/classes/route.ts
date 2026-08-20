import { NextRequest, NextResponse } from 'next/server';
import { eq, like, sql, asc, and, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { classroom, level, academicYear } from '@/lib/db/schema';
import { requireSession } from '@/lib/session';
import { createClassroomSchema } from '@/lib/validations/scolarite';
import { parsePagination, computePagination } from '@/lib/data-access/pagination';
import { getSchoolId, handleApiError } from '@/lib/data-access/get-school';
import type { PaginatedResult } from '@/lib/data-access/pagination';
import type { Classroom } from '@/lib/db/schema';

type ClassroomListItem = Classroom & {
  levelName: string;
  yearName: string;
  studentCount: number;
};

type ClassroomListResult = PaginatedResult<ClassroomListItem>;

// GET /api/classes — List classrooms with pagination & search
export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const schoolId = await getSchoolId();

    const { page, limit, search } = parsePagination(request.nextUrl.searchParams);

    const searchCondition = search
      ? or(
          like(classroom.name, `%${search}%`),
          like(level.name, `%${search}%`),
        )
      : undefined;

    const whereClause = and(
      eq(level.schoolId, schoolId),
      searchCondition,
    );

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(classroom)
      .innerJoin(level, eq(classroom.levelId, level.id))
      .innerJoin(academicYear, eq(classroom.academicYearId, academicYear.id))
      .where(whereClause);

    const data = await db
      .select({
        id: classroom.id,
        levelId: classroom.levelId,
        academicYearId: classroom.academicYearId,
        name: classroom.name,
        createdAt: classroom.createdAt,
        updatedAt: classroom.updatedAt,
        levelName: level.name,
        yearName: academicYear.name,
        studentCount: sql<number>`(
          SELECT count(*)::int
          FROM enrollment
          WHERE enrollment.classroom_id = classroom.id
          AND enrollment.status = 'active'
        )`,
      })
      .from(classroom)
      .innerJoin(level, eq(classroom.levelId, level.id))
      .innerJoin(academicYear, eq(classroom.academicYearId, academicYear.id))
      .where(whereClause)
      .orderBy(asc(level.sortOrder), asc(classroom.name))
      .limit(limit)
      .offset((page - 1) * limit);

    const result: ClassroomListResult = {
      data: data as ClassroomListItem[],
      pagination: computePagination(count, page, limit),
    };

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /api/classes') as NextResponse;
  }
}

// POST /api/classes — Create a classroom
export async function POST(request: NextRequest) {
  try {
    await requireSession();

    const body = await request.json();
    const parsed = createClassroomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, levelId, academicYearId } = parsed.data;

    const [duplicate] = await db
      .select({ id: classroom.id })
      .from(classroom)
      .where(
        and(
          eq(classroom.levelId, levelId),
          eq(classroom.academicYearId, academicYearId),
          eq(classroom.name, name),
        ),
      )
      .limit(1);

    if (duplicate) {
      return NextResponse.json(
        { error: 'Une classe avec ce nom existe déjà pour ce niveau et cette année.' },
        { status: 409 },
      );
    }

    const [created] = await db
      .insert(classroom)
      .values({ name, levelId, academicYearId })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/classes') as NextResponse;
  }
}
