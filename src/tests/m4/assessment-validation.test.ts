import { describe, it, expect } from 'vitest';
import { createAssessmentSchema, updateAssessmentSchema } from '@/lib/validations/pedagogy';

const UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const validBase = {
  classroomId: UUID,
  subjectId: UUID,
  academicPeriodId: UUID,
  title: 'Devoir 1',
  date: '2025-01-15',
};

describe('createAssessmentSchema', () => {
  it('rejette un titre manquant', () => {
    const result = createAssessmentSchema.safeParse({
      ...validBase,
      title: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejette un classroomId manquant', () => {
    const result = createAssessmentSchema.safeParse({
      ...validBase,
      classroomId: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejette une echelle < 1', () => {
    const result = createAssessmentSchema.safeParse({
      ...validBase,
      scale: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejette une echelle > 100', () => {
    const result = createAssessmentSchema.safeParse({
      ...validBase,
      scale: 101,
    });
    expect(result.success).toBe(false);
  });

  it('rejette un coefficient <= 0', () => {
    const result = createAssessmentSchema.safeParse({
      ...validBase,
      coefficient: 0,
    });
    expect(result.success).toBe(false);
  });

  it('accepte une entree valide', () => {
    const result = createAssessmentSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scale).toBe(20);
      expect(result.data.coefficient).toBe(1);
    }
  });

  it('applique les valeurs par defaut scale=20 et coefficient=1', () => {
    const result = createAssessmentSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scale).toBe(20);
      expect(result.data.coefficient).toBe(1);
    }
  });
});

describe('updateAssessmentSchema', () => {
  it('accepte uniquement les champs autorises (title, description, date, assessmentTypeId)', () => {
    const result = updateAssessmentSchema.safeParse({
      title: 'Nouveau titre',
      description: 'Nouvelle description',
      date: '2025-02-01',
      assessmentTypeId: UUID,
    });
    expect(result.success).toBe(true);
  });

  it('rejette un champ supplementaire (.strict())', () => {
    const result = updateAssessmentSchema.safeParse({
      title: 'Nouveau titre',
      scale: 50,
    });
    expect(result.success).toBe(false);
  });
});
