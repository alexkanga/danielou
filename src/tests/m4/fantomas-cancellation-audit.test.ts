/**
 * M4 Fantomas Cancellation Compatibility Audit — FAN-AUD-01..06
 *
 * Cross-cutting audit that Fantomas/Ghost can perform the full
 * cancellation flow: UI visibility → API authorization → Service execution → Audit trail.
 *
 * All tests are source-invariant (string analysis).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { hasSuperAdminCapabilities, requireSuperAdminCapability, isFantomas, AuthorizationError } from '@/lib/authorization';

const authorization = readFileSync(
  resolve(__dirname, '../../lib/authorization.ts'),
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

const decisionService = readFileSync(
  resolve(__dirname, '../../lib/services/results/annual-decision.service.ts'),
  'utf-8',
);

describe('Fantomas Cancellation Compatibility Audit (FAN-AUD-01..06)', () => {
  // ─── Full-flow Fantomas trace ───

  it('FAN-AUD-01: Navigation provider exposes hasSuperAdminCapabilities as true for ghost', () => {
    // The provider must compute hasSuperAdminCapabilities including ghost
    expect(navProvider).toContain("hasSuperAdminCapabilities: platformRole === 'super_admin' || platformRole === 'ghost'");
    // The context value interface must declare it
    expect(navProvider).toContain('hasSuperAdminCapabilities: boolean');
  });

  it('FAN-AUD-02: UI cancel button visible when hasSuperAdminCapabilities=true (ghost path)', () => {
    // Page must destructure hasSuperAdminCapabilities
    expect(page).toContain('{ hasSuperAdminCapabilities } = useNavigation()');
    // The cancel button rendering is guarded by hasSuperAdminCapabilities
    expect(page).toContain('hasSuperAdminCapabilities && (');
  });

  it('FAN-AUD-03: DELETE route allows ghost through requireSuperAdminCapability', () => {
    // Route must use requireSuperAdminCapability (not requireSuperAdminGuard)
    expect(route).toContain('requireSuperAdminCapability(');
    expect(route).not.toContain('requireSuperAdminGuard(');
    // Runtime: ghost must not throw
    expect(() => requireSuperAdminCapability('ghost')).not.toThrow();
  });

  it('FAN-AUD-04: Route passes isGhost to service for ghost-safe audit actor derivation', () => {
    // The DELETE route constructs the actor object including isGhost from session
    expect(route).toContain('isGhost: session.user.isGhost');
    // The service uses sessionToAuditActor to derive audit fields
    const cancelStart = decisionService.indexOf('cancelCouncilDecision');
    const cancelCode = decisionService.slice(cancelStart);
    expect(cancelCode).toContain('sessionToAuditActor(');
  });

  it('FAN-AUD-05: hasSuperAdminCapabilities is NOT the same as requireSuperAdminGuard', () => {
    // requireSuperAdminGuard checks strictly for super_admin (blocks ghost)
    expect(authorization).toContain("platformRole !== 'super_admin'");
    // hasSuperAdminCapabilities checks for super_admin OR ghost
    expect(authorization).toContain("platformRole === 'super_admin' || platformRole === 'ghost'");
    // These are distinct functions with distinct semantics
    expect(authorization).toContain('requireSuperAdminGuard');
    expect(authorization).toContain('requireSuperAdminCapability');
  });

  it('FAN-AUD-06: isFantomas is narrow — ghost-only, not super_admin', () => {
    // Runtime verification
    expect(isFantomas('ghost')).toBe(true);
    expect(isFantomas('super_admin')).toBe(false);
    // Source: must check === 'ghost', not the broader capability
    expect(authorization).toContain("return platformRole === 'ghost'");
  });
});
