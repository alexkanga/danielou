import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { level, classroom } from '@/lib/db/schema';
import { requireAuthorizedSession } from '@/lib/server-guards';
import { updateLevelSchema } from '@/lib/validations/scolarite';
import { handleApiError } from '@/lib/data-access/get-school';

// GET /api/niveaux/[id] — Get a single niveau
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:levels:read');
    const { id } = await params;

    const [found] = await db.select().from(level).where(eq(level.id, id)).limit(1);
    if (!found) {
      return NextResponse.json({ error: 'Niveau introuvable.' }, { status: 404 });
    }

    return NextResponse.json(found);
  } catch (error) {
    return handleApiError(error, 'GET /api/niveaux/[id]') as NextResponse;
  }
}

// PUT /api/niveaux/[id] — Update a niveau
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:levels:manage');
    const { id } = await params;

    const [existing] = await db.select().from(level).where(eq(level.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Niveau introuvable.' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateLevelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = { ...parsed.data };

    if (parsed.data.name && parsed.data.name !== existing.name) {
      const [duplicate] = await db
        .select()
        .from(level)
        .where(
          and(
            eq(level.schoolId, existing.schoolId),
            eq(level.name, parsed.data.name),
          ),
        )
        .limit(1);

      if (duplicate) {
        return NextResponse.json(
          { error: 'Un niveau avec ce nom existe déjà.' },
          { status: 409 },
        );
      }
    }

    const [updated] = await db
      .update(level)
      .set(updates)
      .where(eq(level.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error, 'PUT /api/niveaux/[id]') as NextResponse;
  }
}

// DELETE /api/niveaux/[id] — Delete a niveau
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthorizedSession('school:levels:manage');
    const { id } = await params;

    const [existing] = await db.select().from(level).where(eq(level.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Niveau introuvable.' }, { status: 404 });
    }

    const linkedClassrooms = await db
      .select({ id: classroom.id })
      .from(classroom)
      .where(eq(classroom.levelId, id))
      .limit(1);

    if (linkedClassrooms.length > 0) {
      return NextResponse.json(
        { error: 'Ce niveau est utilisé par des classes et ne peut pas être supprimé.' },
        { status: 409 },
      );
    }

    await db.delete(level).where(eq(level.id, id));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/niveaux/[id]') as NextResponse;
  }
}
