import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, desc, or as drizzleOr, ilike } from 'drizzle-orm';
import { db } from '@/lib/db';
import { enrollment, student, academicYear } from '@/lib/db/schema';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId, handleApiError } from '@/lib/data-access/get-school';
import { z } from 'zod';

// GET /api/inscriptions — List enrollments
export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:enrollments:read');
    const schoolId = await getSchoolId();
    const url = request.nextUrl.searchParams;
    const academicYearId = url.get('academicYearId');
    const status = url.get('status') || 'active';
    const search = url.get('search');
    const page = Math.max(1, parseInt(url.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.get('limit') || '25', 10)));

    const conditions = [
      eq(student.schoolId, schoolId),
      eq(enrollment.status, status as 'active'),
    ];
    if (academicYearId) conditions.push(eq(enrollment.academicYearId, academicYearId));
    if (search) {
      conditions.push(
        drizzleOr(
          ilike(student.firstName, `%${search}%`),
          ilike(student.lastName, `%${search}%`),
        )!,
      );
    }

    const whereClause = and(...conditions)!;
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(enrollment)
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .where(whereClause);

    const rows = await db
      .select({
        id: enrollment.id,
        studentId: enrollment.studentId,
        academicYearId: enrollment.academicYearId,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        exitedAt: enrollment.exitedAt,
        createdAt: enrollment.createdAt,
        updatedAt: enrollment.updatedAt,
        studentFirstName: student.firstName,
        studentLastName: student.lastName,
        studentMatricule: student.matricule,
        yearName: academicYear.name,
      })
      .from(enrollment)
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .innerJoin(academicYear, eq(enrollment.academicYearId, academicYear.id))
      .where(whereClause)
      .orderBy(desc(enrollment.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/inscriptions') as NextResponse;
  }
}

// POST /api/inscriptions — Create enrollment
const createSchema = z.object({
  studentId: z.string().uuid('Élève requis'),
  academicYearId: z.string().uuid('Année scolaire requise'),
  status: z.enum(['active', 'completed', 'transferred_out', 'withdrawn', 'cancelled']).default('active'),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:enrollments:manage');
    const schoolId = await getSchoolId();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const [created] = await db
      .insert(enrollment)
      .values({
        studentId: parsed.data.studentId,
        academicYearId: parsed.data.academicYearId,
        status: parsed.data.status,
        schoolId,
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/inscriptions') as NextResponse;
  }
}
