/**
 * M6.1 — Dashboard Service
 * Computes role-specific KPIs from existing M1-M5 data.
 * No new tables — all metrics are derived queries.
 */

import { db } from '@/lib/db';
import { school } from '@/lib/db/schema';
import {
  student, enrollment, classroom, classroomAssignment,
  academicYear, academicPeriod, assessment, grade,
  reportCard, reportCardItem, subject,
  teacherAssignment, user, auditLog,
} from '@/lib/db/schema';
import { eq, and, isNull, sql, count, inArray, ne } from 'drizzle-orm';
import type { SchoolRole } from '@/lib/types/rbac';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface AdminKpi {
  totalStudents: number;
  activeYearStudents: number;
  studentsWithoutEnrollment: number;
  enrollmentsWithoutClassroom: number;
  totalClassrooms: number;
  incompleteAssessments: number;
  incompleteGradeEntry: number;
  reportCardsToPrepare: number;
  reportCardsToValidate: number;
  reportCardsToPublish: number;
}

export interface DirectionKpi {
  totalClassrooms: number;
  gradeEntryCompletionPct: number;
  reportCardsDraft: number;
  reportCardsReady: number;
  reportCardsValidated: number;
  reportCardsPublished: number;
  weakSubjects: Array<{ subjectName: string; avg: string; classroomName: string }>;
}

export interface TeacherKpi {
  myClassrooms: number;
  myAssessments: number;
  myOpenAssessments: number;
  incompleteGradeEntry: number;
  recentAssessments: Array<{ id: string; title: string; classroomName: string; subjectName: string; status: string; date: string }>;
}

export interface SuperAdminKpi {
  totalUsers: number;
  activeUsers: number;
  totalSchools: number;
  dbHealth: 'available' | 'unavailable' | 'unknown';
  recentAuditEntries: number;
}

export interface DashboardData {
  schoolId: string | null;
  academicYearId: string | null;
  academicYearName: string | null;
  role: SchoolRole;
  admin: AdminKpi | null;
  direction: DirectionKpi | null;
  teacher: TeacherKpi | null;
  superAdmin: SuperAdminKpi | null;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function getActiveAcademicYear(schoolId: string) {
  const rows = await db
    .select({ id: academicYear.id, name: academicYear.name })
    .from(academicYear)
    .where(and(eq(academicYear.schoolId, schoolId), eq(academicYear.status, 'active')))
    .limit(1);
  return rows[0] ?? null;
}

async function getActivePeriods(yearId: string) {
  return db
    .select({ id: academicPeriod.id, name: academicPeriod.name })
    .from(academicPeriod)
    .where(eq(academicPeriod.academicYearId, yearId));
}

// ─────────────────────────────────────────────
// ADMIN KPIs
// ─────────────────────────────────────────────

async function computeAdminKpi(schoolId: string, yearId: string): Promise<AdminKpi> {
  const [totalStudents] = await db
    .select({ c: count() })
    .from(student)
    .where(eq(student.schoolId, schoolId));

  const [activeYearStudents] = await db
    .select({ c: count() })
    .from(enrollment)
    .where(and(eq(enrollment.schoolId, schoolId), eq(enrollment.academicYearId, yearId), eq(enrollment.status, 'active')));

  // Students without enrollment in active year
  const enrolledStudentIds = await db
    .select({ sid: enrollment.studentId })
    .from(enrollment)
    .where(and(eq(enrollment.schoolId, schoolId), eq(enrollment.academicYearId, yearId), eq(enrollment.status, 'active')));

  const enrolledSet = new Set(enrolledStudentIds.map(r => r.sid));
  const allStudents = await db
    .select({ id: student.id })
    .from(student)
    .where(eq(student.schoolId, schoolId));
  const studentsWithoutEnrollment = allStudents.filter(s => !enrolledSet.has(s.id)).length;

  // Enrollments without classroom assignment — use subquery approach
  const activeEnrollments = await db
    .select({ id: enrollment.id })
    .from(enrollment)
    .where(and(eq(enrollment.schoolId, schoolId), eq(enrollment.academicYearId, yearId), eq(enrollment.status, 'active')));

  const activeEnrollmentIds = activeEnrollments.map(e => e.id);
  let enrollmentsWithoutClassroom = 0;

  if (activeEnrollmentIds.length > 0) {
    const assignedEnrollments = await db
      .selectDistinct({ eid: classroomAssignment.enrollmentId })
      .from(classroomAssignment)
      .where(and(inArray(classroomAssignment.enrollmentId, activeEnrollmentIds), eq(classroomAssignment.status, 'active')));

    const assignedSet = new Set(assignedEnrollments.map(a => a.eid));
    enrollmentsWithoutClassroom = activeEnrollmentIds.filter(id => !assignedSet.has(id)).length;
  }

  const [totalClassrooms] = await db
    .select({ c: count() })
    .from(classroom)
    .where(eq(classroom.academicYearId, yearId));

  // Open assessments with pending grades
  const periodRows = await getActivePeriods(yearId);
  const periodIds = periodRows.map(p => p.id);

  let incompleteAssessments = 0;
  let incompleteGradeEntry = 0;

  if (periodIds.length > 0) {
    const openAssessments = await db
      .select({ id: assessment.id, classroomId: assessment.classroomId })
      .from(assessment)
      .where(and(inArray(assessment.academicPeriodId, periodIds), eq(assessment.status, 'open')));

    for (const a of openAssessments) {
      const [total] = await db
        .select({ c: count() })
        .from(grade)
        .where(eq(grade.assessmentId, a.id));

      const [pending] = await db
        .select({ c: count() })
        .from(grade)
        .where(and(eq(grade.assessmentId, a.id), eq(grade.status, 'pending')));

      if (total.c > 0 && pending.c > 0) {
        incompleteAssessments++;
      }
      incompleteGradeEntry += pending.c;
    }
  }

  // Report card counts by status
  const [rcDraft] = await db
    .select({ c: count() })
    .from(reportCard)
    .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
    .where(and(eq(enrollment.academicYearId, yearId), eq(reportCard.status, 'draft')));

  const [rcReady] = await db
    .select({ c: count() })
    .from(reportCard)
    .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
    .where(and(eq(enrollment.academicYearId, yearId), eq(reportCard.status, 'ready')));

  const [rcValidated] = await db
    .select({ c: count() })
    .from(reportCard)
    .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
    .where(and(eq(enrollment.academicYearId, yearId), eq(reportCard.status, 'validated')));

  return {
    totalStudents: totalStudents.c,
    activeYearStudents: activeYearStudents.c,
    studentsWithoutEnrollment,
    enrollmentsWithoutClassroom,
    totalClassrooms: totalClassrooms.c,
    incompleteAssessments,
    incompleteGradeEntry,
    reportCardsToPrepare: rcDraft.c + rcReady.c,
    reportCardsToValidate: rcReady.c,
    reportCardsToPublish: rcValidated.c,
  };
}

// ─────────────────────────────────────────────
// DIRECTION KPIs
// ─────────────────────────────────────────────

async function computeDirectionKpi(schoolId: string, yearId: string): Promise<DirectionKpi> {
  const [totalClassrooms] = await db
    .select({ c: count() })
    .from(classroom)
    .where(eq(classroom.academicYearId, yearId));

  const periodRows = await getActivePeriods(yearId);
  const periodIds = periodRows.map(p => p.id);

  let totalGrades = 0;
  let completedGrades = 0;

  if (periodIds.length > 0) {
    const [tAll] = await db
      .select({ c: count() })
      .from(grade)
      .innerJoin(assessment, eq(grade.assessmentId, assessment.id))
      .where(inArray(assessment.academicPeriodId, periodIds));
    totalGrades = tAll.c;

    const [tDone] = await db
      .select({ c: count() })
      .from(grade)
      .innerJoin(assessment, eq(grade.assessmentId, assessment.id))
      .where(and(inArray(assessment.academicPeriodId, periodIds), ne(grade.status, 'pending')));
    completedGrades = tDone.c;
  }

  const gradeEntryCompletionPct = totalGrades > 0 ? Math.round((completedGrades / totalGrades) * 100) : 100;

  // Report card workflow counts
  const [rcDraft] = await db
    .select({ c: count() })
    .from(reportCard)
    .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
    .where(and(eq(enrollment.academicYearId, yearId), eq(reportCard.status, 'draft')));
  const [rcReady] = await db
    .select({ c: count() })
    .from(reportCard)
    .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
    .where(and(eq(enrollment.academicYearId, yearId), eq(reportCard.status, 'ready')));
  const [rcValidated] = await db
    .select({ c: count() })
    .from(reportCard)
    .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
    .where(and(eq(enrollment.academicYearId, yearId), eq(reportCard.status, 'validated')));
  const [rcPublished] = await db
    .select({ c: count() })
    .from(reportCard)
    .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
    .where(and(eq(enrollment.academicYearId, yearId), eq(reportCard.status, 'published')));

  // Weak subjects from published report cards
  let weakSubjects: DirectionKpi['weakSubjects'] = [];
  try {
    const weakRows = await db
      .select({
        subjectName: reportCardItem.subjectName,
        avg: sql<string>`avg(official_value::numeric)::text`,
        classroomName: sql<string>`c.name`,
      })
      .from(reportCardItem)
      .innerJoin(reportCard, eq(reportCardItem.reportCardId, reportCard.id))
      .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
      .innerJoin(classroomAssignment, eq(enrollment.id, classroomAssignment.enrollmentId))
      .innerJoin(classroom, eq(classroomAssignment.classroomId, classroom.id))
      .where(and(eq(enrollment.academicYearId, yearId), eq(reportCard.status, 'published')))
      .groupBy(reportCardItem.subjectName, classroom.name)
      .having(sql`avg(official_value::numeric) < 10`)
      .limit(5);
    weakSubjects = weakRows.map(r => ({
      subjectName: r.subjectName,
      avg: Number(r.avg).toFixed(2),
      classroomName: r.classroomName,
    }));
  } catch {
    // No published report cards yet
  }

  return {
    totalClassrooms: totalClassrooms.c,
    gradeEntryCompletionPct,
    reportCardsDraft: rcDraft.c,
    reportCardsReady: rcReady.c,
    reportCardsValidated: rcValidated.c,
    reportCardsPublished: rcPublished.c,
    weakSubjects,
  };
}

// ─────────────────────────────────────────────
// TEACHER KPIs
// ─────────────────────────────────────────────

async function computeTeacherKpi(userId: string, _schoolId: string, yearId: string): Promise<TeacherKpi> {
  // My classrooms via teacher_assignment
  const myClassroomRows = await db
    .selectDistinct({ classroomId: teacherAssignment.classroomId })
    .from(teacherAssignment)
    .where(and(eq(teacherAssignment.userId, userId), eq(teacherAssignment.academicYearId, yearId)));

  const classroomIds = myClassroomRows.map(r => r.classroomId);

  // My assessments via my classrooms
  let teacherAssessments: Array<{
    id: string; title: string; status: string;
    date: string; subjectName: string; classroomName: string;
  }> = [];

  if (classroomIds.length > 0) {
    const rows = await db
      .select({
        id: assessment.id,
        title: assessment.title,
        status: assessment.status,
        date: assessment.date,
        subjectName: subject.name,
        classroomName: classroom.name,
      })
      .from(assessment)
      .innerJoin(subject, eq(assessment.subjectId, subject.id))
      .innerJoin(classroom, eq(assessment.classroomId, classroom.id))
      .where(inArray(assessment.classroomId, classroomIds))
      .orderBy(assessment.date)
      .limit(10);
    teacherAssessments = rows.map(r => ({
      ...r,
      date: r.date ? String(r.date) : '',
    }));
  }

  const openAssessments = teacherAssessments.filter(a => a.status === 'open');

  let incompleteGradeEntry = 0;
  for (const a of openAssessments) {
    const [pending] = await db
      .select({ c: count() })
      .from(grade)
      .where(and(eq(grade.assessmentId, a.id), eq(grade.status, 'pending')));
    incompleteGradeEntry += pending.c;
  }

  return {
    myClassrooms: myClassroomRows.length,
    myAssessments: teacherAssessments.length,
    myOpenAssessments: openAssessments.length,
    incompleteGradeEntry,
    recentAssessments: teacherAssessments.slice(-5).reverse().map(a => ({
      id: a.id,
      title: a.title,
      classroomName: a.classroomName,
      subjectName: a.subjectName,
      status: a.status,
      date: a.date ? String(a.date) : '',
    })),
  };
}

// ─────────────────────────────────────────────
// SUPER ADMIN KPIs
// ─────────────────────────────────────────────

async function computeSuperAdminKpi(): Promise<SuperAdminKpi> {
  const [totalUsers] = await db.select({ c: count() }).from(user);
  const [activeUsers] = await db.select({ c: count() }).from(user).where(eq(user.isActive, true));

  const schoolRows = await db.select({ c: count() }).from(school);

  let dbHealth: 'available' | 'unavailable' | 'unknown' = 'available';
  try {
    const { checkDatabaseHealth } = await import('@/lib/db-health');
    const h = await checkDatabaseHealth();
    dbHealth = h.state === 'AVAILABLE' ? 'available' : h.state === 'UNAVAILABLE' ? 'unavailable' : 'unknown';
  } catch {
    // If we got here, DB query succeeded — it's available
  }

  const [recentAudit] = await db.select({ c: count() }).from(auditLog);

  return {
    totalUsers: totalUsers.c,
    activeUsers: activeUsers.c,
    totalSchools: schoolRows[0].c,
    dbHealth,
    recentAuditEntries: recentAudit.c,
  };
}

// ─────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────

export async function getDashboardData(
  role: SchoolRole,
  schoolId: string | null,
  userId?: string,
): Promise<DashboardData> {
  let academicYearId: string | null = null;
  let academicYearName: string | null = null;

  if (schoolId) {
    const year = await getActiveAcademicYear(schoolId);
    if (year) {
      academicYearId = year.id;
      academicYearName = year.name;
    }
  }

  const data: DashboardData = {
    schoolId,
    academicYearId,
    academicYearName,
    role,
    admin: null,
    direction: null,
    teacher: null,
    superAdmin: null,
  };

  if (!schoolId || !academicYearId) {
    return data;
  }

  try {
    if (role === 'admin') {
      data.admin = await computeAdminKpi(schoolId, academicYearId);
    }
    if (role === 'direction') {
      data.direction = await computeDirectionKpi(schoolId, academicYearId);
    }
    if (role === 'teacher' && userId) {
      data.teacher = await computeTeacherKpi(userId, schoolId, academicYearId);
    }
    if (role === 'reader') {
      data.direction = await computeDirectionKpi(schoolId, academicYearId);
    }
  } catch (error) {
    console.error('[dashboard.service] Error computing KPIs:', error);
  }

  return data;
}

export async function getSuperAdminDashboard(): Promise<DashboardData> {
  let superAdmin: SuperAdminKpi | null = null;
  try {
    superAdmin = await computeSuperAdminKpi();
  } catch (error) {
    console.error('[dashboard.service] Error computing super admin KPIs:', error);
  }

  return {
    schoolId: null,
    academicYearId: null,
    academicYearName: null,
    role: 'admin',
    admin: null,
    direction: null,
    teacher: null,
    superAdmin,
  };
}
