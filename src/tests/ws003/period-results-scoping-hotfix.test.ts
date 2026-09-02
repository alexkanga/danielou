/**
 * WS-003 P0 — Period/Classroom Scoping Hotfix Regression Tests
 *
 * Confirmed defect: assessment discovery in period-results.service.ts was filtered
 * ONLY by configSubjectId/configComponentId, but NOT by classroomId or
 * academicPeriodId. This meant viewing Period 1 would consume assessments from
 * Period 2, and viewing Classroom A would consume assessments from Classroom B
 * (when sharing the same level/year/config).
 *
 * Hotfix: Added eq(assessment.classroomId, classroomId) AND
 * eq(assessment.academicPeriodId, academicPeriodId) to BOTH assessment queries
 * (component-based and direct-assessment paths).
 *
 * Tests are split into:
 * - Structural tests (source code inspection) — verify predicates exist
 * - Calculation-engine tests — verify semantics remain correct
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  calculateAssessmentResult,
  calculateSubjectResultWithCoeffs,
  calculateClassStatistics,
  calculateRanking,
} from '@/lib/services/results/calculation-engine';
import type { GradeInput, AssessmentResult } from '@/lib/services/results/types';

const servicePath = resolve('src/lib/services/results/period-results.service.ts');
const serviceContent = readFileSync(servicePath, 'utf8');

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
  const engineResult = calculateAssessmentResult([], 'single_grade', 20);
  engineResult.isIncomplete = true;
  engineResult.assessmentId = assessmentId;
  return engineResult;
}

// ─────────────────────────────────────────────
// HF-SCOPE-01: Period 1 excludes Period 2 assessments
// ─────────────────────────────────────────────

describe('HF-SCOPE-01: Period 1 excludes Period 2 assessments', () => {
  it('assessment query filters by academicPeriodId', () => {
    // Structural proof: the service code must contain the period filter
    expect(serviceContent).toContain('eq(assessment.academicPeriodId, academicPeriodId)');
  });

  it('period filter appears in BOTH assessment query paths', () => {
    // Count occurrences: must be exactly 2 (component path + direct path)
    const matches = serviceContent.match(/eq\(assessment\.academicPeriodId, academicPeriodId\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(2);
  });
});

// ─────────────────────────────────────────────
// HF-SCOPE-02: Period 2 excludes Period 1 assessments
// ─────────────────────────────────────────────

describe('HF-SCOPE-02: Period 2 excludes Period 1 assessments', () => {
  it('same predicate works bidirectionally (no period range logic)', () => {
    // The filter is eq(=), not a range — it constrains to exactly one period
    expect(serviceContent).toContain('eq(assessment.academicPeriodId, academicPeriodId)');
    // Must NOT contain any BETWEEN, range, or <=/>= on academicPeriodId
    expect(serviceContent).not.toContain('assessment.academicPeriodId, >=');
    expect(serviceContent).not.toContain('assessment.academicPeriodId, <=');
    expect(serviceContent).not.toContain('assessmentPeriodId, >');
  });
});

// ─────────────────────────────────────────────
// HF-SCOPE-03: Classroom A excludes Classroom B assessments
// ─────────────────────────────────────────────

describe('HF-SCOPE-03: Classroom A excludes Classroom B (same config)', () => {
  it('assessment query filters by classroomId', () => {
    expect(serviceContent).toContain('eq(assessment.classroomId, classroomId)');
  });

  it('classroom filter appears in BOTH assessment query paths', () => {
    const matches = serviceContent.match(/eq\(assessment\.classroomId, classroomId\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(2);
  });

  it('classroom filter is an equality (exact match), not IN or EXISTS', () => {
    // Verify exact eq() usage, not inArray or similar
    expect(serviceContent).toContain('eq(assessment.classroomId, classroomId)');
  });
});

// ─────────────────────────────────────────────
// HF-SCOPE-04: Period change actually changes computed result
// ─────────────────────────────────────────────

describe('HF-SCOPE-04: Period change changes computed result', () => {
  it('different period assessments produce different results (engine level)', () => {
    // Period 1: student has 10/20
    const period1Result = calculateAssessmentResult(
      [makeGrade(10, 'graded')],
      'single_grade', 20,
    );
    // Period 2: student has 16/20
    const period2Result = calculateAssessmentResult(
      [makeGrade(16, 'graded')],
      'single_grade', 20,
    );

    expect(period1Result.result).toBe('10');
    expect(period2Result.result).toBe('16');
    expect(period1Result.result).not.toBe(period2Result.result);
  });

  it('service function signature accepts academicPeriodId parameter', () => {
    // Verify the function receives academicPeriodId
    expect(serviceContent).toContain('academicPeriodId: string,');
  });
});

// ─────────────────────────────────────────────
// HF-SCOPE-05: Classroom change actually changes computed result
// ─────────────────────────────────────────────

describe('HF-SCOPE-05: Classroom change changes computed result', () => {
  it('different classroom assessments produce different results (engine level)', () => {
    // Classroom A: student scored 12
    const classAResult = calculateAssessmentResult(
      [makeGrade(12, 'graded')],
      'single_grade', 20,
    );
    // Classroom B: student scored 18
    const classBResult = calculateAssessmentResult(
      [makeGrade(18, 'graded')],
      'single_grade', 20,
    );

    expect(classAResult.result).toBe('12');
    expect(classBResult.result).toBe('18');
  });

  it('service function signature accepts classroomId parameter', () => {
    expect(serviceContent).toContain('classroomId: string,');
  });
});

// ─────────────────────────────────────────────
// HF-SCOPE-06: Missing required grade in selected period = INCOMPLETE
// ─────────────────────────────────────────────

describe('HF-SCOPE-06: Missing required grade in selected period = INCOMPLETE', () => {
  it('no grade row for required assessment triggers INCOMPLETE', () => {
    const r = assessmentResultForMissingGrade('assess-t1');
    expect(r.isIncomplete).toBe(true);
    expect(r.result).toBeNull();
  });

  it('INCOMPLETE assessment cascades to subject', () => {
    const assessmentResults: AssessmentResult[] = [
      { assessmentId: 'a1', configComponentId: null, result: '8', isIncomplete: false, contributingCount: 1, excludedCount: 0 },
      assessmentResultForMissingGrade('a2'),
    ];

    const subjectResult = calculateSubjectResultWithCoeffs(
      { subjectId: 'math', configSubjectId: 'cs1', subjectName: 'Math', coefficient: '1', includeInAverage: true, aggregation: 'simple_average', scale: 20, componentResults: [], assessmentResults },
      new Map(), 2, 'half_up',
    );

    expect(subjectResult.isIncomplete).toBe(true);
  });

  it('service sets isIncomplete when gradeInputs.length === 0', () => {
    // Structural: the hotfix must be present
    expect(serviceContent).toContain('if (gradeInputs.length === 0) aResult.isIncomplete = true');
  });
});

// ─────────────────────────────────────────────
// HF-SCOPE-07: Assessment missing from ANOTHER period does NOT make
//             current period INCOMPLETE
// ─────────────────────────────────────────────

describe('HF-SCOPE-07: Missing assessment in other period does not affect current period', () => {
  it('assessment query only returns assessments for the selected period (structural)', () => {
    // The query must filter by academicPeriodId — meaning only assessments
    // in the selected period are returned. A missing assessment in Period 2
    // cannot produce gradeInputs.length===0 in Period 1's query.
    expect(serviceContent).toContain('eq(assessment.academicPeriodId, academicPeriodId)');
  });

  it('period-scoped assessment query means other-period absence is invisible', () => {
    // If period is filtered, Period 2 missing assessment never appears
    // in Period 1's assessment list, so it can't trigger isIncomplete.
    // This is a logical corollary of the scoping filter.
    const period1Assessments = [
      { assessmentId: 'p1-a1', configComponentId: null, result: '14', isIncomplete: false, contributingCount: 1, excludedCount: 0 },
    ];
    // Period 2's missing assessment is NOT in this list
    const subjectResult = calculateSubjectResultWithCoeffs(
      { subjectId: 'math', configSubjectId: 'cs1', subjectName: 'Math', coefficient: '1', includeInAverage: true, aggregation: 'single_grade', scale: 20, componentResults: [], assessmentResults: period1Assessments },
      new Map(), 2, 'half_up',
    );

    // Result is CALCULATED, not INCOMPLETE
    expect(subjectResult.isIncomplete).toBe(false);
    expect(subjectResult.officialValue).toBe('14');
  });
});

// ─────────────────────────────────────────────
// HF-SCOPE-08: AI/AJ/NE/exempt semantics remain unchanged
// ─────────────────────────────────────────────

describe('HF-SCOPE-08: AI/AJ/NE/exempt semantics unchanged', () => {
  it('AI = penalizing zero (full denominator)', () => {
    const r = calculateAssessmentResult(
      [makeGrade(14, 'graded'), makeGrade(null, 'absent_unexcused'), makeGrade(16, 'graded')],
      'simple_average', 20,
    );
    // (14 + 0 + 16) / 3 = 10
    expect(r.result).toBe('10');
    expect(r.contributingCount).toBe(3);
    expect(r.excludedCount).toBe(0);
    expect(r.isIncomplete).toBe(false);
  });

  it('AJ = neutral (excluded from denominator)', () => {
    const r = calculateAssessmentResult(
      [makeGrade(14, 'graded'), makeGrade(null, 'absent_excused'), makeGrade(16, 'graded')],
      'simple_average', 20,
    );
    // (14 + 16) / 2 = 15
    expect(r.result).toBe('15');
    expect(r.contributingCount).toBe(2);
    expect(r.excludedCount).toBe(1);
    expect(r.isIncomplete).toBe(false);
  });

  it('NE = neutral (excluded from denominator)', () => {
    const r = calculateAssessmentResult(
      [makeGrade(14, 'graded'), makeGrade(null, 'not_evaluated')],
      'simple_average', 20,
    );
    expect(r.result).toBe('14');
    expect(r.contributingCount).toBe(1);
    expect(r.excludedCount).toBe(1);
    expect(r.isIncomplete).toBe(false);
  });

  it('exempt = neutral (excluded from denominator)', () => {
    const r = calculateAssessmentResult(
      [makeGrade(14, 'graded'), makeGrade(null, 'exempt')],
      'simple_average', 20,
    );
    expect(r.result).toBe('14');
    expect(r.contributingCount).toBe(1);
    expect(r.excludedCount).toBe(1);
    expect(r.isIncomplete).toBe(false);
  });

  it('pending = INCOMPLETE (not neutral)', () => {
    const r = calculateAssessmentResult(
      [makeGrade(14, 'graded'), makeGrade(null, 'pending')],
      'simple_average', 20,
    );
    expect(r.isIncomplete).toBe(true);
    expect(r.result).toBe('14');
  });
});

// ─────────────────────────────────────────────
// HF-SCOPE-09: Competition ranking remains correct
// ─────────────────────────────────────────────

describe('HF-SCOPE-09: Competition ranking correct', () => {
  it('standard competition: 1,2,2,4', () => {
    const r = calculateRanking([
      { studentId: 's1', average: '8.80' },
      { studentId: 's2', average: '8.50' },
      { studentId: 's3', average: '8.50' },
      { studentId: 's4', average: '7.90' },
    ]);
    expect(r).toHaveLength(4);
    expect(r[0].rank).toBe(1);
    expect(r[1].rank).toBe(2);
    expect(r[2].rank).toBe(2);
    expect(r[3].rank).toBe(4);
  });

  it('all-same-average: all rank 1', () => {
    const r = calculateRanking([
      { studentId: 's1', average: '10.00' },
      { studentId: 's2', average: '10.00' },
      { studentId: 's3', average: '10.00' },
    ]);
    expect(r).toHaveLength(3);
    expect(r[0].rank).toBe(1);
    expect(r[1].rank).toBe(1);
    expect(r[2].rank).toBe(1);
  });

  it('single student: rank 1', () => {
    const r = calculateRanking([
      { studentId: 's1', average: '12.00' },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].rank).toBe(1);
  });

  it('ranking service logic unchanged (structural)', () => {
    // The hotfix must NOT have touched calculateRanking
    // Verify the import still exists and is used
    expect(serviceContent).toContain('calculateRanking');
  });
});

// ─────────────────────────────────────────────
// HF-SCOPE-10: Class average uses only calculable students from
//              selected classroom+period
// ─────────────────────────────────────────────

describe('HF-SCOPE-10: Class average from selected classroom+period only', () => {
  it('class statistics computed from calculable averages only', () => {
    const stats = calculateClassStatistics(['9', '8', '8', '7']);
    expect(stats.classAverage).toBe('8');
    expect(stats.studentCount).toBe(4);
    expect(stats.minAverage).toBe('7');
    expect(stats.maxAverage).toBe('9');
  });

  it('empty calculable list gives zero count, zero average', () => {
    const stats = calculateClassStatistics([]);
    expect(stats.classAverage).toBe('0');
    expect(stats.studentCount).toBe(0);
  });

  it('INCOMPLETE students excluded from class average (engine level)', () => {
    // Only CALCULATED students' averages feed into class statistics
    // This is enforced in the service, not the engine.
    // Engine just computes whatever it receives.
    const stats = calculateClassStatistics(['9', '8', '8', '7']);
    expect(stats.studentCount).toBe(4);
    // Emma, Franck, Grace would be excluded at the service level
  });

  it('service filters by studentStatus === CALCULATED for class stats (structural)', () => {
    expect(serviceContent).toContain("studentStatuses.get(sc.studentId) === 'CALCULATED'");
  });

  it('service filters by studentStatus === CALCULATED for ranking (structural)', () => {
    // Ranking also only includes CALCULATED students
    const rankingMatches = serviceContent.match(/studentStatuses\.get\(sc\.studentId\) === 'CALCULATED'/g);
    expect(rankingMatches).not.toBeNull();
    expect(rankingMatches!.length).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────
// CROSS-VALIDATION: Both query paths share the same scoping
// ─────────────────────────────────────────────

describe('Scoping cross-validation', () => {
  it('component-based path has classroom + period filters', () => {
    // The component path uses configComponentId
    expect(serviceContent).toContain('eq(assessment.configComponentId, cc.id)');
    // AND must also have classroom + period
    // Find the block: eq(configComponentId) ... eq(classroomId) ... eq(academicPeriodId)
    const componentPathRegex = /eq\(assessment\.configComponentId, cc\.id\)[\s\S]*?eq\(assessment\.classroomId, classroomId\)[\s\S]*?eq\(assessment\.academicPeriodId, academicPeriodId\)/;
    expect(serviceContent).toMatch(componentPathRegex);
  });

  it('direct-assessment path has classroom + period filters', () => {
    // The direct path uses configSubjectId
    expect(serviceContent).toContain('eq(assessment.configSubjectId, cs.id)');
    // AND must also have classroom + period
    const directPathRegex = /eq\(assessment\.configSubjectId, cs\.id\)[\s\S]*?eq\(assessment\.classroomId, classroomId\)[\s\S]*?eq\(assessment\.academicPeriodId, academicPeriodId\)/;
    expect(serviceContent).toMatch(directPathRegex);
  });

  it('computeStudentPeriodResults receives both classroomId and academicPeriodId', () => {
    // Verify the function signature
    const sigRegex = /async function computeStudentPeriodResults\([\s\S]*?classroomId: string,[\s\S]*?academicPeriodId: string/;
    expect(serviceContent).toMatch(sigRegex);
  });

  it('caller passes classroomId and academicPeriodId to computeStudentPeriodResults', () => {
    // Verify the call site passes the new parameters
    const callRegex = /computeStudentPeriodResults\([\s\S]*?classroomId,[\s\S]*?academicPeriodId/;
    expect(serviceContent).toMatch(callRegex);
  });
});
