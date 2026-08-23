import { describe, it, expect } from 'vitest';
import { NUMERIC_STATUSES, NON_GRADE_STATUSES, VALID_GRADE_STATUSES } from '@/lib/validations/pedagogy';

describe('Regle ABSENCE ≠ ZERO', () => {
  it('NUMERIC_STATUSES contient uniquement graded', () => {
    expect(NUMERIC_STATUSES.size).toBe(1);
    expect(NUMERIC_STATUSES.has('graded')).toBe(true);
  });

  it('NON_GRADE_STATUSES contient tous les statuts d\'absence/exemption/non-evalue', () => {
    expect(NON_GRADE_STATUSES.has('absent_excused')).toBe(true);
    expect(NON_GRADE_STATUSES.has('absent_unexcused')).toBe(true);
    expect(NON_GRADE_STATUSES.has('exempt')).toBe(true);
    expect(NON_GRADE_STATUSES.has('not_evaluated')).toBe(true);
    expect(NON_GRADE_STATUSES.size).toBe(4);
  });

  it('pending n\'est dans aucun des deux ensembles (pending est neutre)', () => {
    expect(NUMERIC_STATUSES.has('pending')).toBe(false);
    expect(NON_GRADE_STATUSES.has('pending')).toBe(false);
    // pending doit tout de meme etre un statut valide
    expect(VALID_GRADE_STATUSES).toContain('pending');
  });
});
