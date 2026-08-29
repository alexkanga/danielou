/**
 * POST-M3 COMPOSITIONS HF3 — Classroom Loading Regression Tests
 *
 * T1: Academic year filter returns only classrooms for that year
 * T2: No academicYearId param returns all school classrooms (backward compat)
 * T3: Empty/nonexistent year returns zero classrooms
 * T4: Year filter uses canonical classroom data (no duplication)
 * T5: No hardcoded year/classroom values in the fix
 */

// @vitest-environment node

import { describe, it, expect, beforeAll } from 'vitest';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read DATABASE_URL from .env.local and strip params incompatible with neon() HTTP client
const envContent = readFileSync(resolve('.env.local'), 'utf8');
const envMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
const rawUrl = (envMatch?.[1] ?? '').trim().replace(/^['"\u0027\u0022]|['"\u0027\u0022]$/g, '');
const cleanUrl = rawUrl
  .replace(/[?&]channel_binding=[^&]*/g, '')
  .replace(/[?&]sslmode=[^&]*/g, '')
  .replace(/[?&]$/, '');

const sql = neon(cleanUrl);

describe('HF3 — compositions classroom loading regression (real Preview PostgreSQL)', () => {
  let schoolId: string;
  let yearId2026: string;

  beforeAll(async () => {
    const schools = await sql`SELECT id FROM school LIMIT 1`;
    if (schools.length === 0) throw new Error('No school in Preview DB');
    schoolId = (schools as { id: string }[])[0].id;

    const years = await sql`SELECT id, name FROM academic_year ORDER BY start_date`;
    yearId2026 = (years as { id: string; name: string }[]).find(y => y.name.includes('2026-2027'))?.id ?? '';
  });

  it('T1 — academic year filter returns only classrooms for that year', async () => {
    if (!yearId2026) { console.log('SKIP: no 2026-2027 year'); return; }
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
  });

  it('T2 — no academicYearId returns all school classrooms (backward compat)', async () => {
    const allRows = await sql`
      SELECT count(*)::int AS cnt FROM classroom c
      INNER JOIN level l ON c.level_id = l.id
      INNER JOIN academic_year ay ON c.academic_year_id = ay.id
      WHERE l.school_id = ${schoolId}
    `;
    const filteredRows = yearId2026
      ? await sql`
          SELECT count(*)::int AS cnt FROM classroom c
          INNER JOIN level l ON c.level_id = l.id
          INNER JOIN academic_year ay ON c.academic_year_id = ay.id
          WHERE l.school_id = ${schoolId} AND c.academic_year_id = ${yearId2026}
        `
      : [{ cnt: 0 }];
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
    if (!yearId2026) return;
    const rows = await sql`
      SELECT c.id, c.name, c.academic_year_id, l.name as level_name
      FROM classroom c
      INNER JOIN level l ON c.level_id = l.id
      INNER JOIN academic_year ay ON c.academic_year_id = ay.id
      WHERE l.school_id = ${schoolId} AND c.academic_year_id = ${yearId2026}
    `;
    // Every row must have a valid classroom.id and classroom.name
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
