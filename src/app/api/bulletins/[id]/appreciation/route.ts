/**
 * M6.3 — Update report card appreciation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAnyAuthorizedSession } from '@/lib/server-guards';
import { db } from '@/lib/db';
import { reportCard } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { handleApiError } from '@/lib/data-access/get-school';

const schema = z.object({
  generalAppreciation: z.string().max(2000).optional(),
  teacherComment: z.string().max(2000).optional(),
  directorComment: z.string().max(2000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAnyAuthorizedSession(['school:report_cards:prepare', 'school:report_cards:validate']);
    const { id } = await params;
    const body = await request.json();
    const parsed = schema.parse(body);

    const updates: Record<string, string | null> = {};
    if (parsed.generalAppreciation !== undefined) updates.generalAppreciation = parsed.generalAppreciation || null;
    if (parsed.teacherComment !== undefined) updates.teacherComment = parsed.teacherComment || null;
    if (parsed.directorComment !== undefined) updates.directorComment = parsed.directorComment || null;

    await db.update(reportCard).set(updates).where(eq(reportCard.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
    }
    return handleApiError(error, 'bulletins/appreciation');
  }
}
