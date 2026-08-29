/**
 * POST-M3 Functional Stabilization - Regression Tests
 *
 * T1: Composition page user-facing strings do not contain literal \u escapes.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Path must include the correct 'compositions' directory name
const PAGE_PATH = 'src/app/(dashboard)/dashboard/';
const PAGE_NAME = 'compositions';
const PAGE_FILE = PAGE_PATH + PAGE_NAME + '/page.tsx';

const compositionPage = readFileSync(resolve(PAGE_FILE), 'utf8');

describe('T1 - Composition user-facing strings are proper UTF-8', () => {
  it('no literal backslash-u escapes in page source', () => {
    // Matches literal \u followed by 4 hex digits
    const literalEscapes = compositionPage.match(/\\u[0-9a-fA-F]{4}/g);
    expect(
      literalEscapes,
      `Found literal Unicode escapes: ${literalEscapes?.join(', ')}`,
    ).toBeNull();
  });

  it('key French labels are real UTF-8 characters', () => {
    expect(compositionPage).toContain('Résultats');
    expect(compositionPage).toContain('Année scolaire');
    expect(compositionPage).toContain('Période');
    expect(compositionPage).toContain('Sélectionnez');
    expect(compositionPage).toContain('Élève');
    expect(compositionPage).toContain('Calculé');
    expect(compositionPage).toContain('évaluation');
    expect(compositionPage).toContain('Gérer les évaluations');
    expect(compositionPage).toContain('Créer une évaluation');
    expect(compositionPage).toContain('Aucune évaluation');
    expect(compositionPage).toContain('trouvée');
  });
});
