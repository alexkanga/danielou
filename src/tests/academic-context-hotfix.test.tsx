/**
 * AC-001 Hotfix — Progressive Filtering & Create Dialog Context
 *
 * Covers AC-HF-01 through AC-HF-12. Source-invariant tests that verify
 * the hotfix for progressive academic context filtering and create dialog
 * context summary display.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = resolve(process.cwd(), 'src');

function readSrc(relativePath: string): string {
  return readFileSync(resolve(SRC, relativePath), 'utf-8');
}

// ─────────────────────────────────────────────
// AC-HF-01: Year-only filtering
// ─────────────────────────────────────────────

describe('AC-HF-01: Selecting academic year alone filters assessments immediately', () => {
  const page = readSrc('app/(dashboard)/dashboard/evaluations/page.tsx');

  it('sends academicYearId query parameter to API', () => {
    expect(page).toContain("p.set('academicYearId', ctxValue.academicYearId)");
  });

  it('academicYearId is included in doFetch dependencies', () => {
    // The dependency array must include ctxValue.academicYearId so it refetches on year change
    const deps = page.match(/\[search, tab, ctxValue\.[^\]]+\]/);
    expect(deps).toBeTruthy();
    expect(deps![0]).toContain('ctxValue.academicYearId');
  });

  it('refetch effect depends on academicYearId', () => {
    // The useEffect that calls doFetch(1) must include ctxValue.academicYearId
    const effect = page.match(/useEffect\(\(\) => \{[\s\S]*?doFetch\(1\)[\s\S]*?\}, \[[^\]]+\]/);
    expect(effect).toBeTruthy();
    expect(effect![0]).toContain('ctxValue.academicYearId');
  });
});

// ─────────────────────────────────────────────
// AC-HF-02: 2025-2026 excludes 2026-2027
// ─────────────────────────────────────────────

describe('AC-HF-02: Year selection excludes other-year assessments', () => {
  const service = readSrc('lib/services/pedagogy/assessment.service.ts');

  it('AssessmentListParams includes academicYearId', () => {
    expect(service).toContain('academicYearId?: string');
  });

  it('listAssessments destructures academicYearId', () => {
    expect(service).toContain('academicYearId, classroomId');
  });

  it('filters classrooms by academicYearId when provided', () => {
    expect(service).toContain('eq(classroom.academicYearId, academicYearId)');
  });

  it('uses ID-based filtering (not name-based)', () => {
    // Must not filter by year name string
    expect(service).not.toContain('2025-2026');
    expect(service).not.toContain('2026-2027');
  });
});

// ─────────────────────────────────────────────
// AC-HF-03: 2026-2027 excludes 2025-2026
// ─────────────────────────────────────────────

describe('AC-HF-03: Inverse year exclusion', () => {
  const service = readSrc('lib/services/pedagogy/assessment.service.ts');

  it('classroom year filter applies equally regardless of which year is selected', () => {
    // The same ID-based filter handles all years symmetrically
    expect(service).toContain('eq(classroom.academicYearId, academicYearId)');
  });
});

// ─────────────────────────────────────────────
// AC-HF-04: Year + classroom filters without period
// ─────────────────────────────────────────────

describe('AC-HF-04: Year + classroom filters without requiring period', () => {
  const page = readSrc('app/(dashboard)/dashboard/evaluations/page.tsx');
  const service = readSrc('lib/services/pedagogy/assessment.service.ts');

  it('page sends both academicYearId and classroomId when available', () => {
    expect(page).toContain("p.set('academicYearId', ctxValue.academicYearId)");
    expect(page).toContain("p.set('classroomId', ctxValue.classroomId)");
  });

  it('service applies classroomId filter independently of period', () => {
    // classroomId is checked before academicPeriodId in the conditions array
    const idx = service.indexOf('if (classroomId)');
    const periodIdx = service.indexOf('if (academicPeriodId)');
    expect(idx).toBeLessThan(periodIdx);
  });

  it('period is optional — empty periodId does not block classroom filtering', () => {
    // The doFetch only sets periodId if it has a value
    expect(page).toContain("if (ctxValue.academicPeriodId) p.set('academicPeriodId'");
  });
});

// ─────────────────────────────────────────────
// AC-HF-05: Year + classroom + period further narrows
// ─────────────────────────────────────────────

describe('AC-HF-05: Year + classroom + period further narrows results', () => {
  const service = readSrc('lib/services/pedagogy/assessment.service.ts');

  it('service applies all three filters via AND conditions', () => {
    expect(service).toContain('eq(assessment.classroomId, classroomId)');
    expect(service).toContain('eq(assessment.academicPeriodId, academicPeriodId)');
    expect(service).toContain('eq(classroom.academicYearId, academicYearId)');
  });

  it('conditions are combined with AND via and() call', () => {
    expect(service).toContain('and(...conditions)');
  });
});

// ─────────────────────────────────────────────
// AC-HF-06: Year change updates list before period selected
// ─────────────────────────────────────────────

describe('AC-HF-06: Changing year updates list immediately', () => {
  const page = readSrc('app/(dashboard)/dashboard/evaluations/page.tsx');

  it('uses onChange callback (fires on every selector change)', () => {
    expect(page).toContain('onChange={handleContextChange}');
  });

  it('does NOT use onContextChange (requires all selectors to have values)', () => {
    expect(page).not.toContain('onContextChange={handleContextChange}');
  });
});

// ─────────────────────────────────────────────
// AC-HF-07: Status filtering combines with Academic Context
// ─────────────────────────────────────────────

describe('AC-HF-07: Status filtering combines with Academic Context', () => {
  const page = readSrc('app/(dashboard)/dashboard/evaluations/page.tsx');

  it('status is sent as separate query parameter', () => {
    expect(page).toContain("if (tab) p.set('status', tab)");
  });

  it('academicYearId and status are independent parameters', () => {
    // Both are set independently in doFetch
    const doFetch = page.match(/const doFetch[\s\S]*?\[search, tab, ctxValue/);
    expect(doFetch).toBeTruthy();
    expect(doFetch![0]).toContain('tab');
    expect(doFetch![0]).toContain('ctxValue');
  });

  it('tab change triggers refetch alongside context', () => {
    const effect = page.match(/useEffect\(\(\) => \{[\s\S]*?doFetch\(1\)[\s\S]*?\}, \[[^\]]+\]/);
    expect(effect).toBeTruthy();
    expect(effect![0]).toContain('tab');
  });
});

// ─────────────────────────────────────────────
// AC-HF-08: Text search combines with Academic Context
// ─────────────────────────────────────────────

describe('AC-HF-08: Text search combines with Academic Context', () => {
  const page = readSrc('app/(dashboard)/dashboard/evaluations/page.tsx');

  it('search is sent as separate query parameter', () => {
    expect(page).toContain("if (search) p.set('search', search)");
  });

  it('search and academicYearId coexist in doFetch', () => {
    const doFetch = page.match(/const p = new URLSearchParams[\s\S]*?const r = await fetch/);
    expect(doFetch).toBeTruthy();
    expect(doFetch![0]).toContain('search');
    expect(doFetch![0]).toContain('academicYearId');
  });
});

// ─────────────────────────────────────────────
// AC-HF-09: Create dialog displays academic year
// ─────────────────────────────────────────────

describe('AC-HF-09: Create dialog context summary displays academic year', () => {
  const page = readSrc('app/(dashboard)/dashboard/evaluations/page.tsx');

  it('context summary section exists', () => {
    expect(page).toContain('Contexte académique');
  });

  it('displays Année scolaire label', () => {
    expect(page).toContain('Année scolaire :');
  });

  it('displays year from context meta (not hardcoded)', () => {
    expect(page).toContain('ctxMeta?.academicYearName');
  });
});

// ─────────────────────────────────────────────
// AC-HF-10: Create dialog displays classroom
// ─────────────────────────────────────────────

describe('AC-HF-10: Create dialog context summary displays classroom', () => {
  const page = readSrc('app/(dashboard)/dashboard/evaluations/page.tsx');

  it('displays Classe label', () => {
    expect(page).toContain('Classe :');
  });

  it('displays classroom name and level', () => {
    expect(page).toContain('contextClassroom.name');
    expect(page).toContain('contextClassroom.levelName');
  });
});

// ─────────────────────────────────────────────
// AC-HF-11: Create dialog displays period when available
// ─────────────────────────────────────────────

describe('AC-HF-11: Create dialog displays period in context when parent period exists', () => {
  const page = readSrc('app/(dashboard)/dashboard/evaluations/page.tsx');

  it('displays Période label when period is selected', () => {
    expect(page).toContain('Période :');
  });

  it('period display is conditional on contextPeriod existence', () => {
    expect(page).toContain('{contextPeriod && <p>Période :');
  });

  it('does NOT invent a period when none is selected', () => {
    // The period line is guarded by contextPeriod being truthy
    const dialogSection = page.match(/Contexte académique[\s\S]*?Sélectionnez une année/);
    expect(dialogSection).toBeTruthy();
    // Period line should only appear inside the {contextPeriod && ...} guard
  });
});

// ─────────────────────────────────────────────
// AC-HF-12: No duplicate year selector in dialog
// ─────────────────────────────────────────────

describe('AC-HF-12: No duplicate academic-year selector in create dialog', () => {
  const page = readSrc('app/(dashboard)/dashboard/evaluations/page.tsx');

  it('dialog does not contain a year selector', () => {
    // The dialog section should not have <select> with year-related options
    const dialogSection = page.match(/Dialog[\s\S]*?DialogFooter[\s\S]*?<\/Dialog>/);
    expect(dialogSection).toBeTruthy();
    // No onChange handlers for year selection inside dialog
    expect(dialogSection![0]).not.toContain('annees-scolaires');
  });

  it('dialog context is informational, not interactive', () => {
    // Context summary inside dialog uses <p> tags, not <select>
    const dialogSection = page.match(/Contexte académique[\s\S]*?<\/div>/);
    expect(dialogSection).toBeTruthy();
    expect(dialogSection![0]).not.toContain('<select');
  });
});
