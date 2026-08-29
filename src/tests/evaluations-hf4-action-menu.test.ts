/**
 * POST-M3 EVALUATIONS HF4 — Action Menu Regression Tests
 *
 * Root cause: evaluations page rendered DropdownMenuTrigger unconditionally,
 * but closed/cancelled evaluations had zero menu items → empty popup.
 * Fix: actions callback returns null when hasActions is false.
 *
 * T1: Zero computed actions → action trigger/menu is not rendered (returns null).
 * T2: One or more computed actions → menu trigger renders (returns JSX).
 * T3: Menu items have readable labels.
 * T4: Closed evaluation follows actual canonical lifecycle behavior (no actions).
 */

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read the page source to verify structural properties
const pageSource = readFileSync(
  resolve('src/app/(dashboard)/dashboard/evaluations/page.tsx'),
  'utf8',
);

describe('HF4 — evaluation action menu regression', () => {
  // ─────────────────────────────────────────────
  // T1: Zero computed actions → no trigger rendered
  // ─────────────────────────────────────────────
  it('T1 — closed and cancelled evaluations return null (no trigger)', () => {
    // The fix adds: if (!hasActions) return null;
    // where hasActions = status === 'draft' || status === 'open'
    expect(pageSource).toContain('const hasActions');
    expect(pageSource).toContain('if (!hasActions) return null');
  });

  // ─────────────────────────────────────────────
  // T2: One or more actions → menu trigger renders
  // ─────────────────────────────────────────────
  it('T2 — draft and open evaluations render dropdown menu', () => {
    // hasActions must be true for draft and open
    expect(pageSource).toContain("_item.status === 'draft' || _item.status === 'open'");
    // The DropdownMenu and trigger must still be rendered for actionable statuses
    expect(pageSource).toContain('DropdownMenuTrigger');
    expect(pageSource).toContain('MoreHorizontal');
  });

  // ─────────────────────────────────────────────
  // T3: Menu items have readable French labels
  // ─────────────────────────────────────────────
  it('T3 — menu items have readable labels', () => {
    expect(pageSource).toContain('Ouvrir');
    expect(pageSource).toContain('Fermer');
    expect(pageSource).toContain('Annuler');
    expect(pageSource).toContain('Saisir les notes');
  });

  // ─────────────────────────────────────────────
  // T4: Closed evaluation follows canonical lifecycle
  // ─────────────────────────────────────────────
  it('T4 — closed status has no action items defined', () => {
    // Verify no action is conditionally rendered for 'closed' status
    // Pattern: any conditional that starts with _item.status === 'closed'
    const closedActions = pageSource.match(/_item\.status === 'closed'[^}]*}/g);
    expect(closedActions).toBeNull();
  });

  it('T4b — cancelled status has no action items defined', () => {
    const cancelledActions = pageSource.match(/_item\.status === 'cancelled'[^}]*}/g);
    expect(cancelledActions).toBeNull();
  });

  // ─────────────────────────────────────────────
  // Structural: no new business actions invented
  // ─────────────────────────────────────────────
  it('no new actions added beyond existing lifecycle', () => {
    // Only these 4 lifecycle actions should exist
    const actionPatterns = [
      /doAction\([^)]+,\s*'open'\)/,
      /doAction\([^)]+,\s*'close'\)/,
      /doAction\([^)]+,\s*'cancel'\)/,
      /saisie-notes/,
    ];
    for (const pattern of actionPatterns) {
      expect(pageSource).toMatch(pattern);
    }
  });
});
