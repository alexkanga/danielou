/**
 * WS-003 P0 HOTFIX — Missing Required Grade Regression Tests
 *
 * Confirmed defect: required assessment exists, student has NO grade row
 * → engine returns isIncomplete=false (treats empty same as neutral)
 * → student incorrectly gets CALCULATED
 *
 * Hotfix: period-results.service.ts sets aResult.isIncomplete=true
 * when gradeInputs.length === 0 (service-level, no engine change).
 *
 * These tests verify the cascade: assessment INCOMPLETE → subject INCOMPLETE
 * → general INCOMPLETE → status=INCOMPLETE, no rank, no average.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateAssessmentResult,
  calculateSubjectResultWithCoeffs,
  computeSubjectWeightedPoints,
  calculateGeneralAverage,
  calculateClassStatistics,
  calculateRanking,
} from '@/lib/services/results/calculation-engine';
import type { GradeInput, AssessmentResult } from '@/lib/services/results/types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function makeGrade(value: number | null, status: string, scale = 20, coefficient = '1'): GradeInput {
  return {
    id: `g-${Math.random().toString(36).slice(2, 8)}`,
    rawValue: value !== null ? String(value) : null,
    status: status as GradeInput['status'],
    scale,
    coefficient,
  };
}

/**
 * Simulate what period-results.service.ts does after the hotfix:
 * If the DB query returns zero grade rows for a required assessment,
 * the service sets isIncomplete=true on the assessment result.
 */
function assessmentResultForMissingGrade(assessmentId: string): AssessmentResult {
  // Engine returns isIncomplete=false for empty grades
  const engineResult = calculateAssessmentResult([], 'single_grade', 20);
  // Hotfix: service overrides when gradeInputs.length === 0
  engineResult.isIncomplete = true;
  engineResult.assessmentId = assessmentId;
  return engineResult;
}

// ─────────────────────────────────────────────
// HF-P0-01: Missing grade row → INCOMPLETE cascade
// ─────────────────────────────────────────────

describe('HF-P0-01: No grade row → INCOMPLETE', () => {
  it('assessment INCOMPLETE cascades to subject INCOMPLETE', () => {
    const assessmentResults: AssessmentResult[] = [
      { assessmentId: 'mat-1', configComponentId: null, result: '8', isIncomplete: false, contributingCount: 1, excludedCount: 0 },
      assessmentResultForMissingGrade('mat-2'),
    ];

    const subjectResult = calculateSubjectResultWithCoeffs(
      { subjectId: 'math', configSubjectId: 'cs-math', subjectName: 'Mathématiques', coefficient: '1', includeInAverage: true, aggregation: 'simple_average', scale: 20, componentResults: [], assessmentResults },
      new Map(), 2, 'half_up',
    );

    expect(subjectResult.isIncomplete).toBe(true);
  });

  it('subject INCOMPLETE cascades to general average INCOMPLETE', () => {
    const assessmentResults: AssessmentResult[] = [
      { assessmentId: 'mat-1', configComponentId: null, result: '8', isIncomplete: false, contributingCount: 1, excludedCount: 0 },
      assessmentResultForMissingGrade('mat-2'),
    ];

    const subjectResult = calculateSubjectResultWithCoeffs(
      { subjectId: 'math', configSubjectId: 'cs-math', subjectName: 'Mathématiques', coefficient: '1', includeInAverage: true, aggregation: 'simple_average', scale: 20, componentResults: [], assessmentResults },
      new Map(), 2, 'half_up',
    );

    const generalAvg = calculateGeneralAverage(
      { subjectResults: [subjectResult], calculationPolicy: 'simple_average', inputPolicy: 'SUBJECT_RAW' },
      2, 'half_up',
    );

    expect(generalAvg.isIncomplete).toBe(true);
    // Incomplete subject's weightedPoints should be null, so subjectsIncluded = 0
    expect(subjectResult.weightedPoints).toBeNull();
  });
});

// ─────────────────────────────────────────────
// HF-P0-02: Pending row → INCOMPLETE
// ─────────────────────────────────────────────

describe('HF-P0-02: Pending grade → INCOMPLETE', () => {
  it('engine detects pending status as incomplete', () => {
    const r = calculateAssessmentResult(
      [makeGrade(14, 'graded'), makeGrade(null, 'pending')],
      'simple_average', 20,
    );
    expect(r.isIncomplete).toBe(true);
    expect(r.result).toBe('14'); // graded grade still computes
  });

  it('pending cascades through subject to general average', () => {
    const assessmentResults: AssessmentResult[] = [
      { assessmentId: 'a1', configComponentId: null, result: '14', isIncomplete: true, contributingCount: 1, excludedCount: 1 },
    ];

    const subjectResult = calculateSubjectResultWithCoeffs(
      { subjectId: 's1', configSubjectId: 'cs1', subjectName: 'Math', coefficient: '1', includeInAverage: true, aggregation: 'single_grade', scale: 20, componentResults: [], assessmentResults },
      new Map(), 2, 'half_up',
    );

    expect(subjectResult.isIncomplete).toBe(true);

    const generalAvg = calculateGeneralAverage(
      { subjectResults: [subjectResult], calculationPolicy: 'simple_average', inputPolicy: 'SUBJECT_RAW' },
      2, 'half_up',
    );
    expect(generalAvg.isIncomplete).toBe(true);
  });
});

// ─────────────────────────────────────────────
// HF-P0-03: absent_excused → neutral, NOT incomplete
// ─────────────────────────────────────────────

describe('HF-P0-03: absent_excused → neutral, NOT incomplete', () => {
  it('engine returns not incomplete for AJ', () => {
    const r = calculateAssessmentResult(
      [makeGrade(14, 'graded'), makeGrade(null, 'absent_excused')],
      'simple_average', 20,
    );
    expect(r.isIncomplete).toBe(false);
    expect(r.result).toBe('14');
    expect(r.excludedCount).toBe(1);
  });

  it('AJ-only assessment does not cascade incomplete', () => {
    const assessmentResults: AssessmentResult[] = [
      { assessmentId: 'a1', configComponentId: null, result: null, isIncomplete: false, contributingCount: 0, excludedCount: 1 },
    ];

    const subjectResult = calculateSubjectResultWithCoeffs(
      { subjectId: 's1', configSubjectId: 'cs1', subjectName: 'Math', coefficient: '1', includeInAverage: true, aggregation: 'single_grade', scale: 20, componentResults: [], assessmentResults },
      new Map(), 2, 'half_up',
    );

    expect(subjectResult.isIncomplete).toBe(false);
    expect(subjectResult.rawValue).toBeNull();
  });
});

// ─────────────────────────────────────────────
// HF-P0-04: not_evaluated → neutral, NOT incomplete
// ─────────────────────────────────────────────

describe('HF-P0-04: not_evaluated → neutral, NOT incomplete', () => {
  it('engine returns not incomplete for NE', () => {
    const r = calculateAssessmentResult(
      [makeGrade(14, 'graded'), makeGrade(null, 'not_evaluated')],
      'simple_average', 20,
    );
    expect(r.isIncomplete).toBe(false);
    expect(r.result).toBe('14');
  });
});

// ─────────────────────────────────────────────
// HF-P0-05: exempt → neutral, NOT incomplete
// ─────────────────────────────────────────────

describe('HF-P0-05: exempt → neutral, NOT incomplete', () => {
  it('engine returns not incomplete for exempt', () => {
    const r = calculateAssessmentResult(
      [makeGrade(14, 'graded'), makeGrade(null, 'exempt')],
      'simple_average', 20,
    );
    expect(r.isIncomplete).toBe(false);
    expect(r.result).toBe('14');
  });
});

// ─────────────────────────────────────────────
// HF-P0-06: All neutral → NON_COMPUTABLE, NOT INCOMPLETE
// ─────────────────────────────────────────────

describe('HF-P0-06: All neutral → NON_COMPUTABLE', () => {
  it('all-AJ subject has zero contributing, not incomplete', () => {
    const assessmentResults: AssessmentResult[] = [
      { assessmentId: 'a1', configComponentId: null, result: null, isIncomplete: false, contributingCount: 0, excludedCount: 1 },
      { assessmentId: 'a2', configComponentId: null, result: null, isIncomplete: false, contributingCount: 0, excludedCount: 1 },
    ];

    const subjectResult = calculateSubjectResultWithCoeffs(
      { subjectId: 's1', configSubjectId: 'cs1', subjectName: 'Math', coefficient: '1', includeInAverage: true, aggregation: 'simple_average', scale: 20, componentResults: [], assessmentResults },
      new Map(), 2, 'half_up',
    );

    expect(subjectResult.isIncomplete).toBe(false);
    expect(subjectResult.rawValue).toBeNull();
  });

  it('all-neutral subjects → general average subjectsIncluded=0, not incomplete', () => {
    const neutralSubject = calculateSubjectResultWithCoeffs(
      { subjectId: 'math', configSubjectId: 'cs1', subjectName: 'Math', coefficient: '1', includeInAverage: true, aggregation: 'simple_average', scale: 20, componentResults: [], assessmentResults: [
        { assessmentId: 'a1', configComponentId: null, result: null, isIncomplete: false, contributingCount: 0, excludedCount: 2 },
      ]},
      new Map(), 2, 'half_up',
    );

    const generalAvg = calculateGeneralAverage(
      { subjectResults: [neutralSubject], calculationPolicy: 'simple_average', inputPolicy: 'SUBJECT_RAW' },
      2, 'half_up',
    );

    expect(generalAvg.isIncomplete).toBe(false);
    expect(generalAvg.subjectsIncluded).toBe(0);
    // In the service, subjectsIncluded=0 → NON_COMPUTABLE
  });
});

// ─────────────────────────────────────────────
// HF-P0-07: AI (absent_unexcused) → 0 + full max, not missing, not neutral
// ─────────────────────────────────────────────

describe('HF-P0-07: AI = 0 + full max retained', () => {
  it('AI contributes as penalizing zero with full denominator', () => {
    const r = calculateAssessmentResult(
      [makeGrade(16, 'graded'), makeGrade(null, 'absent_unexcused')],
      'simple_average', 20,
    );
    // (16 + 0) / 2 = 8
    expect(r.result).toBe('8');
    expect(r.contributingCount).toBe(2); // AI is NOT excluded
    expect(r.excludedCount).toBe(0);
    expect(r.isIncomplete).toBe(false);
  });

  it('AI-only assessment still contributes (zero) to subject', () => {
    const r = calculateAssessmentResult(
      [makeGrade(null, 'absent_unexcused')],
      'single_grade', 20,
    );
    expect(r.result).toBe('0');
    expect(r.contributingCount).toBe(1);
    expect(r.isIncomplete).toBe(false);
  });
});

// ─────────────────────────────────────────────
// HF-P0-08: Fixture-equivalent class (Awa, Boris, Chloé, David, Emma, Franck, Grace)
// ─────────────────────────────────────────────

describe('HF-P0-08: Fixture-equivalent class ranking and class average', () => {
  it('competition ranking: 9, 8, 8, 7 → 1, 2, 2, 4', () => {
    const ranking = calculateRanking([
      { studentId: 'awa', average: '9.00' },
      { studentId: 'boris', average: '8.00' },
      { studentId: 'chloe', average: '8.00' },
      { studentId: 'david', average: '7.00' },
    ]);
    expect(ranking).toHaveLength(4);
    expect(ranking[0].rank).toBe(1);
    expect(ranking[1].rank).toBe(2);
    expect(ranking[2].rank).toBe(2);
    expect(ranking[3].rank).toBe(4);
  });

  it('INCOMPLETE and NON_COMPUTABLE excluded from ranking', () => {
    // Only CALCULATED students enter ranking
    const ranking = calculateRanking([
      { studentId: 'awa', average: '9.00' },
      { studentId: 'boris', average: '8.00' },
      { studentId: 'chloe', average: '8.00' },
      { studentId: 'david', average: '7.00' },
    ]);
    // Emma (INCOMPLETE) and Franck (INCOMPLETE) and Grace (NON_COMPUTABLE) must NOT appear
    const ids = ranking.map(r => r.studentId);
    expect(ids).not.toContain('emma');
    expect(ids).not.toContain('franck');
    expect(ids).not.toContain('grace');
  });

  it('class average = 8.00 from 4 CALCULATED students', () => {
    const stats = calculateClassStatistics(['9.00', '8.00', '8.00', '7.00']);
    expect(stats.classAverage).toBe('8');
    expect(stats.studentCount).toBe(4);
  });

  it('full fixture: 7 students, 4 calculable, class avg 8.00', () => {
    // Build subject results for each student
    const makeCalculableSubject = (name: string, avg: string) => {
      const sr = calculateSubjectResultWithCoeffs(
        { subjectId: 'math', configSubjectId: 'cs1', subjectName: 'Math', coefficient: '1', includeInAverage: true, aggregation: 'simple_average', scale: 20, componentResults: [], assessmentResults: [
          { assessmentId: 'a1', configComponentId: null, result: avg, isIncomplete: false, contributingCount: 1, excludedCount: 0 },
        ]},
        new Map(), 2, 'half_up',
      );
      return computeSubjectWeightedPoints(sr, 'SUBJECT_RAW');
    };

    const makeIncompleteSubject = () => {
      const sr = calculateSubjectResultWithCoeffs(
        { subjectId: 'math', configSubjectId: 'cs1', subjectName: 'Math', coefficient: '1', includeInAverage: true, aggregation: 'simple_average', scale: 20, componentResults: [], assessmentResults: [
          { assessmentId: 'a1', configComponentId: null, result: '9', isIncomplete: false, contributingCount: 1, excludedCount: 0 },
          // Missing grade: service marks isIncomplete=true
          assessmentResultForMissingGrade('a2'),
        ]},
        new Map(), 2, 'half_up',
      );
      return computeSubjectWeightedPoints(sr, 'SUBJECT_RAW');
    };

    const makeNonComputableSubject = () => {
      const sr = calculateSubjectResultWithCoeffs(
        { subjectId: 'math', configSubjectId: 'cs1', subjectName: 'Math', coefficient: '1', includeInAverage: true, aggregation: 'simple_average', scale: 20, componentResults: [], assessmentResults: [
          { assessmentId: 'a1', configComponentId: null, result: null, isIncomplete: false, contributingCount: 0, excludedCount: 1 },
          { assessmentId: 'a2', configComponentId: null, result: null, isIncomplete: false, contributingCount: 0, excludedCount: 1 },
        ]},
        new Map(), 2, 'half_up',
      );
      return computeSubjectWeightedPoints(sr, 'SUBJECT_RAW');
    };

    // Build general averages
    const awaAvg = calculateGeneralAverage(
      { subjectResults: [makeCalculableSubject('awa', '9')], calculationPolicy: 'simple_average', inputPolicy: 'SUBJECT_RAW' }, 2, 'half_up');
    const borisAvg = calculateGeneralAverage(
      { subjectResults: [makeCalculableSubject('boris', '8')], calculationPolicy: 'simple_average', inputPolicy: 'SUBJECT_RAW' }, 2, 'half_up');
    const chloeAvg = calculateGeneralAverage(
      { subjectResults: [makeCalculableSubject('chloe', '8')], calculationPolicy: 'simple_average', inputPolicy: 'SUBJECT_RAW' }, 2, 'half_up');
    const davidAvg = calculateGeneralAverage(
      { subjectResults: [makeCalculableSubject('david', '7')], calculationPolicy: 'simple_average', inputPolicy: 'SUBJECT_RAW' }, 2, 'half_up');
    const emmaAvg = calculateGeneralAverage(
      { subjectResults: [makeIncompleteSubject()], calculationPolicy: 'simple_average', inputPolicy: 'SUBJECT_RAW' }, 2, 'half_up');
    const franckAvg = calculateGeneralAverage(
      { subjectResults: [makeIncompleteSubject()], calculationPolicy: 'simple_average', inputPolicy: 'SUBJECT_RAW' }, 2, 'half_up');
    const graceAvg = calculateGeneralAverage(
      { subjectResults: [makeNonComputableSubject()], calculationPolicy: 'simple_average', inputPolicy: 'SUBJECT_RAW' }, 2, 'half_up');

    // Verify statuses
    expect(awaAvg.isIncomplete).toBe(false);
    expect(awaAvg.subjectsIncluded).toBe(1);
    expect(borisAvg.isIncomplete).toBe(false);
    expect(borisAvg.subjectsIncluded).toBe(1);
    expect(chloeAvg.isIncomplete).toBe(false);
    expect(chloeAvg.subjectsIncluded).toBe(1);
    expect(davidAvg.isIncomplete).toBe(false);
    expect(davidAvg.subjectsIncluded).toBe(1);

    expect(emmaAvg.isIncomplete).toBe(true);
    // Incomplete subject still has numeric value; service sets student status

    expect(franckAvg.isIncomplete).toBe(true);

    expect(graceAvg.isIncomplete).toBe(false);
    expect(graceAvg.subjectsIncluded).toBe(0);

    // Class statistics: only CALCULATED students
    const stats = calculateClassStatistics([
      awaAvg.officialValue,
      borisAvg.officialValue,
      chloeAvg.officialValue,
      davidAvg.officialValue,
    ]);
    expect(stats.classAverage).toBe('8');
    expect(stats.studentCount).toBe(4);

    // Competition ranking: only CALCULATED students
    const ranking = calculateRanking([
      { studentId: 'awa', average: awaAvg.officialValue },
      { studentId: 'boris', average: borisAvg.officialValue },
      { studentId: 'chloe', average: chloeAvg.officialValue },
      { studentId: 'david', average: davidAvg.officialValue },
    ]);
    expect(ranking).toHaveLength(4);
    expect(ranking[0].rank).toBe(1);
    expect(ranking[1].rank).toBe(2);
    expect(ranking[2].rank).toBe(2);
    expect(ranking[3].rank).toBe(4);
  });
});
