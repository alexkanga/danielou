/**
 * M6.3 — Bulletin PDF Download API
 * Generates and returns a real PDF file.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyAuthorizedSession } from '@/lib/server-guards';
import { getBulletinData, generateBulletinPdf } from '@/lib/services/m6/bulletin-pdf.service';
import { handleApiError } from '@/lib/data-access/get-school';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAnyAuthorizedSession(['school:report_cards:read']);
    const { id } = await params;

    const data = await getBulletinData(id);
    if (!data) {
      return NextResponse.json({ error: 'Bulletin non trouv\u00e9.' }, { status: 404 });
    }

    const pdfBuffer = await generateBulletinPdf(data);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="bulletin-${data.studentName.replace(/\s+/g, '-').toLowerCase()}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error, 'bulletins/print');
  }
}
