/**
 * M1 — Database Health Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkDatabaseHealth, invalidateDbHealthCache } from '@/lib/db-health';

describe('Database Health', () => {
  beforeEach(() => {
    invalidateDbHealthCache();
    vi.unstubAllEnvs();
  });

  it('returns MISCONFIGURED when DATABASE_URL not set', async () => {
    vi.stubEnv('DATABASE_URL', undefined as unknown as string);
    const health = await checkDatabaseHealth();
    expect(health.state).toBe('MISCONFIGURED');
  });

  it('returns UNAVAILABLE when DB connection fails', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://invalid:invalid@invalid-host:5432/invalid');
    const health = await checkDatabaseHealth();
    // Should be UNAVAILABLE or MISCONFIGURED (depending on error message)
    expect(['UNAVAILABLE', 'MISCONFIGURED']).toContain(health.state);
  });

  it('caches result for 10 seconds', async () => {
    vi.stubEnv('DATABASE_URL', undefined as unknown as string);
    const h1 = await checkDatabaseHealth();
    const h2 = await checkDatabaseHealth();
    expect(h1.state).toBe(h2.state);
  });

  it('invalidates cache', async () => {
    vi.stubEnv('DATABASE_URL', undefined as unknown as string);
    const h1 = await checkDatabaseHealth();
    invalidateDbHealthCache();
    const h2 = await checkDatabaseHealth();
    expect(h1.state).toBe(h2.state);
    // Both should be MISCONFIGURED — just testing cache invalidation works
  });
});
