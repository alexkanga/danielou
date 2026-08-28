import Decimal from 'decimal.js';
import { round, rawSimpleAverage } from '@/lib/decimal';
import { calculateRanking } from './calculation-engine';
import type {
  CompositionAssessmentInput,
  CompositionStudentResult,
  CompositionClassResult,
  CompositionRankingEntry,
} from './composition.types';
import type { RankingEntry } from './types';

Decimal.set({ precision: 20 });

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

/**
 * Classify a single assessment's contribution per OWNER-approved policy.
 *
 * Returns { earned, max, isIncomplete }.
 * earned/max = null means excluded (neutral).
 * earned = '0' means AI penalizing zero with max retained.
 */
function classifyAssessment(
  assessment: CompositionAssessmentInput,
): { earned: string | null; max: number | null; isIncomplete: boolean } {
  switch (assessment.status) {
    case 'graded': {
      if (assessment.rawValue === null || assessment.maxPoints <= 0) {
        return { earned: null, max: null, isIncomplete: true };
      }
      const earned = new Decimal(assessment.rawValue);
      const max = new Decimal(assessment.maxPoints);
      if (earned.lt(0)) {
        return { earned: null, max: null, isIncomplete: true };
      }
      if (earned.gt(max)) {
        return { earned: null, max: null, isIncomplete: true };
      }
      return { earned: assessment.rawValue, max: assessment.maxPoints, isIncomplete: false };
    }
    case 'absent_unexcused':
      // AI: penalizing zero. Earned = 0, max retained.
      return { earned: '0', max: assessment.maxPoints, isIncomplete: false };
    case 'absent_excused':
    case 'exempt':
    case 'not_evaluated':
      // Neutral: both excluded.
      return { earned: null, max: null, isIncomplete: false };
    case 'pending':
      return { earned: null, max: null, isIncomplete: true };
  }
}

// ─────────────────────────────────────────────
// 1. COMPOSITION STUDENT CALCULATION
// ─────────────────────────────────────────────

/**
 * Calculate a single student's Composition/Passage result.
 *
 * Formula: studentRawAverage = (SUM(earned) / SUM(max)) × 10
 * Official:  HALF_UP(studentRawAverage, 2)
 *
 * Returns a discriminated result where 0, INCOMPLETE, and NO_COMPUTABLE_RESULT
 * are structurally distinct — callers cannot confuse numeric zero with
 * a non-computable or incomplete state.
 */
export function calculateCompositionStudent(
  studentId: string,
  assessments: CompositionAssessmentInput[],
  missingRequiredCount: number = 0,
): CompositionStudentResult {
  // Step 1: Check for INCOMPLETE conditions first.
  if (missingRequiredCount > 0) {
    return { studentId, status: 'INCOMPLETE', raw: null, official: null };
  }

  // Step 2: Classify all assessments.
  let totalEarned = new Decimal(0);
  let totalMax = new Decimal(0);
  let isIncomplete = false;

  for (const assessment of assessments) {
    const { earned, max, isIncomplete: assessmentIncomplete } = classifyAssessment(assessment);
    if (assessmentIncomplete) {
      isIncomplete = true;
    }
    if (earned !== null && max !== null) {
      totalEarned = totalEarned.plus(new Decimal(earned));
      totalMax = totalMax.plus(new Decimal(max));
    }
  }

  if (isIncomplete) {
    return { studentId, status: 'INCOMPLETE', raw: null, official: null };
  }

  // Step 3: Check for zero effective denominator.
  if (totalMax.isZero()) {
    return { studentId, status: 'NO_COMPUTABLE_RESULT', raw: null, official: null };
  }

  // Step 4: Compute raw average = (earned / max) × 10
  const rawValue = totalEarned
    .div(totalMax)
    .times(new Decimal(10))
    .toString();

  const officialValue = round(rawValue, 2, 'HALF_UP');

  return {
    studentId,
    status: 'CALCULATED',
    raw: rawValue,
    official: officialValue,
  };
}

// ─────────────────────────────────────────────
// 2. COMPOSITION CLASS AVERAGE
// ─────────────────────────────────────────────

/**
 * Calculate class average for a Composition/Passage.
 *
 * CRITICAL: Uses student RAW averages (not official) to avoid
 * cumulative rounding errors.
 *
 * Only students with status = CALCULATED are included.
 */
export function calculateCompositionClassAverage(
  studentResults: CompositionStudentResult[],
): CompositionClassResult {
  const eligible = studentResults.filter(
    (r) => r.status === 'CALCULATED' && r.raw !== null,
  );

  if (eligible.length === 0) {
    return { status: 'NO_COMPUTABLE_RESULT', raw: null, official: null, studentCount: 0 };
  }

  const rawValues = eligible.map((r) => r.raw!);
  const classRaw = rawSimpleAverage(rawValues);
  const classOfficial = round(classRaw, 2, 'HALF_UP');

  return {
    status: 'CALCULATED',
    raw: classRaw,
    official: classOfficial,
    studentCount: eligible.length,
  };
}

// ─────────────────────────────────────────────
// 3. COMPOSITION RANKING
// ─────────────────────────────────────────────

/**
 * Calculate competition ranking for a Composition/Passage.
 *
 * Reuses canonical calculateRanking() exactly.
 * Input: student OFFICIAL averages (status = CALCULATED only).
 *
 * Students with INCOMPLETE or NO_COMPUTABLE_RESULT are excluded
 * from ranking and not present in the output.
 */
export function calculateCompositionRanking(
  studentResults: CompositionStudentResult[],
): CompositionRankingEntry[] {
  const eligible = studentResults
    .filter((r) => r.status === 'CALCULATED' && r.official !== null)
    .map((r) => ({ studentId: r.studentId, average: r.official! }));

  if (eligible.length === 0) {
    return [];
  }

  const ranked: RankingEntry[] = calculateRanking(eligible);

  return ranked.map((r) => ({
    studentId: r.studentId,
    average: r.average,
    rank: r.rank,
    tiedCount: r.tiedCount,
  }));
}
