import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { academicPeriod, assessment, reportCard } from '@/lib/db/schema';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { updatePeriodSchema } from '@/lib/validations/scolarite';
import { handleApiError } from '@/lib/data-access/get-school';

// GET /api/periodes/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:academic_years:read');
    const { id } = await params;

    const [found] = await db.select().from(academicPeriod).where(eq(academicPeriod.id, id)).limit(1);
    if (!found) {
      return NextResponse.json({ error: 'Période introuvable.' }, { status: 404 });
    }

    return NextResponse.json(found);
  } catch (error) {
    return handleApiError(error, 'GET /api/periodes/[id]') as NextResponse;
  }
}

// PUT /api/periodes/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:academic_years:manage');
    const { id } = await params;

    const [existing] = await db.select().from(academicPeriod).where(eq(academicPeriod.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Période introuvable.' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updatePeriodSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = { ...parsed.data };
    if (updates.levelId === undefined || updates.levelId === '') {
      updates.levelId = null;
    }
    // Convert empty strings to null for dates
    if (updates.startDate === '') updates.startDate = null;
    if (updates.endDate === '') updates.endDate = null;

    const [updated] = await db
      .update(academicPeriod)
      .set(updates)
      .where(eq(academicPeriod.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error, 'PUT /api/periodes/[id]') as NextResponse;
  }
}

// DELETE /api/periodes/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:academic_years:manage');
    const { id } = await params;

    const [existing] = await db.select().from(academicPeriod).where(eq(academicPeriod.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Période introuvable.' }, { status: 404 });
    }

    // Check linked assessments
    const [assessmentsExist] = await db
      .select({ exists: sql<boolean>`exists(select 1 from assessment where academic_period_id = ${id})` })
      .from(assessment)
      .where(eq(assessment.academicPeriodId, id))
      .limit(1);

    if (assessmentsExist?.exists) {
      return NextResponse.json(
        { error: 'Cette période contient des évaluations et ne peut pas être supprimée. Supprimez d\'abord les évaluations associées.' },
        { status: 409 },
      );
    }

    // Check linked report cards
    const [reportCardsExist] = await db
      .select({ exists: sql<boolean>`exists(select 1 from report_card where academic_period_id = ${id})` })
      .from(reportCard)
      .where(eq(reportCard.academicPeriodId, id))
      .limit(1);

    if (reportCardsExist?.exists) {
      return NextResponse.json(
        { error: 'Cette période contient des bulletins et ne peut pas être supprimée.' },
        { status: 409 },
      );
    }

    await db.delete(academicPeriod).where(eq(academicPeriod.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/periodes/[id]') as NextResponse;
  }
}
