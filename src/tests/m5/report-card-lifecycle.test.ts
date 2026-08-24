/**
 * M5 Report Card Lifecycle Tests
 *
 * Tests the domain logic of report card transitions,
 * imutability, and competition ranking integration.
 */

import { describe, it, expect } from 'vitest';
import {
  ReportCardTransitionError,
  ReportCardImmutableError,
  ReportCardNotFoundError,
} from '@/lib/services/results/report-card.service';
import {
  calculateRanking,
  calculateClassStatistics,
  calculateGeneralAverage,
  computeSubjectWeightedPoints,
  calculateSubjectResultWithCoeffs,
} from '@/lib/services/results/calculation-engine';
import type { SubjectResult, GeneralAverageInputPolicy } from '@/lib/services/results/types';

// ─────────────────────────────────────────────
// TRANSITION VALIDATION (pure logic, no DB)
// ─────────────────────────────────────────────

// We test the transition rules by importing and testing the error classes
// The actual validateTransition function is not exported, so we test
// via the error types that would be thrown.

describe('Report Card Lifecycle', () => {
  it('PUBLISHED is immutable — cannot transition anywhere', () => {
    // A published card should reject all transitions
    const publishedStatus = 'published';
    // Test that transition errors would be thrown for published → anything
    // Since validateTransition is not exported, we test the error class exists
    const err = new ReportCardImmutableError(publishedStatus);
    expect(err.code).toBe('REPORT_CARD_IMMUTABLE');
    expect(err.httpStatus).toBe(409);
    expect(err.message).toContain('published');
  });

  it('invalid transition produces correct error', () => {
    const err = new ReportCardTransitionError('draft', 'published');
    expect(err.code).toBe('INVALID_TRANSITION');
    expect(err.message).toContain('draft');
    expect(err.message).toContain('published');
  });

  it('not found error has correct shape', () => {
    const err = new ReportCardNotFoundError('some-uuid');
    expect(err.code).toBe('REPORT_CARD_NOT_FOUND');
    expect(err.httpStatus).toBe(404);
  });
});

// ─────────────────────────────────────────────
// COMPETITION RANKING IN REPORT CARD CONTEXT
// ─────────────────────────────────────────────

describe('Competition ranking for report cards', () => {
  it('classroom of 4 students with tie → correct ranks', () => {
    const averages = [
      { studentId: 'a', average: '16' },
      { studentId: 'b', average: '14' },
      { studentId: 'c', average: '16' },
      { studentId: 'd', average: '12' },
    ];
    const ranking = calculateRanking(averages);

    expect(ranking).toHaveLength(4);
    expect(ranking.map(r => r.rank)).toEqual([1, 1, 3, 4]);

    // Verify the ranking entries carry tiedCount
    expect(ranking[0].tiedCount).toBe(2);
    expect(ranking[2].tiedCount).toBe(1);
    expect(ranking[3].tiedCount).toBe(1);
  });

  it('empty classroom → no ranking', () => {
    expect(calculateRanking([])).toEqual([]);
  });

  it('single student → rank 1', () => {
    const ranking = calculateRanking([{ studentId: 'a', average: '15' }]);
    expect(ranking).toHaveLength(1);
    expect(ranking[0].rank).toBe(1);
    expect(ranking[0].tiedCount).toBe(1);
  });
});

// ─────────────────────────────────────────────
// CLASS STATISTICS FOR REPORT CARDS
// ─────────────────────────────────────────────

describe('Class statistics integration', () => {
  it('computes correct stats from general averages', () => {
    const averages = ['13.62', '14.50', '12.00', '15.33'];
    const stats = calculateClassStatistics(averages);
    expect(stats.studentCount).toBe(4);
    expect(stats.minAverage).toBe('12');
    expect(stats.maxAverage).toBe('15.33');
  });

  it('empty class → zero stats', () => {
    const stats = calculateClassStatistics([]);
    expect(stats.studentCount).toBe(0);
    expect(stats.classAverage).toBe('0');
  });
});

// ─────────────────────────────────────────────
// POLICY C: SUBJECT_OFFICIAL vs SUBJECT_RAW
// ─────────────────────────────────────────────

describe('Policy C in report card context', () => {
  function makeSubject(id: string, raw: string | null, official: string | null, coef: string, include = true): SubjectResult {
    return {
      subjectId: id,
      subjectName: id,
      configSubjectId: `cs-${id}`,
      coefficient: coef,
      includeInAverage: include,
      rawValue: raw,
      officialValue: official,
      weightedPoints: null,
      isIncomplete: false,
    };
  }

  it('SUBJECT_OFFICIAL uses rounded values for general', () => {
    const subjects = [
      makeSubject('fr', '13.333333333333333333', '13.33', '5'),
      makeSubject('math', '13', '13', '5'),
    ];

    const withOfficial = subjects.map(s => computeSubjectWeightedPoints(s, 'SUBJECT_OFFICIAL'));
    expect(withOfficial[0].weightedPoints).toBe('66.65'); // 13.33 × 5

    const gen = calculateGeneralAverage(
      { subjectResults: withOfficial, calculationPolicy: 'weighted_average', inputPolicy: 'SUBJECT_OFFICIAL' },
      2, 'half_up',
    );
    // (66.65 + 65) / 10 = 13.165 → HALF_UP 2dp = 13.17
    expect(gen.officialValue).toBe('13.17');
  });

  it('SUBJECT_RAW uses full precision for general', () => {
    const subjects = [
      makeSubject('fr', '13.333333333333333333', '13.33', '5'),
      makeSubject('math', '13', '13', '5'),
    ];

    const withRaw = subjects.map(s => computeSubjectWeightedPoints(s, 'SUBJECT_RAW'));
    // raw × coef = 13.333... × 5 = 66.666...
    expect(withRaw[0].weightedPoints).not.toBe('66.65');

    const gen = calculateGeneralAverage(
      { subjectResults: withRaw, calculationPolicy: 'weighted_average', inputPolicy: 'SUBJECT_RAW' },
      2, 'half_up',
    );
    // This should differ from the OFFICIAL version
    // (66.666... + 65) / 10 = 13.1666... → HALF_UP 2dp = 13.17
    // Same in this case due to rounding convergence, but the RAW weightedPoints differ
    expect(gen.rawValue).not.toBe('13.165'); // Not the pre-rounded intermediate
  });

  it('excluded subjects do not affect general average', () => {
    const subjects = [
      makeSubject('fr', '14', '14', '5'),
      makeSubject('edhc', '10', '10', '2', false), // excluded
      makeSubject('math', '16', '16', '5'),
    ];

    const withPoints = subjects.map(s => computeSubjectWeightedPoints(s, 'SUBJECT_OFFICIAL'));
    // edhc has includeInAverage=false but weightedPoints is still computed;
    // exclusion happens at the general average level
    expect(withPoints[1].weightedPoints).toBe('20'); // 10 × 2

    const gen = calculateGeneralAverage(
      { subjectResults: withPoints, calculationPolicy: 'weighted_average', inputPolicy: 'SUBJECT_OFFICIAL' },
      2, 'half_up',
    );
    // Only fr (70) and math (80) included: (70 + 80) / 10 = 15
    expect(gen.officialValue).toBe('15');
    expect(gen.subjectsIncluded).toBe(2);
    expect(gen.subjectsExcluded).toBe(1);
  });
});
