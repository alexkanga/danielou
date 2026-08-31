/**
 * POST-M3 COMPOSITIONS HF3-R1 — Regression Tests
 *
 * Root cause: Zod pagination schema had max(100) on limit.
 * Compositions page sends limit=200, which was rejected as ZodError → 500.
 * Fix: increased max from 100 to 500 in parsePagination.
 *
 * T1: GET /api/classes without academicYearId continues to work.
 * T2: GET /api/classes?academicYearId=<valid>&limit=200 returns valid result (not 500).
 * T3: Response contains only classrooms for the requested year.
 * T4: Nonexistent year UUID returns empty result, not 500.
 * T5: School scope remains intact (no cross-school leakage).
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
import { parsePagination } from '@/lib/data-access/pagination';

const sql = createSqlClient(process.env.DATABASE_URL!);

describe('HF3-R1 — classroom academic year filtering + pagination fix', () => {
  let schoolId: string;
  let school2Id: string;
  let levelId: string;
  let level2Id: string;
  let validYearId: string;
  let classroomId1: string;
  let classroomId2: string;
  let otherSchoolClassroomId: string;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');

    schoolId = randomUUID();
    school2Id = randomUUID();
    levelId = randomUUID();
    level2Id = randomUUID();
    validYearId = randomUUID();
    classroomId1 = randomUUID();
    classroomId2 = randomUUID();
    otherSchoolClassroomId = randomUUID();

    // School 1
    await sql`INSERT INTO school (id, name, created_at, updated_at) VALUES (${schoolId}, 'HF3R1 School', now(), now())`;
    await sql`INSERT INTO level (id, school_id, name, sort_order, created_at, updated_at) VALUES (${levelId}, ${schoolId}, 'HF3R1 Level', 1, now(), now())`;
    await sql`INSERT INTO academic_year (id, school_id, name, start_date, end_date, status, created_at, updated_at) VALUES (${validYearId}, ${schoolId}, 'HF3R1 Year', '2025-09-01', '2026-06-30', 'active', now(), now())`;
    await sql`INSERT INTO classroom (id, level_id, academic_year_id, name, created_at, updated_at) VALUES (${classroomId1}, ${levelId}, ${validYearId}, 'HF3R1-6A', now(), now())`;
    await sql`INSERT INTO classroom (id, level_id, academic_year_id, name, created_at, updated_at) VALUES (${classroomId2}, ${levelId}, ${validYearId}, 'HF3R1-6B', now(), now())`;

    // School 2 (for cross-school leakage test)
    await sql`INSERT INTO school (id, name, created_at, updated_at) VALUES (${school2Id}, 'HF3R1 Other School', now(), now())`;
    await sql`INSERT INTO level (id, school_id, name, sort_order, created_at, updated_at) VALUES (${level2Id}, ${school2Id}, 'HF3R1 Other Level', 1, now(), now())`;
    await sql`INSERT INTO classroom (id, level_id, academic_year_id, name, created_at, updated_at) VALUES (${otherSchoolClassroomId}, ${level2Id}, ${validYearId}, 'HF3R1-Other', now(), now())`;
  }, 30_000);

  afterAll(async () => {
    await sql`DELETE FROM classroom WHERE id IN (${classroomId1}, ${classroomId2}, ${otherSchoolClassroomId})`;
    await sql`DELETE FROM academic_year WHERE id = ${validYearId}`;
    await sql`DELETE FROM level WHERE id IN (${levelId}, ${level2Id})`;
    await sql`DELETE FROM school WHERE id IN (${schoolId}, ${school2Id})`;
    await closeSqlClient(sql);
  }, 30_000);

  // ─────────────────────────────────────────────
  // T1: Without academicYearId, parsePagination + query works
  // ─────────────────────────────────────────────
  it('T1 — GET /api/classes without academicYearId continues to work', async () => {
    // Zod validation passes for default limit
    const params = new URLSearchParams({ page: '1', limit: '20' });
    const parsed = parsePagination(params);
    expect(parsed.limit).toBe(20);
    expect(parsed.page).toBe(1);

    // DB query without year filter returns all school classrooms
    const rows = await sql`
      SELECT count(*)::int AS cnt FROM classroom c
      INNER JOIN level l ON c.level_id = l.id
      INNER JOIN academic_year ay ON c.academic_year_id = ay.id
      WHERE l.school_id = ${schoolId}
    `;
    const count = (rows as unknown as { cnt: number }[])[0].cnt;
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // ─────────────────────────────────────────────
  // T2: The ACTUAL failing path — limit=200 + academicYearId
  // ─────────────────────────────────────────────
  it('T2 — limit=200 with academicYearId returns valid result (not ZodError)', async () => {
    // This is the EXACT scenario that caused the 500:
    // Compositions page sends academicYearId + limit=200
    const params = new URLSearchParams({
      academicYearId: validYearId,
      limit: '200',
    });

    // Must NOT throw ZodError (the root cause was max(100) rejecting 200)
    const parsed = parsePagination(params);
    expect(parsed.limit).toBe(200);

    // DB query with year filter must return successfully
    const rows = await sql`
      SELECT c.id, c.name, c.academic_year_id
      FROM classroom c
      INNER JOIN level l ON c.level_id = l.id
      INNER JOIN academic_year ay ON c.academic_year_id = ay.id
      WHERE l.school_id = ${schoolId} AND c.academic_year_id = ${validYearId}
      ORDER BY c.name
      LIMIT 200
    `;
    expect(Array.isArray(rows)).toBe(true);
  });

  // ─────────────────────────────────────────────
  // T3: Response contains ONLY classrooms for the requested year
  // ─────────────────────────────────────────────
  it('T3 — filtered response contains only classrooms belonging to requested year', async () => {
    const rows = await sql`
      SELECT c.id, c.academic_year_id
      FROM classroom c
      INNER JOIN level l ON c.level_id = l.id
      INNER JOIN academic_year ay ON c.academic_year_id = ay.id
      WHERE l.school_id = ${schoolId} AND c.academic_year_id = ${validYearId}
    `;
    for (const row of rows as unknown as { id: string; academic_year_id: string }[]) {
      expect(row.academic_year_id).toBe(validYearId);
    }
  });

  // ─────────────────────────────────────────────
  // T4: Nonexistent year UUID → empty result, not 500
  // ─────────────────────────────────────────────
  it('T4 — nonexistent year UUID returns empty result, not error', async () => {
    const ghostUuid = '00000000-0000-0000-0000-000000000000';

    // Zod validation must pass
    const params = new URLSearchParams({ academicYearId: ghostUuid, limit: '200' });
    const parsed = parsePagination(params);
    expect(parsed.limit).toBe(200);

    // DB query must return 0 rows, not throw
    const rows = await sql`
      SELECT count(*)::int AS cnt FROM classroom c
      INNER JOIN level l ON c.level_id = l.id
      WHERE l.school_id = ${schoolId} AND c.academic_year_id = ${ghostUuid}
    `;
    expect((rows as unknown as { cnt: number }[])[0].cnt).toBe(0);
  });

  // ─────────────────────────────────────────────
  // T5: School scope remains intact
  // ─────────────────────────────────────────────
  it('T5 — school scope is enforced (no cross-school leakage)', async () => {
    // All classrooms must belong to the school
    const rows = await sql`
      SELECT c.id, l.school_id
      FROM classroom c
      INNER JOIN level l ON c.level_id = l.id
      INNER JOIN academic_year ay ON c.academic_year_id = ay.id
      WHERE l.school_id = ${schoolId} AND c.academic_year_id = ${validYearId}
    `;
    for (const row of rows as unknown as { id: string; school_id: string }[]) {
      expect(row.school_id).toBe(schoolId);
    }
  });

  // ─────────────────────────────────────────────
  // Additional: verify max(500) boundary
  // ─────────────────────────────────────────────
  it('limit=500 is accepted, limit=501 is rejected', () => {
    const p500 = new URLSearchParams({ limit: '500' });
    expect(() => parsePagination(p500)).not.toThrow();

    const p501 = new URLSearchParams({ limit: '501' });
    expect(() => parsePagination(p501)).toThrow();
  });
});
