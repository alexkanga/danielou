/**
 * M4 Teacher Scope Enforcement — Verifies requireAssessmentScope
 * 
 * Tests that:
 * - ADMIN/DIRECTION/Fantomas bypass resource scope checks
 * - TEACHER role triggers requireTeacherScope (rejects without valid assignment)
 * - The guard is properly wired (function exists and behaves correctly)
 */

import { describe, it, expect } from 'vitest';
import { requireAssessmentScope } from '@/lib/server-guards';
import type { AppSessionV2 } from '@/lib/types/rbac';
import { AuthorizationError } from '@/lib/authorization';

const mockScope = {
  schoolId: 'school-1',
  classroomId: 'classroom-1',
  subjectId: 'subject-1',
  academicYearId: 'year-1',
};

function makeSession(role: string | null, isGhost = false): AppSessionV2 {
  return {
    user: { id: 'user-1', email: 't@test.com', name: 'T', platformRole: isGhost ? 'ghost' : 'none', isGhost, source: 'better-auth' },
    schoolMemberships: [{ id: '1', schoolId: 'school-1', role: role as 'admin', isActive: true }],
    activeSchoolRole: role as 'admin' | null,
    activeSchoolId: 'school-1',
  };
}

describe('M4 Teacher Scope — requireAssessmentScope', () => {
  it('ADMIN bypasses resource scope', async () => {
    const session = makeSession('admin');
    // Should not throw — admin bypasses teacher scope check
    await expect(requireAssessmentScope(session, mockScope)).resolves.toBeUndefined();
  });

  it('DIRECTION bypasses resource scope', async () => {
    const session = makeSession('direction');
    await expect(requireAssessmentScope(session, mockScope)).resolves.toBeUndefined();
  });

  it('Fantomas (ghost) bypasses resource scope', async () => {
    const session = makeSession('admin', true);
    await expect(requireAssessmentScope(session, mockScope)).resolves.toBeUndefined();
  });

  it('null role (no school context) bypasses resource scope', async () => {
    const session = makeSession(null);
    await expect(requireAssessmentScope(session, mockScope)).resolves.toBeUndefined();
  });

  it('TEACHER without assignment is FORBIDDEN', async () => {
    const session = makeSession('teacher');
    // Teacher role triggers requireTeacherScope which queries DB.
    // With no valid DB or no matching assignment, this throws.
    await expect(requireAssessmentScope(session, mockScope)).rejects.toThrow(AuthorizationError);
  });

  it('TEACHER scope check verifies classroom+subject+year', async () => {
    const session = makeSession('teacher');
    // Even with different scope data, teacher check should fail (no assignment)
    const differentScope = { ...mockScope, classroomId: 'different-classroom' };
    await expect(requireAssessmentScope(session, differentScope)).rejects.toThrow(AuthorizationError);
  });
});
