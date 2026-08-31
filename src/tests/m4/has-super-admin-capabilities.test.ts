/**
 * M4 hasSuperAdminCapabilities Helper Tests — HSA-01..06
 *
 * Tests the hasSuperAdminCapabilities, requireSuperAdminCapability,
 * and isFantomas helper functions in authorization.ts.
 *
 * HSA-01..02: hasSuperAdminCapabilities boolean matrix
 * HSA-03..04: requireSuperAdminCapability throw contract
 * HSA-05..06: isFantomas narrow identity check
 */

import { describe, it, expect } from 'vitest';
import {
  hasSuperAdminCapabilities,
  requireSuperAdminCapability,
  isFantomas,
  AuthorizationError,
} from '@/lib/authorization';
import type { PlatformRole } from '@/lib/types/rbac';

describe('hasSuperAdminCapabilities (HSA-01..02)', () => {
  const allRoles: PlatformRole[] = ['super_admin', 'ghost', 'none'];
  const privilegedRoles: PlatformRole[] = ['super_admin', 'ghost'];
  const ordinaryRoles: PlatformRole[] = ['none'];

  it('HSA-01: returns true for super_admin and ghost', () => {
    for (const role of privilegedRoles) {
      expect(hasSuperAdminCapabilities(role)).toBe(true);
    }
  });

  it('HSA-02: returns false for none (only valid PlatformRole not privileged)', () => {
    for (const role of ordinaryRoles) {
      expect(hasSuperAdminCapabilities(role)).toBe(false);
    }
  });
});

describe('requireSuperAdminCapability (HSA-03..04)', () => {
  it('HSA-03: does NOT throw for super_admin and ghost', () => {
    expect(() => requireSuperAdminCapability('super_admin')).not.toThrow();
    expect(() => requireSuperAdminCapability('ghost')).not.toThrow();
  });

  it('HSA-04: throws AuthorizationError(FORBIDDEN) for none role', () => {
    const blockedRoles: PlatformRole[] = ['none'];
    for (const role of blockedRoles) {
      try {
        requireSuperAdminCapability(role);
        expect.unreachable(`Role '${role}' should have thrown`);
      } catch (e) {
        expect(e).toBeInstanceOf(AuthorizationError);
        expect((e as AuthorizationError).code).toBe('FORBIDDEN');
      }
    }
  });
});

describe('isFantomas (HSA-05..06)', () => {
  it('HSA-05: returns true ONLY for ghost', () => {
    expect(isFantomas('ghost')).toBe(true);
  });

  it('HSA-06: returns false for super_admin and none', () => {
    const nonGhostRoles: PlatformRole[] = ['super_admin', 'none'];
    for (const role of nonGhostRoles) {
      expect(isFantomas(role)).toBe(false);
    }
  });
});
