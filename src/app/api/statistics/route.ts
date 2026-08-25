/**
 * M6.2 — Statistics API
 * Returns statistical data for the given view and filters.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { requireAnyAuthorizedSession } from '@/lib/server-guards';
import { handleApiError } from '@/lib/data-access/get-school';
import {
  averageByClassroom,
  averageByLevel,
  averageBySubject,
  averageByComponent,
  resultDistribution,
  thresholdAnalysis,
  periodProgression,
  studentTrends,
  gradeEntryCompletion,
  reportCardWorkflow,
} from '@/lib/services/m6/statistics.service';

const querySchema = z.object({
  view: z.enum([
    'classroom-average',
    'level-average',
    'subject-average',
    'component-average',
    'distribution',
    'threshold',
    'period-progression',
    'student-trends',
    'grade-completion',
    'report-card-workflow',
  ]),
  year: z.string().min(1),
  period: z.string().optional(),
  level: z.string().optional(),
  classroom: z.string().optional(),
  subject: z.string().optional(),
  threshold: z.coerce.number().optional().default(10),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAnyAuthorizedSession(['school:statistics:read']);

    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = querySchema.parse(params);

    const filters = {
      academicYearId: parsed.year,
      periodId: parsed.period,
      levelId: parsed.level,
      classroomId: parsed.classroom,
      subjectId: parsed.subject,
    };

    let data: unknown;

    switch (parsed.view) {
      case 'classroom-average':
        data = await averageByClassroom(filters);
        break;
      case 'level-average':
        data = await averageByLevel(filters);
        break;
      case 'subject-average':
        data = await averageBySubject(filters);
        break;
      case 'component-average':
        data = await averageByComponent(filters);
        break;
      case 'distribution':
        data = await resultDistribution(filters);
        break;
      case 'threshold':
        data = await thresholdAnalysis(filters, parsed.threshold);
        break;
      case 'period-progression':
        data = await periodProgression(filters);
        break;
      case 'student-trends':
        data = await studentTrends(filters);
        break;
      case 'grade-completion':
        data = await gradeEntryCompletion(filters);
        break;
      case 'report-card-workflow':
        data = await reportCardWorkflow(filters);
        break;
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Paramètres invalides.', details: error.issues }, { status: 400 });
    }
    return handleApiError(error, 'statistics');
  }
}
