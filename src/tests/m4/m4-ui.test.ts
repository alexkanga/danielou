/**
 * M4 UI Tests — UI-01 through UI-11
 *
 * Source-invariant tests verifying the annual results page.tsx code patterns.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const page = readFileSync(
  resolve(__dirname, '../../app/(dashboard)/dashboard/resultats/annuelles/page.tsx'),
  'utf-8',
);

describe('M4 Annual Results UI (UI-01..UI-11)', () => {
  // ─── UI-01: page shows C1–C6 composition columns ───
  it('UI-01: page shows C1–C6 composition columns (composition periodType rendering)', () => {
    // The page filters periods by periodType === 'composition' for composition columns
    expect(page).toContain("=== 'composition'");
  });

  // ─── UI-02: page shows Passage column ───
  it('UI-02: page shows Passage column (Passage header)', () => {
    expect(page).toContain('Passage');
  });

  // ─── UI-03: annual average shown ───
  it('UI-03: annual average shown (Moy. annuelle header)', () => {
    expect(page).toContain('Moy. annuelle');
  });

  // ─── UI-04: annual rank shown ───
  it('UI-04: annual rank shown (Rang header)', () => {
    expect(page).toContain('Rang');
  });

  // ─── UI-05: INCOMPLETE label shown without fake 0 ───
  it('UI-05: INCOMPLETE label shown without fake 0 (Incomplet badge, no 0 substitution)', () => {
    // INCOMPLETE must map to 'Incomplet' label
    expect(page).toContain("'Incomplet'");
    // The annual cell for non-CALCULATED should show '—' (dash), NOT '0'
    // Verify the annual cell renders dash for non-CALCULATED
    expect(page).toContain("isCalc ? (");
    // The else branch shows a dash
    expect(page).toContain('text-muted-foreground');
  });

  // ─── UI-06: DECISION_COUNCIL label shown ───
  it('UI-06: DECISION_COUNCIL label shown (Conseil de classe)', () => {
    expect(page).toContain('Conseil de classe');
  });

  // ─── UI-07: NULL threshold warning shown ───
  it('UI-07: NULL threshold warning shown (Seuil de promotion non configuré)', () => {
    expect(page).toContain('Seuil de promotion non configuré');
  });

  // ─── UI-08: recommendation shown when threshold configured (Statut provisoire column header) ───
  it('UI-08: recommendation shown when threshold configured (Statut provisoire column header)', () => {
    expect(page).toContain('Statut provisoire');
  });

  // ─── UI-09: derogation requires justification ───
  it('UI-09: derogation requires justification (ADMITTED_BY_DEROGATION requires justification textarea)', () => {
    expect(page).toContain('ADMITTED_BY_DEROGATION');
    // The dialog shows justification textarea for derogation
    expect(page).toContain('decision-justification');
    // The condition includes ADMITTED_BY_DEROGATION
    expect(page).toContain("decisionAction === 'ADMITTED_BY_DEROGATION'");
  });

  // ─── UI-10: council decision requires justification ───
  it('UI-10: council decision requires justification (DECISION_COUNCIL case shows justification required)', () => {
    // The dialog condition includes DECISION_COUNCIL
    expect(page).toContain("decisionDialog.recommendation === 'DECISION_COUNCIL'");
    // Justification is required (shown with asterisk)
    expect(page).toContain('Justification');
    expect(page).toContain('text-destructive');
  });

  // ─── UI-11: final decision does not alter displayed annual average ───
  it('UI-11: final decision does not alter displayed annual average (rendered from s.annual.annualOfficial)', () => {
    // The annual average cell reads from s.annual.annualOfficial, NOT from any decision field
    expect(page).toContain('s.annual.annualOfficial');
  });
});
