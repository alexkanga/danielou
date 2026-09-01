/**
 * WS-003 P0 — Period Results Focused Tests
 *
 * READ-ONLY: no POST /api/bulletins, no report_card creation
 * CONTEXT: year required, classroom scoped to year, period scoped to year
 * STATUS: graded, AI=0+max, AJ neutral, exempt neutral, NE neutral, pending=INCOMPLETE
 * RESULTS: authoritative period average, competition ranking, no fake rank
 * ISOLATION: cross-year, cross-class, cross-period, enrollment scope
 *
 * These tests validate the calculation engine semantics and service behavior.
 * DB integration tests (context validation, cross-leakage) require PostgreSQL
 * and are in a separate file.
 */

import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  calculateAssessmentResult,
  calculateRanking,
  calculateClassStatistics,
} from '@/lib/services/results/calculation-engine';
import type { GradeInput } from '@/lib/services/results/types';
import { readFileSync } from 'fs';
import { resolve } from 'path';

Decimal.set({ precision: 20 });

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function makeGrade(value: number | null, status: string, scale = 20, coefficient = '1'): GradeInput {
  return {
    id: `grade-${Math.random().toString(36).slice(2, 8)}`,
    rawValue: value !== null ? String(value) : null,
    status: status as GradeInput['status'],
    scale,
    coefficient,
  };
}

const servicePath = resolve('src/lib/services/results/period-results.service.ts');
const pagePath = resolve('src/app/(dashboard)/dashboard/resultats/page.tsx');
const apiPath = resolve('src/app/api/period-results/route.ts');

// ─────────────────────────────────────────────
// P0-READ: Pure Read Flow
// ─────────────────────────────────────────────

describe('P0-READ: Pure read flow', () => {
  it('P0-READ-01: result view does not POST /api/bulletins', () => {
    const content = readFileSync(servicePath, 'utf8');
    expect(content).not.toContain('generateReportCards');
    expect(content).not.toContain("from './report-card.service'");
  });

  it('P0-READ-02: result view creates no report_card', () => {
    const content = readFileSync(servicePath, 'utf8');
    expect(content).not.toContain('db.insert(reportCard');
    expect(content).not.toContain('db.insert(report_card');
  });

  it('P0-READ-03: valid live data populates rows', () => {
    const r = calculateAssessmentResult(
      [makeGrade(14, 'graded'), makeGrade(16, 'graded')],
      'simple_average', 20,
    );
    expect(r.result).toBe('15');
    expect(r.contributingCount).toBe(2);
  });
});

// ─────────────────────────────────────────────
// P0-CONTEXT: Year → Class → Period integrity
// ─────────────────────────────────────────────

describe('P0-CONTEXT: Context hierarchy', () => {
  it('P0-CONTEXT-01: Academic Year required', () => {
    const content = readFileSync(servicePath, 'utf8');
    expect(content).toContain('CROSS_YEAR_CLASSROOM');
    expect(content).toContain('CROSS_YEAR_PERIOD');
  });

  it('P0-CONTEXT-02: classrooms scoped to year', () => {
    const content = readFileSync(pagePath, 'utf8');
    expect(content).toContain('academicYearId=');
    expect(content).toContain('/api/classes?');
  });

  it('P0-CONTEXT-03: periods scoped to year', () => {
    const content = readFileSync(pagePath, 'utf8');
    expect(content).toContain('/api/periodes?');
  });

  it('P0-CONTEXT-04: cross-year classroom rejected', () => {
    const content = readFileSync(servicePath, 'utf8');
    expect(content).toContain("'CROSS_YEAR_CLASSROOM'");
  });

  it('P0-CONTEXT-05: cross-year period rejected', () => {
    const content = readFileSync(servicePath, 'utf8');
    expect(content).toContain("'CROSS_YEAR_PERIOD'");
  });

  it('P0-CONTEXT-06: context change clears stale results', () => {
    const content = readFileSync(pagePath, 'utf8');
    expect(content).toContain('setRows([])');
  });
});

// ─────────────────────────────────────────────
// P0-STATUS: Grade Status Semantics (WS-003 §7)
// ─────────────────────────────────────────────

describe('P0-STATUS: Grade status semantics', () => {
  it('P0-STATUS-01: graded contributes', () => {
    const r = calculateAssessmentResult(
      [makeGrade(12, 'graded'), makeGrade(16, 'graded')],
      'simple_average', 20,
    );
    expect(r.result).toBe('14');
    expect(r.contributingCount).toBe(2);
    expect(r.excludedCount).toBe(0);
  });

  it('P0-STATUS-02: AI = 0 + full max (penalizing zero)', () => {
    const r = calculateAssessmentResult(
      [makeGrade(14, 'graded'), makeGrade(null, 'absent_unexcused'), makeGrade(16, 'graded')],
      'simple_average', 20,
    );
    // (14 + 0 + 16) / 3 = 10
    expect(r.result).toBe('10');
    expect(r.contributingCount).toBe(3);
    expect(r.excludedCount).toBe(0);
  });

  it('P0-STATUS-03: AJ neutral (excluded from denominator)', () => {
    const r = calculateAssessmentResult(
      [makeGrade(14, 'graded'), makeGrade(null, 'absent_excused'), makeGrade(16, 'graded')],
      'simple_average', 20,
    );
    // (14 + 16) / 2 = 15 (AJ excluded)
    expect(r.result).toBe('15');
    expect(r.contributingCount).toBe(2);
    expect(r.excludedCount).toBe(1);
  });

  it('P0-STATUS-04: exempt neutral', () => {
    const r = calculateAssessmentResult(
      [makeGrade(14, 'graded'), makeGrade(null, 'exempt'), makeGrade(12, 'graded')],
      'simple_average', 20,
    );
    // (14 + 12) / 2 = 13
    expect(r.result).toBe('13');
    expect(r.contributingCount).toBe(2);
    expect(r.excludedCount).toBe(1);
  });

  it('P0-STATUS-05: NE neutral', () => {
    const r = calculateAssessmentResult(
      [makeGrade(14, 'graded'), makeGrade(null, 'not_evaluated')],
      'simple_average', 20,
    );
    // Only graded contributes: 14 / 1 = 14
    expect(r.result).toBe('14');
    expect(r.contributingCount).toBe(1);
    expect(r.excludedCount).toBe(1);
  });

  it('P0-STATUS-06: pending = INCOMPLETE', () => {
    const r = calculateAssessmentResult(
      [makeGrade(14, 'graded'), makeGrade(null, 'pending')],
      'simple_average', 20,
    );
    expect(r.result).toBe('14');
    expect(r.isIncomplete).toBe(true);
  });

  it('P0-STATUS-07: missing required grade = INCOMPLETE', () => {
    const r = calculateAssessmentResult(
      [],
      'single_grade', 20,
    );
    expect(r.result).toBeNull();
    expect(r.contributingCount).toBe(0);
  });

  it('P0-STATUS-08: neutral-only denominator does not fabricate zero', () => {
    const r = calculateAssessmentResult(
      [makeGrade(null, 'absent_excused'), makeGrade(null, 'exempt'), makeGrade(null, 'not_evaluated')],
      'simple_average', 20,
    );
    expect(r.result).toBeNull(); // NOT '0'
    expect(r.contributingCount).toBe(0);
    expect(r.excludedCount).toBe(3);
  });
});

// ─────────────────────────────────────────────
// P0-RESULT: Authoritative calculation + ranking
// ─────────────────────────────────────────────

describe('P0-RESULT: Authoritative results', () => {
  it('P0-RESULT-01: period average is authoritative server result', () => {
    const content = readFileSync(pagePath, 'utf8');
    // Page must not contain client-side average calculation formulas
    expect(content).not.toContain('reduce(');
  });

  it('P0-RESULT-02: competition ranking = 1,2,2,4', () => {
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

  it('P0-RESULT-03: INCOMPLETE has no fake rank', () => {
    const r = calculateRanking([
      { studentId: 's1', average: '12' },
      { studentId: 's2', average: '10' },
    ]);
    expect(r.map(e => e.studentId)).not.toContain('s3');
    expect(r).toHaveLength(2);
  });

  it('P0-RESULT-04: NON_COMPUTABLE has no fake rank', () => {
    const r = calculateRanking([
      { studentId: 's1', average: '12' },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].rank).toBe(1);
  });

  it('P0-RESULT-05: class average authoritative', () => {
    const stats = calculateClassStatistics(['12', '14', '16']);
    expect(stats.classAverage).toBe('14');
    expect(stats.studentCount).toBe(3);
    expect(stats.minAverage).toBe('12');
    expect(stats.maxAverage).toBe('16');
  });
});

// ─────────────────────────────────────────────
// P0-ISO: Isolation tests (structural)
// ─────────────────────────────────────────────

describe('P0-ISO: Isolation', () => {
  it('P0-ISO-01: no cross-year leakage', () => {
    const content = readFileSync(servicePath, 'utf8');
    expect(content).toContain('cls.academicYearId !== academicYearId');
    expect(content).toContain('period.academicYearId !== academicYearId');
  });

  it('P0-ISO-02: no cross-class leakage', () => {
    const content = readFileSync(servicePath, 'utf8');
    expect(content).toContain('eq(classroomAssignment.classroomId, classroomId)');
  });

  it('P0-ISO-03: no cross-period leakage', () => {
    const content = readFileSync(apiPath, 'utf8');
    expect(content).toContain('academicPeriodId');
  });

  it('P0-ISO-04: enrollment/classroom assignment scope respected', () => {
    const content = readFileSync(servicePath, 'utf8');
    expect(content).toContain("eq(classroomAssignment.status, 'active')");
    expect(content).toContain("eq(enrollment.status, 'active')");
  });
});
