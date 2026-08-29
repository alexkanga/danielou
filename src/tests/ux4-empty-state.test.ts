/**
 * POST-M3 UX-4 — Improved Empty State in Saisie des Notes
 *
 * T18: Zero open evaluations → improved empty message displayed.
 * T19: "Voir les évaluations" → points to canonical Evaluations page.
 * T20: Empty state does not expose closed evaluations as selectable open evaluations.
 */

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(
  resolve('src/app/(dashboard)/dashboard/saisie-notes/page.tsx'),
  'utf8',
);

describe('UX-4 — improved empty state for Saisie des notes', () => {
  // ─────────────────────────────────────────────
  // T18: Improved empty message
  // ─────────────────────────────────────────────
  it('T18a — displays "Aucune évaluation ouverte." message', () => {
    expect(pageSource).toContain('Aucune évaluation ouverte.');
  });

  it('T18b — displays navigation hint message', () => {
    expect(pageSource).toContain('Pour saisir ou modifier des notes, ouvrez d');
    expect(pageSource).toContain('abord une évaluation.');
  });

  it('T18c — uses a styled container (not just a plain <p>)', () => {
    // The empty state should use a card-like container with border-dashed
    expect(pageSource).toContain('border-dashed');
  });

  it('T18d — uses ClipboardList icon for the empty state', () => {
    expect(pageSource).toContain('ClipboardList');
  });

  // ─────────────────────────────────────────────
  // T19: "Voir les évaluations" navigation
  // ─────────────────────────────────────────────
  it('T19a — contains "Voir les évaluations" link', () => {
    expect(pageSource).toContain('Voir les évaluations');
  });

  it('T19b — link points to /dashboard/evaluations', () => {
    expect(pageSource).toContain('href="/dashboard/evaluations"');
  });

  it('T19c — uses Button component with variant outline', () => {
    expect(pageSource).toContain('variant="outline"');
  });

  it('T19d — uses Next.js Link component', () => {
    expect(pageSource).toContain('import Link from');
    expect(pageSource).toContain('<Link href="/dashboard/evaluations">');
  });

  // ─────────────────────────────────────────────
  // T20: No closed evaluations exposed as open
  // ─────────────────────────────────────────────
  it('T20a — open assessments query filters by status=open only', () => {
    expect(pageSource).toContain('status=open&limit=100');
  });

  it('T20b — no query parameter for closed evaluations in the selector', () => {
    // The API call for the assessment list must NOT request closed evaluations
    const apiCall = pageSource.match(/fetch\('[^']*evaluations[^']*'\)/g);
    expect(apiCall).not.toBeNull();
    for (const call of apiCall!) {
      // The selector fetch (no assessmentId) should only request open
      if (call.includes('status=')) {
        expect(call).toContain('status=open');
      }
    }
  });

  it('T20c — old unstyled empty message is replaced', () => {
    // The old message was: "Créez et ouvrez une évaluation d'abord."
    // It should no longer exist as a standalone message
    expect(pageSource).not.toContain("Créez et ouvrez une évaluation");
  });
});
