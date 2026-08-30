/**
 * WS-002-M4 — Promotion Recommendation Engine
 *
 * Pure function: derives system recommendation from
 * calculation status + annualOfficial + promotion threshold.
 *
 * CRITICAL OWNER RULE:
 *   NULL threshold → THRESHOLD_NOT_CONFIGURED (never fallback to 5/10/50%).
 *   annualOfficial is the sole comparison basis.
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 20 });

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type RecommendationResult =
  | 'PROPOSED_ADMITTED'
  | 'PROPOSED_REPEAT'
  | 'DECISION_COUNCIL'
  | 'INCOMPLETE'
  | 'THRESHOLD_NOT_CONFIGURED';

// ─────────────────────────────────────────────
// Core function
// ─────────────────────────────────────────────

/**
 * Derive the system promotion recommendation.
 *
 * @param calculationStatus — from annual engine (CALCULATED | INCOMPLETE | DECISION_COUNCIL)
 * @param annualOfficial    — HALF_UP2 annual average, null when not CALCULATED
 * @param promotionThreshold — from pedagogical_config, null = not configured
 */
export function deriveRecommendation(
  calculationStatus: string,
  annualOfficial: string | null,
  promotionThreshold: string | null,
): RecommendationResult {
  // INCOMPLETE → always INCOMPLETE
  if (calculationStatus === 'INCOMPLETE') {
    return 'INCOMPLETE';
  }

  // DECISION_COUNCIL → always DECISION_COUNCIL
  if (calculationStatus === 'DECISION_COUNCIL') {
    return 'DECISION_COUNCIL';
  }

  // CALCULATED
  // NULL threshold → THRESHOLD_NOT_CONFIGURED (CRITICAL OWNER RULE)
  if (promotionThreshold === null) {
    return 'THRESHOLD_NOT_CONFIGURED';
  }

  // annualOfficial should be non-null for CALCULATED status
  if (annualOfficial === null) {
    return 'THRESHOLD_NOT_CONFIGURED';
  }

  const official = new Decimal(annualOfficial);
  const threshold = new Decimal(promotionThreshold);

  // ≥ threshold → PROPOSED_ADMITTED
  if (official.greaterThanOrEqualTo(threshold)) {
    return 'PROPOSED_ADMITTED';
  }

  // < threshold → PROPOSED_REPEAT
  return 'PROPOSED_REPEAT';
}

// ─────────────────────────────────────────────
// Validation helpers (for decision service)
// ─────────────────────────────────────────────

export type FinalDecisionValue = 'ADMITTED' | 'REPEAT' | 'ADMITTED_BY_DEROGATION';

export interface DecisionValidation {
  allowed: boolean;
  reason?: string;
}

/**
 * Validate whether a requested final decision is permissible
 * given the current recommendation state.
 */
export function validateDecision(
  recommendation: RecommendationResult,
  requestedDecision: FinalDecisionValue,
  justification: string | null | undefined,
): DecisionValidation {
  // INCOMPLETE → BLOCKED
  if (recommendation === 'INCOMPLETE') {
    return { allowed: false, reason: 'Le résultat annuel est incomplet. La décision est bloquée.' };
  }

  // THRESHOLD_NOT_CONFIGURED → BLOCKED
  if (recommendation === 'THRESHOLD_NOT_CONFIGURED') {
    return { allowed: false, reason: 'Le seuil de promotion n\'est pas configuré. La décision est bloquée.' };
  }

  // PROPOSED_ADMITTED → only ADMITTED allowed
  if (recommendation === 'PROPOSED_ADMITTED') {
    if (requestedDecision === 'ADMITTED') {
      return { allowed: true };
    }
    return { allowed: false, reason: 'La proposition est « Admis ». Seule la décision « Admettre » est autorisée.' };
  }

  // PROPOSED_REPEAT → REPEAT (no justification) or ADMITTED_BY_DEROGATION (justification required)
  if (recommendation === 'PROPOSED_REPEAT') {
    if (requestedDecision === 'REPEAT') {
      return { allowed: true };
    }
    if (requestedDecision === 'ADMITTED_BY_DEROGATION') {
      if (!justification || justification.trim().length === 0) {
        return { allowed: false, reason: 'Une justification est obligatoire pour une admission par dérogation.' };
      }
      return { allowed: true };
    }
    return { allowed: false, reason: 'Décision non autorisée pour une proposition de redoublement.' };
  }

  // DECISION_COUNCIL → ADMITTED or REPEAT, both require justification
  if (recommendation === 'DECISION_COUNCIL') {
    if (requestedDecision !== 'ADMITTED' && requestedDecision !== 'REPEAT') {
      return { allowed: false, reason: 'Pour un conseil de classe, seule « Admettre » ou « Redoubler » est autorisé.' };
    }
    if (!justification || justification.trim().length === 0) {
      return { allowed: false, reason: 'Une justification est obligatoire pour une décision du conseil de classe.' };
    }
    return { allowed: true };
  }

  // Fallback
  return { allowed: false, reason: 'État non reconnu.' };
}
