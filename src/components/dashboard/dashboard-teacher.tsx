'use client';

import Link from 'next/link';
import { School, FileText, PenTool, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import type { TeacherKpi } from '@/lib/services/m6/dashboard.service';

interface Props {
  kpi: TeacherKpi;
  yearName: string | null;
}

export function TeacherDashboard({ kpi, yearName }: Props) {
  return (
    <div className="space-y-6">
      {yearName && (
        <p className="text-sm text-muted-foreground">
          Année scolaire : <span className="font-medium text-foreground">{yearName}</span>
        </p>
      )}

      {/* Primary KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Mes classes" value={kpi.myClassrooms} icon={School} color="text-primary" bg="bg-primary/10" />
        <KpiCard label="Mes évaluations" value={kpi.myAssessments} icon={FileText} color="text-info" bg="bg-info-light" />
        <KpiCard label="Évaluations ouvertes" value={kpi.myOpenAssessments} icon={CheckCircle} color="text-success" bg="bg-success-light" />
        <KpiCard label="Notes en attente" value={kpi.incompleteGradeEntry} icon={PenTool} color={kpi.incompleteGradeEntry > 0 ? 'text-warning' : 'text-success'} bg={kpi.incompleteGradeEntry > 0 ? 'bg-warning-light' : 'bg-success-light'} />
      </div>

      {/* Recent assessments */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">Évaluations récentes</h2>
          {kpi.recentAssessments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Aucune évaluation trouvée.</p>
          ) : (
            <div className="divide-y">
              {kpi.recentAssessments.map(a => (
                <Link
                  key={a.id}
                  href={`/dashboard/saisie-notes?assessmentId=${a.id}`}
                  className="flex items-center justify-between py-3 text-sm transition-colors hover:bg-muted -mx-3 px-3 rounded-md"
                >
                  <div>
                    <span className="font-medium text-foreground">{a.title}</span>
                    <span className="text-muted-foreground ml-2">{a.subjectName} — {a.classroomName}</span>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, bg }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}