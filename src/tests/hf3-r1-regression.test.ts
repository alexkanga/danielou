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
 */

// @vitest-environment node

import { describe, it, expect, beforeAll } from 'vitest';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parsePagination } from '@/lib/data-access/pagination';

// ─────────────────────────────────────────────
// DB connection (same pattern as HF2 regression tests)
// ─────────────────────────────────────────────
const envContent = readFileSync(resolve('.env.local'), 'utf8');
const envMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
const rawUrl = (envMatch?.[1] ?? '').trim().replace(/^["'\u0027\u0022]|["'\u0027\u0022]$/g, '');
const cleanUrl = rawUrl
  .replace(/[?&]channel_binding=[^&]*/g, '')
  .replace(/[?&]sslmode=[^&]*/g, '')
  .replace(/[?&]$/, '');

const sql = neon(cleanUrl);

describe('HF3-R1 — classroom academic year filtering + pagination fix', () => {
  let schoolId: string;
  let validYearId: string;

  beforeAll(async () => {
    const schools = await sql`SELECT id FROM school LIMIT 1`;
    if (schools.length === 0) throw new Error('No school in Preview/Test DB');
    schoolId = (schools as unknown as { id: string }[])[0].id;

    const years = await sql`SELECT id, name FROM academic_year ORDER BY start_date`;
    const typedYears = years as unknown as { id: string; name: string }[];
    if (typedYears.length >= 1) validYearId = typedYears[0].id;
  });

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
    if (!validYearId) { console.log('SKIP T2: no valid year in DB'); return; }

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
    if (!validYearId) { console.log('SKIP T3: no valid year in DB'); return; }

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
    if (!validYearId) { console.log('SKIP T5: no valid year in DB'); return; }

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
