/**
 * R-V2-M1-H2 — Ghost JWT Tests (Always-Available)
 * 
 * Tests JWT signing and verification in BOTH security modes:
 * - external_secret (GHOST_SESSION_SECRET present)
 * - built_in_fallback (no secret)
 * 
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { SignJWT } from 'jose';
import {
  signGhostSession,
  verifyGhostSession,
} from '@/lib/ghost-auth';
import { _resetGhostConfigCache } from '@/lib/ghost-config';

const TEST_SECRET = 'test-secret-at-least-32-chars-long!!';
const NEW_SECRET = 'brand-new-secret-32chars-minimum!!';

/**
 * Helper: signe un JWT avec un secret donné.
 */
async function signWithSecret(secret: string, payloadOverrides: Record<string, unknown> = {}): Promise<string> {
  return new SignJWT({
    sub: 'fantomas-ghost',
    actorType: 'ghost',
    actorIdentifier: 'fantomas',
    role: 'ghost',
    name: 'Fantomas',
    ...payloadOverrides,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(secret));
}

clearGhostEnv();

describe('Ghost JWT — external_secret mode', () => {
  beforeAll(() => {
    process.env.FANTOMAS_USERNAME = 'fantomas';
    process.env.FANTOMAS_PASSWORD = 'fantomas';
    process.env.GHOST_SESSION_SECRET = TEST_SECRET;
    _resetGhostConfigCache();
  });

  afterAll(() => {
    clearGhostEnv();
    _resetGhostConfigCache();
  });

  it('GHOST-01: sign and verify Ghost session', async () => {
    const token = await signGhostSession();
    expect(token).toBeTruthy();
    const payload = await verifyGhostSession(token);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe('fantomas-ghost');
    expect(payload!.actorType).toBe('ghost');
    expect(payload!.role).toBe('ghost');
    expect(payload!.name).toBe('Fantomas');
    expect(payload!.securityMode).toBe('external_secret');
  });

  it('GHOST-02/03: session works without any DB import', async () => {
    const token = await signGhostSession();
    const payload = await verifyGhostSession(token);
    expect(payload).not.toBeNull();
  });

  it('GHOST-05: forged session (wrong secret) → null', async () => {
    const forgedToken = await signWithSecret('wrong-secret-32-chars-minimum!!');
    const payload = await verifyGhostSession(forgedToken);
    expect(payload).toBeNull();
  });

  it('GHOST-06: expired session → null', async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 100;
    const expiredToken = await new SignJWT({
      sub: 'fantomas-ghost',
      actorType: 'ghost',
      actorIdentifier: 'fantomas',
      role: 'ghost',
      name: 'Fantomas',
      exp: pastExp,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 700000)
      .sign(new TextEncoder().encode(TEST_SECRET));

    const payload = await verifyGhostSession(expiredToken);
    expect(payload).toBeNull();
  });

  it('GHOST-18: modified cookie → null', async () => {
    const token = await signGhostSession();
    const modified = token.slice(0, -5) + 'XXXXX';
    const payload = await verifyGhostSession(modified);
    expect(payload).toBeNull();
  });

  it('wrong sub → null', async () => {
    const badSubToken = await signWithSecret(TEST_SECRET, {
      sub: 'impostor',
      actorType: 'ghost',
      actorIdentifier: 'impostor',
      role: 'ghost',
      name: 'Impostor',
    });
    const payload = await verifyGhostSession(badSubToken);
    expect(payload).toBeNull();
  });

  it('wrong actorType → null', async () => {
    const badActorToken = await signWithSecret(TEST_SECRET, {
      sub: 'fantomas-ghost',
      actorType: 'user',
      actorIdentifier: 'fantomas',
      role: 'admin',
      name: 'Fantomas',
    });
    const payload = await verifyGhostSession(badActorToken);
    expect(payload).toBeNull();
  });

  it('random string → null', async () => {
    const payload = await verifyGhostSession('not.a.jwt');
    expect(payload).toBeNull();
  });

  it('empty string → null', async () => {
    const payload = await verifyGhostSession('');
    expect(payload).toBeNull();
  });
});

describe('H2: Ghost JWT — built_in_fallback mode (NO secret)', () => {
  beforeAll(() => {
    // Ensure NO Ghost env vars are set
    delete process.env.FANTOMAS_USERNAME;
    delete process.env.FANTOMAS_PASSWORD;
    delete process.env.GHOST_SESSION_SECRET;
    _resetGhostConfigCache();
  });

  afterAll(() => {
    clearGhostEnv();
    _resetGhostConfigCache();
  });

  it('H2-FALLBACK-01: sign and verify without GHOST_SESSION_SECRET', async () => {
    const token = await signGhostSession();
    expect(token).toBeTruthy();
    const payload = await verifyGhostSession(token);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe('fantomas-ghost');
    expect(payload!.actorType).toBe('ghost');
    expect(payload!.securityMode).toBe('built_in_fallback');
  });

  it('H2-FALLBACK-02: forged token rejected in fallback mode', async () => {
    const forgedToken = await signWithSecret('some-random-key-32-chars-minimum!!');
    const payload = await verifyGhostSession(forgedToken);
    expect(payload).toBeNull();
  });

  it('H2-FALLBACK-03: modified cookie rejected in fallback mode', async () => {
    const token = await signGhostSession();
    const modified = token.slice(0, -3) + 'XXX';
    const payload = await verifyGhostSession(modified);
    expect(payload).toBeNull();
  });

  it('H2-FALLBACK-04: expired token rejected in fallback mode', async () => {
    const { getGhostConfig } = await import('@/lib/ghost-config');
    const config = getGhostConfig();
    const pastExp = Math.floor(Date.now() / 1000) - 100;
    const expiredToken = await new SignJWT({
      sub: 'fantomas-ghost',
      actorType: 'ghost',
      actorIdentifier: 'fantomas',
      role: 'ghost',
      name: 'Fantomas',
      exp: pastExp,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 700000)
      .sign(config.sessionSecret);

    const payload = await verifyGhostSession(expiredToken);
    expect(payload).toBeNull();
  });

  it('H2-FALLBACK-05: wrong sub rejected in fallback mode', async () => {
    const { getGhostConfig } = await import('@/lib/ghost-config');
    const config = getGhostConfig();
    const badSubToken = await new SignJWT({
      sub: 'impostor',
      actorType: 'ghost',
      actorIdentifier: 'impostor',
      role: 'ghost',
      name: 'Impostor',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(config.sessionSecret);

    const payload = await verifyGhostSession(badSubToken);
    expect(payload).toBeNull();
  });

  it('H2-FALLBACK-06: tokens signed in external_secret mode are NOT valid in fallback mode', async () => {
    // Sign with external secret
    const externalToken = await signWithSecret(TEST_SECRET);
    // Verify in fallback mode (no GHOST_SESSION_SECRET set)
    const payload = await verifyGhostSession(externalToken);
    expect(payload).toBeNull();
  });
});

describe('H2: Ghost JWT — mode transition', () => {
  afterEach(() => { clearGhostEnv(); });

  it('H2-TRANSITION-01: secret rotation invalidates old sessions', async () => {
    process.env.GHOST_SESSION_SECRET = TEST_SECRET;
    _resetGhostConfigCache();

    const token = await signGhostSession();
    const validBefore = await verifyGhostSession(token);
    expect(validBefore).not.toBeNull();

    process.env.GHOST_SESSION_SECRET = NEW_SECRET;
    _resetGhostConfigCache();

    const validAfter = await verifyGhostSession(token);
    expect(validAfter).toBeNull();
  });
});

describe('H2: Ghost JWT — permission parity (§27, §28)', () => {
  it('H2-PARITY-01: Ghost gets all SUPER_ADMIN permissions via platform override', async () => {
    const { checkPermission } = await import('@/lib/authorization');
    type Permission = import('@/lib/types/rbac').Permission;

    // All defined permissions in the system
    const allPermissions: Permission[] = [
      'platform:users:manage', 'platform:users:create_super_admin',
      'platform:schools:create', 'platform:recovery',
      'school:academic_years:read', 'school:academic_years:manage',
      'school:levels:read', 'school:levels:manage',
      'school:classrooms:read', 'school:classrooms:manage',
      'school:students:read', 'school:students:manage',
      'school:enrollments:read', 'school:enrollments:manage',
      'school:subjects:read', 'school:subjects:manage',
      'school:components:read', 'school:components:manage',
      'school:assessment_types:read', 'school:assessment_types:manage',
      'school:pedagogical_config:read', 'school:pedagogical_config:manage',
      'school:assessments:read', 'school:assessments:manage',
      'school:grades:read', 'school:grades:manage',
      'school:report_cards:read', 'school:report_cards:prepare',
      'school:report_cards:validate', 'school:report_cards:publish',
      'school:annual_results:read', 'school:annual_results:manage',
      'school:statistics:read',
      'school:audit_log:read',
    ];

    for (const perm of allPermissions) {
      expect(checkPermission('ghost', null, perm)).toBe(true);
    }
  });
});

function clearGhostEnv() {
  delete process.env.FANTOMAS_USERNAME;
  delete process.env.FANTOMAS_PASSWORD;
  delete process.env.GHOST_SESSION_SECRET;
  _resetGhostConfigCache();
}
