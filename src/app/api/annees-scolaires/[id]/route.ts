import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { academicYear, academicPeriod, classroom, enrollment } from '@/lib/db/schema';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { updateAcademicYearSchema } from '@/lib/validations/scolarite';
import { handleApiError, getSchoolId } from '@/lib/data-access/get-school';

// GET /api/annees-scolaires/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:academic_years:read');
    const { id } = await params;

    const [found] = await db.select().from(academicYear).where(eq(academicYear.id, id)).limit(1);
    if (!found) {
      return NextResponse.json({ error: 'Année scolaire introuvable.' }, { status: 404 });
    }

    return NextResponse.json(found);
  } catch (error) {
    return handleApiError(error, 'GET /api/annees-scolaires/[id]') as NextResponse;
  }
}

// PUT /api/annees-scolaires/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:academic_years:manage');
    const { id } = await params;

    const [existing] = await db.select().from(academicYear).where(eq(academicYear.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Année scolaire introuvable.' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateAcademicYearSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = { ...parsed.data };

    if (parsed.data.status === 'active') {
      const schoolId = await getSchoolId();
      await db
        .update(academicYear)
        .set({ status: 'closed' })
        .where(
          and(
            eq(academicYear.schoolId, schoolId),
            eq(academicYear.status, 'active'),
          ),
        );
    }

    const [updated] = await db
      .update(academicYear)
      .set(updates)
      .where(eq(academicYear.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error, 'PUT /api/annees-scolaires/[id]') as NextResponse;
  }
}

// DELETE /api/annees-scolaires/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:academic_years:manage');
    const { id } = await params;

    const [existing] = await db.select().from(academicYear).where(eq(academicYear.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Année scolaire introuvable.' }, { status: 404 });
    }

    // Check linked periods
    const linkedPeriods = await db
      .select({ id: academicPeriod.id })
      .from(academicPeriod)
      .where(eq(academicPeriod.academicYearId, id))
      .limit(1);

    if (linkedPeriods.length > 0) {
      return NextResponse.json(
        { error: 'Cette année scolaire contient des périodes d\'évaluation et ne peut pas être supprimée.' },
        { status: 409 },
      );
    }

    // Check linked classrooms
    const linkedClassrooms = await db
      .select({ id: classroom.id })
      .from(classroom)
      .where(eq(classroom.academicYearId, id))
      .limit(1);

    if (linkedClassrooms.length > 0) {
      return NextResponse.json(
        { error: 'Cette année scolaire est utilisée par des classes et ne peut pas être supprimée.' },
        { status: 409 },
      );
    }

    // Check linked enrollments
    const linkedEnrollments = await db
      .select({ id: enrollment.id })
      .from(enrollment)
      .where(eq(enrollment.academicYearId, id))
      .limit(1);

    if (linkedEnrollments.length > 0) {
      return NextResponse.json(
        { error: 'Cette année scolaire est utilisée par des inscriptions et ne peut pas être supprimée.' },
        { status: 409 },
      );
    }

    await db.delete(academicYear).where(eq(academicYear.id, id));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/annees-scolaires/[id]') as NextResponse;
  }
}
