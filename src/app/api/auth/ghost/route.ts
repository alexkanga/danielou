/**
 * M1-29.4 — Ghost Login Endpoint
 * POST /api/auth/ghost
 * Fonctionne sans base de données.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateGhostCredentials, signGhostSession, getGhostCookieOptions } from '@/lib/ghost-auth';
import { getGhostConfig } from '@/lib/ghost-config';
import { checkRateLimit } from '@/lib/rate-limit';
import { auditGhostAction } from '@/lib/audit';
import { AuthorizationError } from '@/lib/authorization';

export async function POST(request: NextRequest) {
  // 1. Configuration check
  const config = getGhostConfig();
  if (!config.available) {
    return NextResponse.json(
      { error: 'GHOST_CONFIGURATION_ERROR' },
      { status: 503 },
    );
  }

  // 2. Rate limiting
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

  // 3. Validation des credentials
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
      // Audit failure (sans le password)
      await auditGhostAction('ghost_login_failure', { ip }).catch(() => {});
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS' },
        { status: 401 },
      );
    }

    // 4. Signer la session Ghost
    const token = await signGhostSession();

    // 5. Audit success
    await auditGhostAction('ghost_login_success', { ip }).catch(() => {});

    // 6. Set cookie + répondre
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
  } catch (err) {
    if (err instanceof AuthorizationError && err.code === 'GHOST_CONFIGURATION_ERROR') {
      return NextResponse.json(
        { error: 'GHOST_CONFIGURATION_ERROR' },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: 'INVALID_CREDENTIALS' },
      { status: 401 },
    );
  }
}
