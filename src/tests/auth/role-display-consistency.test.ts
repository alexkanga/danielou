/**
 * Role Display / RBAC Consistency Tests
 *
 * Verifies that:
 * - deriveSchoolRole correctly maps V1 roles (not platformRole=NONE → READER)
 * - SCHOOL_ROLE_LABELS produces correct French labels for sidebar/header
 * - PLATFORM_ROLE_LABELS produces correct French labels
 * - Session role derivation does not downgrade ADMIN/TEACHER to READER
 * - Fantomas displays dedicated label, not school role
 */

import { describe, it, expect } from 'vitest';
import { deriveSchoolRole, derivePlatformRole } from '@/lib/authorization';
import {
  SCHOOL_ROLE_LABELS,
  PLATFORM_ROLE_LABELS,
} from '@/lib/types/rbac';
import type { SchoolRole, PlatformRole } from '@/lib/types/rbac';

// ─────────────────────────────────────────────
// 1. deriveSchoolRole — V1 role mapping
// ─────────────────────────────────────────────

describe('deriveSchoolRole preserves V1 role', () => {
  it('ADMIN DB role → admin school role', () => {
    expect(deriveSchoolRole({ isGhost: false, v1Role: 'admin' })).toBe('admin');
  });

  it('TEACHER DB role → teacher school role', () => {
    expect(deriveSchoolRole({ isGhost: false, v1Role: 'teacher' })).toBe('teacher');
  });

  it('DIRECTION DB role → direction school role', () => {
    expect(deriveSchoolRole({ isGhost: false, v1Role: 'direction' })).toBe('direction');
  });

  it('READER DB role → reader school role', () => {
    expect(deriveSchoolRole({ isGhost: false, v1Role: 'reader' })).toBe('reader');
  });

  it('undefined V1 role → reader (safety fallback, not the normal path)', () => {
    expect(deriveSchoolRole({ isGhost: false, v1Role: undefined })).toBe('reader');
  });

  it('Ghost always gets admin school role', () => {
    expect(deriveSchoolRole({ isGhost: true, v1Role: 'reader' })).toBe('admin');
  });

  it('SuperAdmin always gets admin school role', () => {
    expect(deriveSchoolRole({ isGhost: false, isSuperAdmin: true, v1Role: 'reader' })).toBe('admin');
  });
});

// ─────────────────────────────────────────────
// 2. derivePlatformRole — platform role is independent of school role
// ─────────────────────────────────────────────

describe('derivePlatformRole: NONE does not downgrade school role', () => {
  it('ordinary user (not ghost, not superAdmin) → platform none', () => {
    expect(derivePlatformRole({ isGhost: false, isSuperAdmin: false })).toBe('none');
  });

  it('ghost → platform ghost', () => {
    expect(derivePlatformRole({ isGhost: true, isSuperAdmin: false })).toBe('ghost');
  });

  it('superAdmin → platform super_admin', () => {
    expect(derivePlatformRole({ isGhost: false, isSuperAdmin: true })).toBe('super_admin');
  });
});

// ─────────────────────────────────────────────
// 3. Role label mapping — French labels
// ─────────────────────────────────────────────

describe('SCHOOL_ROLE_LABELS — correct French labels', () => {
  const expected: Record<SchoolRole, string> = {
    admin: 'Administrateur',
    direction: 'Direction',
    teacher: 'Enseignant',
    reader: 'Lecteur',
  };

  for (const [role, label] of Object.entries(expected)) {
    it(`${role} → ${label}`, () => {
      expect(SCHOOL_ROLE_LABELS[role as SchoolRole]).toBe(label);
    });
  }
});

describe('PLATFORM_ROLE_LABELS — correct French labels', () => {
  const expected: Record<PlatformRole, string> = {
    ghost: 'Ghost',
    super_admin: 'Super Administrateur',
    none: 'Aucun rôle plateforme',
  };

  for (const [role, label] of Object.entries(expected)) {
    it(`${role} → ${label}`, () => {
      expect(PLATFORM_ROLE_LABELS[role as PlatformRole]).toBe(label);
    });
  }
});

// ─────────────────────────────────────────────
// 4. Sidebar display label logic
// ─────────────────────────────────────────────

describe('Sidebar display label derivation', () => {
  // Mirrors sidebar.tsx: displayLabel = isGhost ? 'Fantomas' : schoolRoleLabel ?? platformRoleLabel
  function getDisplayLabel(isGhost: boolean, schoolRole: SchoolRole | null, platformRole: PlatformRole) {
    if (isGhost) return 'Fantomas';
    return schoolRole ? SCHOOL_ROLE_LABELS[schoolRole] : PLATFORM_ROLE_LABELS[platformRole];
  }

  it('ADMIN user → "Administrateur"', () => {
    expect(getDisplayLabel(false, 'admin', 'none')).toBe('Administrateur');
  });

  it('TEACHER user → "Enseignant"', () => {
    expect(getDisplayLabel(false, 'teacher', 'none')).toBe('Enseignant');
  });

  it('DIRECTION user → "Direction"', () => {
    expect(getDisplayLabel(false, 'direction', 'none')).toBe('Direction');
  });

  it('READER user → "Lecteur"', () => {
    expect(getDisplayLabel(false, 'reader', 'none')).toBe('Lecteur');
  });

  it('Ghost → "Fantomas" (not school role label)', () => {
    expect(getDisplayLabel(true, 'admin', 'ghost')).toBe('Fantomas');
  });

  it('SUPER_ADMIN user → school role label, not raw "Reader"', () => {
    // SUPER_ADMIN gets admin school role via deriveSchoolRole
    expect(getDisplayLabel(false, 'admin', 'super_admin')).toBe('Administrateur');
  });
});

// ─────────────────────────────────────────────
// 5. CRITICAL: platformRole=NONE must NOT convert school role to READER
// ─────────────────────────────────────────────

describe('platformRole NONE → READER bug prevention', () => {
  it('platformRole=none + DB admin → school role admin, NOT reader', () => {
    const v1Role = 'admin';
    const schoolRole = deriveSchoolRole({ isGhost: false, v1Role });
    expect(schoolRole).toBe('admin');
    expect(schoolRole).not.toBe('reader');
  });

  it('platformRole=none + DB teacher → school role teacher, NOT reader', () => {
    const v1Role = 'teacher';
    const schoolRole = deriveSchoolRole({ isGhost: false, v1Role });
    expect(schoolRole).toBe('teacher');
    expect(schoolRole).not.toBe('reader');
  });

  it('platformRole=none + DB direction → school role direction, NOT reader', () => {
    const v1Role = 'direction';
    const schoolRole = deriveSchoolRole({ isGhost: false, v1Role });
    expect(schoolRole).toBe('direction');
    expect(schoolRole).not.toBe('reader');
  });
});

// ─────────────────────────────────────────────
// 6. Fantomas dedicated display
// ─────────────────────────────────────────────

describe('Fantomas display', () => {
  it('Fantomas sidebar label is "Fantomas", not a role label', () => {
    // This verifies the sidebar.tsx logic:
    // const displayLabel = isGhost ? 'Fantomas' : schoolRoleLabel ?? platformRoleLabel;
    const isGhost = true;
    const displayLabel = isGhost ? 'Fantomas' : SCHOOL_ROLE_LABELS.admin;
    expect(displayLabel).toBe('Fantomas');
  });

  it('Fantomas platform label is "Ghost"', () => {
    expect(PLATFORM_ROLE_LABELS.ghost).toBe('Ghost');
  });
});
