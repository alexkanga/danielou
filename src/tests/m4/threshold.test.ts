/**
 * M4 Threshold Tests — TH-01 through TH-11
 *
 * Tests promotion threshold logic using the pure deriveRecommendation function
 * and Zod validation from createPedagogicalConfigSchema.
 * Source-invariant tests verify code patterns in the decision service.
 */

import { describe, it, expect } from 'vitest';
import { deriveRecommendation } from '@/lib/services/results/recommendation-engine';
import { createPedagogicalConfigSchema } from '@/lib/validations/pedagogy';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const decisionService = readFileSync(
  resolve(__dirname, '../../lib/services/results/annual-decision.service.ts'),
  'utf-8',
);

describe('M4 Threshold Logic (TH-01..TH-11)', () => {
  // ─── TH-01: NULL threshold → THRESHOLD_NOT_CONFIGURED ───
  it('TH-01: NULL threshold → THRESHOLD_NOT_CONFIGURED', () => {
    const result = deriveRecommendation('CALCULATED', '8.5', null);
    expect(result).toBe('THRESHOLD_NOT_CONFIGURED');
  });

  // ─── TH-02: NULL threshold → no PROPOSED_ADMITTED ───
  it('TH-02: NULL threshold → no PROPOSED_ADMITTED', () => {
    const result = deriveRecommendation('CALCULATED', '15', null);
    expect(result).not.toBe('PROPOSED_ADMITTED');
  });

  // ─── TH-03: NULL threshold → no PROPOSED_REPEAT ───
  it('TH-03: NULL threshold → no PROPOSED_REPEAT', () => {
    const result = deriveRecommendation('CALCULATED', '0', null);
    expect(result).not.toBe('PROPOSED_REPEAT');
  });

  // ─── TH-04: threshold = 0 accepted ───
  it('TH-04: threshold = 0 accepted by Zod', () => {
    const parsed = createPedagogicalConfigSchema.safeParse({
      levelId: 'a0000000-0000-4000-a000-000000000001',
      academicYearId: 'a0000000-0000-4000-a000-000000000002',
      promotionThreshold: 0,
    });
    expect(parsed.success).toBe(true);
  });

  // ─── TH-05: threshold = 10 accepted ───
  it('TH-05: threshold = 10 accepted by Zod', () => {
    const parsed = createPedagogicalConfigSchema.safeParse({
      levelId: 'a0000000-0000-4000-a000-000000000001',
      academicYearId: 'a0000000-0000-4000-a000-000000000002',
      promotionThreshold: 10,
    });
    expect(parsed.success).toBe(true);
  });

  // ─── TH-06: threshold < 0 rejected (Zod validation) ───
  it('TH-06: threshold < 0 rejected by Zod', () => {
    const parsed = createPedagogicalConfigSchema.safeParse({
      levelId: 'a0000000-0000-4000-a000-000000000001',
      academicYearId: 'a0000000-0000-4000-a000-000000000002',
      promotionThreshold: -0.1,
    });
    expect(parsed.success).toBe(false);
  });

  // ─── TH-07: threshold > 10 rejected (Zod validation) ───
  it('TH-07: threshold > 10 rejected by Zod', () => {
    const parsed = createPedagogicalConfigSchema.safeParse({
      levelId: 'a0000000-0000-4000-a000-000000000001',
      academicYearId: 'a0000000-0000-4000-a000-000000000002',
      promotionThreshold: 10.1,
    });
    expect(parsed.success).toBe(false);
  });

  // ─── TH-08: annualOfficial > threshold → PROPOSED_ADMITTED ───
  it('TH-08: annualOfficial > threshold → PROPOSED_ADMITTED', () => {
    const result = deriveRecommendation('CALCULATED', '7.5', '5');
    expect(result).toBe('PROPOSED_ADMITTED');
  });

  // ─── TH-09: annualOfficial = threshold → PROPOSED_ADMITTED (boundary: >=) ───
  it('TH-09: annualOfficial = threshold → PROPOSED_ADMITTED (boundary >=)', () => {
    const result = deriveRecommendation('CALCULATED', '5', '5');
    expect(result).toBe('PROPOSED_ADMITTED');
  });

  // ─── TH-10: annualOfficial < threshold → PROPOSED_REPEAT ───
  it('TH-10: annualOfficial < threshold → PROPOSED_REPEAT', () => {
    const result = deriveRecommendation('CALCULATED', '4.99', '5');
    expect(result).toBe('PROPOSED_REPEAT');
  });

  // ─── TH-11: threshold snapshot persisted on final decision (source invariant) ───
  it('TH-11: threshold snapshot persisted on final decision (source invariant)', () => {
    // The decision service should snapshot the threshold when inserting annual result
    expect(decisionService).toContain('promotionThresholdSnapshot');
  });
});
