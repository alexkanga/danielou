import { Users, School, FileText, AlertCircle } from 'lucide-react';
import { db } from '@/lib/db';
import { student, classroom, assessment, grade } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { Card, CardContent } from '@/components/ui/card';

async function getDashboardStats() {
  try {
    const [studentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(student);

    const [classroomCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(classroom);

    const [assessmentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assessment);

    const [pendingGrades] = await db
      .select({ count: sql<number>`count(*)` })
      .from(grade)
      .where(eq(grade.status, 'pending'));

    return {
      students: studentCount?.count ?? 0,
      classrooms: classroomCount?.count ?? 0,
      assessments: assessmentCount?.count ?? 0,
      pendingGrades: pendingGrades?.count ?? 0,
    };
  } catch {
    return { students: 0, classrooms: 0, assessments: 0, pendingGrades: 0 };
  }
}

export default async function DashboardPage() {
  const session = await getSession();
  const stats = await getDashboardStats();

  const cards = [
    { label: 'Élèves inscrits', value: stats.students, icon: Users },
    { label: 'Classes actives', value: stats.classrooms, icon: School },
    { label: 'Évaluations', value: stats.assessments, icon: FileText },
    { label: 'Notes en attente', value: stats.pendingGrades, icon: AlertCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Tableau de bord
        </h1>
        {session?.user && (
          <p className="mt-1 text-sm text-muted-foreground">
            Bienvenue, {session.user.name}
          </p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">
                    {card.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Next steps */}
      {stats.students === 0 && (
        <Card>
          <CardContent className="px-6 py-12 text-center">
            <p className="text-muted-foreground">
              Commencez par créer des classes et inscrire des élèves.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
