import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { level, classroom } from '@/lib/db/schema';
import { requireSession } from '@/lib/session';
import { updateLevelSchema } from '@/lib/validations/scolarite';

// GET /api/niveaux/[id] — Get a single niveau
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();

    const { id } = await params;

    const [found] = await db.select().from(level).where(eq(level.id, id)).limit(1);
    if (!found) {
      return NextResponse.json({ error: 'Niveau introuvable.' }, { status: 404 });
    }

    return NextResponse.json(found);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }
    console.error('[GET /api/niveaux/[id]]', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// PUT /api/niveaux/[id] — Update a niveau
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();

    const { id } = await params;

    // Verify the niveau exists
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

    // If name is being changed, check uniqueness within the same school
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
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }
    console.error('[PUT /api/niveaux/[id]]', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// DELETE /api/niveaux/[id] — Delete a niveau
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();

    const { id } = await params;

    // Verify the niveau exists
    const [existing] = await db.select().from(level).where(eq(level.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Niveau introuvable.' }, { status: 404 });
    }

    // Check if any classrooms reference this level
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
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }
    console.error('[DELETE /api/niveaux/[id]]', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
