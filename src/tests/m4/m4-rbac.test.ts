import { describe, it, expect } from 'vitest';
import { schoolRoleHasPermission, platformRoleHasPermission } from '@/lib/permissions';
import type { SchoolRole, PlatformRole, Permission } from '@/lib/types/rbac';

describe('Permissions M4 — Evaluations et Notes', () => {
  const assessRead: Permission = 'school:assessments:read';
  const assessManage: Permission = 'school:assessments:manage';
  const gradesRead: Permission = 'school:grades:read';
  const gradesManage: Permission = 'school:grades:manage';

  it('admin a school:assessments:read, school:assessments:manage, school:grades:read, school:grades:manage', () => {
    expect(schoolRoleHasPermission('admin' as SchoolRole, assessRead)).toBe(true);
    expect(schoolRoleHasPermission('admin' as SchoolRole, assessManage)).toBe(true);
    expect(schoolRoleHasPermission('admin' as SchoolRole, gradesRead)).toBe(true);
    expect(schoolRoleHasPermission('admin' as SchoolRole, gradesManage)).toBe(true);
  });

  it('direction a read mais PAS manage', () => {
    expect(schoolRoleHasPermission('direction' as SchoolRole, assessRead)).toBe(true);
    expect(schoolRoleHasPermission('direction' as SchoolRole, gradesRead)).toBe(true);
    expect(schoolRoleHasPermission('direction' as SchoolRole, assessManage)).toBe(false);
    expect(schoolRoleHasPermission('direction' as SchoolRole, gradesManage)).toBe(false);
  });

  it('teacher a school:assessments:read, school:assessments:manage, school:grades:read, school:grades:manage', () => {
    expect(schoolRoleHasPermission('teacher' as SchoolRole, assessRead)).toBe(true);
    expect(schoolRoleHasPermission('teacher' as SchoolRole, assessManage)).toBe(true);
    expect(schoolRoleHasPermission('teacher' as SchoolRole, gradesRead)).toBe(true);
    expect(schoolRoleHasPermission('teacher' as SchoolRole, gradesManage)).toBe(true);
  });

  it('reader a read mais PAS manage', () => {
    expect(schoolRoleHasPermission('reader' as SchoolRole, assessRead)).toBe(true);
    expect(schoolRoleHasPermission('reader' as SchoolRole, gradesRead)).toBe(true);
    expect(schoolRoleHasPermission('reader' as SchoolRole, assessManage)).toBe(false);
    expect(schoolRoleHasPermission('reader' as SchoolRole, gradesManage)).toBe(false);
  });

  it('ghost (via platformRoleHasPermission) a toutes les permissions', () => {
    expect(platformRoleHasPermission('ghost' as PlatformRole, assessRead)).toBe(true);
    expect(platformRoleHasPermission('ghost' as PlatformRole, assessManage)).toBe(true);
    expect(platformRoleHasPermission('ghost' as PlatformRole, gradesRead)).toBe(true);
    expect(platformRoleHasPermission('ghost' as PlatformRole, gradesManage)).toBe(true);
  });
});
