import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { student, enrollment, classroom, level, classroomAssignment } from '@/lib/db/schema';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { updateStudentSchema } from '@/lib/validations/scolarite';
import { handleApiError } from '@/lib/data-access/get-school';
import type { Student } from '@/lib/db/schema';

// V2 type

type StudentWithEnrollment = Student & {
  enrollment: { classroomId: string; classroomName: string; levelName: string; academicYearId: string } | null;
};

// GET /api/eleves/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:students:read');
    const { id } = await params;

    // V2: JOIN through classroom_assignment
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
        classroomId: classroom.id,
        classroomName: classroom.name,
        levelName: level.name,
        enrollmentYearId: enrollment.academicYearId,
      })
      .from(student)
      .leftJoin(
        enrollment,
        and(eq(enrollment.studentId, student.id), eq(enrollment.status, 'active')),
      )
      .leftJoin(
        classroomAssignment,
        and(
          eq(classroomAssignment.enrollmentId, enrollment.id),
          eq(classroomAssignment.status, 'active'),
        ),
      )
      .leftJoin(classroom, eq(classroomAssignment.classroomId, classroom.id))
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
    return handleApiError(error, 'GET /api/eleves/[id]') as NextResponse;
  }
}

// PUT /api/eleves/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:students:manage');
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
    return handleApiError(error, 'PUT /api/eleves/[id]') as NextResponse;
  }
}

// DELETE /api/eleves/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:students:manage');
    const { id } = await params;

    const [existing] = await db.select().from(student).where(eq(student.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Élève non trouvé.' }, { status: 404 });
    }

    // V2: enrollment → student FK is now RESTRICT.
    // Must check for active enrollments first.
    const [activeEnrollment] = await db
      .select({ id: enrollment.id })
      .from(enrollment)
      .where(eq(enrollment.studentId, id))
      .limit(1);

    if (activeEnrollment) {
      return NextResponse.json(
        { error: 'Cet élève a des inscriptions et ne peut pas être supprimé directement. Annulez d\'abord les inscriptions.' },
        { status: 409 },
      );
    }

    await db.delete(student).where(eq(student.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/eleves/[id]') as NextResponse;
  }
}
