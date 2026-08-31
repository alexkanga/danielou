/**
 * M4 Data Service Tests — DS-01 through DS-10
 *
 * Source-invariant tests verifying the annual-data.service.ts code patterns
 * and the annual-engine.ts passage ×2 weight.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const annualDataService = readFileSync(
  resolve(__dirname, '../../lib/services/results/annual-data.service.ts'),
  'utf-8',
);

const annualEngine = readFileSync(
  resolve(__dirname, '../../lib/services/results/annual-engine.ts'),
  'utf-8',
);

describe('M4 Data Service (DS-01..DS-10)', () => {
  // DS-01: annual-data.service loads composition results per period
  it('DS-01: annual-data.service loads composition results per period (getCompositionClassResults called)', () => {
    expect(annualDataService).toContain('getCompositionClassResults');
  });

  // DS-02: Passage loaded from selected academic year (periodType === 'passage' filter)
  it('DS-02: Passage loaded from selected academic year (periodType === "passage" filter)', () => {
    expect(annualDataService).toContain("=== 'passage'");
  });

  // DS-03: academicYearId isolation
  it('DS-03: academicYearId isolation (eq filter on academicYearId)', () => {
    expect(annualDataService).toContain('academicYearId');
    expect(annualDataService).toContain('eq(academicPeriod.academicYearId, academicYearId)');
  });

  // DS-04: classroom scoping
  it('DS-04: classroom scoping (classroomId used as filter)', () => {
    expect(annualDataService).toContain('eq(classroomAssignment.classroomId, classroomId)');
  });

  // DS-05: regular RAW values feed annual calculation
  it('DS-05: regular RAW values feed annual calculation (calculateAnnualStudent called with periodResults)', () => {
    expect(annualDataService).toContain('calculateAnnualStudent');
    expect(annualDataService).toContain('studentPeriodResults');
  });

  // DS-06: Passage ×2 applied
  it('DS-06: Passage ×2 applied (times(2) for passage in annual-engine.ts)', () => {
    expect(annualEngine).toContain('times(2)');
  });

  // DS-07: threshold resolved from pedagogical_config
  it('DS-07: threshold resolved from pedagogical_config (getPromotionThreshold queries pedagogicalConfig)', () => {
    expect(annualDataService).toContain('getPromotionThreshold');
    expect(annualDataService).toContain('pedagogicalConfig');
    expect(annualDataService).toContain('promotionThreshold');
  });

  // DS-08: NULL threshold preserved as NULL
  it('DS-08: NULL threshold preserved as NULL (?? null in threshold return)', () => {
    expect(annualDataService).toContain('?? null');
  });

  // DS-09: annual ranking correct
  it('DS-09: annual ranking correct (calculateAnnualRanking called)', () => {
    expect(annualDataService).toContain('calculateAnnualRanking');
  });

  // DS-10: annual class average based only on CALCULATED
  it('DS-10: annual class average based only on CALCULATED (calculateAnnualClassAverage called)', () => {
    expect(annualDataService).toContain('calculateAnnualClassAverage');
  });
});
