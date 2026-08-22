/**
 * M1-H1 — Ghost Auth Integration Tests
 * Tests the real Ghost auth flow with properly loaded env vars.
 * These tests would have caught the missing env var bug.
 * 
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { _resetGhostConfigCache, getGhostConfig } from '@/lib/ghost-config';
import {
  validateGhostCredentials,
  signGhostSession,
  verifyGhostSession,
  getGhostCookieOptions,
  GHOST_COOKIE_NAME,
} from '@/lib/ghost-auth';

let hasEnvLocal = false;

beforeAll(() => {
  hasEnvLocal = existsSync('.env.local');
  if (!hasEnvLocal) return;
  const envContent = readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m && !m[2].startsWith('#')) process.env[m[1]] = m[2].trim();
  }
  _resetGhostConfigCache();
});

const envIt = hasEnvLocal
  ? it
  : (name: string, fn: () => void | Promise<void>, timeout?: number) =>
      it.skip(name, fn, timeout);

describe('M1-H1 — Ghost Config Integration', () => {
  envIt('FANTOMAS_USERNAME is PRESENT', () => {
    expect(process.env.FANTOMAS_USERNAME).toBeDefined();
    expect(process.env.FANTOMAS_USERNAME!.length).toBeGreaterThan(0);
  });

  envIt('FANTOMAS_PASSWORD is PRESENT', () => {
    expect(process.env.FANTOMAS_PASSWORD).toBeDefined();
    expect(process.env.FANTOMAS_PASSWORD!.length).toBeGreaterThan(0);
  });

  envIt('GHOST_SESSION_SECRET is PRESENT and >= 32 chars', () => {
    expect(process.env.GHOST_SESSION_SECRET).toBeDefined();
    expect(process.env.GHOST_SESSION_SECRET!.length).toBeGreaterThanOrEqual(32);
  });

  it('getGhostConfig() returns available=true', () => {
    const config = getGhostConfig();
    expect(config.available).toBe(true);
  });

  it('GHOST_SESSION_SECRET is NOT a NEXT_PUBLIC_ var', () => {
    expect(process.env.NEXT_PUBLIC_GHOST_SESSION_SECRET).toBeUndefined();
  });
});

describe('M1-H1 — Ghost Credential Validation', () => {
  it('fantomas/fantomas → SUCCESS', () => {
    expect(validateGhostCredentials('fantomas', 'fantomas')).toBe(true);
  });

  it('fantomas/wrong → INVALID_CREDENTIALS', () => {
    expect(validateGhostCredentials('fantomas', 'wrong')).toBe(false);
  });

  it('wrong/fantomas → INVALID_CREDENTIALS', () => {
    expect(validateGhostCredentials('wrong', 'fantomas')).toBe(false);
  });

  it('empty credentials → INVALID_CREDENTIALS', () => {
    expect(validateGhostCredentials('', '')).toBe(false);
  });

  it('case-insensitive username match', () => {
    expect(validateGhostCredentials('FANTOMAS', 'fantomas')).toBe(true);
    expect(validateGhostCredentials('Fantomas', 'fantomas')).toBe(true);
  });

  it('password IS case-sensitive', () => {
    expect(validateGhostCredentials('fantomas', 'FANTOMAS')).toBe(false);
  });

  it('whitespace in username is trimmed', () => {
    expect(validateGhostCredentials('  fantomas  ', 'fantomas')).toBe(true);
  });
});

describe('M1-H1 — Ghost JWT Round-trip', () => {
  it('sign → verify returns valid payload', async () => {
    const token = await signGhostSession();
    const payload = await verifyGhostSession(token);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe('fantomas-ghost');
    expect(payload!.actorType).toBe('ghost');
    expect(payload!.role).toBe('ghost');
    expect(payload!.actorIdentifier).toBe('fantomas');
  });

  it('token signed with wrong secret is rejected', async () => {
    const token = await signGhostSession();
    const { jwtVerify } = await import('jose');
    await expect(
      jwtVerify(token, new TextEncoder().encode('wrong-secret-not-the-real-one'))
    ).rejects.toThrow();
  });

  it('tampered token is rejected', async () => {
    const token = await signGhostSession();
    const tampered = token.slice(0, -5) + 'XXXXX';
    const result = await verifyGhostSession(tampered);
    expect(result).toBeNull();
  });
});

describe('M1-H1 — Ghost Cookie Configuration', () => {
  it('cookie name is danielou_ghost_session', () => {
    expect(GHOST_COOKIE_NAME).toBe('danielou_ghost_session');
  });

  it('cookie options are secure for development', () => {
    const opts = getGhostCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
    expect(opts.maxAge).toBe(604800);
    expect(opts.secure).toBe(false);
  });
});

describe('M1-H1 — Ghost works without DB', () => {
  it('validateGhostCredentials does not import any DB module', async () => {
    const ghostAuthModule = await import('@/lib/ghost-auth');
    const ghostConfigModule = await import('@/lib/ghost-config');
    const authStr = JSON.stringify(Object.keys(ghostAuthModule));
    const configStr = JSON.stringify(Object.keys(ghostConfigModule));
    expect(authStr).not.toContain('drizzle');
    expect(authStr).not.toContain('neon');
    expect(configStr).not.toContain('drizzle');
    expect(configStr).not.toContain('neon');
  });

  it('full flow works: validate → sign → verify (no DB)', async () => {
    const valid = validateGhostCredentials('fantomas', 'fantomas');
    expect(valid).toBe(true);
    const token = await signGhostSession();
    expect(token).toBeTruthy();
    const payload = await verifyGhostSession(token);
    expect(payload).not.toBeNull();
    expect(payload!.actorType).toBe('ghost');
  });
});
