/**
 * WS-002-M4 — Annual Results Data Service
 *
 * Loads composition/passage results per period via M2 service,
 * then computes annual results via M4 engine.
 * Extended: retrieves promotion threshold and derives recommendations.
 */

import { eq, and, asc, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { academicPeriod, classroom, enrollment, classroomAssignment, student, pedagogicalConfig, annualResult } from '@/lib/db/schema';
import { getCompositionClassResults } from './composition-data.service';
import { calculateAnnualStudent, calculateAnnualClassAverage, calculateAnnualRanking } from './annual-engine';
import { NotFoundError } from '@/lib/services/pedagogy/errors';
import type { AnnualStudentRow, AnnualStudentResult, PeriodCompositionResult } from './annual.types';

export interface AnnualClassParams {
  academicYearId: string;
  classroomId: string;
}

export interface AnnualClassResultWithDetails {
  academicYearId: string;
  classroomId: string;
  classroomName: string;
  periods: { periodId: string; periodName: string; periodType: string; sortOrder: number }[];
  students: AnnualStudentRow[];
  classAverage: { status: string; annualOfficial: string | null; studentCount: number };
  ranking: { studentId: string; average: string; rank: number; tiedCount: number }[];
  /** The applicable promotion threshold. NULL = not configured. */
  promotionThreshold: string | null;
}

/**
 * Retrieve the active promotion threshold for a given level + academic year.
 * Returns NULL when no threshold is configured.
 */
async function getPromotionThreshold(
  levelId: string,
  academicYearId: string,
): Promise<string | null> {
  const [config] = await db
    .select({ promotionThreshold: pedagogicalConfig.promotionThreshold })
    .from(pedagogicalConfig)
    .where(
      and(
        eq(pedagogicalConfig.levelId, levelId),
        eq(pedagogicalConfig.academicYearId, academicYearId),
        eq(pedagogicalConfig.status, 'active'),
      ),
    )
    .limit(1);

  return config?.promotionThreshold ?? null;
}

export async function getAnnualClassResults(params: AnnualClassParams): Promise<AnnualClassResultWithDetails> {
  const { academicYearId, classroomId } = params;

  // 1. Validate classroom belongs to year and get levelId
  const [cls] = await db.select({
    id: classroom.id, name: classroom.name, academicYearId: classroom.academicYearId, levelId: classroom.levelId,
  }).from(classroom).where(eq(classroom.id, classroomId)).limit(1);
  if (!cls) throw new NotFoundError('classroom', classroomId);
  if (cls.academicYearId !== academicYearId) throw new Error('La classe et l\'année scolaire ne correspondent pas.');

  // 2. Retrieve applicable promotion threshold
  const promotionThreshold = await getPromotionThreshold(cls.levelId, academicYearId);

  // 3. Load all composition + passage periods for this year
  const periods = await db.select({
    id: academicPeriod.id, name: academicPeriod.name, periodType: academicPeriod.periodType, sortOrder: academicPeriod.sortOrder,
  }).from(academicPeriod)
    .where(and(eq(academicPeriod.academicYearId, academicYearId)))
    .orderBy(asc(academicPeriod.sortOrder));

  // Filter to composition and passage only
  const compPeriods = periods.filter(p => p.periodType === 'composition' || p.periodType === 'passage');

  // 4. Load eligible students for this classroom + year
  const students = await db.select({
    enrollmentId: enrollment.id, studentId: student.id,
    studentFirstName: student.firstName, studentLastName: student.lastName,
  }).from(classroomAssignment)
    .innerJoin(enrollment, eq(classroomAssignment.enrollmentId, enrollment.id))
    .innerJoin(student, eq(enrollment.studentId, student.id))
    .where(and(
      eq(classroomAssignment.classroomId, classroomId),
      eq(classroomAssignment.status, 'active'),
      eq(enrollment.status, 'active'),
      eq(enrollment.academicYearId, academicYearId),
    )).orderBy(asc(student.lastName), asc(student.firstName));

  // 5. For each period, load composition results
  const periodResultsMap = new Map<string, Map<string, PeriodCompositionResult>>();
  const validPeriods: { periodId: string; periodName: string; periodType: string; sortOrder: number }[] = [];

  for (const period of compPeriods) {
    try {
      const compResult = await getCompositionClassResults({ academicPeriodId: period.id, classroomId });
      validPeriods.push({ periodId: period.id, periodName: period.name, periodType: compResult.periodType, sortOrder: period.sortOrder });
      const perStudent = new Map<string, PeriodCompositionResult>();
      for (const s of compResult.students) {
        perStudent.set(s.studentId, {
          periodId: period.id,
          periodName: period.name,
          periodType: compResult.periodType,
          status: s.result.status,
          raw: s.result.raw,
          official: s.result.official,
        });
      }
      periodResultsMap.set(period.id, perStudent);
    } catch {
      // Period has no assessments for this classroom - skip it silently
    }
  }

  // 6. Load any existing persisted annual results for this classroom's enrollments
  const enrollmentIds = students.map(s => s.enrollmentId);
  const persistedMap = new Map<string, {
    finalDecision: string | null;
    decisionJustification: string | null;
    decidedAt: string | null;
  }>();
  if (enrollmentIds.length > 0) {
    const allPersisted = await db.select({
      enrollmentId: annualResult.enrollmentId,
      finalDecision: annualResult.finalDecision,
      decisionJustification: annualResult.decisionJustification,
      decidedAt: annualResult.decidedAt,
    }).from(annualResult)
      .where(inArray(annualResult.enrollmentId, enrollmentIds));
    for (const p of allPersisted) {
      persistedMap.set(p.enrollmentId, {
        finalDecision: p.finalDecision,
        decisionJustification: p.decisionJustification,
        decidedAt: p.decidedAt?.toISOString() ?? null,
      });
    }
  }

  // 7. For each student, build period results array and compute annual
  const annualRows: AnnualStudentRow[] = [];
  const allAnnualResults: AnnualStudentResult[] = [];

  for (const s of students) {
    const studentPeriodResults: PeriodCompositionResult[] = [];
    for (const p of validPeriods) {
      const perStudent = periodResultsMap.get(p.periodId);
      const result = perStudent?.get(s.studentId);
      if (result) {
        studentPeriodResults.push(result);
      } else {
        if (perStudent && perStudent.size > 0) {
          studentPeriodResults.push({
            periodId: p.periodId, periodName: p.periodName, periodType: p.periodType as 'composition' | 'passage',
            status: 'INCOMPLETE', raw: null, official: null,
          });
        }
      }
    }

    const annual = calculateAnnualStudent(s.studentId, studentPeriodResults);
    const persisted = persistedMap.get(s.enrollmentId);
    annualRows.push({
      enrollmentId: s.enrollmentId, studentId: s.studentId,
      studentFirstName: s.studentFirstName, studentLastName: s.studentLastName,
      periodResults: studentPeriodResults, annual,
      annualRank: null,
      // Attach persisted decision if any
      ...(persisted ? { persistedFinalDecision: persisted.finalDecision, persistedJustification: persisted.decisionJustification, decidedAt: persisted.decidedAt } : {}),
    });
    allAnnualResults.push(annual);
  }

  // 8. Class average
  const classAvg = calculateAnnualClassAverage(allAnnualResults);

  // 9. Annual ranking
  const ranking = calculateAnnualRanking(allAnnualResults);
  const rankMap = new Map(ranking.map(r => [r.studentId, r]));
  for (const row of annualRows) {
    row.annualRank = rankMap.get(row.studentId) ?? null;
  }

  return {
    academicYearId, classroomId, classroomName: cls.name,
    periods: validPeriods, students: annualRows,
    classAverage: { status: classAvg.status, annualOfficial: classAvg.annualOfficial, studentCount: classAvg.studentCount },
    ranking,
    promotionThreshold,
  };
}
