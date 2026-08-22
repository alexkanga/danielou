import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { classroom, level, academicYear, classroomAssignment, assessment } from '@/lib/db/schema';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { updateClassroomSchema } from '@/lib/validations/scolarite';
import { handleApiError } from '@/lib/data-access/get-school';

type ClassroomDetail = {
  id: string;
  levelId: string;
  academicYearId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  levelName: string;
  yearName: string;
  studentCount: number;
};

// GET /api/classes/[id] — Get a single classroom
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:classrooms:read');
    const { id } = await params;

    // V2: student count via classroom_assignment
    const rows = await db
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
          SELECT count(DISTINCT ca.enrollment_id)::int
          FROM classroom_assignment ca
          INNER JOIN enrollment e ON e.id = ca.enrollment_id
          WHERE ca.classroom_id = classroom.id
          AND ca.status = 'active'
          AND e.status = 'active'
        )`,
      })
      .from(classroom)
      .innerJoin(level, eq(classroom.levelId, level.id))
      .innerJoin(academicYear, eq(classroom.academicYearId, academicYear.id))
      .where(eq(classroom.id, id))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Classe introuvable.' }, { status: 404 });
    }

    const result: ClassroomDetail = rows[0] as ClassroomDetail;
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /api/classes/[id]') as NextResponse;
  }
}

// PUT /api/classes/[id] — Update a classroom
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:classrooms:manage');
    const { id } = await params;

    const [existing] = await db
      .select()
      .from(classroom)
      .where(eq(classroom.id, id))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Classe introuvable.' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateClassroomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = { ...parsed.data };

    if (parsed.data.name && parsed.data.name !== existing.name) {
      const [duplicate] = await db
        .select({ id: classroom.id })
        .from(classroom)
        .where(
          and(
            eq(classroom.levelId, existing.levelId),
            eq(classroom.academicYearId, existing.academicYearId),
            eq(classroom.name, parsed.data.name),
          ),
        )
        .limit(1);

      if (duplicate) {
        return NextResponse.json(
          { error: 'Une classe avec ce nom existe déjà pour ce niveau et cette année.' },
          { status: 409 },
        );
      }
    }

    const [updated] = await db
      .update(classroom)
      .set(updates)
      .where(eq(classroom.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error, 'PUT /api/classes/[id]') as NextResponse;
  }
}

// DELETE /api/classes/[id] — Delete a classroom
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:classrooms:manage');
    const { id } = await params;

    const [existing] = await db
      .select()
      .from(classroom)
      .where(eq(classroom.id, id))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Classe introuvable.' }, { status: 404 });
    }

    // V2: Check via classroom_assignment instead of enrollment.classroom_id
    const [activeAssignment] = await db
      .select({ id: classroomAssignment.id })
      .from(classroomAssignment)
      .where(
        and(
          eq(classroomAssignment.classroomId, id),
          eq(classroomAssignment.status, 'active'),
        ),
      )
      .limit(1);

    if (activeAssignment) {
      return NextResponse.json(
        { error: 'Cette classe contient des élèves affectés et ne peut pas être supprimée.' },
        { status: 409 },
      );
    }

    const [linkedAssessment] = await db
      .select({ id: assessment.id })
      .from(assessment)
      .where(eq(assessment.classroomId, id))
      .limit(1);

    if (linkedAssessment) {
      return NextResponse.json(
        { error: 'Cette classe contient des évaluations et ne peut pas être supprimée.' },
        { status: 409 },
      );
    }

    await db.delete(classroom).where(eq(classroom.id, id));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/classes/[id]') as NextResponse;
  }
}
