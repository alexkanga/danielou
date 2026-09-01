/**
 * M5 Calculation Engine — Pure domain functions
 *
 * All functions are deterministic, side-effect-free, and use
 * decimal.js for precise arithmetic.
 *
 * OWNER DECISION — POLICY C (CANONICAL):
 * ─────────────────────────────────────────────────
 *   Assessment: RAW value only (full Decimal precision)
 *   Component:  RAW value only
 *   Subject:    rawValue (full precision) + officialValue (rounded)
 *   General:    rawValue + officialValue
 *
 * general_average_input_policy (SUBJECT_OFFICIAL | SUBJECT_RAW)
 * selects which subject value enters the general average.
 *
 * No intermediate rounding. No hidden rounding. No per-level rounding config.
 */

import Decimal from 'decimal.js';
import {
  round as roundDecimal,
  rawSimpleAverage,
  rawWeightedAverage,
  multiply,
  add,
} from '@/lib/decimal';
import type { RoundingStrategy as RoundingStrategyLib } from '@/lib/decimal';
import {
  ROUNDING_MAP,
  GRADE_STATUS_BEHAVIOR,
  type GradeInput,
  type AssessmentResult,
  type ComponentInput,
  type ComponentResult,
  type SubjectInput,
  type SubjectResult,
  type GeneralAverageInput,
  type GeneralAverageOutput,
  type ClassStatistics,
  type RankingEntry,
  type AggregationPolicy,
  type IncompleteInfo,
  type GeneralAverageInputPolicy,
} from './types';
import type { RoundingStrategyDB } from './types';

Decimal.set({ precision: 20 });

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function toRoundingLib(strategy: RoundingStrategyDB): RoundingStrategyLib {
  return ROUNDING_MAP[strategy];
}

function toRoundingMode(rs: RoundingStrategyLib): Decimal.Rounding {
  switch (rs) {
    case 'HALF_UP': return Decimal.ROUND_HALF_UP;
    case 'HALF_EVEN': return Decimal.ROUND_HALF_EVEN;
    case 'TRUNCATE': return Decimal.ROUND_DOWN;
  }
}

function isZero(value: string | null | undefined): boolean {
  if (!value) return true;
  return new Decimal(value).isZero();
}

/**
 * Filter grades to only those that CONTRIBUTE to the average.
 *
 * WS-003 Contract §7 (FROZEN):
 *   graded          → included with recorded rawValue
 *   absent_unexcused→ included as penalizing zero (rawValue='0')
 *   absent_excused  → excluded (neutral)
 *   exempt          → excluded (neutral)
 *   not_evaluated   → excluded (neutral)
 *   pending         → excluded, marks result as incomplete
 */
function filterContributingGrades(grades: GradeInput[]): GradeInput[] {
  return grades
    .map(g => {
      const behavior = GRADE_STATUS_BEHAVIOR[g.status];
      if (behavior === 'PENALIZING_ZERO') {
        // AI: earned=0, full max retained. Inject zero as the rawValue.
        return { ...g, rawValue: '0' };
      }
      return g;
    })
    .filter(g => {
      const behavior = GRADE_STATUS_BEHAVIOR[g.status];
      if (behavior !== 'CONTRIBUTES' && behavior !== 'PENALIZING_ZERO') return false;
      if (g.rawValue === null) return false;
      return true;
    });
}

function hasIncompleteStatus(grades: GradeInput[]): boolean {
  return grades.some(g => GRADE_STATUS_BEHAVIOR[g.status] === 'INCOMPLETE');
}

// ─────────────────────────────────────────────
// 1. ASSESSMENT RESULT
// ─────────────────────────────────────────────

/**
 * Calculate the RAW result for a single assessment.
 * No rounding is applied. Returns full Decimal precision.
 */
export function calculateAssessmentResult(
  grades: GradeInput[],
  aggregation: AggregationPolicy,
  targetScale: number,
): AssessmentResult {
  const contributing = filterContributingGrades(grades);
  const incomplete = hasIncompleteStatus(grades);
  const statusExcluded = grades.length - contributing.length;

  if (contributing.length === 0) {
    return {
      assessmentId: grades[0]?.id ?? '',
      configComponentId: null,
      result: null,
      isIncomplete: incomplete,
      contributingCount: 0,
      excludedCount: grades.length,
    };
  }

  let result: string | null = null;

  if (aggregation === 'single_grade') {
    const g = contributing[0];
    if (g.scale !== targetScale) {
      result = new Decimal(g.rawValue!)
        .times(new Decimal(targetScale))
        .div(new Decimal(g.scale))
        .toString();
    } else {
      result = g.rawValue!;
    }
  } else if (aggregation === 'simple_average') {
    const normalizedValues = contributing.map(g => {
      if (g.scale !== targetScale) {
        return new Decimal(g.rawValue!)
          .times(new Decimal(targetScale))
          .div(new Decimal(g.scale)).toString();
      }
      return g.rawValue!.toString();
    });
    result = rawSimpleAverage(normalizedValues);
  } else {
    // weighted_average — assessment coefficients
    const weighted = contributing.map(g => {
      const normalized = g.scale !== targetScale
        ? new Decimal(g.rawValue!).times(new Decimal(targetScale)).div(new Decimal(g.scale)).toString()
        : g.rawValue!.toString();
      return { grade: normalized, weight: Number(g.coefficient) };
    });
    result = rawWeightedAverage(weighted);
  }

  return {
    assessmentId: grades[0]?.id ?? '',
    configComponentId: null,
    result,
    isIncomplete: incomplete,
    contributingCount: aggregation === 'single_grade' ? 1 : contributing.length,
    excludedCount: statusExcluded,
  };
}

// ─────────────────────────────────────────────
// 2. COMPONENT RESULT
// ─────────────────────────────────────────────

/**
 * Calculate the RAW result for a single component.
 * No rounding applied. configComponent.coefficient is used
 * when aggregating components INTO the subject, not here.
 */
export function calculateComponentResult(
  input: ComponentInput,
): ComponentResult {
  const { assessmentResults, aggregation } = input;
  const contributing = assessmentResults.filter(r => r.result !== null);
  const incomplete = assessmentResults.some(r => r.isIncomplete);

  if (contributing.length === 0) {
    return {
      componentId: input.componentId,
      componentName: input.componentName,
      result: null,
      isIncomplete: incomplete,
      contributingAssessments: 0,
      excludedAssessments: assessmentResults.length,
    };
  }

  let result: string | null = null;

  if (aggregation === 'single_grade') {
    result = contributing[0].result!;
  } else {
    // simple_average or weighted_average
    // At component level, assessment results are treated equally
    // (assessment-level weights already applied during calculateAssessmentResult)
    const values = contributing.map(r => r.result!);
    result = rawSimpleAverage(values);
  }

  return {
    componentId: input.componentId,
    componentName: input.componentName,
    result,
    isIncomplete: incomplete,
    contributingAssessments: contributing.length,
    excludedAssessments: assessmentResults.length - contributing.length,
  };
}

// ─────────────────────────────────────────────
// 3. SUBJECT RESULT
// ─────────────────────────────────────────────

/**
 * Calculate subject result with explicit component coefficients.
 *
 * Returns:
 *   rawValue       — full-precision calculated result
 *   officialValue   — round(rawValue, subjectDecimalPlaces, roundingStrategy)
 *   weightedPoints  — computed by computeSubjectWeightedPoints() based on policy
 *
 * This function does NOT set weightedPoints (it's null).
 * Call computeSubjectWeightedPoints() after to populate it.
 */
export function calculateSubjectResultWithCoeffs(
  input: SubjectInput,
  componentCoefficients: Map<string, string>,
  decimals: number,
  roundingStrategy: RoundingStrategyDB,
): SubjectResult {
  const rs = toRoundingLib(roundingStrategy);
  const hasComponents = input.componentResults.length > 0;

  let rawValue: string | null = null;
  let isIncomplete = false;

  if (hasComponents) {
    const contributing = input.componentResults.filter(r => r.result !== null);
    isIncomplete = input.componentResults.some(r => r.isIncomplete);

    if (contributing.length === 0) {
      rawValue = null;
    } else if (input.aggregation === 'single_grade') {
      rawValue = contributing[0].result;
    } else if (input.aggregation === 'weighted_average') {
      const weighted = contributing.map(cr => ({
        grade: cr.result!,
        weight: Number(componentCoefficients.get(cr.componentId) ?? '1'),
      }));
      rawValue = rawWeightedAverage(weighted);
    } else {
      const values = contributing.map(r => r.result!);
      rawValue = rawSimpleAverage(values);
    }
  } else {
    const contributing = input.assessmentResults.filter(r => r.result !== null);
    isIncomplete = input.assessmentResults.some(r => r.isIncomplete);

    if (contributing.length === 0) {
      rawValue = null;
    } else if (input.aggregation === 'single_grade') {
      rawValue = contributing[0].result;
    } else {
      const values = contributing.map(r => r.result!);
      rawValue = rawSimpleAverage(values);
    }
  }

  const officialValue = rawValue ? roundDecimal(rawValue, decimals, rs) : null;

  return {
    subjectId: input.subjectId,
    subjectName: input.subjectName,
    configSubjectId: input.configSubjectId,
    coefficient: input.coefficient,
    includeInAverage: input.includeInAverage,
    rawValue,
    officialValue,
    weightedPoints: null, // Populated by computeSubjectWeightedPoints
    isIncomplete,
    componentDetails: hasComponents ? input.componentResults : undefined,
    assessmentDetails: hasComponents ? undefined : input.assessmentResults,
  };
}

/**
 * Compute weightedPoints for a subject based on the general_average_input_policy.
 *
 * SUBJECT_OFFICIAL: weightedPoints = officialValue × coefficient
 * SUBJECT_RAW:      weightedPoints = rawValue × coefficient
 */
export function computeSubjectWeightedPoints(
  subjectResult: SubjectResult,
  policy: GeneralAverageInputPolicy,
): SubjectResult {
  if (subjectResult.rawValue === null) {
    return { ...subjectResult, weightedPoints: null };
  }

  let input: string | null;
  if (policy === 'SUBJECT_OFFICIAL') {
    input = subjectResult.officialValue;
  } else {
    input = subjectResult.rawValue;
  }

  const weightedPoints = input ? multiply(input, subjectResult.coefficient) : null;
  return { ...subjectResult, weightedPoints };
}

// ─────────────────────────────────────────────
// 4. GENERAL AVERAGE
// ─────────────────────────────────────────────

/**
 * Calculate the general average from subject results.
 *
 * The input policy (SUBJECT_OFFICIAL | SUBJECT_RAW) is already resolved
 * in SubjectResult.weightedPoints. This function aggregates weightedPoints.
 *
 * Returns:
 *   rawValue      — full-precision weighted average
 *   officialValue  — round(rawValue, generalDecimalPlaces, roundingStrategy)
 *
 * Subjects with includeInAverage=false or null weightedPoints are excluded.
 */
export function calculateGeneralAverage(
  input: GeneralAverageInput,
  decimals: number,
  roundingStrategy: RoundingStrategyDB,
): GeneralAverageOutput {
  const rs = toRoundingLib(roundingStrategy);
  const rm = toRoundingMode(rs);

  const eligible = input.subjectResults.filter(sr =>
    sr.includeInAverage && sr.weightedPoints !== null
  );
  const excluded = input.subjectResults.filter(sr =>
    !sr.includeInAverage || sr.weightedPoints === null
  );
  const isIncomplete = input.subjectResults.some(sr => sr.isIncomplete);

  if (eligible.length === 0) {
    return {
      officialValue: '0',
      rawValue: '0',
      totalWeightedPoints: '0',
      totalEligibleCoefficient: '0',
      subjectsIncluded: 0,
      subjectsExcluded: input.subjectResults.length,
      isIncomplete,
    };
  }

  if (input.calculationPolicy === 'simple_average') {
    // Simple average ignores coefficients — use the weightedPoints values directly
    // (for simple policy, weightedPoints = selected value × 1 or just selected value)
    const values = eligible.map(sr => sr.weightedPoints!);
    const raw = rawSimpleAverage(values);
    return {
      officialValue: new Decimal(raw).toDecimalPlaces(decimals, rm as Decimal.Rounding).toString(),
      rawValue: raw,
      totalWeightedPoints: '0',
      totalEligibleCoefficient: String(eligible.length),
      subjectsIncluded: eligible.length,
      subjectsExcluded: excluded.length,
      isIncomplete,
    };
  }

  // weighted_average: sum(weightedPoints) / sum(coefficients)
  const totalWeightedPoints = eligible.reduce(
    (sum, sr) => add(sum, sr.weightedPoints ?? '0'),
    '0',
  );
  const totalEligibleCoefficient = eligible.reduce(
    (sum, sr) => add(sum, sr.coefficient),
    '0',
  );

  const rawValue = new Decimal(totalWeightedPoints)
    .div(new Decimal(totalEligibleCoefficient))
    .toString();

  const officialValue = new Decimal(rawValue)
    .toDecimalPlaces(decimals, rm as Decimal.Rounding)
    .toString();

  return {
    officialValue,
    rawValue,
    totalWeightedPoints,
    totalEligibleCoefficient,
    subjectsIncluded: eligible.length,
    subjectsExcluded: excluded.length,
    isIncomplete,
  };
}

// ─────────────────────────────────────────────
// 5. CLASS STATISTICS
// ─────────────────────────────────────────────

/**
 * Calculate class statistics from official general averages.
 * Only includes students with non-null, non-zero averages.
 */
export function calculateClassStatistics(averages: string[]): ClassStatistics {
  const valid = averages.filter(a => a !== null && a !== undefined && !isZero(a));
  if (valid.length === 0) {
    return { classAverage: '0', minAverage: '0', maxAverage: '0', studentCount: 0 };
  }

  const sum = valid.reduce((acc, v) => acc.plus(new Decimal(v)), new Decimal(0));
  const avg = sum.div(new Decimal(valid.length));
  let min = new Decimal(valid[0]);
  let max = new Decimal(valid[0]);
  for (const v of valid) {
    const d = new Decimal(v);
    if (d.lt(min)) min = d;
    if (d.gt(max)) max = d;
  }

  return {
    classAverage: avg.toString(),
    minAverage: min.toString(),
    maxAverage: max.toString(),
    studentCount: valid.length,
  };
}

// ─────────────────────────────────────────────
// 6. RANKING (competition ranking — Daniélou canonical)
// ─────────────────────────────────────────────

/**
 * Calculate rankings from student averages.
 *
 * COMPETITION RANKING (Daniélou canonical convention):
 *   rank = 1 + number of eligible students with a strictly higher average.
 *   Ties share the same rank; the next distinct value skips.
 *
 *   Example: 16, 16, 14, 12 → ranks 1, 1, 3, 4
 *
 * Returns ALL students, sorted by average descending.
 * Only includes students with non-null, non-zero averages.
 * Uses the eligible population defined by the M5 contract.
 * No configurable ranking algorithm at this stage.
 */
export function calculateRanking(
  entries: { studentId: string; average: string }[],
): RankingEntry[] {
  const valid = entries
    .filter(e => e.average !== null && !isZero(e.average))
    .map(e => ({ ...e, decAvg: new Decimal(e.average) }))
    .sort((a, b) => b.decAvg.cmp(a.decAvg)); // Descending

  if (valid.length === 0) return [];

  const results: RankingEntry[] = [];
  let i = 0;

  while (i < valid.length) {
    // Competition ranking: rank = 1 + count of students with strictly higher average
    // Since sorted descending, that count equals the current index i.
    const rank = i + 1;

    // Count entries sharing this value
    let tiedCount = 1;
    for (let j = i + 1; j < valid.length; j++) {
      if (valid[j].decAvg.equals(valid[i].decAvg)) {
        tiedCount++;
      } else {
        break;
      }
    }

    // Push ALL entries in the group with the same rank
    for (let j = i; j < i + tiedCount; j++) {
      results.push({
        studentId: valid[j].studentId,
        average: valid[j].average,
        rank,
        tiedCount,
      });
    }
    i += tiedCount;
  }

  return results;
}

// ─────────────────────────────────────────────
// 7. INCOMPLETENESS REPORT
// ─────────────────────────────────────────────

/**
 * Collect all incompleteness info from a set of subject results.
 */
export function collectIncompleteness(
  subjectResults: SubjectResult[],
): IncompleteInfo[] {
  const info: IncompleteInfo[] = [];
  for (const sr of subjectResults) {
    if (!sr.isIncomplete && sr.rawValue !== null) continue;
    if (sr.rawValue === null && !sr.isIncomplete) {
      info.push({
        subjectId: sr.subjectId,
        subjectName: sr.subjectName,
        reason: 'No contributing grades',
      });
      continue;
    }
    if (sr.isIncomplete) {
      info.push({
        subjectId: sr.subjectId,
        subjectName: sr.subjectName,
        reason: 'Pending grades',
      });
    }
  }
  return info;
}
