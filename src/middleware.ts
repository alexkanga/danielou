/**
 * Middleware — Protège les routes /dashboard/*.
 * Vérifie le token Fantomas OU la session Better-Auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyFantomasToken, getFantomasCookieName } from '@/lib/fantomas';

const PUBLIC_PATHS = ['/login', '/api/auth/fantomas', '/api/auth/sign-in'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes publiques — ne pas protéger
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Routes API auth — laisser passer (Better-Auth gère lui-même)
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Assets statiques — ne pas protéger
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg')
  ) {
    return NextResponse.next();
  }

  // Vérifier le token Fantomas
  const fantomasToken = request.cookies.get(getFantomasCookieName())?.value;
  if (fantomasToken) {
    const user = await verifyFantomasToken(fantomasToken);
    if (user) {
      // Injecter les infos utilisateur dans les headers pour le layout
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', user.id);
      requestHeaders.set('x-user-name', user.name);
      requestHeaders.set('x-user-role', user.role);
      requestHeaders.set('x-user-source', 'fantomas');
      requestHeaders.set('x-super-admin', 'true');
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }
  }

  // Vérifier la session Better-Auth via cookie
  const sessionToken = request.cookies.get('better-auth.session_token')?.value;
  if (sessionToken) {
    // On ne vérifie pas la session en DB ici (trop lent pour le middleware).
    // Si le cookie existe, on laisse passer. La vérification complète
    // se fait dans getSession() côté serveur.
    return NextResponse.next();
  }

  // Non authentifié — rediriger vers /login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
