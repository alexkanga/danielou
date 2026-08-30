/**
 * M4 Decision Workflow Tests — DW-01 through DW-15
 *
 * DW-01..DW-10: Pure function tests of validateDecision.
 * DW-11..DW-13: Source-invariant RBAC permission checks.
 * DW-14..DW-15: Source-invariant audit pattern checks.
 */

import { describe, it, expect } from 'vitest';
import { validateDecision } from '@/lib/services/results/recommendation-engine';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const permissions = readFileSync(
  resolve(__dirname, '../../lib/permissions.ts'),
  'utf-8',
);

const decisionService = readFileSync(
  resolve(__dirname, '../../lib/services/results/annual-decision.service.ts'),
  'utf-8',
);

describe('M4 Decision Workflow (DW-01..DW-15)', () => {
  // ─── Pure function tests: validateDecision ───

  // DW-01: PROPOSED_ADMITTED → ADMITTED allowed
  it('DW-01: PROPOSED_ADMITTED → ADMITTED allowed', () => {
    const result = validateDecision('PROPOSED_ADMITTED', 'ADMITTED', null);
    expect(result.allowed).toBe(true);
  });

  // DW-02: PROPOSED_REPEAT → REPEAT allowed
  it('DW-02: PROPOSED_REPEAT → REPEAT allowed', () => {
    const result = validateDecision('PROPOSED_REPEAT', 'REPEAT', null);
    expect(result.allowed).toBe(true);
  });

  // DW-03: PROPOSED_REPEAT → ADMITTED_BY_DEROGATION without justification rejected
  it('DW-03: PROPOSED_REPEAT → ADMITTED_BY_DEROGATION without justification rejected', () => {
    const result = validateDecision('PROPOSED_REPEAT', 'ADMITTED_BY_DEROGATION', null);
    expect(result.allowed).toBe(false);
  });

  // DW-04: PROPOSED_REPEAT → ADMITTED_BY_DEROGATION with justification allowed
  it('DW-04: PROPOSED_REPEAT → ADMITTED_BY_DEROGATION with justification allowed', () => {
    const result = validateDecision('PROPOSED_REPEAT', 'ADMITTED_BY_DEROGATION', 'Bonne attitude');
    expect(result.allowed).toBe(true);
  });

  // DW-05: DECISION_COUNCIL → ADMITTED without justification rejected
  it('DW-05: DECISION_COUNCIL → ADMITTED without justification rejected', () => {
    const result = validateDecision('DECISION_COUNCIL', 'ADMITTED', null);
    expect(result.allowed).toBe(false);
  });

  // DW-06: DECISION_COUNCIL → REPEAT without justification rejected
  it('DW-06: DECISION_COUNCIL → REPEAT without justification rejected', () => {
    const result = validateDecision('DECISION_COUNCIL', 'REPEAT', null);
    expect(result.allowed).toBe(false);
  });

  // DW-07: DECISION_COUNCIL → ADMITTED with justification allowed
  it('DW-07: DECISION_COUNCIL → ADMITTED with justification allowed', () => {
    const result = validateDecision('DECISION_COUNCIL', 'ADMITTED', 'Progrès remarquable');
    expect(result.allowed).toBe(true);
  });

  // DW-08: DECISION_COUNCIL → REPEAT with justification allowed
  it('DW-08: DECISION_COUNCIL → REPEAT with justification allowed', () => {
    const result = validateDecision('DECISION_COUNCIL', 'REPEAT', 'Résultats insuffisants');
    expect(result.allowed).toBe(true);
  });

  // DW-09: INCOMPLETE finalization blocked
  it('DW-09: INCOMPLETE finalization blocked', () => {
    const result = validateDecision('INCOMPLETE', 'ADMITTED', null);
    expect(result.allowed).toBe(false);
  });

  // DW-10: THRESHOLD_NOT_CONFIGURED finalization blocked
  it('DW-10: THRESHOLD_NOT_CONFIGURED finalization blocked', () => {
    const result = validateDecision('THRESHOLD_NOT_CONFIGURED', 'ADMITTED', 'Une raison');
    expect(result.allowed).toBe(false);
  });

  // ─── Source-invariant: RBAC permissions ───

  // DW-11: Teacher unauthorized (school:annual_results:manage NOT in teacher role)
  it('DW-11: Teacher unauthorized — school:annual_results:manage NOT in teacher role', () => {
    // Extract the teacher permission block
    const teacherBlock = permissions.match(/teacher: new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? '';
    expect(teacherBlock).not.toContain('school:annual_results:manage');
  });

  // DW-12: Admin authorized (school:annual_results:manage IN admin role)
  it('DW-12: Admin authorized — school:annual_results:manage IN admin role', () => {
    // Extract the admin permission block
    const adminBlock = permissions.match(/admin: new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? '';
    expect(adminBlock).toContain('school:annual_results:manage');
  });

  // DW-13: Ghost compatibility (ghost has all permissions)
  it('DW-13: Ghost compatibility — ghost has all permissions in permissions.ts', () => {
    // Ghost returns true for all permissions
    expect(permissions).toContain("if (platformRole === 'ghost') return true");
  });

  // ─── Source-invariant: Audit patterns ───

  // DW-14: Audit emitted on final decision (logPedagogyAudit called)
  it('DW-14: Audit emitted on final decision (logPedagogyAudit called in decision service)', () => {
    expect(decisionService).toContain('logPedagogyAudit');
    expect(decisionService).toContain('annual_final_decision_recorded');
  });

  // DW-15: previous decision included in audit (previousDecision variable exists and is used)
  it('DW-15: previous decision included in audit (previousDecision variable)', () => {
    expect(decisionService).toContain('previousDecision');
    expect(decisionService).toContain('oldValue: previousDecision');
  });
});
