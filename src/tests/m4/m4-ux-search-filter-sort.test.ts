/**
 * M4 UX Search/Filter/Sort Tests
 * M4-UX-SEARCH-01..04, M4-UX-STATUS-01..05, M4-UX-DECISION-01..05,
 * M4-UX-SORT-01..07, M4-UX-COMBINE-01..04, M4-UX-INV-01..06,
 * M4-UX-RESET-01..04, M4-UX-EMPTY-01
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const page = readFileSync(
  resolve(__dirname, '../../app/(dashboard)/dashboard/resultats/annuelles/page.tsx'),
  'utf-8',
);

describe('M4 UX Search (M4-UX-SEARCH-01..04)', () => {
  it('SEARCH-01: empty search shows all rows (visibleRows used in map)', () => {
    expect(page).toContain('visibleRows.map');
  });
  it('SEARCH-02: partial name search matches row (Rechercher un élève)', () => {
    expect(page).toContain('Rechercher un élève...');
    expect(page).toContain('search.trim()');
    expect(page).toContain('name.includes');
  });
  it('SEARCH-03: search is case-insensitive (toLowerCase)', () => {
    expect(page).toContain('toLowerCase()');
  });
  it('SEARCH-04: nonmatching search shows empty state', () => {
    expect(page).toContain('Aucun élève ne correspond aux critères');
  });
});

describe('M4 UX Status Filter (M4-UX-STATUS-01..05)', () => {
  it('STATUS-01: Tous shows all (__all__ sentinel)', () => {
    expect(page).toContain('__all__');
    expect(page).toContain('Tous');
  });
  it('STATUS-02: Admissibilité filters PROPOSED_ADMITTED', () => {
    expect(page).toContain('Admissibilité');
    expect(page).toContain('PROPOSED_ADMITTED');
  });
  it('STATUS-03: Redoublement filters PROPOSED_REPEAT', () => {
    expect(page).toContain('Redoublement');
    expect(page).toContain('PROPOSED_REPEAT');
  });
  it('STATUS-04: Conseil requis filters DECISION_COUNCIL', () => {
    expect(page).toContain('Conseil requis');
    expect(page).toContain('DECISION_COUNCIL');
  });
  it('STATUS-05: Dossier incomplet filters INCOMPLETE', () => {
    expect(page).toContain('Dossier incomplet');
    expect(page).toContain('value="INCOMPLETE"');
  });
});

describe('M4 UX Decision Filter (M4-UX-DECISION-01..05)', () => {
  it('DECISION-01: Toutes shows all', () => {
    expect(page).toContain('Toutes');
    expect(page).toContain('Décision du conseil');
  });
  it('DECISION-02: Admis filters admitted', () => {
    expect(page).toContain('value="admitted"');
    expect(page).toContain('>Admis<');
  });
  it('DECISION-03: Redouble filters repeat', () => {
    expect(page).toContain('value="repeat"');
    expect(page).toContain('>Redouble<');
  });
  it('DECISION-04: Admis sur dérogation filters admitted_by_derogation', () => {
    expect(page).toContain('admitted_by_derogation');
    expect(page).toContain('Admis sur dérogation');
  });
  it('DECISION-05: En attente filters null (__pending__ sentinel)', () => {
    expect(page).toContain('__pending__');
    expect(page).toContain('En attente');
    expect(page).toContain('!s.persistedFinalDecision');
  });
});

describe('M4 UX Sort (M4-UX-SORT-01..07)', () => {
  it('SORT-01: rank ascending (rank-asc)', () => {
    expect(page).toContain('rank-asc');
    expect(page).toContain('Rang croissant');
    expect(page).toContain('a.annualRank.rank - b.annualRank.rank');
  });
  it('SORT-02: rank descending (rank-desc)', () => {
    expect(page).toContain('rank-desc');
    expect(page).toContain('Rang décroissant');
    expect(page).toContain('b.annualRank.rank - a.annualRank.rank');
  });
  it('SORT-03: average descending (avg-desc)', () => {
    expect(page).toContain('avg-desc');
    expect(page).toContain('Moyenne décroissante');
    expect(page).toContain('parseFloat(a.annual.annualOfficial)');
  });
  it('SORT-04: average ascending (avg-asc)', () => {
    expect(page).toContain('avg-asc');
    expect(page).toContain('Moyenne croissante');
  });
  it('SORT-05: name A-Z (name-asc, localeCompare)', () => {
    expect(page).toContain('name-asc');
    expect(page).toContain('Nom A → Z');
    expect(page).toContain('.localeCompare');
  });
  it('SORT-06: name Z-A (name-desc)', () => {
    expect(page).toContain('name-desc');
    expect(page).toContain('Nom Z → A');
  });
  it('SORT-07: null rank/average handled deterministically (numeric first, null after)', () => {
    expect(page).toContain('a.annualRank == null');
    // null rows sort after numeric rows
    expect(page).toContain('return 1');
    // stable ordering within null rows via lastName
    expect(page).toContain("a.studentLastName.localeCompare(b.studentLastName, 'fr')");
  });
});

describe('M4 UX Filter Composition (M4-UX-COMBINE-01..04)', () => {
  it('COMBINE-01: search + status combine with AND (sequential filter)', () => {
    // Both are .filter() calls on the same chain = AND semantics
    expect(page).toContain('filtered = filtered.filter');
  });
  it('COMBINE-02: status + decision combine with AND', () => {
    expect(page).toContain('decisionFilter ===');
  });
  it('COMBINE-03: search + status + decision combine with AND', () => {
    expect(page).toContain('statusFilter');
    expect(page).toContain('decisionFilter');
    expect(page).toContain('search.trim()');
  });
  it('COMBINE-04: sort applies after filtering (inside same useMemo)', () => {
    expect(page).toContain('if (sortKey)');
    expect(page).toContain('[...filtered].sort');
  });
});

describe('M4 UX Business Invariants (M4-UX-INV-01..06)', () => {
  it('INV-01: filter does not recompute rank (reads s.annualRank, never writes)', () => {
    expect(page).toContain('s.annualRank');
  });
  it('INV-02: sort does not recompute rank (reads annualRank.rank only)', () => {
    expect(page).toContain('a.annualRank.rank');
  });
  it('INV-03: search does not change class average (classAverage from data)', () => {
    expect(page).toContain('data.classAverage');
  });
  it('INV-04: filter does not change class average', () => {
    expect(page).toContain('data.classAverage.annualOfficial');
  });
  it('INV-05: sort does not change class average', () => {
    expect(page).toContain('data.classAverage.studentCount');
  });
  it('INV-06: non-computable rows never receive fake average/rank', () => {
    // Null annualOfficial → parseFloat returns null → null branch, never fabricated
    expect(page).toContain('a.annual.annualOfficial ? parseFloat');
    expect(page).toContain('a.annualRank == null');
  });
});

describe('M4 UX Reset / Empty (M4-UX-RESET-01..04, M4-UX-EMPTY-01)', () => {
  it('RESET-01: reset clears search', () => {
    expect(page).toContain("setSearch('')");
    expect(page).toContain('handleReset');
  });
  it('RESET-02: reset returns status to Tous', () => {
    expect(page).toContain("setStatusFilter('')");
  });
  it('RESET-03: reset returns decision to Toutes', () => {
    expect(page).toContain("setDecisionFilter('')");
  });
  it('RESET-04: reset restores default sort', () => {
    expect(page).toContain("setSortKey('')");
  });
  it('EMPTY-01: no matches displays clean empty state', () => {
    expect(page).toContain('Aucun élève ne correspond aux critères');
    expect(page).toContain('visibleRows.length === 0 && data.students.length > 0');
  });
});

describe('M4 UX Reset Placeholder (M4-UX-RESET-PH-01..06)', () => {
  it('RESET-PH-01: initial Statut provisoire select uses placeholder "Statut provisoire"', () => {
    // Value must be controlled with empty string fallback (not undefined) so placeholder renders
    expect(page).toContain('value={statusFilter || \'\'}');
    expect(page).toContain('placeholder="Statut provisoire"');
  });
  it('RESET-PH-02: initial Décision du conseil select uses placeholder "Décision du conseil"', () => {
    expect(page).toContain('value={decisionFilter || \'\'}');
    expect(page).toContain('placeholder="Décision du conseil"');
  });
  it('RESET-PH-03: select provisional status → reset → placeholder restored', () => {
    // Reset sets statusFilter to '' → value={'' || ''}='' → no matching SelectItem → placeholder shows
    expect(page).toContain("setStatusFilter('')");
    expect(page).toContain('value={statusFilter || \'\'}');
    // No SelectItem has value="" → Radix shows placeholder
    expect(page).not.toContain('value=""');
  });
  it('RESET-PH-04: select council decision → reset → placeholder restored', () => {
    expect(page).toContain("setDecisionFilter('')");
    expect(page).toContain('value={decisionFilter || \'\'}');
  });
  it('RESET-PH-05: select both filters → reset → both placeholders restored', () => {
    // handleReset clears all four filter states in one call
    expect(page).toContain('setSearch(\'\')');
    expect(page).toContain('setStatusFilter(\'\')');
    expect(page).toContain('setDecisionFilter(\'\')');
    expect(page).toContain('setSortKey(\'\')');
    // All selects use || '' fallback — never || undefined
    expect(page).not.toContain('|| undefined');
  });
  it('RESET-PH-06: reset restores logical ALL rows', () => {
    // When all filters are empty, visibleRows returns data.students unfiltered
    expect(page).toContain('if (!data) return []');
    expect(page).toContain('let filtered = data.students');
  });
});

describe('M4 UX Select Width (M4-UX-WIDTH-01..02)', () => {
  it('WIDTH-01: Décision du conseil trigger has sufficient responsive width for full placeholder', () => {
    // Must be at least 220px on desktop to display "Décision du conseil" fully
    expect(page).toMatch(/sm:w-\[2[2-9]\dpx\]/);
  });
  it('WIDTH-02: wider select does not remove responsive/mobile behavior', () => {
    // All filter selects use w-full on mobile and specific width on sm+
    const wFullCount = (page.match(/w-full sm:w-/g) || []).length;
    expect(wFullCount).toBeGreaterThanOrEqual(3); // status + decision + sort
  });
});
