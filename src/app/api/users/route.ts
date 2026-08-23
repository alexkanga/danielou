import { NextRequest, NextResponse } from 'next/server';
import { sql, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { handleApiError } from '@/lib/data-access/get-school';

// GET /api/users — List users (admin only)
export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('platform:users:manage');
    const url = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(url.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.get('limit') || '50', 10)));

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(user);

    const rows = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        platformRole: user.platformRole,
        isSuperAdmin: user.isSuperAdmin,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/users') as NextResponse;
  }
}
