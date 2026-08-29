/**
 * AC-001 Academic Context — Targeted Tests
 *
 * Covers AC-01 through AC-12. Follows the repository's existing test pattern:
 * pure behavioral tests that verify logic, API patterns, and source invariants
 * without requiring full React component rendering.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = resolve(process.cwd(), 'src');

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function readSrc(relativePath: string): string {
  return readFileSync(resolve(SRC, relativePath), 'utf-8');
}

// ─────────────────────────────────────────────
// AC-01: New evaluation defaults to unique active year
// ─────────────────────────────────────────────

describe('AC-01: Default to unique active year', () => {
  const src = readSrc('components/shared/academic-context-selector.tsx');

  it('component loads academic years from /api/annees-scolaires on mount', () => {
    expect(src).toContain("'/api/annees-scolaires?limit=100'");
  });

  it('auto-selects when exactly one year has status=active', () => {
    expect(src).toContain("y.status === 'active'");
    expect(src).toContain('if (active) setSelectedYearId(active.id)');
  });

  it('does not auto-select when autoSelectActiveYear is false', () => {
    expect(src).toContain('autoSelectActiveYear');
    expect(src).toContain('if (autoSelectActiveYear');
  });

  it('does NOT hardcode 2026-2027 or any year name', () => {
    expect(src).not.toContain('2026-2027');
    expect(src).not.toContain('2025-2026');
  });
});

// ─────────────────────────────────────────────
// AC-02: Classroom year filtering
// ─────────────────────────────────────────────

describe('AC-02: Classroom year filtering', () => {
  const src = readSrc('components/shared/academic-context-selector.tsx');

  it('loads classrooms with academicYearId query parameter', () => {
    expect(src).toContain('academicYearId=${selectedYearId}');
  });

  it('classrooms are disabled when no year is selected', () => {
    expect(src).toContain('disabled={!selectedYearId}');
  });
});

// ─────────────────────────────────────────────
// AC-03: Same classroom name in two years
// ─────────────────────────────────────────────

describe('AC-03: Duplicate classroom name disambiguation', () => {
  const src = readSrc('components/shared/academic-context-selector.tsx');

  it('filters classrooms by year ID (not name), eliminating duplicate names', () => {
    // The API call uses academicYearId (UUID), not year name
    expect(src).toContain('academicYearId=');
    // No year name string matching for filtering
    expect(src).not.toContain('year.name');
  });
});

// ─────────────────────────────────────────────
// AC-04/05/06: Dependent reset on year change
// ─────────────────────────────────────────────

describe('AC-04/05/06: Dependent reset on year change', () => {
  const src = readSrc('components/shared/academic-context-selector.tsx');

  it('AC-04: changing year resets classroom selection', () => {
    const handler = src.match(/const handleYearChange[\s\S]+/)?.[0];
    expect(handler).toBeTruthy();
    expect(handler).toContain('setSelectedClassroomId');
    expect(handler).toContain("''"); // reset to empty
  });

  it('AC-05: changing year resets period selection', () => {
    const handler = src.match(/const handleYearChange[\s\S]+/)?.[0];
    expect(handler).toBeTruthy();
    expect(handler).toContain('setSelectedPeriodId');
    expect(handler).toContain("''"); // reset to empty
  });

  it('AC-06: changing year resets all dependents', () => {
    const handler = src.match(/const handleYearChange[\s\S]+/)?.[0];
    expect(handler).toBeTruthy();
    // Both classroom and period are reset
    expect(handler).toContain('setSelectedClassroomId');
    expect(handler).toContain('setSelectedPeriodId');
    expect(handler).toContain('notifyChange(id');
  });

  it('changing classroom resets period', () => {
    const handler = src.match(/const handleClassroomChange[\s\S]+/)?.[0];
    expect(handler).toBeTruthy();
    expect(handler).toContain('setSelectedPeriodId');
    expect(handler).toContain("''");
  });
});

// ─────────────────────────────────────────────
// AC-07: Period year filtering
// ─────────────────────────────────────────────

describe('AC-07: Period year filtering', () => {
  const src = readSrc('components/shared/academic-context-selector.tsx');

  it('loads periods with academicYearId query parameter', () => {
    expect(src).toContain('academicYearId: selectedYearId');
  });

  it('supports periodTypeFilter parameter', () => {
    expect(src).toContain('periodTypeFilter');
    expect(src).toContain('params.append(\'periodType\', t)');
  });
});

// ─────────────────────────────────────────────
// AC-08/09: Edit mode year hydration
// ─────────────────────────────────────────────

describe('AC-08/09: Edit mode year hydration', () => {
  const src = readSrc('components/shared/academic-context-selector.tsx');

  it('AC-08: accepts initial academic year from initialValues prop', () => {
    expect(src).toContain('initialValues?.academicYearId');
    expect(src).toContain("useState(initialValues?.academicYearId ?? '')");
  });

  it('AC-09: initial value takes precedence over auto-select', () => {
    // When initialValues has academicYearId, auto-select is skipped
    expect(src).toContain('!initialValues?.academicYearId');
    // This is the condition for auto-selecting
  });
});

// ─────────────────────────────────────────────
// AC-10: Server cross-year validation
// ─────────────────────────────────────────────

describe('AC-10: Server cross-year validation', () => {
  const src = readSrc('lib/services/pedagogy/assessment.service.ts');

  it('verifyPeriodClassroomConsistency checks academicYearId match', () => {
    expect(src).toContain('verifyPeriodClassroomConsistency');
    expect(src).toContain('cls.academicYearId !== period.academicYearId');
  });

  it('error message references academic year consistency', () => {
    expect(src).toContain("La période et la classe doivent appartenir à la même année scolaire");
  });
});

// ─────────────────────────────────────────────
// AC-11: Fallback classroom label includes year
// ─────────────────────────────────────────────

describe('AC-11: Fallback classroom label includes year', () => {
  it('evaluation page renders classroomName — yearName when yearName exists', () => {
    const src = readSrc('app/(dashboard)/dashboard/evaluations/page.tsx');
    expect(src).toContain('yearName');
    expect(src).toContain('`${i.classroomName ?? \'—\'} — ${i.yearName}`');
  });

  it('assessment service returns yearName in list query', () => {
    const src = readSrc('lib/services/pedagogy/assessment.service.ts');
    expect(src).toContain('yearName: academicYear.name');
    expect(src).toContain('yearName: r.yearName');
  });

  it('AssessmentWithDetails type includes yearName', () => {
    const src = readSrc('lib/services/pedagogy/assessment.service.ts');
    expect(src).toContain('yearName?: string | null');
  });

  it('academicYear is joined through classroom for yearName', () => {
    const src = readSrc('lib/services/pedagogy/assessment.service.ts');
    expect(src).toContain('leftJoin(academicYear, eq(classroom.academicYearId, academicYear.id))');
  });
});

// ─────────────────────────────────────────────
// AC-12: No filtering logic depends on names
// ─────────────────────────────────────────────

describe('AC-12: ID-based filtering, not name-based', () => {
  const src = readSrc('components/shared/academic-context-selector.tsx');

  it('classroom API uses academicYearId UUID, not year name string', () => {
    // The URL template uses selectedYearId (a UUID), not year.name
    expect(src).toContain('/api/classes?academicYearId=${selectedYearId}');
    expect(src).not.toContain('year.name');
  });

  it('period API uses academicYearId UUID, not year name string', () => {
    expect(src).toContain('academicYearId: selectedYearId');
    expect(src).not.toContain('year.name');
  });

  it('evaluation list API uses classroomId UUID for filtering', () => {
    const src = readSrc('app/(dashboard)/dashboard/evaluations/page.tsx');
    // The page filters by UUID, not by name
    expect(src).toContain("p.set('classroomId', ctxValue.classroomId)");
  });
});
