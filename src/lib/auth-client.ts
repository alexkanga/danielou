/**
 * Client Better-Auth.
 * Utilisé pour les interactions côté client avec l'auth standard.
 */

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
});

export const { signIn, signOut, useSession } = authClient;
