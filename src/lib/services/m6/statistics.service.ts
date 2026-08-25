/**
 * M6.2 — Statistics Service
 * Computes statistical views from existing M1-M5 data.
 * Reuses M5 persisted results (official values, ranking).
 * No alternative calculation engines.
 */

import { db } from '@/lib/db';
import {
  enrollment, classroom, level, academicYear, academicPeriod,
  reportCard, reportCardItem, assessment, grade, subject,
} from '@/lib/db/schema';
import { eq, and, inArray, sql, count, ne } from 'drizzle-orm';

// ─────────────────────────────────────────────
// Filter types
// ─────────────────────────────────────────────

export interface StatFilters {
  academicYearId: string;
  periodId?: string;
  levelId?: string;
  classroomId?: string;
  subjectId?: string;
}

// ─────────────────────────────────────────────
// Statistic types
// ─────────────────────────────────────────────

export interface ClassroomAverage {
  classroomId: string;
  classroomName: string;
  levelName: string;
  average: string;
  studentCount: number;
}

export interface LevelAverage {
  levelId: string;
  levelName: string;
  average: string;
  studentCount: number;
  classroomCount: number;
}

export interface SubjectAverage {
  subjectId: string;
  subjectName: string;
  average: string;
  classroomCount: number;
}

export interface ComponentAverage {
  componentName: string;
  subjectName: string;
  average: string;
}

export interface ResultDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface ThresholdResult {
  label: string;
  aboveCount: number;
  abovePct: number;
  belowCount: number;
  belowPct: number;
}

export interface PeriodProgression {
  studentId: string;
  studentName: string;
  previousAvg: string | null;
  currentAvg: string;
  change: string | null;
}

export interface StudentTrend {
  studentId: string;
  studentName: string;
  previousAvg: string | null;
  currentAvg: string;
  trend: 'improving' | 'declining' | 'stable';
}

export interface GradeCompletion {
  assessmentId: string;
  assessmentTitle: string;
  classroomName: string;
  subjectName: string;
  totalStudents: number;
  gradedCount: number;
  completionPct: number;
}

export interface ReportCardWorkflow {
  status: string;
  count: number;
}

// ─────────────────────────────────────────────
// Implementation
// ─────────────────────────────────────────────

/** 1. Average by classroom */
export async function averageByClassroom(filters: StatFilters): Promise<ClassroomAverage[]> {
  const rows = await db
    .select({
      classroomId: classroom.id,
      classroomName: classroom.name,
      levelName: level.name,
      average: sql<string>`avg(general_average_official::numeric)::text`,
      studentCount: count(),
    })
    .from(reportCard)
    .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
    .innerJoin(classroom, eq(classroom.id, sql`(SELECT ca.classroom_id FROM classroom_assignment ca WHERE ca.enrollment_id = enrollment.id AND ca.status = 'active' ORDER BY ca.start_date DESC LIMIT 1)`))
    .innerJoin(level, eq(classroom.levelId, level.id))
    .where(
      and(
        eq(enrollment.academicYearId, filters.academicYearId),
        filters.periodId ? eq(reportCard.academicPeriodId, filters.periodId) : undefined,
        filters.classroomId ? eq(classroom.id, filters.classroomId) : undefined,
        filters.levelId ? eq(level.id, filters.levelId) : undefined,
        eq(reportCard.status, 'published'),
      ),
    )
    .groupBy(classroom.id, classroom.name, level.name);

  return rows.map(r => ({
    classroomId: r.classroomId,
    classroomName: r.classroomName,
    levelName: r.levelName,
    average: Number(r.average).toFixed(2),
    studentCount: r.studentCount,
  }));
}

/** 2. Average by level */
export async function averageByLevel(filters: StatFilters): Promise<LevelAverage[]> {
  const rows = await db
    .select({
      levelId: level.id,
      levelName: level.name,
      average: sql<string>`avg(general_average_official::numeric)::text`,
      studentCount: count(),
    })
    .from(reportCard)
    .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
    .innerJoin(classroom, eq(classroom.id, sql`(SELECT ca.classroom_id FROM classroom_assignment ca WHERE ca.enrollment_id = enrollment.id AND ca.status = 'active' ORDER BY ca.start_date DESC LIMIT 1)`))
    .innerJoin(level, eq(classroom.levelId, level.id))
    .where(
      and(
        eq(enrollment.academicYearId, filters.academicYearId),
        filters.periodId ? eq(reportCard.academicPeriodId, filters.periodId) : undefined,
        filters.levelId ? eq(level.id, filters.levelId) : undefined,
        eq(reportCard.status, 'published'),
      ),
    )
    .groupBy(level.id, level.name);

  return rows.map(r => ({
    levelId: r.levelId,
    levelName: r.levelName,
    average: Number(r.average).toFixed(2),
    studentCount: r.studentCount,
    classroomCount: 0,
  }));
}

/** 3. Average by subject */
export async function averageBySubject(filters: StatFilters): Promise<SubjectAverage[]> {
  const rows = await db
    .select({
      subjectId: reportCardItem.subjectName,
      subjectName: reportCardItem.subjectName,
      average: sql<string>`avg(official_value::numeric)::text`,
    })
    .from(reportCardItem)
    .innerJoin(reportCard, eq(reportCardItem.reportCardId, reportCard.id))
    .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
    .where(
      and(
        eq(enrollment.academicYearId, filters.academicYearId),
        filters.periodId ? eq(reportCard.academicPeriodId, filters.periodId) : undefined,
        filters.classroomId ? undefined : undefined,
        eq(reportCard.status, 'published'),
      ),
    )
    .groupBy(reportCardItem.subjectName);

  return rows.map(r => ({
    subjectId: r.subjectId,
    subjectName: r.subjectName,
    average: Number(r.average).toFixed(2),
    classroomCount: 0,
  }));
}

/** 4. Average by component */
export async function averageByComponent(filters: StatFilters): Promise<ComponentAverage[]> {
  const { neon } = await import('@neondatabase/serverless');
  const sqlq = neon(process.env.DATABASE_URL!);

  const conditions = [`rc.status = 'published'`, `e.academic_year_id = '${filters.academicYearId}'`];
  if (filters.periodId) conditions.push(`rc.academic_period_id = '${filters.periodId}'`);

  const rows = await sqlq`
    SELECT rcci.component_name, rci.subject_name,
           avg(rcci.raw_value::numeric)::text as average
    FROM report_card_component_item rcci
    JOIN report_card_item rci ON rcci.report_card_item_id = rci.id
    JOIN report_card rc ON rci.report_card_id = rc.id
    JOIN enrollment e ON rc.enrollment_id = e.id
    WHERE ${sql.raw(conditions.join(' AND '))}
    GROUP BY rcci.component_name, rci.subject_name
    ORDER BY average ASC
    LIMIT 50
  `;

  return rows.map((r: Record<string, unknown>) => ({
    componentName: String(r.component_name ?? ''),
    subjectName: String(r.subject_name ?? ''),
    average: Number(r.average).toFixed(2),
  }));
}

/** 5. Result distribution */
export async function resultDistribution(filters: StatFilters): Promise<ResultDistribution[]> {
  const rows = await db
    .select({
      avg: reportCard.generalAverageOfficial,
    })
    .from(reportCard)
    .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
    .where(
      and(
        eq(enrollment.academicYearId, filters.academicYearId),
        filters.periodId ? eq(reportCard.academicPeriodId, filters.periodId) : undefined,
        eq(reportCard.status, 'published'),
      ),
    );

  const ranges = [
    { range: '0 - 4', min: 0, max: 5 },
    { range: '5 - 9', min: 5, max: 10 },
    { range: '10 - 14', min: 10, max: 15 },
    { range: '15 - 19', min: 15, max: 20 },
    { range: '20', min: 20, max: 21 },
  ];

  const total = rows.length;
  if (total === 0) return ranges.map(r => ({ range: r.range, count: 0, percentage: 0 }));

  return ranges.map(({ range, min, max }) => {
    const count = rows.filter(r => {
      const v = parseFloat(String(r.avg ?? '0'));
      return v >= min && v < max;
    }).length;
    return { range, count, percentage: Math.round((count / total) * 100) };
  });
}

/** 6. Percentage above/below threshold */
export async function thresholdAnalysis(filters: StatFilters, threshold = 10): Promise<ThresholdResult[]> {
  const rows = await db
    .select({
      avg: reportCard.generalAverageOfficial,
    })
    .from(reportCard)
    .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
    .where(
      and(
        eq(enrollment.academicYearId, filters.academicYearId),
        filters.periodId ? eq(reportCard.academicPeriodId, filters.periodId) : undefined,
        eq(reportCard.status, 'published'),
      ),
    );

  const total = rows.length;
  if (total === 0) return [{ label: `Seuil ${threshold}/20`, aboveCount: 0, abovePct: 0, belowCount: 0, belowPct: 0 }];

  const above = rows.filter(r => parseFloat(String(r.avg ?? '0')) >= threshold).length;
  return [{
    label: `Seuil ${threshold}/20`,
    aboveCount: above,
    abovePct: Math.round((above / total) * 100),
    belowCount: total - above,
    belowPct: Math.round(((total - above) / total) * 100),
  }];
}

/** 7. Progression between periods */
export async function periodProgression(filters: StatFilters): Promise<PeriodProgression[]> {
  if (!filters.periodId) return [];

  const periods = await db
    .select({ id: academicPeriod.id, name: academicPeriod.name, sortOrder: academicPeriod.sortOrder })
    .from(academicPeriod)
    .where(eq(academicPeriod.academicYearId, filters.academicYearId))
    .orderBy(academicPeriod.sortOrder);

  const currentIdx = periods.findIndex(p => p.id === filters.periodId);
  if (currentIdx <= 0) return [];

  const prevPeriodId = periods[currentIdx - 1].id;

  const { neon } = await import('@neondatabase/serverless');
  const sqlq = neon(process.env.DATABASE_URL!);

  const rows = await sqlq`
    SELECT cur.student_id,
           cur.general_average_official as current_avg,
           prev.general_average_official as previous_avg
    FROM report_card cur
    JOIN report_card prev ON cur.student_id = prev.student_id
    JOIN enrollment e ON cur.enrollment_id = e.id
    WHERE cur.academic_period_id = ${filters.periodId}
      AND prev.academic_period_id = ${prevPeriodId}
      AND e.academic_year_id = ${filters.academicYearId}
      AND cur.status = 'published'
      AND prev.status = 'published'
  `;

  return rows.map((r: Record<string, unknown>) => {
    const cur = parseFloat(String(r.current_avg ?? '0'));
    const prev = parseFloat(String(r.previous_avg ?? '0'));
    return {
      studentId: String(r.student_id),
      studentName: '',
      previousAvg: prev.toFixed(2),
      currentAvg: cur.toFixed(2),
      change: (cur - prev).toFixed(2),
    };
  });
}

/** 8-9. Students progressing / declining */
export async function studentTrends(filters: StatFilters): Promise<{ improving: StudentTrend[]; declining: StudentTrend[]; stable: StudentTrend[] }> {
  if (!filters.periodId) return { improving: [], declining: [], stable: [] };

  const periods = await db
    .select({ id: academicPeriod.id, sortOrder: academicPeriod.sortOrder })
    .from(academicPeriod)
    .where(eq(academicPeriod.academicYearId, filters.academicYearId))
    .orderBy(academicPeriod.sortOrder);

  const currentIdx = periods.findIndex(p => p.id === filters.periodId);
  if (currentIdx <= 0) return { improving: [], declining: [], stable: [] };

  const prevPeriodId = periods[currentIdx - 1].id;
  const THRESHOLD = 0.5;

  const { neon } = await import('@neondatabase/serverless');
  const sqlq = neon(process.env.DATABASE_URL!);

  const rows = await sqlq`
    SELECT cur.student_id, cur.general_average_official as current_avg,
           prev.general_average_official as previous_avg
    FROM report_card cur
    JOIN report_card prev ON cur.student_id = prev.student_id
    JOIN enrollment e ON cur.enrollment_id = e.id
    WHERE cur.academic_period_id = ${filters.periodId}
      AND prev.academic_period_id = ${prevPeriodId}
      AND e.academic_year_id = ${filters.academicYearId}
      AND cur.status = 'published'
      AND prev.status = 'published'
  `;

  const improving: StudentTrend[] = [];
  const declining: StudentTrend[] = [];
  const stable: StudentTrend[] = [];

  for (const r of rows) {
    const cur = parseFloat(String((r as Record<string, unknown>).current_avg ?? '0'));
    const prev = parseFloat(String((r as Record<string, unknown>).previous_avg ?? '0'));
    const diff = cur - prev;
    const trend: StudentTrend['trend'] = diff > THRESHOLD ? 'improving' : diff < -THRESHOLD ? 'declining' : 'stable';
    const entry: StudentTrend = {
      studentId: String((r as Record<string, unknown>).student_id),
      studentName: '',
      previousAvg: prev.toFixed(2),
      currentAvg: cur.toFixed(2),
      trend,
    };
    if (trend === 'improving') improving.push(entry);
    else if (trend === 'declining') declining.push(entry);
    else stable.push(entry);
  }

  return { improving, declining, stable };
}

/** 10. Grade-entry completion */
export async function gradeEntryCompletion(filters: StatFilters): Promise<GradeCompletion[]> {
  const conditions = [
    eq(assessment.status, 'open'),
  ];

  if (filters.periodId) {
    conditions.push(eq(assessment.academicPeriodId, filters.periodId));
  } else {
    const periods = await db
      .select({ id: academicPeriod.id })
      .from(academicPeriod)
      .where(eq(academicPeriod.academicYearId, filters.academicYearId));
    const pids = periods.map(p => p.id);
    if (pids.length > 0) conditions.push(inArray(assessment.academicPeriodId, pids));
    else return [];
  }

  const openAssessments = await db
    .select({ id: assessment.id })
    .from(assessment)
    .where(and(...conditions));

  const results: GradeCompletion[] = [];
  for (const a of openAssessments) {
    const [total] = await db.select({ c: count() }).from(grade).where(eq(grade.assessmentId, a.id));
    const [graded] = await db.select({ c: count() }).from(grade).where(and(eq(grade.assessmentId, a.id), ne(grade.status, 'pending')));
    const pct = total.c > 0 ? Math.round((graded.c / total.c) * 100) : 100;

    const info = await db
      .select({ title: assessment.title, classroomName: classroom.name, subjectName: subject.name })
      .from(assessment)
      .innerJoin(classroom, eq(assessment.classroomId, classroom.id))
      .innerJoin(subject, eq(assessment.subjectId, subject.id))
      .where(eq(assessment.id, a.id))
      .limit(1);

    if (info[0]) {
      results.push({
        assessmentId: a.id,
        assessmentTitle: info[0].title,
        classroomName: info[0].classroomName,
        subjectName: info[0].subjectName,
        totalStudents: total.c,
        gradedCount: graded.c,
        completionPct: pct,
      });
    }
  }

  return results;
}

/** 11. Report-card workflow completion */
export async function reportCardWorkflow(filters: StatFilters): Promise<ReportCardWorkflow[]> {
  const rows = await db
    .select({
      status: reportCard.status,
      c: count(),
    })
    .from(reportCard)
    .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
    .where(
      and(
        eq(enrollment.academicYearId, filters.academicYearId),
        filters.periodId ? eq(reportCard.academicPeriodId, filters.periodId) : undefined,
      ),
    )
    .groupBy(reportCard.status);

  return rows.map(r => ({ status: r.status, count: r.c }));
}

/** Get filter reference data */
export async function getFilterRefs(schoolId: string) {
  const [years] = await db
    .select({ id: academicYear.id, name: academicYear.name, status: academicYear.status })
    .from(academicYear)
    .where(eq(academicYear.schoolId, schoolId))
    .orderBy(academicYear.createdAt);

  const levels = await db
    .select({ id: level.id, name: level.name })
    .from(level)
    .where(eq(level.schoolId, schoolId))
    .orderBy(level.sortOrder);

  return { academicYears: years, levels };
}
