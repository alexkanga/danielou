/**
 * WS-002-M4 — Annual Results & Decision
 *
 * Pure mathematical annual calculation engine.
 * No database, no API, no UI dependencies.
 * All arithmetic uses Decimal.js to avoid binary floating-point errors.
 */

import Decimal from 'decimal.js';
import { round, rawSimpleAverage } from '@/lib/decimal';
import { calculateRanking } from './calculation-engine';
import type {
  PeriodCompositionResult,
  AnnualStudentResult,
  AnnualClassResult,
  AnnualRankingEntry,
} from './annual.types';

Decimal.set({ precision: 20 });

// ─────────────────────────────────────────────
// calculateAnnualStudent
// ─────────────────────────────────────────────

/**
 * Compute a single student's annual result from their per-period results.
 *
 * Algorithm:
 *  1. Separate regular compositions vs passage.
 *  2. INCOMPLETE precedence checks.
 *  3. DECISION_COUNCIL checks.
 *  4. Build regularRaw from contributive compositions (RAW values).
 *  5. Handle passage raw.
 *  6. annualRaw = (regularRaw + 2 * passageRaw) / 3
 *  7. annualOfficial = HALF_UP(annualRaw, 2)
 */
export function calculateAnnualStudent(
  studentId: string,
  periodResults: PeriodCompositionResult[],
): AnnualStudentResult {
  // ── 1. Separate regular vs passage ──────────────────
  const regulars = periodResults.filter(
    (p) => p.periodType === 'composition',
  );
  const passages = periodResults.filter(
    (p) => p.periodType === 'passage',
  );

  // ── 2. INCOMPLETE precedence ────────────────────────
  // If ANY regular composition is INCOMPLETE → whole annual is INCOMPLETE
  if (regulars.some((r) => r.status === 'INCOMPLETE')) {
    return {
      studentId,
      status: 'INCOMPLETE',
      regularRaw: null,
      passageRaw: null,
      annualRaw: null,
      annualOfficial: null,
    };
  }

  // If passage exists and is INCOMPLETE → INCOMPLETE
  if (passages.length > 0 && passages.some((p) => p.status === 'INCOMPLETE')) {
    return {
      studentId,
      status: 'INCOMPLETE',
      regularRaw: null,
      passageRaw: null,
      annualRaw: null,
      annualOfficial: null,
    };
  }

  // ── 3. DECISION_COUNCIL / passage-missing checks ─────
  // Passage exists with NO_COMPUTABLE_RESULT → DECISION_COUNCIL
  // (whole passage AJ/exempt/NE)
  if (
    passages.length > 0 &&
    passages.every((p) => p.status === 'NO_COMPUTABLE_RESULT')
  ) {
    return {
      studentId,
      status: 'DECISION_COUNCIL',
      regularRaw: null,
      passageRaw: null,
      annualRaw: null,
      annualOfficial: null,
    };
  }

  // No passage at all → INCOMPLETE (missing required data)
  if (passages.length === 0) {
    return {
      studentId,
      status: 'INCOMPLETE',
      regularRaw: null,
      passageRaw: null,
      annualRaw: null,
      annualOfficial: null,
    };
  }

  // ── 4. Build regularRaw ─────────────────────────────
  // Contributive = status='CALCULATED' (includes AI whole comp with raw=0)
  // Neutral/excluded = status='NO_COMPUTABLE_RESULT' (AJ/exempt/NE whole comp)
  const contributive = regulars.filter(
    (r) => r.status === 'CALCULATED' && r.raw !== null,
  );

  // If no contributive compositions → DECISION_COUNCIL
  if (contributive.length === 0) {
    return {
      studentId,
      status: 'DECISION_COUNCIL',
      regularRaw: null,
      passageRaw: null,
      annualRaw: null,
      annualOfficial: null,
    };
  }

  // regularRaw = SUM(RAW) / COUNT using Decimal arithmetic
  const regularSum = contributive.reduce(
    (acc, c) => acc.plus(new Decimal(c.raw!)),
    new Decimal(0),
  );
  const regularRaw = regularSum
    .div(new Decimal(contributive.length))
    .toString();

  // ── 5. Handle passage ───────────────────────────────
  // At this point passage exists and is not INCOMPLETE or all NO_COMPUTABLE_RESULT.
  // Find the first CALCULATED passage.
  const calcPassage = passages.find((p) => p.status === 'CALCULATED');

  // If no CALCULATED passage (only NO_COMPUTABLE_RESULT ones remain)
  if (!calcPassage) {
    return {
      studentId,
      status: 'DECISION_COUNCIL',
      regularRaw: null,
      passageRaw: null,
      annualRaw: null,
      annualOfficial: null,
    };
  }

  // passageRaw = passage.raw (already /10 from M1)
  // Passage AI contributes 0 (raw = "0") — that is valid and used with ×2 weight (M4-11)
  const passageRaw = calcPassage.raw!;

  // ── 6. Compute annualRaw ────────────────────────────
  // annualRaw = (regularRaw + 2 * passageRaw) / 3
  const regDec = new Decimal(regularRaw);
  const passDec = new Decimal(passageRaw);
  const annualRawValue = regDec
    .plus(passDec.times(2))
    .div(3);
  const annualRaw = annualRawValue.toString();

  // ── 7. annualOfficial = HALF_UP(annualRaw, 2) ───────
  const annualOfficial = round(annualRaw, 2);

  // ── 8. Return CALCULATED ────────────────────────────
  return {
    studentId,
    status: 'CALCULATED',
    regularRaw,
    passageRaw,
    annualRaw,
    annualOfficial,
  };
}

// ─────────────────────────────────────────────
// calculateAnnualClassAverage
// ─────────────────────────────────────────────

/**
 * Compute the class-wide annual average.
 *
 * Only CALCULATED students with non-null annualRaw contribute.
 * Uses rawSimpleAverage for correct decimal averaging,
 * then rounds to HALF_UP 2 decimals.
 */
export function calculateAnnualClassAverage(
  studentResults: AnnualStudentResult[],
): AnnualClassResult {
  const calculable = studentResults.filter(
    (s) => s.status === 'CALCULATED' && s.annualRaw !== null,
  );

  if (calculable.length === 0) {
    // Determine most appropriate status
    const hasIncomplete = studentResults.some(
      (s) => s.status === 'INCOMPLETE',
    );
    const hasDecisionCouncil = studentResults.some(
      (s) => s.status === 'DECISION_COUNCIL',
    );
    const status = hasIncomplete
      ? 'INCOMPLETE'
      : hasDecisionCouncil
        ? 'DECISION_COUNCIL'
        : 'INCOMPLETE';

    return {
      status,
      annualRaw: null,
      annualOfficial: null,
      studentCount: 0,
    };
  }

  const rawAvgs = calculable.map((s) => s.annualRaw!);
  const avgRaw = rawSimpleAverage(rawAvgs);
  const avgOfficial = round(avgRaw, 2);

  return {
    status: 'CALCULATED',
    annualRaw: avgRaw.toString(),
    annualOfficial: avgOfficial,
    studentCount: calculable.length,
  };
}

// ─────────────────────────────────────────────
// calculateAnnualRanking
// ─────────────────────────────────────────────

/**
 * Compute annual ranking for all CALCULATED students.
 *
 * INCOMPLETE and DECISION_COUNCIL students receive no rank (M4-23, M4-24).
 * Uses competition ranking with tie gaps (M4-20, M4-21, M4-22).
 */
export function calculateAnnualRanking(
  studentResults: AnnualStudentResult[],
): AnnualRankingEntry[] {
  const calculable = studentResults.filter(
    (s) => s.status === 'CALCULATED' && s.annualOfficial !== null,
  );

  if (calculable.length === 0) {
    return [];
  }

  // Build { id, value } for the generic calculateRanking
  const entries = calculable.map((s) => ({
    studentId: s.studentId,
    average: s.annualOfficial!,
  }));

  const ranked = calculateRanking(entries);

  return ranked.map((r) => ({
    studentId: r.studentId,
    average: r.average,
    rank: r.rank,
    tiedCount: r.tiedCount,
  }));
}
