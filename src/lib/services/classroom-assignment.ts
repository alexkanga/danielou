import { db } from '@/lib/db';
import {
  enrollment,
  classroomAssignment,
  classroom,
  student,
  level,
  auditLog,
} from '@/lib/db/schema';
import { eq, and, sql, desc, ne, or as drizzleOr } from 'drizzle-orm';

// ==============================================
// Types
// ==============================================

export type AssignmentWithDetails = {
  id: string;
  enrollmentId: string;
  classroomId: string;
  classroomName: string;
  levelName: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type EnrollmentWithAssignments = {
  id: string;
  studentId: string;
  academicYearId: string;
  schoolId: string;
  status: string;
  enrolledAt: string | null;
  exitedAt: string | null;
  currentAssignment: AssignmentWithDetails | null;
  assignments: AssignmentWithDetails[];
};

export type StudentWithEnrollmentV2 = {
  id: string;
  schoolId: string;
  matricule: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  createdAt: Date;
  updatedAt: Date;
  currentAssignment: {
    classroomId: string;
    classroomName: string;
    levelName: string;
    academicYearId: string;
  } | null;
};

// ==============================================
// Errors
// ==============================================

class AssignmentError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AssignmentError';
  }
}

// ==============================================
// getCurrentClassroomAssignment
// ==============================================

export async function getCurrentClassroomAssignment(enrollmentId: string) {
  const rows = await db
    .select({
      id: classroomAssignment.id,
      enrollmentId: classroomAssignment.enrollmentId,
      classroomId: classroomAssignment.classroomId,
      classroomName: classroom.name,
      levelName: level.name,
      startDate: classroomAssignment.startDate,
      endDate: classroomAssignment.endDate,
      status: classroomAssignment.status,
      createdAt: classroomAssignment.createdAt,
      updatedAt: classroomAssignment.updatedAt,
    })
    .from(classroomAssignment)
    .innerJoin(classroom, eq(classroomAssignment.classroomId, classroom.id))
    .innerJoin(level, eq(classroom.levelId, level.id))
    .where(
      and(
        eq(classroomAssignment.enrollmentId, enrollmentId),
        eq(classroomAssignment.status, 'active'),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

// ==============================================
// getClassroomAssignmentHistory
// ==============================================

export async function getClassroomAssignmentHistory(enrollmentId: string) {
  const rows = await db
    .select({
      id: classroomAssignment.id,
      enrollmentId: classroomAssignment.enrollmentId,
      classroomId: classroomAssignment.classroomId,
      classroomName: classroom.name,
      levelName: level.name,
      startDate: classroomAssignment.startDate,
      endDate: classroomAssignment.endDate,
      status: classroomAssignment.status,
      createdAt: classroomAssignment.createdAt,
      updatedAt: classroomAssignment.updatedAt,
    })
    .from(classroomAssignment)
    .innerJoin(classroom, eq(classroomAssignment.classroomId, classroom.id))
    .innerJoin(level, eq(classroom.levelId, level.id))
    .where(eq(classroomAssignment.enrollmentId, enrollmentId))
    .orderBy(desc(classroomAssignment.startDate));

  return rows;
}

// ==============================================
// assignEnrollmentToClassroom
// ==============================================

export async function assignEnrollmentToClassroom(params: {
  enrollmentId: string;
  classroomId: string;
  startDate: string;
  actorSchoolId: string;
  actorId?: string;
  actorType?: string;
  actorIdentifier?: string;
  ipAddress?: string;
}) {
  const { enrollmentId, classroomId, startDate, actorSchoolId, actorId, actorType, actorIdentifier, ipAddress } = params;

  // 1. Enrollment must exist
  const [enr] = await db
    .select()
    .from(enrollment)
    .where(eq(enrollment.id, enrollmentId))
    .limit(1);

  if (!enr) {
    throw new AssignmentError('ENROLLMENT_NOT_FOUND', 'Inscription non trouvée.');
  }

  // 2. Classroom must exist
  const [cls] = await db
    .select({
      id: classroom.id,
      schoolId: level.schoolId,
      academicYearId: classroom.academicYearId,
    })
    .from(classroom)
    .innerJoin(level, eq(classroom.levelId, level.id))
    .where(eq(classroom.id, classroomId))
    .limit(1);

  if (!cls) {
    throw new AssignmentError('CLASSROOM_NOT_FOUND', 'Classe non trouvée.');
  }

  // 3. Same school
  if (enr.schoolId !== cls.schoolId || enr.schoolId !== actorSchoolId) {
    throw new AssignmentError('CROSS_SCHOOL', 'L\'inscription et la classe doivent appartenir au même établissement.');
  }

  // 4. Same academic year
  if (enr.academicYearId !== cls.academicYearId) {
    throw new AssignmentError('CROSS_YEAR', 'La classe doit appartenir à la même année scolaire que l\'inscription.');
  }

  // 5. No conflicting active assignment (partial unique index will also catch this)
  const [existing] = await db
    .select({ id: classroomAssignment.id })
    .from(classroomAssignment)
    .where(
      and(
        eq(classroomAssignment.enrollmentId, enrollmentId),
        eq(classroomAssignment.status, 'active'),
      ),
    )
    .limit(1);

  if (existing) {
    throw new AssignmentError('ACTIVE_ASSIGNMENT_EXISTS', 'Une affectation active existe déjà. Utilisez le transfert pour changer de classe.');
  }

  // 6. Date overlap check
  await checkNoOverlap(enrollmentId, startDate, null);

  // 7. Insert
  const [created] = await db
    .insert(classroomAssignment)
    .values({
      enrollmentId,
      classroomId,
      startDate,
      status: 'active',
    })
    .returning();

  // 8. Audit
  await logAudit({
    action: 'classroom_assignment_created',
    entity: 'classroom_assignment',
    entityId: created.id,
    newValue: JSON.stringify({ enrollmentId, classroomId, startDate, status: 'active' }),
    schoolId: actorSchoolId,
    actorId,
    actorType,
    actorIdentifier,
    ipAddress,
  });

  return created;
}

// ==============================================
// transferEnrollmentToClassroom
// ==============================================

export async function transferEnrollmentToClassroom(params: {
  enrollmentId: string;
  newClassroomId: string;
  effectiveDate: string;
  actorSchoolId: string;
  actorId?: string;
  actorType?: string;
  actorIdentifier?: string;
  ipAddress?: string;
}) {
  const { enrollmentId, newClassroomId, effectiveDate, actorSchoolId, actorId, actorType, actorIdentifier, ipAddress } = params;

  // 1. Get current active assignment
  const current = await getCurrentClassroomAssignment(enrollmentId);
  if (!current) {
    throw new AssignmentError('NO_ACTIVE_ASSIGNMENT', 'Aucune affectation active à transférer.');
  }

  // 2. New classroom must exist and be in same school/year
  const [cls] = await db
    .select({
      id: classroom.id,
      schoolId: level.schoolId,
      academicYearId: classroom.academicYearId,
    })
    .from(classroom)
    .innerJoin(level, eq(classroom.levelId, level.id))
    .where(eq(classroom.id, newClassroomId))
    .limit(1);

  if (!cls) {
    throw new AssignmentError('CLASSROOM_NOT_FOUND', 'Nouvelle classe non trouvée.');
  }

  // 3. Same school
  const [enr] = await db.select({ schoolId: enrollment.schoolId, academicYearId: enrollment.academicYearId }).from(enrollment).where(eq(enrollment.id, enrollmentId)).limit(1);
  if (!enr || enr.schoolId !== cls.schoolId || enr.schoolId !== actorSchoolId) {
    throw new AssignmentError('CROSS_SCHOOL', 'L\'inscription et la nouvelle classe doivent appartenir au même établissement.');
  }

  // 4. Same academic year
  if (enr.academicYearId !== cls.academicYearId) {
    throw new AssignmentError('CROSS_YEAR', 'La nouvelle classe doit appartenir à la même année scolaire.');
  }

  // 5. Cannot transfer to same classroom
  if (current.classroomId === newClassroomId) {
    throw new AssignmentError('SAME_CLASSROOM', 'Le transfert doit être vers une classe différente.');
  }

  // 6. Compute end date for old assignment (day before effective date)
  const effectiveDateObj = new Date(effectiveDate);
  const previousDay = new Date(effectiveDateObj);
  previousDay.setDate(previousDay.getDate() - 1);
  const endDateString = previousDay.toISOString().split('T')[0];

  // 7. Date overlap check for new assignment
  await checkNoOverlap(enrollmentId, effectiveDate, null);

  // 8. Atomic transaction: close old + create new
  const result = await db.transaction(async (tx) => {
    // Close old assignment
    const [closed] = await tx
      .update(classroomAssignment)
      .set({
        status: 'transferred',
        endDate: endDateString,
      })
      .where(eq(classroomAssignment.id, current.id))
      .returning();

    // Create new assignment
    const [created] = await tx
      .insert(classroomAssignment)
      .values({
        enrollmentId,
        classroomId: newClassroomId,
        startDate: effectiveDate,
        status: 'active',
      })
      .returning();

    return { closed, created };
  });

  // 9. Audit
  await logAudit({
    action: 'classroom_transfer',
    entity: 'classroom_assignment',
    entityId: result.created.id,
    oldValue: JSON.stringify({
      oldAssignmentId: current.id,
      oldClassroomId: current.classroomId,
      oldClassroomName: current.classroomName,
    }),
    newValue: JSON.stringify({
      newAssignmentId: result.created.id,
      newClassroomId,
      effectiveDate,
    }),
    schoolId: actorSchoolId,
    actorId,
    actorType,
    actorIdentifier,
    ipAddress,
  });

  return result;
}

// ==============================================
// closeClassroomAssignment
// ==============================================

export async function closeClassroomAssignment(params: {
  assignmentId: string;
  endDate: string;
  newStatus: 'completed' | 'withdrawn' | 'cancelled';
  actorSchoolId: string;
  actorId?: string;
  actorType?: string;
  actorIdentifier?: string;
  ipAddress?: string;
}) {
  const { assignmentId, endDate, newStatus, actorSchoolId, actorId, actorType, actorIdentifier, ipAddress } = params;

  const [existing] = await db
    .select()
    .from(classroomAssignment)
    .where(eq(classroomAssignment.id, assignmentId))
    .limit(1);

  if (!existing) {
    throw new AssignmentError('ASSIGNMENT_NOT_FOUND', 'Affectation non trouvée.');
  }

  if (existing.status !== 'active') {
    throw new AssignmentError('NOT_ACTIVE', 'Seule une affectation active peut être fermée.');
  }

  const [updated] = await db
    .update(classroomAssignment)
    .set({
      status: newStatus,
      endDate,
    })
    .where(eq(classroomAssignment.id, assignmentId))
    .returning();

  await logAudit({
    action: `classroom_assignment_${newStatus}`,
    entity: 'classroom_assignment',
    entityId: assignmentId,
    oldValue: JSON.stringify({ status: 'active' }),
    newValue: JSON.stringify({ status: newStatus, endDate }),
    schoolId: actorSchoolId,
    actorId,
    actorType,
    actorIdentifier,
    ipAddress,
  });

  return updated;
}

// ==============================================
// Internal helpers
// ==============================================

async function checkNoOverlap(enrollmentId: string, startDate: string, endDate: string | null) {
  // Get all non-cancelled assignments for this enrollment
  const existing = await db
    .select({
      id: classroomAssignment.id,
      startDate: classroomAssignment.startDate,
      endDate: classroomAssignment.endDate,
      status: classroomAssignment.status,
    })
    .from(classroomAssignment)
    .where(
      and(
        eq(classroomAssignment.enrollmentId, enrollmentId),
        ne(classroomAssignment.status, 'cancelled'),
      ),
    );

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  for (const a of existing) {
    const aStart = new Date(a.startDate);
    const aEnd = a.endDate ? new Date(a.endDate) : null;

    // Check overlap: two ranges [s1, e1] and [s2, e2] overlap if s1 < e2 AND s2 < e1
    // Open-ended ranges (null end) extend to infinity
    const aEffectiveEnd = aEnd ?? new Date('9999-12-31');
    const newEffectiveEnd = end ?? new Date('9999-12-31');

    if (start < aEffectiveEnd && aStart < newEffectiveEnd) {
      throw new AssignmentError(
        'DATE_OVERLAP',
        `Chevauchement de dates avec l'affectation existante (${a.startDate} → ${a.endDate ?? 'en cours'}).`,
      );
    }
  }
}

async function logAudit(params: {
  action: string;
  entity: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  schoolId: string;
  actorId?: string;
  actorType?: string;
  actorIdentifier?: string;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLog).values({
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      schoolId: params.schoolId,
      userId: params.actorId ?? null,
      actorType: params.actorType ?? null,
      actorIdentifier: params.actorIdentifier ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch {
    // Audit failure should not break the main operation
  }
}

// ==============================================
// Enrollment queries (migrated from V1)
// ==============================================

export async function getStudentWithCurrentAssignment(
  studentId: string,
  academicYearId?: string,
): Promise<StudentWithEnrollmentV2 | null> {
  const conditions = [eq(student.id, studentId)];
  if (academicYearId) {
    conditions.push(eq(enrollment.academicYearId, academicYearId));
  }

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
      assignmentStatus: classroomAssignment.status,
    })
    .from(student)
    .leftJoin(
      enrollment,
      and(
        eq(enrollment.studentId, student.id),
        eq(enrollment.status, 'active'),
        academicYearId ? eq(enrollment.academicYearId, academicYearId) : undefined,
      ),
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
    .where(and(...conditions))
    .limit(1);

  if (!rows.length) return null;

  const r = rows[0];
  return {
    id: r.id,
    schoolId: r.schoolId,
    matricule: r.matricule,
    firstName: r.firstName,
    lastName: r.lastName,
    dateOfBirth: r.dateOfBirth,
    gender: r.gender,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    currentAssignment: r.classroomId
      ? {
          classroomId: r.classroomId,
          classroomName: r.classroomName ?? '',
          levelName: r.levelName ?? '',
          academicYearId: r.enrollmentYearId ?? '',
        }
      : null,
  };
}

export async function listStudentsWithAssignments(params: {
  schoolId: string;
  academicYearId?: string;
  search?: string;
  page: number;
  limit: number;
}) {
  const { schoolId, academicYearId, search, page, limit } = params;

  const conditions = [eq(student.schoolId, schoolId)];
  if (search) {
    conditions.push(
      drizzleOr(
        sql`student.first_name ILIKE ${`%${search}%`}`,
        sql`student.last_name ILIKE ${`%${search}%`}`,
        sql`student.matricule ILIKE ${`%${search}%`}`,
      )!,
    );
  }

  const whereClause = and(...conditions)!;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(student)
    .where(whereClause);

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
      and(
        eq(enrollment.studentId, student.id),
        eq(enrollment.status, 'active'),
        academicYearId ? eq(enrollment.academicYearId, academicYearId) : undefined,
      ),
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
    .where(whereClause)
    .orderBy(sql`student.last_name ASC, student.first_name ASC`)
    .limit(limit)
    .offset((page - 1) * limit);

  const data: StudentWithEnrollmentV2[] = rows.map((r) => ({
    id: r.id,
    schoolId: r.schoolId,
    matricule: r.matricule,
    firstName: r.firstName,
    lastName: r.lastName,
    dateOfBirth: r.dateOfBirth,
    gender: r.gender,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    currentAssignment: r.classroomId
      ? {
          classroomId: r.classroomId,
          classroomName: r.classroomName ?? '',
          levelName: r.levelName ?? '',
          academicYearId: r.enrollmentYearId ?? '',
        }
      : null,
  }));

  return {
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

// ==============================================
// Classroom student count via classroom_assignment
// ==============================================

export async function getClassroomStudentCount(classroomId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(DISTINCT ca.enrollment_id)::int` })
    .from(classroomAssignment)
    .innerJoin(enrollment, eq(enrollment.id, classroomAssignment.enrollmentId))
    .where(
      and(
        eq(classroomAssignment.classroomId, classroomId),
        eq(classroomAssignment.status, 'active'),
        eq(enrollment.status, 'active'),
      ),
    );

  return result?.count ?? 0;
}

export async function hasActiveAssignmentsForClassroom(classroomId: string): Promise<boolean> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(classroomAssignment)
    .where(
      and(
        eq(classroomAssignment.classroomId, classroomId),
        eq(classroomAssignment.status, 'active'),
      ),
    )
    .limit(1);

  return (result?.count ?? 0) > 0;
}
