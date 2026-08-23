import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST() {
  const h = await headers();
  const hasSession = h.get('cookie')?.includes('danielou_ghost_session');
  if (!hasSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { getAuth } = await import('@/lib/auth');
    const auth = getAuth();

    // Direct signInUsername call like the login action does
    const result = await auth.api.signInUsername({
      body: { username: 'prooftest', password: 'TestPass123!' },
    });
    return NextResponse.json({ step: 'signInUsername', result: JSON.stringify(result) });
  } catch (e: any) {
    return NextResponse.json({ 
      step: 'signInUsername-error', 
      error: e.message, 
      name: e.constructor.name,
      stack: e.stack?.substring(0, 800) 
    });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
