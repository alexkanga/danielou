import { NextRequest, NextResponse } from 'next/server';
import { eq, like, sql, asc, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { level } from '@/lib/db/schema';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { createLevelSchema } from '@/lib/validations/scolarite';
import { parsePagination, computePagination } from '@/lib/data-access/pagination';
import { getSchoolId, handleApiError } from '@/lib/data-access/get-school';
import type { PaginatedResult } from '@/lib/data-access/pagination';
import type { Level } from '@/lib/db/schema';

type LevelResult = PaginatedResult<Level>;

// GET /api/niveaux — List niveaux with pagination & search
export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:levels:read');
    const schoolId = await getSchoolId();

    const { page, limit, search } = parsePagination(request.nextUrl.searchParams);

    const whereClause = and(
      eq(level.schoolId, schoolId),
      search ? like(level.name, `%${search}%`) : undefined,
    );

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(level)
      .where(whereClause);

    const data = await db
      .select()
      .from(level)
      .where(whereClause)
      .orderBy(asc(level.sortOrder), asc(level.name))
      .limit(limit)
      .offset((page - 1) * limit);

    const result: LevelResult = {
      data,
      pagination: computePagination(count, page, limit),
    };

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /api/niveaux') as NextResponse;
  }
}

// POST /api/niveaux — Create a niveau
export async function POST(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:levels:manage');
    const schoolId = await getSchoolId();

    const body = await request.json();
    const parsed = createLevelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(level)
      .values({
        schoolId,
        name: parsed.data.name,
        sortOrder: parsed.data.sortOrder,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }
    console.error('[POST /api/niveaux]', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
