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
    // Add both columns in a single query (Neon HTTP: each sql\`...\` is a separate connection)
    await sql`DO $$ BEGIN
      ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "issuer" text;
      ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "password" text;
    END $$;`;

    // Backfill existing credential accounts in the same session
    const backfill = await sql`UPDATE "account" SET "issuer" = 'local:credential', "password" = COALESCE("access_token", "password") WHERE "provider_id" = 'credential' AND ("issuer" IS NULL OR "password" IS NULL)`;

    const verify = await sql`SELECT id, issuer, password IS NOT NULL as has_password FROM "account" WHERE "provider_id" = 'credential'`;

    return NextResponse.json({
      success: true,
      added: 'issuer + password columns',
      backfilled: `${(backfill as any[]).length} rows`,
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
