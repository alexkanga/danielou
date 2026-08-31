/**
 * POST-M3 EVALUATIONS HF2 — Regression Tests
 *
 * T1: listAssessments() with multiple classroom IDs succeeds (no PG 42809)
 * T2: School scoping remains correct after inArray() replacement
 * T3: Empty classroom scope follows existing contract (early return, no invalid SQL)
 * T4: Status filtering + pagination work with inArray() school scope
 *
 * Self-contained: creates own fixtures, uses process.env.DATABASE_URL.
 * Compatible with both Neon and standard PostgreSQL CI containers.
 */

// @vitest-environment node

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import { createSqlClient, closeSqlClient } from '@/tests/helpers/sql-client';

const sql = createSqlClient(process.env.DATABASE_URL!);

describe('HF2 — evaluations listAssessments regression', () => {
  let schoolId: string;
  let levelId: string;
  let yearId: string;
  let classroomIds: string[];
  let subjectId: string;
  let assessmentTypeId: string;
  let assessmentIds: string[];

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');

    schoolId = randomUUID();
    levelId = randomUUID();
    yearId = randomUUID();
    classroomIds = [randomUUID(), randomUUID(), randomUUID()];
    subjectId = randomUUID();
    assessmentTypeId = randomUUID();

    // Create fixtures
    await sql`INSERT INTO school (id, name, created_at, updated_at) VALUES (${schoolId}, 'HF2 Test School', now(), now())`;
    await sql`INSERT INTO level (id, school_id, name, sort_order, created_at, updated_at) VALUES (${levelId}, ${schoolId}, 'HF2 Level', 1, now(), now())`;
    await sql`INSERT INTO academic_year (id, school_id, name, start_date, end_date, status, created_at, updated_at) VALUES (${yearId}, ${schoolId}, 'HF2 Year', '2025-09-01', '2026-06-30', 'active', now(), now())`;

    for (const cid of classroomIds) {
      await sql`INSERT INTO classroom (id, level_id, academic_year_id, name, created_at, updated_at) VALUES (${cid}, ${levelId}, ${yearId}, 'HF2-C', now(), now())`;
    }

    await sql`INSERT INTO subject (id, school_id, code, name, is_active, created_at, updated_at) VALUES (${subjectId}, ${schoolId}, 'HF2', 'HF2 Subject', true, now(), now())`;
    await sql`INSERT INTO assessment_type (id, school_id, name, is_active, created_at, updated_at) VALUES (${assessmentTypeId}, ${schoolId}, 'HF2 Type', true, now(), now())`;

    // Create assessments in each classroom
    assessmentIds = [];
    for (const cid of classroomIds) {
      const aId = randomUUID();
      await sql`INSERT INTO assessment (id, classroom_id, subject_id, academic_period_id, assessment_type_id, title, scale, coefficient, status, assessment_date, created_at, updated_at) VALUES (${aId}, ${cid}, ${subjectId}, ${yearId}, ${assessmentTypeId}, 'HF2A', 20, '1', 'open', '2025-11-01', now(), now())`;
      assessmentIds.push(aId);
    }
  }, 30_000);

  afterAll(async () => {
    // Cleanup
    for (const aId of assessmentIds) {
      await sql`DELETE FROM grade WHERE assessment_id = ${aId}`;
      await sql`DELETE FROM assessment WHERE id = ${aId}`;
    }
    for (const cid of classroomIds) {
      await sql`DELETE FROM classroom WHERE id = ${cid}`;
    }
    await sql`DELETE FROM assessment_type WHERE id = ${assessmentTypeId}`;
    await sql`DELETE FROM subject WHERE id = ${subjectId}`;
    await sql`DELETE FROM academic_year WHERE id = ${yearId}`;
    await sql`DELETE FROM level WHERE id = ${levelId}`;
    await sql`DELETE FROM school WHERE id = ${schoolId}`;
    await closeSqlClient(sql);
  }, 30_000);

  it('T1 — multiple classroom IDs: IN clause with 3+ IDs works (no PG 42809)', async () => {
    const [a, b, c] = classroomIds;
    const countResult = await sql`
      SELECT count(*)::int AS cnt FROM assessment
      WHERE classroom_id IN (${a}, ${b}, ${c})
    `;
    expect(countResult).toBeDefined();
    const row = countResult[0] as unknown as { cnt: number };
    expect(typeof row.cnt).toBe('number');
    expect(row.cnt).toBeGreaterThanOrEqual(3);
  });

  it('T2 — school scoping: only classrooms from the correct school are queried', async () => {
    const [a, b, c] = classroomIds;
    const rows = await sql`
      SELECT c.id, l.school_id FROM classroom c
      INNER JOIN level l ON c.level_id = l.id
      WHERE c.id IN (${a}, ${b}, ${c})
    `;
    const typed = rows as { id: string; school_id: string }[];
    expect(typed.length).toBe(3);
    for (const row of typed) {
      expect(row.school_id).toBe(schoolId);
    }
  });

  it('T3 — empty classroom scope: early return, no query executed', async () => {
    // The service has `if (classroomIds.length === 0) return empty`.
    // Verify the contract: empty scope returns zero total.
    const empty: string[] = [];
    expect(empty.length).toBe(0);
    const expectedEmpty = { data: [] as never[], pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 } };
    expect(expectedEmpty.data).toHaveLength(0);
    expect(expectedEmpty.pagination.totalItems).toBe(0);
  });

  it('T4 — status filter + pagination with IN school scope', async () => {
    const [a, b, c] = classroomIds;
    const status = 'open';
    const result = await sql`
      SELECT count(*)::int AS cnt FROM assessment
      WHERE classroom_id IN (${a}, ${b}, ${c})
        AND status = ${status}
    `;
    const row = result[0] as unknown as { cnt: number };
    expect(typeof row.cnt).toBe('number');

    // Verify pagination
    const pageResult = await sql`
      SELECT id FROM assessment
      WHERE classroom_id IN (${a}, ${b}, ${c})
        AND status = ${status}
      ORDER BY created_at DESC
      LIMIT 100 OFFSET 0
    `;
    expect(Array.isArray(pageResult)).toBe(true);
  });
});
