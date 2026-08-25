/**
 * M6.4 — Global Search API
 * Recherche globale à travers élèves, classes, années, matières, évaluations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql, or, like, asc, and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  student, classroom, academicYear, subject, assessment,
  level, academicPeriod,
} from '@/lib/db/schema';
import { requireAnyAuthorizedSession } from '@/lib/server-guards';
import { handleApiError, getSchoolId } from '@/lib/data-access/get-school';

const querySchema = z.object({
  q: z.string().min(2).max(200),
});

type SearchResult = {
  type: string;
  id: string;
  label: string;
  context: string;
  href: string;
};

export async function GET(request: NextRequest) {
  try {
    await requireAnyAuthorizedSession([
      'school:students:read',
      'school:classrooms:read',
      'school:subjects:read',
      'school:assessments:read',
    ]);

    const schoolId = await getSchoolId();
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const { q } = querySchema.parse(params);
    const pattern = `%${q}%`;

    const results: SearchResult[] = [];

    // Students
    const students = await db
      .select({ id: student.id, firstName: student.firstName, lastName: student.lastName, matricule: student.matricule })
      .from(student)
      .where(
        and(
          eq(student.schoolId, schoolId),
          or(
            like(student.firstName, pattern),
            like(student.lastName, pattern),
            like(student.matricule, pattern),
          ),
        ),
      )
      .orderBy(asc(student.lastName))
      .limit(8);

    for (const s of students) {
      results.push({
        type: 'Élève',
        id: s.id,
        label: `${s.lastName} ${s.firstName}`,
        context: s.matricule ?? '',
        href: `/dashboard/eleves?search=${encodeURIComponent(s.lastName)}`,
      });
    }

    // Classrooms
    const classrooms = await db
      .select({ id: classroom.id, name: classroom.name, levelName: level.name, yearName: academicYear.name })
      .from(classroom)
      .innerJoin(level, eq(classroom.levelId, level.id))
      .innerJoin(academicYear, eq(classroom.academicYearId, academicYear.id))
      .where(
        and(
          eq(level.schoolId, schoolId),
          like(classroom.name, pattern),
        ),
      )
      .orderBy(asc(classroom.name))
      .limit(5);

    for (const c of classrooms) {
      results.push({
        type: 'Classe',
        id: c.id,
        label: c.name,
        context: `${c.levelName} — ${c.yearName}`,
        href: `/dashboard/classes?search=${encodeURIComponent(c.name)}`,
      });
    }

    // Academic years
    const years = await db
      .select({ id: academicYear.id, name: academicYear.name, status: academicYear.status })
      .from(academicYear)
      .where(
        and(
          eq(academicYear.schoolId, schoolId),
          like(academicYear.name, pattern),
        ),
      )
      .orderBy(asc(academicYear.name))
      .limit(5);

    for (const y of years) {
      results.push({
        type: 'Année scolaire',
        id: y.id,
        label: y.name,
        context: y.status,
        href: `/dashboard/annees-scolaires?search=${encodeURIComponent(y.name)}`,
      });
    }

    // Subjects
    const subjects = await db
      .select({ id: subject.id, name: subject.name, code: subject.code })
      .from(subject)
      .where(
        and(
          eq(subject.schoolId, schoolId),
          or(
            like(subject.name, pattern),
            like(subject.code, pattern),
          ),
        ),
      )
      .orderBy(asc(subject.name))
      .limit(5);

    for (const s of subjects) {
      results.push({
        type: 'Matière',
        id: s.id,
        label: s.name,
        context: s.code,
        href: `/dashboard/matieres?search=${encodeURIComponent(s.name)}`,
      });
    }

    // Assessments
    const assessments = await db
      .select({
        id: assessment.id,
        title: assessment.title,
        classroomName: classroom.name,
        subjectName: subject.name,
        periodName: academicPeriod.name,
      })
      .from(assessment)
      .innerJoin(classroom, eq(assessment.classroomId, classroom.id))
      .innerJoin(subject, eq(assessment.subjectId, subject.id))
      .innerJoin(academicPeriod, eq(assessment.academicPeriodId, academicPeriod.id))
      .innerJoin(level, eq(classroom.levelId, level.id))
      .where(
        and(
          eq(level.schoolId, schoolId),
          like(assessment.title, pattern),
        ),
      )
      .orderBy(asc(assessment.title))
      .limit(5);

    for (const a of assessments) {
      results.push({
        type: 'Évaluation',
        id: a.id,
        label: a.title,
        context: `${a.classroomName} — ${a.subjectName} — ${a.periodName}`,
        href: `/dashboard/evaluations?search=${encodeURIComponent(a.title)}`,
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Paramètres invalides.', details: error.issues }, { status: 400 });
    }
    return handleApiError(error, 'search');
  }
}
