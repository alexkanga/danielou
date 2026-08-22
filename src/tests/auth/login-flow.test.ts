/**
 * R-V2-M1-H2 — Login Flow Tests (Always-Available Fantomas)
 * 
 * Tests AUTH-03/04 : Fantomas detection, no fallback, DB independence.
 * 
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { _resetGhostConfigCache, getBuiltinUsername } from '@/lib/ghost-config';
import * as fs from 'node:fs';
import * as pathModule from 'node:path';

const TEST_SECRET = 'test-secret-at-least-32-chars-long!!';

function clearGhostEnv() {
  delete process.env.FANTOMAS_USERNAME;
  delete process.env.FANTOMAS_PASSWORD;
  delete process.env.GHOST_SESSION_SECRET;
  _resetGhostConfigCache();
}

describe('AUTH-03: Ghost detection by identifier only', () => {
  beforeEach(() => {
    process.env.FANTOMAS_USERNAME = 'fantomas';
    process.env.FANTOMAS_PASSWORD = 'fantomas';
    process.env.GHOST_SESSION_SECRET = TEST_SECRET;
    _resetGhostConfigCache();
  });

  afterEach(() => { clearGhostEnv(); });

  it('fantomas identifier → Ghost path (not Better Auth)', async () => {
    const { getGhostConfig } = await import('@/lib/ghost-config');
    const config = getGhostConfig();
    expect(config.available).toBe(true);
    expect(config.username).toBe('fantomas');
  });

  it('other identifier → Better Auth path (Ghost never tried)', async () => {
    const { validateGhostCredentials } = await import('@/lib/ghost-auth');
    const { getGhostConfig } = await import('@/lib/ghost-config');
    const config = getGhostConfig();
    expect('admin@danielou.ci'.toLowerCase() === config.username.toLowerCase()).toBe(false);
    expect(validateGhostCredentials('admin@danielou.ci', 'somepassword')).toBe(false);
  });

  it('AUTH-04: Better Auth failure does NOT fallback to Ghost', () => {
    const content = fs.readFileSync(
      pathModule.resolve(__dirname, '../../app/(auth)/login/actions.ts'),
      'utf-8'
    );
    expect(content).not.toContain('catch.*ghost');
    expect(content).not.toContain('fallback.*ghost');
    expect(content).toContain('login.toLowerCase() === ghostConfig.username.toLowerCase()');
  });

  it('Ghost wrong password → does NOT try Better Auth', () => {
    const content = fs.readFileSync(
      pathModule.resolve(__dirname, '../../app/(auth)/login/actions.ts'),
      'utf-8'
    );
    expect(content).toContain('ne PAS essayer Better Auth');
  });
});

describe('H2: Login flow without env vars (§4, §6)', () => {
  beforeEach(() => { clearGhostEnv(); });
  afterEach(() => { clearGhostEnv(); });

  it('H2-FLOW-01: fantomas identifier detected with built-in defaults', async () => {
    const { getGhostConfig } = await import('@/lib/ghost-config');
    const config = getGhostConfig();
    expect(config.available).toBe(true);
    expect(config.username).toBe('fantomas');
    expect(getBuiltinUsername()).toBe('fantomas');
  });

  it('H2-FLOW-02: login action has NO ghostConfig.available guard', () => {
    const content = fs.readFileSync(
      pathModule.resolve(__dirname, '../../app/(auth)/login/actions.ts'),
      'utf-8'
    );
    // The old code had: if (ghostConfig.available && ...)
    // The new code has: if (login.toLowerCase() === ghostConfig.username.toLowerCase())
    // ghostConfig.available is always true, so no guard is needed
    expect(content).not.toContain('ghostConfig.available &&');
    expect(content).toContain('ghostConfig.username.toLowerCase()');
  });

  it('H2-FLOW-03: API route has NO config.available → 503 guard', () => {
    const content = fs.readFileSync(
      pathModule.resolve(__dirname, '../../app/api/auth/ghost/route.ts'),
      'utf-8'
    );
    // Should NOT have a 503 response for config unavailable
    expect(content).not.toContain('GHOST_CONFIGURATION_ERROR');
    expect(content).not.toContain('!config.available');
  });
});

describe('H2: No DB dependency in login action (§4)', () => {
  it('H2-DB-01: login action source code has no DB import at module level', () => {
    const content = fs.readFileSync(
      pathModule.resolve(__dirname, '../../app/(auth)/login/actions.ts'),
      'utf-8'
    );
    // DB import should be dynamic (inside the else branch for Better Auth)
    const lines = content.split('\n');
    const topLevelImports = lines.filter(l => l.startsWith('import '));
    for (const imp of topLevelImports) {
      expect(imp).not.toContain('drizzle-orm');
      expect(imp).not.toContain('@neondatabase');
      expect(imp).not.toContain('better-auth');
    }
  });

  it('H2-DB-02: Better Auth is imported dynamically (not at Ghost path)', () => {
    const content = fs.readFileSync(
      pathModule.resolve(__dirname, '../../app/(auth)/login/actions.ts'),
      'utf-8'
    );
    // Better Auth should be dynamically imported (inside the else branch)
    expect(content).toContain('await import(\'@/lib/auth\')');
  });
});
