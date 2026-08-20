/**
 * Déconnexion — supprime les cookies Fantomas et Better-Auth.
 */

import { NextResponse } from 'next/server';
import { getFantomasCookieName } from '@/lib/fantomas';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Supprimer le cookie Fantomas
  response.cookies.delete(getFantomasCookieName());

  // Supprimer les cookies Better-Auth
  response.cookies.delete('better-auth.session_token');
  response.cookies.delete('better-auth.session_token');

  return response;
}
