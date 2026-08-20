/**
 * Endpoint de login Fantomas.
 * Fonctionne sans base de données.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isFantomasLogin, createFantomasToken, getFantomasCookieName, FANTOMAS_USER } from '@/lib/fantomas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { login, password } = body;

    if (!isFantomasLogin(login, password)) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401 }
      );
    }

    const token = await createFantomasToken();
    const response = NextResponse.json({
      user: FANTOMAS_USER,
      source: 'fantomas',
    });

    response.cookies.set(getFantomasCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
