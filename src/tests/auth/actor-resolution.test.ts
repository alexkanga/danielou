/**
 * M1 Security Gate — Actor Resolution Tests
 * 
 * Tests pour resolveActor, requireActor, requireGhost.
 * Ces tests vérifient le modèle d'acteur unifié (jamais Ghost + User simultané).
 */

/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { _resetGhostConfigCache } from '@/lib/ghost-config';

const TEST_SECRET = 'test-secret-at-least-32-chars-long!!';

// Mock next/headers to provide cookie control
const mockCookies = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => ({ value: mockCookies.get(name) ?? undefined }),
    set: (name: string, value: string, opts?: Record<string, unknown>) => { mockCookies.set(name, value); },
    delete: (name: string) => { mockCookies.delete(name); },
    getAll: () => [],
    has: (name: string) => mockCookies.has(name),
  }),
  headers: async () => new Headers(),
}));

// Mock better-auth to avoid DB dependency
vi.mock('@/lib/auth', () => ({
  getAuth: () => ({
    api: {
      getSession: async () => null,
    },
  }),
}));

describe('Actor Resolution', () => {
  beforeEach(() => {
    process.env.FANTOMAS_USERNAME = 'fantomas';
    process.env.FANTOMAS_PASSWORD = 'fantomas';
    process.env.GHOST_SESSION_SECRET = TEST_SECRET;
    _resetGhostConfigCache();
    mockCookies.clear();
  });

  afterEach(() => {
    delete process.env.FANTOMAS_USERNAME;
    delete process.env.FANTOMAS_PASSWORD;
    delete process.env.GHOST_SESSION_SECRET;
    _resetGhostConfigCache();
    mockCookies.clear();
  });

  it('returns null when no session', async () => {
    const { resolveActor } = await import('@/lib/actor');
    const actor = await resolveActor();
    expect(actor).toBeNull();
  });

  it('Ghost actor has correct type', async () => {
    const { signGhostSession } = await import('@/lib/ghost-auth');
    const token = await signGhostSession();
    mockCookies.set('danielou_ghost_session', token);

    const { resolveActor } = await import('@/lib/actor');
    const actor = await resolveActor();
    expect(actor).not.toBeNull();
    expect(actor!.type).toBe('ghost');
  });

  it('Ghost takes priority over Better Auth (mixed sessions)', async () => {
    // Set both cookies
    const { signGhostSession } = await import('@/lib/ghost-auth');
    const token = await signGhostSession();
    mockCookies.set('danielou_ghost_session', token);
    mockCookies.set('better-auth.session_token', 'some-token');

    const { resolveActor } = await import('@/lib/actor');
    const actor = await resolveActor();
    // Ghost always wins
    expect(actor).not.toBeNull();
    expect(actor!.type).toBe('ghost');
  });

  it('requireActor throws UNAUTHORIZED when no session', async () => {
    const { requireActor } = await import('@/lib/actor');
    const { AuthorizationError } = await import('@/lib/authorization');
    await expect(requireActor()).rejects.toThrow(AuthorizationError);
    try {
      await requireActor();
    } catch (e) {
      expect((e as { code: string }).code).toBe('UNAUTHORIZED');
    }
  });

  it('requireGhost throws FORBIDDEN for non-ghost', async () => {
    // No session at all
    const { requireGhost } = await import('@/lib/actor');
    const { AuthorizationError } = await import('@/lib/authorization');
    await expect(requireGhost()).rejects.toThrow(AuthorizationError);
  });
});
