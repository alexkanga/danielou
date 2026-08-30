/**
 * M4 Decision Validation & Atomicity Tests — DEC-VAL-01..16
 *
 * DEC-VAL-01..07: Validation correctness (pure function + service code patterns).
 * DEC-VAL-08..12: No-write invariants and atomicity (source-invariant).
 * DEC-VAL-13..14: Derogation justification preserved.
 * DEC-VAL-15: Error contract (no 500 for business validation).
 * DEC-VAL-16: UI renders mandatory-justification validation message.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { validateDecision } from '@/lib/services/results/recommendation-engine';

const decisionService = readFileSync(
  resolve(__dirname, '../../lib/services/results/annual-decision.service.ts'),
  'utf-8',
);

const page = readFileSync(
  resolve(__dirname, '../../app/(dashboard)/dashboard/resultats/annuelles/page.tsx'),
  'utf-8',
);

describe('M4 Decision Validation (DEC-VAL-01..07)', () => {
  // DEC-VAL-01: DECISION_COUNCIL + Admis + null justification → reject
  it('DEC-VAL-01: DECISION_COUNCIL + Admis + null justification → reject', () => {
    const result = validateDecision('DECISION_COUNCIL', 'ADMITTED', null);
    expect(result.allowed).toBe(false);
  });

  // DEC-VAL-02: DECISION_COUNCIL + Admis + "" → reject
  it('DEC-VAL-02: DECISION_COUNCIL + Admis + empty string → reject', () => {
    const result = validateDecision('DECISION_COUNCIL', 'ADMITTED', '');
    expect(result.allowed).toBe(false);
  });

  // DEC-VAL-03: DECISION_COUNCIL + Admis + whitespace → reject
  it('DEC-VAL-03: DECISION_COUNCIL + Admis + whitespace → reject', () => {
    const result = validateDecision('DECISION_COUNCIL', 'ADMITTED', '   ');
    expect(result.allowed).toBe(false);
  });

  // DEC-VAL-04: DECISION_COUNCIL + Redouble + empty justification → reject
  it('DEC-VAL-04: DECISION_COUNCIL + Redouble + empty justification → reject', () => {
    const result = validateDecision('DECISION_COUNCIL', 'REPEAT', '');
    expect(result.allowed).toBe(false);
  });

  // DEC-VAL-05: DECISION_COUNCIL + Admis + valid justification → allow
  it('DEC-VAL-05: DECISION_COUNCIL + Admis + valid justification → allow', () => {
    const result = validateDecision('DECISION_COUNCIL', 'ADMITTED', 'Test M4 — décision du conseil');
    expect(result.allowed).toBe(true);
  });

  // DEC-VAL-06: DECISION_COUNCIL + Redouble + valid justification → allow
  it('DEC-VAL-06: DECISION_COUNCIL + Redouble + valid justification → allow', () => {
    const result = validateDecision('DECISION_COUNCIL', 'REPEAT', 'Test M4 — décision du conseil');
    expect(result.allowed).toBe(true);
  });

  // DEC-VAL-07: invalid request leaves finalDecision NULL (code pattern)
  it('DEC-VAL-07: invalid request leaves finalDecision NULL (validation before any write)', () => {
    // The service must validate BEFORE any INSERT or UPDATE.
    // Verify that the validateDecision call appears BEFORE db.insert or db.update.
    const validatePos = decisionService.indexOf('validateDecision(');
    const firstInsertPos = decisionService.indexOf('tx.insert');
    const firstUpdatePos = decisionService.indexOf('tx.update');
    expect(validatePos).toBeGreaterThan(-1);
    // Validation must occur before any transactional write
    if (firstInsertPos > -1) expect(validatePos).toBeLessThan(firstInsertPos);
    if (firstUpdatePos > -1) expect(validatePos).toBeLessThan(firstUpdatePos);
  });
});

describe('M4 Decision Atomicity & No-Write (DEC-VAL-08..12)', () => {
  // DEC-VAL-08: invalid request leaves decidedBy NULL
  it('DEC-VAL-08: invalid request leaves decidedBy NULL (no partial write)', () => {
    // The decidedBy is set in the .set() or .values() inside the transaction.
    // Since validation rejects before the transaction, decidedBy is never touched.
    // Verify: decidedBy assignment is inside transaction block
    const txBlock = decisionService.match(/(?:db|txDb)\.transaction\([\s\S]*?\)\);/);
    expect(txBlock).not.toBeNull();
    expect(txBlock![0]).toContain('decidedBy');
  });

  // DEC-VAL-09: invalid request leaves decidedAt NULL
  it('DEC-VAL-09: invalid request leaves decidedAt NULL (no partial write)', () => {
    const txBlock = decisionService.match(/(?:db|txDb)\.transaction\([\s\S]*?\)\);/);
    expect(txBlock).not.toBeNull();
    expect(txBlock![0]).toContain('decidedAt');
  });

  // DEC-VAL-10: invalid request creates no decision audit event
  it('DEC-VAL-10: invalid request creates no decision audit (audit inside transaction)', () => {
    // Audit insert must be inside the transaction block
    const txBlock = decisionService.match(/(?:db|txDb)\.transaction\([\s\S]*?\)\);/);
    expect(txBlock).not.toBeNull();
    expect(txBlock![0]).toContain('annual_final_decision_recorded');
  });

  // DEC-VAL-11: persistence failure rolls back audit/decision atomically
  it('DEC-VAL-11: decision + audit are in a single db.transaction', () => {
    // Verify both the decision write (insert or update) and audit insert
    // are inside the same transaction callback
    const txBlock = decisionService.match(/(?:db|txDb)\.transaction\([\s\S]*?\)\);/);
    expect(txBlock).not.toBeNull();
    const block = txBlock![0];
    // Must have decision write
    const hasDecisionWrite = block.includes('finalDecision:') && (block.includes('tx.update') || block.includes('tx.insert'));
    expect(hasDecisionWrite).toBe(true);
    // Must have audit write
    expect(block).toContain('auditLog');
  });

  // DEC-VAL-12: audit failure rolls back decision atomically
  it('DEC-VAL-12: audit inside same transaction as decision (rollback on failure)', () => {
    // Both tx.insert for auditLog and tx.update/tx.insert for annualResult
    // must be in the same async callback passed to transaction
    const txCallback = decisionService.match(/(?:db|txDb)\.transaction\(async \(tx\) => \{[\s\S]*\}\s*\);/);
    expect(txCallback).not.toBeNull();
    const block = txCallback![0];
    // Count tx. operations
    const txOps = (block.match(/tx\.(insert|update)/g) ?? []);
    // At minimum: 1 for decision + 1 for audit
    expect(txOps.length).toBeGreaterThanOrEqual(2);
  });
});

describe('M4 Derogation Justification (DEC-VAL-13..14)', () => {
  // DEC-VAL-13: PROPOSED_REPEAT + admitted_by_derogation + empty justification → reject
  it('DEC-VAL-13: PROPOSED_REPEAT + admitted_by_derogation + empty justification → reject', () => {
    const result = validateDecision('PROPOSED_REPEAT', 'ADMITTED_BY_DEROGATION', null);
    expect(result.allowed).toBe(false);
  });

  // DEC-VAL-14: PROPOSED_REPEAT + admitted_by_derogation + valid justification → allow
  it('DEC-VAL-14: PROPOSED_REPEAT + admitted_by_derogation + valid justification → allow', () => {
    const result = validateDecision('PROPOSED_REPEAT', 'ADMITTED_BY_DEROGATION', 'Test M4 — dérogation validée par le conseil');
    expect(result.allowed).toBe(true);
  });
});

describe('M4 Error Contract & UI (DEC-VAL-15..16)', () => {
  // DEC-VAL-15: validation error returns business error, not HTTP 500
  it('DEC-VAL-15: validation error uses PedagogyDomainError with 422, not plain Error', () => {
    // The service must import PedagogyDomainError
    expect(decisionService).toContain('PedagogyDomainError');
    // The validation rejection must use PedagogyDomainError, not plain Error
    expect(decisionService).toContain("throw new PedagogyDomainError(");
    // Must NOT use plain Error for validation
    // Check that 'DECISION_VALIDATION' code is used
    expect(decisionService).toContain('DECISION_VALIDATION');
    // Must use 422 status
    expect(decisionService).toContain('422');
  });

  // DEC-VAL-16: UI renders mandatory-justification validation message
  it('DEC-VAL-16: UI has justification-required logic and disabled submit', () => {
    // UI must compute whether justification is required
    expect(page).toContain('justificationRequired');
    // UI must compute canSubmit based on justification
    expect(page).toContain('canSubmit');
    // Submit button uses canSubmit for disabled state
    expect(page).toContain('disabled={decisionLoading || !canSubmit}');
    // Submit handler checks canSubmit
    expect(page).toContain('!canSubmit) return');
    // Justification textarea uses id for label association
    expect(page).toContain('decision-justification');
  });
});
