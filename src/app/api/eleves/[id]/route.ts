import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { student, enrollment, classroom, level } from '@/lib/db/schema';
import { requireSession } from '@/lib/session';
import { updateStudentSchema } from '@/lib/validations/scolarite';
import type { Student } from '@/lib/db/schema';

type StudentWithEnrollment = Student & {
  enrollment: { classroomId: string; classroomName: string; levelName: string; academicYearId: string } | null;
};

// GET /api/eleves/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await params;

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
        classroomId: enrollment.classroomId,
        classroomName: classroom.name,
        levelName: level.name,
        enrollmentYearId: enrollment.academicYearId,
      })
      .from(student)
      .leftJoin(
        enrollment,
        and(eq(enrollment.studentId, student.id), eq(enrollment.status, 'active')),
      )
      .leftJoin(classroom, eq(enrollment.classroomId, classroom.id))
      .leftJoin(level, eq(classroom.levelId, level.id))
      .where(eq(student.id, id))
      .limit(1);

    if (!rows.length) {
      return NextResponse.json({ error: 'Élève non trouvé.' }, { status: 404 });
    }

    const r = rows[0];
    const result: StudentWithEnrollment = {
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
        ? { classroomId: r.classroomId, classroomName: r.classroomName ?? '', levelName: r.levelName ?? '', academicYearId: r.enrollmentYearId ?? '' }
        : null,
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }
    console.error('[GET /api/eleves/[id]]', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// PUT /api/eleves/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await params;

    const [existing] = await db.select().from(student).where(eq(student.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Élève non trouvé.' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.firstName !== undefined) updates.firstName = parsed.data.firstName;
    if (parsed.data.lastName !== undefined) updates.lastName = parsed.data.lastName;
    if (parsed.data.dateOfBirth !== undefined) updates.dateOfBirth = parsed.data.dateOfBirth || null;
    if (parsed.data.gender !== undefined) updates.gender = parsed.data.gender || null;

    const [updated] = await db
      .update(student)
      .set(updates)
      .where(eq(student.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }
    console.error('[PUT /api/eleves/[id]]', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// DELETE /api/eleves/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await params;

    const [existing] = await db.select().from(student).where(eq(student.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Élève non trouvé.' }, { status: 404 });
    }

    // Cascade delete handles enrollments
    await db.delete(student).where(eq(student.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }
    console.error('[DELETE /api/eleves/[id]]', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
