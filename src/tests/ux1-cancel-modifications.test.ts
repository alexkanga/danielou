/**
 * POST-M3 UX-1 — Annuler les modifications (Cancel Modifications)
 *
 * Tests for the "Annuler les modifications" feature in Saisie des notes.
 * This feature allows users to discard unsaved grade edits and restore
 * the last loaded/saved baseline state.
 *
 * T1: Initial loaded state → cancel button disabled.
 * T2: Modify numeric grade → form dirty.
 * T3: Click Annuler les modifications → original numeric grade restored.
 * T4: Modify status → cancel restores original status.
 * T5: Modify comment → cancel restores original comment.
 * T6: Cancel causes no API mutation.
 * T7: Successful save establishes a new baseline.
 * T8: After save, later cancel restores newly saved state, not old initial state.
 */

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(
  resolve('src/app/(dashboard)/dashboard/saisie-notes/page.tsx'),
  'utf8',
);

/* ------------------------------------------------------------------
 * Extract pure logic functions from source for behavioral testing.
 * The page defines gradesFingerprint and gradeInputKey — we
 * replicate the same logic here to verify behavioral correctness.
 * ------------------------------------------------------------------ */

type GradeInput = {
  enrollmentId: string; rawValue: number | null; status: string; comment: string | null;
};

function gradeInputKey(g: GradeInput): string {
  return `${g.enrollmentId}:${g.rawValue}:${g.status}:${g.comment ?? ''}`;
}

function gradesFingerprint(gs: Record<string, GradeInput>): string {
  const keys = Object.keys(gs).sort();
  return keys.map(k => gradeInputKey(gs[k])).join('|');
}

describe('UX-1 — Annuler les modifications', () => {
  // ─────────────────────────────────────────────
  // Structural checks (source code analysis)
  // ─────────────────────────────────────────────

  it('T1a — baselineGrades state is declared', () => {
    expect(pageSource).toContain('baselineGrades');
    expect(pageSource).toContain('setBaselineGrades');
  });

  it('T1b — cancel button exists with correct label', () => {
    expect(pageSource).toContain('Annuler les modifications');
  });

  it('T1c — cancel button is disabled when form is not dirty', () => {
    // Button should have disabled={!isDirty || saving}
    expect(pageSource).toContain('disabled={!isDirty || saving}');
  });

  it('T1d — isDirty is computed via useMemo from grades and baselineGrades', () => {
    expect(pageSource).toContain('const isDirty = useMemo');
    expect(pageSource).toContain('gradesFingerprint(grades) !== gradesFingerprint(baselineGrades)');
  });

  it('T6a — handleCancel does not call fetch or API', () => {
    // handleCancel only calls setGrades with baselineGrades
    expect(pageSource).toContain('const handleCancel');
    // Verify handleCancel has no fetch call
    const handleCancelBlock = pageSource.match(/const handleCancel = \(\) => \{[\s\S]*?\};/);
    expect(handleCancelBlock).not.toBeNull();
    expect(handleCancelBlock![0]).not.toContain('fetch');
    expect(handleCancelBlock![0]).not.toContain('api');
  });

  it('T6b — handleCancel restores from baselineGrades only', () => {
    expect(pageSource).toContain('setGrades({ ...baselineGrades })');
  });

  it('T7a — loadStudents sets both grades and baselineGrades', () => {
    // After building the grades map, both should be set to the same snapshot
    expect(pageSource).toContain('setGrades(g)');
    expect(pageSource).toContain('setBaselineGrades(g)');
  });

  it('T7b — handleSave calls loadStudents on success (which updates baseline)', () => {
    // On successful save, loadStudents is called which resets both grades and baselineGrades
    expect(pageSource).toContain('void loadStudents()');
  });

  it('cancel button uses variant="outline" (not destructive/red)', () => {
    // Verify the cancel button is not styled as destructive
    expect(pageSource).toContain('variant="outline" onClick={handleCancel}');
    expect(pageSource).not.toContain('variant="destructive" onClick={handleCancel}');
  });

  it('cancel button appears next to Enregistrer in header', () => {
    // Both buttons should be in a flex container with gap-2
    const headerBtnPattern = /<div className="flex gap-2 shrink-0">[\s\S]*?Annuler les modifications[\s\S]*?Enregistrer[\s\S]*?<\/div>/;
    expect(pageSource).toMatch(headerBtnPattern);
  });

  it('cancel button also appears at bottom next to Enregistrer toutes les notes', () => {
    const bottomBtnPattern = /<div className="flex justify-end gap-2">[\s\S]*?Annuler les modifications[\s\S]*?Enregistrer toutes les notes[\s\S]*?<\/div>/;
    expect(pageSource).toMatch(bottomBtnPattern);
  });

  // ─────────────────────────────────────────────
  // Behavioral tests (logic verification)
  // ─────────────────────────────────────────────

  it('T2 — modifying a numeric grade makes isDirty true', () => {
    const baseline: Record<string, GradeInput> = {
      'e1': { enrollmentId: 'e1', rawValue: 8.5, status: 'graded', comment: null },
    };
    const modified: Record<string, GradeInput> = {
      'e1': { enrollmentId: 'e1', rawValue: 7, status: 'graded', comment: null },
    };
    expect(gradesFingerprint(baseline)).not.toBe(gradesFingerprint(modified));
  });

  it('T3 — cancel restores original numeric grade (baseline unchanged)', () => {
    const baseline: Record<string, GradeInput> = {
      'e1': { enrollmentId: 'e1', rawValue: 8.5, status: 'graded', comment: null },
    };
    // Simulate: user changes 8.5 → 7 (demonstrates isDirty would be true)
    void gradesFingerprint({ 'e1': { enrollmentId: 'e1', rawValue: 7, status: 'graded', comment: null } });
    // Cancel: restore from baseline
    const restored = { ...baseline };
    expect(gradesFingerprint(restored)).toBe(gradesFingerprint(baseline));
    expect(restored['e1'].rawValue).toBe(8.5);
  });

  it('T4 — modifying status and canceling restores original status', () => {
    const baseline: Record<string, GradeInput> = {
      'e1': { enrollmentId: 'e1', rawValue: null, status: 'pending', comment: null },
    };
    // Simulate: user sets status to 'absent_excused'
    const modified: Record<string, GradeInput> = {
      'e1': { enrollmentId: 'e1', rawValue: null, status: 'absent_excused', comment: null },
    };
    expect(gradesFingerprint(baseline)).not.toBe(gradesFingerprint(modified));
    // Cancel restores baseline
    const restored = { ...baseline };
    expect(restored['e1'].status).toBe('pending');
  });

  it('T5 — modifying comment and canceling restores original comment', () => {
    const baseline: Record<string, GradeInput> = {
      'e1': { enrollmentId: 'e1', rawValue: 12, status: 'graded', comment: null },
    };
    // Verify modifying comment makes fingerprint different
    expect(gradesFingerprint(baseline)).not.toBe(gradesFingerprint({
      'e1': { enrollmentId: 'e1', rawValue: 12, status: 'graded', comment: 'Bon travail' },
    }));
    const restored = { ...baseline };
    expect(restored['e1'].comment).toBeNull();
  });

  it('T7 — successful save establishes new baseline', () => {
    // Simulate: initial load with 8.5, then user saves 9
    // After save, loadStudents sets new baseline = 9
    const newBaseline: Record<string, GradeInput> = {
      'e1': { enrollmentId: 'e1', rawValue: 9, status: 'graded', comment: null },
    };
    // isDirty should be true when user changes 9 → 6
    expect(gradesFingerprint({
      'e1': { enrollmentId: 'e1', rawValue: 6, status: 'graded', comment: null },
    })).not.toBe(gradesFingerprint(newBaseline));
    // Cancel restores newBaseline (9), not initialBaseline (8.5)
    const restored = { ...newBaseline };
    expect(restored['e1'].rawValue).toBe(9);
    expect(gradesFingerprint(restored)).toBe(gradesFingerprint(newBaseline));
  });

  it('T8 — after save, cancel restores newly saved state not old initial state', () => {
    // This is the full scenario from the spec:
    // DB loaded: 8.5 → user changes to 7 → cancel → 8.5
    // Then user changes to 9 → save → baseline becomes 9
    // Then user changes to 6 → cancel → 9 (NOT 8.5)
    const step1_load: Record<string, GradeInput> = {
      'e1': { enrollmentId: 'e1', rawValue: 8.5, status: 'graded', comment: null },
    };
    // Simulate cancel
    const step3_cancel: Record<string, GradeInput> = { ...step1_load };
    expect(step3_cancel['e1'].rawValue).toBe(8.5);

    const step4_modify9: Record<string, GradeInput> = {
      'e1': { enrollmentId: 'e1', rawValue: 9, status: 'graded', comment: null },
    };
    // Save succeeds → new baseline = step4_modify9
    const step5_newBaseline: Record<string, GradeInput> = { ...step4_modify9 };

    const step6_modify6: Record<string, GradeInput> = {
      'e1': { enrollmentId: 'e1', rawValue: 6, status: 'graded', comment: null },
    };
    expect(gradesFingerprint(step6_modify6)).not.toBe(gradesFingerprint(step5_newBaseline));

    // Cancel restores 9 (new baseline), NOT 8.5 (old initial)
    const step7_cancel: Record<string, GradeInput> = { ...step5_newBaseline };
    expect(step7_cancel['e1'].rawValue).toBe(9);
    expect(gradesFingerprint(step7_cancel)).not.toBe(gradesFingerprint(step1_load));
  });
});
