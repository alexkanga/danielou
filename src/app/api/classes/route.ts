import { NextRequest, NextResponse } from 'next/server';
import { eq, like, sql, asc, and, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { classroom, level, academicYear, school } from '@/lib/db/schema';
import { requireSession } from '@/lib/session';
import { createClassroomSchema } from '@/lib/validations/scolarite';
import { parsePagination, computePagination } from '@/lib/data-access/pagination';
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

    // Get the first (and only) school's ID
    const [firstSchool] = await db.select({ id: school.id }).from(school).limit(1);
    if (!firstSchool) {
      return NextResponse.json({ error: 'Aucune école configurée.' }, { status: 500 });
    }
    const schoolId = firstSchool.id;

    const { page, limit, search } = parsePagination(request.nextUrl.searchParams);

    // Build the WHERE conditions — filter by school via level, plus optional search
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

    // Count total items (join needed for search on level.name and school filter)
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(classroom)
      .innerJoin(level, eq(classroom.levelId, level.id))
      .innerJoin(academicYear, eq(classroom.academicYearId, academicYear.id))
      .where(whereClause);

    // Fetch paginated results with joins and studentCount subquery
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
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }
    console.error('[GET /api/classes]', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
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

    // Check uniqueness: same (levelId, academicYearId, name)
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
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }
    console.error('[POST /api/classes]', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
