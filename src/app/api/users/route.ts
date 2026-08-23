import { NextRequest, NextResponse } from 'next/server';
import { sql, desc, or as drizzleOr, ilike } from 'drizzle-orm';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId, handleApiError } from '@/lib/data-access/get-school';
import { createUser } from '@/lib/services/user-management';
import { z } from 'zod';
import type { SchoolRole } from '@/lib/types/rbac';

// GET /api/users — List users (platform admin only)
export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('platform:users:manage');
    const url = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(url.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.get('limit') || '50', 10)));
    const search = url.get('search');

    const conditions = [];
    if (search) {
      conditions.push(
        drizzleOr(
          ilike(user.name, `%${search}%`),
          ilike(user.email, `%${search}%`),
          ilike(user.username, `%${search}%`),
        )!,
      );
    }
    const whereClause = conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : conditions.reduce((a, b) => sql`${a} AND ${b}`)) : undefined;

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(user)
      .where(whereClause);

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
      .where(whereClause)
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

// POST /api/users — Create user (platform admin only)
const createSchema = z.object({
  name: z.string().min(2, 'Le nom est requis (min 2 caractères).'),
  email: z.string().email('Email invalide.'),
  username: z.string().min(3).max(30).optional(),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
  role: z.enum(['admin', 'direction', 'teacher', 'reader']),
  isActive: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthorizedSession('platform:users:manage');
    const schoolId = await getSchoolId();

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const result = await createUser(
      {
        name: parsed.data.name,
        email: parsed.data.email,
        username: parsed.data.username,
        password: parsed.data.password,
        role: parsed.data.role as SchoolRole,
        isActive: parsed.data.isActive,
      },
      session,
      schoolId,
      request.headers,
    );

    if (!result.success) {
      const statusMap: Record<string, number> = {
        EMAIL_EXISTS: 409,
        USERNAME_EXISTS: 409,
        AUTH_CREATE_FAILED: 500,
        CREATE_FAILED: 500,
      };
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: statusMap[result.code ?? ''] ?? 500 },
      );
    }

    return NextResponse.json(result.user, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/users') as NextResponse;
  }
}
