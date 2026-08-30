/**
 * M4 Annual Persistence Tests — PD-01 through PD-13
 *
 * Source-invariant tests verifying the annual_result table schema
 * and related code patterns in the Drizzle schema definition.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const schema = readFileSync(
  resolve(__dirname, '../../lib/db/schema/index.ts'),
  'utf-8',
);

describe('M4 Annual Persistence (PD-01..PD-13)', () => {
  // ─── PD-01: annual_result has enrollment_id UNIQUE constraint in schema ───
  it('PD-01: annual_result has enrollment_id UNIQUE constraint in schema', () => {
    // The enrollmentId column in annual_result must have .unique() modifier
    const hasEnrollmentUnique = schema.includes('enrollment_id') && schema.includes('.unique()');
    expect(hasEnrollmentUnique).toBe(true);
  });

  // ─── PD-02: CALCULATED numeric values persisted (regular_raw, passage_raw, annual_raw, annual_official columns exist) ───
  it('PD-02: CALCULATED numeric values persisted (regular_raw, passage_raw, annual_raw, annual_official)', () => {
    expect(schema).toContain("regularRaw: numeric('regular_raw'");
    expect(schema).toContain("passageRaw: numeric('passage_raw'");
    expect(schema).toContain("annualRaw: numeric('annual_raw'");
    expect(schema).toContain("annualOfficial: numeric('annual_official'");
  });

  // ─── PD-03: INCOMPLETE status exists, no fake annual numeric result columns forced NOT NULL ───
  it('PD-03: INCOMPLETE status exists, no fake annual numeric columns forced NOT NULL', () => {
    // 'incomplete' must exist in the annual_calculation_status enum
    expect(schema).toContain("annual_calculation_status");
    expect(schema).toContain("'incomplete'");

    // The numeric columns should NOT be .notNull() — they are nullable for INCOMPLETE
    // Verify regularRaw does NOT have .notNull() adjacent to its definition
    const regularRawLine = schema.match(/regularRaw: numeric[^}]+/)?.[0] ?? '';
    expect(regularRawLine).not.toContain('.notNull()');
  });

  // ─── PD-04: DECISION_COUNCIL status exists in enum ───
  it('PD-04: DECISION_COUNCIL status exists in enum', () => {
    expect(schema).toContain("'decision_council'");
  });

  // ─── PD-05: promotion_threshold_snapshot column exists ───
  it('PD-05: promotion_threshold_snapshot column exists', () => {
    expect(schema).toContain("promotionThresholdSnapshot: numeric('promotion_threshold_snapshot'");
  });

  // ─── PD-06: system_recommendation column + enum exists ───
  it('PD-06: system_recommendation column + enum exists', () => {
    // The enum
    expect(schema).toContain("annual_recommendation");
    expect(schema).toContain("'proposed_admitted'");
    expect(schema).toContain("'proposed_repeat'");
    expect(schema).toContain("'threshold_not_configured'");
    // The column
    expect(schema).toContain("systemRecommendation: annualRecommendationEnum('system_recommendation')");
  });

  // ─── PD-07: final_decision column + enum exists (separate from calculation_status) ───
  it('PD-07: final_decision column + enum exists (separate from calculation_status)', () => {
    // Separate enum for final decisions
    expect(schema).toContain("annual_final_decision");
    expect(schema).toContain("'admitted'");
    expect(schema).toContain("'repeat'");
    expect(schema).toContain("'admitted_by_derogation'");
    // The column
    expect(schema).toContain("finalDecision: annualFinalDecisionEnum('final_decision')");
  });

  // ─── PD-08: decision_justification column exists (TEXT nullable) ───
  it('PD-08: decision_justification column exists (TEXT nullable)', () => {
    expect(schema).toContain("decisionJustification: text('decision_justification')");
    // Should NOT have .notNull() — it's nullable
    const justificationLine = schema.match(/decisionJustification: text[^}]+/)?.[0] ?? '';
    expect(justificationLine).not.toContain('.notNull()');
  });

  // ─── PD-09: decided_by column exists (FK to user) ───
  it('PD-09: decided_by column exists (FK to user)', () => {
    expect(schema).toContain("decidedBy: uuid('decided_by').references(() => user.id)");
  });

  // ─── PD-10: decided_at column exists (TIMESTAMPTZ nullable) ───
  it('PD-10: decided_at column exists (TIMESTAMPTZ nullable)', () => {
    expect(schema).toContain("decidedAt: timestamp('decided_at', { withTimezone: true })");
    // Should NOT have .notNull() — it's nullable
    const decidedAtLine = schema.match(/decidedAt: timestamp\('decided_at'[^)]+\)[^{]+/)?.[0] ?? '';
    expect(decidedAtLine).not.toContain('.notNull()');
  });

  // ─── PD-11: config_version_id column exists (FK to pedagogical_config) ───
  it('PD-11: config_version_id column exists (FK to pedagogical_config)', () => {
    expect(schema).toContain("configVersionId: uuid('config_version_id').references(() => pedagogicalConfig.id)");
  });

  // ─── PD-12: annual_official NOT mutated by decision logic (code does NOT overwrite annualOfficial) ───
  it('PD-12: annual_official NOT mutated by decision logic', () => {
    const decisionService = readFileSync(
      resolve(__dirname, '../../lib/services/results/annual-decision.service.ts'),
      'utf-8',
    );
    // The update .set() must NOT include annualOfficial
    const updateSetBlock = decisionService.match(/\.set\({[^}]+}/)?.[0] ?? '';
    expect(updateSetBlock).not.toContain('annualOfficial');
  });

  // ─── PD-13: annual_result has created_at and updated_at (auditColumns pattern) ───
  it('PD-13: annual_result has created_at and updated_at (auditColumns pattern)', () => {
    // The annualResult table definition should spread auditColumns
    expect(schema).toContain('...auditColumns');
    // Verify the auditColumns mixin defines both timestamps
    expect(schema).toContain("createdAt: timestamp('created_at'");
    expect(schema).toContain("updatedAt: timestamp('updated_at'");
  });
});
