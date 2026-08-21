/**
 * Deprecated — utilisez /api/auth/ghost à la place.
 * Cette route n'est plus fonctionnelle.
 */

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Gone. Use /api/auth/ghost instead.' },
    { status: 410 },
  );
}
