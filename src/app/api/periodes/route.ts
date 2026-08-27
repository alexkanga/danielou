import { NextRequest, NextResponse } from 'next/server';
import { eq, and, like, sql, asc, isNull, max } from 'drizzle-orm';
import { db } from '@/lib/db';
import { academicPeriod, level, academicYear } from '@/lib/db/schema';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { createPeriodSchemaWithDates } from '@/lib/validations/scolarite';
import { parsePagination, computePagination } from '@/lib/data-access/pagination';
import { getSchoolId, handleApiError } from '@/lib/data-access/get-school';
import type { PaginatedResult } from '@/lib/data-access/pagination';

type PeriodWithDetails = Omit<typeof academicPeriod.$inferSelect, 'createdAt' | 'updatedAt'> & {
  levelName?: string | null;
  academicYearName?: string | null;
  createdAt: string;
  updatedAt: string;
};

type PeriodListResult = PaginatedResult<PeriodWithDetails>;

// GET /api/periodes — List periods with optional filters
export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:academic_years:read');
    const schoolId = await getSchoolId();
    const { page, limit, search } = parsePagination(request.nextUrl.searchParams);
    const url = request.nextUrl.searchParams;
    const academicYearId = url.get('academicYearId');
    const levelId = url.get('levelId');
    const periodType = url.get('periodType');

    // Build where clause
    const conditions = [];
    if (academicYearId) conditions.push(eq(academicPeriod.academicYearId, academicYearId));
    else {
      // If no year filter, get all school years
      const years = await db
        .select({ id: academicYear.id })
        .from(academicYear)
        .where(eq(academicYear.schoolId, schoolId));
      if (years.length === 0) {
        return NextResponse.json({ data: [], pagination: computePagination(0, page, limit) });
      }
      conditions.push(sql`${academicPeriod.academicYearId} IN ${sql`(${sql.join(years.map(y => sql`${y.id}`), sql`,`)})`}`);
    }
    if (levelId === 'global') conditions.push(isNull(academicPeriod.levelId));
    else if (levelId) conditions.push(eq(academicPeriod.levelId, levelId));
    if (periodType) conditions.push(eq(academicPeriod.periodType, periodType as 'trimester' | 'semester' | 'composition' | 'passage' | 'other'));
    if (search) conditions.push(like(academicPeriod.name, `%${search}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(academicPeriod)
      .where(whereClause);

    const data = await db
      .select({
        period: academicPeriod,
        levelName: level.name,
        academicYearName: academicYear.name,
      })
      .from(academicPeriod)
      .leftJoin(level, eq(academicPeriod.levelId, level.id))
      .leftJoin(academicYear, eq(academicPeriod.academicYearId, academicYear.id))
      .where(whereClause)
      .orderBy(asc(academicPeriod.academicYearId), asc(academicPeriod.sortOrder))
      .limit(limit)
      .offset((page - 1) * limit);

    const result: PeriodListResult = {
      data: data.map((r) => ({
        ...r.period,
        levelName: r.levelName ?? null,
        academicYearName: r.academicYearName ?? null,
        createdAt: r.period.createdAt.toISOString(),
        updatedAt: r.period.updatedAt.toISOString(),
      })),
      pagination: computePagination(count, page, limit),
    };

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /api/periodes') as NextResponse;
  }
}

// POST /api/periodes — Create a period
export async function POST(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:academic_years:manage');
    await getSchoolId();

    const body = await request.json();
    const parsed = createPeriodSchemaWithDates.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { academicYearId, levelId, name, periodType, sortOrder: inputOrder, startDate, endDate, status } = parsed.data;

    // Determine sort_order: max scoped order + 1
    let sortOrder = inputOrder;
    if (!sortOrder) {
      const scopedConditions = [eq(academicPeriod.academicYearId, academicYearId)];
      if (levelId) scopedConditions.push(eq(academicPeriod.levelId, levelId));
      else scopedConditions.push(isNull(academicPeriod.levelId));

      const [maxRow] = await db
        .select({ maxOrder: max(academicPeriod.sortOrder) })
        .from(academicPeriod)
        .where(and(...scopedConditions));
      sortOrder = (maxRow?.maxOrder ?? 0) + 1;
    }

    const [created] = await db
      .insert(academicPeriod)
      .values({
        academicYearId,
        levelId: levelId ?? null,
        name,
        periodType,
        sortOrder,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        status,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/periodes') as NextResponse;
  }
}
