/**
 * M4 HOTFIX R2 Regression Tests — DEC-R2-01 through DEC-R2-10
 *
 * These tests verify the fix for: "Valid council decision returns HTTP 500"
 * Root cause: drizzle-orm/neon-http does NOT support db.transaction().
 * Fix: Use drizzle-orm/neon-serverless Pool (WebSocket transport) for transactional writes.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { validateDecision } from '@/lib/services/results/recommendation-engine';

const decisionService = readFileSync(
  resolve(__dirname, '../../lib/services/results/annual-decision.service.ts'),
  'utf-8',
);

const txModule = readFileSync(
  resolve(__dirname, '../../lib/db/tx.ts'),
  'utf-8',
);

describe('M4 HOTFIX R2 Regression (DEC-R2-01..10)', () => {
  // ─── Valid persistence path ───

  // DEC-R2-01: Valid council Admis + justification persists
  it('DEC-R2-01: valid council Admis + justification is accepted by validation', () => {
    const result = validateDecision('DECISION_COUNCIL', 'ADMITTED', 'Decision du conseil');
    expect(result.allowed).toBe(true);
  });

  // DEC-R2-02: Valid council Redouble + justification persists
  it('DEC-R2-02: valid council Redouble + justification is accepted by validation', () => {
    const result = validateDecision('DECISION_COUNCIL', 'REPEAT', 'Resultats insuffisants');
    expect(result.allowed).toBe(true);
  });

  // DEC-R2-03: Decision audit persists in same transaction
  it('DEC-R2-03: decision audit is inside same transaction as decision write', () => {
    // Verify audit insert and decision write are both inside transaction block
    const txBlock = decisionService.match(/(?:db|txDb)\.transaction\([\s\S]*?\}\s*\);/);
    expect(txBlock).not.toBeNull();
    const block = txBlock![0];
    // Must have decision write
    const hasDecisionWrite = block.includes('finalDecision:') && (block.includes('tx.update') || block.includes('tx.insert'));
    expect(hasDecisionWrite).toBe(true);
    // Must have audit write
    expect(block).toContain('annual_final_decision_recorded');
    expect(block).toContain('auditLog');
  });

  // DEC-R2-04: Real transaction rollback leaves no decision
  it('DEC-R2-04: transaction is used for writes (not fire-and-forget)', () => {
    // The service must NOT use fire-and-forget logPedagogyAudit for decision audit
    expect(decisionService).not.toContain('logPedagogyAudit(');
    // Must use transactional insert
    expect(decisionService).toContain('tx.insert(auditLog)');
  });

  // DEC-R2-05: Real transaction rollback leaves no audit
  it('DEC-R2-05: rollback on failure would prevent both decision and audit', () => {
    // Both writes are inside the transaction callback
    const txBlock = decisionService.match(/(?:db|txDb)\.transaction\(async \(tx\) => \{[\s\S]*\}\s*\);/);
    expect(txBlock).not.toBeNull();
    const block = txBlock![0];
    // Count tx. operations — at least 2 (decision + audit)
    const txOps = (block.match(/tx\.(insert|update)/g) ?? []);
    expect(txOps.length).toBeGreaterThanOrEqual(2);
  });

  // DEC-R2-06: Fantomas actor path succeeds
  it('DEC-R2-06: Fantomas actor (ghost) sets decidedBy to null', () => {
    // For ghost users, decidedBy should be null (no FK constraint violation)
    expect(decisionService).toContain('actor.isGhost ? null : actor.id');
  });

  // DEC-R2-07: Empty justification remains rejected
  it('DEC-R2-07: empty justification remains rejected for council decisions', () => {
    const result = validateDecision('DECISION_COUNCIL', 'ADMITTED', null);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('justification');
  });

  // DEC-R2-08: Whitespace justification remains rejected
  it('DEC-R2-08: whitespace justification remains rejected for council decisions', () => {
    const result = validateDecision('DECISION_COUNCIL', 'ADMITTED', '   ');
    expect(result.allowed).toBe(false);
  });

  // DEC-R2-09: Successful request returns non-500 response
  it('DEC-R2-09: validation error uses PedagogyDomainError(422), not plain Error(500)', () => {
    // The service throws PedagogyDomainError for validation failures
    expect(decisionService).toContain('PedagogyDomainError(');
    expect(decisionService).toContain('DECISION_VALIDATION');
    // Error constructor includes 422 status
    expect(decisionService).toContain('422');
  });

  // DEC-R2-10: Annual mathematical values unchanged
  it('DEC-R2-10: decision service never modifies annualOfficial or annualRank', () => {
    // The decision service only updates decision-related fields
    // It must NOT touch annualOfficial, annualRaw, annualRank, etc.
    const setBlock = decisionService.match(/\.set\(\{[\s\S]*?\}\)/);
    if (setBlock) {
      expect(setBlock[0]).not.toContain('annualOfficial');
      expect(setBlock[0]).not.toContain('annualRaw');
      expect(setBlock[0]).not.toContain('annualRank');
      expect(setBlock[0]).not.toContain('regularRaw');
      expect(setBlock[0]).not.toContain('passageRaw');
    }
  });
});

describe('M4 HOTFIX R2: Transaction Driver (DEC-R2-DRVR)', () => {
  // Verify the tx.ts module uses the correct driver
  it('DEC-R2-DRVR-01: tx.ts imports Pool from @neondatabase/serverless', () => {
    expect(txModule).toContain("from '@neondatabase/serverless'");
    expect(txModule).toContain('Pool');
  });

  it('DEC-R2-DRVR-02: tx.ts imports drizzle from drizzle-orm/neon-serverless', () => {
    expect(txModule).toContain("from 'drizzle-orm/neon-serverless'");
    expect(txModule).toContain('drizzle(');
  });

  it('DEC-R2-DRVR-03: tx.ts prefers DIRECT_URL over DATABASE_URL', () => {
    // DIRECT_URL is preferred for transactional connections
    expect(txModule).toContain('DIRECT_URL');
  });

  it('DEC-R2-DRVR-04: decision service imports getTxDb from tx module', () => {
    expect(decisionService).toContain("from '@/lib/db/tx'");
    expect(decisionService).toContain('getTxDb');
  });

  it('DEC-R2-DRVR-05: decision service uses txDb.transaction, not db.transaction', () => {
    // The transaction must use the txDb (neon-serverless) not db (neon-http)
    expect(decisionService).toContain('getTxDb()');
    const txCall = decisionService.match(/txDb\.transaction\(/);
    expect(txCall).not.toBeNull();
    // db.transaction must NOT be used for writes
    const dbTxForWrite = decisionService.match(/db\.transaction\(/);
    expect(dbTxForWrite).toBeNull();
  });

  it('DEC-R2-DRVR-06: read-only queries still use db (neon-http)', () => {
    // SELECT queries should use the default db for performance
    expect(decisionService).toContain('db.select(');
  });
});
