import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { headers } from "next/headers";

export async function POST() {
  const h = await headers();
  if (!h.get("cookie")?.includes("danielou_ghost_session")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sql = neon(process.env.DATABASE_URL!);
  try {
    const orphanAccounts = await sql`SELECT COUNT(*)::int as cnt FROM "account" a WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = a.user_id)`;
    const orphanMemberships = await sql`SELECT COUNT(*)::int as cnt FROM "school_membership" sm WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = sm.user_id)`;
    const orphanSessions = await sql`SELECT COUNT(*)::int as cnt FROM "session" s WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = s.user_id)`;
    const totalAccounts = await sql`SELECT COUNT(*)::int as cnt FROM "account"`;
    const totalMemberships = await sql`SELECT COUNT(*)::int as cnt FROM "school_membership"`;
    const totalSessions = await sql`SELECT COUNT(*)::int as cnt FROM "session"`;
    return NextResponse.json({
      orphanAccounts: orphanAccounts[0].cnt,
      orphanMemberships: orphanMemberships[0].cnt,
      orphanSessions: orphanSessions[0].cnt,
      totalAccounts: totalAccounts[0].cnt,
      totalMemberships: totalMemberships[0].cnt,
      totalSessions: totalSessions[0].cnt,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
