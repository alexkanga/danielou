import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { auditLog } from '@/lib/db/schema';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId, handleApiError } from '@/lib/data-access/get-school';

// GET /api/audit — List audit events
export async function GET(request: NextRequest) {
  try {
    await requireAuthorizedSession('school:audit_log:read');
    const schoolId = await getSchoolId();
    const url = request.nextUrl.searchParams;
    const action = url.get('action');
    const entity = url.get('entity');
    const page = Math.max(1, parseInt(url.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(url.get('limit') || '50', 10)));

    const conditions = [eq(auditLog.schoolId, schoolId)];
    if (action) conditions.push(eq(auditLog.action, action));
    if (entity) conditions.push(eq(auditLog.entity, entity));
    const whereClause = and(...conditions)!;

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(whereClause);

    const rows = await db
      .select({
        id: auditLog.id,
        actorType: auditLog.actorType,
        actorIdentifier: auditLog.actorIdentifier,
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        oldValue: auditLog.oldValue,
        newValue: auditLog.newValue,
        ipAddress: auditLog.ipAddress,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .where(whereClause)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/audit') as NextResponse;
  }
}
