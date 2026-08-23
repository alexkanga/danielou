import { describe, it, expect } from 'vitest';
import { setGradeSchema, bulkSetGradesSchema } from '@/lib/validations/pedagogy';

const UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('setGradeSchema', () => {
  it('accepte un statut graded avec une valeur numerique', () => {
    const result = setGradeSchema.safeParse({
      enrollmentId: UUID,
      status: 'graded',
      rawValue: 15,
    });
    expect(result.success).toBe(true);
  });

  it('rejette un statut graded sans valeur numerique', () => {
    const result = setGradeSchema.safeParse({
      enrollmentId: UUID,
      status: 'graded',
    });
    expect(result.success).toBe(false);
  });

  it("rejette absent_excused avec une valeur numerique (ABSENCE ≠ ZERO)", () => {
    const result = setGradeSchema.safeParse({
      enrollmentId: UUID,
      status: 'absent_excused',
      rawValue: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejette absent_unexcused avec une valeur numerique (ABSENCE ≠ ZERO)", () => {
    const result = setGradeSchema.safeParse({
      enrollmentId: UUID,
      status: 'absent_unexcused',
      rawValue: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejette exempt avec une valeur numerique', () => {
    const result = setGradeSchema.safeParse({
      enrollmentId: UUID,
      status: 'exempt',
      rawValue: 20,
    });
    expect(result.success).toBe(false);
  });

  it('rejette not_evaluated avec une valeur numerique', () => {
    const result = setGradeSchema.safeParse({
      enrollmentId: UUID,
      status: 'not_evaluated',
      rawValue: 0,
    });
    expect(result.success).toBe(false);
  });

  it('accepte pending avec une valeur numerique (pending est neutre)', () => {
    const result = setGradeSchema.safeParse({
      enrollmentId: UUID,
      status: 'pending',
      rawValue: 12,
    });
    expect(result.success).toBe(true);
  });

  it('rejette une valeur > 100', () => {
    const result = setGradeSchema.safeParse({
      enrollmentId: UUID,
      status: 'graded',
      rawValue: 101,
    });
    expect(result.success).toBe(false);
  });

  it('rejette une valeur < 0', () => {
    const result = setGradeSchema.safeParse({
      enrollmentId: UUID,
      status: 'graded',
      rawValue: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejette un enrollmentId vide', () => {
    const result = setGradeSchema.safeParse({
      enrollmentId: '',
      status: 'graded',
      rawValue: 10,
    });
    expect(result.success).toBe(false);
  });
});

describe('bulkSetGradesSchema', () => {
  it('rejette un tableau de notes vide', () => {
    const result = bulkSetGradesSchema.safeParse({ grades: [] });
    expect(result.success).toBe(false);
  });

  it('rejette plus de 100 notes en un seul envoi', () => {
    const grades = Array.from({ length: 101 }, (_, i) => ({
      enrollmentId: UUID,
      status: 'graded',
      rawValue: 10,
    }));
    const result = bulkSetGradesSchema.safeParse({ grades });
    expect(result.success).toBe(false);
  });

  it('accepte un tableau valide de notes', () => {
    const grades = [
      { enrollmentId: UUID, status: 'graded', rawValue: 15 },
      { enrollmentId: UUID, status: 'absent_excused' },
      { enrollmentId: UUID, status: 'pending' },
    ];
    const result = bulkSetGradesSchema.safeParse({ grades });
    expect(result.success).toBe(true);
  });
});
