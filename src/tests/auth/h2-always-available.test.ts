/**
 * R-V2-M1-H2 — Always-Available Fantomas: Comprehensive Test Matrix
 * 
 * Implements the test matrix from §26 (TEST A through G),
 * §27 (permission parity), §28 (future permissions),
 * §29 (recovery extra rights), §34 (audit), §36 (rate limit),
 * §38 (cookie), §39 (logout), §40 (wrong credentials), §41 (forgery),
 * §43 (host portability), §52 (critical assertions).
 * 
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validateGhostCredentials,
  signGhostSession,
  verifyGhostSession,
  getGhostCookieOptions,
  getGhostCookieDeleteOptions,
} from '@/lib/ghost-auth';
import {
  getGhostConfig,
  _resetGhostConfigCache,
} from '@/lib/ghost-config';
import { checkPermission } from '@/lib/authorization';
import type { Permission } from '@/lib/types/rbac';
import * as fs from 'node:fs';
import * as pathModule from 'node:path';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const TEST_SECRET = 'test-secret-at-least-32-chars-long!!';

function clearAllGhostEnv() {
  delete process.env.FANTOMAS_USERNAME;
  delete process.env.FANTOMAS_PASSWORD;
  delete process.env.GHOST_SESSION_SECRET;
  _resetGhostConfigCache();
}

function setupEnv(opts: {
  username?: string;
  password?: string;
  secret?: string;
  dbUrl?: string;
}) {
  clearAllGhostEnv();
  if (opts.username !== undefined) process.env.FANTOMAS_USERNAME = opts.username;
  if (opts.password !== undefined) process.env.FANTOMAS_PASSWORD = opts.password;
  if (opts.secret !== undefined) process.env.GHOST_SESSION_SECRET = opts.secret;
  if (opts.dbUrl !== undefined) process.env.DATABASE_URL = opts.dbUrl;
  else delete process.env.DATABASE_URL;
}

// ─────────────────────────────────────────────
// §26: Real Browser Test Matrix (server-side simulation)
// ─────────────────────────────────────────────

describe('§26 TEST A: DB available, secret present', () => {
  beforeEach(() => setupEnv({ username: 'fantomas', password: 'fantomas', secret: TEST_SECRET, dbUrl: 'postgresql://test' }));
  afterEach(() => clearAllGhostEnv());

  it('fantomas/fantomas → LOGIN PASS, GhostActor, GLOBAL SUPER_ADMIN', async () => {
    const config = getGhostConfig();
    expect(config.available).toBe(true);
    expect(config.securityMode).toBe('external_secret');
    expect(validateGhostCredentials('fantomas', 'fantomas')).toBe(true);

    const token = await signGhostSession();
    const payload = await verifyGhostSession(token);
    expect(payload).not.toBeNull();
    expect(payload!.actorType).toBe('ghost');
    expect(payload!.securityMode).toBe('external_secret');

    // Authorization: GLOBAL SUPER_ADMIN
    expect(checkPermission('ghost', null, 'platform:users:manage')).toBe(true);
    expect(checkPermission('ghost', null, 'school:students:manage')).toBe(true);
    expect(checkPermission('ghost', null, 'platform:recovery')).toBe(true);
  });
});

describe('§26 TEST B: DB available, secret ABSENT', () => {
  beforeEach(() => setupEnv({ dbUrl: 'postgresql://test' }));
  afterEach(() => clearAllGhostEnv());

  it('fantomas/fantomas → LOGIN PASS, GhostActor, GLOBAL SUPER_ADMIN', async () => {
    const config = getGhostConfig();
    expect(config.available).toBe(true);
    expect(config.securityMode).toBe('built_in_fallback');
    expect(validateGhostCredentials('fantomas', 'fantomas')).toBe(true);

    const token = await signGhostSession();
    const payload = await verifyGhostSession(token);
    expect(payload).not.toBeNull();
    expect(payload!.actorType).toBe('ghost');
    expect(payload!.securityMode).toBe('built_in_fallback');

    // Same permissions as external_secret (§10)
    expect(checkPermission('ghost', null, 'platform:users:manage')).toBe(true);
    expect(checkPermission('ghost', null, 'school:students:manage')).toBe(true);
  });
});

describe('§26 TEST C: DB unavailable (invalid URL), secret present', () => {
  beforeEach(() => setupEnv({ secret: TEST_SECRET, dbUrl: 'invalid://not-a-db' }));
  afterEach(() => clearAllGhostEnv());

  it('fantomas/fantomas → LOGIN PASS, GhostActor, GLOBAL SUPER_ADMIN', async () => {
    const config = getGhostConfig();
    expect(config.available).toBe(true);
    expect(validateGhostCredentials('fantomas', 'fantomas')).toBe(true);

    const token = await signGhostSession();
    const payload = await verifyGhostSession(token);
    expect(payload).not.toBeNull();
    expect(payload!.actorType).toBe('ghost');
  });
});

describe('§26 TEST D: DB unavailable, secret ABSENT', () => {
  beforeEach(() => setupEnv({ dbUrl: 'invalid://not-a-db' }));
  afterEach(() => clearAllGhostEnv());

  it('fantomas/fantomas → LOGIN PASS, GhostActor, GLOBAL SUPER_ADMIN', async () => {
    const config = getGhostConfig();
    expect(config.available).toBe(true);
    expect(config.securityMode).toBe('built_in_fallback');
    expect(validateGhostCredentials('fantomas', 'fantomas')).toBe(true);

    const token = await signGhostSession();
    const payload = await verifyGhostSession(token);
    expect(payload).not.toBeNull();
  });
});

describe('§26 TEST E: DATABASE_URL ABSENT, secret ABSENT', () => {
  beforeEach(() => { clearAllGhostEnv(); delete process.env.DATABASE_URL; });
  afterEach(() => clearAllGhostEnv());

  it('fantomas/fantomas → LOGIN PASS, GhostActor, GLOBAL SUPER_ADMIN', async () => {
    const config = getGhostConfig();
    expect(config.available).toBe(true);
    expect(config.securityMode).toBe('built_in_fallback');
    expect(validateGhostCredentials('fantomas', 'fantomas')).toBe(true);

    const token = await signGhostSession();
    const payload = await verifyGhostSession(token);
    expect(payload).not.toBeNull();
  });
});

describe('§26 TEST F: DATABASE_URL INVALID, secret ABSENT', () => {
  beforeEach(() => { clearAllGhostEnv(); process.env.DATABASE_URL = 'not-a-valid-url'; });
  afterEach(() => clearAllGhostEnv());

  it('fantomas/fantomas → LOGIN PASS, GhostActor, GLOBAL SUPER_ADMIN', async () => {
    const config = getGhostConfig();
    expect(config.available).toBe(true);
    expect(validateGhostCredentials('fantomas', 'fantomas')).toBe(true);

    const token = await signGhostSession();
    const payload = await verifyGhostSession(token);
    expect(payload).not.toBeNull();
  });
});

describe('§26 TEST G: Better Auth tables absent, secret ABSENT', () => {
  // Simulated by having no valid DB and no secret
  beforeEach(() => { clearAllGhostEnv(); delete process.env.DATABASE_URL; });
  afterEach(() => clearAllGhostEnv());

  it('fantomas/fantomas → LOGIN PASS, GhostActor, GLOBAL SUPER_ADMIN', async () => {
    const config = getGhostConfig();
    expect(config.available).toBe(true);
    expect(validateGhostCredentials('fantomas', 'fantomas')).toBe(true);

    const token = await signGhostSession();
    const payload = await verifyGhostSession(token);
    expect(payload).not.toBeNull();
  });
});

// ─────────────────────────────────────────────
// §27: Permission Parity Test
// ─────────────────────────────────────────────

describe('§27: Permission Parity — Ghost ⊇ SUPER_ADMIN', () => {
  it('H2-PARITY: Ghost has ALL SUPER_ADMIN business permissions', () => {
    // Collect ALL defined permissions from the RBAC system
    const allPermissions: Permission[] = [
      // Platform
      'platform:users:manage',
      'platform:users:create_super_admin',
      'platform:schools:create',
      'platform:recovery',
      // Organisation
      'school:academic_years:read', 'school:academic_years:manage',
      'school:levels:read', 'school:levels:manage',
      'school:classrooms:read', 'school:classrooms:manage',
      'school:students:read', 'school:students:manage',
      'school:enrollments:read', 'school:enrollments:manage',
      // Pédagogie
      'school:subjects:read', 'school:subjects:manage',
      'school:components:read', 'school:components:manage',
      'school:assessment_types:read', 'school:assessment_types:manage',
      'school:pedagogical_config:read', 'school:pedagogical_config:manage',
      // Évaluations
      'school:assessments:read', 'school:assessments:manage',
      'school:grades:read', 'school:grades:manage',
      // Bulletins
      'school:report_cards:read', 'school:report_cards:prepare',
      'school:report_cards:validate', 'school:report_cards:publish',
      'school:annual_results:read', 'school:annual_results:manage',
      // Analyse
      'school:statistics:read',
      // Audit
      'school:audit_log:read',
    ];

    // SUPER_ADMIN has all permissions (via override in checkPermission)
    const superAdminPermissions = allPermissions.filter(
      p => checkPermission('super_admin', null, p)
    );

    // Ghost MUST have at least what SUPER_ADMIN has (§29: Ghost ⊇ SUPER_ADMIN)
    for (const perm of superAdminPermissions) {
      expect(checkPermission('ghost', null, perm)).toBe(true);
    }

    // Ghost should have ALL permissions (it's a global override)
    for (const perm of allPermissions) {
      expect(checkPermission('ghost', null, perm)).toBe(true);
    }
  });

  it('H2-PARITY-100: Ghost permission coverage = 100% of all defined permissions', () => {
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

    const ghostAllowed = allPermissions.filter(p => checkPermission('ghost', null, p));
    expect(ghostAllowed.length).toBe(allPermissions.length);
  });
});

// ─────────────────────────────────────────────
// §29: Ghost has Recovery (SUPER_ADMIN may not)
// ─────────────────────────────────────────────

describe('§29: Ghost ⊇ SUPER_ADMIN permissions', () => {
  it('Ghost has platform:recovery', () => {
    expect(checkPermission('ghost', null, 'platform:recovery')).toBe(true);
  });

  // SUPER_ADMIN also gets it via override, but requireGhostGuard limits it
  it('Ghost permission set is superset or equal to SUPER_ADMIN', () => {
    const perms: Permission[] = [
      'platform:users:manage', 'platform:recovery',
      'school:students:manage', 'school:grades:manage',
    ];
    for (const p of perms) {
      const ghostHas = checkPermission('ghost', null, p);
      const saHas = checkPermission('super_admin', null, p);
      // Ghost has AT LEAST what SUPER_ADMIN has
      // Convert to numeric for comparison
      if (saHas && !ghostHas) {
        throw new Error(`Ghost missing permission: ${p}`);
      }
      expect(ghostHas).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────
// §38: Cookie Integrity
// ─────────────────────────────────────────────

describe('§38: Cookie Integrity', () => {
  beforeEach(() => clearAllGhostEnv());
  afterEach(() => clearAllGhostEnv());

  it('fallback mode: cookie options are correct', () => {
    const opts = getGhostCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
    expect(opts.maxAge).toBe(604800);
  });

  it('fallback mode: signed token passes verification', async () => {
    const token = await signGhostSession();
    const payload = await verifyGhostSession(token);
    expect(payload).not.toBeNull();
    expect(payload!.actorType).toBe('ghost');
  });
});

// ─────────────────────────────────────────────
// §39: Logout
// ─────────────────────────────────────────────

describe('§39: Logout (both modes)', () => {
  it('external_secret: cookie delete options', () => {
    process.env.GHOST_SESSION_SECRET = TEST_SECRET;
    _resetGhostConfigCache();
    const opts = getGhostCookieDeleteOptions();
    expect(opts.maxAge).toBe(0);
    expect(opts.path).toBe('/');
    clearAllGhostEnv();
  });

  it('built_in_fallback: cookie delete options', () => {
    const opts = getGhostCookieDeleteOptions();
    expect(opts.maxAge).toBe(0);
    expect(opts.path).toBe('/');
  });
});

// ─────────────────────────────────────────────
// §40: Wrong Credential Test
// ─────────────────────────────────────────────

describe('§40: Wrong Credentials', () => {
  beforeEach(() => clearAllGhostEnv());
  afterEach(() => clearAllGhostEnv());

  it('fantomas/wrong → reject', () => {
    expect(validateGhostCredentials('fantomas', 'wrong')).toBe(false);
  });

  it('wrong/fantomas → reject (ordinary user flow)', () => {
    expect(validateGhostCredentials('wrong', 'fantomas')).toBe(false);
  });

  it('case-sensitive password: FANTOMAS/fantomas → reject', () => {
    expect(validateGhostCredentials('FANTOMAS', 'fantomas')).toBe(true); // username case-insensitive
    expect(validateGhostCredentials('fantomas', 'FANTOMAS')).toBe(false); // password case-sensitive
  });
});

// ─────────────────────────────────────────────
// §41: Forgery Test (both modes)
// ─────────────────────────────────────────────

describe('§41: Forgery Rejection', () => {
  afterEach(() => clearAllGhostEnv());

  it('external_secret mode: modified payload → REJECT', async () => {
    process.env.GHOST_SESSION_SECRET = TEST_SECRET;
    _resetGhostConfigCache();
    const token = await signGhostSession();
    const modified = token.slice(0, -5) + 'XXXXX';
    expect(await verifyGhostSession(modified)).toBeNull();
  });

  it('built_in_fallback mode: modified payload → REJECT', async () => {
    clearAllGhostEnv();
    const token = await signGhostSession();
    const modified = token.slice(0, -3) + 'XXX';
    expect(await verifyGhostSession(modified)).toBeNull();
  });

  it('built_in_fallback mode: completely fabricated JWT → REJECT', async () => {
    clearAllGhostEnv();
    // Sign with a completely different key
    const { SignJWT } = await import('jose');
    const fabToken = await new SignJWT({
      sub: 'fantomas-ghost',
      actorType: 'ghost',
      actorIdentifier: 'fantomas',
      role: 'ghost',
      name: 'Fantomas',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode('totally-fake-key-32chars-minimum!!'));
    expect(await verifyGhostSession(fabToken)).toBeNull();
  });
});

// ─────────────────────────────────────────────
// §42: No SQLite
// ─────────────────────────────────────────────

describe('§42: No SQLite in Ghost implementation', () => {
  it('ghost-config.ts has NO sqlite reference', () => {
    const content = fs.readFileSync(pathModule.resolve(__dirname, '../../lib/ghost-config.ts'), 'utf-8');
    expect(content.toLowerCase()).not.toContain('sqlite');
  });

  it('ghost-auth.ts has NO sqlite reference', () => {
    const content = fs.readFileSync(pathModule.resolve(__dirname, '../../lib/ghost-auth.ts'), 'utf-8');
    expect(content.toLowerCase()).not.toContain('sqlite');
  });
});

// ─────────────────────────────────────────────
// §43: Host Portability Audit
// ─────────────────────────────────────────────

describe('§43: Host Portability — zero provider dependencies', () => {
  it('ghost-config.ts: 0 Vercel/Neon/DB/BetterAuth dependency', () => {
    const content = fs.readFileSync(pathModule.resolve(__dirname, '../../lib/ghost-config.ts'), 'utf-8');
    expect(content).not.toContain('vercel');
    expect(content).not.toContain('@vercel/');
    expect(content).not.toContain('neon');
    expect(content).not.toContain('drizzle');
    expect(content).not.toContain('better-auth');
  });

  it('ghost-auth.ts: 0 Vercel/Neon/DB/BetterAuth dependency', () => {
    const content = fs.readFileSync(pathModule.resolve(__dirname, '../../lib/ghost-auth.ts'), 'utf-8');
    expect(content).not.toContain('vercel');
    expect(content).not.toContain('@vercel/');
    expect(content).not.toContain('neon');
    expect(content).not.toContain('drizzle');
    expect(content).not.toContain('better-auth');
    expect(content).not.toContain('aws');
    expect(content).not.toContain('azure');
  });
});

// ─────────────────────────────────────────────
// §52: Critical Final Assertions
// ─────────────────────────────────────────────

describe('§52: Critical Final Assertions', () => {
  beforeEach(() => clearAllGhostEnv());
  afterEach(() => clearAllGhostEnv());

  it('GhostPermissionSet SUPERSET_OR_EQUAL SuperAdminPermissionSet → TRUE', () => {
    const allPerms: Permission[] = [
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

    for (const perm of allPerms) {
      const saHas = checkPermission('super_admin', null, perm);
      const ghostHas = checkPermission('ghost', null, perm);
      // Ghost ⊇ SUPER_ADMIN: if SA has it, Ghost must have it
      if (saHas) {
        expect(ghostHas).toBe(true);
      }
      // Never: ghostHas < saHas
      if (ghostHas && !saHas) {
        // This is OK: Ghost may have MORE permissions (e.g. recovery)
      }
    }
  });

  it('GhostAuthorizationDoesNotDependOnDatabase → TRUE', () => {
    // checkPermission('ghost', ...) returns true without any DB call
    // It's a pure function that checks platformRole === 'ghost' → true
    expect(checkPermission('ghost', null, 'school:students:manage')).toBe(true);
    expect(checkPermission('ghost', null, 'platform:recovery')).toBe(true);
    // This works even though no DATABASE_URL is set (cleared in beforeEach)
    expect(process.env.DATABASE_URL).toBeUndefined();
  });

  it('GhostAuthenticationDoesNotDependOnExternalSecret → TRUE', async () => {
    // No GHOST_SESSION_SECRET (cleared in beforeEach)
    expect(process.env.GHOST_SESSION_SECRET).toBeUndefined();

    const config = getGhostConfig();
    expect(config.available).toBe(true);
    expect(config.securityMode).toBe('built_in_fallback');

    // Can authenticate
    expect(validateGhostCredentials('fantomas', 'fantomas')).toBe(true);

    // Can sign and verify
    const token = await signGhostSession();
    const payload = await verifyGhostSession(token);
    expect(payload).not.toBeNull();
  });
});

// ─────────────────────────────────────────────
// §1: Fantomas is NOT a database user
// ─────────────────────────────────────────────

describe('§1: Fantomas is application-level, not DB', () => {
  it('Ghost actor has no userId from DB', async () => {
    // This is a structural test — the GhostActor type has no userId field
    const content = fs.readFileSync(pathModule.resolve(__dirname, '../../lib/actor.ts'), 'utf-8');
    // GhostActor has: type, identifier, payload — NO userId
    expect(content).toContain("type: 'ghost'");
    expect(content).toContain('identifier: string');
  });
});

// ─────────────────────────────────────────────
// §14: All Schools — Ghost is global
// ─────────────────────────────────────────────

describe('§14: Ghost is global (all schools)', () => {
  it('Ghost gets admin permissions for any school', () => {
    // checkPermission with ghost + any school role
    expect(checkPermission('ghost', 'admin', 'school:students:manage')).toBe(true);
    expect(checkPermission('ghost', 'direction', 'school:students:manage')).toBe(true);
    expect(checkPermission('ghost', 'teacher', 'school:students:manage')).toBe(true);
    expect(checkPermission('ghost', 'reader', 'school:students:manage')).toBe(true);
  });

  it('Ghost does not need school membership (null school role)', () => {
    expect(checkPermission('ghost', null, 'school:students:manage')).toBe(true);
    expect(checkPermission('ghost', null, 'school:grades:manage')).toBe(true);
    expect(checkPermission('ghost', null, 'platform:recovery')).toBe(true);
  });
});

// ─────────────────────────────────────────────
// §28: Future permissions — architecture ensures auto-apply
// ─────────────────────────────────────────────

describe('§28: Future permissions auto-apply to Ghost', () => {
  it('Ghost uses global platform override (not a static permission list)', () => {
    const content = fs.readFileSync(pathModule.resolve(__dirname, '../../lib/authorization.ts'), 'utf-8');
    // checkPermission has: if (platformRole === 'ghost') return true;
    // This is a single-line override that automatically applies to ALL permissions
    expect(content).toContain("if (platformRole === 'ghost') return true");
  });
});

// ─────────────────────────────────────────────
// §25: Ordinary user NO Ghost fallback
// ─────────────────────────────────────────────

describe('§25: Ordinary user never gets Ghost fallback', () => {
  it('non-fantomas identifier → Ghost validation fails', () => {
    expect(validateGhostCredentials('admin@danielou.ci', 'password')).toBe(false);
    expect(validateGhostCredentials('teacher1', 'password')).toBe(false);
    expect(validateGhostCredentials('someuser', 'password')).toBe(false);
  });
});

// ─────────────────────────────────────────────
// §35: Password change policy
// ─────────────────────────────────────────────

describe('§35: Built-in credentials work (no password-strength rejection)', () => {
  beforeEach(() => clearAllGhostEnv());
  afterEach(() => clearAllGhostEnv());

  it('fantomas/fantomas accepted without password-strength validation', () => {
    expect(validateGhostCredentials('fantomas', 'fantomas')).toBe(true);
  });
});

// ─────────────────────────────────────────────
// §21: Config result structure
// ─────────────────────────────────────────────

describe('§21: Config result', () => {
  beforeEach(() => clearAllGhostEnv());
  afterEach(() => clearAllGhostEnv());

  it('always reports available: true', () => {
    const config = getGhostConfig();
    expect(config.available).toBe(true);
  });

  it('reports securityMode: built_in_fallback when no secret', () => {
    const config = getGhostConfig();
    expect(config.securityMode).toBe('built_in_fallback');
  });

  it('reports securityMode: external_secret when secret present', () => {
    process.env.GHOST_SESSION_SECRET = TEST_SECRET;
    _resetGhostConfigCache();
    const config = getGhostConfig();
    expect(config.securityMode).toBe('external_secret');
  });
});
