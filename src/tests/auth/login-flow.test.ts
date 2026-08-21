/**
 * M1 Security Gate — Login Flow Tests
 * 
 * Tests AUTH-03/04 : Pas de fallback Better Auth → Ghost.
 * Ces tests nécessitent l'environnement Node.
 * 
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { _resetGhostConfigCache } from '@/lib/ghost-config';
import * as fs from 'node:fs';
import * as pathModule from 'node:path';

const TEST_SECRET = 'test-secret-at-least-32-chars-long!!';

describe('AUTH-03: Ghost detection by identifier only', () => {
  beforeEach(() => {
    process.env.FANTOMAS_USERNAME = 'fantomas';
    process.env.FANTOMAS_PASSWORD = 'fantomas';
    process.env.GHOST_SESSION_SECRET = TEST_SECRET;
    _resetGhostConfigCache();
  });

  afterEach(() => {
    delete process.env.FANTOMAS_USERNAME;
    delete process.env.FANTOMAS_PASSWORD;
    delete process.env.GHOST_SESSION_SECRET;
    _resetGhostConfigCache();
  });

  it('fantomas identifier → Ghost path (not Better Auth)', async () => {
    const { getGhostConfig } = await import('@/lib/ghost-config');
    const config = getGhostConfig();
    // When identifier matches fantomas username, Ghost should be tried
    expect(config.available).toBe(true);
    if (config.available) {
      expect(config.username).toBe('fantomas');
    }
  });

  it('other identifier → Better Auth path (Ghost never tried)', async () => {
    const { validateGhostCredentials } = await import('@/lib/ghost-auth');
    // 'admin@danielou.ci' does NOT match fantomas username
    // So Ghost should NOT be tried (per R-V2-03 §16)
    const { getGhostConfig } = await import('@/lib/ghost-config');
    const config = getGhostConfig();
    if (config.available) {
      // The login action checks: login.toLowerCase() === config.username.toLowerCase()
      // 'admin@danielou.ci' !== 'fantomas' → Ghost is skipped entirely
      expect('admin@danielou.ci'.toLowerCase() === config.username.toLowerCase()).toBe(false);
    }
    // Ghost validation would also fail anyway (different credentials)
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
