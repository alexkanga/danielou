/**
 * WS-002-M1 — Composition Calculation Core
 *
 * Pure deterministic domain types for Composition/Passage scoring.
 * No database, no API, no UI dependencies.
 *
 * Reuses: src/lib/decimal.ts, calculateRanking() from calculation-engine.ts
 */

// ─────────────────────────────────────────────
// Composition Result States
// ─────────────────────────────────────────────

/**
 * Discriminated union for Composition/Passage result status.
 *
 * CALCULATED:        Valid numeric raw/official result exists.
 * INCOMPLETE:        Required data is pending or missing. No numeric result.
 * NO_COMPUTABLE_RESULT: All applicable inputs are legitimately neutral
 *                     (AJ/EXEMPT/NE) with zero effective denominator.
 *                     No numeric result. Not the same as INCOMPLETE.
 */
export type CompositionResultStatus =
  | 'CALCULATED'
  | 'INCOMPLETE'
  | 'NO_COMPUTABLE_RESULT';

// ─────────────────────────────────────────────
// Evaluation Input
// ─────────────────────────────────────────────

/**
 * Input model for a single assessment within a Composition/Passage.
 *
 * For MISSING REQUIRED: represent by omitting the assessment entirely
 * and passing `missingRequiredCount > 0` in the function input,
 * OR by including it with status='pending' if using the assessment-level
 * representation. The pure function accepts either convention.
 */
export interface CompositionAssessmentInput {
  /** Assessment identifier (for traceability, not calculation) */
  assessmentId: string;
  /** Maximum points for this assessment (the scale) */
  maxPoints: number;
  /**
   * Grade status following canonical status model.
   * 'graded' requires a non-null rawValue.
   * Other statuses must have rawValue = null.
   */
  status:
    | 'graded'
    | 'absent_unexcused'
    | 'absent_excused'
    | 'exempt'
    | 'not_evaluated'
    | 'pending';
  /**
   * Raw earned points. Required when status = 'graded'.
   * Must be null for all other statuses.
   */
  rawValue: string | null;
}

// ─────────────────────────────────────────────
// Composition Student Result
// ─────────────────────────────────────────────

/** Student-level Composition/Passage result */
export interface CompositionStudentResult {
  studentId: string;
  status: CompositionResultStatus;
  /** Full-precision raw average (/10 scale). Null when not CALCULATED. */
  raw: string | null;
  /** HALF_UP2 official average. Null when not CALCULATED. */
  official: string | null;
}

// ─────────────────────────────────────────────
// Composition Class Result
// ─────────────────────────────────────────────

/** Class-level Composition/Passage result */
export interface CompositionClassResult {
  status: CompositionResultStatus;
  /** Full-precision raw class average. Null when not CALCULATED. */
  raw: string | null;
  /** HALF_UP2 official class average. Null when not CALCULATED. */
  official: string | null;
  /** Number of CALCULATED students included */
  studentCount: number;
}

// ─────────────────────────────────────────────
// Composition Ranking Entry
// ─────────────────────────────────────────────

/** Ranking entry for Composition/Passage, reusing canonical RankingEntry */
export interface CompositionRankingEntry {
  studentId: string;
  average: string;
  rank: number;
  tiedCount: number;
}
