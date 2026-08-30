/**
 * M4-TH-RUNTIME — Active Promotion Threshold Runtime Tests
 *
 * Verifies the end-to-end path: active config with threshold → resolver → recommendation.
 * Source-invariant tests + pure logic tests for the recommendation engine.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { deriveRecommendation } from '@/lib/services/results/recommendation-engine';

const service = readFileSync(
  resolve(__dirname, '../../lib/services/results/annual-data.service.ts'),
  'utf-8',
);

describe('M4-TH-RUNTIME: Active Promotion Threshold Runtime (TH-RUNTIME-01..08)', () => {
  // ─── TH-RUNTIME-01: active config with threshold 8.50 resolves 8.50 ───
  it('TH-RUNTIME-01: getPromotionThreshold query selects active status', () => {
    // The resolver must filter by status = 'active'
    expect(service).toContain("eq(pedagogicalConfig.status, 'active')");
  });

  it('TH-RUNTIME-01b: getPromotionThreshold selects promotionThreshold column', () => {
    // The resolver must select the promotionThreshold field
    expect(service).toContain('promotionThreshold: pedagogicalConfig.promotionThreshold');
  });

  it('TH-RUNTIME-01c: getPromotionThreshold filters by levelId and academicYearId', () => {
    expect(service).toContain('eq(pedagogicalConfig.levelId, levelId)');
    expect(service).toContain('eq(pedagogicalConfig.academicYearId, academicYearId)');
  });

  // ─── TH-RUNTIME-02: threshold survives activation ───
  it('TH-RUNTIME-02: activation only updates status, not promotionThreshold', () => {
    const configService = readFileSync(
      resolve(__dirname, '../../lib/services/pedagogy/pedagogical-config.service.ts'),
      'utf-8',
    );
    // The activation SET clause only changes status
    expect(configService).toContain(".set({ status: 'active' })");
    // Verify the activation does NOT set promotionThreshold
    const activateBlock = configService.substring(
      configService.indexOf('Activate the target'),
      configService.indexOf('return activated'),
    );
    expect(activateBlock).not.toContain('promotionThreshold');
  });

  // ─── TH-RUNTIME-03: annual API exposes threshold ───
  it('TH-RUNTIME-03: getAnnualClassResults returns promotionThreshold in result', () => {
    expect(service).toContain('promotionThreshold,');
  });

  it('TH-RUNTIME-03b: API route passes through full result including promotionThreshold', () => {
    const apiRoute = readFileSync(
      resolve(__dirname, '../../app/api/annual-results/route.ts'),
      'utf-8',
    );
    // The API route returns the full result object without filtering
    expect(apiRoute).toContain('Response.json(result)');
  });

  // ─── TH-RUNTIME-04: 9.33 > 8.50 → PROPOSED_ADMITTED ───
  it('TH-RUNTIME-04: 9.33 > 8.50 → PROPOSED_ADMITTED', () => {
    expect(deriveRecommendation('CALCULATED', '9.33', '8.50')).toBe('PROPOSED_ADMITTED');
  });

  // ─── TH-RUNTIME-05: 8.50 = 8.50 → PROPOSED_ADMITTED (boundary >=) ───
  it('TH-RUNTIME-05: 8.50 = 8.50 → PROPOSED_ADMITTED', () => {
    expect(deriveRecommendation('CALCULATED', '8.50', '8.50')).toBe('PROPOSED_ADMITTED');
  });

  // ─── TH-RUNTIME-06: 7.00 < 8.50 → PROPOSED_REPEAT ───
  it('TH-RUNTIME-06: 7.00 < 8.50 → PROPOSED_REPEAT', () => {
    expect(deriveRecommendation('CALCULATED', '7.00', '8.50')).toBe('PROPOSED_REPEAT');
  });

  // ─── TH-RUNTIME-07: INCOMPLETE unaffected by threshold ───
  it('TH-RUNTIME-07: INCOMPLETE unaffected by threshold', () => {
    expect(deriveRecommendation('INCOMPLETE', '9.33', '8.50')).toBe('INCOMPLETE');
    expect(deriveRecommendation('INCOMPLETE', null, '8.50')).toBe('INCOMPLETE');
    expect(deriveRecommendation('INCOMPLETE', '0', null)).toBe('INCOMPLETE');
  });

  // ─── TH-RUNTIME-08: DECISION_COUNCIL unaffected by threshold ───
  it('TH-RUNTIME-08: DECISION_COUNCIL unaffected by threshold', () => {
    expect(deriveRecommendation('DECISION_COUNCIL', '5.00', '8.50')).toBe('DECISION_COUNCIL');
    expect(deriveRecommendation('DECISION_COUNCIL', null, '8.50')).toBe('DECISION_COUNCIL');
    expect(deriveRecommendation('DECISION_COUNCIL', '15', null)).toBe('DECISION_COUNCIL');
  });

  // ─── BONUS: NULL threshold always returns THRESHOLD_NOT_CONFIGURED for CALCULATED ───
  it('TH-RUNTIME-BONUS: NULL threshold → THRESHOLD_NOT_CONFIGURED for CALCULATED', () => {
    expect(deriveRecommendation('CALCULATED', '9.33', null)).toBe('THRESHOLD_NOT_CONFIGURED');
    expect(deriveRecommendation('CALCULATED', '0', null)).toBe('THRESHOLD_NOT_CONFIGURED');
  });
});
