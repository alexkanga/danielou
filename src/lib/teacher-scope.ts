/**
 * M1-29.11 — Teacher Resource Scope
 * 
 * Triple vérification pour les enseignants :
 * 1. Permission (le teacher a la permission générale)
 * 2. School scope (le teacher est dans l'école)
 * 3. Resource scope (le teacher est assigné à la classe+matière)
 * 4. Temporal scope (l'assignment est active)
 */

import { AuthorizationError } from './authorization';
import type { SchoolRole } from './types/rbac';
import { eq, and } from 'drizzle-orm';
import { getDb } from './db';
import { teacherAssignment } from './db/schema';

export interface TeacherScopeCheck {
  schoolId: string;
  classroomId: string;
  subjectId: string;
  academicYearId: string;
}

/**
 * Vérifie qu'un enseignant a le droit d'agir sur une ressource spécifique.
 * 
 * @param userId - L'ID de l'utilisateur enseignant
 * @param schoolRole - Le rôle scolaire (doit être 'teacher')
 * @param scope - La ressource cible
 * @throws AuthorizationError si l'enseignant n'est pas assigné à cette ressource
 */
export async function requireTeacherScope(
  userId: string,
  _schoolRole: SchoolRole | null,
  scope: TeacherScopeCheck,
): Promise<void> {
  // 1. Vérifier que c'est un enseignant
  if (_schoolRole !== 'teacher') {
    throw new AuthorizationError('FORBIDDEN');
  }

  try {
    const db = getDb();

    // 2. Vérifier l'assignment (school + resource scope)
    const assignments = await db
      .select({ id: teacherAssignment.id })
      .from(teacherAssignment)
      .where(
        and(
          eq(teacherAssignment.userId, userId),
          eq(teacherAssignment.classroomId, scope.classroomId),
          eq(teacherAssignment.subjectId, scope.subjectId),
          eq(teacherAssignment.academicYearId, scope.academicYearId),
        ),
      )
      .limit(1);

    if (assignments.length === 0) {
      throw new AuthorizationError('FORBIDDEN');
    }
  } catch (err) {
    if (err instanceof AuthorizationError) throw err;
    // DB error
    throw new AuthorizationError('DATABASE_UNAVAILABLE');
  }
}

/**
 * Vérifie qu'un enseignant a accès à une école (school scope only).
 */
export async function requireTeacherSchoolAccess(
  userId: string,
  schoolId: string,
): Promise<void> {
  try {
    const db = getDb();
    const { schoolMembership } = await import('./db/schema');
    const { eq, and } = await import('drizzle-orm');

    const memberships = await db
      .select({ id: schoolMembership.id })
      .from(schoolMembership)
      .where(
        and(
          eq(schoolMembership.userId, userId),
          eq(schoolMembership.schoolId, schoolId),
          eq(schoolMembership.isActive, true),
        ),
      )
      .limit(1);

    if (memberships.length === 0) {
      throw new AuthorizationError('FORBIDDEN');
    }
  } catch (err) {
    if (err instanceof AuthorizationError) throw err;
    throw new AuthorizationError('DATABASE_UNAVAILABLE');
  }
}