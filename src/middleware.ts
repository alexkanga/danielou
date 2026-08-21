/**
 * Middleware V2 — M1 mise à jour
 * Vérifie le token Ghost (nouveau cookie) OU la session Better-Auth.
 * Injecte les headers V2.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyGhostSession, GHOST_COOKIE_NAME } from '@/lib/ghost-auth';

const PUBLIC_PATHS = ['/login', '/api/auth/ghost', '/api/auth/ghost/logout', '/api/auth/sign-in', '/forbidden', '/db-unavailable'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes publiques
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Routes API auth — Better Auth gère lui-même
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Assets statiques
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg')
  ) {
    return NextResponse.next();
  }

  // Vérifier le token Ghost (nouveau cookie danielou_ghost_session)
  const ghostToken = request.cookies.get(GHOST_COOKIE_NAME)?.value;
  if (ghostToken) {
    const payload = await verifyGhostSession(ghostToken);
    if (payload) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', 'fantomas-ghost');
      requestHeaders.set('x-user-name', 'Fantomas');
      requestHeaders.set('x-user-email', 'fantomas');
      requestHeaders.set('x-user-source', 'ghost');
      requestHeaders.set('x-super-admin', 'true');
      requestHeaders.set('x-platform-role', 'ghost');
      requestHeaders.set('x-school-role', 'admin');
      requestHeaders.set('x-is-ghost', 'true');
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }
  }

  // Vérifier la session Better-Auth via cookie
  const sessionToken = request.cookies.get('better-auth.session_token')?.value;
  if (sessionToken) {
    return NextResponse.next();
  }

  // Non authentifié
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
