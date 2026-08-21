/**
 * Logout — supprime les cookies Ghost et Better-Auth.
 */

import { NextResponse } from 'next/server';
import { GHOST_COOKIE_NAME, getGhostCookieDeleteOptions } from '@/lib/ghost-auth';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Supprimer le cookie Ghost
  const opts = getGhostCookieDeleteOptions();
  response.cookies.set(GHOST_COOKIE_NAME, '', opts);

  // Supprimer les cookies Better-Auth
  response.cookies.delete('better-auth.session_token');

  return response;
}
