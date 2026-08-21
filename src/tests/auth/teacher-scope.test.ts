/**
 * M1 Security Gate — Teacher Resource Scope Tests (TEACHER-01 à TEACHER-04)
 * 
 * Ces tests vérifient la triple vérification :
 * permission + school scope + resource scope.
 * 
 * Note : Les tests d'intégration complète avec PostgreSQL réel
 * sont exécutés séparément. Ces tests couvrent la logique de guard.
 */

import { describe, it, expect } from 'vitest';
import {
  checkPermission,
  requirePermission,
  requireSchoolAccess,
  AuthorizationError,
} from '@/lib/authorization';
import type { SchoolMembership } from '@/lib/types/rbac';

// ─────────────────────────────────────────────
// TEACHER permission level
// ─────────────────────────────────────────────

describe('TEACHER-01: Teacher permission level', () => {
  it('teacher has school:grades:manage permission', () => {
    expect(checkPermission('none', 'teacher', 'school:grades:manage')).toBe(true);
  });

  it('teacher has school:assessments:manage permission', () => {
    expect(checkPermission('none', 'teacher', 'school:assessments:manage')).toBe(true);
  });

  it('teacher does NOT have school:students:manage', () => {
    expect(checkPermission('none', 'teacher', 'school:students:manage')).toBe(false);
  });

  it('teacher does NOT have platform:users:manage', () => {
    expect(checkPermission('none', 'teacher', 'platform:users:manage')).toBe(false);
  });
});

// ─────────────────────────────────────────────
// TEACHER-02: School scope
// ─────────────────────────────────────────────

describe('TEACHER-02: Teacher school scope', () => {
  const schoolMemberships: SchoolMembership[] = [
    {
      id: '1',
      schoolId: 'school-a',
      schoolName: 'École A',
      role: 'teacher',
      isActive: true,
    },
  ];

  it('teacher has access to own school', () => {
    expect(() => requireSchoolAccess(schoolMemberships, 'school-a')).not.toThrow();
  });

  it('teacher FORBIDDEN for different school', () => {
    expect(() => requireSchoolAccess(schoolMemberships, 'school-b')).toThrow(AuthorizationError);
  });

  it('teacher FORBIDDEN for inactive membership', () => {
    const inactive: SchoolMembership[] = [
      {
        id: '2',
        schoolId: 'school-a',
        role: 'teacher',
        isActive: false,
      },
    ];
    expect(() => requireSchoolAccess(inactive, 'school-a')).toThrow(AuthorizationError);
  });
});

// ─────────────────────────────────────────────
// TEACHER-03: Resource scope (conceptual)
// ─────────────────────────────────────────────

describe('TEACHER-03: Teacher resource scope concept', () => {
  it('requirePermission blocks teacher from platform actions', () => {
    // Even though teacher has grades:manage at permission level,
    // platform actions require requireSuperAdminGuard
    expect(() => requirePermission('none', 'teacher', 'platform:users:manage'))
      .toThrow(AuthorizationError);
  });
});

// ─────────────────────────────────────────────
// TEACHER-04: Reader cannot mutate
// ─────────────────────────────────────────────

describe('TEACHER-04/READER: Reader mutation blocked', () => {
  it('reader FORBIDDEN on grades:manage', () => {
    expect(() => requirePermission('none', 'reader', 'school:grades:manage'))
      .toThrow(AuthorizationError);
    try {
      requirePermission('none', 'reader', 'school:grades:manage');
    } catch (e) {
      expect((e as AuthorizationError).code).toBe('FORBIDDEN');
    }
  });

  it('reader FORBIDDEN on students:manage', () => {
    expect(() => requirePermission('none', 'reader', 'school:students:manage'))
      .toThrow(AuthorizationError);
  });

  it('reader FORBIDDEN on assessments:manage', () => {
    expect(() => requirePermission('none', 'reader', 'school:assessments:manage'))
      .toThrow(AuthorizationError);
  });

  it('reader FORBIDDEN on report_cards:prepare', () => {
    expect(() => requirePermission('none', 'reader', 'school:report_cards:prepare'))
      .toThrow(AuthorizationError);
  });

  it('reader CAN read grades', () => {
    expect(() => requirePermission('none', 'reader', 'school:grades:read')).not.toThrow();
  });

  it('reader CAN read statistics', () => {
    expect(() => requirePermission('none', 'reader', 'school:statistics:read')).not.toThrow();
  });
});
