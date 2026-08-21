import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateGhostCredentials, GHOST_COOKIE_NAME, getGhostCookieOptions, getGhostCookieDeleteOptions } from '@/lib/ghost-auth';
import { getGhostConfig, _resetGhostConfigCache } from '@/lib/ghost-config';
import { requireGhostGuard, AuthorizationError } from '@/lib/authorization';

const TEST_SECRET = 'test-secret-at-least-32-chars-long!!';

function setGhostEnv(username?: string, password?: string, secret?: string) {
  if (username !== undefined) process.env.FANTOMAS_USERNAME = username;
  if (password !== undefined) process.env.FANTOMAS_PASSWORD = password;
  if (secret !== undefined) process.env.GHOST_SESSION_SECRET = secret;
  _resetGhostConfigCache();
}

function clearGhostEnv() {
  delete process.env.FANTOMAS_USERNAME;
  delete process.env.FANTOMAS_PASSWORD;
  delete process.env.GHOST_SESSION_SECRET;
  _resetGhostConfigCache();
}

describe('validateGhostCredentials', () => {
  beforeEach(() => { setGhostEnv('fantomas', 'fantomas', TEST_SECRET); });
  afterEach(() => { clearGhostEnv(); });
  it('GHOST-04a: wrong password', () => { expect(validateGhostCredentials('fantomas', 'wrong')).toBe(false); });
  it('GHOST-04b: wrong username', () => { expect(validateGhostCredentials('impostor', 'fantomas')).toBe(false); });
  it('GHOST-04c: both wrong', () => { expect(validateGhostCredentials('impostor', 'wrong')).toBe(false); });
  it('GHOST-04d: empty', () => { expect(validateGhostCredentials('', '')).toBe(false); });
  it('correct', () => { expect(validateGhostCredentials('fantomas', 'fantomas')).toBe(true); });
  it('case-insensitive username', () => { expect(validateGhostCredentials('FANTOMAS', 'fantomas')).toBe(true); expect(validateGhostCredentials('Fantomas', 'fantomas')).toBe(true); expect(validateGhostCredentials('  fantomas  ', 'fantomas')).toBe(true); });
  it('password case-sensitive', () => { expect(validateGhostCredentials('fantomas', 'FANTOMAS')).toBe(false); expect(validateGhostCredentials('fantomas', 'Fantomas')).toBe(false); });
  it('config unavailable', () => { delete process.env.GHOST_SESSION_SECRET; _resetGhostConfigCache(); expect(validateGhostCredentials('fantomas', 'fantomas')).toBe(false); setGhostEnv('fantomas', 'fantomas', TEST_SECRET); });
});

describe('Ghost Cookie', () => {
  it('GHOST-07: cookie name', () => { expect(GHOST_COOKIE_NAME).toBe('danielou_ghost_session'); });
  it('cookie options', () => { const opts = getGhostCookieOptions(); expect(opts.httpOnly).toBe(true); expect(opts.sameSite).toBe('lax'); expect(opts.path).toBe('/'); expect(opts.maxAge).toBe(604800); });
  it('delete options', () => { const opts = getGhostCookieDeleteOptions(); expect(opts.maxAge).toBe(0); expect(opts.path).toBe('/'); });
});

describe('Ghost Config', () => {
  afterEach(() => { clearGhostEnv(); });
  it('available when all vars set', () => { setGhostEnv('fantomas', 'fantomas', TEST_SECRET); const config = getGhostConfig(); expect(config.available).toBe(true); if (config.available) { expect(config.username).toBe('fantomas'); } });
  it('unavailable when vars missing', () => { delete process.env.FANTOMAS_USERNAME; delete process.env.FANTOMAS_PASSWORD; delete process.env.GHOST_SESSION_SECRET; _resetGhostConfigCache(); const config = getGhostConfig(); expect(config.available).toBe(false); });
});

describe('requireGhostGuard', () => {
  it('SUPER_ADMIN FORBIDDEN', () => { expect(() => requireGhostGuard('super_admin', false)).toThrow(AuthorizationError); });
  it('ADMIN FORBIDDEN', () => { expect(() => requireGhostGuard('none', false)).toThrow(AuthorizationError); });
  it('TEACHER FORBIDDEN', () => { expect(() => requireGhostGuard('none', false)).toThrow(AuthorizationError); });
  it('Ghost no error', () => { expect(() => requireGhostGuard('ghost', true)).not.toThrow(); });
});

describe('Ghost DB Independence', () => {
  it('has NO DB imports', () => {
    const forbidden = ['drizzle-orm', '@neondatabase'];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path');
    const content = fs.readFileSync(path.resolve(__dirname, '../../lib/ghost-auth.ts'), 'utf-8');
    for (const f of forbidden) { expect(content).not.toContain(f); }
  });
});
