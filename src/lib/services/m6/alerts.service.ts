/**
 * M6.1 — Alerts Service
 * Computes operational alerts from existing data.
 * Categories: INFORMATION, OPERATIONAL, PEDAGOGICAL, BLOCKING
 * All alerts are computed (no persistent notification infrastructure).
 */

import { db } from '@/lib/db';
import {
  enrollment, classroomAssignment, classroom, assessment, grade,
  reportCard, academicYear, academicPeriod, pedagogicalConfig, level,
} from '@/lib/db/schema';
import { eq, and, inArray, sql, count, ne } from 'drizzle-orm';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type AlertSeverity = 'info' | 'warning' | 'error';
export type AlertCategory = 'INFORMATION' | 'OPERATIONAL' | 'PEDAGOGICAL' | 'BLOCKING';

export interface Alert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  message: string;
  affectedCount: number;
  actionHref: string | null;
  actionLabel: string | null;
}

// ─────────────────────────────────────────────
// Computation
// ─────────────────────────────────────────────

export async function computeAlerts(
  schoolId: string,
  role: string,
): Promise<Alert[]> {
  const alerts: Alert[] = [];

  const activeYear = await db
    .select({ id: academicYear.id, name: academicYear.name })
    .from(academicYear)
    .where(and(eq(academicYear.schoolId, schoolId), eq(academicYear.status, 'active')))
    .limit(1);

  if (activeYear.length === 0) {
    alerts.push({
      id: 'no-active-year',
      category: 'BLOCKING',
      severity: 'error',
      message: 'Aucune année scolaire active.',
      affectedCount: 0,
      actionHref: '/dashboard/annees-scolaires',
      actionLabel: 'Configurer',
    });
    return alerts;
  }

  const yearId = activeYear[0].id;

  // --- ADMIN/DIRECTION alerts ---
  if (role === 'admin' || role === 'direction') {
    // Enrollments without classroom
    const activeEnrollments = await db
      .select({ id: enrollment.id })
      .from(enrollment)
      .where(and(eq(enrollment.schoolId, schoolId), eq(enrollment.academicYearId, yearId), eq(enrollment.status, 'active')));

    const aeIds = activeEnrollments.map(e => e.id);
    if (aeIds.length > 0) {
      const assigned = await db
        .selectDistinct({ eid: classroomAssignment.enrollmentId })
        .from(classroomAssignment)
        .where(and(inArray(classroomAssignment.enrollmentId, aeIds), eq(classroomAssignment.status, 'active')));
      const unassigned = aeIds.length - assigned.length;
      if (unassigned > 0) {
        alerts.push({
          id: 'enrollments-no-classroom',
          category: 'OPERATIONAL',
          severity: 'warning',
          message: `${unassigned} inscription(s) sans affectation de classe.`,
          affectedCount: unassigned,
          actionHref: '/dashboard/affectations',
          actionLabel: 'Affecter',
        });
      }
    }

    // Incomplete assessments (open with pending grades)
    const periods = await db
      .select({ id: academicPeriod.id })
      .from(academicPeriod)
      .where(eq(academicPeriod.academicYearId, yearId));
    const periodIds = periods.map(p => p.id);

    if (periodIds.length > 0) {
      const openAss = await db
        .select({ id: assessment.id })
        .from(assessment)
        .where(and(inArray(assessment.academicPeriodId, periodIds), eq(assessment.status, 'open')));

      let incompleteCount = 0;
      for (const a of openAss) {
        const [pending] = await db
          .select({ c: count() })
          .from(grade)
          .where(and(eq(grade.assessmentId, a.id), eq(grade.status, 'pending')));
        if (pending.c > 0) incompleteCount++;
      }
      if (incompleteCount > 0) {
        alerts.push({
          id: 'incomplete-assessments',
          category: 'PEDAGOGICAL',
          severity: 'warning',
          message: `${incompleteCount} évaluation(s) ouverte(s) avec notes incomplètes.`,
          affectedCount: incompleteCount,
          actionHref: '/dashboard/evaluations?status=open',
          actionLabel: 'Voir',
        });
      }
    }

    // Report cards waiting validation
    const [rcReady] = await db
      .select({ c: count() })
      .from(reportCard)
      .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
      .where(and(eq(enrollment.academicYearId, yearId), eq(reportCard.status, 'ready')));
    if (rcReady.c > 0) {
      alerts.push({
        id: 'rc-validate',
        category: 'OPERATIONAL',
        severity: 'info',
        message: `${rcReady.c} bulletin(s) en attente de validation.`,
        affectedCount: rcReady.c,
        actionHref: '/dashboard/bulletins/validation',
        actionLabel: 'Valider',
      });
    }

    // Report cards waiting publication
    const [rcValidated] = await db
      .select({ c: count() })
      .from(reportCard)
      .innerJoin(enrollment, eq(reportCard.enrollmentId, enrollment.id))
      .where(and(eq(enrollment.academicYearId, yearId), eq(reportCard.status, 'validated')));
    if (rcValidated.c > 0) {
      alerts.push({
        id: 'rc-publish',
        category: 'OPERATIONAL',
        severity: 'info',
        message: `${rcValidated.c} bulletin(s) validé(s) en attente de publication.`,
        affectedCount: rcValidated.c,
        actionHref: '/dashboard/bulletins/publication',
        actionLabel: 'Publier',
      });
    }

    // Missing pedagogical configuration
    if (role === 'admin') {
      const classroomRows = await db
        .select({ id: classroom.id, name: classroom.name, levelId: classroom.levelId })
        .from(classroom)
        .where(eq(classroom.academicYearId, yearId));

      for (const cr of classroomRows) {
        const configs = await db
          .select({ id: pedagogicalConfig.id })
          .from(pedagogicalConfig)
          .where(and(eq(pedagogicalConfig.levelId, cr.levelId), eq(pedagogicalConfig.academicYearId, yearId), eq(pedagogicalConfig.status, 'active')));
        if (configs.length === 0) {
          alerts.push({
            id: `no-config-${cr.id}`,
            category: 'BLOCKING',
            severity: 'error',
            message: `Classe « ${cr.name }» : aucune configuration pédagogique active.`,
            affectedCount: 1,
            actionHref: '/dashboard/regles-calcul',
            actionLabel: 'Configurer',
          });
        }
      }
    }
  }

  // --- TEACHER alerts ---
  if (role === 'teacher') {
    // Teacher-specific alerts are handled via the teacher dashboard KPIs
    // No additional computed alerts needed here
  }

  return alerts;
}
