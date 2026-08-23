import { NextRequest } from 'next/server';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { getSchoolId } from '@/lib/data-access/get-school';
import { db } from '@/lib/db';
import { subject } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  getComponentById,
  updateComponent,
  deleteComponent,
  pedagogyErrorToResponse,
} from '@/lib/services/pedagogy';
import { updateSubjectComponentSchema } from '@/lib/validations/pedagogy';

/**
 * GET /api/composantes/:id — Get component by ID
 * INV-M3-24: requires school:components:read
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:components:read');
    const schoolId = await getSchoolId();
    const { id } = await params;

    const row = await getComponentById(id);
    // Tenant check via subject
    const [subj] = await db
      .select({ subjectSchoolId: subject.schoolId })
      .from(subject)
      .where(eq(subject.id, row.subjectId))
      .limit(1);
    if (!subj || subj.subjectSchoolId !== schoolId) {
      return Response.json({ error: 'Composante non trouvée.' }, { status: 404 });
    }
    return Response.json(row);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

/**
 * PATCH /api/composantes/:id — Update component
 * INV-M3-24: requires school:components:manage
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuthorizedSession('school:components:manage');
    const schoolId = await getSchoolId();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSubjectComponentSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updated = await updateComponent(id, schoolId, parsed.data, session.user);
    return Response.json(updated);
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}

/**
 * DELETE /api/composantes/:id — Delete component
 * INV-M3-14: blocked if config_component references exist
 * INV-M3-24: requires school:components:manage
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuthorizedSession('school:components:manage');
    const schoolId = await getSchoolId();
    const { id } = await params;

    await deleteComponent(id, schoolId, session.user);
    return Response.json({ success: true });
  } catch (error) {
    return pedagogyErrorToResponse(error);
  }
}
