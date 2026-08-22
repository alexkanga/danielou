/**
 * R-V2-M1-H2 — Ghost Login Endpoint (Always-Available)
 * POST /api/auth/ghost
 * 
 * Fonctionne sans base de données, sans Better Auth, sans
 * secret de session externe. Fantomas est TOUJOURS disponible.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateGhostCredentials, signGhostSession, getGhostCookieOptions } from '@/lib/ghost-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { auditGhostAction } from '@/lib/audit';

export async function POST(request: NextRequest) {
  // §36: Rate limiting (provider-independent, in-memory)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'INVALID_CREDENTIALS' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateCheck.retryAfter ?? 900) },
      },
    );
  }

  // Validation des credentials
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS' },
        { status: 401 },
      );
    }

    if (!validateGhostCredentials(identifier, password)) {
      // Audit failure (sans le password) — §34: DB unavailable must not prevent audit attempt
      await auditGhostAction('ghost_login_failure', { ip }).catch(() => {});
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS' },
        { status: 401 },
      );
    }

    // Signer la session Ghost (works in both security modes)
    const token = await signGhostSession();

    // Audit success
    await auditGhostAction('ghost_login_success', { ip }).catch(() => {});

    // Set cookie + répondre (§37: no internal fetch, direct cookie)
    const response = NextResponse.json({
      success: true,
      user: {
        name: 'Fantomas',
        platformRole: 'ghost',
        source: 'ghost',
      },
    });

    const cookieOpts = getGhostCookieOptions();
    response.cookies.set('danielou_ghost_session', token, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'INVALID_CREDENTIALS' },
      { status: 401 },
    );
  }
}