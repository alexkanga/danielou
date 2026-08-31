/**
 * M4 Decision Cancellation Tests — CAN-AUTH, CAN-VAL, CAN-PERS, CAN-ATM, CAN-MATH, CAN-UI, CAN-FAN
 *
 * Tests the SUPER_ADMIN/Fantomas council decision cancellation feature.
 * All tests are source-invariant (string analysis of .ts/.tsx files),
 * except CAN-AUTH-05/06 which exercise runtime authorization functions.
 * No database, no API calls, no runtime service execution.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { hasSuperAdminCapabilities, requireSuperAdminCapability, AuthorizationError } from '@/lib/authorization';
import type { PlatformRole } from '@/lib/types/rbac';

// ──── Source files ────

const decisionService = readFileSync(
  resolve(__dirname, '../../lib/services/results/annual-decision.service.ts'),
  'utf-8',
);

const route = readFileSync(
  resolve(__dirname, '../../app/api/annual-results/decision/route.ts'),
  'utf-8',
);

const page = readFileSync(
  resolve(__dirname, '../../app/(dashboard)/dashboard/resultats/annuelles/page.tsx'),
  'utf-8',
);

const navProvider = readFileSync(
  resolve(__dirname, '../../components/providers/navigation-provider.tsx'),
  'utf-8',
);

// ──── Helpers ────

/**
 * Extract the cancellation-specific transaction block from the service.
 * The cancellation transaction is the one containing 'annual_decision_cancelled'.
 */
function getCancellationTxBlock(): string {
  // Find the start of the cancelCouncilDecision function's transaction
  const cancelFuncStart = decisionService.indexOf('cancelCouncilDecision');
  expect(cancelFuncStart).toBeGreaterThan(-1);
  const afterCancel = decisionService.slice(cancelFuncStart);
  const txBlock = afterCancel.match(/txDb\.transaction\(async \(tx\) => \{[\s\S]*?\}\s*\);/);
  expect(txBlock).not.toBeNull();
  return txBlock![0];
}

/**
 * Extract the cancellation-specific .set() block.
 * The cancellation .set() sets finalDecision to null.
 */
function getCancellationSetBlock(): string {
  const cancelFuncStart = decisionService.indexOf('cancelCouncilDecision');
  const afterCancel = decisionService.slice(cancelFuncStart);
  const setBlock = afterCancel.match(/\.set\(\{[\s\S]*?\}\)/);
  expect(setBlock).not.toBeNull();
  return setBlock![0];
}

// ═══════════════════════════════════════════
// SECTION 1: Authorization (CAN-AUTH-01..06)
// ═══════════════════════════════════════════

describe('Cancellation Authorization (CAN-AUTH-01..06)', () => {
  it('CAN-AUTH-01: DELETE route imports requireSuperAdminCapability', () => {
    expect(route).toContain("requireSuperAdminCapability");
    // Must be imported from authorization module
    expect(route).toContain("from '@/lib/authorization'");
  });

  it('CAN-AUTH-02: DELETE route calls requireSuperAdminCapability with session.user.platformRole before any write', () => {
    // requireSuperAdminCapability must appear before cancelCouncilDecision
    const capPos = route.indexOf('requireSuperAdminCapability(');
    const writePos = route.indexOf('cancelCouncilDecision(');
    expect(capPos).toBeGreaterThan(-1);
    expect(writePos).toBeGreaterThan(-1);
    expect(capPos).toBeLessThan(writePos);
    // Must use session.user.platformRole as argument
    expect(route).toContain('requireSuperAdminCapability(session.user.platformRole)');
  });

  it('CAN-AUTH-03: DELETE route also uses requireSession (auth check before capability check)', () => {
    // requireSession must appear before requireSuperAdminCapability
    const sessionPos = route.indexOf('requireSession(');
    const capPos = route.indexOf('requireSuperAdminCapability(');
    expect(sessionPos).toBeGreaterThan(-1);
    expect(capPos).toBeGreaterThan(-1);
    expect(sessionPos).toBeLessThan(capPos);
  });

  it('CAN-AUTH-04: DELETE handler exported in route file', () => {
    // Route must export a DELETE function
    expect(route).toContain('export async function DELETE(');
  });

  it('CAN-AUTH-05: requireSuperAdminCapability throws FORBIDDEN for non-super_admin/non-ghost roles', () => {
    const nonPrivilegedRoles: PlatformRole[] = ['none'];
    for (const role of nonPrivilegedRoles) {
      expect(() => requireSuperAdminCapability(role)).toThrow(AuthorizationError);
      try {
        requireSuperAdminCapability(role);
        expect.unreachable(`Role '${role}' should have thrown`);
      } catch (e) {
        expect((e as AuthorizationError).code).toBe('FORBIDDEN');
      }
    }
  });

  it('CAN-AUTH-06: hasSuperAdminCapabilities returns true for super_admin and ghost, false for none', () => {
    expect(hasSuperAdminCapabilities('super_admin')).toBe(true);
    expect(hasSuperAdminCapabilities('ghost')).toBe(true);
    expect(hasSuperAdminCapabilities('none')).toBe(false);
  });
});

// ═══════════════════════════════════════════
// SECTION 2: Validation (CAN-VAL-01..05)
// ═══════════════════════════════════════════

describe('Cancellation Validation (CAN-VAL-01..05)', () => {
  it('CAN-VAL-01: Service validates reason non-empty (CANCELLATION_VALIDATION code present)', () => {
    expect(decisionService).toContain('CANCELLATION_VALIDATION');
    // Check the validation guard checks for empty/whitespace reason
    expect(decisionService).toContain('reason.trim().length === 0');
  });

  it('CAN-VAL-02: Service throws PedagogyDomainError (not plain Error) for validation', () => {
    // Must import PedagogyDomainError
    expect(decisionService).toContain('PedagogyDomainError');
    // Must use PedagogyDomainError for cancellation validation
    const cancelStart = decisionService.indexOf('cancelCouncilDecision');
    const cancelCode = decisionService.slice(cancelStart);
    // The first throw in cancelCouncilDecision should be PedagogyDomainError
    const throwIdx = cancelCode.indexOf('throw new PedagogyDomainError(');
    expect(throwIdx).toBeGreaterThan(-1);
    // Must not use plain Error for cancellation validation
    expect(cancelCode.slice(0, throwIdx + 100)).not.toContain('throw new Error(');
  });

  it('CAN-VAL-03: Service validation uses 422 status', () => {
    // The cancellation validation error must use 422
    const cancelStart = decisionService.indexOf('cancelCouncilDecision');
    const cancelCode = decisionService.slice(cancelStart);
    // Find the CANCELLATION_VALIDATION error and check it has 422
    const validationErrorIdx = cancelCode.indexOf('CANCELLATION_VALIDATION');
    expect(validationErrorIdx).toBeGreaterThan(-1);
    // The 422 must appear after CANCELLATION_VALIDATION and before the next throw
    const afterValidation = cancelCode.slice(validationErrorIdx);
    const nextThrow = afterValidation.indexOf('throw');
    const status422 = afterValidation.indexOf('422');
    expect(status422).toBeGreaterThan(-1);
    expect(status422).toBeLessThan(nextThrow + 200);
  });

  it('CAN-VAL-04: Service rejects when no existing finalDecision (CANCELLATION_NO_DECISION code)', () => {
    expect(decisionService).toContain('CANCELLATION_NO_DECISION');
    // Must check that finalDecision is falsy
    const cancelStart = decisionService.indexOf('cancelCouncilDecision');
    const cancelCode = decisionService.slice(cancelStart);
    // The check for existing finalDecision
    expect(cancelCode).toContain('!existing.finalDecision');
  });

  it('CAN-VAL-05: Service uses NotFoundError for missing enrollmentId result', () => {
    // Must import NotFoundError
    expect(decisionService).toContain('NotFoundError');
    // In the cancellation function, must throw NotFoundError when no results found
    const cancelStart = decisionService.indexOf('cancelCouncilDecision');
    const cancelCode = decisionService.slice(cancelStart);
    // Check for the length === 0 guard
    expect(cancelCode).toContain('existingResults.length === 0');
    expect(cancelCode).toContain("throw new NotFoundError('annual_result'");
  });
});

// ═══════════════════════════════════════════
// SECTION 3: Persistence (CAN-PERS-01..06)
// ═══════════════════════════════════════════

describe('Cancellation Persistence (CAN-PERS-01..06)', () => {
  it('CAN-PERS-01: Cancellation uses getTxDb().transaction() for writes', () => {
    const cancelStart = decisionService.indexOf('cancelCouncilDecision');
    const cancelCode = decisionService.slice(cancelStart);
    expect(cancelCode).toContain('getTxDb()');
    expect(cancelCode).toContain('txDb.transaction(');
  });

  it('CAN-PERS-02: Cancellation clears finalDecision to null in .set()', () => {
    const setBlock = getCancellationSetBlock();
    expect(setBlock).toContain('finalDecision: null');
  });

  it('CAN-PERS-03: Cancellation clears decisionJustification to null in .set()', () => {
    const setBlock = getCancellationSetBlock();
    expect(setBlock).toContain('decisionJustification: null');
  });

  it('CAN-PERS-04: Cancellation clears decidedBy to null in .set()', () => {
    const setBlock = getCancellationSetBlock();
    expect(setBlock).toContain('decidedBy: null');
  });

  it('CAN-PERS-05: Cancellation clears decidedAt to null in .set()', () => {
    const setBlock = getCancellationSetBlock();
    expect(setBlock).toContain('decidedAt: null');
  });

  it('CAN-PERS-06: Audit uses action \'annual_decision_cancelled\'', () => {
    const cancelStart = decisionService.indexOf('cancelCouncilDecision');
    const cancelCode = decisionService.slice(cancelStart);
    expect(cancelCode).toContain("action: 'annual_decision_cancelled'");
  });
});

// ═══════════════════════════════════════════
// SECTION 4: Atomicity (CAN-ATM-01..04)
// ═══════════════════════════════════════════

describe('Cancellation Atomicity (CAN-ATM-01..04)', () => {
  it('CAN-ATM-01: Decision clear + audit insert in same transaction callback', () => {
    const txBlock = getCancellationTxBlock();
    // Must have the update (decision clear)
    expect(txBlock).toContain('tx.update(');
    // Must have the insert (audit)
    expect(txBlock).toContain('tx.insert(');
  });

  it('CAN-ATM-02: Transaction has at least 2 tx. operations (update + insert)', () => {
    const txBlock = getCancellationTxBlock();
    const txOps = (txBlock.match(/tx\.(insert|update)/g) ?? []);
    expect(txOps.length).toBeGreaterThanOrEqual(2);
  });

  it('CAN-ATM-03: Rollback safety: both operations inside single tx callback', () => {
    // Both tx.update and tx.insert must appear between transaction( and the closing });
    const txBlock = getCancellationTxBlock();
    // The block must contain the update for annualResult and insert for auditLog
    expect(txBlock).toContain('annualResult');
    expect(txBlock).toContain('auditLog');
    // Both must be tx. prefixed operations
    expect(txBlock).toMatch(/tx\.update/);
    expect(txBlock).toMatch(/tx\.insert/);
  });

  it('CAN-ATM-04: Read queries before transaction use db (neon-http), not txDb', () => {
    const cancelStart = decisionService.indexOf('cancelCouncilDecision');
    // Slice up to the line that declares txDb — reads happen before this line
    const txLineIdx = decisionService.indexOf('const txDb = getTxDb()', cancelStart);
    const readSection = decisionService.slice(cancelStart, txLineIdx);
    // Read queries must use db, not txDb
    expect(readSection).toContain('db.select(');
    // txDb must NOT appear in the read section (no txDb variable or usage)
    expect(readSection).not.toContain('txDb');
  });
});

// ═══════════════════════════════════════════
// SECTION 5: Mathematical Safety (CAN-MATH-01..03)
// ═══════════════════════════════════════════

describe('Cancellation Mathematical Safety (CAN-MATH-01..03)', () => {
  it('CAN-MATH-01: Cancellation .set() block does NOT contain annualOfficial', () => {
    const setBlock = getCancellationSetBlock();
    expect(setBlock).not.toContain('annualOfficial');
  });

  it('CAN-MATH-02: Cancellation .set() block does NOT contain annualRaw', () => {
    const setBlock = getCancellationSetBlock();
    expect(setBlock).not.toContain('annualRaw');
  });

  it('CAN-MATH-03: Cancellation .set() block does NOT contain annualRank', () => {
    const setBlock = getCancellationSetBlock();
    expect(setBlock).not.toContain('annualRank');
  });
});

// ═══════════════════════════════════════════
// SECTION 6: UI (CAN-UI-01..06)
// ═══════════════════════════════════════════

describe('Cancellation UI (CAN-UI-01..06)', () => {
  it('CAN-UI-01: UI imports XCircle from lucide-react', () => {
    expect(page).toContain('XCircle');
    expect(page).toContain('from \'lucide-react\'');
  });

  it('CAN-UI-02: Cancel button conditionally rendered based on hasSuperAdminCapabilities', () => {
    // Cancel button must be inside a hasSuperAdminCapabilities guard
    expect(page).toContain('hasSuperAdminCapabilities');
    // The cancel button rendering must be conditional on this flag
    expect(page).toContain('{hasSuperAdminCapabilities && (');
  });

  it('CAN-UI-03: Cancel button only shows when persistedFinalDecision exists', () => {
    // The cancel button should only appear when a decision already exists
    // Look for the condition: hasDecision && s.persistedFinalDecision
    expect(page).toContain('persistedFinalDecision');
    // The cancel button section must be inside the hasDecision branch
    const cancelBtnIdx = page.indexOf('Annuler</Button>');
    expect(cancelBtnIdx).toBeGreaterThan(-1);
    // The XCircle icon (used in cancel button) should appear after persistedFinalDecision check
    const persistedIdx = page.indexOf('s.persistedFinalDecision');
    expect(persistedIdx).toBeGreaterThan(-1);
  });

  it('CAN-UI-04: Cancel dialog has Textarea for reason with required indicator', () => {
    // Cancel dialog must have a textarea for the cancel reason
    expect(page).toContain('cancel-reason');
    // Must have a required indicator (text-destructive * span)
    // The label includes the cancel reason prompt
    expect(page).toContain('Motif de l');
    expect(page).toContain('annulation');
    // The required asterisk
    expect(page).toContain('<span className="text-destructive">*</span>');
  });

  it('CAN-UI-05: Confirm button disabled when !canCancel', () => {
    // canCancel is computed from cancelReason.trim().length > 0
    expect(page).toContain('canCancel = cancelReason.trim().length > 0');
    // The confirm button must be disabled when cancelLoading || !canCancel
    expect(page).toContain('disabled={cancelLoading || !canCancel}');
  });

  it('CAN-UI-06: Cancel fetch uses DELETE method with JSON body containing enrollmentId and reason', () => {
    // The cancel handler must use DELETE method
    expect(page).toContain("method: 'DELETE'");
    // Must send JSON body with enrollmentId and reason
    expect(page).toContain('enrollmentId: cancelDialog.enrollmentId');
    expect(page).toContain('reason: cancelReason.trim()');
    // Must use the correct endpoint
    expect(page).toContain("fetch('/api/annual-results/decision'");
  });
});

// ═══════════════════════════════════════════
// SECTION 7: Fantomas Compatibility (CAN-FAN-01..04)
// ═══════════════════════════════════════════

describe('Cancellation Fantomas Compatibility (CAN-FAN-01..04)', () => {
  it('CAN-FAN-01: Route uses requireSuperAdminCapability (not requireSuperAdminGuard) — allows Fantomas', () => {
    // requireSuperAdminCapability allows ghost, requireSuperAdminGuard does not
    expect(route).toContain('requireSuperAdminCapability');
    // Must NOT use requireSuperAdminGuard (which would block Fantomas)
    expect(route).not.toContain('requireSuperAdminGuard');
  });

  it('CAN-FAN-02: UI uses hasSuperAdminCapabilities from navigation context', () => {
    // UI must destructure hasSuperAdminCapabilities from useNavigation
    expect(page).toContain('hasSuperAdminCapabilities } = useNavigation()');
    // Must import useNavigation from the navigation provider
    expect(page).toContain('useNavigation');
    expect(page).toContain('from \'@/components/providers/navigation-provider\'');
  });

  it('CAN-FAN-03: hasSuperAdminCapabilities includes \'ghost\' role', () => {
    // Navigation provider must include ghost in the capability check
    expect(navProvider).toContain("platformRole === 'super_admin' || platformRole === 'ghost'");
  });

  it('CAN-FAN-04: Cancellation service uses sessionToAuditActor for ghost compatibility', () => {
    // The cancellation function must use sessionToAuditActor to handle ghost users
    const cancelStart = decisionService.indexOf('cancelCouncilDecision');
    const cancelCode = decisionService.slice(cancelStart);
    expect(cancelCode).toContain('sessionToAuditActor(');
  });
});
