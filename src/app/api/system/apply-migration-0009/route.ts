import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { headers } from 'next/headers';

// One-time migration endpoint for 0009. Remove after applying.
export async function POST() {
  const h = await headers();
  const hasSession = h.get('cookie')?.includes('danielou_ghost_session') || h.get('cookie')?.includes('better-auth.session_token');
  if (!hasSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    const cols = await sql\`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'account' AND column_name IN ('issuer', 'password')
    \`;
    const existing = new Set(cols.map((c: { column_name: string }) => c.column_name));

    const results: string[] = [];

    if (!existing.has('issuer')) {
      await sql\`ALTER TABLE \"account\" ADD COLUMN \"issuer\" text\`;
      results.push('added issuer column');
    } else {
      results.push('issuer column already exists');
    }

    if (!existing.has('password')) {
      await sql\`ALTER TABLE \"account\" ADD COLUMN \"password\" text\`;
      results.push('added password column');
    } else {
      results.push('password column already exists');
    }

    const backfill = await sql\`
      UPDATE \"account\"
      SET \"issuer\" = 'local:credential',
          \"password\" = COALESCE(\"access_token\", \"password\")
      WHERE \"provider_id\" = 'credential'
        AND (\"issuer\" IS NULL OR \"password\" IS NULL)
    \`;
    results.push(\`backfilled \${backfill.count} rows\`);

    const verify = await sql\`
      SELECT id, issuer, password IS NOT NULL as has_password
      FROM \"account\"
      WHERE \"provider_id\" = 'credential'
    \`;
    
    return NextResponse.json({
      success: true,
      results,
      accounts: verify,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
