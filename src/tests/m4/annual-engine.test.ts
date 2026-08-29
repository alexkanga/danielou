/**
 * WS-002-M4 — Annual Calculation Engine Tests
 *
 * Pure deterministic tests for annual scoring (M4-01 through M4-46).
 * Tests import the actual engine functions and use synthetic data.
 */

import { describe, it, expect } from 'vitest';
import { calculateAnnualStudent, calculateAnnualClassAverage, calculateAnnualRanking } from '@/lib/services/results/annual-engine';
import type { PeriodCompositionResult } from '@/lib/services/results/annual.types';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function comp(id: string, status: 'CALCULATED' | 'INCOMPLETE' | 'NO_COMPUTABLE_RESULT', raw: string | null, official: string | null): PeriodCompositionResult {
  return { periodId: id, periodName: `C${id}`, periodType: 'composition', status, raw, official };
}

function pass(id: string, status: 'CALCULATED' | 'INCOMPLETE' | 'NO_COMPUTABLE_RESULT', raw: string | null, official: string | null): PeriodCompositionResult {
  return { periodId: id, periodName: 'Passage', periodType: 'passage', status, raw, official };
}

// ─────────────────────────────────────────────
// M4 Annual Calculation Engine
// ─────────────────────────────────────────────

describe('M4 Annual Calculation Engine', () => {
  // M4-01: regularRaw uses RAW composition values
  it('M4-01: regularRaw uses RAW composition values, not rounded official values', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'CALCULATED', '7.33333333333333333333', '7.33'),
      comp('p2', 'CALCULATED', '8.66666666666666666667', '8.67'),
      pass('p7', 'CALCULATED', '10', '10'),
    ]);
    expect(result.status).toBe('CALCULATED');
    // regularRaw should be (7.333... + 8.666...) / 2 = 8.0 (exactly)
    expect(result.regularRaw).toBe('8');
  });

  // M4-02: regular annual average across six numeric compositions
  it('M4-02: regular annual average across six numeric compositions', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'CALCULATED', '6', '6'), comp('p2', 'CALCULATED', '7', '7'),
      comp('p3', 'CALCULATED', '8', '8'), comp('p4', 'CALCULATED', '9', '9'),
      comp('p5', 'CALCULATED', '7', '7'), comp('p6', 'CALCULATED', '5', '5'),
      pass('p7', 'CALCULATED', '10', '10'),
    ]);
    expect(result.status).toBe('CALCULATED');
    expect(result.regularRaw).toBe('7'); // (6+7+8+9+7+5)/6 = 42/6 = 7
  });

  // M4-03: neutral whole Composition AJ excluded from regular denominator
  it('M4-03: neutral whole Composition AJ excluded from regular denominator', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'CALCULATED', '8', '8'),
      comp('p2', 'NO_COMPUTABLE_RESULT', null, null), // AJ whole comp
      comp('p3', 'CALCULATED', '10', '10'),
      pass('p7', 'CALCULATED', '9', '9'),
    ]);
    expect(result.status).toBe('CALCULATED');
    expect(result.regularRaw).toBe('9'); // (8+10)/2, not (8+0+10)/3
  });

  // M4-04: neutral whole Composition exempt excluded
  it('M4-04: neutral whole Composition exempt excluded from regular denominator', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'CALCULATED', '7', '7'),
      comp('p2', 'NO_COMPUTABLE_RESULT', null, null), // exempt
      pass('p7', 'CALCULATED', '8', '8'),
    ]);
    expect(result.status).toBe('CALCULATED');
    expect(result.regularRaw).toBe('7'); // (7)/1, not (7+0)/2
  });

  // M4-05: neutral whole Composition NE excluded
  it('M4-05: neutral whole Composition NE excluded from regular denominator', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'NO_COMPUTABLE_RESULT', null, null),
      comp('p2', 'CALCULATED', '9', '9'),
      comp('p3', 'NO_COMPUTABLE_RESULT', null, null),
      pass('p7', 'CALCULATED', '7', '7'),
    ]);
    expect(result.status).toBe('CALCULATED');
    expect(result.regularRaw).toBe('9');
  });

  // M4-06: whole Composition AI contributes numeric 0
  it('M4-06: whole Composition AI contributes numeric 0', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'CALCULATED', '8', '8'),
      comp('p2', 'CALCULATED', '0', '0'), // AI whole comp
      comp('p3', 'CALCULATED', '10', '10'),
      pass('p7', 'CALCULATED', '8', '8'),
    ]);
    expect(result.status).toBe('CALCULATED');
    expect(result.regularRaw).toBe('6'); // (8+0+10)/3 = 18/3 = 6
  });

  // M4-07: pending regular Composition → annual INCOMPLETE
  it('M4-07: pending regular Composition causes annual INCOMPLETE', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'CALCULATED', '8', '8'),
      comp('p2', 'INCOMPLETE', null, null), // pending
      pass('p7', 'CALCULATED', '9', '9'),
    ]);
    expect(result.status).toBe('INCOMPLETE');
    expect(result.annualRaw).toBeNull();
  });

  // M4-08: missing required Composition result → annual INCOMPLETE
  it('M4-08: missing required Composition result causes annual INCOMPLETE', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'INCOMPLETE', null, null),
      pass('p7', 'CALCULATED', '8', '8'),
    ]);
    expect(result.status).toBe('INCOMPLETE');
  });

  // M4-09: zero contributive regular compositions → DECISION_COUNCIL
  it('M4-09: zero contributive regular compositions → DECISION_COUNCIL', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'NO_COMPUTABLE_RESULT', null, null),
      comp('p2', 'NO_COMPUTABLE_RESULT', null, null),
      pass('p7', 'CALCULATED', '8', '8'),
    ]);
    expect(result.status).toBe('DECISION_COUNCIL');
  });

  // M4-10: numeric Passage receives weight ×2
  it('M4-10: numeric Passage receives weight ×2', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'CALCULATED', '8', '8'),
      pass('p7', 'CALCULATED', '10', '10'),
    ]);
    expect(result.status).toBe('CALCULATED');
    // (8 + 2*10) / 3 = 28/3 = 9.333...
    expect(result.annualOfficial).toBe('9.33');
  });

  // M4-11: Passage AI contributes numeric 0 with ×2 weight
  it('M4-11: Passage AI contributes numeric 0 with ×2 weight', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'CALCULATED', '9', '9'),
      pass('p7', 'CALCULATED', '0', '0'), // AI
    ]);
    expect(result.status).toBe('CALCULATED');
    // (9 + 2*0) / 3 = 9/3 = 3
    expect(result.annualOfficial).toBe('3');
  });

  // M4-12: Passage AJ without catch-up → DECISION_COUNCIL
  it('M4-12: Passage AJ without catch-up → DECISION_COUNCIL', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'CALCULATED', '8', '8'),
      pass('p7', 'NO_COMPUTABLE_RESULT', null, null), // AJ
    ]);
    expect(result.status).toBe('DECISION_COUNCIL');
  });

  // M4-14: Passage pending → INCOMPLETE
  it('M4-14: Passage pending → INCOMPLETE', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'CALCULATED', '8', '8'),
      pass('p7', 'INCOMPLETE', null, null),
    ]);
    expect(result.status).toBe('INCOMPLETE');
  });

  // M4-15: Passage missing → INCOMPLETE (no passage period at all)
  it('M4-15: missing Passage result → INCOMPLETE', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'CALCULATED', '8', '8'),
    ]);
    expect(result.status).toBe('INCOMPLETE');
  });

  // M4-16: Passage exempt → DECISION_COUNCIL
  it('M4-16: Passage exempt → DECISION_COUNCIL', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'CALCULATED', '9', '9'),
      pass('p7', 'NO_COMPUTABLE_RESULT', null, null), // exempt
    ]);
    expect(result.status).toBe('DECISION_COUNCIL');
  });

  // M4-17: Passage NE → DECISION_COUNCIL
  it('M4-17: Passage NE → DECISION_COUNCIL', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'CALCULATED', '7', '7'),
      pass('p7', 'NO_COMPUTABLE_RESULT', null, null), // NE
    ]);
    expect(result.status).toBe('DECISION_COUNCIL');
  });

  // M4-18: golden example regularRaw=8, passageRaw=10 → annualOfficial=9.33
  it('M4-18: golden: regularRaw=8, passageRaw=10 → annualOfficial=9.33', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'CALCULATED', '8', '8'),
      pass('p7', 'CALCULATED', '10', '10'),
    ]);
    expect(result.status).toBe('CALCULATED');
    expect(result.annualOfficial).toBe('9.33');
  });

  // M4-19: annualOfficial HALF_UP to 2 decimals
  it('M4-19: annualOfficial uses HALF_UP rounding to 2 decimals', () => {
    const result = calculateAnnualStudent('s1', [
      comp('p1', 'CALCULATED', '7', '7'),
      comp('p2', 'CALCULATED', '7', '7'),
      comp('p3', 'CALCULATED', '7', '7'),
      pass('p7', 'CALCULATED', '7', '7'),
    ]);
    expect(result.status).toBe('CALCULATED');
    // (7 + 2*7)/3 = 21/3 = 7 → 7.00
    expect(result.annualOfficial).toBe('7');
  });

  // M4-20/21/22: Annual ranking uses competition ranking with ties and gaps
  it('M4-20/21/22: annual ranking uses competition ranking with tie gaps', () => {
    const s1 = calculateAnnualStudent('s1', [comp('p1', 'CALCULATED', '8', '8'), pass('p7', 'CALCULATED', '10', '10')]); // 9.33
    const s2 = calculateAnnualStudent('s2', [comp('p1', 'CALCULATED', '7', '7'), pass('p7', 'CALCULATED', '10', '10')]); // 9.00
    const s3 = calculateAnnualStudent('s3', [comp('p1', 'CALCULATED', '7', '7'), pass('p7', 'CALCULATED', '10', '10')]); // 9.00
    const s4 = calculateAnnualStudent('s4', [comp('p1', 'CALCULATED', '6', '6'), pass('p7', 'CALCULATED', '10', '10')]); // 8.67

    const ranking = calculateAnnualRanking([s1, s2, s3, s4]);
    expect(ranking).toHaveLength(4);
    expect(ranking[0].rank).toBe(1); // 9.33
    expect(ranking[1].rank).toBe(2); // 9.00
    expect(ranking[1].tiedCount).toBe(2);
    expect(ranking[2].rank).toBe(2); // 9.00
    expect(ranking[2].tiedCount).toBe(2);
    expect(ranking[3].rank).toBe(4); // 8.67 (gap after tie)
  });

  // M4-23: INCOMPLETE receives no annual rank
  it('M4-23: INCOMPLETE receives no annual rank', () => {
    const s1 = calculateAnnualStudent('s1', [comp('p1', 'CALCULATED', '8', '8'), pass('p7', 'CALCULATED', '10', '10')]);
    const s2 = calculateAnnualStudent('s2', [comp('p1', 'INCOMPLETE', null, null), pass('p7', 'CALCULATED', '8', '8')]);
    const ranking = calculateAnnualRanking([s1, s2]);
    expect(ranking).toHaveLength(1);
    expect(ranking[0].studentId).toBe('s1');
  });

  // M4-24: DECISION_COUNCIL receives no annual rank
  it('M4-24: DECISION_COUNCIL receives no annual rank', () => {
    const s1 = calculateAnnualStudent('s1', [comp('p1', 'CALCULATED', '8', '8'), pass('p7', 'CALCULATED', '10', '10')]);
    const s2 = calculateAnnualStudent('s2', [comp('p1', 'CALCULATED', '9', '9'), pass('p7', 'NO_COMPUTABLE_RESULT', null, null)]);
    const ranking = calculateAnnualRanking([s1, s2]);
    expect(ranking).toHaveLength(1);
    expect(ranking[0].studentId).toBe('s1');
  });

  // M4-46: annual class average based only on CALCULATED students
  it('M4-46: annual class average based only on CALCULATED students', () => {
    const s1 = calculateAnnualStudent('s1', [comp('p1', 'CALCULATED', '8', '8'), pass('p7', 'CALCULATED', '10', '10')]); // 9.33
    const s2 = calculateAnnualStudent('s2', [comp('p1', 'INCOMPLETE', null, null), pass('p7', 'CALCULATED', '8', '8')]);
    const classAvg = calculateAnnualClassAverage([s1, s2]);
    expect(classAvg.status).toBe('CALCULATED');
    expect(classAvg.studentCount).toBe(1);
    expect(classAvg.annualOfficial).toBe('9.33');
  });
});
