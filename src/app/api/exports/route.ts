/**
 * M6.4 — Exports API
 * Export de données en CSV (et XLSX fallback vers CSV).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and, sql, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  student, enrollment, classroom, level, academicYear,
  academicPeriod, reportCard, reportCardItem,
} from '@/lib/db/schema';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { handleApiError, getSchoolId } from '@/lib/data-access/get-school';
import type { Permission } from '@/lib/types/rbac';

const exportSchema = z.object({
  type: z.enum(['students', 'enrollments', 'classrooms', 'results']),
  format: z.enum(['csv', 'xlsx']).default('csv'),
  year: z.string().optional(),
  period: z.string().optional(),
});

const TYPE_PERMISSIONS: Record<string, Permission> = {
  students: 'school:students:read',
  enrollments: 'school:enrollments:read',
  classrooms: 'school:classrooms:read',
  results: 'school:report_cards:read',
};

function csvEscape(val: unknown): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','));
  }
  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = exportSchema.parse(params);

    const permission = TYPE_PERMISSIONS[parsed.type];
    await requireAuthorizedSession(permission);
    const schoolId = await getSchoolId();

    let headers: string[] = [];
    let rows: unknown[][] = [];
    let filename: string = parsed.type;

    switch (parsed.type) {
      case 'students': {
        headers = ['Matricule', 'Nom', 'Prénom', 'Date de naissance', 'Genre', 'Inscrit le'];
        const data = await db
          .select({
            matricule: student.matricule,
            lastName: student.lastName,
            firstName: student.firstName,
            dateOfBirth: student.dateOfBirth,
            gender: student.gender,
            enrolledAt: enrollment.enrolledAt,
          })
          .from(student)
          .leftJoin(
            enrollment,
            and(
              eq(enrollment.studentId, student.id),
              parsed.year ? eq(enrollment.academicYearId, parsed.year) : undefined,
            ),
          )
          .where(eq(student.schoolId, schoolId))
          .orderBy(asc(student.lastName), asc(student.firstName))
          .limit(5000);

        rows = data.map(r => [
          r.matricule ?? '',
          r.lastName,
          r.firstName,
          r.dateOfBirth ?? '',
          r.gender ?? '',
          r.enrolledAt ?? '',
        ]);
        filename = 'eleves';
        break;
      }

      case 'enrollments': {
        if (!parsed.year) {
          return NextResponse.json({ error: "Le paramètre year est requis pour ce type d'export." }, { status: 400 });
        }
        headers = ['Matricule', 'Nom', 'Prénom', 'Classe', 'Niveau', 'Statut', "Date d'inscription"];
        const data = await db
          .select({
            matricule: student.matricule,
            lastName: student.lastName,
            firstName: student.firstName,
            classroomName: classroom.name,
            levelName: level.name,
            status: enrollment.status,
            enrolledAt: enrollment.enrolledAt,
          })
          .from(enrollment)
          .innerJoin(student, eq(enrollment.studentId, student.id))
          .leftJoin(
            classroom,
            and(
              eq(classroom.id, sql`(SELECT ca.classroom_id FROM classroom_assignment ca WHERE ca.enrollment_id = enrollment.id AND ca.status = 'active' ORDER BY ca.start_date DESC LIMIT 1)`),
            ),
          )
          .leftJoin(level, eq(classroom.levelId, level.id))
          .where(
            and(
              eq(enrollment.schoolId, schoolId),
              eq(enrollment.academicYearId, parsed.year),
            ),
          )
          .orderBy(asc(student.lastName))
          .limit(5000);

        rows = data.map(r => [
          r.matricule ?? '',
          r.lastName,
          r.firstName,
          r.classroomName ?? '',
          r.levelName ?? '',
          r.status,
          r.enrolledAt ?? '',
        ]);
        filename = 'inscriptions';
        break;
      }

      case 'classrooms': {
        if (!parsed.year) {
          return NextResponse.json({ error: "Le paramètre year est requis pour ce type d'export." }, { status: 400 });
        }
        headers = ['Classe', 'Niveau', 'Année scolaire', 'Effectif'];
        const data = await db
          .select({
            classroomName: classroom.name,
            levelName: level.name,
            yearName: academicYear.name,
            studentCount: sql<number>`(SELECT count(*)::int FROM classroom_assignment ca JOIN enrollment e ON ca.enrollment_id = e.id WHERE ca.classroom_id = classroom.id AND ca.status = 'active' AND e.academic_year_id = classroom.academic_year_id)`,
          })
          .from(classroom)
          .innerJoin(level, eq(classroom.levelId, level.id))
          .innerJoin(academicYear, eq(classroom.academicYearId, academicYear.id))
          .where(
            and(
              eq(level.schoolId, schoolId),
              eq(classroom.academicYearId, parsed.year),
            ),
          )
          .orderBy(asc(level.sortOrder), asc(classroom.name))
          .limit(500);

        rows = data.map(r => [
          r.classroomName,
          r.levelName,
          r.yearName,
          String(r.studentCount),
        ]);
        filename = 'classes';
        break;
      }

      case 'results': {
        if (!parsed.year) {
          return NextResponse.json({ error: "Le paramètre year est requis pour ce type d'export." }, { status: 400 });
        }
        headers = ['Nom', 'Prénom', 'Classe', 'Période', 'Matière', 'Note officielle', 'Moy. générale', 'Rang'];
        const conditions = [
          eq(enrollment.academicYearId, parsed.year),
          parsed.period ? eq(academicPeriod.id, parsed.period) : undefined,
          eq(reportCard.status, 'published'),
        ];

        const rciData = await db
          .select({
            lastName: student.lastName,
            firstName: student.firstName,
            classroomName: classroom.name,
            periodName: academicPeriod.name,
            subjectName: reportCardItem.subjectName,
            officialValue: reportCardItem.officialValue,
            generalAverage: reportCard.generalAverageOfficial,
            rank: reportCard.rank,
          })
          .from(reportCardItem)
          .innerJoin(reportCard, eq(reportCardItem.reportCardId, reportCard.id))
          .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
          .innerJoin(student, eq(enrollment.studentId, student.id))
          .innerJoin(academicPeriod, eq(reportCard.academicPeriodId, academicPeriod.id))
          .leftJoin(
            classroom,
            eq(classroom.id, sql`(SELECT ca.classroom_id FROM classroom_assignment ca WHERE ca.enrollment_id = enrollment.id AND ca.status = 'active' ORDER BY ca.start_date DESC LIMIT 1)`),
          )
          .where(and(...conditions))
          .orderBy(asc(student.lastName), asc(reportCardItem.sortOrder))
          .limit(10000);

        rows = rciData.map(r => [
          r.lastName,
          r.firstName,
          r.classroomName ?? '',
          r.periodName,
          r.subjectName,
          r.officialValue ?? '',
          r.generalAverage ?? '',
          r.rank != null ? String(r.rank) : '',
        ]);
        filename = 'resultats';
        break;
      }
    }

    const csv = toCsv(headers, rows);
    const ext = parsed.format === 'xlsx' ? '.xlsx' : '.csv';
    const mime = 'text/csv;charset=utf-8';

    return new NextResponse(csv, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${filename}${ext}"`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Paramètres invalides.', details: error.issues }, { status: 400 });
    }
    return handleApiError(error, 'exports');
  }
}
