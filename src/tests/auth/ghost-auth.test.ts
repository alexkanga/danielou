import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateGhostCredentials, GHOST_COOKIE_NAME, getGhostCookieOptions, getGhostCookieDeleteOptions } from '@/lib/ghost-auth';
import { getGhostConfig, _resetGhostConfigCache, getBuiltinUsername } from '@/lib/ghost-config';
import { requireGhostGuard, AuthorizationError } from '@/lib/authorization';

const TEST_SECRET = 'test-secret-at-least-32-chars-long!!';

function setGhostEnv(username?: string, password?: string, secret?: string) {
  delete process.env.FANTOMAS_USERNAME;
  delete process.env.FANTOMAS_PASSWORD;
  delete process.env.GHOST_SESSION_SECRET;
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
  afterEach(() => { clearGhostEnv(); });

  it('GHOST-04a: wrong password (with env)', () => {
    setGhostEnv('fantomas', 'fantomas', TEST_SECRET);
    expect(validateGhostCredentials('fantomas', 'wrong')).toBe(false);
  });

  it('GHOST-04b: wrong username (with env)', () => {
    setGhostEnv('fantomas', 'fantomas', TEST_SECRET);
    expect(validateGhostCredentials('impostor', 'fantomas')).toBe(false);
  });

  it('GHOST-04c: both wrong', () => {
    setGhostEnv('fantomas', 'fantomas', TEST_SECRET);
    expect(validateGhostCredentials('impostor', 'wrong')).toBe(false);
  });

  it('GHOST-04d: empty', () => {
    setGhostEnv('fantomas', 'fantomas', TEST_SECRET);
    expect(validateGhostCredentials('', '')).toBe(false);
  });

  it('correct (with env)', () => {
    setGhostEnv('fantomas', 'fantomas', TEST_SECRET);
    expect(validateGhostCredentials('fantomas', 'fantomas')).toBe(true);
  });

  it('case-insensitive username', () => {
    setGhostEnv('fantomas', 'fantomas', TEST_SECRET);
    expect(validateGhostCredentials('FANTOMAS', 'fantomas')).toBe(true);
    expect(validateGhostCredentials('Fantomas', 'fantomas')).toBe(true);
    expect(validateGhostCredentials('  fantomas  ', 'fantomas')).toBe(true);
  });

  it('password case-sensitive', () => {
    setGhostEnv('fantomas', 'fantomas', TEST_SECRET);
    expect(validateGhostCredentials('fantomas', 'FANTOMAS')).toBe(false);
    expect(validateGhostCredentials('fantomas', 'Fantomas')).toBe(false);
  });
});

describe('H2: validateGhostCredentials without env vars (§6, §8)', () => {
  beforeEach(() => { clearGhostEnv(); });
  afterEach(() => { clearGhostEnv(); });

  it('H2-NOENV-01: fantomas/fantomas works with ZERO env vars', () => {
    expect(validateGhostCredentials('fantomas', 'fantomas')).toBe(true);
  });

  it('H2-NOENV-02: wrong password still rejected without env', () => {
    expect(validateGhostCredentials('fantomas', 'wrong')).toBe(false);
  });

  it('H2-NOENV-03: wrong username still rejected without env', () => {
    expect(validateGhostCredentials('impostor', 'fantomas')).toBe(false);
  });

  it('H2-NOENV-04: env override for username only', () => {
    process.env.FANTOMAS_USERNAME = 'custom_admin';
    _resetGhostConfigCache();
    // Built-in fantomas no longer matches
    expect(validateGhostCredentials('fantomas', 'fantomas')).toBe(false);
    // Custom username matches with built-in password
    expect(validateGhostCredentials('custom_admin', 'fantomas')).toBe(true);
  });

  it('H2-NOENV-05: env override for password only', () => {
    process.env.FANTOMAS_PASSWORD = 'custom_pass';
    _resetGhostConfigCache();
    expect(validateGhostCredentials('fantomas', 'fantomas')).toBe(false);
    expect(validateGhostCredentials('fantomas', 'custom_pass')).toBe(true);
  });
});

describe('Ghost Cookie', () => {
  it('GHOST-07: cookie name', () => {
    expect(GHOST_COOKIE_NAME).toBe('danielou_ghost_session');
  });

  it('cookie options', () => {
    const opts = getGhostCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
    expect(opts.maxAge).toBe(604800);
  });

  it('delete options', () => {
    const opts = getGhostCookieDeleteOptions();
    expect(opts.maxAge).toBe(0);
    expect(opts.path).toBe('/');
  });
});

describe('Ghost Config (H2: always available)', () => {
  afterEach(() => { clearGhostEnv(); });

  it('available when all vars set', () => {
    setGhostEnv('fantomas', 'fantomas', TEST_SECRET);
    const config = getGhostConfig();
    expect(config.available).toBe(true);
    expect(config.username).toBe('fantomas');
    expect(config.securityMode).toBe('external_secret');
  });

  it('H2: available when NO vars set (built-in defaults)', () => {
    clearGhostEnv();
    const config = getGhostConfig();
    expect(config.available).toBe(true);
    expect(config.username).toBe('fantomas');
    expect(config.securityMode).toBe('built_in_fallback');
  });

  it('H2: available with secret but no username/password', () => {
    delete process.env.FANTOMAS_USERNAME;
    delete process.env.FANTOMAS_PASSWORD;
    process.env.GHOST_SESSION_SECRET = TEST_SECRET;
    _resetGhostConfigCache();
    const config = getGhostConfig();
    expect(config.available).toBe(true);
    expect(config.username).toBe('fantomas');
    expect(config.securityMode).toBe('external_secret');
  });

  it('H2: available with username override but no password', () => {
    process.env.FANTOMAS_USERNAME = 'admin';
    delete process.env.FANTOMAS_PASSWORD;
    delete process.env.GHOST_SESSION_SECRET;
    _resetGhostConfigCache();
    const config = getGhostConfig();
    expect(config.available).toBe(true);
    expect(config.username).toBe('admin');
    expect(config.password).toBe('fantomas'); // built-in default
  });

  it('H2: built-in username constant', () => {
    expect(getBuiltinUsername()).toBe('fantomas');
  });
});

describe('requireGhostGuard', () => {
  it('SUPER_ADMIN FORBIDDEN', () => {
    expect(() => requireGhostGuard('super_admin', false)).toThrow(AuthorizationError);
  });

  it('Ghost no error', () => {
    expect(() => requireGhostGuard('ghost', true)).not.toThrow();
  });
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

  it('has NO Better Auth imports', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path');
    const content = fs.readFileSync(path.resolve(__dirname, '../../lib/ghost-auth.ts'), 'utf-8');
    expect(content).not.toContain('better-auth');
  });
});
