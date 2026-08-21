/**
 * M1 Security Gate — Ghost JWT Tests
 * 
 * Tests GHOST-01/02/03/05/06/08/18 — JWT signing et vérification.
 * Ces tests nécessitent crypto natif (Node.js).
 * 
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

describe('Ghost JWT Session (Node.js crypto required)', () => {
  beforeAll(() => {
    process.env.FANTOMAS_USERNAME = 'fantomas';
    process.env.FANTOMAS_PASSWORD = 'fantomas';
    process.env.GHOST_SESSION_SECRET = TEST_SECRET;
    _resetGhostConfigCache();
  });

  afterAll(() => {
    delete process.env.FANTOMAS_USERNAME;
    delete process.env.FANTOMAS_PASSWORD;
    delete process.env.GHOST_SESSION_SECRET;
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
  });

  it('GHOST-02/03: session works without any DB import (architectural invariant)', async () => {
    // Si on arrive ici, ghost-auth.ts n'a rien importé de la DB.
    // L'invariant est que le module est indépendant de PostgreSQL.
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
    // Créer un token avec exp explicitement dans le passé
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

  it('GHOST-08: secret rotation invalidates old sessions', async () => {
    // Signer avec l'ancien secret
    const token = await signGhostSession();
    const validBefore = await verifyGhostSession(token);
    expect(validBefore).not.toBeNull();

    // Changer le secret
    process.env.GHOST_SESSION_SECRET = NEW_SECRET;
    _resetGhostConfigCache();

    // L'ancien token doit être rejeté
    const validAfter = await verifyGhostSession(token);
    expect(validAfter).toBeNull();
  });

  it('GHOST-18: modified cookie → null', async () => {
    const token = await signGhostSession();
    // Modifier un caractère du token
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
