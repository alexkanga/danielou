import { NextRequest, NextResponse } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId, handleApiError } from '@/lib/data-access/get-school';
import { updateUser, toggleUserActive } from '@/lib/services/user-management';
import { z } from 'zod';
import type { SchoolRole } from '@/lib/types/rbac';

// PATCH /api/users/[id] — Update user fields or toggle active
const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  username: z.string().min(3).max(30).nullable().optional(),
  role: z.enum(['admin', 'direction', 'teacher', 'reader']).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuthorizedSession('platform:users:manage');
    const schoolId = await getSchoolId();
    const { id } = await params;

    const body = await request.json();

    // Toggle active: { action: 'toggle_active' }
    if (body.action === 'toggle_active') {
      const result = await toggleUserActive(id, session, schoolId);
      if (!result.success) {
        const statusMap: Record<string, number> = {
          USER_NOT_FOUND: 404,
          FORBIDDEN: 403,
          UPDATE_FAILED: 500,
        };
        return NextResponse.json(
          { error: result.error, code: result.code },
          { status: statusMap[result.code ?? ''] ?? 500 },
        );
      }
      return NextResponse.json(result.user);
    }

    // Standard field update
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const result = await updateUser(
      id,
      {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.email !== undefined && { email: parsed.data.email }),
        ...(parsed.data.username !== undefined && { username: parsed.data.username ?? undefined }),
        ...(parsed.data.role !== undefined && { role: parsed.data.role as SchoolRole }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
      },
      session,
      schoolId,
    );

    if (!result.success) {
      const statusMap: Record<string, number> = {
        USER_NOT_FOUND: 404,
        EMAIL_EXISTS: 409,
        USERNAME_EXISTS: 409,
        FORBIDDEN: 403,
        NO_CHANGES: 400,
        UPDATE_FAILED: 500,
      };
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: statusMap[result.code ?? ''] ?? 500 },
      );
    }

    return NextResponse.json(result.user);
  } catch (error) {
    return handleApiError(error, 'PATCH /api/users/[id]') as NextResponse;
  }
}
