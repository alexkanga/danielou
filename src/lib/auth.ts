/**
 * Better-Auth server configuration — M1 mise à jour
 * Ajout du plugin username pour login username + password.
 * L'initialisation est lazy pour éviter la connexion DB au build time.
 */

import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins/username';
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
        minPasswordLength: 8,
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
      },
      plugins: [
        username({
          minUsernameLength: 3,
          maxUsernameLength: 30,
        }),
      ],
      user: {
        additionalFields: {
          username: {
            type: 'string',
            required: false,
            unique: true,
            input: false,
          },
          platformRole: {
            type: 'string',
            required: false,
            defaultValue: 'none',
            input: false,
          },
          isSuperAdmin: {
            type: 'boolean',
            required: false,
            defaultValue: false,
            input: false,
          },
        },
      },
    });
  }
  return _auth;
}
