import { NextRequest, NextResponse } from 'next/server';
import { eq, like, sql, desc, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { academicYear, academicPeriod, school } from '@/lib/db/schema';
import { requireSession } from '@/lib/session';
import { createAcademicYearSchema } from '@/lib/validations/scolarite';
import { parsePagination, computePagination } from '@/lib/data-access/pagination';
import type { PaginatedResult } from '@/lib/data-access/pagination';
import type { AcademicYear } from '@/lib/db/schema';

type AcademicYearListResult = PaginatedResult<AcademicYear>;

// GET /api/annees-scolaires — List academic years with pagination & search
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

    // Build the WHERE conditions
    const whereClause = and(
      eq(academicYear.schoolId, schoolId),
      search ? like(academicYear.name, `%${search}%`) : undefined,
    );

    // Count total items
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(academicYear)
      .where(whereClause);

    // Fetch paginated results ordered by startDate DESC
    const data = await db
      .select()
      .from(academicYear)
      .where(whereClause)
      .orderBy(desc(academicYear.startDate))
      .limit(limit)
      .offset((page - 1) * limit);

    const result: AcademicYearListResult = {
      data,
      pagination: computePagination(count, page, limit),
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }
    console.error('[GET /api/annees-scolaires]', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// POST /api/annees-scolaires — Create an academic year (with optional periods)
export async function POST(request: NextRequest) {
  try {
    await requireSession();

    // Get the first (and only) school's ID
    const [firstSchool] = await db.select({ id: school.id }).from(school).limit(1);
    if (!firstSchool) {
      return NextResponse.json({ error: 'Aucune école configurée.' }, { status: 500 });
    }
    const schoolId = firstSchool.id;

    const body = await request.json();
    const parsed = createAcademicYearSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, startDate, endDate, status, periods } = parsed.data;

    const created = await db.transaction(async (tx) => {
      const [year] = await tx
        .insert(academicYear)
        .values({
          schoolId,
          name,
          startDate,
          endDate,
          status,
        })
        .returning();

      if (periods && periods.length > 0) {
        await tx.insert(academicPeriod).values(
          periods.map((p) => ({
            academicYearId: year.id,
            name: p.name,
            startDate: p.startDate,
            endDate: p.endDate,
            sortOrder: p.sortOrder,
          })),
        );
      }

      return year;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }
    console.error('[POST /api/annees-scolaires]', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
