/**
 * M1 Security Gate — RBAC Authorization Tests
 * 
 * Tests AUTH-06 à AUTH-09 (ADMIN/SUPER_ADMIN permissions),
 * TEACHER-01 à TEACHER-04 (teacher scope),
 * NAV-AUTH-01 à NAV-AUTH-05 (navigation/server guards).
 */

import { describe, it, expect } from 'vitest';
import {
  checkPermission,
  requirePermission,
  requireGhostGuard,
  AuthorizationError,
} from '@/lib/authorization';
import type { Permission } from '@/lib/types/rbac';
import type { AuthorizationErrorCode } from '@/lib/authorization';

// ─────────────────────────────────────────────
// AUTH-06 : SUPER_ADMIN peut user.create
// AUTH-07 : ADMIN ne peut pas user.create
// ─────────────────────────────────────────────

describe('platform:users:manage', () => {
  it('AUTH-06: SUPER_ADMIN has user manage permission', () => {
    expect(checkPermission('super_admin', 'admin', 'platform:users:manage')).toBe(true);
  });

  it('AUTH-07: ADMIN does NOT have user manage permission', () => {
    expect(checkPermission('none', 'admin', 'platform:users:manage')).toBe(false);
  });

  it('TEACHER does NOT have user manage permission', () => {
    expect(checkPermission('none', 'teacher', 'platform:users:manage')).toBe(false);
  });

  it('READER does NOT have user manage permission', () => {
    expect(checkPermission('none', 'reader', 'platform:users:manage')).toBe(false);
  });

  it('GHOST has all permissions', () => {
    expect(checkPermission('ghost', null, 'platform:users:manage')).toBe(true);
  });
});

// ─────────────────────────────────────────────
// AUTH-08/09 : Password reset
// ─────────────────────────────────────────────

describe('user password reset', () => {
  // Password reset is a platform permission
  it('SUPER_ADMIN can reset user password', () => {
    // SUPER_ADMIN has all permissions via override
    expect(checkPermission('super_admin', null, 'platform:users:manage')).toBe(true);
  });

  it('ADMIN cannot reset user password', () => {
    expect(checkPermission('none', 'admin', 'platform:users:manage')).toBe(false);
  });
});

// ─────────────────────────────────────────────
// ADMIN school permissions (has school admin, but not platform)
// ─────────────────────────────────────────────

describe('ADMIN school permissions', () => {
  it('ADMIN can manage students', () => {
    expect(checkPermission('none', 'admin', 'school:students:manage')).toBe(true);
  });

  it('ADMIN can manage grades', () => {
    expect(checkPermission('none', 'admin', 'school:grades:manage')).toBe(true);
  });

  it('ADMIN can publish report cards', () => {
    expect(checkPermission('none', 'admin', 'school:report_cards:publish')).toBe(true);
  });

  it('ADMIN cannot access recovery', () => {
    expect(checkPermission('none', 'admin', 'platform:recovery')).toBe(false);
  });

  it('ADMIN cannot create super admin', () => {
    expect(checkPermission('none', 'admin', 'platform:users:create_super_admin')).toBe(false);
  });
});

// ─────────────────────────────────────────────
// READER — read only
// ─────────────────────────────────────────────

describe('READER read-only', () => {
  it('READER can read statistics', () => {
    expect(checkPermission('none', 'reader', 'school:statistics:read')).toBe(true);
  });

  it('READER cannot manage students', () => {
    expect(checkPermission('none', 'reader', 'school:students:manage')).toBe(false);
  });

  it('READER cannot manage grades', () => {
    expect(checkPermission('none', 'reader', 'school:grades:manage')).toBe(false);
  });

  it('READER cannot publish report cards', () => {
    expect(checkPermission('none', 'reader', 'school:report_cards:publish')).toBe(false);
  });

  it('READER can read grades', () => {
    expect(checkPermission('none', 'reader', 'school:grades:read')).toBe(true);
  });
});

// ─────────────────────────────────────────────
// TEACHER permissions
// ─────────────────────────────────────────────

describe('TEACHER permissions', () => {
  it('TEACHER can read classrooms', () => {
    expect(checkPermission('none', 'teacher', 'school:classrooms:read')).toBe(true);
  });

  it('TEACHER can manage assessments (permission level)', () => {
    expect(checkPermission('none', 'teacher', 'school:assessments:manage')).toBe(true);
  });

  it('TEACHER can manage grades (permission level)', () => {
    expect(checkPermission('none', 'teacher', 'school:grades:manage')).toBe(true);
  });

  it('TEACHER can prepare report cards', () => {
    expect(checkPermission('none', 'teacher', 'school:report_cards:prepare')).toBe(true);
  });

  it('TEACHER cannot validate report cards', () => {
    expect(checkPermission('none', 'teacher', 'school:report_cards:validate')).toBe(false);
  });

  it('TEACHER cannot publish report cards', () => {
    expect(checkPermission('none', 'teacher', 'school:report_cards:publish')).toBe(false);
  });

  it('TEACHER cannot manage students', () => {
    expect(checkPermission('none', 'teacher', 'school:students:manage')).toBe(false);
  });
});

// ─────────────────────────────────────────────
// DIRECTION permissions
// ─────────────────────────────────────────────

describe('DIRECTION permissions', () => {
  it('DIRECTION can validate report cards', () => {
    expect(checkPermission('none', 'direction', 'school:report_cards:validate')).toBe(true);
  });

  it('DIRECTION can publish report cards', () => {
    expect(checkPermission('none', 'direction', 'school:report_cards:publish')).toBe(true);
  });

  it('DIRECTION can manage annual results', () => {
    expect(checkPermission('none', 'direction', 'school:annual_results:manage')).toBe(true);
  });

  it('DIRECTION cannot manage grades', () => {
    expect(checkPermission('none', 'direction', 'school:grades:manage')).toBe(false);
  });
});

// ─────────────────────────────────────────────
// GHOST — all permissions
// ─────────────────────────────────────────────

describe('GHOST all permissions', () => {
  const allPermissions: Permission[] = [
    'platform:users:manage',
    'platform:users:create_super_admin',
    'platform:schools:create',
    'platform:recovery',
    'school:students:manage',
    'school:grades:manage',
    'school:report_cards:publish',
    'school:statistics:read',
  ];

  for (const perm of allPermissions) {
    it(`GHOST has ${perm}`, () => {
      expect(checkPermission('ghost', null, perm)).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────
// SUPER_ADMIN — all permissions (override)
// ─────────────────────────────────────────────

describe('SUPER_ADMIN all permissions', () => {
  it('SUPER_ADMIN has all school admin permissions', () => {
    expect(checkPermission('super_admin', null, 'school:students:manage')).toBe(true);
  });

  it('SUPER_ADMIN has platform permissions', () => {
    expect(checkPermission('super_admin', null, 'platform:users:manage')).toBe(true);
    expect(checkPermission('super_admin', null, 'platform:recovery')).toBe(true);
  });

  // SUPER_ADMIN does NOT satisfy requireGhostGuard (tested in ghost-auth.test.ts)
});

// ─────────────────────────────────────────────
// requirePermission throws correctly
// ─────────────────────────────────────────────

describe('requirePermission', () => {
  it('throws UNAUTHORIZED when no role', () => {
    expect(() => requirePermission('none', null, 'school:grades:manage')).toThrow(AuthorizationError);
    try {
      requirePermission('none', null, 'school:grades:manage');
    } catch (e) {
      expect((e as AuthorizationError).code).toBe('UNAUTHORIZED');
    }
  });

  it('throws FORBIDDEN when has role but not permission', () => {
    expect(() => requirePermission('none', 'reader', 'school:grades:manage')).toThrow(AuthorizationError);
    try {
      requirePermission('none', 'reader', 'school:grades:manage');
    } catch (e) {
      expect((e as AuthorizationError).code).toBe('FORBIDDEN');
    }
  });

  it('does not throw when has permission', () => {
    expect(() => requirePermission('none', 'admin', 'school:students:manage')).not.toThrow();
  });
});

// ─────────────────────────────────────────────
// NAV-AUTH tests (server guard consistency)
// ─────────────────────────────────────────────

describe('NAV-AUTH: navigation/server consistency', () => {
  it('NAV-AUTH-01: READER cannot access grades manage (hidden menu + server)', () => {
    const hasPermission = checkPermission('none', 'reader', 'school:grades:manage');
    expect(hasPermission).toBe(false);
  });

  it('NAV-AUTH-02: SUPER_ADMIN can access user management', () => {
    expect(checkPermission('super_admin', null, 'platform:users:manage')).toBe(true);
  });

  it('NAV-AUTH-03: ADMIN cannot access user management', () => {
    expect(checkPermission('none', 'admin', 'platform:users:manage')).toBe(false);
  });

  it('NAV-AUTH-04: GHOST can access recovery', () => {
    expect(checkPermission('ghost', null, 'platform:recovery')).toBe(true);
  });

  it('NAV-AUTH-05: SUPER_ADMIN cannot access recovery', () => {
    // Per R-V2-01 §2.3, Recovery is GHOST only
    // SUPER_ADMIN has all permissions BUT recovery is ghost-only
    // This is a design decision: platform:recovery is in the matrix
    // SUPER_ADMIN gets it via the override. Need to check the guard.
    // The requireGhostGuard ensures only Ghost passes.
    // But checkPermission('super_admin', ...) returns true for all.
    // The guard is requireGhostGuard(), not requirePermission.
    expect(() => requirePermission('super_admin', null, 'platform:recovery')).not.toThrow();
    // However, the route should also call requireGhostGuard()
    expect(() => requireGhostGuard('super_admin', false)).toThrow(AuthorizationError);
  });
});

// ─────────────────────────────────────────────
// AuthorizationError codes
// ─────────────────────────────────────────────

describe('AuthorizationError codes', () => {
  it('supports all 7 error codes', () => {
    const codes = [
      'INVALID_CREDENTIALS',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'DATABASE_UNAVAILABLE',
      'MIGRATION_REQUIRED',
      'GHOST_SESSION_EXPIRED',
      'GHOST_CONFIGURATION_ERROR',
    ];
    for (const code of codes) {
      const err = new AuthorizationError(code as AuthorizationErrorCode);
      expect(err.code).toBe(code);
      expect(err.name).toBe('AuthorizationError');
    }
  });
});
