/**
 * Better-Auth server configuration.
 * L'initialisation est lazy pour éviter la connexion DB au build time.
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from './db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _auth: any = null;

export function getAuth() {
  if (!_auth) {
    _auth = betterAuth({
      database: drizzleAdapter(getDb(), {
        provider: 'pg',
      }),
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 6,
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
      },
    });
  }
  return _auth;
}
