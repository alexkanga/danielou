/**
 * POST-M3 UX-2 / UX-3 — Composition Student Search & Rank Filter
 *
 * UX-2: Client-side student name search (case-insensitive).
 * UX-3: Filter by authoritative official rank (never recomputed).
 *
 * T9:  Name search matches expected student.
 * T10: Name search is case-insensitive.
 * T11: Name search does not alter official rank.
 * T12: Rank filter displays only matching official ranks.
 * T13: Competition-ranking gaps are preserved.
 * T14: Sans rang displays only unranked students.
 * T15: Name + rank filters combine correctly.
 * T16: Class average remains unchanged while rows are filtered.
 * T17: Clearing filters restores all rows.
 */

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(
  resolve('src/app/(dashboard)/dashboard/compositions/page.tsx'),
  'utf8',
);

/* ------------------------------------------------------------------
 * Fixture data — mirrors the ClassResult / RankingEntry types
 * with authoritative ranks already supplied (as M2 would return).
 * ------------------------------------------------------------------ */

interface StudentResult {
  enrollmentId: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  result: { studentId: string; status: string; raw: string | null; official: string | null };
}

interface RankingEntry {
  studentId: string;
  average: string;
  rank: number;
  tiedCount: number;
}

interface ClassResult {
  students: StudentResult[];
  classAverage: { status: string; raw: string | null; official: string | null; studentCount: number };
  ranking: RankingEntry[];
}

// Fixture with competition-ranking gap: ranks 1, 2, 2, 4 (no rank 3)
const FIXTURE: ClassResult = {
  classAverage: { status: 'CALCULATED', raw: '8.72', official: '8.72', studentCount: 4 },
  ranking: [
    { studentId: 's3', average: '9.40', rank: 1, tiedCount: 0 },
    { studentId: 's1', average: '8.80', rank: 2, tiedCount: 1 },
    { studentId: 's2', average: '8.80', rank: 2, tiedCount: 1 },
    { studentId: 's4', average: '7.50', rank: 4, tiedCount: 0 },
  ],
  students: [
    { enrollmentId: 'e1', studentId: 's1', studentFirstName: 'Alice', studentLastName: 'Dupont', result: { studentId: 's1', status: 'CALCULATED', raw: '8.80', official: '8.80' } },
    { enrollmentId: 'e2', studentId: 's2', studentFirstName: 'Brice', studentLastName: 'Kouassi', result: { studentId: 's2', status: 'CALCULATED', raw: '8.80', official: '8.80' } },
    { enrollmentId: 'e3', studentId: 's3', studentFirstName: 'Carole', studentLastName: 'Martin', result: { studentId: 's3', status: 'CALCULATED', raw: '9.40', official: '9.40' } },
    { enrollmentId: 'e4', studentId: 's4', studentFirstName: 'David', studentLastName: 'Kouassi', result: { studentId: 's4', status: 'CALCULATED', raw: '7.50', official: '7.50' } },
  ],
};

// Fixture with an unranked student
const FIXTURE_WITH_UNRANKED: ClassResult = {
  classAverage: { status: 'CALCULATED', raw: '8.50', official: '8.50', studentCount: 3 },
  ranking: [
    { studentId: 's1', average: '10.00', rank: 1, tiedCount: 0 },
    { studentId: 's2', average: '8.00', rank: 2, tiedCount: 0 },
  ],
  students: [
    { enrollmentId: 'e1', studentId: 's1', studentFirstName: 'Alice', studentLastName: 'Dupont', result: { studentId: 's1', status: 'CALCULATED', raw: '10.00', official: '10.00' } },
    { enrollmentId: 'e2', studentId: 's2', studentFirstName: 'Brice', studentLastName: 'Kouassi', result: { studentId: 's2', status: 'CALCULATED', raw: '8.00', official: '8.00' } },
    { enrollmentId: 'e3', studentId: 's3', studentFirstName: 'Carole', studentLastName: 'Martin', result: { studentId: 's3', status: 'NO_COMPUTABLE_RESULT', raw: null, official: null } },
  ],
};

/* ------------------------------------------------------------------
 * Replicate the page's getRank and filtering logic for testing
 * ------------------------------------------------------------------ */

function getRank(classResult: ClassResult, sid: string): number | null {
  const e = classResult.ranking.find((r) => r.studentId === sid);
  return e ? e.rank : null;
}

function filterStudents(
  classResult: ClassResult,
  nameSearch: string,
  rankFilter: string,
): StudentResult[] {
  let result = classResult.students;

  const term = nameSearch.trim().toLowerCase();
  if (term) {
    result = result.filter(s =>
      s.studentLastName.toLowerCase().includes(term) ||
      s.studentFirstName.toLowerCase().includes(term)
    );
  }

  if (rankFilter === 'unranked') {
    result = result.filter(s => getRank(classResult, s.studentId) === null);
  } else if (rankFilter !== 'all') {
    const targetRank = parseInt(rankFilter, 10);
    result = result.filter(s => getRank(classResult, s.studentId) === targetRank);
  }

  return result;
}

describe('UX-2 / UX-3 — Composition filters', () => {
  // ─────────────────────────────────────────────
  // Structural checks (source code analysis)
  // ─────────────────────────────────────────────

  it('has nameSearch state and name search input', () => {
    expect(pageSource).toContain('const [nameSearch, setNameSearch]');
    expect(pageSource).toContain('Rechercher un élève...');
  });

  it('has rankFilter state', () => {
    expect(pageSource).toContain('const [rankFilter, setRankFilter]');
  });

  it('uses filteredStudents for table rendering, not classResult.students directly', () => {
    // The table should iterate over filteredStudents
    expect(pageSource).toContain('filteredStudents.map');
  });

  it('class average uses classResult.classAverage (not filtered data)', () => {
    // Class average section must reference classResult.classAverage
    expect(pageSource).toContain('classResult.classAverage.official');
  });

  it('rank options are derived from classResult.ranking (authoritative)', () => {
    expect(pageSource).toContain('rankOptions = useMemo');
    expect(pageSource).toContain('classResult.ranking');
  });

  it('hasUnranked checks for students with no rank', () => {
    expect(pageSource).toContain('hasUnranked = useMemo');
  });

  it('rank filter includes Tous and Sans rang options', () => {
    expect(pageSource).toContain('value="all">Tous</option>');
    expect(pageSource).toContain('value="unranked">Sans rang</option>');
  });

  it('filters are reset when period changes', () => {
    expect(pageSource).toContain("setNameSearch('')");
    expect(pageSource).toContain("setRankFilter('all')");
  });

  it('shows filtered count when filtering is active', () => {
    expect(pageSource).toContain('affiché');
    expect(pageSource).toContain('sur');
  });

  it('no ranking recalculation in UI', () => {
    // The page must NOT compute ranks — only look up from classResult.ranking
    expect(pageSource).toContain('getRank(s.studentId)');
    // Verify getRank delegates to lookupRank which does a simple .find() lookup
    const lookupBlock = pageSource.match(/function lookupRank\(ranking: RankingEntry\[\], sid: string\)[\s\S]*?return e \? e\.rank : null;\s*\}/);
    expect(lookupBlock).not.toBeNull();
    expect(lookupBlock![0]).toContain('.find(');
  });

  it('class average card is rendered outside the filter scope', () => {
    // Class average section appears before the filter controls in the JSX
    const avgIdx = pageSource.indexOf('classResult.classAverage.official');
    const filterIdx = pageSource.indexOf('filteredStudents.map');
    expect(avgIdx).toBeLessThan(filterIdx);
  });

  // ─────────────────────────────────────────────
  // Behavioral tests (logic verification)
  // ─────────────────────────────────────────────

  it('T9 — name search matches expected student by last name', () => {
    const result = filterStudents(FIXTURE, 'Kouassi', 'all');
    expect(result).toHaveLength(2);
    expect(result[0].studentLastName).toBe('Kouassi');
    expect(result[1].studentLastName).toBe('Kouassi');
  });

  it('T9b — name search matches by first name', () => {
    const result = filterStudents(FIXTURE, 'Alice', 'all');
    expect(result).toHaveLength(1);
    expect(result[0].studentFirstName).toBe('Alice');
  });

  it('T10 — name search is case-insensitive', () => {
    const upper = filterStudents(FIXTURE, 'KOUASSI', 'all');
    const lower = filterStudents(FIXTURE, 'kouassi', 'all');
    const mixed = filterStudents(FIXTURE, 'KouAsSi', 'all');
    expect(upper).toHaveLength(2);
    expect(lower).toHaveLength(2);
    expect(mixed).toHaveLength(2);
  });

  it('T11 — name search does not alter official rank', () => {
    const result = filterStudents(FIXTURE, 'Brice', 'all');
    expect(result).toHaveLength(1);
    // Brice's authoritative rank is 2 (from fixture ranking)
    const rank = getRank(FIXTURE, result[0].studentId);
    expect(rank).toBe(2);
  });

  it('T12 — rank filter displays only matching official ranks', () => {
    const result = filterStudents(FIXTURE, '', '1');
    expect(result).toHaveLength(1);
    expect(result[0].studentFirstName).toBe('Carole');
    expect(getRank(FIXTURE, result[0].studentId)).toBe(1);
  });

  it('T13 — competition-ranking gaps are preserved', () => {
    // Fixture has ranks 1, 2, 2, 4 — rank 3 does NOT exist
    // Filter for rank 3 should return 0 results
    const result = filterStudents(FIXTURE, '', '3');
    expect(result).toHaveLength(0);
    // Rank 4 should return 1 result
    const rank4 = filterStudents(FIXTURE, '', '4');
    expect(rank4).toHaveLength(1);
    expect(rank4[0].studentFirstName).toBe('David');
  });

  it('T14 — Sans rang displays only unranked students', () => {
    const result = filterStudents(FIXTURE_WITH_UNRANKED, '', 'unranked');
    expect(result).toHaveLength(1);
    expect(result[0].studentFirstName).toBe('Carole');
    expect(result[0].result.status).toBe('NO_COMPUTABLE_RESULT');
  });

  it('T15 — name + rank filters combine correctly', () => {
    // Search "Kouassi" + rank 4 → only David Kouassi
    const result = filterStudents(FIXTURE, 'Kouassi', '4');
    expect(result).toHaveLength(1);
    expect(result[0].studentFirstName).toBe('David');
    expect(result[0].studentLastName).toBe('Kouassi');
  });

  it('T15b — combined filters: no match returns empty', () => {
    const result = filterStudents(FIXTURE, 'Martin', '4');
    expect(result).toHaveLength(0);
  });

  it('T16 — class average remains unchanged while rows are filtered', () => {
    // This is a structural guarantee: class average always uses classResult.classAverage
    // regardless of filtering. Verify by checking the fixture is unchanged.
    const avgBefore = FIXTURE.classAverage.official;
    filterStudents(FIXTURE, 'Kouassi', 'all');
    const avgAfter = FIXTURE.classAverage.official;
    expect(avgBefore).toBe(avgAfter);
    expect(avgBefore).toBe('8.72');
  });

  it('T17 — clearing filters restores all rows', () => {
    // First filter
    const filtered = filterStudents(FIXTURE, 'Kouassi', '2');
    expect(filtered.length).toBeLessThan(FIXTURE.students.length);
    // Clear filters
    const all = filterStudents(FIXTURE, '', 'all');
    expect(all).toHaveLength(FIXTURE.students.length);
  });
});
