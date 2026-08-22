import { NextRequest, NextResponse } from 'next/server';
import { eq, like, sql, desc, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { academicYear, academicPeriod } from '@/lib/db/schema';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { createAcademicYearSchema } from '@/lib/validations/scolarite';
import { parsePagination, computePagination } from '@/lib/data-access/pagination';
import { getSchoolId, handleApiError } from '@/lib/data-access/get-school';
import type { PaginatedResult } from '@/lib/data-access/pagination';
import type { AcademicYear } from '@/lib/db/schema';

type AcademicYearListResult = PaginatedResult<AcademicYear>;

// GET /api/annees-scolaires — List academic years with pagination & search
export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:academic_years:read');
    const schoolId = await getSchoolId();

    const { page, limit, search } = parsePagination(request.nextUrl.searchParams);

    const whereClause = and(
      eq(academicYear.schoolId, schoolId),
      search ? like(academicYear.name, `%${search}%`) : undefined,
    );

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(academicYear)
      .where(whereClause);

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
    return handleApiError(error, 'GET /api/annees-scolaires') as NextResponse;
  }
}

// POST /api/annees-scolaires — Create an academic year (with optional periods)
export async function POST(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:academic_years:manage');
    const schoolId = await getSchoolId();

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
    return handleApiError(error, 'POST /api/annees-scolaires') as NextResponse;
  }
}
