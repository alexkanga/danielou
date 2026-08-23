import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST() {
  const h = await headers();
  const hasSession = h.get('cookie')?.includes('danielou_ghost_session');
  if (!hasSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { getAuth } = await import('@/lib/auth');
    const auth = getAuth();
    
    // Step 1: Find user by username
    let userFound = null;
    try {
      const ctx: any = auth.context;
      userFound = await ctx.internalAdapter.findOne({
        model: 'user',
        where: [{ field: 'username', value: 'prooftest' }]
      });
    } catch (e: any) {
      return NextResponse.json({ step: 'find-user', error: e.message });
    }
    if (!userFound) return NextResponse.json({ step: 'find-user', error: 'User not found' });

    // Step 2: Find credential account
    let accountFound = null;
    try {
      const ctx: any = auth.context;
      accountFound = await ctx.internalAdapter.findCredentialAccount(userFound.id);
    } catch (e: any) {
      return NextResponse.json({ step: 'find-credential', userId: userFound.id, error: e.message });
    }
    if (!accountFound) return NextResponse.json({ step: 'find-credential', userId: userFound.id, error: 'Account not found' });

    return NextResponse.json({
      step: 'password-check',
      userId: userFound.id,
      accountId: accountFound.accountId,
      issuer: accountFound.issuer,
      hasPassword: !!accountFound.password,
      hasAccessToken: !!accountFound.accessToken,
      allKeys: Object.keys(accountFound),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack?.substring(0, 500) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
