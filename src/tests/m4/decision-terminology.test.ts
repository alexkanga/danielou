/**
 * M4 Decision Terminology & UI Tests — DEC-UI-01..07, DEC-01..12
 *
 * DEC-UI-01..07: Source-invariant terminology verification.
 * DEC-01..12: Decision workflow logic (pure function + service pattern).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { validateDecision } from '@/lib/services/results/recommendation-engine';

const page = readFileSync(
  resolve(__dirname, '../../app/(dashboard)/dashboard/resultats/annuelles/page.tsx'),
  'utf-8',
);

const decisionService = readFileSync(
  resolve(__dirname, '../../lib/services/results/annual-decision.service.ts'),
  'utf-8',
);

describe('M4 Decision Terminology (DEC-UI-01..DEC-UI-07)', () => {
  // DEC-UI-01: "Proposition" replaced by "Statut provisoire"
  it('DEC-UI-01: "Proposition" replaced by "Statut provisoire" in column header', () => {
    // The old column header must NOT appear
    expect(page).not.toContain('>Proposition<');
    // The new column header must appear
    expect(page).toContain('Statut provisoire');
  });

  // DEC-UI-02: "Décision finale" replaced by "Décision du conseil"
  it('DEC-UI-02: "Décision finale" replaced by "Décision du conseil"', () => {
    // Old label must NOT appear as column header
    expect(page).not.toContain('>Décision finale<');
    // New label must appear as column header and dialog title
    expect(page).toContain('Décision du conseil');
  });

  // DEC-UI-03: PROPOSED_ADMITTED displays "Admissibilité"
  it('DEC-UI-03: PROPOSED_ADMITTED displays "Admissibilité"', () => {
    // In RECOMMENDATION_CONFIG, PROPOSED_ADMITTED must map to Admissibilité
    expect(page).toContain("label: 'Admissibilité'");
  });

  // DEC-UI-04: PROPOSED_REPEAT displays "Redoublement"
  it('DEC-UI-04: PROPOSED_REPEAT displays "Redoublement"', () => {
    // In RECOMMENDATION_CONFIG, PROPOSED_REPEAT must map to Redoublement
    const match = page.match(/PROPOSED_REPEAT:[^}]+}/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain("label: 'Redoublement'");
  });

  // DEC-UI-05: INCOMPLETE displays "Dossier incomplet"
  it('DEC-UI-05: INCOMPLETE displays "Dossier incomplet"', () => {
    // In RECOMMENDATION_CONFIG, INCOMPLETE must map to Dossier incomplet
    // Extract RECOMMENDATION_CONFIG block to avoid matching ANNUAL_STATUS_CONFIG
    const recBlock = page.match(/RECOMMENDATION_CONFIG[\s\S]*?DECISION_CONFIG/)?.[0] ?? '';
    expect(recBlock).toContain("label: 'Dossier incomplet'");
  });

  // DEC-UI-06: DECISION_COUNCIL displays "Conseil requis"
  it('DEC-UI-06: DECISION_COUNCIL displays "Conseil requis"', () => {
    // In RECOMMENDATION_CONFIG, DECISION_COUNCIL must map to Conseil requis
    const recBlock = page.match(/RECOMMENDATION_CONFIG[\s\S]*?DECISION_CONFIG/)?.[0] ?? '';
    expect(recBlock).toContain("label: 'Conseil requis'");
  });

  // DEC-UI-07: ADMITTED_BY_DEROGATION displays "Admis sur dérogation"
  it('DEC-UI-07: ADMITTED_BY_DEROGATION displays "Admis sur dérogation"', () => {
    // In DECISION_CONFIG, admitted_by_derogation must map to "Admis sur dérogation"
    expect(page).toContain("label: 'Admis sur dérogation'");
  });
});

describe('M4 Decision Workflow Logic (DEC-01..DEC-12)', () => {
  // DEC-01: Admissibilité → Admis allowed
  it('DEC-01: Admissibilité → Admis allowed', () => {
    const result = validateDecision('PROPOSED_ADMITTED', 'ADMITTED', null);
    expect(result.allowed).toBe(true);
  });

  // DEC-02: Redoublement → Redouble allowed
  it('DEC-02: Redoublement → Redouble allowed', () => {
    const result = validateDecision('PROPOSED_REPEAT', 'REPEAT', null);
    expect(result.allowed).toBe(true);
  });

  // DEC-03: Admis sur dérogation without justification rejected
  it('DEC-03: Admis sur dérogation without justification rejected', () => {
    const result = validateDecision('PROPOSED_REPEAT', 'ADMITTED_BY_DEROGATION', null);
    expect(result.allowed).toBe(false);
  });

  // DEC-04: Admis sur dérogation with justification allowed
  it('DEC-04: Admis sur dérogation with justification allowed', () => {
    const result = validateDecision('PROPOSED_REPEAT', 'ADMITTED_BY_DEROGATION', 'Test M4 — dérogation validée par le conseil');
    expect(result.allowed).toBe(true);
  });

  // DEC-05: Conseil requis without justification rejected
  it('DEC-05: Conseil requis without justification rejected', () => {
    const result = validateDecision('DECISION_COUNCIL', 'ADMITTED', null);
    expect(result.allowed).toBe(false);
  });

  // DEC-06: Conseil requis with justification allowed
  it('DEC-06: Conseil requis with justification allowed', () => {
    const result = validateDecision('DECISION_COUNCIL', 'ADMITTED', 'Test M4 — décision du conseil');
    expect(result.allowed).toBe(true);
  });

  // DEC-07: Dossier incomplet decision blocked
  it('DEC-07: Dossier incomplet decision blocked', () => {
    const result = validateDecision('INCOMPLETE', 'ADMITTED', 'Some reason');
    expect(result.allowed).toBe(false);
  });

  // DEC-08: decision does not modify annualOfficial (code does NOT overwrite annualOfficial)
  it('DEC-08: decision does not modify annualOfficial (snapshot preserved)', () => {
    // The .set() block in the decision service must NOT include annualOfficial
    const updateSetBlock = decisionService.match(/\.set\({[^}]+}/)?.[0] ?? '';
    expect(updateSetBlock).not.toContain('annualOfficial');
  });

  // DEC-09: decision does not modify annualRank
  it('DEC-09: decision does not modify annualRank (snapshot preserved)', () => {
    // The .set() block in the decision service must NOT include annualRank
    const updateSetBlock = decisionService.match(/\.set\({[^}]+}/)?.[0] ?? '';
    expect(updateSetBlock).not.toContain('annualRank');
  });

  // DEC-10: decision actor persisted
  it('DEC-10: decision actor persisted (decidedBy in .set())', () => {
    // The .set() block must include decidedBy
    const updateSetBlock = decisionService.match(/\.set\({[^}]+}/)?.[0] ?? '';
    expect(updateSetBlock).toContain('decidedBy');
  });

  // DEC-11: decision timestamp persisted
  it('DEC-11: decision timestamp persisted (decidedAt in .set())', () => {
    // The .set() block must include decidedAt
    const updateSetBlock = decisionService.match(/\.set\({[^}]+}/)?.[0] ?? '';
    expect(updateSetBlock).toContain('decidedAt');
  });

  // DEC-12: audit emitted
  it('DEC-12: audit emitted (audit_log insert in transaction)', () => {
    expect(decisionService).toContain('annual_final_decision_recorded');
    expect(decisionService).toContain('auditLog');
  });
});
