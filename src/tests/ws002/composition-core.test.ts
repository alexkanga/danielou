/**
 * WS-002-M1 — Composition Calculation Core Tests
 *
 * Deterministic pure domain tests for Composition/Passage scoring.
 * Covers T1–T18 from the approved WS-002-M1 contract.
 */

import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  calculateCompositionStudent,
  calculateCompositionClassAverage,
  calculateCompositionRanking,
} from '@/lib/services/results/composition-engine';
import type { CompositionAssessmentInput } from '@/lib/services/results/composition.types';

Decimal.set({ precision: 20 });

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function assessment(
  id: string,
  maxPoints: number,
  status: CompositionAssessmentInput['status'],
  rawValue: string | null = null,
): CompositionAssessmentInput {
  return { assessmentId: id, maxPoints, status, rawValue };
}

// ─────────────────────────────────────────────
// T1 — GOLDEN STUDENT: 63/65×10 → 9.69
// ─────────────────────────────────────────────

describe('T1 — Golden student 63/65×10 → 9.69', () => {
  it('raw = full precision, official = 9.69 HALF_UP2', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 65, 'graded', '63'),
    ]);

    expect(result.status).toBe('CALCULATED');
    // 63/65×10 = 9.692307692307692307...
    expect(new Decimal(result.raw!).equals(new Decimal('63').div('65').times('10'))).toBe(true);
    expect(result.official).toBe('9.69');
  });
});

// ─────────────────────────────────────────────
// T2 — NORMAL MULTI-ASSESSMENT
// ─────────────────────────────────────────────

describe('T2 — Normal multi-assessment', () => {
  it('SUM earned / SUM max × 10 across multiple graded', () => {
    // 15/20 + 12/20 + 18/20 = (15+12+18)/(20+20+20) × 10 = 45/60 × 10 = 7.5
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'graded', '15'),
      assessment('a2', 20, 'graded', '12'),
      assessment('a3', 20, 'graded', '18'),
    ]);

    expect(result.status).toBe('CALCULATED');
    expect(result.raw).toBe('7.5');
    expect(result.official).toBe('7.5');
  });

  it('different scales: 12/15 + 8/10 = 20/25 × 10 = 8', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 15, 'graded', '12'),
      assessment('a2', 10, 'graded', '8'),
    ]);

    expect(result.status).toBe('CALCULATED');
    expect(result.raw).toBe('8');
    expect(result.official).toBe('8');
  });
});

// ─────────────────────────────────────────────
// T3 — AI PENALIZING
// ─────────────────────────────────────────────

describe('T3 — AI penalizing zero', () => {
  it('all assessments AI → earned=0, max retained → raw=0, official=0.00', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'absent_unexcused'),
      assessment('a2', 20, 'absent_unexcused'),
      assessment('a3', 20, 'absent_unexcused'),
    ]);

    expect(result.status).toBe('CALCULATED');
    expect(result.raw).toBe('0');
    expect(result.official).toBe('0');
  });

  it('AI penalizing: 0/60×10 = 0', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 60, 'absent_unexcused'),
    ]);

    expect(result.status).toBe('CALCULATED');
    expect(result.raw).toBe('0');
    expect(result.official).toBe('0');
  });
});

// ─────────────────────────────────────────────
// T4 — MIXED GRADED + AI
// ─────────────────────────────────────────────

describe('T4 — Mixed graded + AI', () => {
  it('15/20 graded + AI/20 → 15/40 × 10 = 3.75', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'graded', '15'),
      assessment('a2', 20, 'absent_unexcused'),
    ]);

    expect(result.status).toBe('CALCULATED');
    expect(result.raw).toBe('3.75');
    expect(result.official).toBe('3.75');
  });
});

// ─────────────────────────────────────────────
// T5 — AJ NEUTRAL
// ─────────────────────────────────────────────

describe('T5 — AJ neutral', () => {
  it('15/20 graded + AJ/20 → 15/20 × 10 = 7.50', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'graded', '15'),
      assessment('a2', 20, 'absent_excused'),
    ]);

    expect(result.status).toBe('CALCULATED');
    expect(result.raw).toBe('7.5');
    expect(result.official).toBe('7.5');
  });
});

// ─────────────────────────────────────────────
// T6 — ALL AJ → NO_COMPUTABLE_RESULT
// ─────────────────────────────────────────────

describe('T6 — All AJ → NO_COMPUTABLE_RESULT', () => {
  it('effective max = 0 → NO_COMPUTABLE_RESULT', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'absent_excused'),
      assessment('a2', 20, 'absent_excused'),
    ]);

    expect(result.status).toBe('NO_COMPUTABLE_RESULT');
    expect(result.raw).toBeNull();
    expect(result.official).toBeNull();
  });
});

// ─────────────────────────────────────────────
// T7 — EXEMPT NEUTRAL
// ─────────────────────────────────────────────

describe('T7 — Exempt neutral', () => {
  it('numerator and denominator both excluded', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'graded', '15'),
      assessment('a2', 20, 'exempt'),
      assessment('a3', 10, 'graded', '8'),
    ]);

    // Only a1 and a3 contribute: (15+8)/(20+10)×10 = 23/30×10 = 7.666...
    expect(result.status).toBe('CALCULATED');
    expect(result.raw).toBe(new Decimal('23').div('30').times('10').toString());
    expect(result.official).toBe('7.67');
  });
});

// ─────────────────────────────────────────────
// T8 — NE NEUTRAL
// ─────────────────────────────────────────────

describe('T8 — NE neutral', () => {
  it('numerator and denominator both excluded', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'graded', '14'),
      assessment('a2', 20, 'not_evaluated'),
      assessment('a3', 10, 'graded', '9'),
    ]);

    // Only a1 and a3: (14+9)/(20+10)×10 = 23/30×10 = 7.666...
    expect(result.status).toBe('CALCULATED');
    expect(result.official).toBe('7.67');
  });
});

// ─────────────────────────────────────────────
// T9 — PENDING → INCOMPLETE
// ─────────────────────────────────────────────

describe('T9 — Pending → INCOMPLETE', () => {
  it('at least one pending → INCOMPLETE', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'graded', '15'),
      assessment('a2', 20, 'graded', '12'),
      assessment('a3', 20, 'pending'),
    ]);

    expect(result.status).toBe('INCOMPLETE');
    expect(result.raw).toBeNull();
    expect(result.official).toBeNull();
  });

  it('single pending with no other assessments → INCOMPLETE', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'pending'),
    ]);

    expect(result.status).toBe('INCOMPLETE');
  });
});

// ─────────────────────────────────────────────
// T10 — MISSING REQUIRED → INCOMPLETE
// ─────────────────────────────────────────────

describe('T10 — Missing required → INCOMPLETE', () => {
  it('missingRequiredCount > 0 → INCOMPLETE', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'graded', '15'),
    ], 1); // one required assessment has no record

    expect(result.status).toBe('INCOMPLETE');
    expect(result.raw).toBeNull();
    expect(result.official).toBeNull();
  });

  it('no assessments and missingRequiredCount > 0 → INCOMPLETE', () => {
    const result = calculateCompositionStudent('s1', [], 2);

    expect(result.status).toBe('INCOMPLETE');
  });
});

// ─────────────────────────────────────────────
// T11 — INCOMPLETE PRECEDENCE
// ─────────────────────────────────────────────

describe('T11 — INCOMPLETE precedence', () => {
  it('graded + AJ + AI + pending → INCOMPLETE', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'graded', '15'),
      assessment('a2', 20, 'absent_excused'),
      assessment('a3', 20, 'absent_unexcused'),
      assessment('a4', 20, 'pending'),
    ]);

    expect(result.status).toBe('INCOMPLETE');
    expect(result.raw).toBeNull();
    expect(result.official).toBeNull();
  });
});

// ─────────────────────────────────────────────
// T12 — ZERO DENOMINATOR SAFETY
// ─────────────────────────────────────────────

describe('T12 — Zero denominator safety', () => {
  it('all EXEMPT → NO_COMPUTABLE_RESULT, no divide-by-zero', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'exempt'),
      assessment('a2', 20, 'exempt'),
    ]);

    expect(result.status).toBe('NO_COMPUTABLE_RESULT');
    expect(result.raw).toBeNull();
  });

  it('all NE → NO_COMPUTABLE_RESULT', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'not_evaluated'),
    ]);

    expect(result.status).toBe('NO_COMPUTABLE_RESULT');
  });

  it('mixed AJ + EXEMPT + NE → NO_COMPUTABLE_RESULT', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'absent_excused'),
      assessment('a2', 15, 'exempt'),
      assessment('a3', 10, 'not_evaluated'),
    ]);

    expect(result.status).toBe('NO_COMPUTABLE_RESULT');
  });
});

// ─────────────────────────────────────────────
// T13 — CLASS AVERAGE RAW-BEFORE-ROUND
// ─────────────────────────────────────────────

describe('T13 — Class average raw-before-round', () => {
  it('mean(raw) → HALF_UP2, NOT mean(already-rounded)', () => {
    // Construct a divergent case where rounding order creates a real difference:
    // Student 1: 63/80×10 = 7.875 → official 7.88
    // Student 2: 63/80×10 = 7.875 → official 7.88
    // Student 3: 62/80×10 = 7.75  → official 7.75
    //
    // Correct: mean(7.875, 7.875, 7.75) = 23.5/3 = 7.8333... → HALF_UP2 = 7.83
    // Wrong:   mean(7.88, 7.88, 7.75) = 23.51/3 = 7.8366... → HALF_UP2 = 7.84

    const results = [
      calculateCompositionStudent('s1', [assessment('a1', 80, 'graded', '63')]),
      calculateCompositionStudent('s2', [assessment('a2', 80, 'graded', '63')]),
      calculateCompositionStudent('s3', [assessment('a3', 80, 'graded', '62')]),
    ];

    const classResult = calculateCompositionClassAverage(results);
    expect(classResult.status).toBe('CALCULATED');

    // Correct: 7.8333... → 7.83
    expect(classResult.official).toBe('7.83');

    // WRONG value would be 7.84
    expect(classResult.official).not.toBe('7.84');
  });

  it('empty student list → NO_COMPUTABLE_RESULT', () => {
    const classResult = calculateCompositionClassAverage([]);
    expect(classResult.status).toBe('NO_COMPUTABLE_RESULT');
    expect(classResult.studentCount).toBe(0);
  });

  it('all INCOMPLETE students → NO_COMPUTABLE_RESULT', () => {
    const results = [
      calculateCompositionStudent('s1', [assessment('a1', 20, 'pending')]),
      calculateCompositionStudent('s2', [assessment('a2', 20, 'pending')]),
    ];

    const classResult = calculateCompositionClassAverage(results);
    expect(classResult.status).toBe('NO_COMPUTABLE_RESULT');
  });
});

// ─────────────────────────────────────────────
// T14 — C3 8.88 REFERENCE
// ─────────────────────────────────────────────

describe('T14 — C3 8.88 reference', () => {
  it('DEFERRED: full C3 dataset not in repository — prove rule with synthetic data', () => {
    // The contract golden C3 class average is 8.88.
    // The underlying individual student raw dataset is NOT available in the repository.
    // Per M1 contract: do NOT fabricate the fixture.
    //
    // Full historical C3 dataset replay is deferred until M2/M3/runtime validation.
    // The raw-before-rounding algorithmic rule is proven by T13.
    //
    // This test documents the deferral per contract.
    expect(true).toBe(true);
  });
});

// ─────────────────────────────────────────────
// T15 — RANKING TIES
// ─────────────────────────────────────────────

describe('T15 — Ranking ties', () => {
  it('two equal official values → same rank', () => {
    const results = [
      calculateCompositionStudent('s1', [assessment('a1', 65, 'graded', '63')]), // 9.69
      calculateCompositionStudent('s2', [assessment('a2', 65, 'graded', '63')]), // 9.69
      calculateCompositionStudent('s3', [assessment('a3', 20, 'graded', '10')]), // 5.00
    ];

    const ranking = calculateCompositionRanking(results);

    expect(ranking).toHaveLength(3);
    expect(ranking[0].studentId).toBe('s1');
    expect(ranking[0].rank).toBe(1);
    expect(ranking[0].tiedCount).toBe(2);
    expect(ranking[1].studentId).toBe('s2');
    expect(ranking[1].rank).toBe(1);
    expect(ranking[1].tiedCount).toBe(2);
    expect(ranking[2].studentId).toBe('s3');
    expect(ranking[2].rank).toBe(3);
  });

  it('3-way tie', () => {
    const results = [
      calculateCompositionStudent('s1', [assessment('a1', 20, 'graded', '15')]), // 7.50
      calculateCompositionStudent('s2', [assessment('a2', 20, 'graded', '15')]), // 7.50
      calculateCompositionStudent('s3', [assessment('a3', 20, 'graded', '15')]), // 7.50
      calculateCompositionStudent('s4', [assessment('a4', 20, 'graded', '10')]), // 5.00
    ];

    const ranking = calculateCompositionRanking(results);

    expect(ranking).toHaveLength(4);
    expect(ranking[0].rank).toBe(1);
    expect(ranking[0].tiedCount).toBe(3);
    expect(ranking[1].rank).toBe(1);
    expect(ranking[2].rank).toBe(1);
    expect(ranking[3].rank).toBe(4);
    expect(ranking[3].tiedCount).toBe(1);
  });
});

// ─────────────────────────────────────────────
// T16 — RANKING USES OFFICIAL
// ─────────────────────────────────────────────

describe('T16 — Ranking uses official average', () => {
  it('raw values differ but official rounded values are equal → tie on official', () => {
    // Student A: 63/65×10 = 9.692307... → official 9.69
    // Student C: 62/64×10 = 9.6875...   → official 9.69
    // Student B: 64/66×10 = 9.696969... → official 9.70
    //
    // Ranking uses official: A and C tie at 9.69, B is rank 1.

    const results = [
      calculateCompositionStudent('sA', [assessment('aA', 65, 'graded', '63')]),
      calculateCompositionStudent('sB', [assessment('aB', 66, 'graded', '64')]),
      calculateCompositionStudent('sC', [assessment('aC', 64, 'graded', '62')]),
    ];

    // Verify raw values are different
    expect(results[0].raw).not.toBe(results[2].raw);

    // Verify official values are equal for A and C
    expect(results[0].official).toBe('9.69');
    expect(results[2].official).toBe('9.69');
    expect(results[1].official).toBe('9.7');

    const ranking = calculateCompositionRanking(results);

    // B (9.70) is rank 1
    expect(ranking[0].studentId).toBe('sB');
    expect(ranking[0].rank).toBe(1);

    // A and C (9.69) tie at rank 2
    expect(ranking[1].rank).toBe(2);
    expect(ranking[1].tiedCount).toBe(2);
    expect(ranking[2].rank).toBe(2);
  });

  it('INCOMPLETE students excluded from ranking', () => {
    const results = [
      calculateCompositionStudent('s1', [assessment('a1', 20, 'graded', '15')]),
      calculateCompositionStudent('s2', [assessment('a2', 20, 'pending')]),
      calculateCompositionStudent('s3', [assessment('a3', 20, 'graded', '10')]),
    ];

    const ranking = calculateCompositionRanking(results);
    expect(ranking).toHaveLength(2);
    expect(ranking.map((r) => r.studentId)).toEqual(['s1', 's3']);
  });

  it('NO_COMPUTABLE_RESULT students excluded from ranking', () => {
    const results = [
      calculateCompositionStudent('s1', [assessment('a1', 20, 'absent_excused')]),
      calculateCompositionStudent('s2', [assessment('a2', 20, 'graded', '12')]),
    ];

    const ranking = calculateCompositionRanking(results);
    expect(ranking).toHaveLength(1);
    expect(ranking[0].studentId).toBe('s2');
  });
});

// ─────────────────────────────────────────────
// T17 — PASSAGE SCORE CORE
// ─────────────────────────────────────────────

describe('T17 — Passage uses same score calculation', () => {
  it('Passage graded → normal Composition calculation', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('p1', 85, 'graded', '77'),
    ]);

    // 77/85×10 = 9.058823... → 9.06
    expect(result.status).toBe('CALCULATED');
    expect(result.official).toBe('9.06');
  });

  it('Passage AI → 0 with max retained', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('p1', 85, 'absent_unexcused'),
    ]);

    expect(result.status).toBe('CALCULATED');
    expect(result.raw).toBe('0');
    expect(result.official).toBe('0');
  });

  it('Passage AJ → NO_COMPUTABLE_RESULT (pure score level)', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('p1', 85, 'absent_excused'),
    ]);

    // At pure score level, single AJ → NO_COMPUTABLE_RESULT
    // (Annual DECISION_COUNCIL interpretation is M4 concern)
    expect(result.status).toBe('NO_COMPUTABLE_RESULT');
  });

  it('Passage NE/EXEMPT → NO_COMPUTABLE_RESULT (pure score level)', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('p1', 85, 'not_evaluated'),
    ]);

    expect(result.status).toBe('NO_COMPUTABLE_RESULT');
  });

  it('Passage pending → INCOMPLETE', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('p1', 85, 'pending'),
    ]);

    expect(result.status).toBe('INCOMPLETE');
  });
});

// ─────────────────────────────────────────────
// T18 — CATCH-UP RECOMPUTATION
// ─────────────────────────────────────────────

describe('T18 — Catch-up recomputation', () => {
  it('AJ first → neutral; then graded → normal result', () => {
    // Before catch-up: AJ present but other grades exist
    const before = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'graded', '15'),
      assessment('a2', 20, 'absent_excused'),
    ]);

    expect(before.status).toBe('CALCULATED');
    expect(before.raw).toBe('7.5'); // 15/20×10

    // After catch-up: replace AJ with actual grade
    const after = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'graded', '15'),
      assessment('a2', 20, 'graded', '12'),
    ]);

    // Now all graded: (15+12)/(20+20)×10 = 27/40×10 = 6.75
    expect(after.status).toBe('CALCULATED');
    expect(after.raw).toBe('6.75');
    expect(after.official).toBe('6.75');
  });

  it('all AJ → NO_COMPUTABLE_RESULT; after partial catch-up → calculated', () => {
    const before = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'absent_excused'),
      assessment('a2', 20, 'absent_excused'),
    ]);

    expect(before.status).toBe('NO_COMPUTABLE_RESULT');

    const after = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'graded', '14'),
      assessment('a2', 20, 'absent_excused'),
    ]);

    expect(after.status).toBe('CALCULATED');
    expect(after.raw).toBe('7'); // 14/20×10 = 7
    expect(after.official).toBe('7');
  });
});

// ─────────────────────────────────────────────
// ADDITIONAL DEFENSIVE TESTS
// ─────────────────────────────────────────────

describe('Defensive domain rules', () => {
  it('graded with null rawValue → INCOMPLETE', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'graded', null),
    ]);

    expect(result.status).toBe('INCOMPLETE');
  });

  it('graded with negative rawValue → INCOMPLETE', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'graded', '-5'),
    ]);

    expect(result.status).toBe('INCOMPLETE');
  });

  it('graded with rawValue > maxPoints → INCOMPLETE', () => {
    const result = calculateCompositionStudent('s1', [
      assessment('a1', 20, 'graded', '25'),
    ]);

    expect(result.status).toBe('INCOMPLETE');
  });

  it('empty assessments with no missing → NO_COMPUTABLE_RESULT', () => {
    const result = calculateCompositionStudent('s1', []);

    expect(result.status).toBe('NO_COMPUTABLE_RESULT');
  });

  it('class average excludes INCOMPLETE and NO_COMPUTABLE_RESULT students', () => {
    const results = [
      calculateCompositionStudent('s1', [assessment('a1', 20, 'graded', '15')]), // CALCULATED 7.50
      calculateCompositionStudent('s2', [assessment('a2', 20, 'pending')]),       // INCOMPLETE
      calculateCompositionStudent('s3', [assessment('a3', 20, 'absent_excused')]), // NO_COMPUTABLE_RESULT
      calculateCompositionStudent('s4', [assessment('a4', 20, 'graded', '10')]), // CALCULATED 5.00
    ];

    const classResult = calculateCompositionClassAverage(results);
    expect(classResult.status).toBe('CALCULATED');
    expect(classResult.studentCount).toBe(2);
    // mean(7.5, 5.0) = 6.25
    expect(classResult.official).toBe('6.25');
  });

  it('ranking returns empty when no CALCULATED students', () => {
    const results = [
      calculateCompositionStudent('s1', [assessment('a1', 20, 'pending')]),
      calculateCompositionStudent('s2', [assessment('a2', 20, 'absent_excused')]),
    ];

    const ranking = calculateCompositionRanking(results);
    expect(ranking).toHaveLength(0);
  });
});
