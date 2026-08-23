import { describe, it, expect } from 'vitest';
import {
  AssessmentLifecycleError,
  AssessmentImmutabilityError,
  GradeEligibilityError,
} from '@/lib/services/pedagogy/assessment.service';

describe('Classes d\'erreur du cycle de vie M4', () => {
  it('AssessmentLifecycleError a le bon nom et herite de Error', () => {
    const err = new AssessmentLifecycleError('transition invalide');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AssessmentLifecycleError');
    expect(err.message).toBe('transition invalide');
  });

  it('AssessmentImmutabilityError a le bon nom et herite de Error', () => {
    const err = new AssessmentImmutabilityError('evaluation fermee');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AssessmentImmutabilityError');
    expect(err.message).toBe('evaluation fermee');
  });

  it('GradeEligibilityError a le bon nom et herite de Error', () => {
    const err = new GradeEligibilityError('eleve non eligible');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('GradeEligibilityError');
    expect(err.message).toBe('eleve non eligible');
  });
});
