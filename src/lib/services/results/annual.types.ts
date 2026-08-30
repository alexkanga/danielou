/**
 * WS-002-M4 — Annual Results & Decision
 *
 * Pure deterministic domain types for annual scoring.
 * No database, no API, no UI dependencies.
 */

import type { CompositionResultStatus } from './composition.types';

// ─────────────────────────────────────────────
// Annual Result States
// ─────────────────────────────────────────────

/**
 * Discriminated union for annual result status.
 *
 * CALCULATED:         Valid numeric annual result exists.
 * INCOMPLETE:         Required composition/passage data is pending or missing.
 * DECISION_COUNCIL:   No valid numeric result can be computed due to
 *                     business semantics (e.g. all regular comps neutral,
 *                     Passage AJ/exempt/NE without catch-up).
 */
export type AnnualResultStatus =
  | 'CALCULATED'
  | 'INCOMPLETE'
  | 'DECISION_COUNCIL';

// ─────────────────────────────────────────────
// Per-Period Composition Result (input to annual)
// ─────────────────────────────────────────────

/**
 * A single student's result for one composition or passage period.
 * This is the OUTPUT from M1/M2 that M4 consumes as INPUT.
 */
export interface PeriodCompositionResult {
  periodId: string;
  periodName: string;
  periodType: 'composition' | 'passage';
  /** Composition result status from M1 */
  status: CompositionResultStatus;
  /** RAW composition average (/10). Null when not CALCULATED. */
  raw: string | null;
  /** HALF_UP2 official average. Null when not CALCULATED. */
  official: string | null;
}

// ─────────────────────────────────────────────
// Annual Student Result
// ─────────────────────────────────────────────

export interface AnnualStudentResult {
  studentId: string;
  /** Annual result status — discriminated union */
  status: AnnualResultStatus;
  /** Regular compositions raw average (before passage weighting). Null when not CALCULATED. */
  regularRaw: string | null;
  /** Passage raw average. Null when not CALCULATED or passage is neutral/missing. */
  passageRaw: string | null;
  /** Full-precision annual raw average. Null when not CALCULATED. */
  annualRaw: string | null;
  /** HALF_UP2 annual official average. Null when not CALCULATED. */
  annualOfficial: string | null;
}

// ─────────────────────────────────────────────
// Annual Class Result
// ─────────────────────────────────────────────

export interface AnnualClassResult {
  status: AnnualResultStatus;
  annualRaw: string | null;
  annualOfficial: string | null;
  studentCount: number;
}

// ─────────────────────────────────────────────
// Annual Ranking Entry
// ─────────────────────────────────────────────

export interface AnnualRankingEntry {
  studentId: string;
  average: string;
  rank: number;
  tiedCount: number;
}

// ─────────────────────────────────────────────
// Full Annual Row (for UI)
// ─────────────────────────────────────────────

/** Per-student annual row with all period breakdowns for the UI table */
export interface AnnualStudentRow {
  enrollmentId: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  /** Per-period composition results, ordered by sortOrder */
  periodResults: PeriodCompositionResult[];
  /** Computed annual result */
  annual: AnnualStudentResult;
  /** Annual rank. Null if not CALCULATED. */
  annualRank: AnnualRankingEntry | null;
  /** Persisted final decision (from DB). Null if not yet decided. */
  persistedFinalDecision?: string | null;
  /** Persisted decision justification. */
  persistedJustification?: string | null;
  /** When the decision was recorded. */
  decidedAt?: string | null;
}
