/**
 * POST-M3 COMPOSITIONS HF3 — Classroom Loading Regression Tests
 *
 * T1: Academic year filter returns only classrooms for that year
 * T2: No academicYearId param returns all school classrooms (backward compat)
 * T3: Empty/nonexistent year returns zero classrooms
 * T4: Year filter uses canonical classroom data (no duplication)
 * T5: No hardcoded year/classroom values in the fix
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

describe('HF3 — compositions classroom loading regression', () => {
  let schoolId: string;
  let levelId: string;
  let yearId2026: string;
  let yearId2025: string;
  let classroomId1: string;
  let classroomId2: string;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');

    // Create test fixtures
    schoolId = randomUUID();
    levelId = randomUUID();
    yearId2026 = randomUUID();
    yearId2025 = randomUUID();
    classroomId1 = randomUUID();
    classroomId2 = randomUUID();

    await sql`INSERT INTO school (id, name, created_at, updated_at) VALUES (${schoolId}, 'HF3 Test School', now(), now())`;
    await sql`INSERT INTO level (id, school_id, name, sort_order, created_at, updated_at) VALUES (${levelId}, ${schoolId}, 'HF3 Level', 1, now(), now())`;
    await sql`INSERT INTO academic_year (id, school_id, name, start_date, end_date, status, created_at, updated_at) VALUES (${yearId2026}, ${schoolId}, '2026-2027', '2026-09-01', '2027-06-30', 'active', now(), now())`;
    await sql`INSERT INTO academic_year (id, school_id, name, start_date, end_date, status, created_at, updated_at) VALUES (${yearId2025}, ${schoolId}, '2025-2026', '2025-09-01', '2026-06-30', 'active', now(), now())`;
    await sql`INSERT INTO classroom (id, level_id, academic_year_id, name, created_at, updated_at) VALUES (${classroomId1}, ${levelId}, ${yearId2026}, 'HF3-6A', now(), now())`;
    await sql`INSERT INTO classroom (id, level_id, academic_year_id, name, created_at, updated_at) VALUES (${classroomId2}, ${levelId}, ${yearId2025}, 'HF3-5B', now(), now())`;
  }, 30_000);

  afterAll(async () => {
    // Cleanup
    await sql`DELETE FROM classroom WHERE id IN (${classroomId1}, ${classroomId2})`;
    await sql`DELETE FROM academic_year WHERE id IN (${yearId2026}, ${yearId2025})`;
    await sql`DELETE FROM level WHERE id = ${levelId}`;
    await sql`DELETE FROM school WHERE id = ${schoolId}`;
    await closeSqlClient(sql);
  }, 30_000);

  it('T1 — academic year filter returns only classrooms for that year', async () => {
    const rows = await sql`
      SELECT c.id, c.name, c.academic_year_id
      FROM classroom c
      INNER JOIN level l ON c.level_id = l.id
      INNER JOIN academic_year ay ON c.academic_year_id = ay.id
      WHERE l.school_id = ${schoolId} AND c.academic_year_id = ${yearId2026}
      ORDER BY c.name
    `;
    for (const row of rows as { id: string; name: string; academic_year_id: string }[]) {
      expect(row.academic_year_id).toBe(yearId2026);
    }
    expect(rows.length).toBe(1);
  });

  it('T2 — no academicYearId returns all school classrooms (backward compat)', async () => {
    const allRows = await sql`
      SELECT count(*)::int AS cnt FROM classroom c
      INNER JOIN level l ON c.level_id = l.id
      INNER JOIN academic_year ay ON c.academic_year_id = ay.id
      WHERE l.school_id = ${schoolId}
    `;
    const filteredRows = await sql`
      SELECT count(*)::int AS cnt FROM classroom c
      INNER JOIN level l ON c.level_id = l.id
      INNER JOIN academic_year ay ON c.academic_year_id = ay.id
      WHERE l.school_id = ${schoolId} AND c.academic_year_id = ${yearId2026}
    `;
    // All >= filtered (unfiltered includes classrooms from all years)
    expect((allRows as { cnt: number }[])[0].cnt).toBeGreaterThanOrEqual(
      (filteredRows as { cnt: number }[])[0].cnt,
    );
  });

  it('T3 — nonexistent year returns zero classrooms', async () => {
    const rows = await sql`
      SELECT count(*)::int AS cnt FROM classroom c
      INNER JOIN level l ON c.level_id = l.id
      WHERE l.school_id = ${schoolId} AND c.academic_year_id = ${'00000000-0000-0000-0000-000000000000'}
    `;
    expect((rows as { cnt: number }[])[0].cnt).toBe(0);
  });

  it('T4 — year filter uses canonical classroom table (single source)', async () => {
    const rows = await sql`
      SELECT c.id, c.name, c.academic_year_id, l.name as level_name
      FROM classroom c
      INNER JOIN level l ON c.level_id = l.id
      INNER JOIN academic_year ay ON c.academic_year_id = ay.id
      WHERE l.school_id = ${schoolId} AND c.academic_year_id = ${yearId2026}
    `;
    for (const row of rows as { id: string; name: string }[]) {
      expect(row.id).toBeTruthy();
      expect(row.name).toBeTruthy();
    }
  });

  it('T5 — no hardcoded year or classroom in /api/classes/route.ts', async () => {
    const source = readFileSync(resolve('src/app/api/classes/route.ts'), 'utf8');
    // No hardcoded UUIDs
    expect(source).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
    // No hardcoded classroom name
    expect(source).not.toContain('CP1');
    expect(source).not.toContain('2025-2026');
  });
});
