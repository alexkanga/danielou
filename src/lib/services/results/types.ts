/**
 * M5 Results & Report Cards — Type Definitions
 *
 * OWNER DECISION — POLICY C (CANONICAL):
 *   Assessment: RAW only
 *   Component:  RAW only
 *   Subject:    rawValue + officialValue
 *   General:    rawValue + officialValue
 *
 * general_average_input_policy (on PedagogicalConfig):
 *   SUBJECT_OFFICIAL — use subject.officialValue for general average weighting
 *   SUBJECT_RAW      — use subject.rawValue for general average weighting
 */

// ─────────────────────────────────────────────
// Grade status behavior
// ─────────────────────────────────────────────

export type GradeStatus =
  | 'graded'
  | 'absent_excused'
  | 'absent_unexcused'
  | 'exempt'
  | 'not_evaluated'
  | 'pending';

/** How a grade status participates in calculation */
export type GradeStatusBehavior =
  | 'CONTRIBUTES'   // Included in average calculation
  | 'EXCLUDED'      // Excluded from average, does not affect denominator
  | 'INCOMPLETE';   // Excluded, but marks the result as incomplete

/**
 * Status → behavior mapping.
 * ABSENCE != ZERO. Only 'graded' contributes a numeric value.
 */
export const GRADE_STATUS_BEHAVIOR: Record<GradeStatus, GradeStatusBehavior> = {
  graded: 'CONTRIBUTES',
  absent_excused: 'EXCLUDED',
  absent_unexcused: 'EXCLUDED',
  exempt: 'EXCLUDED',
  not_evaluated: 'EXCLUDED',
  pending: 'INCOMPLETE',
} as const;

/** Statuses that carry a numeric value */
export const NUMERIC_STATUSES: ReadonlySet<GradeStatus> = new Set(['graded']);

/** Statuses that must NOT have a numeric value */
export const NON_GRADE_STATUSES: ReadonlySet<GradeStatus> = new Set([
  'absent_excused',
  'absent_unexcused',
  'exempt',
  'not_evaluated',
]);

// ─────────────────────────────────────────────
// Aggregation & rounding
// ─────────────────────────────────────────────

export type AggregationPolicy = 'simple_average' | 'weighted_average' | 'single_grade';
export type RoundingStrategyDB = 'half_up' | 'half_even' | 'truncate';
export type RoundingStrategyLib = 'HALF_UP' | 'HALF_EVEN' | 'TRUNCATE';

/** Map DB rounding enum to decimal.ts rounding enum */
export const ROUNDING_MAP: Record<RoundingStrategyDB, RoundingStrategyLib> = {
  half_up: 'HALF_UP',
  half_even: 'HALF_EVEN',
  truncate: 'TRUNCATE',
};

// ─────────────────────────────────────────────
// General average input policy (OWNER DECISION)
// ─────────────────────────────────────────────

/**
 * Determines which subject value enters the general average calculation.
 * Versioned with PedagogicalConfig.
 */
export type GeneralAverageInputPolicy = 'SUBJECT_OFFICIAL' | 'SUBJECT_RAW';

/** Map DB enum to typed value */
export const GENERAL_INPUT_POLICY_MAP: Record<string, GeneralAverageInputPolicy> = {
  subject_official: 'SUBJECT_OFFICIAL',
  subject_raw: 'SUBJECT_RAW',
};

// ─────────────────────────────────────────────
// Calculation input types
// ─────────────────────────────────────────────

export interface GradeInput {
  id: string;
  rawValue: string | null;
  status: GradeStatus;
  /** The scale of this grade (e.g. 20) */
  scale: number;
  /** The assessment coefficient (for weighted_average at assessment level) */
  coefficient: string;
}

export interface AssessmentResult {
  assessmentId: string;
  configComponentId: string | null;
  /** RAW full-precision result, or null if excluded/incomplete */
  result: string | null;
  /** Whether any grade is INCOMPLETE (pending) */
  isIncomplete: boolean;
  /** Count of grades that CONTRIBUTE */
  contributingCount: number;
  /** Count of grades excluded by status (absent, exempt, etc.) */
  excludedCount: number;
}

export interface ComponentInput {
  componentId: string;
  componentName: string;
  coefficient: string;
  /** Component-level scale (target for normalization) */
  scale: number;
  aggregation: AggregationPolicy;
  assessmentResults: AssessmentResult[];
}

export interface ComponentResult {
  componentId: string;
  componentName: string;
  /** RAW full-precision result */
  result: string | null;
  isIncomplete: boolean;
  contributingAssessments: number;
  excludedAssessments: number;
}

export interface SubjectInput {
  subjectId: string;
  configSubjectId: string;
  subjectName: string;
  coefficient: string;
  includeInAverage: boolean;
  aggregation: AggregationPolicy;
  /** Subject-level scale */
  scale: number;
  componentResults: ComponentResult[];
  /** Direct assessment results (for subjects without components) */
  assessmentResults: AssessmentResult[];
}

export interface SubjectResult {
  subjectId: string;
  subjectName: string;
  configSubjectId: string;
  coefficient: string;
  includeInAverage: boolean;
  /** Full-precision calculated subject result */
  rawValue: string | null;
  /** Official display/storage value = round(rawValue, subjectDecimalPlaces, roundingStrategy) */
  officialValue: string | null;
  /** Weighted points using the value selected by general_average_input_policy */
  weightedPoints: string | null;
  isIncomplete: boolean;
  /** Component details (for snapshot) */
  componentDetails?: ComponentResult[];
  /** Assessment details (for subjects without components) */
  assessmentDetails?: AssessmentResult[];
}

export interface GeneralAverageInput {
  subjectResults: SubjectResult[];
  /** General average calculation policy (from pedagogicalConfig) */
  calculationPolicy: AggregationPolicy;
  /** Which subject value to use: SUBJECT_OFFICIAL or SUBJECT_RAW */
  inputPolicy: GeneralAverageInputPolicy;
}

export interface GeneralAverageOutput {
  /** Official display/storage value */
  officialValue: string;
  /** Full-precision raw value (before rounding) */
  rawValue: string;
  /** Sum of weighted points */
  totalWeightedPoints: string;
  /** Sum of eligible subject coefficients */
  totalEligibleCoefficient: string;
  /** Number of subjects included */
  subjectsIncluded: number;
  /** Number of subjects excluded (includeInAverage=false) */
  subjectsExcluded: number;
  /** Whether any subject is incomplete */
  isIncomplete: boolean;
}

export interface ClassStatistics {
  classAverage: string;
  minAverage: string;
  maxAverage: string;
  /** Student count used for statistics */
  studentCount: number;
}

export interface RankingEntry {
  studentId: string;
  average: string;
  rank: number;
  /** Number of students tied at this rank */
  tiedCount: number;
}

// ─────────────────────────────────────────────
// Report card types
// ─────────────────────────────────────────────

export type ReportCardStatus = 'draft' | 'ready' | 'validated' | 'published';

export interface ReportCardSnapshot {
  enrollmentId: string;
  studentId: string;
  academicPeriodId: string;
  configVersionId: string;
  generalInputPolicy: GeneralAverageInputPolicy;
  roundingStrategy: RoundingStrategyDB;
  subjectDecimalPlaces: number;
  generalDecimalPlaces: number;
  subjectResults: SubjectResult[];
  generalAverage: GeneralAverageOutput;
  classStatistics?: Map<string, ClassStatistics>;
  ranking?: RankingEntry[];
}

export interface IncompleteInfo {
  subjectId: string;
  subjectName: string;
  componentId?: string;
  componentName?: string;
  assessmentId?: string;
  reason: string;
}
